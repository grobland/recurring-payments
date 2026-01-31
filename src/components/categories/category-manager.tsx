"use client";

import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/lib/hooks/use-categories";
import { useSubscriptions } from "@/lib/hooks/use-subscriptions";
import { CategoryForm } from "./category-form";
import { CategoryDeleteDialog } from "./category-delete-dialog";
import type { Category } from "@/lib/db/schema";
import type { CreateCategoryInput } from "@/lib/validations/category";
import { toast } from "sonner";

export function CategoryManager() {
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: subscriptionsData } = useSubscriptions({ status: "all" });
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const categories = categoriesData?.categories ?? [];
  const defaultCategories = categories.filter((c) => c.userId === null);
  const customCategories = categories.filter((c) => c.userId !== null);

  // Count subscriptions affected by category deletion
  const getAffectedCount = (categoryId: string) => {
    return subscriptionsData?.subscriptions.filter((s) => s.categoryId === categoryId).length ?? 0;
  };

  // Get icon component from name
  const getIconComponent = (iconName: string) => {
    const pascalName = iconName
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    return (LucideIcons as any)[pascalName];
  };

  const handleCreate = async (data: CreateCategoryInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success(`Category "${data.name}" created`);
      setCreateDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create category");
    }
  };

  const handleEdit = async (data: CreateCategoryInput) => {
    if (!selectedCategory) return;
    try {
      await updateMutation.mutateAsync({ id: selectedCategory.id, data });
      toast.success(`Category "${data.name}" updated`);
      setEditDialogOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update category");
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      await deleteMutation.mutateAsync(selectedCategory.id);
      toast.success(`Category "${selectedCategory.name}" deleted`);
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    }
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  if (categoriesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Organize your subscriptions with custom categories
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Custom Categories */}
          {customCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Custom Categories</h3>
              <div className="space-y-2">
                {customCategories.map((category) => {
                  const Icon = getIconComponent(category.icon);
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: category.color }}
                        >
                          {Icon && <Icon className="h-5 w-5 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getAffectedCount(category.id)} subscription
                            {getAffectedCount(category.id) === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Default Categories */}
          <div>
            <h3 className="text-sm font-medium mb-3">Default Categories</h3>
            <div className="space-y-2">
              {defaultCategories.map((category) => {
                const Icon = getIconComponent(category.icon);
                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: category.color }}
                      >
                        {Icon && <Icon className="h-5 w-5 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getAffectedCount(category.id)} subscription
                          {getAffectedCount(category.id) === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Default</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your subscriptions.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            onSubmit={handleCreate}
            onCancel={() => setCreateDialogOpen(false)}
            isSubmitting={createMutation.isPending}
            submitLabel="Create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <CategoryForm
              defaultValues={{
                name: selectedCategory.name,
                icon: selectedCategory.icon,
                color: selectedCategory.color,
              }}
              onSubmit={handleEdit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedCategory(null);
              }}
              isSubmitting={updateMutation.isPending}
              submitLabel="Update"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <CategoryDeleteDialog
        category={selectedCategory}
        affectedCount={selectedCategory ? getAffectedCount(selectedCategory.id) : 0}
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
