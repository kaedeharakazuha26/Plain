use plain_lang::{inspect_source, run_source, InspectResult};
use std::collections::HashMap;
use std::process::ExitCode;

const DEMO: &str = r#"
set name to "jhomar"
set age to 20
say "Hello, " + name
if age is above 18
    say "You are an adult"
otherwise
    say "You are a minor"
end
repeat 3 times
    say "Hi"
end
"#;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();

    // Check for --json or -j flag
    if args.len() >= 2 && (args[1] == "--json" || args[1] == "-j") {
        let source = if args.len() >= 3 {
            args[2..].join(" ")
        } else {
            use std::io::Read;
            let mut buf = String::new();
            let _ = std::io::stdin().read_to_string(&mut buf);
            buf
        };

        let result = inspect_source(&source);
        if let Ok(json) = serde_json::to_string(&result) {
            println!("{}", json);
        }
        return if result.success {
            ExitCode::SUCCESS
        } else {
            ExitCode::FAILURE
        };
    }

    // Check for --json-file
    if args.len() >= 3 && args[1] == "--json-file" {
        let path = &args[2];
        let source = match std::fs::read_to_string(path) {
            Ok(s) => s,
            Err(e) => {
                let err_res = InspectResult {
                    success: false,
                    output: Vec::new(),
                    tokens: None,
                    ast: None,
                    variables: HashMap::new(),
                    error: Some(format!("Could not read {}: {}", path, e)),
                };
                let _ = serde_json::to_string(&err_res).map(|j| println!("{}", j));
                return ExitCode::FAILURE;
            }
        };

        let result = inspect_source(&source);
        if let Ok(json) = serde_json::to_string(&result) {
            println!("{}", json);
        }
        return if result.success {
            ExitCode::SUCCESS
        } else {
            ExitCode::FAILURE
        };
    }

    // Check for -e or --eval flag
    if args.len() >= 2 && (args[1] == "-e" || args[1] == "--eval") {
        let source = args[2..].join(" ");
        return match run_source(&source) {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("Error: {}", e);
                ExitCode::FAILURE
            }
        };
    }

    let path = args.get(1);
    let source = match path {
        Some(p) => {
            if p == "-" {
                use std::io::Read;
                let mut buf = String::new();
                match std::io::stdin().read_to_string(&mut buf) {
                    Ok(_) => buf,
                    Err(e) => {
                        eprintln!("Could not read stdin: {}", e);
                        return ExitCode::FAILURE;
                    }
                }
            } else {
                match std::fs::read_to_string(p) {
                    Ok(s) => s,
                    Err(e) => {
                        eprintln!("Could not read {}: {}", p, e);
                        return ExitCode::FAILURE;
                    }
                }
            }
        }
        // no file given -> run the built-in demo so `cargo run` just works
        None => {
            println!("(no file given, running demo — try: cargo run -- examples/hello.plain)\n");
            DEMO.to_string()
        }
    };

    match run_source(&source) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("Error: {}", e);
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lexer_parser_interpreter_pipeline_runs() {
        // just proves the whole pipeline executes without error;
        // output checking is done via examples/hello.plain in the README
        let src = "set x to 2 + 3 * 4\nsay x\nif x is above 10\n say \"big\"\nend\nrepeat 2 times\n say \"loop\"\nend\n";
        assert!(run_source(src).is_ok());
    }

    #[test]
    fn unknown_variable_is_an_error() {
        assert!(run_source("say missing_name\n").is_err());
    }

    #[test]
    fn division_by_zero_is_an_error() {
        assert!(run_source("say 1 / 0\n").is_err());
    }
}
