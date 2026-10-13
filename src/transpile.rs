// Transpiler: translates Plain v0.4 AST into standalone Rust source code.
use crate::ast::{BinOp, Expr, InterpolatePart, Stmt, Value};
use std::collections::HashSet;

pub struct Transpiler {
    scopes: Vec<HashSet<String>>,
    indent_level: usize,
}

impl Default for Transpiler {
    fn default() -> Self {
        Self::new()
    }
}

impl Transpiler {
    pub fn new() -> Self {
        let mut scopes = Vec::new();
        scopes.push(HashSet::new());
        Transpiler {
            scopes,
            indent_level: 1,
        }
    }

    fn indent(&self) -> String {
        "    ".repeat(self.indent_level)
    }

    fn is_var_defined(&self, name: &str) -> bool {
        for scope in self.scopes.iter().rev() {
            if scope.contains(name) {
                return true;
            }
        }
        false
    }

    fn define_var(&mut self, name: &str) {
        if let Some(top) = self.scopes.last_mut() {
            top.insert(name.to_string());
        }
    }

    fn sanitize_var(name: &str) -> String {
        format!("plain_var_{}", name)
    }

    fn sanitize_fn(name: &str) -> String {
        format!("plain_fn_{}", name)
    }

    pub fn transpile_program(&mut self, program: &[Stmt]) -> Result<String, String> {
        let mut fn_defs = Vec::new();
        let mut main_stmts = Vec::new();

        // Separate function definitions from top-level statements
        for stmt in program {
            if let Stmt::Define { .. } = stmt {
                fn_defs.push(stmt);
            } else {
                main_stmts.push(stmt);
            }
        }

        let mut output = String::new();

        // 1. Runtime header
        output.push_str(RUNTIME_PREAMBLE);
        output.push('\n');

        // 2. Transpile defined functions
        for func_stmt in fn_defs {
            if let Stmt::Define { name, params, body } = func_stmt {
                output.push_str(&self.transpile_fn(name, params, body)?);
                output.push('\n');
            }
        }

        // 3. Transpile main function
        output.push_str("fn main() {\n");
        self.scopes.clear();
        self.scopes.push(HashSet::new());
        self.indent_level = 1;

        for stmt in main_stmts {
            output.push_str(&self.transpile_stmt(stmt)?);
        }

        output.push_str("}\n");

        Ok(output)
    }

    fn transpile_fn(&mut self, name: &str, params: &[String], body: &[Stmt]) -> Result<String, String> {
        let fn_name = Self::sanitize_fn(name);
        let params_code: Vec<String> = params
            .iter()
            .map(|p| format!("mut {}: Value", Self::sanitize_var(p)))
            .collect();

        let mut code = format!("fn {}({}) -> Value {{\n", fn_name, params_code.join(", "));

        self.scopes.push(HashSet::new());
        for p in params {
            self.define_var(p);
        }
        self.indent_level = 1;

        for stmt in body {
            code.push_str(&self.transpile_stmt(stmt)?);
        }

        code.push_str("    Value::Text(String::new())\n");
        code.push_str("}\n");

        self.scopes.pop();
        Ok(code)
    }

