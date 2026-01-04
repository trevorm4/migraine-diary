use serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::*;
use chrono::{DateTime, Utc};
use std::cmp::{Eq, PartialEq};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "medicine_entry")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub timestamp: DateTime<Utc>,
    pub quantity: i32,
    pub medicine_id: i32,
    #[sea_orm(belongs_to, from="medicine_id", to="id")]
    pub medicine: HasOne<super::medicine::Entity>
}


impl ActiveModelBehavior for ActiveModel {}

