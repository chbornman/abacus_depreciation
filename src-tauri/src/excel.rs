use crate::db::Database;
use crate::depreciation::generate_schedule;
use crate::models::*;
use crate::validation;
use calamine::{open_workbook, DataType, Reader, Xlsx};
use chrono::Datelike;
use rusqlite::params;
use rust_xlsxwriter::{Format, Workbook};
use std::path::Path;
use tauri::State;

type Result<T> = std::result::Result<T, String>;

fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[tauri::command]
pub fn import_assets_from_excel(db: State<Database>, file_path: String) -> Result<ImportResult> {
    let path = Path::new(&file_path);
    let mut workbook: Xlsx<_> = open_workbook(path).map_err(map_err)?;

    let sheet_name = workbook
        .sheet_names()
        .first()
        .cloned()
        .ok_or("No sheets found")?;

    let range = workbook.worksheet_range(&sheet_name).map_err(map_err)?;

    let mut imported = 0;
    let mut errors = Vec::new();

    // Skip header row
    for (row_idx, row) in range.rows().enumerate().skip(1) {
        if row.is_empty() || row.iter().all(|c| c.is_empty()) {
            continue;
        }

        let row_num = row_idx + 1;
        let result = parse_asset_row(row, row_num);
        match result {
            Ok(asset_import) => {
                // Validate the parsed asset before inserting
                if let Err(e) = validation::validate_asset_import(&asset_import, row_num) {
                    errors.push(e.to_string());
                    continue;
                }
                match insert_imported_asset(&db, asset_import) {
                    Ok(_) => imported += 1,
                    Err(e) => errors.push(format!("Row {}: {}", row_num, e)),
                }
            }
            Err(e) => errors.push(format!("Row {}: {}", row_num, e)),
        }
    }

    Ok(ImportResult { imported, errors })
}

fn parse_asset_row(row: &[calamine::Data], _row_num: usize) -> Result<AssetImport> {
    use calamine::Data;

    let get_string = |idx: usize| -> Option<String> {
        row.get(idx).and_then(|c| match c {
            Data::String(s) => Some(s.clone()),
            Data::Int(i) => Some(i.to_string()),
            Data::Float(f) => Some(f.to_string()),
            _ => None,
        })
    };

    let get_float = |idx: usize| -> Option<f64> {
        row.get(idx).and_then(|c| match c {
            Data::Float(f) => Some(*f),
            Data::Int(i) => Some(*i as f64),
            Data::String(s) => s.parse().ok(),
            _ => None,
        })
    };

    let get_int = |idx: usize| -> Option<i32> {
        row.get(idx).and_then(|c| match c {
            Data::Int(i) => Some(*i as i32),
            Data::Float(f) => Some(*f as i32),
            Data::String(s) => s.parse().ok(),
            _ => None,
        })
    };

    let name = get_string(0).ok_or("Asset Name is required")?;
    let description = get_string(1);
    let category = get_string(2);

    // Parse date - handle various formats
    let date_raw = row.get(3).ok_or("Date Placed in Service is required")?;
    let date_placed_in_service = match date_raw {
        Data::DateTime(dt) => {
            // Excel serial date to ISO format
            let days = dt.as_f64() as i64;
            let base = chrono::NaiveDate::from_ymd_opt(1899, 12, 30).unwrap();
            let date = base + chrono::Duration::days(days);
            date.format("%Y-%m-%d").to_string()
        }
        Data::String(s) => {
            // Try to parse MM/DD/YYYY or YYYY-MM-DD
            if s.contains('/') {
                let parts: Vec<&str> = s.split('/').collect();
                if parts.len() == 3 {
                    format!(
                        "{}-{:02}-{:02}",
                        parts[2].parse::<i32>().unwrap_or(2024),
                        parts[0].parse::<i32>().unwrap_or(1),
                        parts[1].parse::<i32>().unwrap_or(1)
                    )
                } else {
                    s.clone()
                }
            } else {
                s.clone()
            }
        }
        _ => return Err("Invalid date format".to_string()),
    };

    let cost = get_float(4).ok_or("Cost is required")?;
    let salvage_value = get_float(5);
    let useful_life_years = get_int(6).ok_or("Useful Life is required")?;
    let property_class = get_string(7);
    let notes = get_string(8);

    Ok(AssetImport {
        name,
        description,
        category,
        date_placed_in_service,
        cost,
        salvage_value,
        useful_life_years,
        property_class,
        notes,
    })
}

