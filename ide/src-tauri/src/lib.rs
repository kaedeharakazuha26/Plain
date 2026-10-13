#[derive(serde::Serialize)]
pub struct ExecResult {
  pub stdout: String,
  pub stderr: String,
  pub code: i32,
}

#[tauri::command]
fn run_plain(code: String, inputs: Option<Vec<String>>) -> plain_lang::InspectResult {
  let inputs = inputs.unwrap_or_default();
  plain_lang::inspect_source_with_inputs(&code, &inputs)
}

#[tauri::command]
fn exec_terminal(command: String, args: Vec<String>, cwd: Option<String>, stdin_data: Option<String>) -> Result<ExecResult, String> {
  use std::io::Write;
  use std::process::{Command, Stdio};

  let mut cmd_to_run = command.clone();
  let mut final_args = args.clone();

  if command == "plain" || command == "./plain" || command.ends_with(".plain") {
    if let Ok(curr) = std::env::current_dir() {
      let candidates = [
        curr.join("target/debug/plain"),
        curr.join("../target/debug/plain"),
        curr.join("../../target/debug/plain"),
      ];
      if let Some(found) = candidates.into_iter().find(|p| p.exists()) {
        cmd_to_run = found.to_string_lossy().to_string();
      }
    }
    if command.ends_with(".plain") {
      final_args.insert(0, command.clone());
    }
  }

  let mut child = Command::new(&cmd_to_run)
    .args(&final_args)
    .current_dir(cwd.unwrap_or_else(|| ".".into()))
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to execute '{}': {}", cmd_to_run, e))?;

  if let Some(input) = stdin_data {
    if let Some(mut stdin) = child.stdin.take() {
      let _ = stdin.write_all(input.as_bytes());
    }
  }

  let output = child.wait_with_output().map_err(|e| e.to_string())?;
  Ok(ExecResult {
    stdout: String::from_utf8_lossy(&output.stdout).to_string(),
    stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    code: output.status.code().unwrap_or(0),
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![run_plain, exec_terminal])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
