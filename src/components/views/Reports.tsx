import { Download, FileDown, BarChart3 } from "lucide-react";
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
import type { AnnualSummary } from "@/types";

interface ReportsProps {
  annualSummary: AnnualSummary[];
  currentYear: number;
  onExportReport: () => void;
  onExportTemplate: () => void;
}

export function Reports({
  annualSummary,
  currentYear,
  onExportReport,
  onExportTemplate,
}: ReportsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Generate and export depreciation reports
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={onExportTemplate} className="gap-2">
            <FileDown className="h-4 w-4" />
            Import Template
          </Button>
          <Button onClick={onExportReport} className="gap-2">
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Annual Summary */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          <h2 className="text-xl font-semibold">Annual Summary</h2>
        </div>

        {annualSummary.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-[hsl(var(--muted-foreground))]/50 mb-4" />
              <p className="text-[hsl(var(--muted-foreground))] text-center">
                No depreciation data yet. Add some assets first.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Total Depreciation</TableHead>
                    <TableHead className="text-right">Number of Assets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {annualSummary.map((row) => (
                    <TableRow
                      key={row.year}
                      className={
                        row.year === currentYear ? "bg-[hsl(var(--primary))]/5" : ""
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
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.total_depreciation)}
                      </TableCell>
                      <TableCell className="text-right">{row.asset_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
