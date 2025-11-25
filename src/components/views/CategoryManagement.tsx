import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Pencil, Trash2, Tag, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { CategoryWithCount, Category } from "@/types";

const propertyClasses = [
  { value: "3-year", label: "3-year" },
  { value: "5-year", label: "5-year" },
  { value: "7-year", label: "7-year" },
  { value: "10-year", label: "10-year" },
  { value: "15-year", label: "15-year" },
  { value: "20-year", label: "20-year" },
  { value: "27.5-year", label: "27.5-year" },
  { value: "39-year", label: "39-year" },
];

interface CategoryManagementProps {
  onCategoriesChange?: () => void;
}

export function CategoryManagement({ onCategoriesChange }: CategoryManagementProps) {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    default_useful_life: number | undefined;
    default_property_class: string;
  }>({
    name: "",
    default_useful_life: undefined,
    default_property_class: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await invoke<CategoryWithCount[]>("get_categories_with_counts");
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      default_useful_life: undefined,
      default_property_class: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      default_useful_life: category.default_useful_life,
      default_property_class: category.default_property_class ?? "",
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (category: CategoryWithCount) => {
    setCategoryToDelete(category);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const category: Category = {
        id: editingCategory?.id,
        name: formData.name.trim(),
        default_useful_life: formData.default_useful_life,
        default_property_class: formData.default_property_class.trim() || undefined,
      };

      if (editingCategory) {
        await invoke("update_category", { category });
      } else {
        await invoke("create_category", { category });
      }

      setDialogOpen(false);
      await loadCategories();
      onCategoriesChange?.();
    } catch (err) {
      setError(err as string);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await invoke("delete_category", { id: categoryToDelete.id });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      await loadCategories();
      onCategoriesChange?.();
    } catch (err) {
      setDeleteError(err as string);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Manage asset categories</CardDescription>
            </div>
          </div>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading categories...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Error loading categories: {error}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No categories yet. Click "Add Category" to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.default_useful_life && (
                        <span>{category.default_useful_life} years</span>
                      )}
                      {category.default_useful_life && category.default_property_class && (
                        <span className="mx-1">·</span>
                      )}
                      {category.default_property_class && (
                        <span>{category.default_property_class}</span>
                      )}
                      {!category.default_useful_life && !category.default_property_class && (
                        <span className="italic">No defaults set</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={category.asset_count > 0 ? "secondary" : "outline"}>
                    {category.asset_count} asset{category.asset_count !== 1 ? "s" : ""}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(category)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Update the category details below."
                  : "Create a new category for organizing your assets."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Office Equipment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="useful_life">Default Useful Life (Years)</Label>
                <NumberInput
                  id="useful_life"
                  step={1}
                  min={1}
                  allowEmpty
                  value={formData.default_useful_life ?? ""}
                  onChange={(value) => setFormData({ ...formData, default_useful_life: value })}
                  placeholder="e.g., 5"
                />
                <p className="text-xs text-muted-foreground">
                  Suggested useful life for assets in this category
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="property_class">Default Property Class</Label>
                <Select
                  value={formData.default_property_class || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, default_property_class: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {propertyClasses.map((cls) => (
                      <SelectItem key={cls.value} value={cls.value}>
                        {cls.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  IRS property classification for depreciation
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.name.trim() || saving}>
                {saving ? "Saving..." : editingCategory ? "Save Changes" : "Add Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Category</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{categoryToDelete?.name}"?
              </DialogDescription>
            </DialogHeader>
            {deleteError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            {categoryToDelete && categoryToDelete.asset_count > 0 && !deleteError && (
              <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-amber-600 dark:text-amber-500">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  This category has {categoryToDelete.asset_count} asset{categoryToDelete.asset_count !== 1 ? "s" : ""}.
                  You must reassign them to a different category before deleting.
                </span>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || (categoryToDelete?.asset_count ?? 0) > 0}
              >
                {deleting ? "Deleting..." : "Delete Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
