import { Plus, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";
import type { AssetWithSchedule } from "@/types";

interface AssetListProps {
  assets: AssetWithSchedule[];
  currentYear: number;
  onViewAsset: (asset: AssetWithSchedule) => void;
  onAddAsset: () => void;
}

export function AssetList({
  assets,
  currentYear,
  onViewAsset,
  onAddAsset,
}: AssetListProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Manage your fixed assets and view depreciation details
          </p>
        </div>
        <Button onClick={onAddAsset} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Asset Table */}
      {assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-[hsl(var(--muted-foreground))]/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No assets yet</h3>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-6">
              Get started by adding your first asset or importing from Excel.
            </p>
            <Button onClick={onAddAsset} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                {assets.map((item) => {
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
                          <span className="text-[hsl(var(--muted-foreground))]">—</span>
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