    fn transpile_stmt(&mut self, stmt: &Stmt) -> Result<String, String> {
        match stmt {
            Stmt::Ask { .. } => Err("Compiler does not support 'ask' yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::SetField { .. } => Err("Compiler does not support 'records' yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::ForEach { .. } => Err("Compiler does not support 'for each' yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::ForEachLine { .. } => Err("Compiler does not support file operations yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::SaveFile { .. } => Err("Compiler does not support file operations yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::AppendFile { .. } => Err("Compiler does not support file operations yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::LoadFile { .. } => Err("Compiler does not support file operations yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::Remove { .. } => Err("Compiler does not support 'remove' yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::RemoveItem { .. } => Err("Compiler does not support 'remove item' yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::Sort { .. } => Err("Compiler does not support 'sort' yet (interpreter-only feature in v0.4)".to_string()),
            Stmt::Import { .. } => Err("Compiler does not support 'import' yet (interpreter-only feature in v0.4)".to_string()),

            Stmt::Set { name, value } => {
                let expr_code = self.transpile_expr(value)?;
                let var = Self::sanitize_var(name);
                let line = if self.is_var_defined(name) {
                    format!("{}{} = {};\n", self.indent(), var, expr_code)
                } else {
                    self.define_var(name);
                    format!("{}let mut {} = {};\n", self.indent(), var, expr_code)
                };
                Ok(line)
            }

            Stmt::Say { expr } => {
                let expr_code = self.transpile_expr(expr)?;
                Ok(format!("{}println!(\"{{}}\", ({}).display());\n", self.indent(), expr_code))
            }

            Stmt::If { condition, then_body, else_body } => {
                let cond_code = self.transpile_expr(condition)?;
                let mut out = format!("{}if ({}).is_truthy() {{\n", self.indent(), cond_code);

                self.scopes.push(HashSet::new());
                self.indent_level += 1;
                for s in then_body {
                    out.push_str(&self.transpile_stmt(s)?);
                }
                self.indent_level -= 1;
                self.scopes.pop();

                if !else_body.is_empty() {
                    out.push_str(&format!("{}}} else {{\n", self.indent()));
                    self.scopes.push(HashSet::new());
                    self.indent_level += 1;
                    for s in else_body {
                        out.push_str(&self.transpile_stmt(s)?);
                    }
                    self.indent_level -= 1;
                    self.scopes.pop();
                }

                out.push_str(&format!("{}}}\n", self.indent()));
                Ok(out)
            }

            Stmt::Repeat { times, body } => {
                let count_code = self.transpile_expr(times)?;
                let mut out = format!(
                    "{}for _ in 0..(({}).as_number() as usize) {{\n",
                    self.indent(),
                    count_code
                );

                self.scopes.push(HashSet::new());
                self.indent_level += 1;
                for s in body {
                    out.push_str(&self.transpile_stmt(s)?);
                }
                self.indent_level -= 1;
                self.scopes.pop();

                out.push_str(&format!("{}}}\n", self.indent()));
                Ok(out)
            }

            Stmt::While { condition, body } => {
                let cond_code = self.transpile_expr(condition)?;
                let mut out = format!("{}while ({}).is_truthy() {{\n", self.indent(), cond_code);

                self.scopes.push(HashSet::new());
                self.indent_level += 1;
                for s in body {
                    out.push_str(&self.transpile_stmt(s)?);
                }
                self.indent_level -= 1;
                self.scopes.pop();

                out.push_str(&format!("{}}}\n", self.indent()));
                Ok(out)
            }

            Stmt::Increase { name, by } => {
                let by_code = self.transpile_expr(by)?;
                let var = Self::sanitize_var(name);
                Ok(format!("{}{} = ({}).add(&({}));\n", self.indent(), var, var, by_code))
            }

            Stmt::Decrease { name, by } => {
                let by_code = self.transpile_expr(by)?;
                let var = Self::sanitize_var(name);
                Ok(format!("{}{} = ({}).sub(&({}));\n", self.indent(), var, var, by_code))
            }

            Stmt::Add { value, target } => {
                let val_code = self.transpile_expr(value)?;
                let var = Self::sanitize_var(target);
                Ok(format!("{}({}).as_list_mut().push({});\n", self.indent(), var, val_code))
            }

            Stmt::Return { expr } => {
                let val_code = match expr {
                    Some(e) => self.transpile_expr(e)?,
                    None => "Value::Text(String::new())".to_string(),
                };
                Ok(format!("{}return {};\n", self.indent(), val_code))
            }

            Stmt::Call { name, args } => {
                let fn_name = Self::sanitize_fn(name);
                let mut args_code = Vec::new();
                for a in args {
                    args_code.push(self.transpile_expr(a)?);
                }
                Ok(format!("{}{}({});\n", self.indent(), fn_name, args_code.join(", ")))
            }

            Stmt::Define { .. } => Ok(String::new()),
        }
    }

    fn transpile_expr(&mut self, expr: &Expr) -> Result<String, String> {
        match expr {
            Expr::Record(_) | Expr::FieldAccess { .. } => {
                Err("Compiler does not support 'records' yet (interpreter-only feature in v0.4)".to_string())
            }
            Expr::Split { .. } | Expr::Join { .. } | Expr::Replace { .. } => {
                Err("Compiler does not support 'split/join/replace' yet (interpreter-only feature in v0.4)".to_string())
            }
            Expr::SmallestOf(_) | Expr::LargestOf(_) | Expr::ReverseOf(_) | Expr::TrimOf(_) => {
                Err("Compiler does not support 'smallest/largest/reverse/trim of' yet (interpreter-only feature in v0.4)".to_string())
            }
            Expr::NumberOf(_) | Expr::TextOf(_) => {
                Err("Compiler does not support 'number of / text of' yet (interpreter-only feature in v0.4)".to_string())
            }

            Expr::Literal(v) => match v {
                Value::Number(n) => Ok(format!("Value::Number({:?})", n)),
                Value::Text(s) => Ok(format!("Value::Text({:?}.to_string())", s)),
                Value::Bool(b) => Ok(format!("Value::Bool({})", b)),
                Value::List(items) => {
                    let mut elements = Vec::new();
                    for item in items {
                        elements.push(self.transpile_expr(&Expr::Literal(item.clone()))?);
                    }
                    Ok(format!("Value::List(vec![{}])", elements.join(", ")))
                }
                Value::Record(_) => Err("Compiler does not support 'records' yet".to_string()),
            },

            Expr::Variable(name) => Ok(Self::sanitize_var(name)),

            Expr::InterpolatedText(parts) => {
                let mut fmt_string = String::new();
                let mut arg_exprs = Vec::new();

                for part in parts {
                    match part {
                        InterpolatePart::Literal(s) => {
                            fmt_string.push_str(&s.replace('{', "{{").replace('}', "}}"));
                        }
                        InterpolatePart::Expr(e) => {
                            fmt_string.push_str("{}");
                            let code = self.transpile_expr(e)?;
                            arg_exprs.push(format!("({}).display()", code));
                        }
                    }
                }

                if arg_exprs.is_empty() {
                    Ok(format!("Value::Text({:?}.to_string())", fmt_string))
                } else {
                    Ok(format!(
                        "Value::Text(format!({:?}, {}))",
                        fmt_string,
                        arg_exprs.join(", ")
                    ))
                }
            }

            Expr::Binary(left, op, right) => {
                let l = self.transpile_expr(left)?;
                let r = self.transpile_expr(right)?;

                match op {
                    BinOp::Add => Ok(format!("({}).add(&({}))", l, r)),
                    BinOp::Sub => Ok(format!("({}).sub(&({}))", l, r)),
                    BinOp::Mul => Ok(format!("({}).mul(&({}))", l, r)),
                    BinOp::Div => Ok(format!("({}).div(&({}))", l, r)),
                    BinOp::Gt => Ok(format!("({}).gt(&({}))", l, r)),
                    BinOp::Lt => Ok(format!("({}).lt(&({}))", l, r)),
                    BinOp::Ge => Ok(format!("({}).ge(&({}))", l, r)),
                    BinOp::Le => Ok(format!("({}).le(&({}))", l, r)),
                    BinOp::Eq => Ok(format!("({}).eq_val(&({}))", l, r)),
                    BinOp::Ne => Ok(format!("({}).ne_val(&({}))", l, r)),
                    BinOp::And => Ok(format!("({}).and(&({}))", l, r)),
                    BinOp::Or => Ok(format!("({}).or(&({}))", l, r)),
                    BinOp::Contains => Ok(format!("({}).contains(&({}))", l, r)),
                    BinOp::StartsWith => Ok(format!("({}).starts_with(&({}))", l, r)),
                    BinOp::EndsWith => Ok(format!("({}).ends_with(&({}))", l, r)),
                }
            }

            Expr::Between { value, min, max } => {
                let v = self.transpile_expr(value)?;
                let low = self.transpile_expr(min)?;
                let high = self.transpile_expr(max)?;
                Ok(format!("({}).between(&({}), &({}))", v, low, high))
            }

            Expr::Not(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).not()", code))
            }

            Expr::Neg(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).neg()", code))
            }

            Expr::List(elements) => {
                let mut parts = Vec::new();
                for e in elements {
                    parts.push(self.transpile_expr(e)?);
                }
                Ok(format!("Value::List(vec![{}])", parts.join(", ")))
            }

            Expr::Call { name, args } => {
                let fn_name = Self::sanitize_fn(name);
                let mut parts = Vec::new();
                for a in args {
                    parts.push(self.transpile_expr(a)?);
                }
                Ok(format!("{}({})", fn_name, parts.join(", ")))
            }

            Expr::Uppercase(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).uppercase_of()", code))
            }

            Expr::Lowercase(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).lowercase_of()", code))
            }

            Expr::LengthOf(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).length_of()", code))
            }

            Expr::FirstOf(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).first_of()", code))
            }

            Expr::LastOf(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).last_of()", code))
            }

