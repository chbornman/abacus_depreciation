use crate::db::Database;
use crate::depreciation::{current_book_value, depreciation_for_year, generate_schedule};
use crate::models::*;
use chrono::Datelike;
use rusqlite::params;
use tauri::State;

type Result<T> = std::result::Result<T, String>;

fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ============ Dashboard ============

#[tauri::command]
pub fn get_dashboard_stats(db: State<Database>) -> Result<DashboardStats> {
    let conn = db.conn.lock().map_err(map_err)?;
    let current_year = chrono::Local::now().year();

    let total_assets: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM assets WHERE disposed_date IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(map_err)?;

    let total_cost: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(cost), 0) FROM assets WHERE disposed_date IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(map_err)?;

    // Calculate total book value and current year depreciation
    let mut stmt = conn
        .prepare("SELECT * FROM assets WHERE disposed_date IS NULL")
        .map_err(map_err)?;

    let assets: Vec<Asset> = stmt
        .query_map([], |row| {
            Ok(Asset {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                category_id: row.get(3)?,
                date_placed_in_service: row.get(4)?,
                cost: row.get(5)?,
                salvage_value: row.get(6)?,
                useful_life_years: row.get(7)?,
                property_class: row.get(8)?,
                notes: row.get(9)?,
                disposed_date: row.get(10)?,
                disposed_value: row.get(11)?,
            })
        })
        .map_err(map_err)?
        .filter_map(|r| r.ok())
        .collect();

    let total_book_value: f64 = assets
        .iter()
        .map(|a| current_book_value(a, current_year))
        .sum();

    let current_year_depreciation: f64 = assets
        .iter()
        .map(|a| depreciation_for_year(a, current_year))
        .sum();

    Ok(DashboardStats {
        total_assets,
        total_cost: (total_cost * 100.0).round() / 100.0,
        total_book_value: (total_book_value * 100.0).round() / 100.0,
        current_year_depreciation: (current_year_depreciation * 100.0).round() / 100.0,
    })
}

// ============ Categories ============

#[tauri::command]
pub fn get_categories(db: State<Database>) -> Result<Vec<Category>> {
    let conn = db.conn.lock().map_err(map_err)?;
    let mut stmt = conn
        .prepare("SELECT id, name, default_useful_life, default_property_class FROM categories ORDER BY name")
        .map_err(map_err)?;

    let categories = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                default_useful_life: row.get(2)?,
                default_property_class: row.get(3)?,
            })
        })
        .map_err(map_err)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(categories)
}

#[tauri::command]
pub fn create_category(db: State<Database>, category: Category) -> Result<i64> {
    let conn = db.conn.lock().map_err(map_err)?;
    conn.execute(
        "INSERT INTO categories (name, default_useful_life, default_property_class) VALUES (?1, ?2, ?3)",
        params![category.name, category.default_useful_life, category.default_property_class],
    )
    .map_err(map_err)?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_category(db: State<Database>, category: Category) -> Result<()> {
    let conn = db.conn.lock().map_err(map_err)?;
    let id = category.id.ok_or("Category ID required")?;

    conn.execute(
        "UPDATE categories SET name = ?1, default_useful_life = ?2, default_property_class = ?3 WHERE id = ?4",
        params![category.name, category.default_useful_life, category.default_property_class, id],
    )
    .map_err(map_err)?;

    Ok(())
}

#[tauri::command]
pub fn delete_category(db: State<Database>, id: i64) -> Result<()> {
    let conn = db.conn.lock().map_err(map_err)?;

    // Check if any assets are using this category
    let asset_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM assets WHERE category_id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(map_err)?;

    if asset_count > 0 {
        return Err(format!(
            "Cannot delete category: {} asset(s) are using this category. Please reassign them first.",
            asset_count
        ));
    }

    conn.execute("DELETE FROM categories WHERE id = ?1", [id])
        .map_err(map_err)?;

    Ok(())
}

#[tauri::command]
pub fn get_categories_with_counts(db: State<Database>) -> Result<Vec<CategoryWithCount>> {
    let conn = db.conn.lock().map_err(map_err)?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.name, c.default_useful_life, c.default_property_class,
                    COUNT(a.id) as asset_count
             FROM categories c
             LEFT JOIN assets a ON c.id = a.category_id
             GROUP BY c.id
             ORDER BY c.name",
        )
        .map_err(map_err)?;

    let categories = stmt
        .query_map([], |row| {
            Ok(CategoryWithCount {
                id: row.get(0)?,
                name: row.get(1)?,
                default_useful_life: row.get(2)?,
                default_property_class: row.get(3)?,
                asset_count: row.get(4)?,
            })
        })
        .map_err(map_err)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(categories)
}

