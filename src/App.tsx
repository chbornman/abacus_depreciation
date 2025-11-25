import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

import { Sidebar } from "@/components/Sidebar";
import { Toast } from "@/components/ui/toast";
import {
  Dashboard,
  AssetList,
  AssetDetail,
  AssetForm,
  Reports,
  Settings,
} from "@/components/views";
import { ScrollArea } from "@/components/ui/scroll-area";

import type {
  Asset,
  AssetWithSchedule,
  Category,
  DashboardStats,
  ImportResult,
  AnnualSummary,
} from "@/types";

import "@/index.css";

type View = "dashboard" | "assets" | "asset-detail" | "asset-form" | "reports" | "settings";

const STORAGE_KEY_SCALE = "abacus-ui-scale";
const MIN_SCALE = 0.75;
const MAX_SCALE = 2;
const SCALE_INCREMENT = 0.1;

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

  // UI Scale state - load from localStorage
  const [scale, setScale] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SCALE);
    return saved ? parseFloat(saved) : 1;
  });

  const currentYear = new Date().getFullYear();

  // Persist scale to localStorage and apply to document root
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCALE, scale.toString());
    // Apply zoom to the root element for proper scaling
    document.documentElement.style.setProperty('--app-scale', scale.toString());
  }, [scale]);

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

  const handleDisposeAsset = async (disposedDate: string, disposedValue: number | null) => {
    if (!selectedAsset) return;

    try {
      await invoke("dispose_asset", {
        id: selectedAsset.asset.id,
        disposedDate,
        disposedValue,
      });
      setSuccess("Asset marked as disposed");
      await loadData();
      const updated = await invoke<AssetWithSchedule>("get_asset", {
        id: selectedAsset.asset.id,
      });
      setSelectedAsset(updated);
    } catch (e) {
      setError(String(e));
    }
  };

  const navigateTo = useCallback((newView: View) => {
    setView(newView);
    if (newView !== "asset-detail") setSelectedAsset(null);
    if (newView !== "asset-form") setEditingAsset(null);
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
    setView("asset-form");
  }, []);

  const handleViewAsset = useCallback((asset: AssetWithSchedule) => {
    setSelectedAsset(asset);
    setView("asset-detail");
  }, []);

  const handleEditAsset = useCallback(() => {
    if (selectedAsset) {
      setEditingAsset(selectedAsset.asset);
      setView("asset-form");
    }
  }, [selectedAsset]);

  const updateAssetField = <K extends keyof Asset>(field: K, value: Asset[K]) => {
    if (editingAsset) {
      setEditingAsset({ ...editingAsset, [field]: value });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAsset) {
      handleSaveAsset(editingAsset);
    }
  };

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
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
            onViewAllAssets={() => navigateTo("assets")}
          />
        );
      case "assets":
        return (
          <AssetList
            assets={assets}
            currentYear={currentYear}
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
            onDispose={handleDisposeAsset}
            onBack={() => navigateTo("assets")}
          />
        ) : null;
      case "asset-form":
        return editingAsset ? (
          <AssetForm
            asset={editingAsset}
            categories={categories}
            isEditing={!!editingAsset.id}
            onChange={updateAssetField}
            onSubmit={handleFormSubmit}
            onCancel={() => navigateTo("assets")}
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
      case "settings":
        return <Settings scale={scale} onScaleChange={handleScaleChange} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="app-container flex h-screen w-screen overflow-hidden bg-[hsl(var(--background))]"
      style={{ zoom: scale }}
    >
      <Sidebar
        currentView={view}
        onNavigate={navigateTo}
        onImport={handleImport}
        onExportTemplate={handleExportTemplate}
        onAddAsset={handleAddAsset}
      />

      <main className="flex-1 min-w-0 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="p-6 lg:p-8">{renderView()}</div>
        </ScrollArea>
      </main>

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
