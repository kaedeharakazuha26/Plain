// Interpreter for Plain v0.4: walks the AST and executes it.
use crate::ast::{BinOp, Expr, InterpolatePart, Stmt, Value};
use std::collections::{BTreeMap, HashMap};
use std::fs::OpenOptions;
use std::io::{self, BufRead, Write};
use std::path::PathBuf;

use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct AskPrompt {
    pub variable: String,
    pub prompt: String,
}

#[derive(Clone)]
struct FunctionDef {
    params: Vec<String>,
    body: Vec<Stmt>,
}

enum Flow {
    None,
    Return(Value),
    Halt,
}

pub struct Interpreter {
    scopes: Vec<HashMap<String, Value>>,
    functions: HashMap<String, FunctionDef>,
    pub output: Vec<String>,
    pub silent: bool,
    pub inputs: Vec<String>,
    pub input_index: usize,
    pub waiting_for_input: Option<AskPrompt>,
    pub imported_files: std::collections::HashSet<PathBuf>,
}

impl Default for Interpreter {
    fn default() -> Self {
        Self::new()
    }
}

impl Interpreter {
    pub fn new() -> Self {
        let mut scopes = Vec::new();
        scopes.push(HashMap::new());
        Interpreter {
            scopes,
            functions: HashMap::new(),
            output: Vec::new(),
            silent: false,
            inputs: Vec::new(),
            input_index: 0,
            waiting_for_input: None,
            imported_files: std::collections::HashSet::new(),
        }
    }

    pub fn new_silent() -> Self {
        let mut scopes = Vec::new();
        scopes.push(HashMap::new());
        Interpreter {
            scopes,
            functions: HashMap::new(),
            output: Vec::new(),
            silent: true,
            inputs: Vec::new(),
            input_index: 0,
            waiting_for_input: None,
            imported_files: std::collections::HashSet::new(),
        }
    }

    pub fn new_with_inputs(inputs: Vec<String>, silent: bool) -> Self {
        let mut scopes = Vec::new();
        scopes.push(HashMap::new());
        Interpreter {
            scopes,
            functions: HashMap::new(),
            output: Vec::new(),
            silent,
            inputs,
            input_index: 0,
            waiting_for_input: None,
            imported_files: std::collections::HashSet::new(),
        }
    }

    pub fn get_vars(&self) -> HashMap<String, Value> {
        let mut all = HashMap::new();
        for scope in &self.scopes {
            for (k, v) in scope {
                all.insert(k.clone(), v.clone());
            }
        }
        all
    }

    fn lookup_var(&self, name: &str) -> Option<&Value> {
        for scope in self.scopes.iter().rev() {
            if let Some(val) = scope.get(name) {
                return Some(val);
            }
        }
        None
    }

    fn lookup_var_mut(&mut self, name: &str) -> Option<&mut Value> {
        for scope in self.scopes.iter_mut().rev() {
            if scope.contains_key(name) {
                return scope.get_mut(name);
            }
        }
        None
    }

    fn set_var(&mut self, name: String, value: Value) {
        for scope in self.scopes.iter_mut().rev() {
            if scope.contains_key(&name) {
                scope.insert(name, value);
                return;
            }
        }
        if let Some(top) = self.scopes.last_mut() {
            top.insert(name, value);
        }
    }

    pub fn run(&mut self, program: &[Stmt]) -> Result<(), String> {
        for stmt in program {
            match self.execute_stmt(stmt)? {
                Flow::Return(_) | Flow::Halt => break,
                Flow::None => {}
            }
        }
        Ok(())
    }

    fn execute_block(&mut self, body: &[Stmt]) -> Result<Flow, String> {
        self.scopes.push(HashMap::new());
        let mut flow = Flow::None;
        for stmt in body {
            flow = self.execute_stmt(stmt)?;
            if matches!(flow, Flow::Return(_) | Flow::Halt) {
                break;
            }
        }
        self.scopes.pop();
        Ok(flow)
    }