fn insert_imported_asset(db: &State<Database>, import: AssetImport) -> Result<i64> {
    let conn = db.conn.lock().map_err(map_err)?;

    // Find or create category if specified
    let category_id: Option<i64> = if let Some(cat_name) = &import.category {
        let existing: Option<i64> = conn
            .query_row(
                "SELECT id FROM categories WHERE name = ?1",
                [cat_name],
                |row| row.get(0),
            )
            .ok();

        if let Some(id) = existing {
            Some(id)
        } else {
            conn.execute("INSERT INTO categories (name) VALUES (?1)", [cat_name])
                .map_err(map_err)?;
            Some(conn.last_insert_rowid())
        }
    } else {
        None
    };

    conn.execute(
        "INSERT INTO assets (name, description, category_id, date_placed_in_service, cost, salvage_value, useful_life_years, property_class, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            import.name,
            import.description,
            category_id,
            import.date_placed_in_service,
            import.cost,
            import.salvage_value.unwrap_or(0.0),
            import.useful_life_years,
            import.property_class,
            import.notes,
        ],
    )
    .map_err(map_err)?;

    let id = conn.last_insert_rowid();

    // Generate schedule
    let asset = Asset {
        id: Some(id),
        name: import.name,
        description: import.description,
        category_id,
        date_placed_in_service: import.date_placed_in_service,
        cost: import.cost,
        salvage_value: import.salvage_value.unwrap_or(0.0),
        useful_life_years: import.useful_life_years,
        property_class: import.property_class,
        notes: import.notes,
        disposed_date: None,
        disposed_value: None,
    };

    let schedule = generate_schedule(&asset);
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

    Ok(id)
}

#[tauri::command]
pub fn export_template(file_path: String) -> Result<()> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header_format = Format::new().set_bold();

    let headers = [
        "Asset Name",
        "Description",
        "Category",
        "Date Placed in Service",
        "Cost",
        "Salvage Value",
        "Useful Life (Years)",
        "Property Class",
        "Notes",
    ];

    for (col, header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, col as u16, *header, &header_format)
            .map_err(map_err)?;
    }

    // Example row
    worksheet
        .write_string(1, 0, "Example Computer")
        .map_err(map_err)?;
    worksheet
        .write_string(1, 1, "Office workstation")
        .map_err(map_err)?;
    worksheet.write_string(1, 2, "Equipment").map_err(map_err)?;
    worksheet
        .write_string(1, 3, "2024-01-15")
        .map_err(map_err)?;
    worksheet.write_number(1, 4, 2000.0).map_err(map_err)?;
    worksheet.write_number(1, 5, 200.0).map_err(map_err)?;
    worksheet.write_number(1, 6, 5.0).map_err(map_err)?;
    worksheet.write_string(1, 7, "5").map_err(map_err)?;
    worksheet
        .write_string(1, 8, "Main office")
        .map_err(map_err)?;

    // Set column widths
    worksheet.set_column_width(0, 25).map_err(map_err)?; // Asset Name
    worksheet.set_column_width(1, 30).map_err(map_err)?; // Description
    worksheet.set_column_width(2, 20).map_err(map_err)?; // Category
    worksheet.set_column_width(3, 22).map_err(map_err)?; // Date Placed in Service
    worksheet.set_column_width(4, 15).map_err(map_err)?; // Cost
    worksheet.set_column_width(5, 15).map_err(map_err)?; // Salvage Value
    worksheet.set_column_width(6, 20).map_err(map_err)?; // Useful Life (Years)
    worksheet.set_column_width(7, 15).map_err(map_err)?; // Property Class
    worksheet.set_column_width(8, 35).map_err(map_err)?; // Notes

    workbook.save(&file_path).map_err(map_err)?;
    Ok(())
}

