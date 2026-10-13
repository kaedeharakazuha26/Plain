pub mod ast;
pub mod interpreter;
pub mod lexer;
pub mod parser;

use interpreter::Interpreter;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct InspectResult {
    pub success: bool,
    pub output: Vec<String>,
    pub tokens: Option<Vec<lexer::Token>>,
    pub ast: Option<Vec<ast::Stmt>>,
    pub variables: HashMap<String, ast::Value>,
    pub error: Option<String>,
}

pub fn inspect_source(source: &str) -> InspectResult {
    let tokens = match lexer::tokenize(source) {
        Ok(toks) => toks,
        Err(e) => {
            return InspectResult {
                success: false,
                output: Vec::new(),
                tokens: None,
                ast: None,
                variables: HashMap::new(),
                error: Some(e),
            };
        }
    };

    let mut parser = parser::Parser::new(tokens.clone());
    let program = match parser.parse_program() {
        Ok(prog) => prog,
        Err(e) => {
            return InspectResult {
                success: false,
                output: Vec::new(),
                tokens: Some(tokens),
                ast: None,
                variables: HashMap::new(),
                error: Some(e),
            };
        }
    };

    let mut interpreter = Interpreter::new_silent();
    let run_res = interpreter.run(&program);
    let variables = interpreter.get_vars();
    let output = interpreter.output;

    match run_res {
        Ok(()) => InspectResult {
            success: true,
            output,
            tokens: Some(tokens),
            ast: Some(program),
            variables,
            error: None,
        },
        Err(e) => InspectResult {
            success: false,
            output,
            tokens: Some(tokens),
            ast: Some(program),
            variables,
            error: Some(e),
        },
    }
}

pub fn run_source(source: &str) -> Result<(), String> {
    let tokens = lexer::tokenize(source)?;
    let mut parser = parser::Parser::new(tokens);
    let program = parser.parse_program()?;
    Interpreter::new().run(&program)
}
