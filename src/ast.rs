use serde::Serialize;
use std::fmt;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum Value {
    Number(f64),
    Text(String),
    Bool(bool),
}

impl Value {
    pub fn is_truthy(&self) -> bool {
        match self {
            Value::Bool(b) => *b,
            Value::Number(n) => *n != 0.0,
            Value::Text(s) => !s.is_empty(),
        }
    }

    pub fn as_number(&self) -> Result<f64, String> {
        match self {
            Value::Number(n) => Ok(*n),
            other => Err(format!("Expected a number, got {}", other.type_name())),
        }
    }

    pub fn type_name(&self) -> &'static str {
        match self {
            Value::Number(_) => "a number",
            Value::Text(_) => "text",
            Value::Bool(_) => "true/false",
        }
    }
}

impl fmt::Display for Value {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            // print 20 not 20.0, but keep real decimals
            Value::Number(n) if n.fract() == 0.0 && n.abs() < 1e15 => write!(f, "{}", *n as i64),
            Value::Number(n) => write!(f, "{}", n),
            Value::Text(s) => write!(f, "{}", s),
            Value::Bool(b) => write!(f, "{}", b),
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
}

#[derive(Debug, Clone, Serialize)]
pub enum Stmt {
    Set { name: String, value: Expr },
    Say { expr: Expr },
    If { condition: Expr, then_body: Vec<Stmt>, else_body: Vec<Stmt> },
    Repeat { times: Expr, body: Vec<Stmt> },
    While { condition: Expr, body: Vec<Stmt> },
}
