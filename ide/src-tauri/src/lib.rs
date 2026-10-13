use std::io::Write;
use std::process::{Command, Stdio};

#[derive(serde::Serialize)]
pub struct ExecResult {
  pub stdout: String,
  pub stderr: String,
  pub code: i32,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SyncFile {
  pub name: String,
  pub content: String,
}

#[derive(serde::Serialize)]
pub struct FileData {
  pub name: String,
  pub path: String,
  pub content: String,
}

#[derive(serde::Serialize)]
pub struct FolderData {
  pub folder_name: String,
  pub folder_path: String,
  pub files: Vec<FileData>,
}

fn resolve_workspace_dir(cwd: Option<&str>) -> std::path::PathBuf {
  if let Some(c) = cwd {
    let p = std::path::PathBuf::from(c);
    if p.exists() {
      return p;
    }
  }
  let curr = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
  if curr.join("Cargo.toml").exists() && curr.join("src/main.rs").exists() {
    curr
  } else if curr.join("../Cargo.toml").exists() && curr.join("../src/main.rs").exists() {
    curr.join("..").canonicalize().unwrap_or_else(|_| curr.join(".."))
  } else if curr.join("../../Cargo.toml").exists() && curr.join("../../src/main.rs").exists() {
    curr.join("../..").canonicalize().unwrap_or_else(|_| curr.join("../.."))
  } else {
    let fixed = std::path::PathBuf::from("/home/jhomar-john-picar/Desktop/My Dev ENV/plain-lang");
    if fixed.exists() {
      fixed
    } else {
      curr
    }
  }
}

#[tauri::command]
fn run_plain(code: String, inputs: Option<Vec<String>>) -> plain_lang::InspectResult {
  let inputs = inputs.unwrap_or_default();
  plain_lang::inspect_source_with_inputs(&code, &inputs)
}

#[tauri::command]
fn exec_terminal(
  command: String,
  args: Vec<String>,
  cwd: Option<String>,
  stdin_data: Option<String>,
  sync_file: Option<SyncFile>,
) -> Result<ExecResult, String> {
  let ws = resolve_workspace_dir(cwd.as_deref());

  // Write file to workspace directory before executing if provided
  if let Some(ref sf) = sync_file {
    let p = ws.join(&sf.name);
    let _ = std::fs::write(&p, &sf.content);
  }

  let mut cmd_to_run = command.clone();
  let mut final_args = args.clone();

  if command == "plain" || command == "./plain" || command.ends_with(".plain") {
    let candidates = [
      ws.join("target/debug/plain"),
      ws.join("target/release/plain"),
      std::path::PathBuf::from("/home/jhomar-john-picar/Desktop/My Dev ENV/plain-lang/target/debug/plain"),
    ];
    if let Some(found) = candidates.into_iter().find(|p| p.exists()) {
      cmd_to_run = found.to_string_lossy().to_string();
    }
    if command.ends_with(".plain") {
      final_args.insert(0, command.clone());
    }
  }

  let mut child = Command::new(&cmd_to_run)
    .args(&final_args)
    .current_dir(&ws)
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

#[tauri::command]
fn save_file_dialog(suggested_name: Option<String>, content: String) -> Result<Option<FileData>, String> {
  let ws = resolve_workspace_dir(None);
  let mut dialog = rfd::FileDialog::new()
    .set_title("Save As - Choose folder and filename")
    .set_directory(&ws)
    .add_filter("Plain Language File", &["plain"])
    .add_filter("Text File", &["txt"])
    .add_filter("All Files", &["*"]);

  if let Some(name) = &suggested_name {
    dialog = dialog.set_file_name(name);
  }

  if let Some(path) = dialog.save_file() {
    let mut file_path = path;
    if file_path.extension().is_none() {
      file_path.set_extension("plain");
    }
    std::fs::write(&file_path, &content).map_err(|e| format!("Failed to write file: {}", e))?;
    let name = file_path.file_name()
      .map(|n| n.to_string_lossy().to_string())
      .unwrap_or_else(|| "untitled.plain".into());
    Ok(Some(FileData {
      name,
      path: file_path.to_string_lossy().to_string(),
      content,
    }))
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<FileData>, String> {
  let ws = resolve_workspace_dir(None);
  let dialog = rfd::FileDialog::new()
    .set_title("Open Plain Language File")
    .set_directory(&ws)
    .add_filter("Plain Language File", &["plain", "txt"])
    .add_filter("All Files", &["*"]);

  if let Some(path) = dialog.pick_file() {
    let content = std::fs::read_to_string(&path)
      .map_err(|e| format!("Failed to read file: {}", e))?;
    let name = path.file_name()
      .map(|n| n.to_string_lossy().to_string())
      .unwrap_or_else(|| "untitled.plain".into());
    Ok(Some(FileData {
      name,
      path: path.to_string_lossy().to_string(),
      content,
    }))
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn open_folder_dialog() -> Result<Option<FolderData>, String> {
  let ws = resolve_workspace_dir(None);
  let dialog = rfd::FileDialog::new()
    .set_title("Open Workspace Folder")
    .set_directory(&ws);

  if let Some(dir_path) = dialog.pick_folder() {
    let folder_name = dir_path.file_name()
      .map(|n| n.to_string_lossy().to_string())
      .unwrap_or_else(|| "workspace".into());

    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&dir_path) {
      for entry in entries.flatten() {
        let p = entry.path();
        if p.is_file() {
          if let Some(ext) = p.extension() {
            if ext == "plain" || ext == "txt" {
              if let Ok(content) = std::fs::read_to_string(&p) {
                let name = p.file_name()
                  .map(|n| n.to_string_lossy().to_string())
                  .unwrap_or_default();
                files.push(FileData {
                  name,
                  path: p.to_string_lossy().to_string(),
                  content,
                });
              }
            }
          }
        }
      }
    }
    Ok(Some(FolderData {
      folder_name,
      folder_path: dir_path.to_string_lossy().to_string(),
      files,
    }))
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn delete_workspace_file(filename: String) -> Result<(), String> {
  let ws = resolve_workspace_dir(None);
  let p1 = if std::path::Path::new(&filename).is_absolute() {
    std::path::PathBuf::from(&filename)
  } else {
    ws.join(&filename)
  };
  if p1.exists() {
    let _ = std::fs::remove_file(&p1);
  }
  if let Ok(curr) = std::env::current_dir() {
    let p2 = curr.join(&filename);
    if p2.exists() {
      let _ = std::fs::remove_file(&p2);
    }
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      run_plain,
      exec_terminal,
      save_file_dialog,
      open_file_dialog,
      open_folder_dialog,
      delete_workspace_file
    ])
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
