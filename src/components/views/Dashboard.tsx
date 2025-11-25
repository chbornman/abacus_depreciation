import { Package, BarChart3, FileText, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardStats, AssetWithSchedule, AnnualSummary } from "@/types";

type View = "assets" | "analysis" | "reports";

interface DashboardProps {
  stats: DashboardStats | null;
  assets: AssetWithSchedule[];
  annualSummary: AnnualSummary[];
  currentYear: number;
  onViewAsset: (asset: AssetWithSchedule) => void;
  onNavigate: (view: View) => void;
}

export function Dashboard({
  stats,
  assets,
  annualSummary,
  currentYear,
  onViewAsset,
  onNavigate,
}: DashboardProps) {
  const navCards = [
    {
      id: "assets" as View,
      title: "Assets",
      icon: Package,
      value: stats ? formatNumber(stats.total_assets) : "0",
      subtitle: "Total assets",
      valueClass: "",
    },
    {
      id: "analysis" as View,
      title: "Analysis",
      icon: BarChart3,
      value: stats ? formatCurrency(stats.current_year_depreciation) : "$0",
      subtitle: `${currentYear} depreciation`,
      valueClass: "",
    },
    {
      id: "reports" as View,
      title: "Reports",
      icon: FileText,
      value: stats ? formatCurrency(stats.total_book_value) : "$0",
      subtitle: "Book value",
      valueClass: "text-success",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your fixed assets and depreciation
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="text-left"
            >
              <Card className="h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="rounded-xl bg-primary/10 p-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold">{card.title}</h3>
                  </div>
                  <div className={`text-4xl font-bold mb-2 ${card.valueClass}`}>{card.value}</div>
                  <p className="text-muted-foreground">{card.subtitle}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Recent Assets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recent Assets</h2>
            <p className="text-sm text-muted-foreground">
              Recently added or modified assets
            </p>
          </div>
          {assets.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate("assets")}>
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {assets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                No assets yet. Import from Excel or add one manually.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {assets.slice(0, 5).map((item) => {
                  const currentDepr =
                    item.schedule.find((s) => s.year === currentYear)?.depreciation_expense || 0;
                  return (
                    <button
                      key={item.asset.id}
                      onClick={() => onViewAsset(item)}
                      className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50 text-left"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{item.asset.name}</div>
                        <div className="flex items-center gap-2">
                          {item.category_name && (
                            <Badge variant="secondary">{item.category_name}</Badge>
                          )}
                          {item.asset.disposed_date && (
                            <Badge variant="destructive">Disposed</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">{formatCurrency(item.asset.cost)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(currentDepr)}/yr
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
