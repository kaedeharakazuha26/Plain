// Interpreter: walks the AST and executes it. Variables live in a HashMap.
use crate::ast::{BinOp, Expr, Stmt, Value};
use std::collections::HashMap;

pub struct Interpreter {
    pub vars: HashMap<String, Value>,
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
        Interpreter {
            vars: HashMap::new(),
            output: Vec::new(),
            silent: false,
        }
    }

    pub fn new_silent() -> Self {
        Interpreter {
            vars: HashMap::new(),
            output: Vec::new(),
            silent: true,
        }
    }

    pub fn run(&mut self, program: &[Stmt]) -> Result<(), String> {
        self.exec_block(program)
    }

    fn exec_block(&mut self, stmts: &[Stmt]) -> Result<(), String> {
        for stmt in stmts {
            self.exec(stmt)?;
        }
        Ok(())
    }

    fn exec(&mut self, stmt: &Stmt) -> Result<(), String> {
        match stmt {
            Stmt::Set { name, value } => {
                let v = self.eval(value)?;
                self.vars.insert(name.clone(), v);
                Ok(())
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
                Ok(())
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
                    self.exec_block(body)?;
                }
                Ok(())
            }

            Stmt::While { condition, body } => {
                let mut guard = 0u64;
                while self.eval(condition)?.is_truthy() {
                    self.exec_block(body)?;
                    guard += 1;
                    if guard > 1_000_000 {
                        return Err("while loop stopped: over 1,000,000 iterations (infinite loop?)".into());
                    }
                }
                Ok(())
            }
        }
    }

    fn eval(&self, expr: &Expr) -> Result<Value, String> {
        match expr {
            Expr::Literal(v) => Ok(v.clone()),

            Expr::Variable(name) => self
                .vars
                .get(name)
                .cloned()
                .ok_or_else(|| format!("Unknown name '{}' (did you forget: set {} to ...?)", name, name)),

            Expr::Not(inner) => Ok(Value::Bool(!self.eval(inner)?.is_truthy())),
            Expr::Neg(inner) => Ok(Value::Number(-self.eval(inner)?.as_number()?)),

            Expr::Binary(left, op, right) => {
                // and / or short-circuit, and work on truthiness
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
                    // "+" joins text too: "Hello, " + name
                    BinOp::Add => match (&l, &r) {
                        (Value::Text(_), _) | (_, Value::Text(_)) => {
                            Ok(Value::Text(format!("{}{}", l, r)))
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
