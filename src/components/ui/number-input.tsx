import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: number | string;
  onChange: (value: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  prefix?: string;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      onChange,
      step = 1,
      min,
      max,
      allowEmpty = false,
      prefix,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current!);

    const numericValue = typeof value === "string" ? parseFloat(value) || 0 : value;

    const increment = () => {
      if (disabled) return;
      let newValue = numericValue + step;
      if (max !== undefined && newValue > max) newValue = max;
      // Round to handle floating point precision
      newValue = Math.round(newValue * 1000000) / 1000000;
      onChange(newValue);
    };

    const decrement = () => {
      if (disabled) return;
      let newValue = numericValue - step;
      if (min !== undefined && newValue < min) newValue = min;
      // Round to handle floating point precision
      newValue = Math.round(newValue * 1000000) / 1000000;
      onChange(newValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      if (inputValue === "" && allowEmpty) {
        onChange(undefined);
        return;
      }
      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) {
        let newValue = parsed;
        if (min !== undefined && newValue < min) newValue = min;
        if (max !== undefined && newValue > max) newValue = max;
        onChange(newValue);
      } else if (inputValue === "" || inputValue === "-") {
        // Allow typing negative numbers or clearing
        onChange(0);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        increment();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        decrement();
      }
    };

    const canDecrement = min === undefined || numericValue > min;
    const canIncrement = max === undefined || numericValue < max;

    return (
      <div
        className={cn(
          "flex h-10 w-full items-center rounded-lg border border-input bg-background ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || !canDecrement}
          className="flex h-full items-center justify-center px-3 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          tabIndex={-1}
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center">
          {prefix && (
            <span className="text-sm text-muted-foreground select-none">
              {prefix}
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={value === undefined ? "" : value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              "flex-1 bg-transparent px-1 py-2 text-center text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
            {...props}
          />
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={disabled || !canIncrement}
          className="flex h-full items-center justify-center px-3 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          tabIndex={-1}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
