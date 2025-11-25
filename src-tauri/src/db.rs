use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = get_db_path();

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            -- Asset categories for organization
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                default_useful_life INTEGER,
                default_property_class TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Core asset records
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                category_id INTEGER REFERENCES categories(id),
                date_placed_in_service DATE NOT NULL,
                cost REAL NOT NULL,
                salvage_value REAL NOT NULL DEFAULT 0,
                useful_life_years INTEGER NOT NULL,
                property_class TEXT,
                notes TEXT,
                disposed_date DATE,
                disposed_value REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Pre-computed depreciation schedule
            CREATE TABLE IF NOT EXISTS depreciation_schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                year INTEGER NOT NULL,
                beginning_book_value REAL NOT NULL,
                depreciation_expense REAL NOT NULL,
                accumulated_depreciation REAL NOT NULL,
                ending_book_value REAL NOT NULL,
                UNIQUE(asset_id, year)
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
            CREATE INDEX IF NOT EXISTS idx_assets_date ON assets(date_placed_in_service);
            CREATE INDEX IF NOT EXISTS idx_schedule_year ON depreciation_schedule(year);
            CREATE INDEX IF NOT EXISTS idx_schedule_asset ON depreciation_schedule(asset_id);
            "
        )?;

        // Add updated_at column to categories if it doesn't exist (for existing databases)
        let has_updated_at: bool = conn
            .prepare("SELECT COUNT(*) FROM pragma_table_info('categories') WHERE name = 'updated_at'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .map(|count| count > 0)
            .unwrap_or(false);

        if !has_updated_at {
            conn.execute(
                "ALTER TABLE categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
                [],
            )?;
        }

        Ok(())
    }
}

fn get_db_path() -> PathBuf {
    if let Some(proj_dirs) = directories::ProjectDirs::from("com", "caleb", "abacus-depreciation") {
        proj_dirs.data_dir().join("depreciation.db")
    } else {
        PathBuf::from("depreciation.db")
    }
}