// ============ Assets ============

#[tauri::command]
pub fn get_assets(db: State<Database>) -> Result<Vec<AssetWithSchedule>> {
    let conn = db.conn.lock().map_err(map_err)?;

    let mut stmt = conn
        .prepare(
            "SELECT a.*, c.name as category_name
             FROM assets a
             LEFT JOIN categories c ON a.category_id = c.id
             ORDER BY a.name",
        )
        .map_err(map_err)?;

    let assets: Vec<(Asset, Option<String>)> = stmt
        .query_map([], |row| {
            Ok((
                Asset {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    category_id: row.get(3)?,
                    date_placed_in_service: row.get(4)?,
                    cost: row.get(5)?,
                    salvage_value: row.get(6)?,
                    useful_life_years: row.get(7)?,
                    property_class: row.get(8)?,
                    notes: row.get(9)?,
                    disposed_date: row.get(10)?,
                    disposed_value: row.get(11)?,
                },
                row.get(14)?, // category_name
            ))
        })
        .map_err(map_err)?
        .filter_map(|r| r.ok())
        .collect();

    let mut result = Vec::new();
    for (asset, category_name) in assets {
        let schedule = get_schedule_for_asset(&conn, asset.id.unwrap())?;
        result.push(AssetWithSchedule {
            asset,
            schedule,
            category_name,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn get_asset(db: State<Database>, id: i64) -> Result<AssetWithSchedule> {
    let conn = db.conn.lock().map_err(map_err)?;

    let (asset, category_name) = conn
        .query_row(
            "SELECT a.*, c.name as category_name
             FROM assets a
             LEFT JOIN categories c ON a.category_id = c.id
             WHERE a.id = ?1",
            [id],
            |row| {
                Ok((
                    Asset {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        description: row.get(2)?,
                        category_id: row.get(3)?,
                        date_placed_in_service: row.get(4)?,
                        cost: row.get(5)?,
                        salvage_value: row.get(6)?,
                        useful_life_years: row.get(7)?,
                        property_class: row.get(8)?,
                        notes: row.get(9)?,
                        disposed_date: row.get(10)?,
                        disposed_value: row.get(11)?,
                    },
                    row.get::<_, Option<String>>(14)?,
                ))
            },
        )
        .map_err(map_err)?;

    let schedule = get_schedule_for_asset(&conn, id)?;

    Ok(AssetWithSchedule {
        asset,
        schedule,
        category_name,
    })
}

#[tauri::command]
pub fn create_asset(db: State<Database>, asset: Asset) -> Result<i64> {
    let conn = db.conn.lock().map_err(map_err)?;

    conn.execute(
        "INSERT INTO assets (name, description, category_id, date_placed_in_service, cost, salvage_value, useful_life_years, property_class, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            asset.name,
            asset.description,
            asset.category_id,
            asset.date_placed_in_service,
            asset.cost,
            asset.salvage_value,
            asset.useful_life_years,
            asset.property_class,
            asset.notes,
        ],
    )
    .map_err(map_err)?;

    let id = conn.last_insert_rowid();

    // Generate depreciation schedule
    let mut asset_with_id = asset;
    asset_with_id.id = Some(id);
    save_schedule(&conn, &asset_with_id)?;

    Ok(id)
}

#[tauri::command]
pub fn update_asset(db: State<Database>, asset: Asset) -> Result<()> {
    let conn = db.conn.lock().map_err(map_err)?;
    let id = asset.id.ok_or("Asset ID required")?;

    conn.execute(
        "UPDATE assets SET
            name = ?1, description = ?2, category_id = ?3, date_placed_in_service = ?4,
            cost = ?5, salvage_value = ?6, useful_life_years = ?7, property_class = ?8,
            notes = ?9, disposed_date = ?10, disposed_value = ?11, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?12",
        params![
            asset.name,
            asset.description,
            asset.category_id,
            asset.date_placed_in_service,
            asset.cost,
            asset.salvage_value,
            asset.useful_life_years,
            asset.property_class,
            asset.notes,
            asset.disposed_date,
            asset.disposed_value,
            id,
        ],
    )
    .map_err(map_err)?;

    // Regenerate depreciation schedule
    save_schedule(&conn, &asset)?;

    Ok(())
}

#[tauri::command]
pub fn delete_asset(db: State<Database>, id: i64) -> Result<()> {
    let conn = db.conn.lock().map_err(map_err)?;
    conn.execute("DELETE FROM depreciation_schedule WHERE asset_id = ?1", [id])
        .map_err(map_err)?;
    conn.execute("DELETE FROM assets WHERE id = ?1", [id])
        .map_err(map_err)?;
    Ok(())
}

#[tauri::command]
pub fn dispose_asset(
    db: State<Database>,
    id: i64,
    disposed_date: String,
    disposed_value: Option<f64>,
) -> Result<()> {
    let conn = db.conn.lock().map_err(map_err)?;
    conn.execute(
        "UPDATE assets SET disposed_date = ?1, disposed_value = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![disposed_date, disposed_value, id],
    )
    .map_err(map_err)?;
    Ok(())
}

// ============ Annual Summary ============

#[tauri::command]
pub fn get_annual_summary(db: State<Database>) -> Result<Vec<AnnualSummary>> {
    let conn = db.conn.lock().map_err(map_err)?;

    let mut stmt = conn
        .prepare(
            "SELECT year, SUM(depreciation_expense) as total, COUNT(DISTINCT asset_id) as count
             FROM depreciation_schedule ds
             JOIN assets a ON ds.asset_id = a.id
             WHERE a.disposed_date IS NULL OR
                   CAST(substr(a.disposed_date, 1, 4) AS INTEGER) >= ds.year
             GROUP BY year
             ORDER BY year",
        )
        .map_err(map_err)?;

    let summaries = stmt
        .query_map([], |row| {
            Ok(AnnualSummary {
                year: row.get(0)?,
                total_depreciation: row.get(1)?,
                asset_count: row.get(2)?,
            })
        })
        .map_err(map_err)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(summaries)
}

// ============ Helper Functions ============

fn get_schedule_for_asset(
    conn: &rusqlite::Connection,
    asset_id: i64,
) -> Result<Vec<DepreciationEntry>> {
    let mut stmt = conn
        .prepare(
            "SELECT id, asset_id, year, beginning_book_value, depreciation_expense,
                    accumulated_depreciation, ending_book_value
             FROM depreciation_schedule
             WHERE asset_id = ?1
             ORDER BY year",
        )
        .map_err(map_err)?;

    let entries = stmt
        .query_map([asset_id], |row| {
            Ok(DepreciationEntry {
                id: row.get(0)?,
                asset_id: row.get(1)?,
                year: row.get(2)?,
                beginning_book_value: row.get(3)?,
                depreciation_expense: row.get(4)?,
                accumulated_depreciation: row.get(5)?,
                ending_book_value: row.get(6)?,
            })
        })
        .map_err(map_err)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(entries)
}

fn save_schedule(conn: &rusqlite::Connection, asset: &Asset) -> Result<()> {
    let id = asset.id.ok_or("Asset ID required")?;

    // Delete existing schedule
    conn.execute("DELETE FROM depreciation_schedule WHERE asset_id = ?1", [id])
        .map_err(map_err)?;

    // Generate and insert new schedule
    let schedule = generate_schedule(asset);

    for entry in schedule {
        conn.execute(
            "INSERT INTO depreciation_schedule
             (asset_id, year, beginning_book_value, depreciation_expense, accumulated_depreciation, ending_book_value)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                id,
                entry.year,
                entry.beginning_book_value,
                entry.depreciation_expense,
                entry.accumulated_depreciation,
                entry.ending_book_value,
            ],
        )
        .map_err(map_err)?;
    }

    Ok(())
}
