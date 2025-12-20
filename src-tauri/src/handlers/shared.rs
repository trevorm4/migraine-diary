use sea_orm::DatabaseConnection;

#[derive(Default)]
pub struct AppState {
    pub db: DatabaseConnection
}
