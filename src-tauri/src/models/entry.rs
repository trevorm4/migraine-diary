use serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::*;
use chrono::{DateTime, Utc};
use std::cmp::{Eq, PartialEq};

#[derive(Serialize, Deserialize, Debug, EnumIter, DeriveActiveEnum, Clone, PartialEq, Eq)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "headache_headache_location")]
pub enum HeadacheLocation {
    #[sea_orm(string_value = "Temple")]
    Temple,
    #[sea_orm(string_value = "Forehead")]
    Forehead,
    #[sea_orm(string_value = "Front")]
    Front,
}

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "diary_entry")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub start_dt: DateTime<Utc>,
    pub end_dt: DateTime<Utc>,
    pub severity: i8,
    pub description: String
}

impl ActiveModelBehavior for ActiveModel {}
