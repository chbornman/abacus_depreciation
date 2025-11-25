import { useMemo } from "react";
import { Plus, Package, Search, X, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { AssetWithSchedule, AssetFilters } from "@/types";

interface AssetListProps {
  assets: AssetWithSchedule[];
  currentYear: number;
  filters: AssetFilters;
  onFiltersChange: (filters: AssetFilters) => void;
  onResetFilters: () => void;
  onViewAsset: (asset: AssetWithSchedule) => void;
  onAddAsset: () => void;
}

export function AssetList({
  assets,
  currentYear,
  filters,
  onFiltersChange,
  onResetFilters,
  onViewAsset,
  onAddAsset,
}: AssetListProps) {
  // Compute filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const nameMatch = item.asset.name.toLowerCase().includes(search);
        const descMatch = item.asset.description?.toLowerCase().includes(search);
        if (!nameMatch && !descMatch) return false;
      }
      // Category filter
      if (filters.category) {
        const categoryName = item.category_name || "Uncategorized";
        if (categoryName !== filters.category) return false;
      }
      // Status filter
      if (filters.status === "active" && item.asset.disposed_date) return false;
      if (filters.status === "disposed" && !item.asset.disposed_date) return false;
      return true;
    });
  }, [assets, filters]);

  const totalCount = assets.length;
  const filteredCount = filteredAssets.length;
  const hasActiveFilters = !!(filters.search || filters.category || filters.status !== "all");

  // Get unique category names from assets for the dropdown
  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    assets.forEach((item) => {
      names.add(item.category_name || "Uncategorized");
    });
    return Array.from(names).sort();
  }, [assets]);

  const updateFilter = <K extends keyof AssetFilters>(key: K, value: AssetFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof AssetFilters) => {
    if (key === "status") {
      onFiltersChange({ ...filters, status: "all" });
    } else {
      onFiltersChange({ ...filters, [key]: key === "search" ? "" : null });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">
            Manage your fixed assets and view depreciation details
          </p>
        </div>
        <Button onClick={onAddAsset} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Filter Bar */}
      {totalCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Dropdown */}
              <Select
                value={filters.category || "all"}
                onValueChange={(value) => updateFilter("category", value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Toggle */}
              <div className="flex rounded-lg border border-input p-1 gap-1">
                {(["all", "active", "disposed"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateFilter("status", status)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      filters.status === status
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Status Banner - Only shown when filters are active */}
      {hasActiveFilters && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-medium">
                Showing {filteredCount} of {totalCount} assets
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Active filter chips */}
              {filters.search && (
                <Badge variant="secondary" className="gap-1 pl-2">
                  Search: "{filters.search}"
                  <button
                    onClick={() => clearFilter("search")}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.category && (
                <Badge variant="secondary" className="gap-1 pl-2">
                  Category: {filters.category}
                  <button
                    onClick={() => clearFilter("category")}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.status !== "all" && (
                <Badge variant="secondary" className="gap-1 pl-2">
                  Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                  <button
                    onClick={() => clearFilter("status")}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-7">
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {totalCount === 0 ? (
        // No data state - no assets exist at all
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No assets yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Get started by adding your first asset or importing from Excel.
            </p>
            <Button onClick={onAddAsset} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Asset
            </Button>
          </CardContent>
        </Card>
      ) : filteredCount === 0 ? (
        // No matches state - filters resulted in zero assets
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No assets match your filters</h3>
            <p className="text-muted-foreground text-center mb-4">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {filters.search && (
                <Badge variant="secondary">Search: "{filters.search}"</Badge>
              )}
              {filters.category && (
                <Badge variant="secondary">Category: {filters.category}</Badge>
              )}
              {filters.status !== "all" && (
                <Badge variant="secondary">
                  Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                </Badge>
              )}
            </div>
            <Button onClick={onResetFilters} variant="outline">
              Clear All Filters
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              You have {totalCount} total assets
            </p>
          </CardContent>
        </Card>
      ) : (
        // Asset table
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead className="text-right">{currentYear} Depr.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((item) => {
                  const currentEntry = item.schedule.find((s) => s.year === currentYear);
                  const bookValue = currentEntry?.ending_book_value ?? item.asset.cost;
                  return (
                    <TableRow
                      key={item.asset.id}
                      className="cursor-pointer"
                      onClick={() => onViewAsset(item)}
                    >
                      <TableCell className="font-medium">{item.asset.name}</TableCell>
                      <TableCell>
                        {item.category_name ? (
                          <Badge variant="secondary">{item.category_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.asset.cost)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(bookValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(currentEntry?.depreciation_expense || 0)}
                      </TableCell>
                      <TableCell>
                        {item.asset.disposed_date ? (
                          <Badge variant="destructive">Disposed</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
