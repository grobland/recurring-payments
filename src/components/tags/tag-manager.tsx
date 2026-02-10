"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from "@/lib/hooks/use-tags";
import { TagForm } from "./tag-form";
import { TagDeleteDialog } from "./tag-delete-dialog";
import type { Tag } from "@/lib/db/schema";
import type { CreateTagInput } from "@/lib/validations/tag";
import { toast } from "sonner";

export function TagManager() {
  const { data: tagsData, isLoading } = useTags();
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  const tags = tagsData?.tags ?? [];

  const handleCreate = async (data: CreateTagInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success(`Tag "${data.name}" created`);
      setCreateDialogOpen(false);
    } catch (error) {
      // Error toast is handled by the mutation's onError
    }
  };

  const handleEdit = async (data: CreateTagInput) => {
    if (!selectedTag) return;
    try {
      await updateMutation.mutateAsync({ id: selectedTag.id, data });
      toast.success(`Tag "${data.name}" updated`);
      setEditDialogOpen(false);
      setSelectedTag(null);
    } catch (error) {
      // Error toast is handled by the mutation's onError
    }
  };

  const handleDelete = async () => {
    if (!selectedTag) return;
    try {
      await deleteMutation.mutateAsync(selectedTag.id);
      toast.success(`Tag "${selectedTag.name}" deleted`);
      setDeleteDialogOpen(false);
      setSelectedTag(null);
    } catch (error) {
      // Error toast is handled by the mutation's onError
    }
  };

  const openEditDialog = (tag: Tag) => {
    setSelectedTag(tag);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (tag: Tag) => {
    setSelectedTag(tag);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading tags...</p>
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
              <CardTitle>Tags</CardTitle>
              <CardDescription>
                Create custom tags to organize transactions
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tags yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium">{tag.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(tag)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(tag)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
            <DialogDescription>
              Create a new tag to organize your transactions.
            </DialogDescription>
          </DialogHeader>
          <TagForm
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
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update the tag details.
            </DialogDescription>
          </DialogHeader>
          {selectedTag && (
            <TagForm
              defaultValues={{
                name: selectedTag.name,
                color: selectedTag.color,
              }}
              onSubmit={handleEdit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedTag(null);
              }}
              isSubmitting={updateMutation.isPending}
              submitLabel="Update"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <TagDeleteDialog
        tag={selectedTag}
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedTag(null);
        }}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
