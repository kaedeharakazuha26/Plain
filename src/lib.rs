pub mod ast;
pub mod interpreter;
pub mod lexer;
pub mod parser;
pub mod transpile;

use interpreter::Interpreter;
use serde::Serialize;
use std::collections::HashMap;

pub use interpreter::AskPrompt;
pub use transpile::transpile_program;

#[derive(Serialize)]
pub struct InspectResult {
    pub success: bool,
    pub output: Vec<String>,
    pub tokens: Option<Vec<lexer::Token>>,
    pub ast: Option<Vec<ast::Stmt>>,
    pub variables: HashMap<String, ast::Value>,
    pub error: Option<String>,
    pub waiting_for_input: Option<AskPrompt>,
}

pub fn inspect_source(source: &str) -> InspectResult {
    inspect_source_with_inputs(source, &[])
}

pub fn inspect_source_with_inputs(source: &str, inputs: &[String]) -> InspectResult {
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
                waiting_for_input: None,
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
                waiting_for_input: None,
            };
        }
    };

    let mut interpreter = Interpreter::new_with_inputs(inputs.to_vec(), true);
    let run_res = interpreter.run(&program);
    let variables = interpreter.get_vars();
    let output = interpreter.output;
    let waiting_for_input = interpreter.waiting_for_input;

    match run_res {
        Ok(()) => InspectResult {
            success: true,
            output,
            tokens: Some(tokens),
            ast: Some(program),
            variables,
            error: None,
            waiting_for_input,
        },
        Err(e) => InspectResult {
            success: false,
            output,
            tokens: Some(tokens),
            ast: Some(program),
            variables,
            error: Some(e),
            waiting_for_input,
        },
    }
}

pub fn run_source(source: &str) -> Result<(), String> {
    let tokens = lexer::tokenize(source)?;
    let mut parser = parser::Parser::new(tokens);
    let program = parser.parse_program()?;
    Interpreter::new().run(&program)
}

pub fn compile_source(source: &str) -> Result<String, String> {
    let tokens = lexer::tokenize(source)?;
    let mut parser = parser::Parser::new(tokens);
    let program = parser.parse_program()?;
    transpile::transpile_program(&program)
}
