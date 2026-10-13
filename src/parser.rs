// Parser: tokens -> AST.
// Statement grammar (one per line, blocks end with `end`):
//   set <name> to <expr>
//   say <expr>
//   if <expr> [then] ... [otherwise ...] end
//   repeat <expr> times ... end
//   while <expr> ... end
//
// Expression phrases:
//   is above / is below / is at least / is at most / is equal to / is not equal to
//   plus the usual symbols: + - * / > < >= <= == !=  and / or / not  ( )

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

    fn parse_stmt(&mut self) -> Result<Stmt, String> {
        match self.peek().clone() {
            TokenKind::Set => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    other => {
                        return Err(format!(
                            "Line {}: 'set' needs a name, found {:?}",
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

            TokenKind::If => {
                self.next();
                let condition = self.parse_expr()?;
                if *self.peek() == TokenKind::Then {
                    self.next();
                }
                let then_body = self.parse_block(&[TokenKind::Otherwise, TokenKind::End])?;
                let else_body = if *self.peek() == TokenKind::Otherwise {
                    self.next();
                    self.parse_block(&[TokenKind::End])?
                } else {
                    Vec::new()
                };
                self.expect(TokenKind::End)?;
                Ok(Stmt::If { condition, then_body, else_body })
            }

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

            other => Err(format!(
                "Line {}: expected set / say / if / repeat / while, found {:?}",
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
        let mut left = self.parse_additive()?;

        loop {
            let op = match self.peek().clone() {
                TokenKind::Gt => { self.next(); BinOp::Gt }
                TokenKind::Lt => { self.next(); BinOp::Lt }
                TokenKind::Ge => { self.next(); BinOp::Ge }
                TokenKind::Le => { self.next(); BinOp::Le }
                TokenKind::EqEq => { self.next(); BinOp::Eq }
                TokenKind::NotEq => { self.next(); BinOp::Ne }
                TokenKind::Is => {
                    self.next();
                    match self.peek().clone() {
                        TokenKind::Above => { self.next(); BinOp::Gt }
                        TokenKind::Below => { self.next(); BinOp::Lt }
                        TokenKind::At => {
                            self.next();
                            match self.next().kind {
                                TokenKind::Least => BinOp::Ge,
                                TokenKind::Most => BinOp::Le,
                                other => return Err(format!(
                                    "Line {}: expected 'least' or 'most' after 'at', found {:?}",
                                    self.line(), other
                                )),
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
                        _ => BinOp::Eq, // plain "is" = equals
                    }
                }
                _ => break,
            };
            let right = self.parse_additive()?;
            left = Expr::Binary(Box::new(left), op, Box::new(right));
        }
        Ok(left)
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
                TokenKind::Star => BinOp::Mul,
                TokenKind::Slash => BinOp::Div,
                _ => break,
            };
            self.next();
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
        match self.next().kind {
            TokenKind::Number(n) => Ok(Expr::Literal(Value::Number(n))),
            TokenKind::Text(s) => Ok(Expr::Literal(Value::Text(s))),
            TokenKind::True => Ok(Expr::Literal(Value::Bool(true))),
            TokenKind::False => Ok(Expr::Literal(Value::Bool(false))),
            TokenKind::Ident(name) => Ok(Expr::Variable(name)),
            TokenKind::LParen => {
                let expr = self.parse_expr()?;
                self.expect(TokenKind::RParen)?;
                Ok(expr)
            }
            other => Err(format!(
                "Line {}: expected a value, found {:?}",
                self.line(),
                other
            )),
        }
    }
}
