import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import "./App.css";
import type {
  Asset,
  AssetWithSchedule,
  Category,
  DashboardStats,
  ImportResult,
  AnnualSummary,
} from "./types";

type View = "dashboard" | "assets" | "asset-detail" | "asset-form" | "reports";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assets, setAssets] = useState<AssetWithSchedule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [annualSummary, setAnnualSummary] = useState<AnnualSummary[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithSchedule | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, assetsData, categoriesData, summaryData] = await Promise.all([
        invoke<DashboardStats>("get_dashboard_stats"),
        invoke<AssetWithSchedule[]>("get_assets"),
        invoke<Category[]>("get_categories"),
        invoke<AnnualSummary[]>("get_annual_summary"),
      ]);
      setStats(statsData);
      setAssets(assetsData);
      setCategories(categoriesData);
      setAnnualSummary(summaryData);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleImport = async () => {
    try {
      const file = await open({
        filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
      });
      if (file) {
        const result = await invoke<ImportResult>("import_assets_from_excel", {
          filePath: file,
        });
        if (result.errors.length > 0) {
          setError(`Imported ${result.imported} assets. Errors: ${result.errors.join(", ")}`);
        } else {
          setSuccess(`Successfully imported ${result.imported} assets`);
        }
        await loadData();
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const handleExportTemplate = async () => {
    try {
      const file = await save({
        defaultPath: "asset_import_template.xlsx",
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (file) {
        await invoke("export_template", { filePath: file });
        setSuccess("Template exported successfully");
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const handleExportReport = async () => {
    try {
      const file = await save({
        defaultPath: `depreciation_report_${currentYear}.xlsx`,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (file) {
        await invoke("export_depreciation_report", { filePath: file });
        setSuccess("Report exported successfully");
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSaveAsset = async (asset: Asset) => {
    try {
      if (asset.id) {
        await invoke("update_asset", { asset });
        setSuccess("Asset updated successfully");
      } else {
        await invoke("create_asset", { asset });
        setSuccess("Asset created successfully");
      }
      await loadData();
      setView("assets");
      setEditingAsset(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await invoke("delete_asset", { id });
      setSuccess("Asset deleted");
      await loadData();
      setView("assets");
      setSelectedAsset(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDisposeAsset = async (id: number) => {
    const disposedDate = prompt("Enter disposal date (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!disposedDate) return;
    const disposedValueStr = prompt("Enter sale/disposal value (or leave blank):");
    const disposedValue = disposedValueStr ? parseFloat(disposedValueStr) : null;

    try {
      await invoke("dispose_asset", { id, disposedDate, disposedValue });
      setSuccess("Asset marked as disposed");
      await loadData();
      const updated = await invoke<AssetWithSchedule>("get_asset", { id });
      setSelectedAsset(updated);
    } catch (e) {
      setError(String(e));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const navigateTo = (newView: View) => {
    setView(newView);
    if (newView !== "asset-detail") setSelectedAsset(null);
    if (newView !== "asset-form") setEditingAsset(null);
  };

  // ============ Sidebar ============

  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Abacus</h1>
        <span className="subtitle">Depreciation Tracker</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${view === "dashboard" ? "active" : ""}`}
          onClick={() => navigateTo("dashboard")}
        >
          <span className="nav-icon">&#9632;</span>
          Dashboard
        </button>
        <button
          className={`nav-item ${view === "assets" || view === "asset-detail" || view === "asset-form" ? "active" : ""}`}
          onClick={() => navigateTo("assets")}
        >
          <span className="nav-icon">&#9776;</span>
          Assets
        </button>
        <button
          className={`nav-item ${view === "reports" ? "active" : ""}`}
          onClick={() => navigateTo("reports")}
        >
          <span className="nav-icon">&#9783;</span>
          Reports
        </button>
      </nav>

      <div className="sidebar-actions">
        <button className="sidebar-btn" onClick={handleImport}>
          Import Excel
        </button>
        <button className="sidebar-btn" onClick={handleExportTemplate}>
          Download Template
        </button>
      </div>

      <div className="sidebar-footer">
        <button
          className="add-asset-btn"
          onClick={() => { setEditingAsset(newAsset()); setView("asset-form"); }}
        >
          + Add Asset
        </button>
      </div>
    </aside>
  );

  // ============ Views ============

  const renderDashboard = () => (
    <div className="view-content">
      <h2>Dashboard</h2>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_assets}</div>
            <div className="stat-label">Total Assets</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-value">{formatCurrency(stats.current_year_depreciation)}</div>
            <div className="stat-label">{currentYear} Depreciation</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.total_book_value)}</div>
            <div className="stat-label">Total Book Value</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.total_cost)}</div>
            <div className="stat-label">Total Cost</div>
          </div>
        </div>
      )}

      <div className="section-header">
        <h3>Recent Assets</h3>
        <button className="link-btn" onClick={() => navigateTo("assets")}>View All</button>
      </div>

      {assets.length === 0 ? (
        <div className="empty-state">
          <p>No assets yet. Import from Excel or add one manually.</p>
        </div>
      ) : (
        <div className="asset-list">
          {assets.slice(0, 5).map((item) => (
            <div
              key={item.asset.id}
              className="asset-row"
              onClick={() => { setSelectedAsset(item); setView("asset-detail"); }}
            >
              <div className="asset-name">{item.asset.name}</div>
              <div className="asset-meta">
                {item.category_name && <span className="tag">{item.category_name}</span>}
                {item.asset.disposed_date && <span className="tag disposed">Disposed</span>}
              </div>
              <div className="asset-values">
                <span>{formatCurrency(item.asset.cost)}</span>
                <span className="depr">
                  {formatCurrency(
                    item.schedule.find((s) => s.year === currentYear)?.depreciation_expense || 0
                  )}/yr
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {annualSummary.length > 0 && (
        <>
          <div className="section-header">
            <h3>Annual Depreciation Summary</h3>
          </div>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Total Depreciation</th>
                <th>Assets</th>
              </tr>
            </thead>
            <tbody>
              {annualSummary.slice(0, 5).map((row) => (
                <tr key={row.year} className={row.year === currentYear ? "current" : ""}>
                  <td>{row.year}</td>
                  <td>{formatCurrency(row.total_depreciation)}</td>
                  <td>{row.asset_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );

  const renderAssetList = () => (
    <div className="view-content">
      <div className="view-header">
        <h2>Assets</h2>
        <button className="primary" onClick={() => { setEditingAsset(newAsset()); setView("asset-form"); }}>
          + Add Asset
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="empty-state">
          <p>No assets yet.</p>
        </div>
      ) : (
        <table className="asset-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Cost</th>
              <th>Book Value</th>
              <th>{currentYear} Depr.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((item) => {
              const currentEntry = item.schedule.find((s) => s.year === currentYear);
              const bookValue = currentEntry?.ending_book_value ?? item.asset.cost;
              return (
                <tr
                  key={item.asset.id}
                  onClick={() => { setSelectedAsset(item); setView("asset-detail"); }}
                >
                  <td>{item.asset.name}</td>
                  <td>{item.category_name || "-"}</td>
                  <td>{formatCurrency(item.asset.cost)}</td>
                  <td>{formatCurrency(bookValue)}</td>
                  <td>{formatCurrency(currentEntry?.depreciation_expense || 0)}</td>
                  <td>
                    {item.asset.disposed_date ? (
                      <span className="tag disposed">Disposed</span>
                    ) : (
                      <span className="tag active">Active</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderAssetDetail = () => {
    if (!selectedAsset) return null;
    const { asset, schedule, category_name } = selectedAsset;

    return (
      <div className="view-content">
        <div className="view-header">
          <div className="breadcrumb">
            <button className="link-btn" onClick={() => navigateTo("assets")}>Assets</button>
            <span>/</span>
            <span>{asset.name}</span>
          </div>
          <button onClick={() => { setEditingAsset(asset); setView("asset-form"); }}>Edit</button>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <label>Category</label>
            <span>{category_name || "None"}</span>
          </div>
          <div className="detail-item">
            <label>Date Placed in Service</label>
            <span>{asset.date_placed_in_service}</span>
          </div>
          <div className="detail-item">
            <label>Cost</label>
            <span>{formatCurrency(asset.cost)}</span>
          </div>
          <div className="detail-item">
            <label>Salvage Value</label>
            <span>{formatCurrency(asset.salvage_value)}</span>
          </div>
          <div className="detail-item">
            <label>Useful Life</label>
            <span>{asset.useful_life_years} years</span>
          </div>
          <div className="detail-item">
            <label>Property Class</label>
            <span>{asset.property_class || "-"}</span>
          </div>
          {asset.description && (
            <div className="detail-item full">
              <label>Description</label>
              <span>{asset.description}</span>
            </div>
          )}
          {asset.notes && (
            <div className="detail-item full">
              <label>Notes</label>
              <span>{asset.notes}</span>
            </div>
          )}
          {asset.disposed_date && (
            <>
              <div className="detail-item">
                <label>Disposed Date</label>
                <span>{asset.disposed_date}</span>
              </div>
              <div className="detail-item">
                <label>Disposed Value</label>
                <span>{asset.disposed_value ? formatCurrency(asset.disposed_value) : "-"}</span>
              </div>
            </>
          )}
        </div>

        <h3>Depreciation Schedule</h3>
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Beginning Value</th>
              <th>Depreciation</th>
              <th>Accumulated</th>
              <th>Ending Value</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((entry) => (
              <tr key={entry.year} className={entry.year === currentYear ? "current" : ""}>
                <td>{entry.year}</td>
                <td>{formatCurrency(entry.beginning_book_value)}</td>
                <td>{formatCurrency(entry.depreciation_expense)}</td>
                <td>{formatCurrency(entry.accumulated_depreciation)}</td>
                <td>{formatCurrency(entry.ending_book_value)}</td>
                <td>{entry.year === currentYear && <span className="current-marker">Current</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="action-buttons">
          {!asset.disposed_date && (
            <button className="warning" onClick={() => handleDisposeAsset(asset.id!)}>
              Mark Disposed
            </button>
          )}
          <button className="danger" onClick={() => handleDeleteAsset(asset.id!)}>
            Delete Asset
          </button>
        </div>
      </div>
    );
  };

  const renderAssetForm = () => {
    if (!editingAsset) return null;
    const isEditing = !!editingAsset.id;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSaveAsset(editingAsset);
    };

    const updateField = <K extends keyof Asset>(field: K, value: Asset[K]) => {
      setEditingAsset({ ...editingAsset, [field]: value });
    };

    return (
      <div className="view-content">
        <div className="view-header">
          <div className="breadcrumb">
            <button className="link-btn" onClick={() => navigateTo("assets")}>Assets</button>
            <span>/</span>
            <span>{isEditing ? "Edit Asset" : "New Asset"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Asset Name *</label>
              <input
                type="text"
                value={editingAsset.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={editingAsset.category_id || ""}
                onChange={(e) => updateField("category_id", e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date Placed in Service *</label>
              <input
                type="date"
                value={editingAsset.date_placed_in_service}
                onChange={(e) => updateField("date_placed_in_service", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Property Class</label>
              <select
                value={editingAsset.property_class || ""}
                onChange={(e) => updateField("property_class", e.target.value || undefined)}
              >
                <option value="">Select...</option>
                <option value="3">3-year</option>
                <option value="5">5-year</option>
                <option value="7">7-year</option>
                <option value="10">10-year</option>
                <option value="15">15-year</option>
                <option value="20">20-year</option>
                <option value="27.5">27.5-year</option>
                <option value="39">39-year</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cost *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editingAsset.cost}
                onChange={(e) => updateField("cost", parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="form-group">
              <label>Salvage Value</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editingAsset.salvage_value}
                onChange={(e) => updateField("salvage_value", parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Useful Life (Years) *</label>
              <input
                type="number"
                min="1"
                value={editingAsset.useful_life_years}
                onChange={(e) => updateField("useful_life_years", parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div className="form-group full">
              <label>Description</label>
              <input
                type="text"
                value={editingAsset.description || ""}
                onChange={(e) => updateField("description", e.target.value || undefined)}
              />
            </div>

            <div className="form-group full">
              <label>Notes</label>
              <textarea
                value={editingAsset.notes || ""}
                onChange={(e) => updateField("notes", e.target.value || undefined)}
                rows={3}
              />
            </div>
          </div>

          {editingAsset.cost > 0 && editingAsset.useful_life_years > 0 && (
            <div className="preview-box">
              <strong>Annual Depreciation:</strong>{" "}
              {formatCurrency((editingAsset.cost - editingAsset.salvage_value) / editingAsset.useful_life_years)}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={() => navigateTo("assets")}>Cancel</button>
            <button type="submit" className="primary">
              {isEditing ? "Save Changes" : "Create Asset"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderReports = () => (
    <div className="view-content">
      <div className="view-header">
        <h2>Reports</h2>
        <button className="primary" onClick={handleExportReport}>Export to Excel</button>
      </div>

      <div className="report-cards">
        <div className="report-card" onClick={handleExportReport}>
          <h4>Depreciation Report</h4>
          <p>Full report with asset list, schedules, and annual summaries</p>
        </div>
        <div className="report-card" onClick={handleExportTemplate}>
          <h4>Import Template</h4>
          <p>Download a blank Excel template for importing assets</p>
        </div>
      </div>

      <h3>Annual Summary</h3>
      {annualSummary.length === 0 ? (
        <div className="empty-state">
          <p>No depreciation data yet. Add some assets first.</p>
        </div>
      ) : (
        <table className="summary-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Total Depreciation</th>
              <th>Number of Assets</th>
            </tr>
          </thead>
          <tbody>
            {annualSummary.map((row) => (
              <tr key={row.year} className={row.year === currentYear ? "current" : ""}>
                <td>{row.year}</td>
                <td>{formatCurrency(row.total_depreciation)}</td>
                <td>{row.asset_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const newAsset = (): Asset => ({
    name: "",
    date_placed_in_service: new Date().toISOString().split("T")[0],
    cost: 0,
    salvage_value: 0,
    useful_life_years: 5,
  });

  return (
    <div className="app-layout" onClick={clearMessages}>
      {renderSidebar()}

      <main className="main-content">
        {error && <div className="toast error">{error}</div>}
        {success && <div className="toast success">{success}</div>}

        {view === "dashboard" && renderDashboard()}
        {view === "assets" && renderAssetList()}
        {view === "asset-detail" && renderAssetDetail()}
        {view === "asset-form" && renderAssetForm()}
        {view === "reports" && renderReports()}
      </main>
    </div>
  );
}

export default App;
