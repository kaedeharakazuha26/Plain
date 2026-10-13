use plain_lang::{compile_source, inspect_source, run_source, InspectResult};
use std::collections::HashMap;
use std::process::ExitCode;

const DEMO: &str = r#"
set person to record with name "Ana", age 20
say "Hello, {name of person}!"

save "Ana" to file "examples/people.txt"
for each line in file "examples/people.txt"
    say line
end
"#;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();

    // Check for compile subcommand: cargo run -- compile input.plain [output.rs]
    if args.len() >= 2 && args[1] == "compile" {
        if args.len() < 3 {
            eprintln!("Usage: plain compile <input.plain> [output.rs]");
            return ExitCode::FAILURE;
        }
        let in_path = &args[2];
        let source = match std::fs::read_to_string(in_path) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Could not read {}: {}", in_path, e);
                return ExitCode::FAILURE;
            }
        };

        match compile_source(&source) {
            Ok(rust_code) => {
                if args.len() >= 4 {
                    let out_path = &args[3];
                    if let Err(e) = std::fs::write(out_path, rust_code) {
                        eprintln!("Could not write {}: {}", out_path, e);
                        return ExitCode::FAILURE;
                    }
                } else {
                    print!("{}", rust_code);
                }
                return ExitCode::SUCCESS;
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                return ExitCode::FAILURE;
            }
        }
    }

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
                let ins: Vec<String> = val
                    .get("inputs")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|x| x.as_str().map(|s| s.to_string()))
                            .collect()
                    })
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
        // no file given -> run the built-in demo
        None => {
            println!("(no file given, running demo — try: cargo run -- examples/v04.plain)\n");
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

    #[test]
    fn import_other_plain_file_works() {
        let helper_path = std::env::temp_dir().join("plain_test_helper.plain");
        let helper_src = r#"
define multiply_nums with x, y
    return x multiplied by y
end
set helper_secret to 42
"#;
        std::fs::write(&helper_path, helper_src).unwrap();

        let main_src = format!(
            r#"
import "{}"
set res to call multiply_nums with 6, 7
if res is 42 and helper_secret is 42
    say "import ok"
otherwise
    say 1 / 0
end
"#,
            helper_path.to_string_lossy()
        );

        let result = run_source(&main_src);
        let _ = std::fs::remove_file(helper_path);
        assert!(result.is_ok());
    }

    #[test]
    fn records_and_nested_records_work() {
        let src = r#"
set person to record with name "Ana", address record with city "Cebu", zip 6000
if city of address of person is "Cebu" and name of person is "Ana"
    say "record ok"
otherwise
    say 1 / 0
end
"#;
        assert!(run_source(src).is_ok());
    }

    #[test]
    fn nested_record_mutations_work() {
        let src = r#"
set person to record with name "Ana", address record with city "Cebu", zip 6000
set city of address of person to "Manila"
set age of person to 21
if city of address of person is "Manila" and age of person is 21
    say "mutation ok"
otherwise
    say 1 / 0
end
"#;
        assert!(run_source(src).is_ok());
    }

    #[test]
    fn missing_record_field_shows_available_fields() {
        let src = r#"
set person to record with name "Ana", age 20
say city of person
"#;
        let res = run_source(src);
        assert!(res.is_err());
        let err = res.err().unwrap();
        assert!(err.contains("Record has no field 'city'"));
        assert!(err.contains("Available fields: age, name"));
    }

    #[test]
    fn string_interpolation_works() {
        let src = r#"
set person to record with name "Ana", address record with city "Cebu", zip 6000
set score to 95
set msg to "{name of person} in {city of address of person} scored {score} {{points}}"
if msg is "Ana in Cebu scored 95 {{points}}"
    say "interpolation ok"
otherwise
    say 1 / 0
end
"#;
        let res = run_source(src);
        if let Err(ref e) = res {
            eprintln!("STRING INTERP ERROR: {}", e);
        }
        assert!(res.is_ok());
    }

    #[test]
    fn file_save_append_load_and_for_each_line_work() {
        let test_file = std::env::temp_dir().join("plain_file_test.txt");
        let file_path = test_file.to_string_lossy();

        let src = format!(
            r#"
save "First line" to file "{}"
append "Second line" to file "{}"
load loaded_content from file "{}"
set count to 0
for each line in file "{}"
    set count to count + 1
end
if count is 2
    say "files ok"
otherwise
    say 1 / 0
end
"#,
            file_path, file_path, file_path, file_path
        );

        let res = run_source(&src);
        if let Err(ref e) = res {
            eprintln!("FILE TEST ERROR: {}", e);
        }
        let _ = std::fs::remove_file(test_file);
        assert!(res.is_ok());
    }

    #[test]
    fn list_and_text_tools_work() {
        let src = r#"
set sentence to "the quick brown fox"
if sentence contains "quick" and sentence starts with "the" and sentence ends with "fox"
    say "contains ok"
otherwise
    say 1 / 0
end

set words to split sentence by " "
if length of words is 4 and item 1 of words is "the"
    say "split ok"
otherwise
    say 1 / 0
end

set rejoined to join words with "-"
if rejoined is "the-quick-brown-fox"
    say "join ok"
otherwise
    say 1 / 0
end

set replaced to replace "fox" with "dog" in sentence
if replaced is "the quick brown dog"
    say "replace ok"
otherwise
    say 1 / 0
end

set scores to [30, 10, 20]
sort scores
if first of scores is 10 and last of scores is 30
    say "sort ok"
otherwise
    say 1 / 0
end

if sum of scores is 60 and average of scores is 20 and smallest of scores is 10 and largest of scores is 30
    say "stats ok"
otherwise
    say 1 / 0
end
"#;
        assert!(run_source(src).is_ok());
    }

    #[test]
    fn compiler_transpiles_and_matches_interpreter_output() {
        let plain_src = r#"
set count to 5
increase count by 2
say "Count is {count}"

define add_both with a, b
    return a plus b
end

set total to call add_both with count, 3
say "Total is {total}"

set scores to [10, 20, 30]
add 40 to scores
say "Sum is {sum of scores}"
say "Average is {average of scores}"
"#;
        // Run interpreted
        let mut interp = plain_lang::interpreter::Interpreter::new_silent();
        let tokens = plain_lang::lexer::tokenize(plain_src).unwrap();
        let mut parser = plain_lang::parser::Parser::new(tokens);
        let program = parser.parse_program().unwrap();
        interp.run(&program).unwrap();
        let interp_out = interp.output.join("\n");

        // Transpile to Rust
        let rust_code = compile_source(plain_src).unwrap();

        // Write to temp file, compile with rustc and execute
        let temp_dir = std::env::temp_dir();
        let rs_path = temp_dir.join("plain_transpile_test.rs");
        let bin_path = temp_dir.join("plain_transpile_test_bin");

        std::fs::write(&rs_path, rust_code).unwrap();

        let rustc_status = std::process::Command::new("rustc")
            .arg(&rs_path)
            .arg("-o")
            .arg(&bin_path)
            .status();

        if let Ok(status) = rustc_status {
            if status.success() {
                let bin_out = std::process::Command::new(&bin_path).output().unwrap();
                let compiled_out = String::from_utf8_lossy(&bin_out.stdout).trim().to_string();
                assert_eq!(interp_out.trim(), compiled_out);
                let _ = std::fs::remove_file(&bin_path);
            }
        }
        let _ = std::fs::remove_file(&rs_path);
    }

    #[test]
    fn compiler_rejects_interpreter_only_features() {
        let record_src = "set p to record with name \"Ana\"\n";
        let res = compile_source(record_src);
        assert!(res.is_err());
        assert!(res.err().unwrap().contains("records"));

        let file_src = "save \"test\" to file \"out.txt\"\n";
        let res = compile_source(file_src);
        assert!(res.is_err());
        assert!(res.err().unwrap().contains("file operations"));
    }
}
