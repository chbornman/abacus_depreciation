# Abacus Depreciation Manual

Welcome to Abacus, a desktop application for tracking fixed asset depreciation using straight-line depreciation calculations.

---

## Getting Started

### Adding Your First Asset

1. Click the **Add Asset** button in the sidebar
2. Fill in the required fields:
   - **Asset Name** - A descriptive name for the asset
   - **Date Placed in Service** - When the asset was put into use
   - **Cost** - The original purchase price
   - **Useful Life (Years)** - Expected lifespan for depreciation

3. Optionally add:
   - **Category** - Group similar assets together
   - **Salvage Value** - Expected value at end of useful life
   - **Property Class** - IRS classification (3-year, 5-year, etc.)
   - **Description** and **Notes**

4. Click **Add Asset** to save

The depreciation schedule is automatically calculated and stored.

---

## Understanding Depreciation

### Straight-Line Method

Abacus uses the straight-line depreciation method, which spreads the cost evenly over the asset's useful life.

**Formula:**
```
Annual Depreciation = (Cost - Salvage Value) / Useful Life
```

**Example:**
- Cost: $10,000
- Salvage Value: $1,000
- Useful Life: 5 years
- Annual Depreciation: ($10,000 - $1,000) / 5 = **$1,800/year**

### Depreciation Schedule

Each asset has a depreciation schedule showing:
- **Beginning Book Value** - Asset value at start of year
- **Depreciation Expense** - Amount depreciated that year
- **Accumulated Depreciation** - Total depreciation to date
- **Ending Book Value** - Asset value at end of year

---

## Categories

Categories help organize assets and can set default values for new assets.

### Managing Categories

1. Go to **Settings**
2. Find the **Categories** section
3. Click **Add Category**

Each category can have:
- **Default Useful Life** - Automatically fills in when selecting the category
- **Default Property Class** - IRS classification for tax purposes

### Property Classes

Common IRS property classes:
| Class | Examples |
|-------|----------|
| 3-year | Tractor units, racehorses |
| 5-year | Computers, office equipment, vehicles |
| 7-year | Office furniture, fixtures |
| 10-year | Water transportation equipment |
| 15-year | Land improvements, roads |
| 27.5-year | Residential rental property |
| 39-year | Nonresidential real property |

---

## Disposing Assets

When you sell, scrap, or retire an asset:

1. Open the asset details
2. Click **Edit**
3. Change **Status** from "Active" to "Disposed"
4. Enter the **Disposal Date**
5. Optionally enter the **Sale/Disposal Value**
6. Click **Save Changes**

### Gain or Loss on Disposal

If you enter a sale value, Abacus calculates the gain or loss:
- **Gain**: Sale price > Book value at disposal
- **Loss**: Sale price < Book value at disposal

This is important for tax reporting.

---

## Import & Export

### Importing from Excel

1. Click **Import Excel** in the sidebar
2. Select your `.xlsx` or `.xls` file
3. Review the import results

**Required columns:**
- Asset Name
- Date Placed in Service
- Cost
- Useful Life (Years)

**Optional columns:**
- Description
- Category
- Salvage Value
- Property Class
- Notes

### Export Template

Click **Download Template** to get a blank Excel file with the correct column headers.

### Export Report

From the **Reports** view, click **Export Report** to generate an Excel file with:
- All assets and their details
- Complete depreciation schedules
- Annual summary totals

---

## Dashboard

The dashboard shows at-a-glance metrics:
- **Total Assets** - Number of active assets
- **Total Cost** - Combined original cost
- **Current Book Value** - Today's total value
- **Current Year Depreciation** - This year's expense

The chart shows depreciation by year, helping you plan for future expenses.

---

## Tips

- **Keyboard shortcuts**: Use `Ctrl/Cmd +` and `Ctrl/Cmd -` to zoom in/out
- **Theme**: Toggle between light and dark mode in the sidebar
- **Backup**: Your data is stored locally. Consider exporting reports periodically as backups.

---

## Need Help?

If you encounter issues or have questions, check the project repository for updates and support options.
