import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DisposeDialogProps {
  open: boolean;
  assetName: string;
  onClose: () => void;
  onConfirm: (disposedDate: string, disposedValue: number | null) => void;
}

export function DisposeDialog({
  open,
  assetName,
  onClose,
  onConfirm,
}: DisposeDialogProps) {
  const [disposedDate, setDisposedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [disposedValue, setDisposedValue] = useState("");

  const handleConfirm = () => {
    const value = disposedValue ? parseFloat(disposedValue) : null;
    onConfirm(disposedDate, value);
    // Reset form
    setDisposedDate(new Date().toISOString().split("T")[0]);
    setDisposedValue("");
  };

  const handleClose = () => {
    // Reset form
    setDisposedDate(new Date().toISOString().split("T")[0]);
    setDisposedValue("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--warning))]/10">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
            </div>
            <div>
              <DialogTitle>Mark Asset as Disposed</DialogTitle>
              <DialogDescription>
                Record the disposal of "{assetName}"
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dispose-date">Disposal Date</Label>
            <Input
              id="dispose-date"
              type="date"
              value={disposedDate}
              onChange={(e) => setDisposedDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispose-value">
              Sale/Disposal Value{" "}
              <span className="text-[hsl(var(--muted-foreground))] font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="dispose-value"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter amount or leave blank"
              value={disposedValue}
              onChange={(e) => setDisposedValue(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!disposedDate}>
            Mark as Disposed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
