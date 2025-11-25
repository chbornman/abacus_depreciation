import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

import { Sidebar } from "@/components/Sidebar";
import { Toast } from "@/components/ui/toast";
import { AssetFormDialog } from "@/components/AssetFormDialog";
import {
  Dashboard,
  AssetList,
  AssetDetail,
  Analysis,
  Reports,
  Manual,
  Settings,
} from "@/components/views";

import type {
  Asset,
  AssetWithSchedule,
  Category,
  DashboardStats,
  ImportResult,
  AnnualSummary,
  AssetFilters,
} from "@/types";
import { defaultAssetFilters } from "@/types";

import "@/index.css";

type View = "dashboard" | "assets" | "asset-detail" | "analysis" | "reports" | "manual" | "settings";

const STORAGE_KEY_SCALE = "abacus-ui-scale";
const STORAGE_KEY_THEME = "abacus-theme";
const MIN_SCALE = 0.75;
const MAX_SCALE = 2;
const SCALE_INCREMENT = 0.1;

type Theme = "light" | "dark" | "system";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assets, setAssets] = useState<AssetWithSchedule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [annualSummary, setAnnualSummary] = useState<AnnualSummary[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithSchedule | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assetFilters, setAssetFilters] = useState<AssetFilters>(defaultAssetFilters);

  // UI Scale state - load from localStorage
  const [scale, setScale] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SCALE);
    return saved ? parseFloat(saved) : 1;
  });

  // Theme state - load from localStorage
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return (saved as Theme) || "system";
  });

  const currentYear = new Date().getFullYear();

  // Persist scale to localStorage and apply to document root
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCALE, scale.toString());
    // Apply zoom to the root element for proper scaling
    document.documentElement.style.setProperty('--app-scale', scale.toString());
  }, [scale]);

  // Apply theme to document and persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setScale((prev) => Math.min(MAX_SCALE, Math.round((prev + SCALE_INCREMENT) * 100) / 100));
        } else if (e.key === "-") {
          e.preventDefault();
          setScale((prev) => Math.max(MIN_SCALE, Math.round((prev - SCALE_INCREMENT) * 100) / 100));
        } else if (e.key === "0") {
          e.preventDefault();
          setScale(1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handleSaveAsset = async () => {
    if (!editingAsset) return;
    try {
      if (editingAsset.id) {
        await invoke("update_asset", { asset: editingAsset });
        setSuccess("Asset updated successfully");
        // Refresh the selected asset if we're on the detail view
        if (selectedAsset && selectedAsset.asset.id === editingAsset.id) {
          const updated = await invoke<AssetWithSchedule>("get_asset", {
            id: editingAsset.id,
          });
          setSelectedAsset(updated);
        }
      } else {
        await invoke("create_asset", { asset: editingAsset });
        setSuccess("Asset created successfully");
      }
      await loadData();
      setAssetFormOpen(false);
      setEditingAsset(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    try {
      await invoke("delete_asset", { id: selectedAsset.asset.id });
      setSuccess("Asset deleted");
      await loadData();
      setView("assets");
      setSelectedAsset(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const navigateTo = useCallback((newView: View) => {
    setView(newView);
    if (newView !== "asset-detail") setSelectedAsset(null);
  }, []);

  const newAsset = (): Asset => ({
    name: "",
    date_placed_in_service: new Date().toISOString().split("T")[0],
    cost: 0,
    salvage_value: 0,
    useful_life_years: 5,
  });

  const handleAddAsset = useCallback(() => {
    setEditingAsset(newAsset());
    setAssetFormOpen(true);
  }, []);

  const handleViewAsset = useCallback((asset: AssetWithSchedule) => {
    setSelectedAsset(asset);
    setView("asset-detail");
  }, []);

  const handleEditAsset = useCallback(() => {
    if (selectedAsset) {
      setEditingAsset(selectedAsset.asset);
      setAssetFormOpen(true);
    }
  }, [selectedAsset]);

  const updateAssetField = <K extends keyof Asset>(field: K, value: Asset[K]) => {
    if (editingAsset) {
      setEditingAsset({ ...editingAsset, [field]: value });
    }
  };

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  const handleFilterByCategory = useCallback((categoryName: string) => {
    setAssetFilters({ ...defaultAssetFilters, category: categoryName });
    setView("assets");
  }, []);

  const handleResetFilters = useCallback(() => {
    setAssetFilters(defaultAssetFilters);
  }, []);

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return (
          <Dashboard
            stats={stats}
            assets={assets}
            annualSummary={annualSummary}
            currentYear={currentYear}
            onViewAsset={handleViewAsset}
            onNavigate={navigateTo}
          />
        );
      case "analysis":
        return (
          <Analysis
            assets={assets}
            annualSummary={annualSummary}
            currentYear={currentYear}
            onFilterByCategory={handleFilterByCategory}
          />
        );
      case "assets":
        return (
          <AssetList
            assets={assets}
            currentYear={currentYear}
            filters={assetFilters}
            onFiltersChange={setAssetFilters}
            onResetFilters={handleResetFilters}
            onViewAsset={handleViewAsset}
            onAddAsset={handleAddAsset}
          />
        );
      case "asset-detail":
        return selectedAsset ? (
          <AssetDetail
            asset={selectedAsset}
            currentYear={currentYear}
            onEdit={handleEditAsset}
            onDelete={handleDeleteAsset}
            onBack={() => navigateTo("assets")}
          />
        ) : null;
      case "reports":
        return (
          <Reports
            annualSummary={annualSummary}
            currentYear={currentYear}
            onExportReport={handleExportReport}
            onExportTemplate={handleExportTemplate}
          />
        );
      case "manual":
        return <Manual />;
      case "settings":
        return (
          <Settings
            scale={scale}
            onScaleChange={handleScaleChange}
            theme={theme}
            onThemeChange={handleThemeChange}
            onCategoriesChange={loadData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="app-container flex h-screen w-screen overflow-hidden bg-background"
      style={{ zoom: scale }}
    >
      <Sidebar
        currentView={view}
        onNavigate={navigateTo}
        onImport={handleImport}
        onExportTemplate={handleExportTemplate}
        onAddAsset={handleAddAsset}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      <main className={`flex-1 min-w-0 overflow-x-hidden ${view === "analysis" ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`max-w-full ${view === "analysis" ? "p-4 h-full" : "p-6 lg:p-8"}`}>{renderView()}</div>
      </main>

      {/* Asset Form Dialog */}
      <AssetFormDialog
        open={assetFormOpen}
        onOpenChange={(open) => {
          setAssetFormOpen(open);
          if (!open) setEditingAsset(null);
        }}
        asset={editingAsset}
        categories={categories}
        onChange={updateAssetField}
        onSubmit={handleSaveAsset}
      />

      {/* Toast Notifications */}
      {error && (
        <Toast message={error} type="error" onClose={() => setError(null)} />
      )}
      {success && (
        <Toast message={success} type="success" onClose={() => setSuccess(null)} />
      )}
    </div>
  );
}

export default App;
