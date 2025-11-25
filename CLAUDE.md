# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Abacus Depreciation is a Tauri v2 desktop application for tracking fixed asset depreciation using straight-line depreciation calculations. It has a React/TypeScript frontend and a Rust backend with SQLite storage.

## Commands

### Development
```bash
npm run tauri dev          # Run the full Tauri app in dev mode (frontend + backend)
npm run dev                # Run only the Vite dev server (frontend only)
```

### Build
```bash
npm run tauri build        # Build production release
npm run build              # Build frontend only (tsc && vite build)
```

### Rust Backend
```bash
cd src-tauri
cargo build                # Build Rust backend
cargo test                 # Run Rust tests (includes depreciation calculation tests)
cargo clippy               # Lint Rust code
```

## Architecture

### Frontend (React/TypeScript)
- Single-page app in `src/App.tsx` with view-based navigation (`dashboard`, `assets`, `asset-detail`, `asset-form`)
- Uses `@tauri-apps/api/core` `invoke()` to call Rust backend commands
- Uses `@tauri-apps/plugin-dialog` for file open/save dialogs
- Type definitions in `src/types.ts` mirror Rust models

### Backend (Rust/Tauri)
- **`src-tauri/src/lib.rs`**: Application entry point, registers all Tauri commands
- **`src-tauri/src/db.rs`**: SQLite database wrapper using rusqlite, schema initialization
- **`src-tauri/src/models.rs`**: Data structures shared between modules (Asset, Category, DepreciationEntry, etc.)
- **`src-tauri/src/depreciation.rs`**: Straight-line depreciation calculation logic
- **`src-tauri/src/commands.rs`**: Tauri command handlers for CRUD operations
- **`src-tauri/src/excel.rs`**: Excel import/export using calamine (read) and rust_xlsxwriter (write)

### Data Flow
1. Frontend calls `invoke("command_name", { params })`
2. Tauri routes to command handler in `commands.rs` or `excel.rs`
3. Commands access SQLite via `State<Database>` (mutex-protected connection)
4. Depreciation schedules are pre-computed and stored in `depreciation_schedule` table when assets are created/updated

### Database
- SQLite database stored in platform-specific app data directory (`directories::ProjectDirs`)
- Tables: `categories`, `assets`, `depreciation_schedule`
- Schedules are regenerated whenever asset cost/life/salvage values change

### Excel Import Format
Expected columns: Asset Name, Description, Category, Date Placed in Service, Cost, Salvage Value, Useful Life (Years), Property Class, Notes
