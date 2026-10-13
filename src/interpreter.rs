// Interpreter for Plain v0.2: walks the AST and executes it.
use crate::ast::{BinOp, Expr, Stmt, Value};
use std::collections::HashMap;
use std::io::{self, BufRead, Write};

#[derive(Clone)]
struct FunctionDef {
    params: Vec<String>,
    body: Vec<Stmt>,
}

enum Flow {
    None,
    Return(Value),
}

pub struct Interpreter {
    scopes: Vec<HashMap<String, Value>>,
    functions: HashMap<String, FunctionDef>,
    pub output: Vec<String>,
    pub silent: bool,
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

    fn set_var(&mut self, name: String, val: Value) {
        if let Some(top) = self.scopes.last_mut() {
            top.insert(name, val);
        }
    }

    fn modify_var<F>(&mut self, name: &str, f: F) -> Result<(), String>
    where
        F: FnOnce(&mut Value) -> Result<(), String>,
    {
        for scope in self.scopes.iter_mut().rev() {
            if let Some(val) = scope.get_mut(name) {
                return f(val);
            }
        }
        Err(format!("Unknown name '{}' (did you forget: set {} to ...?)", name, name))
    }

    pub fn run(&mut self, program: &[Stmt]) -> Result<(), String> {
        match self.exec_block(program)? {
            Flow::None | Flow::Return(_) => Ok(()),
        }
    }

    fn exec_block(&mut self, stmts: &[Stmt]) -> Result<Flow, String> {
        for stmt in stmts {
            match self.exec(stmt)? {
                Flow::None => {}
                Flow::Return(v) => return Ok(Flow::Return(v)),
            }
        }
        Ok(Flow::None)
    }

    fn exec(&mut self, stmt: &Stmt) -> Result<Flow, String> {
        match stmt {
            Stmt::Set { name, value } => {
                let v = self.eval(value)?;
                self.set_var(name.clone(), v);
                Ok(Flow::None)
            }

            Stmt::Say { expr } => {
                let v = self.eval(expr)?;
                let line = v.to_string();
                if !self.silent {
                    println!("{}", line);
                }
                if self.output.len() < 5000 {
                    self.output.push(line);
                } else if self.output.len() == 5000 {
                    self.output.push("... [Output truncated after 5,000 lines]".to_string());
                }
                Ok(Flow::None)
            }

            Stmt::If { condition, then_body, else_body } => {
                if self.eval(condition)?.is_truthy() {
                    self.exec_block(then_body)
                } else {
                    self.exec_block(else_body)
                }
            }

            Stmt::Repeat { times, body } => {
                let count = self.eval(times)?.as_number()? as i64;
                if count < 0 {
                    return Err("repeat count cannot be negative".into());
                }
                for _ in 0..count {
                    match self.exec_block(body)? {
                        Flow::None => {}
                        Flow::Return(v) => return Ok(Flow::Return(v)),
                    }
                }
                Ok(Flow::None)
            }

            Stmt::While { condition, body } => {
                let mut guard = 0u64;
                while self.eval(condition)?.is_truthy() {
                    match self.exec_block(body)? {
                        Flow::None => {}
                        Flow::Return(v) => return Ok(Flow::Return(v)),
                    }
                    guard += 1;
                    if guard > 1_000_000 {
                        return Err("while loop stopped: over 1,000,000 iterations (infinite loop?)".into());
                    }
                }
                Ok(Flow::None)
            }

            // v0.2: ask name with "prompt"
            Stmt::Ask { name, prompt } => {
                let prompt_val = self.eval(prompt)?;
                let prompt_str = prompt_val.to_string();
                if !self.silent {
                    print!("{} ", prompt_str);
                    let _ = io::stdout().flush();
                }

                let mut input = String::new();
                let stdin = io::stdin();
                let mut handle = stdin.lock();
                let _ = handle.read_line(&mut input);
                let trimmed = input.trim();

                let val = if let Ok(num) = trimmed.parse::<f64>() {
                    Value::Number(num)
                } else {
                    Value::Text(trimmed.to_string())
                };

                self.set_var(name.clone(), val);
                Ok(Flow::None)
            }

            // v0.2: define name with params ... end
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

            // v0.2: return <expr>
            Stmt::Return { expr } => {
                let val = match expr {
                    Some(e) => self.eval(e)?,
                    None => Value::Text("".to_string()),
                };
                Ok(Flow::Return(val))
            }

            // v0.2: call name with args (as statement)
            Stmt::Call { name, args } => {
                let _ = self.call_function(name, args)?;
                Ok(Flow::None)
            }

            // v0.2: add value to target
            Stmt::Add { value, target } => {
                let val = self.eval(value)?;
                self.modify_var(target, |existing| {
                    match existing {
                        Value::List(items) => {
                            items.push(val);
                            Ok(())
                        }
                        Value::Number(n) => {
                            *n += val.as_number()?;
                            Ok(())
                        }
                        Value::Text(s) => {
                            s.push_str(&val.to_string());
                            Ok(())
                        }
                        other => Err(format!("Cannot add to {}", other.type_name())),
                    }
                })?;
                Ok(Flow::None)
            }

            // v0.2: for each item in list ... end
            Stmt::ForEach { item_name, list, body } => {
                let val = self.eval(list)?;
                let items = val.as_list()?.to_vec();
                for item in items {
                    self.set_var(item_name.clone(), item);
                    match self.exec_block(body)? {
                        Flow::None => {}
                        Flow::Return(v) => return Ok(Flow::Return(v)),
                    }
                }
                Ok(Flow::None)
            }

            // v0.2: increase name / increase name by expr
            Stmt::Increase { name, by } => {
                let delta = self.eval(by)?.as_number()?;
                self.modify_var(name, |v| {
                    let cur = v.as_number()?;
                    *v = Value::Number(cur + delta);
                    Ok(())
                })?;
                Ok(Flow::None)
            }

            // v0.2: decrease name / decrease name by expr
            Stmt::Decrease { name, by } => {
                let delta = self.eval(by)?.as_number()?;
                self.modify_var(name, |v| {
                    let cur = v.as_number()?;
                    *v = Value::Number(cur - delta);
                    Ok(())
                })?;
                Ok(Flow::None)
            }
        }
    }

