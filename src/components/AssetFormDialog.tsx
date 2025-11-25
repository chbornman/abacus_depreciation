import { Calculator, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency } from "@/lib/utils";
import type { Asset, Category } from "@/types";

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  categories: Category[];
  onChange: <K extends keyof Asset>(field: K, value: Asset[K]) => void;
  onSubmit: () => void;
}

const propertyClasses = [
  { value: "3", label: "3-year" },
  { value: "5", label: "5-year" },
  { value: "7", label: "7-year" },
  { value: "10", label: "10-year" },
  { value: "15", label: "15-year" },
  { value: "20", label: "20-year" },
  { value: "27.5", label: "27.5-year" },
  { value: "39", label: "39-year" },
];

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  categories,
  onChange,
  onSubmit,
}: AssetFormDialogProps) {
  if (!asset) return null;

  const isEditing = !!asset.id;
  const annualDepreciation =
    asset.cost > 0 && asset.useful_life_years > 0
      ? (asset.cost - asset.salvage_value) / asset.useful_life_years
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Asset" : "Add Asset"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the asset details below."
              : "Enter the details for your new asset."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Asset Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={asset.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  placeholder="Enter asset name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={asset.category_id?.toString() || "none"}
                  onValueChange={(value) =>
                    onChange("category_id", value === "none" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id!.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  Date Placed in Service <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  id="date"
                  value={asset.date_placed_in_service}
                  onChange={(value) => onChange("date_placed_in_service", value)}
                  placeholder="Select date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_class">Property Class</Label>
                <Select
                  value={asset.property_class || "none"}
                  onValueChange={(value) =>
                    onChange("property_class", value === "none" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {propertyClasses.map((cls) => (
                      <SelectItem key={cls.value} value={cls.value}>
                        {cls.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Financial Info */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cost">
                  Cost <span className="text-destructive">*</span>
                </Label>
                <NumberInput
                  id="cost"
                  step={0.01}
                  min={0}
                  value={asset.cost}
                  onChange={(value) => onChange("cost", value ?? 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salvage">Salvage Value</Label>
                <NumberInput
                  id="salvage"
                  step={0.01}
                  min={0}
                  value={asset.salvage_value}
                  onChange={(value) => onChange("salvage_value", value ?? 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="life">
                  Useful Life (Years) <span className="text-destructive">*</span>
                </Label>
                <NumberInput
                  id="life"
                  step={1}
                  min={1}
                  value={asset.useful_life_years}
                  onChange={(value) => onChange("useful_life_years", value ?? 1)}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={asset.disposed_date ? "disposed" : "active"}
                  onValueChange={(value) => {
                    if (value === "active") {
                      onChange("disposed_date", undefined);
                      onChange("disposed_value", undefined);
                    } else {
                      onChange("disposed_date", new Date().toISOString().split("T")[0]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {asset.disposed_date && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Disposal Information</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="disposed_date">
                        Disposal Date <span className="text-destructive">*</span>
                      </Label>
                      <DatePicker
                        id="disposed_date"
                        value={asset.disposed_date}
                        onChange={(value) => onChange("disposed_date", value)}
                        placeholder="Select date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disposed_value">Sale/Disposal Value</Label>
                      <NumberInput
                        id="disposed_value"
                        step={0.01}
                        min={0}
                        allowEmpty
                        value={asset.disposed_value ?? ""}
                        onChange={(value) => onChange("disposed_value", value)}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank if scrapped with no value
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description & Notes */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={asset.description || ""}
                  onChange={(e) => onChange("description", e.target.value || undefined)}
                  placeholder="Brief description of the asset"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={asset.notes || ""}
                  onChange={(e) => onChange("notes", e.target.value || undefined)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Depreciation Preview */}
            {annualDepreciation > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Calculator className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Annual Depreciation (Straight-Line)
                    </div>
                    <div className="text-xl font-bold text-primary">
                      {formatCurrency(annualDepreciation)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!asset.name.trim()}>
              {isEditing ? "Save Changes" : "Add Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
