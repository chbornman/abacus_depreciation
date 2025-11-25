import { LayoutDashboard, Package, FileText, Upload, Download, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type View = "dashboard" | "assets" | "asset-detail" | "asset-form" | "reports" | "settings";

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onImport: () => void;
  onExportTemplate: () => void;
  onAddAsset: () => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  onImport,
  onExportTemplate,
  onAddAsset,
}: SidebarProps) {
  const navItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
    { id: "assets" as View, label: "Assets", icon: Package },
    { id: "reports" as View, label: "Reports", icon: FileText },
    { id: "settings" as View, label: "Settings", icon: Settings },
  ];

  const isViewActive = (itemId: View) => {
    if (itemId === "assets") {
      return ["assets", "asset-detail", "asset-form"].includes(currentView);
    }
    return currentView === itemId;
  };

  return (
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      {/* Logo & Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-14 w-14 items-center justify-center">
          <img src="/logo-white-minimal.svg" alt="Abacus" className="h-14 w-14" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-widest">ABACUS</span>
          <span className="text-xs text-[hsl(var(--sidebar-muted))]">Depreciation Tracker</span>
        </div>
      </div>

      <Separator className="bg-[hsl(var(--sidebar-accent))]" />

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isViewActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[hsl(var(--sidebar-accent))] text-white"
                  : "text-[hsl(var(--sidebar-muted))] hover:bg-[hsl(var(--sidebar-accent))]/50 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="space-y-2 px-3 pb-3">
        <Separator className="bg-[hsl(var(--sidebar-accent))] mb-3" />
        <button
          onClick={onImport}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-[hsl(var(--sidebar-accent))]/50 hover:text-white"
        >
          <Upload className="h-4 w-4" />
          Import Excel
        </button>
        <button
          onClick={onExportTemplate}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-[hsl(var(--sidebar-accent))]/50 hover:text-white"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
      </div>

      {/* Add Asset Button */}
      <div className="p-3">
        <Button onClick={onAddAsset} className="w-full gap-2" size="lg">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>
    </aside>
  );
}
