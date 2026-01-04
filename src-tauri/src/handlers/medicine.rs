use crate::handlers::shared::AppState;
use crate::models::medicine::MedicineType;
use crate::models::{medicine, medicine_entry};
use chrono::{DateTime, Utc};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder,
};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize, Debug)]
pub struct TrackMedicationRequest {
    name: String,
    medicine_type: MedicineType,
    description: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EditMedicationRequest {
    id: i32,
    name: String,
    medicine_type: MedicineType,
    description: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AddMedicationEntryRequest {
    medicine_id: i32,
    quantity: i32,
    timestamp: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetMedicationEntriesRequest {
    medicine_id: i32,
}

#[tauri::command]
pub async fn add_medication_entry(
    state: State<'_, AppState>,
    request: AddMedicationEntryRequest,
) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;
    let entry = medicine_entry::ActiveModel {
        medicine_id: Set(request.medicine_id),
        timestamp: Set(request.timestamp),
        quantity: Set(request.quantity),
        ..Default::default()
    };
    match medicine_entry::Entity::insert(entry).exec(db).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub async fn get_medication_entries(
    state: State<'_, AppState>,
    request: GetMedicationEntriesRequest,
) -> Result<Vec<medicine_entry::Model>, String> {
    let db: &DatabaseConnection = &state.db;
    match medicine_entry::Entity::find()
        .filter(medicine_entry::Column::MedicineId.eq(request.medicine_id))
        .order_by_asc(medicine_entry::Column::Timestamp)
        .all(db)
        .await
    {
        Ok(entries) => Ok(entries),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub async fn track_medication(
    state: State<'_, AppState>,
    request: TrackMedicationRequest,
) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;
    let medicine = medicine::ActiveModel {
        name: Set(request.name),
        medicine_type: Set(request.medicine_type),
        description: Set(request.description),
        ..Default::default()
    };
    match medicine::Entity::insert(medicine).exec(db).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub async fn get_medications(state: State<'_, AppState>) -> Result<Vec<medicine::Model>, String> {
    let db: &DatabaseConnection = &state.db;
    match medicine::Entity::find().all(db).await {
        Ok(meds) => Ok(meds),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub async fn delete_medication(state: State<'_, AppState>, med_id: i32) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;
    let medicine = match medicine::Entity::find_by_id(med_id).one(db).await {
        Ok(med_opt) => match med_opt {
            Some(med) => med,
            None => return Err("Medicine not found".to_string())
        },
        Err(e) => return Err(e.to_string())
    };
    match medicine.cascade_delete(db).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub async fn edit_medication(
    state: State<'_, AppState>,
    med: EditMedicationRequest,
) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;

    let medicine_opt: Result<Option<medicine::Model>, sea_orm::DbErr> =
        medicine::Entity::find_by_id(med.id).one(db).await;

    let medicine = match medicine_opt {
        Ok(x) => match x {
            Some(m) => m,
            None => return Err("Medicine not found".to_owned()),
        },
        Err(e) => return Err(e.to_string()),
    };

    let mut am: medicine::ActiveModel = medicine.into();
    am.name = Set(med.name);
    am.medicine_type = Set(med.medicine_type);
    am.description = Set(med.description);
    match am.update(db).await {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
