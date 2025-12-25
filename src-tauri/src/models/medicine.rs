use serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::*;
use std::cmp::{Eq, PartialEq};

#[derive(Serialize, Deserialize, Debug, EnumIter, DeriveActiveEnum, Clone, PartialEq, Eq)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "headache_headache_location")]
pub enum MedicineType {
    #[sea_orm(string_value = "Acute")]
    Acute,
    #[sea_orm(string_value = "Preventative")]
    Preventative,
}

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "medicine")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    pub medicine_type: MedicineType,
    pub description: String
}

impl ActiveModelBehavior for ActiveModel {}
