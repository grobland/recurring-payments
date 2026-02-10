"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AlertCircle, RefreshCw, FileX2 } from "lucide-react";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTags } from "@/lib/hooks/use-tags";
import { useBulkTagTransactions } from "@/lib/hooks/use-bulk-tag-transactions";
import { TransactionFilters } from "./transaction-filters";
import { TransactionTable } from "./transaction-table";
import { TransactionCardList } from "./transaction-card-list";
import { BulkActionBar } from "./bulk-action-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { TransactionFilters as TransactionFiltersType } from "@/types/transaction";

/**
 * Main transaction browser component.
 * Orchestrates filters, data fetching, and responsive table/card views.
 */
export function TransactionBrowser() {
  const [filters, setFilters] = useState<TransactionFiltersType>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef(selectedIds);
  const isMobile = useIsMobile();

  // Sync ref with state for handleBulkTag callback
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // Debounce search input (300ms)
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Create debounced filters for the query
  const debouncedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  );

  const {
    allTransactions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useTransactions(debouncedFilters);

  const bulkTagMutation = useBulkTagTransactions();

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedFilters]);

  // Selection state computations
  const visibleIds = useMemo(
    () => new Set(allTransactions.map((t) => t.id)),
    [allTransactions]
  );

  const isAllVisibleSelected = useMemo(() => {
    if (visibleIds.size === 0) return false;
    for (const id of visibleIds) {
      if (!selectedIds.has(id)) return false;
    }
    return true;
  }, [visibleIds, selectedIds]);

  const isSomeSelected = selectedIds.size > 0 && !isAllVisibleSelected;

  // Selection handlers
  const toggleAll = useCallback(() => {
    if (isAllVisibleSelected) {
      // Remove all visible ids from selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) {
          next.delete(id);
        }
        return next;
      });
    } else {
      // Add all visible ids to selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) {
          next.add(id);
        }
        return next;
      });
    }
  }, [isAllVisibleSelected, visibleIds]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Bulk tag handler - uses ref to avoid stale closure on selectedIds
  const handleBulkTag = useCallback(
    (tagId: string) => {
      const transactionIds = Array.from(selectedIdsRef.current);
      bulkTagMutation.mutate(
        { transactionIds, tagId, action: "add" },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
          },
        }
      );
    },
    [bulkTagMutation]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Extract unique source types from loaded transactions
  const uniqueSourceTypes = useMemo(() => {
    const sources = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.sourceType) {
        sources.add(t.sourceType);
      }
    });
    return Array.from(sources).sort();
  }, [allTransactions]);

  // Check if we have active filters (for empty state messaging)
  const hasActiveFilters =
    filters.search ||
    filters.sourceType ||
    filters.tagStatus ||
    filters.dateFrom ||
    filters.dateTo;

  // Loading state (initial load)
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TransactionFilters
          filters={filters}
          onFiltersChange={setFilters}
          sourceTypes={[]}
        />
        <div className="flex-1 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col h-full">
        <TransactionFilters
          filters={filters}
          onFiltersChange={setFilters}
          sourceTypes={uniqueSourceTypes}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold">Error loading transactions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.message || "Something went wrong. Please try again."}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (allTransactions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <TransactionFilters
          filters={filters}
          onFiltersChange={setFilters}
          sourceTypes={uniqueSourceTypes}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <FileX2 className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">
              {hasActiveFilters
                ? "No transactions match your filters"
                : "No transactions found"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters
                ? "Try adjusting your filter criteria or clearing filters."
                : "Import some bank statements to see transactions here."}
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              onClick={() => setFilters({})}
              variant="outline"
              className="gap-2"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="flex flex-col h-full">
      <TransactionFilters
        filters={filters}
        onFiltersChange={setFilters}
        sourceTypes={uniqueSourceTypes}
      />

      {isMobile ? (
        <TransactionCardList
          transactions={allTransactions}
          onLoadMore={() => fetchNextPage()}
          hasMore={hasNextPage ?? false}
          isLoading={isFetchingNextPage}
          selectedIds={selectedIds}
          onToggleOne={toggleOne}
        />
      ) : (
        <TransactionTable
          transactions={allTransactions}
          onLoadMore={() => fetchNextPage()}
          hasMore={hasNextPage ?? false}
          isLoading={isFetchingNextPage}
          selectedIds={selectedIds}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          isAllSelected={isAllVisibleSelected}
          isSomeSelected={isSomeSelected}
        />
      )}

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onTag={handleBulkTag}
          onClear={handleClearSelection}
        />
      )}
    </div>
  );
}