    fn execute_stmt(&mut self, stmt: &Stmt) -> Result<Flow, String> {
        match stmt {
            Stmt::Set { name, value } => {
                let val = self.eval_expr(value)?;
                self.set_var(name.clone(), val);
                Ok(Flow::None)
            }

            Stmt::SetField { root, path, value } => {
                let new_val = self.eval_expr(value)?;
                let root_val = self
                    .lookup_var_mut(root)
                    .ok_or_else(|| format!("Unknown variable '{}'", root))?;

                let mut current = root_val;
                for (i, field) in path.iter().enumerate() {
                    let is_last = i == path.len() - 1;
                    match current {
                        Value::Record(map) => {
                            if is_last {
                                map.insert(field.clone(), new_val);
                                return Ok(Flow::None);
                            } else {
                                if !map.contains_key(field) {
                                    let fields: Vec<&str> = map.keys().map(|s| s.as_str()).collect();
                                    return Err(format!(
                                        "Record has no field '{}'. Available fields: {}",
                                        field,
                                        fields.join(", ")
                                    ));
                                }
                                current = map.get_mut(field).unwrap();
                            }
                        }
                        other => {
                            return Err(format!(
                                "Cannot access field '{}' on {}",
                                field,
                                other.type_name()
                            ));
                        }
                    }
                }
                Ok(Flow::None)
            }

            Stmt::Say { expr } => {
                let val = self.eval_expr(expr)?;
                let text = val.to_string();
                if !self.silent {
                    println!("{}", text);
                }
                self.output.push(text);
                Ok(Flow::None)
            }

            Stmt::If { condition, then_body, else_body } => {
                let cond_val = self.eval_expr(condition)?;
                if cond_val.is_truthy() {
                    self.execute_block(then_body)
                } else {
                    self.execute_block(else_body)
                }
            }

            Stmt::Repeat { times, body } => {
                let count = self.eval_expr(times)?.as_number()?;
                if count < 0.0 {
                    return Err(format!("Cannot repeat a negative number of times: {}", count));
                }
                let iterations = count as usize;
                for _ in 0..iterations {
                    let flow = self.execute_block(body)?;
                    if matches!(flow, Flow::Return(_) | Flow::Halt) {
                        return Ok(flow);
                    }
                }
                Ok(Flow::None)
            }

            Stmt::While { condition, body } => {
                while self.eval_expr(condition)?.is_truthy() {
                    let flow = self.execute_block(body)?;
                    if matches!(flow, Flow::Return(_) | Flow::Halt) {
                        return Ok(flow);
                    }
                }
                Ok(Flow::None)
            }

            Stmt::Ask { name, prompt } => {
                let prompt_val = self.eval_expr(prompt)?;
                let prompt_str = prompt_val.to_string();

                if self.input_index < self.inputs.len() {
                    let answer = self.inputs[self.input_index].clone();
                    self.input_index += 1;
                    if let Ok(num) = answer.trim().parse::<f64>() {
                        self.set_var(name.clone(), Value::Number(num));
                    } else {
                        self.set_var(name.clone(), Value::Text(answer));
                    }
                    Ok(Flow::None)
                } else if self.silent {
                    self.waiting_for_input = Some(AskPrompt {
                        variable: name.clone(),
                        prompt: prompt_str,
                    });
                    Ok(Flow::Halt)
                } else {
                    print!("{} ", prompt_str);
                    let _ = io::stdout().flush();
                    let mut line = String::new();
                    let stdin = io::stdin();
                    let mut handle = stdin.lock();
                    handle
                        .read_line(&mut line)
                        .map_err(|e| format!("Failed to read input: {}", e))?;
                    let trimmed = line.trim();
                    if let Ok(num) = trimmed.parse::<f64>() {
                        self.set_var(name.clone(), Value::Number(num));
                    } else {
                        self.set_var(name.clone(), Value::Text(trimmed.to_string()));
                    }
                    Ok(Flow::None)
                }
            }

            Stmt::Define { name, params, body } => {
                self.functions.insert(
                    name.clone(),
                    FunctionDef {
                        params: params.clone(),
                        body: body.clone(),
                    },
                );
                Ok(Flow::None)
            }

            Stmt::Return { expr } => {
                let val = match expr {
                    Some(e) => self.eval_expr(e)?,
                    None => Value::Text(String::new()),
                };
                Ok(Flow::Return(val))
            }

            Stmt::Call { name, args } => {
                let _ = self.call_function(name, args)?;
                Ok(Flow::None)
            }

            Stmt::Add { value, target } => {
                let val = self.eval_expr(value)?;
                let target_val = self
                    .lookup_var_mut(target)
                    .ok_or_else(|| format!("Unknown variable '{}'", target))?;
                let list = target_val.as_list_mut()?;
                list.push(val);
                Ok(Flow::None)
            }

            Stmt::Remove { value, target } => {
                let val = self.eval_expr(value)?;
                let target_val = self
                    .lookup_var_mut(target)
                    .ok_or_else(|| format!("Unknown variable '{}'", target))?;
                let list = target_val.as_list_mut()?;
                if let Some(pos) = list.iter().position(|x| *x == val) {
                    list.remove(pos);
                }
                Ok(Flow::None)
            }

            Stmt::RemoveItem { index, target } => {
                let idx_val = self.eval_expr(index)?.as_number()?;
                let idx = idx_val as i64;
                let target_val = self
                    .lookup_var_mut(target)
                    .ok_or_else(|| format!("Unknown variable '{}'", target))?;
                let list = target_val.as_list_mut()?;
                if idx < 1 || idx as usize > list.len() {
                    return Err(format!(
                        "Item index {} is out of bounds for list of length {}",
                        idx,
                        list.len()
                    ));
                }
                list.remove((idx - 1) as usize);
                Ok(Flow::None)
            }

            Stmt::Sort { target, descending } => {
                let target_val = self
                    .lookup_var_mut(target)
                    .ok_or_else(|| format!("Unknown variable '{}'", target))?;
                let list = target_val.as_list_mut()?;
                list.sort_by(|a, b| match (a, b) {
                    (Value::Number(x), Value::Number(y)) => x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal),
                    (Value::Text(x), Value::Text(y)) => x.cmp(y),
                    (x, y) => x.to_string().cmp(&y.to_string()),
                });
                if *descending {
                    list.reverse();
                }
                Ok(Flow::None)
            }

            Stmt::ForEach { item_name, list, body } => {
                let list_val = self.eval_expr(list)?;
                let items = list_val.as_list()?.to_vec();
                for item in items {
                    self.scopes.push(HashMap::new());
                    if let Some(top) = self.scopes.last_mut() {
                        top.insert(item_name.clone(), item);
                    }
                    let mut flow = Flow::None;
                    for s in body {
                        flow = self.execute_stmt(s)?;
                        if matches!(flow, Flow::Return(_) | Flow::Halt) {
                            break;
                        }
                    }
                    self.scopes.pop();
                    if matches!(flow, Flow::Return(_) | Flow::Halt) {
                        return Ok(flow);
                    }
                }
                Ok(Flow::None)
            }

            Stmt::ForEachLine { item_name, path, body } => {
                let path_val = self.eval_expr(path)?;
                let file_path = path_val.as_text()?;
                let file_content = std::fs::read_to_string(file_path)
                    .map_err(|e| format!("Could not read file '{}': {}", file_path, e))?;

                for raw_line in file_content.lines() {
                    let line_val = Value::Text(raw_line.to_string());
                    self.scopes.push(HashMap::new());
                    if let Some(top) = self.scopes.last_mut() {
                        top.insert(item_name.clone(), line_val);
                    }
                    let mut flow = Flow::None;
                    for s in body {
                        flow = self.execute_stmt(s)?;
                        if matches!(flow, Flow::Return(_) | Flow::Halt) {
                            break;
                        }
                    }
                    self.scopes.pop();
                    if matches!(flow, Flow::Return(_) | Flow::Halt) {
                        return Ok(flow);
                    }
                }
                Ok(Flow::None)
            }

            Stmt::Increase { name, by } => {
                let increment = self.eval_expr(by)?.as_number()?;
                let target = self
                    .lookup_var_mut(name)
                    .ok_or_else(|| format!("Unknown variable '{}'", name))?;
                let current = target.as_number()?;
                *target = Value::Number(current + increment);
                Ok(Flow::None)
            }

            Stmt::Decrease { name, by } => {
                let decrement = self.eval_expr(by)?.as_number()?;
                let target = self
                    .lookup_var_mut(name)
                    .ok_or_else(|| format!("Unknown variable '{}'", name))?;
                let current = target.as_number()?;
                *target = Value::Number(current - decrement);
                Ok(Flow::None)
            }

            Stmt::SaveFile { content, path } => {
                let c = self.eval_expr(content)?;
                let p = self.eval_expr(path)?;
                let file_path = p.as_text()?;
                let text = c.to_string();
                let to_write = if text.ends_with('\n') {
                    text
                } else {
                    format!("{}\n", text)
                };
                std::fs::write(file_path, to_write)
                    .map_err(|e| format!("Could not save to file '{}': {}", file_path, e))?;
                Ok(Flow::None)
            }

            Stmt::AppendFile { content, path } => {
                let c = self.eval_expr(content)?;
                let p = self.eval_expr(path)?;
                let file_path = p.as_text()?;
                let mut file = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(file_path)
                    .map_err(|e| format!("Could not append to file '{}': {}", file_path, e))?;
                writeln!(file, "{}", c.to_string())
                    .map_err(|e| format!("Could not write to file '{}': {}", file_path, e))?;
                Ok(Flow::None)
            }

            Stmt::LoadFile { target, path } => {
                let p = self.eval_expr(path)?;
                let file_path = p.as_text()?;
                let content = std::fs::read_to_string(file_path)
                    .map_err(|e| format!("Could not load from file '{}': {}", file_path, e))?;
                self.set_var(target.clone(), Value::Text(content));
                Ok(Flow::None)
            }

            Stmt::Import { path } => {
                let path_val = self.eval_expr(path)?;
                let raw_path = path_val.as_text()?;
                let canonical = match std::fs::canonicalize(raw_path) {
                    Ok(p) => p,
                    Err(_) => PathBuf::from(raw_path),
                };

                if self.imported_files.contains(&canonical) {
                    return Ok(Flow::None);
                }
                self.imported_files.insert(canonical.clone());

                let source = std::fs::read_to_string(&canonical)
                    .map_err(|e| format!("Could not import '{}': {}", raw_path, e))?;

                let tokens = crate::lexer::tokenize(&source)?;
                let mut parser = crate::parser::Parser::new(tokens);
                let program = parser.parse_program()?;

                for stmt in &program {
                    match self.execute_stmt(stmt)? {
                        Flow::Return(_) | Flow::Halt => break,
                        Flow::None => {}
                    }
                }

                Ok(Flow::None)
            }
        }
    }

    fn call_function(&mut self, name: &str, args: &[Expr]) -> Result<Value, String> {
        let func = self
            .functions
            .get(name)
            .cloned()
            .ok_or_else(|| format!("Unknown function '{}'", name))?;

        if args.len() != func.params.len() {
            return Err(format!(
                "Function '{}' expects {} arguments, got {}",
                name,
                func.params.len(),
                args.len()
            ));
        }

        let mut evaluated_args = Vec::new();
        for arg in args {
            evaluated_args.push(self.eval_expr(arg)?);
        }

        let mut new_scope = HashMap::new();
        for (param, val) in func.params.iter().zip(evaluated_args) {
            new_scope.insert(param.clone(), val);
        }

        self.scopes.push(new_scope);
        let mut return_val = Value::Text(String::new());
        for stmt in &func.body {
            match self.execute_stmt(stmt)? {
                Flow::Return(v) => {
                    return_val = v;
                    break;
                }
                Flow::Halt => return Ok(Value::Text(String::new())),
                Flow::None => {}
            }
        }
        self.scopes.pop();
        Ok(return_val)
    }

    pub fn eval_expr(&mut self, expr: &Expr) -> Result<Value, String> {
        match expr {
            Expr::Literal(v) => Ok(v.clone()),

            Expr::Variable(name) => self
                .lookup_var(name)
                .cloned()
                .ok_or_else(|| format!("Unknown variable '{}'", name)),

            Expr::Record(fields) => {
                let mut map = BTreeMap::new();
                for (k, v_expr) in fields {
                    let v = self.eval_expr(v_expr)?;
                    map.insert(k.clone(), v);
                }
                Ok(Value::Record(map))
            }

            Expr::FieldAccess { target, field } => {
                let target_val = self.eval_expr(target)?;
                match target_val {
                    Value::Record(map) => {
                        if let Some(val) = map.get(field) {
                            Ok(val.clone())
                        } else {
                            let fields: Vec<&str> = map.keys().map(|s| s.as_str()).collect();
                            Err(format!(
                                "Record has no field '{}'. Available fields: {}",
                                field,
                                fields.join(", ")
                            ))
                        }
                    }
                    other => Err(format!(
                        "Cannot access field '{}' on {}",
                        field,
                        other.type_name()
                    )),
                }
            }

            Expr::InterpolatedText(parts) => {
                let mut result = String::new();
                for part in parts {
                    match part {
                        InterpolatePart::Literal(s) => result.push_str(s),
                        InterpolatePart::Expr(e) => {
                            let val = self.eval_expr(e)?;
                            result.push_str(&val.to_string());
                        }
                    }
                }
                Ok(Value::Text(result))
            }

            Expr::Binary(left, op, right) => {
                let l = self.eval_expr(left)?;
                let r = self.eval_expr(right)?;

                match op {
                    BinOp::Add => match (&l, &r) {
                        (Value::Number(a), Value::Number(b)) => Ok(Value::Number(a + b)),
                        _ => Ok(Value::Text(format!("{}{}", l, r))),
                    },
                    BinOp::Sub => Ok(Value::Number(l.as_number()? - r.as_number()?)),
                    BinOp::Mul => Ok(Value::Number(l.as_number()? * r.as_number()?)),
                    BinOp::Div => {
                        let divisor = r.as_number()?;
                        if divisor == 0.0 {
                            return Err("Division by zero".to_string());
                        }
                        Ok(Value::Number(l.as_number()? / divisor))
                    }
                    BinOp::Gt => match (&l, &r) {
                        (Value::Number(a), Value::Number(b)) => Ok(Value::Bool(a > b)),
                        (Value::Text(a), Value::Text(b)) => Ok(Value::Bool(a > b)),
                        _ => Err(format!(
                            "Cannot compare {} and {}",
                            l.type_name(),
                            r.type_name()
                        )),
                    },
                    BinOp::Lt => match (&l, &r) {
                        (Value::Number(a), Value::Number(b)) => Ok(Value::Bool(a < b)),
                        (Value::Text(a), Value::Text(b)) => Ok(Value::Bool(a < b)),
                        _ => Err(format!(
                            "Cannot compare {} and {}",
                            l.type_name(),
                            r.type_name()
                        )),
                    },
                    BinOp::Ge => match (&l, &r) {
                        (Value::Number(a), Value::Number(b)) => Ok(Value::Bool(a >= b)),
                        (Value::Text(a), Value::Text(b)) => Ok(Value::Bool(a >= b)),
                        _ => Err(format!(
                            "Cannot compare {} and {}",
                            l.type_name(),
                            r.type_name()
                        )),
                    },
                    BinOp::Le => match (&l, &r) {
                        (Value::Number(a), Value::Number(b)) => Ok(Value::Bool(a <= b)),
                        (Value::Text(a), Value::Text(b)) => Ok(Value::Bool(a <= b)),
                        _ => Err(format!(
                            "Cannot compare {} and {}",
                            l.type_name(),
                            r.type_name()
                        )),
                    },
                    BinOp::Eq => Ok(Value::Bool(l == r)),
                    BinOp::Ne => Ok(Value::Bool(l != r)),
                    BinOp::And => Ok(Value::Bool(l.is_truthy() && r.is_truthy())),
                    BinOp::Or => Ok(Value::Bool(l.is_truthy() || r.is_truthy())),

                    BinOp::Contains => match (&l, &r) {
                        (Value::Text(s), Value::Text(sub)) => Ok(Value::Bool(s.contains(sub))),
                        (Value::List(items), target) => Ok(Value::Bool(items.contains(target))),
                        _ => Err(format!(
                            "Cannot check if {} contains {}",
                            l.type_name(),
                            r.type_name()
                        )),
                    },
                    BinOp::StartsWith => match (&l, &r) {
                        (Value::Text(s), Value::Text(sub)) => Ok(Value::Bool(s.starts_with(sub))),
                        _ => Err(format!(
                            "Cannot check if {} starts with {}",
                            l.type_name(),
                            r.type_name()
                        )),
                    },
                    BinOp::EndsWith => match (&l, &r) {
                        (Value::Text(s), Value::Text(sub)) => Ok(Value::Bool(s.ends_with(sub))),
                        _ => Err(format!(
                            "Cannot check if {} ends with {}",
                            l.type_name(),
                            r.type_name()
                        )),
                    },
                }
            }

            Expr::Between { value, min, max } => {
                let v = self.eval_expr(value)?.as_number()?;
                let low = self.eval_expr(min)?.as_number()?;
                let high = self.eval_expr(max)?.as_number()?;
                Ok(Value::Bool(v >= low && v <= high))
            }

            Expr::Not(inner) => {
                let val = self.eval_expr(inner)?;
                Ok(Value::Bool(!val.is_truthy()))
            }

            Expr::Neg(inner) => {
                let val = self.eval_expr(inner)?.as_number()?;
                Ok(Value::Number(-val))
            }

            Expr::List(elements) => {
                let mut vals = Vec::new();
                for e in elements {
                    vals.push(self.eval_expr(e)?);
                }
                Ok(Value::List(vals))
            }

            Expr::Call { name, args } => self.call_function(name, args),

            Expr::Uppercase(inner) => {
                let s = self.eval_expr(inner)?;
                Ok(Value::Text(s.as_text()?.to_uppercase()))
            }

            Expr::Lowercase(inner) => {
                let s = self.eval_expr(inner)?;
                Ok(Value::Text(s.as_text()?.to_lowercase()))
            }

            Expr::LengthOf(inner) => {
                let val = self.eval_expr(inner)?;
                match &val {
                    Value::List(l) => Ok(Value::Number(l.len() as f64)),
                    Value::Text(s) => Ok(Value::Number(s.chars().count() as f64)),
                    Value::Record(r) => Ok(Value::Number(r.len() as f64)),
                    other => Err(format!("Cannot get length of {}", other.type_name())),
                }
            }

            Expr::FirstOf(inner) => {
                let val = self.eval_expr(inner)?;
                match &val {
                    Value::List(l) => l
                        .first()
                        .cloned()
                        .ok_or_else(|| "Cannot get first item of an empty list".to_string()),
                    Value::Text(s) => s
                        .chars()
                        .next()
                        .map(|c| Value::Text(c.to_string()))
                        .ok_or_else(|| "Cannot get first character of empty text".to_string()),
                    other => Err(format!("Cannot get first item of {}", other.type_name())),
                }
            }

            Expr::LastOf(inner) => {
                let val = self.eval_expr(inner)?;
                match &val {
                    Value::List(l) => l
                        .last()
                        .cloned()
                        .ok_or_else(|| "Cannot get last item of an empty list".to_string()),
                    Value::Text(s) => s
                        .chars()
                        .last()
                        .map(|c| Value::Text(c.to_string()))
                        .ok_or_else(|| "Cannot get last character of empty text".to_string()),
                    other => Err(format!("Cannot get last item of {}", other.type_name())),
                }
            }

            Expr::ItemAt { index, target } => {
                let idx_num = self.eval_expr(index)?.as_number()?;
                let idx = idx_num as i64;
                let val = self.eval_expr(target)?;

                match &val {
                    Value::List(l) => {
                        if idx < 1 || idx as usize > l.len() {
                            return Err(format!(
                                "Item index {} is out of bounds for list of length {}",
                                idx,
                                l.len()
                            ));
                        }
                        Ok(l[(idx - 1) as usize].clone())
                    }
                    Value::Text(s) => {
                        let chars: Vec<char> = s.chars().collect();
                        if idx < 1 || idx as usize > chars.len() {
                            return Err(format!(
                                "Character index {} is out of bounds for text of length {}",
                                idx,
                                chars.len()
                            ));
                        }
                        Ok(Value::Text(chars[(idx - 1) as usize].to_string()))
                    }
                    other => Err(format!("Cannot index into {}", other.type_name())),
                }
            }

            Expr::SumOf(inner) => {
                let val = self.eval_expr(inner)?;
                let list = val.as_list()?;
                let mut sum = 0.0;
                for item in list {
                    sum += item.as_number()?;
                }
                Ok(Value::Number(sum))
            }

            Expr::AverageOf(inner) => {
                let val = self.eval_expr(inner)?;
                let list = val.as_list()?;
                if list.is_empty() {
                    return Err("Cannot calculate average of an empty list".to_string());
                }
                let mut sum = 0.0;
                for item in list {
                    sum += item.as_number()?;
                }
                Ok(Value::Number(sum / list.len() as f64))
            }

            Expr::SmallestOf(inner) => {
                let val = self.eval_expr(inner)?;
                let list = val.as_list()?;
                if list.is_empty() {
                    return Err("Cannot find smallest item of an empty list".to_string());
                }
                let mut min = list[0].as_number()?;
                for item in &list[1..] {
                    let num = item.as_number()?;
                    if num < min {
                        min = num;
                    }
                }
                Ok(Value::Number(min))
            }

            Expr::LargestOf(inner) => {
                let val = self.eval_expr(inner)?;
                let list = val.as_list()?;
                if list.is_empty() {
                    return Err("Cannot find largest item of an empty list".to_string());
                }
                let mut max = list[0].as_number()?;
                for item in &list[1..] {
                    let num = item.as_number()?;
                    if num > max {
                        max = num;
                    }
                }
                Ok(Value::Number(max))
            }

            Expr::ReverseOf(inner) => {
                let val = self.eval_expr(inner)?;
                match val {
                    Value::List(mut l) => {
                        l.reverse();
                        Ok(Value::List(l))
                    }
                    Value::Text(s) => {
                        let rev: String = s.chars().rev().collect();
                        Ok(Value::Text(rev))
                    }
                    other => Err(format!("Cannot reverse {}", other.type_name())),
                }
            }

            Expr::TrimOf(inner) => {
                let val = self.eval_expr(inner)?;
                let s = val.as_text()?;
                Ok(Value::Text(s.trim().to_string()))
            }

            Expr::NumberOf(inner) => {
                let val = self.eval_expr(inner)?;
                match &val {
                    Value::Number(n) => Ok(Value::Number(*n)),
                    Value::Text(s) => s
                        .trim()
                        .parse::<f64>()
                        .map(Value::Number)
                        .map_err(|_| format!("Cannot convert '{}' to a number", s)),
                    other => Err(format!("Cannot convert {} to a number", other.type_name())),
                }
            }

            Expr::TextOf(inner) => {
                let val = self.eval_expr(inner)?;
                Ok(Value::Text(val.to_string()))
            }

            Expr::Split { string, delimiter } => {
                let s = self.eval_expr(string)?;
                let d = self.eval_expr(delimiter)?;
                let text = s.as_text()?;
                let delim = d.as_text()?;
                let parts: Vec<Value> = text
                    .split(delim)
                    .map(|p| Value::Text(p.to_string()))
                    .collect();
                Ok(Value::List(parts))
            }

            Expr::Join { list, delimiter } => {
                let l = self.eval_expr(list)?;
                let d = self.eval_expr(delimiter)?;
                let items = l.as_list()?;
                let delim = d.as_text()?;
                let joined = items
                    .iter()
                    .map(|item| item.to_string())
                    .collect::<Vec<_>>()
                    .join(delim);
                Ok(Value::Text(joined))
            }

            Expr::Replace { find, replacement, target } => {
                let f = self.eval_expr(find)?;
                let r = self.eval_expr(replacement)?;
                let t = self.eval_expr(target)?;
                let find_str = f.as_text()?;
                let rep_str = r.as_text()?;
                let target_str = t.as_text()?;
                Ok(Value::Text(target_str.replace(find_str, rep_str)))
            }
        }
    }
}
