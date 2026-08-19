use tokio::runtime::Runtime;
use tauri::Manager;
use sea_orm::ConnectionTrait;
use models::entry;
use crate::handlers::entries::*;
use crate::handlers::medicine::*;
use crate::handlers::shared::AppState;
use crate::models::medicine;
use crate::models::entry_medicine;
use crate::models::entry_location;

mod database;
pub mod models;
pub mod handlers;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let runtime = Runtime::new().unwrap();
            let db = match runtime.block_on(async {
                let conn = database::get_db_connection(app).await?;
                match conn.get_schema_builder()
                    .register(entry::Entity)
                    .register(medicine::Entity)
                    .register(entry_medicine::Entity)
                    .register(entry_location::Entity)
                    .sync(&conn)
                    .await {
                    Ok(()) => {
                        // Best-effort migration: drop the legacy single-location column.
                        // Ignored when the column is already absent (fresh DB).
                        let _ = conn.execute_unprepared(
                            "ALTER TABLE diary_entry DROP COLUMN headache_location"
                        ).await;
                        Ok(conn)
                    },
                    Err(err) => Err(err.to_string())
                }
            }) {
                Ok(db) => db,
                Err(error) => panic!("Failed to initialize db: {:?}", error)
            };
            app.manage(AppState { db });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![submit_entry, get_entries, edit_entry, delete_entry, get_medications, track_medication, edit_medication, delete_medication])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
