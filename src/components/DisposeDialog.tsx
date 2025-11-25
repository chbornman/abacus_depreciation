import { useState, useEffect } from "react";
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
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { validateDispose } from "@/lib/validation";

interface DisposeDialogProps {
  open: boolean;
  assetName: string;
  datePlacedInService: string;
  onClose: () => void;
  onConfirm: (disposedDate: string, disposedValue: number | null) => void;
}

export function DisposeDialog({
  open,
  assetName,
  datePlacedInService,
  onClose,
  onConfirm,
}: DisposeDialogProps) {
  const [disposedDate, setDisposedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [disposedValue, setDisposedValue] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Clear errors when dialog opens/closes
  useEffect(() => {
    if (open) {
      setErrors({});
    }
  }, [open]);

  const handleConfirm = () => {
    const result = validateDispose(disposedDate, disposedValue, datePlacedInService);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onConfirm(disposedDate, disposedValue ?? null);
    // Reset form
    setDisposedDate(new Date().toISOString().split("T")[0]);
    setDisposedValue(undefined);
  };

  const handleClose = () => {
    // Reset form
    setDisposedDate(new Date().toISOString().split("T")[0]);
    setDisposedValue(undefined);
    setErrors({});
    onClose();
  };

  const handleDateChange = (value: string) => {
    if (errors.disposed_date) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.disposed_date;
        return next;
      });
    }
    setDisposedDate(value);
  };

  const handleValueChange = (value: number | undefined) => {
    if (errors.disposed_value) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.disposed_value;
        return next;
      });
    }
    setDisposedValue(value);
  };

  const inputErrorClass = (field: string) =>
    errors[field] ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
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
            <Label htmlFor="dispose-date">
              Disposal Date <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id="dispose-date"
              value={disposedDate}
              onChange={handleDateChange}
              placeholder="Select disposal date"
              className={inputErrorClass("disposed_date")}
            />
            <FieldError error={errors.disposed_date} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispose-value">
              Sale/Disposal Value{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <NumberInput
              id="dispose-value"
              step={0.01}
              min={0}
              allowEmpty
              placeholder="Enter amount or leave blank"
              value={disposedValue ?? ""}
              onChange={handleValueChange}
              className={inputErrorClass("disposed_value")}
            />
            <FieldError error={errors.disposed_value} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Mark as Disposed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
