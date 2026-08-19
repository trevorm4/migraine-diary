use sea_orm::{ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, ModelTrait, QueryFilter, QueryOrder};
use sea_orm::ActiveValue::Set;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::models::entry;
use crate::models::entry::HeadacheLocation;
use crate::models::{entry_medicine, medicine};
use crate::handlers::shared::AppState;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::option::Option;


#[derive(Serialize, Deserialize, Debug)]
pub struct GetEntriesRequest {
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
}

/// A single medication taken during a migraine window (as submitted/edited).
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MedicineDose {
    medicine_id: i32,
    dose: Option<String>,
}

/// A medication associated with an entry, including its display name.
#[derive(Serialize, Deserialize, Debug)]
pub struct MedicineUse {
    pub medicine_id: i32,
    pub name: String,
    pub dose: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SubmitEntryRequest {
    description: String,
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
    severity: i8,
    headache_location: HeadacheLocation,
    medications: Vec<MedicineDose>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EditEntryRequest {
    id: i32,
    description: String,
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
    severity: i8,
    headache_location: HeadacheLocation,
    medications: Vec<MedicineDose>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DeleteEntryRequest {
    id: i32
}

/// An entry with the medications taken during its window.
#[derive(Serialize, Deserialize, Debug)]
pub struct EntryWithMeds {
    pub id: i32,
    pub start_dt: DateTime<Utc>,
    pub end_dt: DateTime<Utc>,
    pub headache_location: HeadacheLocation,
    pub severity: i8,
    pub description: String,
    pub medications: Vec<MedicineUse>,
}


async fn replace_medications(
    db: &DatabaseConnection,
    entry_id: i32,
    medications: Vec<MedicineDose>,
) -> Result<(), sea_orm::DbErr> {
    // Remove existing associations for this entry, then insert the new set.
    entry_medicine::Entity::delete_many()
        .filter(entry_medicine::Column::EntryId.eq(entry_id))
        .exec(db)
        .await?;

    let rows: Vec<entry_medicine::ActiveModel> = medications
        .into_iter()
        .map(|m| entry_medicine::ActiveModel {
            entry_id: Set(entry_id),
            medicine_id: Set(m.medicine_id),
            dose: Set(m.dose),
            ..Default::default()
        })
        .collect();

    if !rows.is_empty() {
        entry_medicine::Entity::insert_many(rows).exec(db).await?;
    }
    Ok(())
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
    let result = entry::Entity::insert(entry).exec(db).await.map_err(|e| e.to_string())?;
    let entry_id = result.last_insert_id;

    replace_medications(db, entry_id, request.medications).await.map_err(|e| e.to_string())?;
    Ok(())
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
        Ok(m) => {
            replace_medications(db, m.id, request.medications).await.map_err(|e| e.to_string())?;
            Ok(m)
        },
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
        Ok(_) => {
            entry_medicine::Entity::delete_many()
                .filter(entry_medicine::Column::EntryId.eq(request.id))
                .exec(db)
                .await
                .map_err(|e| e.to_string())?;
            Ok(())
        },
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub async fn get_entries(state: State<'_, AppState>, request: GetEntriesRequest) -> Result<Vec<EntryWithMeds>, String>{
    let db: &DatabaseConnection = &state.db;
    let entries: Vec<entry::Model> = entry::Entity::find()
        .filter(
            Condition::all()
            .add(entry::Column::StartDt.gte(request.start_date))
            .add(entry::Column::EndDt.lte(request.end_date))
        )
        .order_by_desc(entry::Column::EndDt)
        .all(db)
        .await
        .map_err(|e| e.to_string())?;

    let ids: Vec<i32> = entries.iter().map(|e| e.id).collect();

    let use_rows: Vec<entry_medicine::Model> = if ids.is_empty() {
        vec![]
    } else {
        entry_medicine::Entity::find()
            .filter(entry_medicine::Column::EntryId.is_in(ids.clone()))
            .all(db)
            .await
            .map_err(|e| e.to_string())?
    };

    let med_ids: Vec<i32> = use_rows.iter().map(|u| u.medicine_id).collect();
    let name_by_id: HashMap<i32, String> = if med_ids.is_empty() {
        HashMap::new()
    } else {
        medicine::Entity::find()
            .filter(medicine::Column::Id.is_in(med_ids.clone()))
            .all(db)
            .await
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|m| (m.id, m.name))
            .collect()
    };

    let mut by_entry: HashMap<i32, Vec<MedicineUse>> = HashMap::new();
    for use_row in use_rows {
        by_entry
            .entry(use_row.entry_id)
            .or_default()
            .push(MedicineUse {
                medicine_id: use_row.medicine_id,
                name: name_by_id
                    .get(&use_row.medicine_id)
                    .cloned()
                    .unwrap_or_default(),
                dose: use_row.dose,
            });
    }

    Ok(entries
        .into_iter()
        .map(|e| EntryWithMeds {
            id: e.id,
            start_dt: e.start_dt,
            end_dt: e.end_dt,
            headache_location: e.headache_location,
            severity: e.severity,
            description: e.description,
            medications: by_entry.remove(&e.id).unwrap_or_default(),
        })
        .collect())
}