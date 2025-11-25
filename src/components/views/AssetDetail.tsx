import { useState } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AssetWithSchedule } from "@/types";

interface AssetDetailProps {
  asset: AssetWithSchedule;
  currentYear: number;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function AssetDetail({
  asset,
  currentYear,
  onEdit,
  onDelete,
  onBack,
}: AssetDetailProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { asset: assetData, schedule, category_name } = asset;

  const detailItems = [
    { label: "Category", value: category_name || "None" },
    { label: "Date Placed in Service", value: formatDate(assetData.date_placed_in_service) },
    { label: "Cost", value: formatCurrency(assetData.cost) },
    { label: "Salvage Value", value: formatCurrency(assetData.salvage_value) },
    { label: "Useful Life", value: `${assetData.useful_life_years} years` },
    { label: "Property Class", value: assetData.property_class || "—" },
  ];

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <button
            onClick={onBack}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors shrink-0"
          >
            Assets
          </button>
          <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
          <span className="font-medium truncate">{assetData.name}</span>
          {assetData.disposed_date && (
            <Badge variant="destructive" className="ml-2 shrink-0">Disposed</Badge>
          )}
        </div>

        {/* All Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button variant="outline" onClick={onEdit} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
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
              {(() => {
                // Calculate book value at disposal and gain/loss
                const disposalYear = new Date(assetData.disposed_date).getFullYear();
                const scheduleAtDisposal = schedule.find(s => s.year === disposalYear);
                const lastScheduleEntry = schedule[schedule.length - 1];

                // Use the beginning book value of disposal year (value before that year's depreciation)
                // or ending value of last schedule year if disposed after schedule ends
                const bookValueAtDisposal = scheduleAtDisposal
                  ? scheduleAtDisposal.beginning_book_value
                  : lastScheduleEntry?.ending_book_value ?? assetData.salvage_value;

                const disposedValue = assetData.disposed_value ?? 0;
                const gainLoss = disposedValue - bookValueAtDisposal;
                const hasGainLoss = assetData.disposed_value != null;

                return (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        Disposed Date
                      </div>
                      <div className="font-medium">{formatDate(assetData.disposed_date)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        Book Value at Disposal
                      </div>
                      <div className="font-medium font-mono">
                        {formatCurrency(bookValueAtDisposal)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        Sale Price
                      </div>
                      <div className="font-medium font-mono">
                        {assetData.disposed_value != null
                          ? formatCurrency(assetData.disposed_value)
                          : "—"}
                      </div>
                    </div>
                    {hasGainLoss && (
                      <div className="space-y-1">
                        <div className="text-sm text-[hsl(var(--muted-foreground))]">
                          {gainLoss >= 0 ? "Gain on Sale" : "Loss on Sale"}
                        </div>
                        <div className={`font-medium font-mono ${
                          gainLoss >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {gainLoss >= 0 ? "+" : ""}{formatCurrency(gainLoss)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--destructive))]/10">
                <Trash2 className="h-5 w-5 text-[hsl(var(--destructive))]" />
              </div>
              <div>
                <DialogTitle>Delete Asset</DialogTitle>
                <DialogDescription>
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Are you sure you want to delete "{assetData.name}"? This will permanently
            remove the asset and all associated depreciation records.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