            Expr::ItemAt { index, target } => {
                let idx = self.transpile_expr(index)?;
                let tgt = self.transpile_expr(target)?;
                Ok(format!("({}).item_at(&({}))", tgt, idx))
            }

            Expr::SumOf(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).sum_of()", code))
            }

            Expr::AverageOf(inner) => {
                let code = self.transpile_expr(inner)?;
                Ok(format!("({}).average_of()", code))
            }
        }
    }
}

pub fn transpile_program(program: &[Stmt]) -> Result<String, String> {
    let mut transpiler = Transpiler::new();
    transpiler.transpile_program(program)
}

const RUNTIME_PREAMBLE: &str = r#"// Generated by Plain v0.4 Compiler (standalone Rust source)
#![allow(unused_mut, unreachable_code, unused_variables, dead_code)]

#[derive(Debug, Clone, PartialEq)]
enum Value {
    Number(f64),
    Text(String),
    Bool(bool),
    List(Vec<Value>),
}

#[allow(dead_code)]
impl Value {
    fn is_truthy(&self) -> bool {
        match self {
            Value::Bool(b) => *b,
            Value::Number(n) => *n != 0.0,
            Value::Text(s) => !s.is_empty(),
            Value::List(l) => !l.is_empty(),
        }
    }

    fn as_number(&self) -> f64 {
        match self {
            Value::Number(n) => *n,
            other => panic!("Expected a number, got {}", other.type_name()),
        }
    }

