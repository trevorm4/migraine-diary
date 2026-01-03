use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait};
use sea_orm::ActiveValue::Set;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::models::medicine;
use crate::models::medicine::MedicineType;
use crate::handlers::shared::AppState;

#[derive(Serialize, Deserialize, Debug)]
pub struct TrackMedicationRequest {
    name: String,
    medicine_type: MedicineType,
    description: String
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EditMedicationRequest {
    id: i32,
    name: String,
    medicine_type: MedicineType,
    description: String
}

#[tauri::command]
pub async fn track_medication(state: State<'_, AppState>, request: TrackMedicationRequest) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;
    let medicine = medicine::ActiveModel{
        name: Set(request.name),
        medicine_type: Set(request.medicine_type),
        description: Set(request.description),
        ..Default::default()
    };
    match medicine::Entity::insert(medicine).exec(db).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string())
    }
}

#[tauri::command]
pub async fn get_medications(state: State<'_, AppState>) -> Result<Vec<medicine::Model>, String> {
    let db: &DatabaseConnection = &state.db;
    match medicine::Entity::find().all(db).await {
        Ok(meds) => Ok(meds),
        Err(err) => Err(err.to_string())
    }
}

#[tauri::command]
pub async fn delete_medication(state: State<'_, AppState>, med_id: i32) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;
    match medicine::Entity::delete_by_id(med_id).exec(db).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string())
    }
}

#[tauri::command]
pub async fn edit_medication(state: State<'_, AppState>, med: EditMedicationRequest) -> Result<(), String> {
    let db: &DatabaseConnection = &state.db;

    let medicine_opt: Result<Option<medicine::Model>, sea_orm::DbErr> = medicine::Entity::find_by_id(med.id)
        .one(db)
        .await;

    let medicine = match medicine_opt {
        Ok(x) => match x {
           Some(m) => m,
           None => return Err("Medicine not found".to_owned())
        },
        Err(e) => return Err(e.to_string())
    };

    let mut am: medicine::ActiveModel = medicine.into();
    am.name = Set(med.name);
    am.medicine_type = Set(med.medicine_type);
    am.description = Set(med.description);
    match am.update(db).await {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string())
    }
}