    fn call_function(&mut self, name: &str, args: &[Expr]) -> Result<Value, String> {
        let func = self
            .functions
            .get(name)
            .cloned()
            .ok_or_else(|| format!("Unknown function '{}' (did you forget: define {} with ...?)", name, name))?;

        if func.params.len() != args.len() {
            return Err(format!(
                "Function '{}' expects {} arguments, got {}",
                name,
                func.params.len(),
                args.len()
            ));
        }

        let mut evaluated_args = Vec::new();
        for arg in args {
            evaluated_args.push(self.eval(arg)?);
        }

        // Push new scope for function execution
        let mut new_scope = HashMap::new();
        for (param, arg_val) in func.params.iter().zip(evaluated_args) {
            new_scope.insert(param.clone(), arg_val);
        }
        self.scopes.push(new_scope);

        let result = self.exec_block(&func.body);

        // Pop scope after function execution
        self.scopes.pop();

        match result? {
            Flow::Return(v) => Ok(v),
            Flow::None => Ok(Value::Text("".to_string())),
        }
    }

    fn eval(&mut self, expr: &Expr) -> Result<Value, String> {
        match expr {
            Expr::Literal(v) => Ok(v.clone()),

            Expr::Variable(name) => self
                .lookup_var(name)
                .cloned()
                .ok_or_else(|| format!("Unknown name '{}' (did you forget: set {} to ...?)", name, name)),

            Expr::Not(inner) => Ok(Value::Bool(!self.eval(inner)?.is_truthy())),
            Expr::Neg(inner) => Ok(Value::Number(-self.eval(inner)?.as_number()?)),

            // v0.2: list literal [80, 90, 75]
            Expr::List(exprs) => {
                let mut items = Vec::new();
                for e in exprs {
                    items.push(self.eval(e)?);
                }
                Ok(Value::List(items))
            }

            // v0.2: call func with args (as expression)
            Expr::Call { name, args } => self.call_function(name, args),

            // v0.2: uppercase of <expr>
            Expr::Uppercase(inner) => {
                let val = self.eval(inner)?;
                Ok(Value::Text(val.as_text()?.to_uppercase()))
            }

            // v0.2: lowercase of <expr>
            Expr::Lowercase(inner) => {
                let val = self.eval(inner)?;
                Ok(Value::Text(val.as_text()?.to_lowercase()))
            }

            // v0.2: length of <expr>
            Expr::LengthOf(inner) => {
                let val = self.eval(inner)?;
                match val {
                    Value::Text(s) => Ok(Value::Number(s.chars().count() as f64)),
                    Value::List(l) => Ok(Value::Number(l.len() as f64)),
                    other => Err(format!("Cannot get length of {}", other.type_name())),
                }
            }

            // v0.2: first of <expr>
            Expr::FirstOf(inner) => {
                let val = self.eval(inner)?;
                match val {
                    Value::List(l) => l.first().cloned().ok_or_else(|| "Cannot get first of empty list".into()),
                    Value::Text(s) => s.chars().next().map(|c| Value::Text(c.to_string())).ok_or_else(|| "Cannot get first of empty text".into()),
                    other => Err(format!("Cannot get first of {}", other.type_name())),
                }
            }

            // v0.2: last of <expr>
            Expr::LastOf(inner) => {
                let val = self.eval(inner)?;
                match val {
                    Value::List(l) => l.last().cloned().ok_or_else(|| "Cannot get last of empty list".into()),
                    Value::Text(s) => s.chars().last().map(|c| Value::Text(c.to_string())).ok_or_else(|| "Cannot get last of empty text".into()),
                    other => Err(format!("Cannot get last of {}", other.type_name())),
                }
            }

            // v0.2: item <index> of <target> (1-indexed)
            Expr::ItemAt { index, target } => {
                let idx = self.eval(index)?.as_number()? as i64;
                let val = self.eval(target)?;
                match val {
                    Value::List(l) => {
                        if idx < 1 || idx as usize > l.len() {
                            return Err(format!("Index {} out of bounds for list with length {}", idx, l.len()));
                        }
                        Ok(l[(idx - 1) as usize].clone())
                    }
                    Value::Text(s) => {
                        let chars: Vec<char> = s.chars().collect();
                        if idx < 1 || idx as usize > chars.len() {
                            return Err(format!("Index {} out of bounds for text with length {}", idx, chars.len()));
                        }
                        Ok(Value::Text(chars[(idx - 1) as usize].to_string()))
                    }
                    other => Err(format!("Cannot get item of {}", other.type_name())),
                }
            }

            // v0.2: is between <min> and <max>
            Expr::Between { value, min, max } => {
                let val = self.eval(value)?.as_number()?;
                let mi = self.eval(min)?.as_number()?;
                let ma = self.eval(max)?.as_number()?;
                Ok(Value::Bool(val >= mi && val <= ma))
            }

            Expr::Binary(left, op, right) => {
                match op {
                    BinOp::And => {
                        let l = self.eval(left)?;
                        if !l.is_truthy() {
                            return Ok(Value::Bool(false));
                        }
                        return Ok(Value::Bool(self.eval(right)?.is_truthy()));
                    }
                    BinOp::Or => {
                        let l = self.eval(left)?;
                        if l.is_truthy() {
                            return Ok(Value::Bool(true));
                        }
                        return Ok(Value::Bool(self.eval(right)?.is_truthy()));
                    }
                    _ => {}
                }

                let l = self.eval(left)?;
                let r = self.eval(right)?;

                match op {
                    BinOp::Add => match (&l, &r) {
                        (Value::Text(_), _) | (_, Value::Text(_)) => {
                            Ok(Value::Text(format!("{}{}", l, r)))
                        }
                        (Value::List(a), Value::List(b)) => {
                            let mut combined = a.clone();
                            combined.extend(b.clone());
                            Ok(Value::List(combined))
                        }
                        (Value::List(a), item) => {
                            let mut combined = a.clone();
                            combined.push(item.clone());
                            Ok(Value::List(combined))
                        }
                        (item, Value::List(b)) => {
                            let mut combined = vec![item.clone()];
                            combined.extend(b.clone());
                            Ok(Value::List(combined))
                        }
                        _ => Ok(Value::Number(l.as_number()? + r.as_number()?)),
                    },
                    BinOp::Sub => Ok(Value::Number(l.as_number()? - r.as_number()?)),
                    BinOp::Mul => Ok(Value::Number(l.as_number()? * r.as_number()?)),
                    BinOp::Div => {
                        let divisor = r.as_number()?;
                        if divisor == 0.0 {
                            return Err("Division by zero".into());
                        }
                        Ok(Value::Number(l.as_number()? / divisor))
                    }
                    BinOp::Eq => Ok(Value::Bool(l == r)),
                    BinOp::Ne => Ok(Value::Bool(l != r)),
                    BinOp::Gt => Ok(Value::Bool(l.as_number()? > r.as_number()?)),
                    BinOp::Lt => Ok(Value::Bool(l.as_number()? < r.as_number()?)),
                    BinOp::Ge => Ok(Value::Bool(l.as_number()? >= r.as_number()?)),
                    BinOp::Le => Ok(Value::Bool(l.as_number()? <= r.as_number()?)),
                    BinOp::And | BinOp::Or => unreachable!(),
                }
            }
        }
    }
}
