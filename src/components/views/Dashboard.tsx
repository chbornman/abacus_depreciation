import { TrendingUp, DollarSign, Calculator, Briefcase, ChevronRight, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardStats, AssetWithSchedule, AnnualSummary } from "@/types";

interface DashboardProps {
  stats: DashboardStats | null;
  assets: AssetWithSchedule[];
  annualSummary: AnnualSummary[];
  currentYear: number;
  onViewAsset: (asset: AssetWithSchedule) => void;
  onViewAllAssets: () => void;
}

export function Dashboard({
  stats,
  assets,
  annualSummary,
  currentYear,
  onViewAsset,
  onViewAllAssets,
}: DashboardProps) {
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

      {/* Recent Assets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Assets</h2>
          <Button variant="ghost" size="sm" onClick={onViewAllAssets}>
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
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

      {/* Annual Summary */}
      {annualSummary.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Annual Depreciation Summary</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Total Depreciation</TableHead>
                    <TableHead>Assets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {annualSummary.slice(0, 5).map((row) => (
                    <TableRow
                      key={row.year}
                      className={
                        row.year === currentYear
                          ? "bg-primary/5"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {row.year}
                        {row.year === currentYear && (
                          <Badge variant="default" className="ml-2">
                            Current
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(row.total_depreciation)}</TableCell>
                      <TableCell>{row.asset_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
