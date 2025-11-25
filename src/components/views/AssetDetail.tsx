import { ChevronRight, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AssetWithSchedule } from "@/types";

interface AssetDetailProps {
  asset: AssetWithSchedule;
  currentYear: number;
  onEdit: () => void;
  onDelete: () => void;
  onDispose: () => void;
  onBack: () => void;
}

export function AssetDetail({
  asset,
  currentYear,
  onEdit,
  onDelete,
  onDispose,
  onBack,
}: AssetDetailProps) {
  const { asset: assetData, schedule, category_name } = asset;

  const detailItems = [
    { label: "Category", value: category_name || "None" },
    { label: "Date Placed in Service", value: formatDate(assetData.date_placed_in_service) },
    { label: "Cost", value: formatCurrency(assetData.cost) },
    { label: "Salvage Value", value: formatCurrency(assetData.salvage_value) },
    { label: "Useful Life", value: `${assetData.useful_life_years} years` },
    { label: "Property Class", value: assetData.property_class || "—" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={onBack}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Assets
          </button>
          <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <span className="font-medium">{assetData.name}</span>
          {assetData.disposed_date && (
            <Badge variant="destructive" className="ml-2">Disposed</Badge>
          )}
        </div>
        <Button variant="outline" onClick={onEdit} className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Asset Details Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {detailItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  {item.label}
                </div>
                <div className="font-medium">{item.value}</div>
              </div>
            ))}
          </div>

          {(assetData.description || assetData.notes) && (
            <>
              <Separator className="my-6" />
              <div className="grid gap-4 md:grid-cols-2">
                {assetData.description && (
                  <div className="space-y-1">
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      Description
                    </div>
                    <div>{assetData.description}</div>
                  </div>
                )}
                {assetData.notes && (
                  <div className="space-y-1">
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      Notes
                    </div>
                    <div>{assetData.notes}</div>
                  </div>
                )}
              </div>
            </>
          )}

          {assetData.disposed_date && (
            <>
              <Separator className="my-6" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    Disposed Date
                  </div>
                  <div className="font-medium">{formatDate(assetData.disposed_date)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    Disposed Value
                  </div>
                  <div className="font-medium">
                    {assetData.disposed_value
                      ? formatCurrency(assetData.disposed_value)
                      : "—"}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Depreciation Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Depreciation Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Beginning Value</TableHead>
                <TableHead className="text-right">Depreciation</TableHead>
                <TableHead className="text-right">Accumulated</TableHead>
                <TableHead className="text-right">Ending Value</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((entry) => (
                <TableRow
                  key={entry.year}
                  className={
                    entry.year === currentYear ? "bg-[hsl(var(--primary))]/5" : ""
                  }
                >
                  <TableCell className="font-medium">{entry.year}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(entry.beginning_book_value)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(entry.depreciation_expense)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(entry.accumulated_depreciation)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(entry.ending_book_value)}
                  </TableCell>
                  <TableCell>
                    {entry.year === currentYear && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="flex items-center justify-end gap-3 pt-6">
          {!assetData.disposed_date && (
            <Button variant="outline" onClick={onDispose} className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Mark Disposed
            </Button>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Asset</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{assetData.name}"? This action cannot be
                  undone and will remove all associated depreciation records.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive" onClick={onDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
