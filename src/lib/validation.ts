import { z } from "zod";
import type { Asset, Category } from "@/types";

// Valid property classes
const PROPERTY_CLASSES = ["3", "5", "7", "10", "15", "20", "27.5", "39"] as const;

// Date format regex (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Helper to check if a date string is valid and not in the future
function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isNotFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  return date <= today;
}

// Asset validation schema
export const AssetSchema = z
  .object({
    id: z.number().optional(),
    name: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s.length > 0, "Asset name is required")
      .refine((s) => s.length <= 200, "Asset name must be 200 characters or less"),
    description: z
      .string()
      .max(500, "Description must be 500 characters or less")
      .optional()
      .nullable()
      .transform((s) => (s?.trim() || undefined)),
    category_id: z.number().optional().nullable(),
    date_placed_in_service: z
      .string()
      .min(1, "Date placed in service is required")
      .refine(isValidDate, "Invalid date format (use YYYY-MM-DD)")
      .refine(isNotFutureDate, "Date cannot be in the future"),
    cost: z
      .number()
      .gt(0, "Cost must be greater than $0"),
    salvage_value: z
      .number()
      .min(0, "Salvage value cannot be negative"),
    useful_life_years: z
      .number()
      .int("Useful life must be a whole number")
      .min(1, "Useful life must be at least 1 year"),
    property_class: z
      .string()
      .refine((val) => !val || PROPERTY_CLASSES.includes(val as typeof PROPERTY_CLASSES[number]), {
        message: "Invalid property class",
      })
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(2000, "Notes must be 2000 characters or less")
      .optional()
      .nullable()
      .transform((s) => (s?.trim() || undefined)),
    disposed_date: z
      .string()
      .refine((val) => !val || isValidDate(val), "Invalid disposal date format")
      .refine((val) => !val || isNotFutureDate(val), "Disposal date cannot be in the future")
      .optional()
      .nullable(),
    disposed_value: z
      .number()
      .min(0, "Disposal value cannot be negative")
      .optional()
      .nullable(),
  })
  .refine((data) => data.salvage_value <= data.cost, {
    message: "Salvage value cannot exceed cost",
    path: ["salvage_value"],
  })
  .refine(
    (data) => {
      if (!data.disposed_date) return true;
      const serviceDate = new Date(data.date_placed_in_service);
      const disposeDate = new Date(data.disposed_date);
      return disposeDate >= serviceDate;
    },
    {
      message: "Disposal date must be on or after the date placed in service",
      path: ["disposed_date"],
    }
  );

// Category validation schema
export const CategorySchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, "Category name is required")
    .refine((s) => s.length <= 100, "Category name must be 100 characters or less"),
  default_useful_life: z
    .number()
    .int("Default useful life must be a whole number")
    .min(1, "Default useful life must be at least 1 year")
    .optional()
    .nullable(),
  default_property_class: z
    .string()
    .refine((val) => !val || PROPERTY_CLASSES.includes(val as typeof PROPERTY_CLASSES[number]), {
      message: "Invalid property class",
    })
    .optional()
    .nullable(),
});

// Dispose validation schema (for the dispose dialog)
export const DisposeSchema = z.object({
  disposed_date: z
    .string()
    .min(1, "Disposal date is required")
    .refine(isValidDate, "Invalid date format")
    .refine(isNotFutureDate, "Disposal date cannot be in the future"),
  disposed_value: z
    .number()
    .min(0, "Disposal value cannot be negative")
    .optional()
    .nullable(),
  // Service date is passed in for cross-field validation
  date_placed_in_service: z.string(),
}).refine(
  (data) => {
    const serviceDate = new Date(data.date_placed_in_service);
    const disposeDate = new Date(data.disposed_date);
    return disposeDate >= serviceDate;
  },
  {
    message: "Disposal date must be on or after the date placed in service",
    path: ["disposed_date"],
  }
);

// Validation result type
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> };

// Helper to convert Zod errors to a simple field -> message map
function zodErrorsToMap(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

// Validation functions
export function validateAsset(asset: Asset): ValidationResult<Asset> {
  const result = AssetSchema.safeParse(asset);
  if (result.success) {
    return { success: true, data: result.data as Asset };
  }
  return { success: false, errors: zodErrorsToMap(result.error) };
}

export function validateCategory(category: Category): ValidationResult<Category> {
  const result = CategorySchema.safeParse(category);
  if (result.success) {
    return { success: true, data: result.data as Category };
  }
  return { success: false, errors: zodErrorsToMap(result.error) };
}

export function validateDispose(
  disposedDate: string,
  disposedValue: number | undefined | null,
  datePlacedInService: string
): ValidationResult<{ disposed_date: string; disposed_value?: number | null }> {
  const result = DisposeSchema.safeParse({
    disposed_date: disposedDate,
    disposed_value: disposedValue,
    date_placed_in_service: datePlacedInService,
  });
  if (result.success) {
    return {
      success: true,
      data: {
        disposed_date: result.data.disposed_date,
        disposed_value: result.data.disposed_value,
      },
    };
  }
  return { success: false, errors: zodErrorsToMap(result.error) };
}
