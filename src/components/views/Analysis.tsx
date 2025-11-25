import { useState, useMemo } from "react";
import { Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import type { AssetWithSchedule, AnnualSummary } from "@/types";

interface AnalysisProps {
  assets: AssetWithSchedule[];
  annualSummary: AnnualSummary[];
  currentYear: number;
  onFilterByCategory: (categoryName: string) => void;
}

export function Analysis({
  assets,
  annualSummary,
  currentYear,
  onFilterByCategory,
}: AnalysisProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

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

  const hasData = assets.length > 0 || annualSummary.length > 0;

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Depreciation trends and portfolio composition
        </p>
      </div>

      {!hasData ? (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center h-full">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-medium mb-1">No data to analyze</h3>
            <p className="text-sm text-muted-foreground">
              Add some assets to see charts and analysis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left column - Filters + Pie Chart */}
          <div className="w-96 shrink-0 flex flex-col gap-3">
            {/* Time Range Filter Card */}
            {annualSummary.length > 0 && (
              <Card className="shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {yearRangeInfo && timeRange !== "all" ? (
                        <span className="font-medium">{yearRangeInfo.label}</span>
                      ) : (
                        <span className="text-muted-foreground">All Years</span>
                      )}
                    </div>
                    <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                      <SelectTrigger className="w-[130px] h-8 text-sm">
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
                </CardContent>
              </Card>
            )}

            {/* Pie Chart */}
            {assets.length > 0 && (
              <div className="flex-1 min-h-0">
                <CategoryPieChart
                  assets={assets}
                  onCategoryClick={onFilterByCategory}
                  compact
                />
              </div>
            )}
          </div>

          {/* Right column - Trend Charts */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {annualSummary.length > 0 && (
              <>
                <div className="flex-1 min-h-0">
                  <DepreciationBarChart
                    annualSummary={annualSummary}
                    currentYear={currentYear}
                    timeRange={timeRange}
                    compact
                  />
                </div>
                <div className="flex-1 min-h-0">
                  <BookValueAreaChart
                    assets={assets}
                    currentYear={currentYear}
                    timeRange={timeRange}
                    compact
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
