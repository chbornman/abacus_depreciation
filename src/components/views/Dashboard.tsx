import { useState, useMemo } from "react";
import { TrendingUp, DollarSign, Calculator, Briefcase, ChevronRight, Package, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CategoryPieChart,
  DepreciationBarChart,
  BookValueAreaChart,
  type TimeRange,
} from "@/components/charts/DashboardCharts";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardStats, AssetWithSchedule, AnnualSummary } from "@/types";

interface DashboardProps {
  stats: DashboardStats | null;
  assets: AssetWithSchedule[];
  annualSummary: AnnualSummary[];
  currentYear: number;
  onViewAsset: (asset: AssetWithSchedule) => void;
  onViewAllAssets: () => void;
  onFilterByCategory: (categoryName: string) => void;
}

export function Dashboard({
  stats,
  assets,
  annualSummary,
  currentYear,
  onViewAsset,
  onViewAllAssets,
  onFilterByCategory,
}: DashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("next5");

  // Compute actual year range for display
  const yearRangeInfo = useMemo(() => {
    if (annualSummary.length === 0) return null;

    const allYears = annualSummary.map(s => s.year).sort((a, b) => a - b);
    const minYear = allYears[0];
    const maxYear = allYears[allYears.length - 1];

    let startYear: number;
    let endYear: number;

    switch (timeRange) {
      case "1y":
        startYear = currentYear;
        endYear = currentYear;
        break;
      case "next5":
        startYear = currentYear;
        endYear = currentYear + 4;
        break;
      case "next10":
        startYear = currentYear;
        endYear = currentYear + 9;
        break;
      default: // "all"
        startYear = minYear;
        endYear = maxYear;
    }

    // Clamp to available data
    startYear = Math.max(startYear, minYear);
    endYear = Math.min(endYear, maxYear);

    const filteredCount = annualSummary.filter(
      s => s.year >= startYear && s.year <= endYear
    ).length;

    return {
      startYear,
      endYear,
      totalYears: allYears.length,
      filteredYears: filteredCount,
      label: startYear === endYear
        ? `${startYear}`
        : `${startYear} – ${endYear}`,
    };
  }, [annualSummary, timeRange, currentYear]);

  const statCards = stats
    ? [
        {
          title: "Total Assets",
          value: formatNumber(stats.total_assets),
          icon: Briefcase,
        },
        {
          title: `${currentYear} Depreciation`,
          value: formatCurrency(stats.current_year_depreciation),
          icon: TrendingUp,
        },
        {
          title: "Total Book Value",
          value: formatCurrency(stats.total_book_value),
          icon: Calculator,
        },
        {
          title: "Total Cost",
          value: formatCurrency(stats.total_cost),
          icon: DollarSign,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your fixed assets and depreciation
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Portfolio Composition - Always shows all assets */}
      {assets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Portfolio Composition</h2>
              <p className="text-sm text-muted-foreground">
                All {assets.length} assets by category • Click to filter
              </p>
            </div>
          </div>
          <CategoryPieChart assets={assets} onCategoryClick={onFilterByCategory} />
        </div>
      )}

      {/* Depreciation Trends - Time filtered */}
      {annualSummary.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Depreciation Trends</h2>
              <p className="text-sm text-muted-foreground">
                Track depreciation expenses and book value over time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Full Schedule</SelectItem>
                  <SelectItem value="next10">Next 10 Years</SelectItem>
                  <SelectItem value="next5">Next 5 Years</SelectItem>
                  <SelectItem value="1y">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Range Indicator */}
          {yearRangeInfo && timeRange !== "all" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-2 w-fit">
              <Calendar className="h-4 w-4" />
              <span>
                Showing <span className="font-medium text-foreground">{yearRangeInfo.label}</span>
                {yearRangeInfo.filteredYears !== yearRangeInfo.totalYears && (
                  <span> ({yearRangeInfo.filteredYears} of {yearRangeInfo.totalYears} years)</span>
                )}
              </span>
            </div>
          )}

          <div className="grid gap-4 grid-cols-1">
            <DepreciationBarChart
              annualSummary={annualSummary}
              currentYear={currentYear}
              timeRange={timeRange}
            />
            <BookValueAreaChart
              assets={assets}
              currentYear={currentYear}
              timeRange={timeRange}
            />
          </div>
        </div>
      )}

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
            <Button variant="ghost" size="sm" onClick={onViewAllAssets}>
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
