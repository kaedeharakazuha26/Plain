use serde::Serialize;
use std::fmt;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum Value {
    Number(f64),
    Text(String),
    Bool(bool),
    List(Vec<Value>),
}

impl Value {
    pub fn is_truthy(&self) -> bool {
        match self {
            Value::Bool(b) => *b,
            Value::Number(n) => *n != 0.0,
            Value::Text(s) => !s.is_empty(),
            Value::List(l) => !l.is_empty(),
        }
    }

    pub fn as_number(&self) -> Result<f64, String> {
        match self {
            Value::Number(n) => Ok(*n),
            other => Err(format!("Expected a number, got {}", other.type_name())),
        }
    }

    pub fn as_text(&self) -> Result<&str, String> {
        match self {
            Value::Text(s) => Ok(s),
            other => Err(format!("Expected text, got {}", other.type_name())),
        }
    }

    pub fn as_list(&self) -> Result<&[Value], String> {
        match self {
            Value::List(l) => Ok(l),
            other => Err(format!("Expected a list, got {}", other.type_name())),
        }
    }

    pub fn as_list_mut(&mut self) -> Result<&mut Vec<Value>, String> {
        match self {
            Value::List(l) => Ok(l),
            other => Err(format!("Expected a list, got {}", other.type_name())),
        }
    }

    pub fn type_name(&self) -> &'static str {
        match self {
            Value::Number(_) => "a number",
            Value::Text(_) => "text",
            Value::Bool(_) => "true/false",
            Value::List(_) => "a list",
        }
    }
}

impl fmt::Display for Value {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Value::Number(n) if n.fract() == 0.0 && n.abs() < 1e15 => write!(f, "{}", *n as i64),
            Value::Number(n) => write!(f, "{}", n),
            Value::Text(s) => write!(f, "{}", s),
            Value::Bool(b) => write!(f, "{}", b),
            Value::List(items) => {
                let parts: Vec<String> = items.iter().map(|item| item.to_string()).collect();
                write!(f, "[{}]", parts.join(", "))
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    Gt,
    Lt,
    Ge,
    Le,
    Eq,
    Ne,
    And,
    Or,
}

#[derive(Debug, Clone, Serialize)]
pub enum Expr {
    Literal(Value),
    Variable(String),
    Binary(Box<Expr>, BinOp, Box<Expr>),
    Not(Box<Expr>),
    Neg(Box<Expr>),
    List(Vec<Expr>),
    Call { name: String, args: Vec<Expr> },
    Uppercase(Box<Expr>),
    Lowercase(Box<Expr>),
    LengthOf(Box<Expr>),
    FirstOf(Box<Expr>),
    LastOf(Box<Expr>),
    ItemAt { index: Box<Expr>, target: Box<Expr> },
    Between { value: Box<Expr>, min: Box<Expr>, max: Box<Expr> },
}

#[derive(Debug, Clone, Serialize)]
pub enum Stmt {
    Set { name: String, value: Expr },
    Say { expr: Expr },
    If { condition: Expr, then_body: Vec<Stmt>, else_body: Vec<Stmt> },
    Repeat { times: Expr, body: Vec<Stmt> },
    While { condition: Expr, body: Vec<Stmt> },
    Ask { name: String, prompt: Expr },
    Define { name: String, params: Vec<String>, body: Vec<Stmt> },
    Return { expr: Option<Expr> },
    Call { name: String, args: Vec<Expr> },
    Add { value: Expr, target: String },
    ForEach { item_name: String, list: Expr, body: Vec<Stmt> },
    Increase { name: String, by: Expr },
    Decrease { name: String, by: Expr },
}
