use sea_orm::entity::prelude::*;
use crate::models::entry::HeadacheLocation;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, serde::Serialize, serde::Deserialize)]
#[sea_orm(table_name = "entry_location")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub entry_id: i32,
    pub location: HeadacheLocation,
}

impl ActiveModelBehavior for ActiveModel {}