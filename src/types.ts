export interface Category {
  id?: number;
  name: string;
  default_useful_life?: number;
  default_property_class?: string;
}

export interface CategoryWithCount {
  id: number;
  name: string;
  default_useful_life?: number;
  default_property_class?: string;
  asset_count: number;
}

export interface Asset {
  id?: number;
  name: string;
  description?: string;
  category_id?: number;
  date_placed_in_service: string;
  cost: number;
  salvage_value: number;
  useful_life_years: number;
  property_class?: string;
  notes?: string;
  disposed_date?: string;
  disposed_value?: number;
}

export interface DepreciationEntry {
  id?: number;
  asset_id: number;
  year: number;
  beginning_book_value: number;
  depreciation_expense: number;
  accumulated_depreciation: number;
  ending_book_value: number;
}

export interface AssetWithSchedule {
  asset: Asset;
  schedule: DepreciationEntry[];
  category_name?: string;
}

export interface DashboardStats {
  total_assets: number;
  total_cost: number;
  total_book_value: number;
  current_year_depreciation: number;
}

export interface AnnualSummary {
  year: number;
  total_depreciation: number;
  asset_count: number;
}

export interface ImportResult {
  imported: number;
  errors: string[];
}

export interface AssetFilters {
  search: string;
  category: string | null;
  status: "all" | "active" | "disposed";
}

export const defaultAssetFilters: AssetFilters = {
  search: "",
  category: null,
  status: "all",
};
