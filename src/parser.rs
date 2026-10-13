// Parser: tokens -> AST for Plain v0.2
use crate::ast::{BinOp, Expr, Stmt, Value};
use crate::lexer::{Token, TokenKind};

pub struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Self {
        Parser { tokens, pos: 0 }
    }

    fn peek(&self) -> &TokenKind {
        &self.tokens[self.pos].kind
    }

    fn line(&self) -> usize {
        self.tokens[self.pos].line
    }

    fn next(&mut self) -> Token {
        let t = self.tokens[self.pos].clone();
        if self.pos < self.tokens.len() - 1 {
            self.pos += 1;
        }
        t
    }

    fn expect(&mut self, kind: TokenKind) -> Result<(), String> {
        if *self.peek() == kind {
            self.next();
            Ok(())
        } else {
            Err(format!(
                "Line {}: expected {:?}, found {:?}",
                self.line(),
                kind,
                self.peek()
            ))
        }
    }

    fn skip_newlines(&mut self) {
        while *self.peek() == TokenKind::Newline {
            self.next();
        }
    }

    pub fn parse_program(&mut self) -> Result<Vec<Stmt>, String> {
        let body = self.parse_block(&[])?;
        self.expect(TokenKind::Eof)?;
        Ok(body)
    }

    /// Parse statements until EOF or one of `stop` (not consumed).
    fn parse_block(&mut self, stop: &[TokenKind]) -> Result<Vec<Stmt>, String> {
        let mut stmts = Vec::new();
        loop {
            self.skip_newlines();
            if *self.peek() == TokenKind::Eof || stop.contains(self.peek()) {
                break;
            }
            stmts.push(self.parse_stmt()?);
            // a statement ends at a newline, a block keyword, or EOF
            if !matches!(self.peek(), TokenKind::Newline | TokenKind::Eof)
                && !stop.contains(self.peek())
            {
                return Err(format!(
                    "Line {}: unexpected {:?} after statement (missing newline?)",
                    self.line(),
                    self.peek()
                ));
            }
        }
        Ok(stmts)
    }

    fn parse_if(&mut self) -> Result<Stmt, String> {
        self.next(); // consume 'if'
        let condition = self.parse_expr()?;
        if *self.peek() == TokenKind::Then {
            self.next();
        }
        let then_body = self.parse_block(&[TokenKind::Otherwise, TokenKind::End])?;
        let else_body = if *self.peek() == TokenKind::Otherwise {
            self.next(); // consume 'otherwise'
            if *self.peek() == TokenKind::If {
                // chained 'otherwise if'
                vec![self.parse_if()?]
            } else {
                let b = self.parse_block(&[TokenKind::End])?;
                self.expect(TokenKind::End)?;
                b
            }
        } else {
            self.expect(TokenKind::End)?;
            Vec::new()
        };
        Ok(Stmt::If { condition, then_body, else_body })
    }

    fn parse_stmt(&mut self) -> Result<Stmt, String> {
        match self.peek().clone() {
            TokenKind::Set | TokenKind::Change => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => {
                        return Err(format!(
                            "Line {}: 'set' needs a variable name, found {:?}",
                            self.line(),
                            other
                        ))
                    }
                };
                self.expect(TokenKind::To)?;
                let value = self.parse_expr()?;
                Ok(Stmt::Set { name, value })
            }

            TokenKind::Say => {
                self.next();
                let expr = self.parse_expr()?;
                Ok(Stmt::Say { expr })
            }

            TokenKind::If => self.parse_if(),

            TokenKind::Repeat => {
                self.next();
                let times = self.parse_expr()?;
                self.expect(TokenKind::Times)?;
                let body = self.parse_block(&[TokenKind::End])?;
                self.expect(TokenKind::End)?;
                Ok(Stmt::Repeat { times, body })
            }

            TokenKind::While => {
                self.next();
                let condition = self.parse_expr()?;
                let body = self.parse_block(&[TokenKind::End])?;
                self.expect(TokenKind::End)?;
                Ok(Stmt::While { condition, body })
            }

            // v0.2: ask name with "Prompt"
            TokenKind::Ask => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'ask' needs a variable name, found {:?}", self.line(), other)),
                };
                self.expect(TokenKind::With)?;
                let prompt = self.parse_expr()?;
                Ok(Stmt::Ask { name, prompt })
            }

            // v0.2: define greet with name, age ... end
            TokenKind::Define => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'define' needs a function name, found {:?}", self.line(), other)),
                };

                let mut params = Vec::new();
                if *self.peek() == TokenKind::With {
                    self.next();
                    loop {
                        match self.next().kind {
                            TokenKind::Ident(p) => params.push(p),
                            other => return Err(format!("Line {}: expected parameter name after 'with', found {:?}", self.line(), other)),
                        }
                        if *self.peek() == TokenKind::Comma {
                            self.next();
                        } else {
                            break;
                        }
                    }
                }

                let body = self.parse_block(&[TokenKind::End])?;
                self.expect(TokenKind::End)?;
                Ok(Stmt::Define { name, params, body })
            }

            // v0.2: return <expr>
            TokenKind::Return => {
                self.next();
                let expr = if matches!(self.peek(), TokenKind::Newline | TokenKind::Eof | TokenKind::End | TokenKind::Otherwise) {
                    None
                } else {
                    Some(self.parse_expr()?)
                };
                Ok(Stmt::Return { expr })
            }

            // v0.2: call greet with "jhomar"
            TokenKind::Call => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'call' needs a function name, found {:?}", self.line(), other)),
                };

                let mut args = Vec::new();
                if *self.peek() == TokenKind::With {
                    self.next();
                    loop {
                        args.push(self.parse_expr()?);
                        if *self.peek() == TokenKind::Comma {
                            self.next();
                        } else {
                            break;
                        }
                    }
                }
                Ok(Stmt::Call { name, args })
            }

            // v0.2: add 100 to scores
            TokenKind::Add => {
                self.next();
                let value = self.parse_expr()?;
                self.expect(TokenKind::To)?;
                let target = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'add ... to' needs a target variable name, found {:?}", self.line(), other)),
                };
                Ok(Stmt::Add { value, target })
            }

            // v0.2: for each score in scores ... end
            TokenKind::For => {
                self.next();
                self.expect(TokenKind::Each)?;
                let item_name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'for each' needs an item variable name, found {:?}", self.line(), other)),
                };
                self.expect(TokenKind::In)?;
                let list = self.parse_expr()?;
                let body = self.parse_block(&[TokenKind::End])?;
                self.expect(TokenKind::End)?;
                Ok(Stmt::ForEach { item_name, list, body })
            }

            // v0.2: increase lives / increase lives by 2
            TokenKind::Increase => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'increase' needs a variable name, found {:?}", self.line(), other)),
                };
                let by = if *self.peek() == TokenKind::By {
                    self.next();
                    self.parse_expr()?
                } else {
                    Expr::Literal(Value::Number(1.0))
                };
                Ok(Stmt::Increase { name, by })
            }

            // v0.2: decrease lives / decrease lives by 1
            TokenKind::Decrease => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'decrease' needs a variable name, found {:?}", self.line(), other)),
                };
                let by = if *self.peek() == TokenKind::By {
                    self.next();
                    self.parse_expr()?
                } else {
                    Expr::Literal(Value::Number(1.0))
                };
                Ok(Stmt::Decrease { name, by })
            }

            other => Err(format!(
                "Line {}: unexpected statement starting with {:?}",
                self.line(),
                other
            )),
        }
    }

    // ---- expressions, lowest precedence first ----

    pub fn parse_expr(&mut self) -> Result<Expr, String> {
        self.parse_or()
    }

    fn parse_or(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_and()?;
        while *self.peek() == TokenKind::Or {
            self.next();
            let right = self.parse_and()?;
            left = Expr::Binary(Box::new(left), BinOp::Or, Box::new(right));
        }
        Ok(left)
    }

    fn parse_and(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_comparison()?;
        while *self.peek() == TokenKind::And {
            self.next();
            let right = self.parse_comparison()?;
            left = Expr::Binary(Box::new(left), BinOp::And, Box::new(right));
        }
        Ok(left)
    }

    fn parse_comparison(&mut self) -> Result<Expr, String> {
        let left = self.parse_additive()?;

        match self.peek().clone() {
            TokenKind::Gt => {
                self.next();
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::Gt, Box::new(right)))
            }
            TokenKind::Lt => {
                self.next();
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::Lt, Box::new(right)))
            }
            TokenKind::Ge => {
                self.next();
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::Ge, Box::new(right)))
            }
            TokenKind::Le => {
                self.next();
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::Le, Box::new(right)))
            }
            TokenKind::EqEq => {
                self.next();
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::Eq, Box::new(right)))
            }
            TokenKind::NotEq => {
                self.next();
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::Ne, Box::new(right)))
            }
            TokenKind::Is => {
                self.next(); // consume 'is'

                // Check for 'is between <min> and <max>'
                if *self.peek() == TokenKind::Between {
                    self.next();
                    let min = self.parse_additive()?;
                    self.expect(TokenKind::And)?;
                    let max = self.parse_additive()?;
                    return Ok(Expr::Between {
                        value: Box::new(left),
                        min: Box::new(min),
                        max: Box::new(max),
                    });
                }

                // English comparison phrases
                let op = match self.peek().clone() {
                    TokenKind::Above => { self.next(); BinOp::Gt }
                    TokenKind::Below => { self.next(); BinOp::Lt }
                    TokenKind::Greater => {
                        self.next();
                        self.expect(TokenKind::Than)?;
                        BinOp::Gt
                    }
                    TokenKind::Less => {
                        self.next();
                        self.expect(TokenKind::Than)?;
                        BinOp::Lt
                    }
                    TokenKind::At => {
                        self.next();
                        match self.next().kind {
                            TokenKind::Least => BinOp::Ge,
                            TokenKind::Most => BinOp::Le,
                            other => return Err(format!("Line {}: expected 'least' or 'most' after 'at', found {:?}", self.line(), other)),
                        }
                    }
                    TokenKind::Equal => {
                        self.next();
                        self.expect(TokenKind::To)?;
                        BinOp::Eq
                    }
                    TokenKind::Not => {
                        self.next();
                        self.expect(TokenKind::Equal)?;
                        self.expect(TokenKind::To)?;
                        BinOp::Ne
                    }
                    TokenKind::Different => {
                        self.next();
                        self.expect(TokenKind::From)?;
                        BinOp::Ne
                    }
                    TokenKind::Same => {
                        self.next();
                        self.expect(TokenKind::As)?;
                        BinOp::Eq
                    }
                    _ => BinOp::Eq, // plain 'is' = equals
                };

                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), op, Box::new(right)))
            }
            _ => Ok(left),
        }
    }

    fn parse_additive(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_multiplicative()?;
        loop {
            let op = match self.peek() {
                TokenKind::Plus => BinOp::Add,
                TokenKind::Minus => BinOp::Sub,
                _ => break,
            };
            self.next();
            let right = self.parse_multiplicative()?;
            left = Expr::Binary(Box::new(left), op, Box::new(right));
        }
        Ok(left)
    }

    fn parse_multiplicative(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_unary()?;
        loop {
            let op = match self.peek() {
                TokenKind::Star => { self.next(); BinOp::Mul }
                TokenKind::Slash => { self.next(); BinOp::Div }
                TokenKind::Multiplied => {
                    self.next();
                    self.expect(TokenKind::By)?;
                    BinOp::Mul
                }
                TokenKind::Divided => {
                    self.next();
                    self.expect(TokenKind::By)?;
                    BinOp::Div
                }
                _ => break,
            };
            let right = self.parse_unary()?;
            left = Expr::Binary(Box::new(left), op, Box::new(right));
        }
        Ok(left)
    }

    fn parse_unary(&mut self) -> Result<Expr, String> {
        match self.peek() {
            TokenKind::Not => {
                self.next();
                Ok(Expr::Not(Box::new(self.parse_unary()?)))
            }
            TokenKind::Minus => {
                self.next();
                Ok(Expr::Neg(Box::new(self.parse_unary()?)))
            }
            _ => self.parse_primary(),
        }
    }

    fn parse_primary(&mut self) -> Result<Expr, String> {
        match self.peek().clone() {
            TokenKind::Number(n) => {
                self.next();
                Ok(Expr::Literal(Value::Number(n)))
            }
            TokenKind::Text(s) => {
                self.next();
                Ok(Expr::Literal(Value::Text(s)))
            }
            TokenKind::True => {
                self.next();
                Ok(Expr::Literal(Value::Bool(true)))
            }
            TokenKind::False => {
                self.next();
                Ok(Expr::Literal(Value::Bool(false)))
            }
            TokenKind::LParen => {
                self.next();
                let expr = self.parse_expr()?;
                self.expect(TokenKind::RParen)?;
                Ok(expr)
            }

            // v0.2: list literal [80, 90, 75]
            TokenKind::LBracket => {
                self.next();
                let mut items = Vec::new();
                while *self.peek() != TokenKind::RBracket && *self.peek() != TokenKind::Eof {
                    items.push(self.parse_expr()?);
                    if *self.peek() == TokenKind::Comma {
                        self.next();
                    } else {
                        break;
                    }
                }
                self.expect(TokenKind::RBracket)?;
                Ok(Expr::List(items))
            }

            // v0.2: call sum_of with 5, 3 (as expression)
            TokenKind::Call => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'call' needs a function name, found {:?}", self.line(), other)),
                };
                let mut args = Vec::new();
                if *self.peek() == TokenKind::With {
                    self.next();
                    loop {
                        args.push(self.parse_expr()?);
                        if *self.peek() == TokenKind::Comma {
                            self.next();
                        } else {
                            break;
                        }
                    }
                }
                Ok(Expr::Call { name, args })
            }

            // v0.2: uppercase of <expr>
            TokenKind::Uppercase => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::Uppercase(Box::new(inner)))
            }

            // v0.2: lowercase of <expr>
            TokenKind::Lowercase => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::Lowercase(Box::new(inner)))
            }

            // v0.2: length of <expr>
            TokenKind::Length => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::LengthOf(Box::new(inner)))
            }

            // v0.2: first of <expr>
            TokenKind::First => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::FirstOf(Box::new(inner)))
            }

            // v0.2: last of <expr>
            TokenKind::Last => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::LastOf(Box::new(inner)))
            }

            // v0.2: item <index> of <expr>
            TokenKind::Item => {
                self.next();
                let index = self.parse_primary()?;
                self.expect(TokenKind::Of)?;
                let target = self.parse_primary()?;
                Ok(Expr::ItemAt {
                    index: Box::new(index),
                    target: Box::new(target),
                })
            }

            TokenKind::Ident(name) => {
                self.next();
                Ok(Expr::Variable(name))
            }

            other => Err(format!(
                "Line {}: expected a value or expression, found {:?}",
                self.line(),
                other
            )),
        }
    }
}
