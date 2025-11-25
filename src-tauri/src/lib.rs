mod commands;
mod db;
mod depreciation;
mod excel;
mod models;

use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database = Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(database)
        .invoke_handler(tauri::generate_handler![
            // Dashboard
            commands::get_dashboard_stats,
            // Categories
            commands::get_categories,
            commands::get_categories_with_counts,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::move_assets_and_delete_category,
            // Assets
            commands::get_assets,
            commands::get_asset,
            commands::create_asset,
            commands::update_asset,
            commands::delete_asset,
            commands::dispose_asset,
            // Reports
            commands::get_annual_summary,
            // Excel
            excel::import_assets_from_excel,
            excel::export_template,
            excel::export_depreciation_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
