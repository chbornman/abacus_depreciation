use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: Option<i64>,
    pub name: String,
    pub default_useful_life: Option<i32>,
    pub default_property_class: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryWithCount {
    pub id: i64,
    pub name: String,
    pub default_useful_life: Option<i32>,
    pub default_property_class: Option<String>,
    pub asset_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<i64>,
    pub date_placed_in_service: String, // YYYY-MM-DD
    pub cost: f64,
    pub salvage_value: f64,
    pub useful_life_years: i32,
    pub property_class: Option<String>,
    pub notes: Option<String>,
    pub disposed_date: Option<String>,
    pub disposed_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepreciationEntry {
    pub id: Option<i64>,
    pub asset_id: i64,
    pub year: i32,
    pub beginning_book_value: f64,
    pub depreciation_expense: f64,
    pub accumulated_depreciation: f64,
    pub ending_book_value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetWithSchedule {
    pub asset: Asset,
    pub schedule: Vec<DepreciationEntry>,
    pub category_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_assets: i64,
    pub total_cost: f64,
    pub total_book_value: f64,
    pub current_year_depreciation: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnualSummary {
    pub year: i32,
    pub total_depreciation: f64,
    pub asset_count: i64,
}

// For Excel import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetImport {
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub date_placed_in_service: String,
    pub cost: f64,
    pub salvage_value: Option<f64>,
    pub useful_life_years: i32,
    pub property_class: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: i32,
    pub errors: Vec<String>,
}
