use plain_lang::{inspect_source, run_source, InspectResult};
use std::collections::HashMap;
use std::process::ExitCode;

const DEMO: &str = r#"
set name to "jhomar"
set age to 20

define greet with name
    say "Hello, " + uppercase of name
end

call greet with name

set scores to [80, 90, 75]
add 100 to scores

for each score in scores
    say score
end

if age is between 13 and 19
    say "teenager"
otherwise if age is at least 20
    say "adult"
otherwise
    say "kid"
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

        let (code, inputs) = if let Ok(val) = serde_json::from_str::<serde_json::Value>(&source) {
            if let Some(c) = val.get("code").and_then(|v| v.as_str()) {
                let ins: Vec<String> = val.get("inputs")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                    .unwrap_or_default();
                (c.to_string(), ins)
            } else {
                (source.clone(), Vec::new())
            }
        } else {
            (source.clone(), Vec::new())
        };

        let result = plain_lang::inspect_source_with_inputs(&code, &inputs);
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
                    waiting_for_input: None,
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

    #[test]
    fn functions_and_return_work() {
        let src = r#"
define add_nums with a, b
    return a plus b
end
set ans to call add_nums with 10, 20
if ans is 30
    say "ok"
otherwise
    say 1 / 0
end
"#;
        assert!(run_source(src).is_ok());
    }

    #[test]
    fn lists_and_for_each_work() {
        let src = r#"
set nums to [1, 2, 3]
add 4 to nums
set sum to 0
for each n in nums
    set sum to sum + n
end
if sum is 10
    say "sum ok"
otherwise
    say 1 / 0
end
"#;
        assert!(run_source(src).is_ok());
    }

    #[test]
    fn text_helpers_and_comparisons_work() {
        let src = r#"
set word to "rust"
if uppercase of word is "RUST" and length of word is 4
    say "text ok"
end
set val to 15
if val is between 10 and 20
    say "between ok"
otherwise
    say 1 / 0
end
"#;
        assert!(run_source(src).is_ok());
    }
}
