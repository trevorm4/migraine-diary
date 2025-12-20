use log::debug;
use sea_orm::{Database, DatabaseConnection, DbErr};
use tauri::{App, Manager};

pub async fn get_db_connection(
    app: &mut App,
) -> Result<DatabaseConnection, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    debug!("Sql dir is {:?}", app_data_dir);

    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    let db_path = app_data_dir.join("headache.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.to_str().unwrap());

    Database::connect(&db_url).await.map_err(|e: DbErr| e.to_string())
}
