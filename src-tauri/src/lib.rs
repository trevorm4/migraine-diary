use tokio::runtime::Runtime;
use tauri::Manager;
use models::entry;
use crate::handlers::entries::*;
use crate::handlers::shared::AppState;

mod database;
pub mod models;
pub mod handlers;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let runtime = Runtime::new().unwrap();
            let db = match runtime.block_on(async {
                let conn = database::get_db_connection(app).await?;
                match conn.get_schema_builder().register(entry::Entity).sync(&conn).await {
                    Ok(()) => Ok(conn),
                    Err(err) => Err(err.to_string())
                }
            }) {
                Ok(db) => db,
                Err(error) => panic!("Failed to initialize db: {:?}", error)
            };
            app.manage(AppState { db: db});
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![submit_entry, get_entries, edit_entry, delete_entry])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
