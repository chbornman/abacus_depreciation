use crate::models::{Asset, DepreciationEntry};

/// Generate straight-line depreciation schedule for an asset
pub fn generate_schedule(asset: &Asset) -> Vec<DepreciationEntry> {
    let asset_id = asset.id.unwrap_or(0);
    let depreciable_base = asset.cost - asset.salvage_value;
    let annual_depreciation = depreciable_base / asset.useful_life_years as f64;

    // Parse the service date to get the starting year
    let start_year: i32 = asset
        .date_placed_in_service
        .split('-')
        .next()
        .and_then(|y| y.parse().ok())
        .unwrap_or(2024);

    let mut schedule = Vec::new();
    let mut accumulated = 0.0;
    let mut book_value = asset.cost;

    for i in 0..asset.useful_life_years {
        let year = start_year + i;
        let beginning_value = book_value;

        // Last year might have rounding adjustment
        let expense = if i == asset.useful_life_years - 1 {
            book_value - asset.salvage_value
        } else {
            annual_depreciation
        };

        accumulated += expense;
        book_value -= expense;

        // Round to 2 decimal places
        let expense = (expense * 100.0).round() / 100.0;
        let accumulated = (accumulated * 100.0).round() / 100.0;
        let ending_value = (book_value * 100.0).round() / 100.0;

        schedule.push(DepreciationEntry {
            id: None,
            asset_id,
            year,
            beginning_book_value: (beginning_value * 100.0).round() / 100.0,
            depreciation_expense: expense,
            accumulated_depreciation: accumulated,
            ending_book_value: ending_value,
        });
    }

    schedule
}

/// Calculate current book value for an asset as of a given year
pub fn current_book_value(asset: &Asset, as_of_year: i32) -> f64 {
    let start_year: i32 = asset
        .date_placed_in_service
        .split('-')
        .next()
        .and_then(|y| y.parse().ok())
        .unwrap_or(2024);

    let years_depreciated = (as_of_year - start_year + 1).max(0).min(asset.useful_life_years);
    let annual_depreciation = (asset.cost - asset.salvage_value) / asset.useful_life_years as f64;
    let accumulated = annual_depreciation * years_depreciated as f64;

    ((asset.cost - accumulated).max(asset.salvage_value) * 100.0).round() / 100.0
}

/// Get depreciation expense for a specific year
pub fn depreciation_for_year(asset: &Asset, year: i32) -> f64 {
    let start_year: i32 = asset
        .date_placed_in_service
        .split('-')
        .next()
        .and_then(|y| y.parse().ok())
        .unwrap_or(2024);

    let end_year = start_year + asset.useful_life_years - 1;

    if year < start_year || year > end_year {
        return 0.0;
    }

    // Check if disposed before this year
    if let Some(ref disposed) = asset.disposed_date {
        let disposed_year: i32 = disposed
            .split('-')
            .next()
            .and_then(|y| y.parse().ok())
            .unwrap_or(9999);
        if year > disposed_year {
            return 0.0;
        }
    }

    let annual = (asset.cost - asset.salvage_value) / asset.useful_life_years as f64;
    (annual * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_schedule() {
        let asset = Asset {
            id: Some(1),
            name: "Test Computer".to_string(),
            description: None,
            category_id: None,
            date_placed_in_service: "2024-01-15".to_string(),
            cost: 2000.0,
            salvage_value: 200.0,
            useful_life_years: 5,
            property_class: Some("5".to_string()),
            notes: None,
            disposed_date: None,
            disposed_value: None,
        };

        let schedule = generate_schedule(&asset);

        assert_eq!(schedule.len(), 5);
        assert_eq!(schedule[0].year, 2024);
        assert_eq!(schedule[0].beginning_book_value, 2000.0);
        assert_eq!(schedule[0].depreciation_expense, 360.0);
        assert_eq!(schedule[4].ending_book_value, 200.0);
    }
}
