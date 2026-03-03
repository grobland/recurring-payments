"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AlertCircle, RefreshCw, FileX2, Download, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { useHintDismissals } from "@/lib/hooks/use-hint-dismissals";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTags } from "@/lib/hooks/use-tags";
import { useBulkTagTransactions } from "@/lib/hooks/use-bulk-tag-transactions";
import { TransactionFilters } from "./transaction-filters";
import { TransactionTable } from "./transaction-table";
import { TransactionCardList } from "./transaction-card-list";
import { BulkActionBar } from "./bulk-action-bar";
import { PaymentTypeSelector } from "./payment-type-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { TransactionFilters as TransactionFiltersType } from "@/types/transaction";
import type { PaymentType } from "@/types/transaction";
import { PAYMENT_TYPES } from "@/types/transaction";

/** Contextual empty state messages per payment type */
const EMPTY_MESSAGES: Record<PaymentType, string> = {
  all: "No transactions found",
  recurring: "No recurring payments found",
  subscriptions: "No subscriptions found",
  "one-time": "No one-time payments found",
};

/**
 * Main transaction browser component.
 * Orchestrates filters, data fetching, and responsive table/card views.
 * Payment type is persisted in the URL via nuqs (shallow update, no scroll reset).
 */
export function TransactionBrowser() {
  const [filters, setFilters] = useState<TransactionFiltersType>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef(selectedIds);
  const isMobile = useIsMobile();

  const { isDismissed: isHintDismissed, dismiss: dismissHint } = useHintDismissals();

  // Payment type filter — URL-persisted via nuqs (FILTER-02)
  // Default is "all"; selecting "all" removes the param from the URL for a clean URL state
  const [paymentType, setPaymentType] = useQueryState(
    "paymentType",
    parseAsStringLiteral(PAYMENT_TYPES).withDefault("all")
  );

  // Sync ref with state for handleBulkTag callback
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // Debounce search input (300ms)
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Create debounced filters for the query — paymentType combined with existing filters (FILTER-03)
  const debouncedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
      paymentType: paymentType === "all" ? undefined : paymentType,
    }),
    [filters, debouncedSearch, paymentType]
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

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedFilters.sourceType) {
        params.set("sourceType", debouncedFilters.sourceType);
      }
      if (debouncedFilters.tagStatus && debouncedFilters.tagStatus !== "all") {
        params.set("tagStatus", debouncedFilters.tagStatus);
      }
      if (debouncedFilters.dateFrom) {
        params.set("dateFrom", debouncedFilters.dateFrom);
      }
      if (debouncedFilters.dateTo) {
        params.set("dateTo", debouncedFilters.dateTo);
      }
      if (debouncedFilters.search) {
        params.set("search", debouncedFilters.search);
      }
      if (debouncedFilters.accountId) {
        params.set("accountId", debouncedFilters.accountId);
      }
      if (debouncedFilters.paymentType) {
        params.set("paymentType", debouncedFilters.paymentType);
      }
      const url = `/api/transactions/export${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Export failed");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [debouncedFilters]);

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
  // Includes paymentType !== 'all' as an active filter
  const hasActiveFilters =
    filters.search ||
    filters.sourceType ||
    filters.tagStatus ||
    filters.dateFrom ||
    filters.dateTo ||
    paymentType !== "all";

  // Shared filter controls — PaymentTypeSelector above TransactionFilters (FILTER-01)
  const filterControls = (sourceTypes: string[]) => (
    <div className="flex flex-col gap-2 mb-2">
      <div className="flex items-center justify-between">
        <PaymentTypeSelector value={paymentType} onChange={setPaymentType} />
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting || allTransactions.length === 0}
          data-testid="export-csv-button"
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>
      <TransactionFilters
        filters={filters}
        onFiltersChange={setFilters}
        sourceTypes={sourceTypes}
      />
    </div>
  );

  // Loading state (initial load)
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {filterControls([])}
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
        {filterControls(uniqueSourceTypes)}
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
        {filterControls(uniqueSourceTypes)}
        {hasActiveFilters ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <FileX2 className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">{EMPTY_MESSAGES[paymentType]}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filter criteria or clearing filters.
              </p>
            </div>
            <Button
              onClick={() => {
                setFilters({});
                setPaymentType("all");
              }}
              variant="outline"
              className="gap-2"
            >
              Clear filters
            </Button>
          </div>
        ) : isHintDismissed("transactions") ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="py-12 text-center text-sm text-muted-foreground">
              No transactions yet
            </p>
          </div>
        ) : (
          <div className="relative flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <button
              onClick={() => dismissHint("transactions")}
              className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss hint"
            >
              <X className="h-4 w-4" />
            </button>
            <FileX2 className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No transactions found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Import some bank statements to see transactions here.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main content
  return (
    <div className="flex flex-col h-full">
      {filterControls(uniqueSourceTypes)}

      {isMobile ? (
        <TransactionCardList
          transactions={allTransactions}
          onLoadMore={() => fetchNextPage()}
          hasMore={hasNextPage ?? false}
          isLoading={isFetchingNextPage}
          selectedIds={selectedIds}
          onToggleOne={toggleOne}
          paymentType={paymentType}
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
          paymentType={paymentType}
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
