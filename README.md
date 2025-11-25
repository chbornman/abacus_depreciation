# Abacus Depreciation

A simple desktop application for tracking straight-line depreciation of assets over time. Built with Tauri, React, and SQLite.

## Purpose

This tool helps accountants and small business owners:
- Track fixed assets and their depreciation schedules
- Import asset data from Excel spreadsheets
- Generate depreciation reports for tax purposes
- Export schedules back to Excel for further analysis

## How Straight-Line Depreciation Works

The straight-line method spreads the cost of an asset evenly over its useful life:

```
Annual Depreciation = (Asset Cost - Salvage Value) / Useful Life
```

**Key Terms:**
- **Asset Cost**: Original purchase price
- **Salvage Value**: Estimated value at end of useful life (also called residual or scrap value)
- **Useful Life**: Number of years the asset will be in service
- **Book Value**: Current value = Cost - Accumulated Depreciation

### IRS Property Classes (MACRS Reference)

For tax purposes, the IRS assigns assets to property classes:

| Class | Examples |
|-------|----------|
| 3-year | Small tools, breeding cattle |
| 5-year | Automobiles, computers, office equipment |
| 7-year | Office furniture, fixtures, most equipment |
| 10-year | Boats, agricultural structures |
| 15-year | Land improvements, roads |
| 20-year | Farm buildings |
| 27.5-year | Residential rental property |
| 39-year | Non-residential real estate |

*Note: This app uses straight-line depreciation for simplicity. MACRS uses accelerated methods (200% or 150% declining balance) for tax purposes.*

---

## Data Schema

### SQLite Database Structure

```sql
-- Asset categories for organization
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    default_useful_life INTEGER,
    default_property_class TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Core asset records
CREATE TABLE assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),

    -- Financial data
    date_placed_in_service DATE NOT NULL,
    cost DECIMAL(12,2) NOT NULL,
    salvage_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    useful_life_years INTEGER NOT NULL,

    -- IRS classification (for reference)
    property_class TEXT, -- '3', '5', '7', '10', '15', '20', '27.5', '39'

    -- Metadata
    notes TEXT,
    disposed_date DATE,
    disposed_value DECIMAL(12,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-computed depreciation schedule (generated on asset creation/update)
CREATE TABLE depreciation_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,

    beginning_book_value DECIMAL(12,2) NOT NULL,
    depreciation_expense DECIMAL(12,2) NOT NULL,
    accumulated_depreciation DECIMAL(12,2) NOT NULL,
    ending_book_value DECIMAL(12,2) NOT NULL,

    UNIQUE(asset_id, year)
);

-- Index for common queries
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_date ON assets(date_placed_in_service);
CREATE INDEX idx_schedule_year ON depreciation_schedule(year);
CREATE INDEX idx_schedule_asset ON depreciation_schedule(asset_id);
```

### Example Depreciation Calculation

**Asset:** Office Computer
**Cost:** $2,000
**Salvage Value:** $200
**Useful Life:** 5 years
**Annual Depreciation:** ($2,000 - $200) / 5 = **$360/year**

| Year | Beginning Value | Depreciation | Accumulated | Ending Value |
|------|-----------------|--------------|-------------|--------------|
| 1    | $2,000          | $360         | $360        | $1,640       |
| 2    | $1,640          | $360         | $720        | $1,280       |
| 3    | $1,280          | $360         | $1,080      | $920         |
| 4    | $920            | $360         | $1,440      | $560         |
| 5    | $560            | $360         | $1,800      | $200         |

---

## Excel Integration

### Import Template

The import template expects these columns:

| Column | Required | Description |
|--------|----------|-------------|
| Asset Name | Yes | Identifier for the asset |
| Description | No | Additional details |
| Category | No | For organization (e.g., "Vehicles", "Equipment") |
| Date Placed in Service | Yes | Format: YYYY-MM-DD or MM/DD/YYYY |
| Cost | Yes | Original purchase price |
| Salvage Value | No | Defaults to 0 |
| Useful Life (Years) | Yes | Integer number of years |
| Property Class | No | IRS class for reference |
| Notes | No | Any additional notes |

### Export Options

1. **Asset List**: All assets with current book values
2. **Depreciation Schedule**: Year-by-year breakdown per asset
3. **Annual Summary**: Total depreciation by year across all assets
4. **Tax Report**: Grouped by property class for tax filing

---

## UI/UX Design

### Screen Flow

