use sea_orm::{ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, ModelTrait, QueryFilter, QueryOrder};
use sea_orm::ActiveValue::Set;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::models::entry;
use crate::models::entry::HeadacheLocation;
use crate::handlers::shared::AppState;
use chrono::{DateTime, Utc};
use std::option::Option;


#[derive(Serialize, Deserialize, Debug)]
pub struct GetEntriesRequest {
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SubmitEntryRequest {
    description: String,
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
    severity: i8,
    headache_location: HeadacheLocation,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EditEntryRequest {
    id: i32,
    description: String,
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
    severity: i8,
    headache_location: HeadacheLocation,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DeleteEntryRequest {
    id: i32
}




#[tauri::command]
pub async fn submit_entry(state: State<'_, AppState>, request: SubmitEntryRequest) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;
    let entry = entry::ActiveModel{
        description: Set(request.description),
        severity: Set(request.severity),
        headache_location: Set(request.headache_location),
        start_dt: Set(request.start_date),
        end_dt: Set(request.end_date),
        ..Default::default()
    };
    match entry::Entity::insert(entry).exec(db).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string())
    }
}

#[tauri::command]
pub async fn edit_entry(state: State<'_, AppState>, request: EditEntryRequest) -> Result<entry::Model, String> {
    let db: &DatabaseConnection = &state.db;

    let entry_opt: Result<Option<entry::Model>, sea_orm::DbErr> = entry::Entity::find_by_id(request.id)
        .one(db)
        .await;

    let entry = match entry_opt {
        Ok(x) => match x {
           Some(m) => m,
           None => return Err("Entry not found".to_owned())
        },
        Err(e) => return Err(e.to_string())
    };

    let mut am: entry::ActiveModel = entry.into();
    am.start_dt = Set(request.start_date);
    am.end_dt = Set(request.end_date);
    am.headache_location = Set(request.headache_location);
    am.severity = Set(request.severity);
    am.description = Set(request.description);
    match am.update(db).await {
        Ok(m) => Ok(m),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub async fn delete_entry(state: State<'_, AppState>, request: DeleteEntryRequest) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;

    let entry_opt: Result<Option<entry::Model>, sea_orm::DbErr> = entry::Entity::find_by_id(request.id)
        .one(db)
        .await;

    let entry = match entry_opt {
        Ok(x) => match x {
           Some(m) => m,
           None => return Err("Entry not found".to_owned())
        },
        Err(e) => return Err(e.to_string())
    };
    match entry.delete(db).await {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub async fn get_entries(state: State<'_, AppState>, request: GetEntriesRequest) -> Result<Vec<entry::Model>, String>{
    let db: &DatabaseConnection = &state.db;
    let entries: Result<Vec<entry::Model>, sea_orm::DbErr> = entry::Entity::find()
        .filter(
            Condition::all()
            .add(entry::Column::StartDt.gte(request.start_date))
            .add(entry::Column::EndDt.lte(request.end_date))
        )
        .order_by_desc(entry::Column::EndDt)
        .all(db)
        .await;
    match entries {
        Ok(v) => Ok(v),
        Err(err) => Err(err.to_string())
    }
}
