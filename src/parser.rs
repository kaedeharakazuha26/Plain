// Parser: tokens -> AST for Plain v0.4
use crate::ast::{BinOp, Expr, InterpolatePart, Stmt, Value};
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
                let first_ident = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
                    other => {
                        return Err(format!(
                            "Line {}: 'set' needs a variable or field name, found {:?}",
                            self.line(),
                            other
                        ))
                    }
                };

                // Check for field path: set city of address of person to "Manila"
                if *self.peek() == TokenKind::Of {
                    let mut idents = vec![first_ident];
                    while *self.peek() == TokenKind::Of {
                        self.next(); // consume 'of'
                        match self.next().kind {
                            TokenKind::Ident(n) => idents.push(n),
                            TokenKind::Sum => idents.push("sum".to_string()),
                            other => {
                                return Err(format!(
                                    "Line {}: expected record/field name after 'of', found {:?}",
                                    self.line(),
                                    other
                                ))
                            }
                        }
                    }
                    self.expect(TokenKind::To)?;
                    let value = self.parse_expr()?;
                    let root = idents.pop().unwrap();
                    idents.reverse();
                    Ok(Stmt::SetField { root, path: idents, value })
                } else {
                    self.expect(TokenKind::To)?;
                    let value = self.parse_expr()?;
                    Ok(Stmt::Set { name: first_ident, value })
                }
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

            TokenKind::Ask => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
                    other => return Err(format!("Line {}: 'ask' needs a variable name, found {:?}", self.line(), other)),
                };
                self.expect(TokenKind::With)?;
                let prompt = self.parse_expr()?;
                Ok(Stmt::Ask { name, prompt })
            }

            TokenKind::Define => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
                    other => return Err(format!("Line {}: 'define' needs a function name, found {:?}", self.line(), other)),
                };

                let mut params = Vec::new();
                if *self.peek() == TokenKind::With {
                    self.next();
                    loop {
                        match self.next().kind {
                            TokenKind::Ident(p) => params.push(p),
                            TokenKind::Sum => params.push("sum".to_string()),
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

            TokenKind::Return => {
                self.next();
                let expr = if matches!(self.peek(), TokenKind::Newline | TokenKind::Eof | TokenKind::End | TokenKind::Otherwise) {
                    None
                } else {
                    Some(self.parse_expr()?)
                };
                Ok(Stmt::Return { expr })
            }

            TokenKind::Call => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
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

            TokenKind::Add => {
                self.next();
                let value = self.parse_expr()?;
                self.expect(TokenKind::To)?;
                let target = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
                    other => return Err(format!("Line {}: 'add ... to' needs a target variable name, found {:?}", self.line(), other)),
                };
                Ok(Stmt::Add { value, target })
            }

            TokenKind::Remove => {
                self.next();
                if *self.peek() == TokenKind::Item {
                    self.next();
                    let index = self.parse_expr()?;
                    self.expect(TokenKind::From)?;
                    let target = match self.next().kind {
                        TokenKind::Ident(n) => n,
                        TokenKind::Sum => "sum".to_string(),
                        other => return Err(format!("Line {}: 'remove item ... from' needs a target variable name, found {:?}", self.line(), other)),
                    };
                    Ok(Stmt::RemoveItem { index, target })
                } else {
                    let value = self.parse_expr()?;
                    self.expect(TokenKind::From)?;
                    let target = match self.next().kind {
                        TokenKind::Ident(n) => n,
                        TokenKind::Sum => "sum".to_string(),
                        other => return Err(format!("Line {}: 'remove ... from' needs a target variable name, found {:?}", self.line(), other)),
                    };
                    Ok(Stmt::Remove { value, target })
                }
            }

            TokenKind::Sort => {
                self.next();
                let target = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
                    other => return Err(format!("Line {}: 'sort' needs a variable name, found {:?}", self.line(), other)),
                };
                let descending = if *self.peek() == TokenKind::Descending {
                    self.next();
                    true
                } else {
                    false
                };
                Ok(Stmt::Sort { target, descending })
            }

            TokenKind::For => {
                self.next();
                self.expect(TokenKind::Each)?;
                let item_name = match self.next().kind {
                    TokenKind::Sum => "sum".to_string(),
                    TokenKind::Ident(n) => n,
                    other => return Err(format!("Line {}: 'for each' needs an item variable name, found {:?}", self.line(), other)),
                };
                self.expect(TokenKind::In)?;

                if *self.peek() == TokenKind::File {
                    self.next();
                    let path = self.parse_expr()?;
                    let body = self.parse_block(&[TokenKind::End])?;
                    self.expect(TokenKind::End)?;
                    Ok(Stmt::ForEachLine { item_name, path, body })
                } else {
                    let list = self.parse_expr()?;
                    let body = self.parse_block(&[TokenKind::End])?;
                    self.expect(TokenKind::End)?;
                    Ok(Stmt::ForEach { item_name, list, body })
                }
            }

            TokenKind::Increase => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
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

            TokenKind::Decrease => {
                self.next();
                let name = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
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

            TokenKind::Save => {
                self.next();
                let content = self.parse_expr()?;
                self.expect(TokenKind::To)?;
                self.expect(TokenKind::File)?;
                let path = self.parse_expr()?;
                Ok(Stmt::SaveFile { content, path })
            }

            TokenKind::Append => {
                self.next();
                let content = self.parse_expr()?;
                self.expect(TokenKind::To)?;
                self.expect(TokenKind::File)?;
                let path = self.parse_expr()?;
                Ok(Stmt::AppendFile { content, path })
            }

            TokenKind::Load => {
                self.next();
                let target = match self.next().kind {
                    TokenKind::Ident(n) => n,
                    TokenKind::Sum => "sum".to_string(),
                    other => return Err(format!("Line {}: 'load' needs a variable name, found {:?}", self.line(), other)),
                };
                self.expect(TokenKind::From)?;
                self.expect(TokenKind::File)?;
                let path = self.parse_expr()?;
                Ok(Stmt::LoadFile { target, path })
            }

            TokenKind::Import => {
                self.next();
                if *self.peek() == TokenKind::File {
                    self.next();
                }
                let path = self.parse_expr()?;
                Ok(Stmt::Import { path })
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
            TokenKind::Contains => {
                self.next();
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::Contains, Box::new(right)))
            }
            TokenKind::Starts => {
                self.next();
                self.expect(TokenKind::With)?;
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::StartsWith, Box::new(right)))
            }
            TokenKind::Ends => {
                self.next();
                self.expect(TokenKind::With)?;
                let right = self.parse_additive()?;
                Ok(Expr::Binary(Box::new(left), BinOp::EndsWith, Box::new(right)))
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

    fn parse_interpolated_string(&self, raw: &str, line: usize) -> Result<Expr, String> {
        let chars: Vec<char> = raw.chars().collect();
        let mut parts = Vec::new();
        let mut current_lit = String::new();
        let mut i = 0;
        let mut has_interp = false;

        while i < chars.len() {
            if chars[i] == '{' {
                if i + 1 < chars.len() && chars[i + 1] == '{' {
                    current_lit.push('{');
                    i += 2;
                } else {
                    has_interp = true;
                    if !current_lit.is_empty() {
                        parts.push(InterpolatePart::Literal(current_lit.clone()));
                        current_lit.clear();
                    }
                    i += 1;
                    let mut expr_str = String::new();
                    let mut found_end = false;
                    while i < chars.len() {
                        if chars[i] == '}' {
                            found_end = true;
                            i += 1;
                            break;
                        }
                        expr_str.push(chars[i]);
                        i += 1;
                    }
                    if !found_end {
                        return Err(format!("Line {}: unclosed '{{' in string interpolation", line));
                    }
                    let trimmed = expr_str.trim();
                    if trimmed.is_empty() {
                        return Err(format!("Line {}: empty '{{}}' in string interpolation", line));
                    }
                    let sub_tokens = crate::lexer::tokenize(trimmed)
                        .map_err(|e| format!("Line {}: in interpolation '{{{}}}': {}", line, trimmed, e))?;
                    let mut sub_parser = Parser::new(sub_tokens);
                    let expr = sub_parser.parse_expr()
                        .map_err(|e| format!("Line {}: in interpolation '{{{}}}': {}", line, trimmed, e))?;
                    parts.push(InterpolatePart::Expr(expr));
                }
            } else if chars[i] == '}' {
                if i + 1 < chars.len() && chars[i + 1] == '}' {
                    current_lit.push('}');
                    i += 2;
                } else {
                    return Err(format!("Line {}: unexpected '}}' in string (use '}}}}' for literal '}}')", line));
                }
            } else {
                current_lit.push(chars[i]);
                i += 1;
            }
        }

        if !has_interp {
            return Ok(Expr::Literal(Value::Text(current_lit)));
        }

        if !current_lit.is_empty() {
            parts.push(InterpolatePart::Literal(current_lit));
        }

        Ok(Expr::InterpolatedText(parts))
    }

    fn parse_primary(&mut self) -> Result<Expr, String> {
        let line = self.line();
        match self.peek().clone() {
            TokenKind::Number(n) => {
                self.next();
                Ok(Expr::Literal(Value::Number(n)))
            }
            TokenKind::Text(s) => {
                self.next();
                self.parse_interpolated_string(&s, line)
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

            // Records: record with name "Ana", age 20
            TokenKind::Record => {
                self.next();
                if *self.peek() == TokenKind::With {
                    self.next();
                }
                let mut fields = Vec::new();
                loop {
                    let field_name = match self.peek().clone() {
                        TokenKind::Ident(n) => {
                            self.next();
                            n
                        }
                        TokenKind::Sum => {
                            self.next();
                            "sum".to_string()
                        }
                        _ => break,
                    };
                    let val_expr = self.parse_expr()?;
                    fields.push((field_name, val_expr));

                    if *self.peek() == TokenKind::Comma {
                        if self.pos + 1 < self.tokens.len() {
                            match &self.tokens[self.pos + 1].kind {
                                TokenKind::Ident(_) | TokenKind::Sum => {
                                    self.next(); // consume comma
                                }
                                _ => break,
                            }
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                Ok(Expr::Record(fields))
            }

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

            TokenKind::Uppercase => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::Uppercase(Box::new(inner)))
            }

            TokenKind::Lowercase => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::Lowercase(Box::new(inner)))
            }

            TokenKind::Length => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::LengthOf(Box::new(inner)))
            }

            TokenKind::First => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::FirstOf(Box::new(inner)))
            }

            TokenKind::Last => {
                self.next();
                self.expect(TokenKind::Of)?;
                let inner = self.parse_primary()?;
                Ok(Expr::LastOf(Box::new(inner)))
            }

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

            TokenKind::Sum => {
                self.next();
                if *self.peek() == TokenKind::Of {
                    self.next();
                    let target = self.parse_primary()?;
                    Ok(Expr::SumOf(Box::new(target)))
                } else {
                    Ok(Expr::Variable("sum".to_string()))
                }
            }

            TokenKind::Average => {
                self.next();
                self.expect(TokenKind::Of)?;
                let target = self.parse_primary()?;
                Ok(Expr::AverageOf(Box::new(target)))
            }

            TokenKind::Smallest => {
                self.next();
                self.expect(TokenKind::Of)?;
                let target = self.parse_primary()?;
                Ok(Expr::SmallestOf(Box::new(target)))
            }

            TokenKind::Largest => {
                self.next();
                self.expect(TokenKind::Of)?;
                let target = self.parse_primary()?;
                Ok(Expr::LargestOf(Box::new(target)))
            }

            TokenKind::Reverse => {
                self.next();
                self.expect(TokenKind::Of)?;
                let target = self.parse_primary()?;
                Ok(Expr::ReverseOf(Box::new(target)))
            }

            TokenKind::Trim => {
                self.next();
                self.expect(TokenKind::Of)?;
                let target = self.parse_primary()?;
                Ok(Expr::TrimOf(Box::new(target)))
            }

            TokenKind::KwNumber => {
                self.next();
                self.expect(TokenKind::Of)?;
                let target = self.parse_primary()?;
                Ok(Expr::NumberOf(Box::new(target)))
            }

            TokenKind::KwText => {
                self.next();
                self.expect(TokenKind::Of)?;
                let target = self.parse_primary()?;
                Ok(Expr::TextOf(Box::new(target)))
            }

            TokenKind::Split => {
                self.next();
                let string = self.parse_primary()?;
                self.expect(TokenKind::By)?;
                let delimiter = self.parse_primary()?;
                Ok(Expr::Split {
                    string: Box::new(string),
                    delimiter: Box::new(delimiter),
                })
            }

            TokenKind::Join => {
                self.next();
                let list = self.parse_primary()?;
                self.expect(TokenKind::With)?;
                let delimiter = self.parse_primary()?;
                Ok(Expr::Join {
                    list: Box::new(list),
                    delimiter: Box::new(delimiter),
                })
            }

            TokenKind::Replace => {
                self.next();
                let find = self.parse_primary()?;
                self.expect(TokenKind::With)?;
                let replacement = self.parse_primary()?;
                self.expect(TokenKind::In)?;
                let target = self.parse_primary()?;
                Ok(Expr::Replace {
                    find: Box::new(find),
                    replacement: Box::new(replacement),
                    target: Box::new(target),
                })
            }

            TokenKind::Ident(name) => {
                self.next();
                if *self.peek() == TokenKind::Of {
                    self.next();
                    let target = self.parse_primary()?;
                    Ok(Expr::FieldAccess {
                        target: Box::new(target),
                        field: name,
                    })
                } else {
                    Ok(Expr::Variable(name))
                }
            }

            other => Err(format!(
                "Line {}: expected a value or expression, found {:?}",
                self.line(),
                other
            )),
        }
    }
}
