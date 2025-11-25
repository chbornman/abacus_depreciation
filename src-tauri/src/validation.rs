use crate::models::{Asset, AssetImport, Category};
use chrono::NaiveDate;

/// Valid property classes for IRS depreciation
const VALID_PROPERTY_CLASSES: &[&str] = &["3", "5", "7", "10", "15", "20", "27.5", "39"];

/// Validation error with field-specific messages
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("{0}")]
    Single(String),
    #[error("Validation failed: {}", .0.join("; "))]
    Multiple(Vec<String>),
}

impl ValidationError {
    pub fn from_errors(errors: Vec<String>) -> Self {
        if errors.len() == 1 {
            ValidationError::Single(errors.into_iter().next().unwrap())
        } else {
            ValidationError::Multiple(errors)
        }
    }
}

pub type Result<T> = std::result::Result<T, ValidationError>;

/// Validate an asset before create/update
pub fn validate_asset(asset: &Asset) -> Result<()> {
    let mut errors = Vec::new();

    // Name validation
    let name = asset.name.trim();
    if name.is_empty() {
        errors.push("Asset name is required".to_string());
    } else if name.len() > 200 {
        errors.push("Asset name must be 200 characters or less".to_string());
    }

    // Date placed in service
    if asset.date_placed_in_service.trim().is_empty() {
        errors.push("Date placed in service is required".to_string());
    } else if parse_date(&asset.date_placed_in_service).is_err() {
        errors.push("Invalid date format for date placed in service (use YYYY-MM-DD)".to_string());
    } else if is_future_date(&asset.date_placed_in_service) {
        errors.push("Date placed in service cannot be in the future".to_string());
    }

    // Cost validation
    if asset.cost <= 0.0 {
        errors.push("Cost must be greater than $0".to_string());
    }

    // Salvage value validation
    if asset.salvage_value < 0.0 {
        errors.push("Salvage value cannot be negative".to_string());
    } else if asset.salvage_value > asset.cost {
        errors.push("Salvage value cannot exceed cost".to_string());
    }

    // Useful life validation
    if asset.useful_life_years < 1 {
        errors.push("Useful life must be at least 1 year".to_string());
    }

    // Property class validation (optional)
    if let Some(ref pc) = asset.property_class {
        let pc_trimmed = pc.trim();
        if !pc_trimmed.is_empty() && !VALID_PROPERTY_CLASSES.contains(&pc_trimmed) {
            errors.push(format!("Invalid property class: {}", pc_trimmed));
        }
    }

    // Description length
    if let Some(ref desc) = asset.description {
        if desc.len() > 500 {
            errors.push("Description must be 500 characters or less".to_string());
        }
    }

    // Notes length
    if let Some(ref notes) = asset.notes {
        if notes.len() > 2000 {
            errors.push("Notes must be 2000 characters or less".to_string());
        }
    }

    // Disposed date validation (if present)
    if let Some(ref disposed_date) = asset.disposed_date {
        if disposed_date.trim().is_empty() {
            errors.push("Disposal date cannot be empty once set".to_string());
        } else if parse_date(disposed_date).is_err() {
            errors.push("Invalid disposal date format (use YYYY-MM-DD)".to_string());
        } else {
            if is_future_date(disposed_date) {
                errors.push("Disposal date cannot be in the future".to_string());
            }
            // Check disposed_date >= date_placed_in_service
            if let (Ok(service_date), Ok(dispose_date)) = (
                parse_date(&asset.date_placed_in_service),
                parse_date(disposed_date),
            ) {
                if dispose_date < service_date {
                    errors.push(
                        "Disposal date must be on or after the date placed in service".to_string(),
                    );
                }
            }
        }
    }

    // Disposed value validation (if present)
    if let Some(disposed_value) = asset.disposed_value {
        if disposed_value < 0.0 {
            errors.push("Disposal value cannot be negative".to_string());
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(ValidationError::from_errors(errors))
    }
}

/// Validate a category before create/update
pub fn validate_category(category: &Category) -> Result<()> {
    let mut errors = Vec::new();

    // Name validation
    let name = category.name.trim();
    if name.is_empty() {
        errors.push("Category name is required".to_string());
    } else if name.len() > 100 {
        errors.push("Category name must be 100 characters or less".to_string());
    }

    // Default useful life (optional)
    if let Some(life) = category.default_useful_life {
        if life < 1 {
            errors.push("Default useful life must be at least 1 year".to_string());
        }
    }

    // Default property class (optional)
    if let Some(ref pc) = category.default_property_class {
        let pc_trimmed = pc.trim();
        if !pc_trimmed.is_empty() && !VALID_PROPERTY_CLASSES.contains(&pc_trimmed) {
            errors.push(format!("Invalid default property class: {}", pc_trimmed));
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(ValidationError::from_errors(errors))
    }
}

/// Validate an asset import row
pub fn validate_asset_import(import: &AssetImport, row_num: usize) -> Result<()> {
    let mut errors = Vec::new();
    let prefix = format!("Row {}", row_num);

    // Name validation
    let name = import.name.trim();
    if name.is_empty() {
        errors.push(format!("{}: Asset name is required", prefix));
    } else if name.len() > 200 {
        errors.push(format!("{}: Asset name must be 200 characters or less", prefix));
    }

    // Date validation
    if import.date_placed_in_service.trim().is_empty() {
        errors.push(format!("{}: Date placed in service is required", prefix));
    } else if parse_date(&import.date_placed_in_service).is_err() {
        errors.push(format!(
            "{}: Invalid date format '{}' (use YYYY-MM-DD)",
            prefix, import.date_placed_in_service
        ));
    } else if is_future_date(&import.date_placed_in_service) {
        errors.push(format!("{}: Date cannot be in the future", prefix));
    }

    // Cost validation
    if import.cost <= 0.0 {
        errors.push(format!("{}: Cost must be greater than $0", prefix));
    }

    // Salvage value validation
    if let Some(salvage) = import.salvage_value {
        if salvage < 0.0 {
            errors.push(format!("{}: Salvage value cannot be negative", prefix));
        } else if salvage > import.cost {
            errors.push(format!(
                "{}: Salvage value (${:.2}) cannot exceed cost (${:.2})",
                prefix, salvage, import.cost
            ));
        }
    }

    // Useful life validation
    if import.useful_life_years < 1 {
        errors.push(format!("{}: Useful life must be at least 1 year", prefix));
    }

    // Property class validation (optional)
    if let Some(ref pc) = import.property_class {
        let pc_trimmed = pc.trim();
        if !pc_trimmed.is_empty() && !VALID_PROPERTY_CLASSES.contains(&pc_trimmed) {
            errors.push(format!("{}: Invalid property class '{}'", prefix, pc_trimmed));
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(ValidationError::from_errors(errors))
    }
}

/// Validate disposal operation
pub fn validate_disposal(
    disposed_date: &str,
    disposed_value: Option<f64>,
    date_placed_in_service: &str,
) -> Result<()> {
    let mut errors = Vec::new();

    // Disposed date validation
    if disposed_date.trim().is_empty() {
        errors.push("Disposal date is required".to_string());
    } else if parse_date(disposed_date).is_err() {
        errors.push("Invalid disposal date format (use YYYY-MM-DD)".to_string());
    } else {
        if is_future_date(disposed_date) {
            errors.push("Disposal date cannot be in the future".to_string());
        }
        if let (Ok(service_date), Ok(dispose_date)) =
            (parse_date(date_placed_in_service), parse_date(disposed_date))
        {
            if dispose_date < service_date {
                errors.push(
                    "Disposal date must be on or after the date placed in service".to_string(),
                );
            }
        }
    }

    // Disposed value validation
    if let Some(value) = disposed_value {
        if value < 0.0 {
            errors.push("Disposal value cannot be negative".to_string());
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(ValidationError::from_errors(errors))
    }
}

// Helper functions

fn parse_date(date_str: &str) -> std::result::Result<NaiveDate, ()> {
    NaiveDate::parse_from_str(date_str.trim(), "%Y-%m-%d").map_err(|_| ())
}

fn is_future_date(date_str: &str) -> bool {
    if let Ok(date) = parse_date(date_str) {
        let today = chrono::Local::now().date_naive();
        date > today
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to create a valid base asset for testing
    fn valid_asset() -> Asset {
        Asset {
            id: None,
            name: "Test Asset".to_string(),
            description: Some("A test asset".to_string()),
            category_id: None,
            date_placed_in_service: "2024-01-15".to_string(),
            cost: 1000.0,
            salvage_value: 100.0,
            useful_life_years: 5,
            property_class: Some("5".to_string()),
            notes: None,
            disposed_date: None,
            disposed_value: None,
            created_at: None,
            updated_at: None,
        }
    }

    // Helper to create a valid base category for testing
    fn valid_category() -> Category {
        Category {
            id: None,
            name: "Equipment".to_string(),
            default_useful_life: Some(5),
            default_property_class: Some("5".to_string()),
            created_at: None,
            updated_at: None,
        }
    }

    // Helper to create a valid asset import for testing
    fn valid_asset_import() -> AssetImport {
        AssetImport {
            name: "Imported Asset".to_string(),
            description: Some("An imported asset".to_string()),
            category: Some("Equipment".to_string()),
            date_placed_in_service: "2024-01-15".to_string(),
            cost: 5000.0,
            salvage_value: Some(500.0),
            useful_life_years: 7,
            property_class: Some("7".to_string()),
            notes: None,
        }
    }

    // ==================== Asset Validation Tests ====================

    #[test]
    fn test_validate_asset_valid() {
        assert!(validate_asset(&valid_asset()).is_ok());
    }

    #[test]
    fn test_validate_asset_valid_minimal() {
        let asset = Asset {
            id: None,
            name: "Minimal".to_string(),
            description: None,
            category_id: None,
            date_placed_in_service: "2024-01-01".to_string(),
            cost: 100.0,
            salvage_value: 0.0,
            useful_life_years: 1,
            property_class: None,
            notes: None,
            disposed_date: None,
            disposed_value: None,
            created_at: None,
            updated_at: None,
        };
        assert!(validate_asset(&asset).is_ok());
    }

    // Name validation tests
    #[test]
    fn test_validate_asset_empty_name() {
        let mut asset = valid_asset();
        asset.name = "".to_string();
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("name is required"));
    }

    #[test]
    fn test_validate_asset_whitespace_only_name() {
        let mut asset = valid_asset();
        asset.name = "   \t\n  ".to_string();
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("name is required"));
    }

    #[test]
    fn test_validate_asset_name_too_long() {
        let mut asset = valid_asset();
        asset.name = "a".repeat(201);
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("200 characters"));
    }

    #[test]
    fn test_validate_asset_name_exactly_200_chars() {
        let mut asset = valid_asset();
        asset.name = "a".repeat(200);
        assert!(validate_asset(&asset).is_ok());
    }

    // Date validation tests
    #[test]
    fn test_validate_asset_empty_date() {
        let mut asset = valid_asset();
        asset.date_placed_in_service = "".to_string();
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Date placed in service is required"));
    }

    #[test]
    fn test_validate_asset_invalid_date_format() {
        let mut asset = valid_asset();
        asset.date_placed_in_service = "01-15-2024".to_string();
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid date format"));
    }

    #[test]
    fn test_validate_asset_invalid_date_format_slashes() {
        let mut asset = valid_asset();
        asset.date_placed_in_service = "2024/01/15".to_string();
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid date format"));
    }

    #[test]
    fn test_validate_asset_future_date() {
        let mut asset = valid_asset();
        let future = chrono::Local::now().date_naive() + chrono::Duration::days(30);
        asset.date_placed_in_service = future.format("%Y-%m-%d").to_string();
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be in the future"));
    }

    #[test]
    fn test_validate_asset_today_date_is_valid() {
        let mut asset = valid_asset();
        let today = chrono::Local::now().date_naive();
        asset.date_placed_in_service = today.format("%Y-%m-%d").to_string();
        assert!(validate_asset(&asset).is_ok());
    }

    // Cost validation tests
    #[test]
    fn test_validate_asset_zero_cost() {
        let mut asset = valid_asset();
        asset.cost = 0.0;
        asset.salvage_value = 0.0;
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Cost must be greater than"));
    }

    #[test]
    fn test_validate_asset_negative_cost() {
        let mut asset = valid_asset();
        asset.cost = -500.0;
        asset.salvage_value = 0.0;
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Cost must be greater than"));
    }

    #[test]
    fn test_validate_asset_small_positive_cost() {
        let mut asset = valid_asset();
        asset.cost = 0.01;
        asset.salvage_value = 0.0;
        assert!(validate_asset(&asset).is_ok());
    }

    // Salvage value validation tests
    #[test]
    fn test_validate_asset_negative_salvage() {
        let mut asset = valid_asset();
        asset.salvage_value = -100.0;
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Salvage value cannot be negative"));
    }

    #[test]
    fn test_validate_asset_salvage_exceeds_cost() {
        let mut asset = valid_asset();
        asset.cost = 1000.0;
        asset.salvage_value = 2000.0;
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Salvage value cannot exceed cost"));
    }

    #[test]
    fn test_validate_asset_salvage_equals_cost() {
        let mut asset = valid_asset();
        asset.cost = 1000.0;
        asset.salvage_value = 1000.0;
        // Salvage equal to cost is valid (no depreciation)
        assert!(validate_asset(&asset).is_ok());
    }

    #[test]
    fn test_validate_asset_zero_salvage() {
        let mut asset = valid_asset();
        asset.salvage_value = 0.0;
        assert!(validate_asset(&asset).is_ok());
    }

    // Useful life validation tests
    #[test]
    fn test_validate_asset_zero_useful_life() {
        let mut asset = valid_asset();
        asset.useful_life_years = 0;
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("at least 1 year"));
    }

    #[test]
    fn test_validate_asset_one_year_useful_life() {
        let mut asset = valid_asset();
        asset.useful_life_years = 1;
        assert!(validate_asset(&asset).is_ok());
    }

    // Property class validation tests
    #[test]
    fn test_validate_asset_all_valid_property_classes() {
        for class in VALID_PROPERTY_CLASSES {
            let mut asset = valid_asset();
            asset.property_class = Some(class.to_string());
            assert!(
                validate_asset(&asset).is_ok(),
                "Property class '{}' should be valid",
                class
            );
        }
    }

    #[test]
    fn test_validate_asset_invalid_property_class() {
        let mut asset = valid_asset();
        asset.property_class = Some("6".to_string());
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid property class"));
    }

    #[test]
    fn test_validate_asset_invalid_property_class_text() {
        let mut asset = valid_asset();
        asset.property_class = Some("invalid".to_string());
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid property class"));
    }

    #[test]
    fn test_validate_asset_empty_property_class_is_valid() {
        let mut asset = valid_asset();
        asset.property_class = Some("".to_string());
        // Empty string is treated as no property class
        assert!(validate_asset(&asset).is_ok());
    }

    #[test]
    fn test_validate_asset_none_property_class_is_valid() {
        let mut asset = valid_asset();
        asset.property_class = None;
        assert!(validate_asset(&asset).is_ok());
    }

    // Description validation tests
    #[test]
    fn test_validate_asset_description_too_long() {
        let mut asset = valid_asset();
        asset.description = Some("a".repeat(501));
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Description must be 500 characters"));
    }

    #[test]
    fn test_validate_asset_description_exactly_500_chars() {
        let mut asset = valid_asset();
        asset.description = Some("a".repeat(500));
        assert!(validate_asset(&asset).is_ok());
    }

    // Notes validation tests
    #[test]
    fn test_validate_asset_notes_too_long() {
        let mut asset = valid_asset();
        asset.notes = Some("a".repeat(2001));
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Notes must be 2000 characters"));
    }

    #[test]
    fn test_validate_asset_notes_exactly_2000_chars() {
        let mut asset = valid_asset();
        asset.notes = Some("a".repeat(2000));
        assert!(validate_asset(&asset).is_ok());
    }

    // Disposal validation tests
    #[test]
    fn test_validate_asset_disposed_date_invalid_format() {
        let mut asset = valid_asset();
        asset.disposed_date = Some("invalid".to_string());
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid disposal date format"));
    }

    #[test]
    fn test_validate_asset_disposed_date_future() {
        let mut asset = valid_asset();
        let future = chrono::Local::now().date_naive() + chrono::Duration::days(30);
        asset.disposed_date = Some(future.format("%Y-%m-%d").to_string());
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Disposal date cannot be in the future"));
    }

    #[test]
    fn test_validate_asset_disposed_before_service() {
        let mut asset = valid_asset();
        asset.date_placed_in_service = "2024-06-01".to_string();
        asset.disposed_date = Some("2024-01-01".to_string());
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("must be on or after the date placed in service"));
    }

    #[test]
    fn test_validate_asset_disposed_same_day_as_service() {
        let mut asset = valid_asset();
        asset.date_placed_in_service = "2024-01-15".to_string();
        asset.disposed_date = Some("2024-01-15".to_string());
        // Disposing on the same day is valid
        assert!(validate_asset(&asset).is_ok());
    }

    #[test]
    fn test_validate_asset_negative_disposed_value() {
        let mut asset = valid_asset();
        asset.disposed_date = Some("2024-06-01".to_string());
        asset.disposed_value = Some(-100.0);
        let result = validate_asset(&asset);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Disposal value cannot be negative"));
    }

    #[test]
    fn test_validate_asset_zero_disposed_value_is_valid() {
        let mut asset = valid_asset();
        asset.disposed_date = Some("2024-06-01".to_string());
        asset.disposed_value = Some(0.0);
        assert!(validate_asset(&asset).is_ok());
    }

    // Multiple errors test
    #[test]
    fn test_validate_asset_multiple_errors() {
        let asset = Asset {
            id: None,
            name: "".to_string(),
            description: None,
            category_id: None,
            date_placed_in_service: "invalid".to_string(),
            cost: 0.0,
            salvage_value: -10.0,
            useful_life_years: 0,
            property_class: Some("invalid".to_string()),
            notes: None,
            disposed_date: None,
            disposed_value: None,
            created_at: None,
            updated_at: None,
        };
        let result = validate_asset(&asset);
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        // Should contain multiple error messages
        assert!(err_msg.contains("name is required"));
        assert!(err_msg.contains("Invalid date format"));
        assert!(err_msg.contains("Cost must be greater than"));
    }

    // ==================== Category Validation Tests ====================

    #[test]
    fn test_validate_category_valid() {
        assert!(validate_category(&valid_category()).is_ok());
    }

    #[test]
    fn test_validate_category_valid_minimal() {
        let category = Category {
            id: None,
            name: "Basic".to_string(),
            default_useful_life: None,
            default_property_class: None,
            created_at: None,
            updated_at: None,
        };
        assert!(validate_category(&category).is_ok());
    }

    #[test]
    fn test_validate_category_empty_name() {
        let mut category = valid_category();
        category.name = "".to_string();
        let result = validate_category(&category);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Category name is required"));
    }

    #[test]
    fn test_validate_category_whitespace_name() {
        let mut category = valid_category();
        category.name = "   ".to_string();
        let result = validate_category(&category);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Category name is required"));
    }

    #[test]
    fn test_validate_category_name_too_long() {
        let mut category = valid_category();
        category.name = "a".repeat(101);
        let result = validate_category(&category);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("100 characters"));
    }

    #[test]
    fn test_validate_category_name_exactly_100_chars() {
        let mut category = valid_category();
        category.name = "a".repeat(100);
        assert!(validate_category(&category).is_ok());
    }

    #[test]
    fn test_validate_category_zero_useful_life() {
        let mut category = valid_category();
        category.default_useful_life = Some(0);
        let result = validate_category(&category);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("at least 1 year"));
    }

    #[test]
    fn test_validate_category_one_year_useful_life() {
        let mut category = valid_category();
        category.default_useful_life = Some(1);
        assert!(validate_category(&category).is_ok());
    }

    #[test]
    fn test_validate_category_invalid_property_class() {
        let mut category = valid_category();
        category.default_property_class = Some("invalid".to_string());
        let result = validate_category(&category);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid default property class"));
    }

    #[test]
    fn test_validate_category_all_valid_property_classes() {
        for class in VALID_PROPERTY_CLASSES {
            let mut category = valid_category();
            category.default_property_class = Some(class.to_string());
            assert!(
                validate_category(&category).is_ok(),
                "Property class '{}' should be valid for category",
                class
            );
        }
    }

    // ==================== Disposal Validation Tests ====================

    #[test]
    fn test_validate_disposal_valid() {
        let result = validate_disposal("2024-06-15", Some(500.0), "2024-01-15");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_disposal_valid_no_value() {
        let result = validate_disposal("2024-06-15", None, "2024-01-15");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_disposal_empty_date() {
        let result = validate_disposal("", Some(500.0), "2024-01-15");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Disposal date is required"));
    }

    #[test]
    fn test_validate_disposal_whitespace_date() {
        let result = validate_disposal("   ", Some(500.0), "2024-01-15");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Disposal date is required"));
    }

    #[test]
    fn test_validate_disposal_invalid_format() {
        let result = validate_disposal("06-15-2024", Some(500.0), "2024-01-15");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid disposal date format"));
    }

    #[test]
    fn test_validate_disposal_future_date() {
        let future = chrono::Local::now().date_naive() + chrono::Duration::days(30);
        let future_str = future.format("%Y-%m-%d").to_string();
        let result = validate_disposal(&future_str, Some(500.0), "2024-01-15");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be in the future"));
    }

    #[test]
    fn test_validate_disposal_before_service_date() {
        let result = validate_disposal("2024-01-01", Some(500.0), "2024-06-01");
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("must be on or after the date placed in service"));
    }

    #[test]
    fn test_validate_disposal_same_as_service_date() {
        let result = validate_disposal("2024-01-15", Some(500.0), "2024-01-15");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_disposal_negative_value() {
        let result = validate_disposal("2024-06-15", Some(-100.0), "2024-01-15");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Disposal value cannot be negative"));
    }

    #[test]
    fn test_validate_disposal_zero_value() {
        let result = validate_disposal("2024-06-15", Some(0.0), "2024-01-15");
        assert!(result.is_ok());
    }

    // ==================== Asset Import Validation Tests ====================

    #[test]
    fn test_validate_asset_import_valid() {
        let import = valid_asset_import();
        assert!(validate_asset_import(&import, 1).is_ok());
    }

    #[test]
    fn test_validate_asset_import_empty_name() {
        let mut import = valid_asset_import();
        import.name = "".to_string();
        let result = validate_asset_import(&import, 5);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Row 5"));
        assert!(err.contains("name is required"));
    }

    #[test]
    fn test_validate_asset_import_name_too_long() {
        let mut import = valid_asset_import();
        import.name = "a".repeat(201);
        let result = validate_asset_import(&import, 3);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Row 3"));
        assert!(err.contains("200 characters"));
    }

    #[test]
    fn test_validate_asset_import_invalid_date() {
        let mut import = valid_asset_import();
        import.date_placed_in_service = "invalid".to_string();
        let result = validate_asset_import(&import, 2);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Row 2"));
        assert!(err.contains("Invalid date format"));
    }

    #[test]
    fn test_validate_asset_import_future_date() {
        let mut import = valid_asset_import();
        let future = chrono::Local::now().date_naive() + chrono::Duration::days(30);
        import.date_placed_in_service = future.format("%Y-%m-%d").to_string();
        let result = validate_asset_import(&import, 4);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Row 4"));
        assert!(err.contains("cannot be in the future"));
    }

    #[test]
    fn test_validate_asset_import_zero_cost() {
        let mut import = valid_asset_import();
        import.cost = 0.0;
        let result = validate_asset_import(&import, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Cost must be greater than"));
    }

    #[test]
    fn test_validate_asset_import_negative_salvage() {
        let mut import = valid_asset_import();
        import.salvage_value = Some(-50.0);
        let result = validate_asset_import(&import, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Salvage value cannot be negative"));
    }

    #[test]
    fn test_validate_asset_import_salvage_exceeds_cost() {
        let mut import = valid_asset_import();
        import.cost = 1000.0;
        import.salvage_value = Some(2000.0);
        let result = validate_asset_import(&import, 7);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Row 7"));
        assert!(err.contains("cannot exceed cost"));
    }

    #[test]
    fn test_validate_asset_import_zero_useful_life() {
        let mut import = valid_asset_import();
        import.useful_life_years = 0;
        let result = validate_asset_import(&import, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("at least 1 year"));
    }

    #[test]
    fn test_validate_asset_import_invalid_property_class() {
        let mut import = valid_asset_import();
        import.property_class = Some("invalid".to_string());
        let result = validate_asset_import(&import, 9);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Row 9"));
        assert!(err.contains("Invalid property class"));
    }

    #[test]
    fn test_validate_asset_import_row_number_in_error() {
        let mut import = valid_asset_import();
        import.name = "".to_string();
        import.cost = 0.0;

        for row in [1, 50, 100, 999] {
            let result = validate_asset_import(&import, row);
            assert!(result.is_err());
            assert!(
                result.unwrap_err().to_string().contains(&format!("Row {}", row)),
                "Error should contain row number {}",
                row
            );
        }
    }
}
