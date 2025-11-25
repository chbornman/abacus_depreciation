import { LayoutDashboard, Package, FileText, Upload, Download, Plus, Settings, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type View = "dashboard" | "assets" | "asset-detail" | "asset-form" | "reports" | "settings";
type Theme = "light" | "dark" | "system";

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onImport: () => void;
  onExportTemplate: () => void;
  onAddAsset: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  onImport,
  onExportTemplate,
  onAddAsset,
  theme,
  onThemeChange,
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
      <div className="shrink-0 flex items-center justify-center gap-4 px-6 py-8">
        <img src="/logo-white-minimal.svg" alt="Abacus" className="h-12 w-12" />
        <span className="text-3xl font-bold tracking-wider">ABACUS</span>
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
      <div className="shrink-0 space-y-2 px-3 pb-3">
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

      {/* Theme Toggle */}
      <div className="shrink-0 px-3 pb-2">
        <Separator className="bg-[hsl(var(--sidebar-accent))] mb-3" />
        <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--sidebar-accent))]/30 p-1">
          <button
            onClick={() => onThemeChange("light")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              theme === "light"
                ? "bg-[hsl(var(--sidebar-accent))] text-white"
                : "text-[hsl(var(--sidebar-muted))] hover:text-white"
            )}
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onThemeChange("system")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              theme === "system"
                ? "bg-[hsl(var(--sidebar-accent))] text-white"
                : "text-[hsl(var(--sidebar-muted))] hover:text-white"
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onThemeChange("dark")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              theme === "dark"
                ? "bg-[hsl(var(--sidebar-accent))] text-white"
                : "text-[hsl(var(--sidebar-muted))] hover:text-white"
            )}
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Add Asset Button */}
      <div className="shrink-0 p-3">
        <Button onClick={onAddAsset} className="w-full gap-2" size="lg">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>
    </aside>
  );
}
