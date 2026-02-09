"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, FileUp, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

import { SuggestionCard } from "@/components/suggestions/suggestion-card";
import { BulkActionsBar } from "@/components/suggestions/bulk-actions-bar";

import { usePatternSuggestions } from "@/lib/hooks/use-pattern-suggestions";
import { useAcceptPattern } from "@/lib/hooks/use-accept-pattern";
import { useDismissPattern } from "@/lib/hooks/use-dismiss-pattern";
import { useBulkAcceptPatterns, useBulkDismissPatterns } from "@/lib/hooks/use-bulk-patterns";

/**
 * Suggestions page - displays AI-detected subscription patterns.
 * Users can review, accept, or dismiss suggestions individually or in bulk.
 */
export default function SuggestionsPage() {
  // Selection state for multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Queries
  const { data, isLoading, error, refetch, isRefetching } = usePatternSuggestions();
  const suggestions = data?.suggestions ?? [];

  // Mutations - individual actions
  const acceptPattern = useAcceptPattern();
  const dismissPattern = useDismissPattern();

  // Mutations - bulk actions
  const bulkAccept = useBulkAcceptPatterns();
  const bulkDismiss = useBulkDismissPatterns();

  // Clear selection when data changes (prevents stale selections)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [suggestions.length]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === suggestions.length) {
      // All selected - clear all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(suggestions.map((s) => s.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Determine checkbox state
  const allSelected = suggestions.length > 0 && selectedIds.size === suggestions.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < suggestions.length;

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <Sparkles className="size-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Failed to load suggestions</h2>
          <p className="text-muted-foreground mt-1 mb-4">
            {error.message || "Something went wrong. Please try again."}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="size-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (suggestions.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Sparkles className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No suggestions yet</h2>
          <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
            Import more statements to detect recurring patterns and subscription suggestions.
          </p>
          <Button asChild>
            <Link href="/import">
              <FileUp className="size-4 mr-2" />
              Import Statements
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI Suggestions</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`size-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <p className="text-muted-foreground">
          Subscriptions detected from your statement patterns
          <span className="ml-2 text-foreground font-medium">
            ({suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""})
          </span>
        </p>
      </div>

      {/* Select all checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={someSelected ? "indeterminate" : allSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all suggestions"
        />
        <label
          className="text-sm cursor-pointer select-none"
          onClick={toggleSelectAll}
        >
          Select all ({suggestions.length})
        </label>
      </div>

      {/* Suggestions list */}
      <div className="space-y-3">
        {suggestions.map((pattern) => (
          <SuggestionCard
            key={pattern.id}
            pattern={pattern}
            isSelected={selectedIds.has(pattern.id)}
            onToggleSelect={toggleSelect}
            onAccept={() => acceptPattern.mutate({ patternId: pattern.id })}
            onDismiss={() => dismissPattern.mutate({ patternId: pattern.id })}
            isAccepting={acceptPattern.isPending}
            isDismissing={dismissPattern.isPending}
          />
        ))}
      </div>

      {/* Bulk actions bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onAcceptAll={() => bulkAccept.mutate({ patternIds: Array.from(selectedIds) })}
        onDismissAll={() => bulkDismiss.mutate({ patternIds: Array.from(selectedIds) })}
        onClearSelection={clearSelection}
        isProcessing={bulkAccept.isPending || bulkDismiss.isPending}
      />
    </div>
  );
}
