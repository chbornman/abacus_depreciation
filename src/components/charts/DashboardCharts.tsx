import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { AssetWithSchedule, AnnualSummary } from "@/types";

export type TimeRange = "all" | "5y" | "3y" | "1y";

interface TimeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <SelectTrigger className="w-[140px] h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Time</SelectItem>
        <SelectItem value="5y">Last 5 Years</SelectItem>
        <SelectItem value="3y">Last 3 Years</SelectItem>
        <SelectItem value="1y">This Year</SelectItem>
      </SelectContent>
    </Select>
  );
}

function getYearRange(timeRange: TimeRange, currentYear: number): { startYear: number; endYear: number } {
  const endYear = currentYear + 10; // Include future projections
  switch (timeRange) {
    case "1y":
      return { startYear: currentYear, endYear: currentYear };
    case "3y":
      return { startYear: currentYear - 2, endYear };
    case "5y":
      return { startYear: currentYear - 4, endYear };
    default:
      return { startYear: 0, endYear };
  }
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface CategoryData {
  name: string;
  value: number;
  count: number;
  [key: string]: string | number;
}

interface BookValueData {
  year: number;
  bookValue: number;
  accumulatedDepreciation: number;
}

interface CategoryPieChartProps {
  assets: AssetWithSchedule[];
  onCategoryClick?: (categoryName: string) => void;
}

export function CategoryPieChart({ assets, onCategoryClick }: CategoryPieChartProps) {
  const categoryData = useMemo(() => {
    const categories: Record<string, CategoryData> = {};

    assets.forEach((item) => {
      const categoryName = item.category_name || "Uncategorized";
      if (!categories[categoryName]) {
        categories[categoryName] = { name: categoryName, value: 0, count: 0 };
      }
      categories[categoryName].value += item.asset.cost;
      categories[categoryName].count += 1;
    });

    return Object.values(categories).sort((a, b) => b.value - a.value);
  }, [assets]);

  if (categoryData.length === 0) {
    return null;
  }

  const totalValue = categoryData.reduce((sum, cat) => sum + cat.value, 0);

  const handleCategoryClick = (categoryName: string) => {
    if (onCategoryClick) {
      onCategoryClick(categoryName);
    }
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.count} asset{data.count !== 1 ? "s" : ""}
          </p>
          {onCategoryClick && (
            <p className="text-xs text-primary mt-1">Click to filter</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Assets by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Custom Legend List */}
          <div className="flex-1 space-y-3 min-w-0 pt-2">
            {categoryData.map((cat, index) => {
              const percentage = ((cat.value / totalValue) * 100).toFixed(1);
              return (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  className="flex items-center gap-3 text-sm w-full text-left rounded-md p-1.5 -m-1.5 transition-colors hover:bg-muted/50"
                >
                  <div
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="truncate flex-1 text-foreground font-medium">{cat.name}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">{percentage}%</span>
                </button>
              );
            })}
          </div>
          {/* Pie Chart - Larger */}
          <div className="h-[220px] w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  style={{ cursor: onCategoryClick ? "pointer" : "default" }}
                  onClick={(data) => handleCategoryClick(data.name)}
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      className="stroke-background transition-opacity hover:opacity-80"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DepreciationBarChartProps {
  annualSummary: AnnualSummary[];
  currentYear: number;
  timeRange?: TimeRange;
}

export function DepreciationBarChart({ annualSummary, currentYear, timeRange = "all" }: DepreciationBarChartProps) {
  const chartData = useMemo(() => {
    const { startYear, endYear } = getYearRange(timeRange, currentYear);
    return [...annualSummary]
      .filter((s) => s.year >= startYear && s.year <= endYear)
      .sort((a, b) => a.year - b.year)
      .slice(-10);
  }, [annualSummary, timeRange, currentYear]);

  if (chartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Annual Depreciation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className="text-xs fill-muted-foreground"
                width={50}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
              <Bar
                dataKey="total_depreciation"
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--chart-1))"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.year}`}
                    fill={entry.year === currentYear ? "hsl(var(--primary))" : "hsl(var(--chart-1))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface BookValueAreaChartProps {
  assets: AssetWithSchedule[];
  currentYear: number;
  timeRange?: TimeRange;
}

export function BookValueAreaChart({ assets, currentYear, timeRange = "all" }: BookValueAreaChartProps) {
  const chartData = useMemo(() => {
    const { startYear, endYear } = getYearRange(timeRange, currentYear);
    const yearlyData: Record<number, BookValueData> = {};

    assets.forEach((item) => {
      item.schedule.forEach((entry) => {
        if (entry.year < startYear || entry.year > endYear) return;
        if (!yearlyData[entry.year]) {
          yearlyData[entry.year] = {
            year: entry.year,
            bookValue: 0,
            accumulatedDepreciation: 0,
          };
        }
        yearlyData[entry.year].bookValue += entry.ending_book_value;
        yearlyData[entry.year].accumulatedDepreciation += entry.accumulated_depreciation;
      });
    });

    return Object.values(yearlyData)
      .sort((a, b) => a.year - b.year)
      .slice(-10);
  }, [assets, timeRange, currentYear]);

  if (chartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name === "bookValue" ? "Book Value" : "Accum. Depr."}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base font-medium">Book Value Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bookValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="accumDeprGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className="text-xs fill-muted-foreground"
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-foreground">
                    {value === "bookValue" ? "Book Value" : "Accum. Depreciation"}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="bookValue"
                stroke="hsl(var(--chart-2))"
                fill="url(#bookValueGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="accumulatedDepreciation"
                stroke="hsl(var(--chart-4))"
                fill="url(#accumDeprGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