#[tauri::command]
pub fn export_depreciation_report(db: State<Database>, file_path: String) -> Result<()> {
    let conn = db.conn.lock().map_err(map_err)?;
    let mut workbook = Workbook::new();

    let header_format = Format::new().set_bold();
    let money_format = Format::new().set_num_format("$#,##0.00");
    let current_year = chrono::Local::now().year();

    // Sheet 1: Asset List
    {
        let worksheet = workbook.add_worksheet();
        worksheet.set_name("Assets").map_err(map_err)?;

        let headers = [
            "Asset Name",
            "Category",
            "Cost",
            "Salvage Value",
            "Life (Yrs)",
            "Service Date",
            "Current Book Value",
            "Status",
        ];
        for (col, header) in headers.iter().enumerate() {
            worksheet
                .write_string_with_format(0, col as u16, *header, &header_format)
                .map_err(map_err)?;
        }

        let mut stmt = conn.prepare(
            "SELECT a.*, c.name as category_name FROM assets a LEFT JOIN categories c ON a.category_id = c.id ORDER BY a.name"
        ).map_err(map_err)?;

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
                    row.get(14)?,
                ))
            })
            .map_err(map_err)?
            .filter_map(|r| r.ok())
            .collect();

        for (row_idx, (asset, cat_name)) in assets.iter().enumerate() {
            let row = (row_idx + 1) as u32;
            worksheet
                .write_string(row, 0, &asset.name)
                .map_err(map_err)?;
            worksheet
                .write_string(row, 1, cat_name.as_deref().unwrap_or(""))
                .map_err(map_err)?;
            worksheet
                .write_number_with_format(row, 2, asset.cost, &money_format)
                .map_err(map_err)?;
            worksheet
                .write_number_with_format(row, 3, asset.salvage_value, &money_format)
                .map_err(map_err)?;
            worksheet
                .write_number(row, 4, asset.useful_life_years as f64)
                .map_err(map_err)?;
            worksheet
                .write_string(row, 5, &asset.date_placed_in_service)
                .map_err(map_err)?;

            let book_value = crate::depreciation::current_book_value(asset, current_year);
            worksheet
                .write_number_with_format(row, 6, book_value, &money_format)
                .map_err(map_err)?;

            let status = if asset.disposed_date.is_some() {
                "Disposed"
            } else {
                "Active"
            };
            worksheet.write_string(row, 7, status).map_err(map_err)?;
        }

        worksheet.set_column_width(0, 30).map_err(map_err)?; // Asset Name
        worksheet.set_column_width(1, 20).map_err(map_err)?; // Category
        worksheet.set_column_width(2, 15).map_err(map_err)?; // Cost
        worksheet.set_column_width(3, 15).map_err(map_err)?; // Salvage Value
        worksheet.set_column_width(4, 12).map_err(map_err)?; // Life (Yrs)
        worksheet.set_column_width(5, 15).map_err(map_err)?; // Service Date
        worksheet.set_column_width(6, 20).map_err(map_err)?; // Current Book Value
        worksheet.set_column_width(7, 12).map_err(map_err)?; // Status
    }

    // Sheet 2: Depreciation Schedule
    {
        let worksheet = workbook.add_worksheet();
        worksheet
            .set_name("Depreciation Schedule")
            .map_err(map_err)?;

        let headers = [
            "Asset Name",
            "Year",
            "Beginning Value",
            "Depreciation",
            "Accumulated",
            "Ending Value",
        ];
        for (col, header) in headers.iter().enumerate() {
            worksheet
                .write_string_with_format(0, col as u16, *header, &header_format)
                .map_err(map_err)?;
        }

        let mut stmt = conn.prepare(
            "SELECT a.name, ds.year, ds.beginning_book_value, ds.depreciation_expense, ds.accumulated_depreciation, ds.ending_book_value
             FROM depreciation_schedule ds
             JOIN assets a ON ds.asset_id = a.id
             ORDER BY a.name, ds.year"
        ).map_err(map_err)?;

        let rows: Vec<(String, i32, f64, f64, f64, f64)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            })
            .map_err(map_err)?
            .filter_map(|r| r.ok())
            .collect();

        for (row_idx, (name, year, begin, expense, accum, end)) in rows.iter().enumerate() {
            let row = (row_idx + 1) as u32;
            worksheet.write_string(row, 0, name).map_err(map_err)?;
            worksheet
                .write_number(row, 1, *year as f64)
                .map_err(map_err)?;
            worksheet
                .write_number_with_format(row, 2, *begin, &money_format)
                .map_err(map_err)?;
            worksheet
                .write_number_with_format(row, 3, *expense, &money_format)
                .map_err(map_err)?;
            worksheet
                .write_number_with_format(row, 4, *accum, &money_format)
                .map_err(map_err)?;
            worksheet
                .write_number_with_format(row, 5, *end, &money_format)
                .map_err(map_err)?;
        }

        worksheet.set_column_width(0, 30).map_err(map_err)?; // Asset Name
        worksheet.set_column_width(1, 10).map_err(map_err)?; // Year
        worksheet.set_column_width(2, 18).map_err(map_err)?; // Beginning Value
        worksheet.set_column_width(3, 15).map_err(map_err)?; // Depreciation
        worksheet.set_column_width(4, 15).map_err(map_err)?; // Accumulated
        worksheet.set_column_width(5, 15).map_err(map_err)?; // Ending Value
    }

    // Sheet 3: Annual Summary
    {
        let worksheet = workbook.add_worksheet();
        worksheet.set_name("Annual Summary").map_err(map_err)?;

        let headers = ["Year", "Total Depreciation", "Asset Count"];
        for (col, header) in headers.iter().enumerate() {
            worksheet
                .write_string_with_format(0, col as u16, *header, &header_format)
                .map_err(map_err)?;
        }

        let mut stmt = conn
            .prepare(
                "SELECT year, SUM(depreciation_expense), COUNT(DISTINCT asset_id)
             FROM depreciation_schedule
             GROUP BY year
             ORDER BY year",
            )
            .map_err(map_err)?;

        let rows: Vec<(i32, f64, i64)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(map_err)?
            .filter_map(|r| r.ok())
            .collect();

        for (row_idx, (year, total, count)) in rows.iter().enumerate() {
            let row = (row_idx + 1) as u32;
            worksheet
                .write_number(row, 0, *year as f64)
                .map_err(map_err)?;
            worksheet
                .write_number_with_format(row, 1, *total, &money_format)
                .map_err(map_err)?;
            worksheet
                .write_number(row, 2, *count as f64)
                .map_err(map_err)?;
        }

        worksheet.set_column_width(0, 10).map_err(map_err)?; // Year
        worksheet.set_column_width(1, 20).map_err(map_err)?; // Total Depreciation
        worksheet.set_column_width(2, 15).map_err(map_err)?; // Asset Count
    }

    workbook.save(&file_path).map_err(map_err)?;
    Ok(())
}
