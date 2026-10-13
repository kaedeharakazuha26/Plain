#[tauri::command]
fn run_plain(code: String, inputs: Option<Vec<String>>) -> plain_lang::InspectResult {
  let inputs = inputs.unwrap_or_default();
  plain_lang::inspect_source_with_inputs(&code, &inputs)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![run_plain])
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