    fn as_text(&self) -> &str {
        match self {
            Value::Text(s) => s,
            other => panic!("Expected text, got {}", other.type_name()),
        }
    }

    fn as_list(&self) -> &[Value] {
        match self {
            Value::List(l) => l,
            other => panic!("Expected a list, got {}", other.type_name()),
        }
    }

    fn as_list_mut(&mut self) -> &mut Vec<Value> {
        match self {
            Value::List(l) => l,
            other => panic!("Expected a list, got {}", other.type_name()),
        }
    }

    fn type_name(&self) -> &'static str {
        match self {
            Value::Number(_) => "a number",
            Value::Text(_) => "text",
            Value::Bool(_) => "true/false",
            Value::List(_) => "a list",
        }
    }

    fn display(&self) -> String {
        match self {
            Value::Number(n) if n.fract() == 0.0 && n.abs() < 1e15 => format!("{}", *n as i64),
            Value::Number(n) => format!("{}", n),
            Value::Text(s) => s.clone(),
            Value::Bool(b) => format!("{}", b),
            Value::List(items) => {
                let parts: Vec<String> = items.iter().map(|item| item.display()).collect();
                format!("[{}]", parts.join(", "))
            }
        }
    }

    fn add(&self, other: &Value) -> Value {
        match (self, other) {
            (Value::Number(a), Value::Number(b)) => Value::Number(a + b),
            _ => Value::Text(format!("{}{}", self.display(), other.display())),
        }
    }

    fn sub(&self, other: &Value) -> Value {
        Value::Number(self.as_number() - other.as_number())
    }

    fn mul(&self, other: &Value) -> Value {
        Value::Number(self.as_number() * other.as_number())
    }

    fn div(&self, other: &Value) -> Value {
        let b = other.as_number();
        if b == 0.0 {
            panic!("Division by zero");
        }
        Value::Number(self.as_number() / b)
    }

    fn gt(&self, other: &Value) -> Value {
        match (self, other) {
            (Value::Number(a), Value::Number(b)) => Value::Bool(a > b),
            (Value::Text(a), Value::Text(b)) => Value::Bool(a > b),
            _ => panic!("Cannot compare {} and {}", self.type_name(), other.type_name()),
        }
    }

    fn lt(&self, other: &Value) -> Value {
        match (self, other) {
            (Value::Number(a), Value::Number(b)) => Value::Bool(a < b),
            (Value::Text(a), Value::Text(b)) => Value::Bool(a < b),
            _ => panic!("Cannot compare {} and {}", self.type_name(), other.type_name()),
        }
    }

    fn ge(&self, other: &Value) -> Value {
        match (self, other) {
            (Value::Number(a), Value::Number(b)) => Value::Bool(a >= b),
            (Value::Text(a), Value::Text(b)) => Value::Bool(a >= b),
            _ => panic!("Cannot compare {} and {}", self.type_name(), other.type_name()),
        }
    }

    fn le(&self, other: &Value) -> Value {
        match (self, other) {
            (Value::Number(a), Value::Number(b)) => Value::Bool(a <= b),
            (Value::Text(a), Value::Text(b)) => Value::Bool(a <= b),
            _ => panic!("Cannot compare {} and {}", self.type_name(), other.type_name()),
        }
    }

    fn eq_val(&self, other: &Value) -> Value {
        Value::Bool(self == other)
    }

    fn ne_val(&self, other: &Value) -> Value {
        Value::Bool(self != other)
    }

    fn and(&self, other: &Value) -> Value {
        Value::Bool(self.is_truthy() && other.is_truthy())
    }

    fn or(&self, other: &Value) -> Value {
        Value::Bool(self.is_truthy() || other.is_truthy())
    }

    fn not(&self) -> Value {
        Value::Bool(!self.is_truthy())
    }

    fn neg(&self) -> Value {
        Value::Number(-self.as_number())
    }

    fn between(&self, min: &Value, max: &Value) -> Value {
        let v = self.as_number();
        let low = min.as_number();
        let high = max.as_number();
        Value::Bool(v >= low && v <= high)
    }

    fn contains(&self, other: &Value) -> Value {
        match (self, other) {
            (Value::Text(s), Value::Text(sub)) => Value::Bool(s.contains(sub)),
            (Value::List(items), target) => Value::Bool(items.contains(target)),
            _ => panic!("Cannot check if {} contains {}", self.type_name(), other.type_name()),
        }
    }

    fn starts_with(&self, other: &Value) -> Value {
        match (self, other) {
            (Value::Text(s), Value::Text(sub)) => Value::Bool(s.starts_with(sub)),
            _ => panic!("Cannot check if {} starts with {}", self.type_name(), other.type_name()),
        }
    }

    fn ends_with(&self, other: &Value) -> Value {
        match (self, other) {
            (Value::Text(s), Value::Text(sub)) => Value::Bool(s.ends_with(sub)),
            _ => panic!("Cannot check if {} ends with {}", self.type_name(), other.type_name()),
        }
    }

    fn length_of(&self) -> Value {
        match self {
            Value::List(l) => Value::Number(l.len() as f64),
            Value::Text(s) => Value::Number(s.chars().count() as f64),
            other => panic!("Cannot get length of {}", other.type_name()),
        }
    }

    fn first_of(&self) -> Value {
        match self {
            Value::List(l) => l.first().cloned().expect("Cannot get first item of an empty list"),
            Value::Text(s) => s.chars().next().map(|c| Value::Text(c.to_string())).expect("Cannot get first character of empty text"),
            other => panic!("Cannot get first item of {}", other.type_name()),
        }
    }

    fn last_of(&self) -> Value {
        match self {
            Value::List(l) => l.last().cloned().expect("Cannot get last item of an empty list"),
            Value::Text(s) => s.chars().last().map(|c| Value::Text(c.to_string())).expect("Cannot get last character of empty text"),
            other => panic!("Cannot get last item of {}", other.type_name()),
        }
    }

    fn item_at(&self, idx_val: &Value) -> Value {
        let idx = idx_val.as_number() as i64;
        match self {
            Value::List(l) => {
                if idx < 1 || idx as usize > l.len() {
                    panic!("Item index {} is out of bounds for list of length {}", idx, l.len());
                }
                l[(idx - 1) as usize].clone()
            }
            Value::Text(s) => {
                let chars: Vec<char> = s.chars().collect();
                if idx < 1 || idx as usize > chars.len() {
                    panic!("Character index {} is out of bounds for text of length {}", idx, chars.len());
                }
                Value::Text(chars[(idx - 1) as usize].to_string())
            }
            other => panic!("Cannot index into {}", other.type_name()),
        }
    }

    fn sum_of(&self) -> Value {
        let list = self.as_list();
        let mut sum = 0.0;
        for item in list {
            sum += item.as_number();
        }
        Value::Number(sum)
    }

    fn average_of(&self) -> Value {
        let list = self.as_list();
        if list.is_empty() {
            panic!("Cannot calculate average of an empty list");
        }
        let mut sum = 0.0;
        for item in list {
            sum += item.as_number();
        }
        Value::Number(sum / list.len() as f64)
    }

    fn uppercase_of(&self) -> Value {
        Value::Text(self.as_text().to_uppercase())
    }

    fn lowercase_of(&self) -> Value {
        Value::Text(self.as_text().to_lowercase())
    }
}
"#;
