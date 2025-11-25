import { describe, test, expect } from "bun:test";
import {
  AssetSchema,
  CategorySchema,
  DisposeSchema,
  validateAsset,
  validateCategory,
  validateDispose,
} from "./validation";
import type { Asset, Category } from "@/types";

// Helper to create a valid asset for testing
function validAsset(): Asset {
  return {
    name: "Test Asset",
    description: "A test asset",
    category_id: 1,
    date_placed_in_service: "2024-01-15",
    cost: 1000,
    salvage_value: 100,
    useful_life_years: 5,
    property_class: "5",
    notes: "Some notes",
  };
}

// Helper to create a valid category for testing
function validCategory(): Category {
  return {
    name: "Equipment",
    default_useful_life: 5,
    default_property_class: "5",
  };
}

// Helper to get tomorrow's date in YYYY-MM-DD format
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// ==================== AssetSchema Tests ====================

describe("AssetSchema", () => {
  describe("name", () => {
    test("rejects empty name", () => {
      const asset = { ...validAsset(), name: "" };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(true);
      }
    });

    test("rejects whitespace-only name", () => {
      const asset = { ...validAsset(), name: "   " };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("rejects name over 200 chars", () => {
      const asset = { ...validAsset(), name: "a".repeat(201) };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("200"))).toBe(true);
      }
    });

    test("accepts name exactly 200 chars", () => {
      const asset = { ...validAsset(), name: "a".repeat(200) };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("trims whitespace from valid name", () => {
      const asset = { ...validAsset(), name: "  Test Asset  " };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test Asset");
      }
    });
  });

  describe("date_placed_in_service", () => {
    test("rejects empty date", () => {
      const asset = { ...validAsset(), date_placed_in_service: "" };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("rejects invalid format (MM-DD-YYYY)", () => {
      const asset = { ...validAsset(), date_placed_in_service: "01-15-2024" };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("rejects invalid format (slashes)", () => {
      const asset = { ...validAsset(), date_placed_in_service: "2024/01/15" };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("rejects future date", () => {
      const asset = { ...validAsset(), date_placed_in_service: getTomorrowDate() };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("future"))).toBe(true);
      }
    });

    test("accepts valid past date", () => {
      const asset = { ...validAsset(), date_placed_in_service: "2024-01-15" };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("accepts today's date", () => {
      const asset = { ...validAsset(), date_placed_in_service: getTodayDate() };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("cost", () => {
    test("rejects zero cost", () => {
      const asset = { ...validAsset(), cost: 0, salvage_value: 0 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("cost"))).toBe(true);
      }
    });

    test("rejects negative cost", () => {
      const asset = { ...validAsset(), cost: -500, salvage_value: 0 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("accepts positive cost", () => {
      const asset = { ...validAsset(), cost: 0.01, salvage_value: 0 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("salvage_value", () => {
    test("rejects negative value", () => {
      const asset = { ...validAsset(), salvage_value: -100 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("negative"))).toBe(true);
      }
    });

    test("rejects value exceeding cost", () => {
      const asset = { ...validAsset(), cost: 1000, salvage_value: 2000 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("exceed"))).toBe(true);
      }
    });

    test("accepts value less than cost", () => {
      const asset = { ...validAsset(), cost: 1000, salvage_value: 500 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("accepts value equal to cost", () => {
      const asset = { ...validAsset(), cost: 1000, salvage_value: 1000 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("accepts zero salvage value", () => {
      const asset = { ...validAsset(), salvage_value: 0 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("useful_life_years", () => {
    test("rejects zero", () => {
      const asset = { ...validAsset(), useful_life_years: 0 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("rejects negative", () => {
      const asset = { ...validAsset(), useful_life_years: -5 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("rejects non-integer", () => {
      const asset = { ...validAsset(), useful_life_years: 5.5 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("whole number"))).toBe(true);
      }
    });

    test("accepts positive integer", () => {
      const asset = { ...validAsset(), useful_life_years: 1 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("property_class", () => {
    const validClasses = ["3", "5", "7", "10", "15", "20", "27.5", "39"];

    test.each(validClasses)("accepts valid class: %s", (cls) => {
      const asset = { ...validAsset(), property_class: cls };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("rejects invalid class", () => {
      const asset = { ...validAsset(), property_class: "6" };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("rejects text property class", () => {
      const asset = { ...validAsset(), property_class: "invalid" };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("accepts null property_class", () => {
      const asset = { ...validAsset(), property_class: null };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("accepts undefined property_class", () => {
      const asset = { ...validAsset() };
      delete (asset as Partial<Asset>).property_class;
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("description", () => {
    test("rejects over 500 chars", () => {
      const asset = { ...validAsset(), description: "a".repeat(501) };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("500"))).toBe(true);
      }
    });

    test("accepts exactly 500 chars", () => {
      const asset = { ...validAsset(), description: "a".repeat(500) };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("accepts null description", () => {
      const asset = { ...validAsset(), description: null };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("notes", () => {
    test("rejects over 2000 chars", () => {
      const asset = { ...validAsset(), notes: "a".repeat(2001) };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("2000"))).toBe(true);
      }
    });

    test("accepts exactly 2000 chars", () => {
      const asset = { ...validAsset(), notes: "a".repeat(2000) };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("accepts null notes", () => {
      const asset = { ...validAsset(), notes: null };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("disposal fields", () => {
    test("rejects invalid disposed_date format", () => {
      const asset = { ...validAsset(), disposed_date: "invalid" };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
    });

    test("rejects future disposed_date", () => {
      const asset = { ...validAsset(), disposed_date: getTomorrowDate() };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("future"))).toBe(true);
      }
    });

    test("rejects negative disposed_value", () => {
      const asset = { ...validAsset(), disposed_date: "2024-06-01", disposed_value: -100 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("negative"))).toBe(true);
      }
    });

    test("accepts zero disposed_value", () => {
      const asset = { ...validAsset(), disposed_date: "2024-06-01", disposed_value: 0 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    test("accepts null disposed_date", () => {
      const asset = { ...validAsset(), disposed_date: null };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("cross-field validation", () => {
    test("salvage cannot exceed cost", () => {
      const asset = { ...validAsset(), cost: 1000, salvage_value: 2000 };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.path.includes("salvage_value") && i.message.includes("exceed")
          )
        ).toBe(true);
      }
    });

    test("disposal date must be on or after service date", () => {
      const asset = {
        ...validAsset(),
        date_placed_in_service: "2024-06-01",
        disposed_date: "2024-01-01",
      };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("after"))).toBe(true);
      }
    });

    test("disposal date same as service date is valid", () => {
      const asset = {
        ...validAsset(),
        date_placed_in_service: "2024-01-15",
        disposed_date: "2024-01-15",
      };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });

  describe("valid asset", () => {
    test("accepts fully valid asset", () => {
      const result = AssetSchema.safeParse(validAsset());
      expect(result.success).toBe(true);
    });

    test("accepts minimal valid asset", () => {
      const asset = {
        name: "Minimal",
        date_placed_in_service: "2024-01-01",
        cost: 100,
        salvage_value: 0,
        useful_life_years: 1,
      };
      const result = AssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });
  });
});

// ==================== CategorySchema Tests ====================

describe("CategorySchema", () => {
  test("accepts valid category", () => {
    const result = CategorySchema.safeParse(validCategory());
    expect(result.success).toBe(true);
  });

  test("accepts minimal category (name only)", () => {
    const category = { name: "Basic" };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(true);
  });

  test("rejects empty name", () => {
    const category = { ...validCategory(), name: "" };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(false);
  });

  test("rejects whitespace-only name", () => {
    const category = { ...validCategory(), name: "   " };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(false);
  });

  test("rejects name over 100 chars", () => {
    const category = { ...validCategory(), name: "a".repeat(101) };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("100"))).toBe(true);
    }
  });

  test("accepts name exactly 100 chars", () => {
    const category = { ...validCategory(), name: "a".repeat(100) };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(true);
  });

  test("rejects zero default_useful_life", () => {
    const category = { ...validCategory(), default_useful_life: 0 };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(false);
  });

  test("rejects negative default_useful_life", () => {
    const category = { ...validCategory(), default_useful_life: -5 };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(false);
  });

  test("rejects non-integer default_useful_life", () => {
    const category = { ...validCategory(), default_useful_life: 5.5 };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(false);
  });

  test("accepts valid default_useful_life", () => {
    const category = { ...validCategory(), default_useful_life: 1 };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(true);
  });

  test("accepts null default_useful_life", () => {
    const category = { ...validCategory(), default_useful_life: null };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(true);
  });

  test("rejects invalid property_class", () => {
    const category = { ...validCategory(), default_property_class: "invalid" };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(false);
  });

  const validClasses = ["3", "5", "7", "10", "15", "20", "27.5", "39"];
  test.each(validClasses)("accepts valid property class: %s", (cls) => {
    const category = { ...validCategory(), default_property_class: cls };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(true);
  });

  test("accepts null default_property_class", () => {
    const category = { ...validCategory(), default_property_class: null };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(true);
  });

  test("trims whitespace from name", () => {
    const category = { ...validCategory(), name: "  Equipment  " };
    const result = CategorySchema.safeParse(category);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Equipment");
    }
  });
});

// ==================== DisposeSchema Tests ====================

describe("DisposeSchema", () => {
  test("accepts valid disposal", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: "2024-06-15",
      disposed_value: 500,
      date_placed_in_service: "2024-01-15",
    });
    expect(result.success).toBe(true);
  });

  test("accepts disposal without value", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: "2024-06-15",
      disposed_value: null,
      date_placed_in_service: "2024-01-15",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty date", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: "",
      disposed_value: 500,
      date_placed_in_service: "2024-01-15",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid date format", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: "06-15-2024",
      disposed_value: 500,
      date_placed_in_service: "2024-01-15",
    });
    expect(result.success).toBe(false);
  });

  test("rejects future date", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: getTomorrowDate(),
      disposed_value: 500,
      date_placed_in_service: "2024-01-15",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("future"))).toBe(true);
    }
  });

  test("rejects date before service date", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: "2024-01-01",
      disposed_value: 500,
      date_placed_in_service: "2024-06-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("after"))).toBe(true);
    }
  });

  test("accepts date same as service date", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: "2024-01-15",
      disposed_value: 500,
      date_placed_in_service: "2024-01-15",
    });
    expect(result.success).toBe(true);
  });

  test("rejects negative value", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: "2024-06-15",
      disposed_value: -100,
      date_placed_in_service: "2024-01-15",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("negative"))).toBe(true);
    }
  });

  test("accepts zero value", () => {
    const result = DisposeSchema.safeParse({
      disposed_date: "2024-06-15",
      disposed_value: 0,
      date_placed_in_service: "2024-01-15",
    });
    expect(result.success).toBe(true);
  });
});

// ==================== Helper Function Tests ====================

describe("validateAsset", () => {
  test("returns success with valid data", () => {
    const result = validateAsset(validAsset());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test Asset");
    }
  });

  test("returns field-specific errors", () => {
    const asset = {
      ...validAsset(),
      name: "",
      cost: 0,
      useful_life_years: 0,
    };
    const result = validateAsset(asset);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveProperty("name");
      expect(result.errors).toHaveProperty("cost");
      expect(result.errors).toHaveProperty("useful_life_years");
    }
  });

  test("returns cross-field validation errors", () => {
    const asset = { ...validAsset(), cost: 1000, salvage_value: 2000 };
    const result = validateAsset(asset);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveProperty("salvage_value");
    }
  });
});

describe("validateCategory", () => {
  test("returns success with valid data", () => {
    const result = validateCategory(validCategory());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Equipment");
    }
  });

  test("returns field-specific errors", () => {
    const category = { ...validCategory(), name: "", default_useful_life: 0 };
    const result = validateCategory(category);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveProperty("name");
      expect(result.errors).toHaveProperty("default_useful_life");
    }
  });
});

describe("validateDispose", () => {
  test("returns success with valid data", () => {
    const result = validateDispose("2024-06-15", 500, "2024-01-15");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.disposed_date).toBe("2024-06-15");
      expect(result.data.disposed_value).toBe(500);
    }
  });

  test("returns field-specific errors", () => {
    const result = validateDispose("invalid", -100, "2024-01-15");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveProperty("disposed_date");
      expect(result.errors).toHaveProperty("disposed_value");
    }
  });

  test("returns cross-field validation error for date before service", () => {
    const result = validateDispose("2024-01-01", 500, "2024-06-01");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveProperty("disposed_date");
    }
  });
});
