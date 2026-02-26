"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AlertCircle, RefreshCw, FileX2 } from "lucide-react";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBulkTagTransactions } from "@/lib/hooks/use-bulk-tag-transactions";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionCardList } from "@/components/transactions/transaction-card-list";
import { BulkActionBar } from "@/components/transactions/bulk-action-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { TransactionFilters as TransactionFiltersType } from "@/types/transaction";

interface AccountTransactionsTabProps {
  accountId: string;
  initialFilters: TransactionFiltersType;
  onFiltersChange: (filters: TransactionFiltersType) => void;
}

export function AccountTransactionsTab({
  accountId,
  initialFilters,
  onFiltersChange,
}: AccountTransactionsTabProps) {
  const [filters, setFilters] = useState<TransactionFiltersType>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef(selectedIds);
  const isMobile = useIsMobile();

  // Sync ref with state for handleBulkTag callback
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // Update filters when initialFilters change (cross-tab navigation from coverage)
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Debounce search input (300ms)
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Create debounced filters for the query — always include accountId
  const debouncedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
      accountId, // Always scope to this account
    }),
    [filters, debouncedSearch, accountId]
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

  // Notify parent of filter changes
  const handleFiltersChange = useCallback(
    (newFilters: TransactionFiltersType) => {
      setFilters(newFilters);
      onFiltersChange({ ...newFilters, accountId });
    },
    [accountId, onFiltersChange]
  );

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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) {
          next.delete(id);
        }
        return next;
      });
    } else {
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

  // Check if we have active filters beyond accountId
  const hasActiveFilters =
    filters.search ||
    filters.sourceType ||
    filters.tagStatus ||
    filters.dateFrom ||
    filters.dateTo;

  // Count summary stats
  const taggedCount = allTransactions.filter(
    (t) => t.tagStatus !== "unreviewed"
  ).length;
  const subscriptionCount = allTransactions.filter(
    (t) => t.tagStatus === "converted"
  ).length;

  // Loading state (initial load)
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TransactionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
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
          onFiltersChange={handleFiltersChange}
          sourceTypes={[]}
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
          onFiltersChange={handleFiltersChange}
          sourceTypes={[]}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <FileX2 className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">
              {hasActiveFilters
                ? "No transactions match your filters"
                : "No transactions for this account"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters
                ? "Try adjusting your filter criteria or clearing filters."
                : "Import bank statements linked to this account to see transactions."}
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              onClick={() => handleFiltersChange({ accountId })}
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
        onFiltersChange={handleFiltersChange}
        sourceTypes={[]}
      />

      {/* Count summary banner */}
      <div className="text-sm text-muted-foreground mb-3">
        Showing {allTransactions.length} transactions &middot; {taggedCount} tagged &middot;{" "}
        {subscriptionCount} subscriptions
      </div>

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
