"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Info, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { getErrorMessage } from "@/lib/utils/errors";

// ============ Types ============

type MerchantAlias = {
  id: string;
  merchantEntityId: string;
  userId: string;
  aliasText: string;
  isUserDefined: boolean;
  createdAt: string;
};

type MerchantEntity = {
  id: string;
  userId: string;
  name: string;
  normalizedName: string;
  category: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  aliases: MerchantAlias[];
};

// ============ API Helpers ============

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

const merchantQueryKey = ["recurring", "merchants"] as const;

// ============ Add Form ============

interface AddMerchantFormProps {
  onAdd: (name: string, aliasText: string) => void;
  isAdding: boolean;
}

function AddMerchantForm({ onAdd, isAdding }: AddMerchantFormProps) {
  const [name, setName] = useState("");
  const [aliasText, setAliasText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !aliasText.trim()) return;
    onAdd(name.trim(), aliasText.trim());
    setName("");
    setAliasText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium">Merchant Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Netflix"
          disabled={isAdding}
        />
      </div>
      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium">Alias Text</label>
        <Input
          value={aliasText}
          onChange={(e) => setAliasText(e.target.value)}
          placeholder="e.g. NETFLIX.COM or NETFLIX*SUB"
          disabled={isAdding}
        />
      </div>
      <Button
        type="submit"
        disabled={isAdding || !name.trim() || !aliasText.trim()}
        className="shrink-0"
      >
        {isAdding ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Add
      </Button>
    </form>
  );
}

// ============ Edit Dialog ============

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  merchant: MerchantEntity;
  onSave: (name: string) => void;
  isSaving: boolean;
}

function EditDialog({ open, onClose, merchant, onSave, isSaving }: EditDialogProps) {
  const [name, setName] = useState(merchant.name);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Merchant Name</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Merchant Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Merchant name"
              disabled={isSaving}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Aliases associated with this merchant will not change.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Component ============

export function MerchantAliasManager() {
  const queryClient = useQueryClient();
  const [editingMerchant, setEditingMerchant] = useState<MerchantEntity | null>(null);

  // Query
  const { data: response, isLoading, error } = useQuery({
    queryKey: merchantQueryKey,
    queryFn: () => apiFetch<{ data: MerchantEntity[] }>("/api/recurring/merchants"),
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: ({ name, aliasText }: { name: string; aliasText: string }) =>
      apiFetch("/api/recurring/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, aliasText }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantQueryKey });
      toast.success("Merchant alias added");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiFetch(`/api/recurring/merchants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantQueryKey });
      toast.success("Merchant name updated");
      setEditingMerchant(null);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/recurring/merchants/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantQueryKey });
      toast.success("Merchant deleted");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const merchants = response?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load merchant aliases. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info note */}
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Aliases help the system match statement descriptions to known merchants. Add common variations of a merchant&apos;s name as they appear on your bank statements.
        </p>
      </div>

      {/* Add form */}
      <AddMerchantForm
        onAdd={(name, aliasText) => addMutation.mutate({ name, aliasText })}
        isAdding={addMutation.isPending}
      />

      {/* Table */}
      {merchants.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No merchant aliases yet"
          description="Add aliases to improve matching accuracy. Enter a merchant name and the text that appears on your bank statements."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant Name</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell className="font-medium">{merchant.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {merchant.aliases.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No aliases</span>
                      ) : (
                        merchant.aliases.map((alias) => (
                          <Badge
                            key={alias.id}
                            variant="secondary"
                            className="text-xs font-mono"
                          >
                            {alias.aliasText}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingMerchant(merchant)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit {merchant.name}</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete {merchant.name}</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete merchant?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete &quot;{merchant.name}&quot; and all {merchant.aliases.length} associated alias(es). This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(merchant.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit dialog */}
      {editingMerchant && (
        <EditDialog
          open={!!editingMerchant}
          onClose={() => setEditingMerchant(null)}
          merchant={editingMerchant}
          onSave={(name) => editMutation.mutate({ id: editingMerchant.id, name })}
          isSaving={editMutation.isPending}
        />
      )}
    </div>
  );
}