```
+-----------------------------------------------------------+
|                     DASHBOARD                              |
|  +--------------+  +--------------+  +------------------+  |
|  | Total Assets |  | This Year    |  | Total Book       |  |
|  |     47       |  | Depreciation |  | Value            |  |
|  |              |  |   $12,450    |  |   $156,200       |  |
|  +--------------+  +--------------+  +------------------+  |
|                                                            |
|  [Import Excel]  [Export Report]  [+ Add Asset]           |
|                                                            |
|  +------------------------------------------------------+  |
|  | Recent Activity / Assets Depreciating This Year      |  |
|  | - Office Computer - $360 remaining in 2024           |  |
|  | - Delivery Van - $4,200 remaining in 2024            |  |
|  +------------------------------------------------------+  |
+-----------------------------------------------------------+
         |
         v
+-----------------------------------------------------------+
|                    ASSET LIST                              |
|  Filter: [All Categories v] [Year: 2024 v] [Search___]    |
|                                                            |
|  +------------------------------------------------------+  |
|  | Name          | Cost    | Book Value | Depr/Year     |  |
|  |---------------|---------|------------|---------------|  |
|  | Office Comp.  | $2,000  | $920       | $360          |  |
|  | Delivery Van  | $35,000 | $18,500    | $4,200        |  |
|  | Desk Set      | $1,500  | $750       | $150          |  |
|  +------------------------------------------------------+  |
+-----------------------------------------------------------+
         |
         v (click row)
+-----------------------------------------------------------+
|                   ASSET DETAIL                             |
|  +------------------------------------------------------+  |
|  | Office Computer                          [Edit]      |  |
|  | Category: Equipment                                  |  |
|  | Placed in Service: 2022-01-15                        |  |
|  | Cost: $2,000 | Salvage: $200 | Life: 5 years        |  |
|  | Property Class: 5-year                               |  |
|  +------------------------------------------------------+  |
|                                                            |
|  DEPRECIATION SCHEDULE                                     |
|  +------------------------------------------------------+  |
|  | Year | Begin    | Expense | Accum   | End      |     |  |
|  | 2022 | $2,000   | $360    | $360    | $1,640   | <-  |  |
|  | 2023 | $1,640   | $360    | $720    | $1,280   | <-  |  |
|  | 2024 | $1,280   | $360    | $1,080  | $920     | NOW |  |
|  | 2025 | $920     | $360    | $1,440  | $560     |     |  |
|  | 2026 | $560     | $360    | $1,800  | $200     |     |  |
|  +------------------------------------------------------+  |
|                                                            |
|  [Mark Disposed] [Delete Asset] [Export Schedule]         |
+-----------------------------------------------------------+
```

### Key User Flows

1. **First-Time Setup**
   - Open app -> Dashboard (empty state)
   - Download template -> Fill in Excel -> Import
   - View generated schedules

2. **Annual Tax Prep**
   - Filter assets by year
   - Export annual summary report
   - Review by property class

3. **Add New Asset**
   - Click "+ Add Asset"
   - Fill form (auto-calculates depreciation preview)
   - Save -> Schedule generated

4. **Asset Disposal**
   - Open asset detail
   - Click "Mark Disposed"
   - Enter disposal date and sale price
   - Records gain/loss, stops future depreciation

---

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Desktop**: Tauri v2 (Rust backend)
- **Database**: SQLite (via rusqlite)
- **Excel**: xlsx crate (Rust) or SheetJS (JS)
- **Styling**: TBD (Tailwind CSS recommended)

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run tauri dev

# Build for production
bun run tauri build
```

## Releases & Versioning

### Download

Pre-built installers are available on the [Releases](../../releases) page:

- **macOS**: `.dmg` file (Apple Silicon)
- **Windows**: `.msi` or `.exe` installer
- **Linux**: `.AppImage`, `.deb`, or `.rpm` package

### Versioning

This project uses [Semantic Versioning](https://semver.org/):

| Version | Meaning |
|---------|---------|
| `0.x.x` | Pre-release development |
| `1.0.0` | First stable release |
| `x.Y.0` | New features (backwards compatible) |
| `x.x.Z` | Bug fixes |

Tags with a suffix (e.g., `v0.2.0-beta.1`) are marked as prereleases.

### Creating a Release

1. Update version in `src-tauri/tauri.conf.json` and `package.json`
2. Commit: `git commit -am "Bump version to x.y.z"`
3. Tag: `git tag vx.y.z`
4. Push: `git push && git push --tags`

GitHub Actions will automatically build for all platforms and create a release.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT

---

## User Discovery Questions

Questions to ask potential users to understand what features would be most helpful:

### Current Situation

1. **What kind of business do you run?** (e.g., rental properties, farm, retail store, service business)
   - Different businesses have different asset types and needs

2. **How many assets do you need to track?** (Rough estimate - 5? 50? 500?)
   - Helps determine if bulk import is important

3. **How are you tracking depreciation now?** (Excel spreadsheet? Paper? Not at all? Old software?)
   - Existing data might be importable

### Workflow

4. **Do you do your own taxes, or hand everything to an accountant/CPA?**
   - If using an accountant, clean records may be all that's needed

5. **What do you actually need at the end of the year?**
   - A simple total of "this year's depreciation expense"?
   - A list to hand to the accountant?
   - Something else?

6. **Do you need to track assets in different locations or categories?** (e.g., "Office Equipment" vs "Vehicles" vs "Building")

### Pain Points

7. **What's frustrating about how you do it now?**
   - Tells us what to prioritize

8. **Has your accountant ever asked for something you couldn't easily provide?**

9. **Do you need to look up individual assets often, or just run a yearly report?**

### Nice-to-Haves

10. **Would you want this on your phone/tablet, or is desktop-only fine?**

11. **Do you work with QuickBooks or any other accounting software?**
    - Might want export compatibility in the future

---

## References

- [Straight Line Depreciation - Corporate Finance Institute](https://corporatefinanceinstitute.com/resources/accounting/straight-line-depreciation/)
- [IRS Publication 946 - How To Depreciate Property](https://www.irs.gov/pub/irs-pdf/p946.pdf)
- [MACRS Property Classes - Wikipedia](https://en.wikipedia.org/wiki/MACRS)
- [QuickBooks Depreciation Guide](https://quickbooks.intuit.com/r/accounting/straight-line-depreciation/)
