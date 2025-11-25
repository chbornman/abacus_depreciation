import { useMemo, useRef, useState, useEffect } from "react";
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

export type TimeRange = "all" | "next5" | "next10" | "1y";

// Custom hook to measure container dimensions
function useContainerSize(defaultWidth = 600, defaultHeight = 300) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const measuredRef = useRef(false);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        if (newWidth > 0 && newHeight > 0) {
          setSize({ width: newWidth, height: newHeight });
          measuredRef.current = true;
        }
      }
    };

    // Measure after layout settles
    const timeoutId = setTimeout(measure, 50);

    // Also measure on window resize
    const handleResize = () => {
      if (measuredRef.current) {
        measure();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return { containerRef, ...size };
}

// Legacy alias for backwards compatibility
function useContainerWidth(defaultWidth = 600) {
  const { containerRef, width } = useContainerSize(defaultWidth, 300);
  return { containerRef, width };
}

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
        <SelectItem value="all">Full Schedule</SelectItem>
        <SelectItem value="next10">Next 10 Years</SelectItem>
        <SelectItem value="next5">Next 5 Years</SelectItem>
        <SelectItem value="1y">This Year</SelectItem>
      </SelectContent>
    </Select>
  );
}

function getYearRange(timeRange: TimeRange, currentYear: number): { startYear: number; endYear: number } {
  switch (timeRange) {
    case "1y":
      return { startYear: currentYear, endYear: currentYear };
    case "next5":
      return { startYear: currentYear, endYear: currentYear + 4 };
    case "next10":
      return { startYear: currentYear, endYear: currentYear + 9 };
    default:
      // Full schedule - no bounds
      return { startYear: 0, endYear: 9999 };
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
  compact?: boolean;
}

export function CategoryPieChart({ assets, onCategoryClick, compact }: CategoryPieChartProps) {
  const { containerRef, width: containerWidth, height: containerHeight } = useContainerSize(300, 400);

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
        <div className="rounded-lg border bg-background p-2 shadow-md">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-muted-foreground">
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

  // For compact mode, compute pie size based on available space
  // Reserve space for legend at bottom
  const legendHeight = compact ? Math.min(categoryData.length * 22, 90) : 0;
  const availableHeight = compact ? Math.max(containerHeight - legendHeight - 8, 120) : 280;
  // Use width or height, whichever is smaller to keep it circular
  const pieSize = compact ? Math.min(containerWidth - 16, availableHeight) : 280;
  const innerRadius = pieSize * 0.22;
  const outerRadius = pieSize * 0.42;

  return (
    <Card className={compact ? "h-full flex flex-col overflow-hidden" : ""}>
      <CardHeader className={compact ? "pb-1 pt-2 px-3 shrink-0" : "pb-2"}>
        <CardTitle className="text-sm font-medium">Assets by Category</CardTitle>
        {compact && (
          <p className="text-xs text-muted-foreground">{assets.length} assets</p>
        )}
      </CardHeader>
      <CardContent ref={containerRef} className={compact ? "flex-1 px-3 pb-2 min-h-0 overflow-hidden" : ""}>
        <div className={compact
          ? "h-full flex flex-col items-center"
          : "flex items-center justify-center gap-8 min-h-[320px]"
        }>
          {/* Pie Chart */}
          <div className="flex-1 flex items-center justify-center min-h-0" style={{ maxHeight: availableHeight }}>
            <PieChart width={pieSize} height={pieSize}>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
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
          </div>
          {/* Legend List */}
          <div className={compact ? "w-full space-y-0.5 shrink-0" : "space-y-2.5 min-w-0"}>
            {categoryData.map((cat, index) => {
              const percentage = ((cat.value / totalValue) * 100).toFixed(1);
              return (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  className={compact
                    ? "flex items-center gap-2 text-xs w-full text-left rounded px-1 py-0.5 transition-colors hover:bg-muted/50"
                    : "flex items-center gap-2.5 text-sm w-full text-left rounded-md p-1.5 -m-1.5 transition-colors hover:bg-muted/50"
                  }
                >
                  <div
                    className={compact ? "h-2 w-2 rounded-sm shrink-0" : "h-3 w-3 rounded-sm shrink-0"}
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="truncate text-foreground font-medium flex-1">{cat.name}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">{percentage}%</span>
                </button>
              );
            })}
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
  compact?: boolean;
}

export function DepreciationBarChart({ annualSummary, currentYear, timeRange = "all", compact }: DepreciationBarChartProps) {
  const { containerRef, width, height } = useContainerSize(400, 200);

  const chartData = useMemo(() => {
    const { startYear, endYear } = getYearRange(timeRange, currentYear);
    return [...annualSummary]
      .filter((s) => s.year >= startYear && s.year <= endYear)
      .sort((a, b) => a.year - b.year);
  }, [annualSummary, timeRange, currentYear]);

  if (chartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-md">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // For compact mode, use measured height; otherwise fixed height
  const chartHeight = compact ? Math.max(height - 10, 100) : 250;

  return (
    <Card className={compact ? "h-full flex flex-col overflow-hidden" : ""}>
      <CardHeader className={compact ? "py-2 px-4 shrink-0" : ""}>
        <CardTitle className="text-sm font-medium">Annual Depreciation</CardTitle>
      </CardHeader>
      <CardContent ref={containerRef} className={compact ? "flex-1 px-4 pb-2 min-h-0 overflow-hidden" : ""}>
        <BarChart width={width || 400} height={chartHeight} data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            className="text-xs fill-muted-foreground"
            width={45}
            tick={{ fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
          <Bar
            dataKey="total_depreciation"
            radius={[3, 3, 0, 0]}
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
      </CardContent>
    </Card>
  );
}

interface BookValueAreaChartProps {
  assets: AssetWithSchedule[];
  currentYear: number;
  timeRange?: TimeRange;
  compact?: boolean;
}

export function BookValueAreaChart({ assets, currentYear, timeRange = "all", compact }: BookValueAreaChartProps) {
  const { containerRef, width, height } = useContainerSize(400, 200);

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
      .sort((a, b) => a.year - b.year);
  }, [assets, timeRange, currentYear]);

  if (chartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-md">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-xs" style={{ color: item.color }}>
              {item.name === "bookValue" ? "Book Value" : "Accum. Depr."}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // For compact mode, use measured height; otherwise fixed height
  const chartHeight = compact ? Math.max(height - 10, 100) : 250;

  return (
    <Card className={compact ? "h-full flex flex-col overflow-hidden" : "col-span-full lg:col-span-2"}>
      <CardHeader className={compact ? "py-2 px-4 shrink-0" : ""}>
        <CardTitle className="text-sm font-medium">Book Value Over Time</CardTitle>
      </CardHeader>
      <CardContent ref={containerRef} className={compact ? "flex-1 px-4 pb-2 min-h-0 overflow-hidden" : ""}>
        <AreaChart width={width || 400} height={chartHeight} data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
            tick={{ fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            className="text-xs fill-muted-foreground"
            width={45}
            tick={{ fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value) => (
              <span className="text-xs text-foreground">
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
      </CardContent>
    </Card>
  );
}
