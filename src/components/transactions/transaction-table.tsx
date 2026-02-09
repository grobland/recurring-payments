"use client";

import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Minus } from "lucide-react";
import type { TransactionWithSource } from "@/types/transaction";
import { TransactionRow } from "./transaction-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

interface TransactionTableProps {
  transactions: TransactionWithSource[];
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

const ROW_HEIGHT = 48;
const OVERSCAN = 20;

/**
 * Virtualized table component for desktop transaction view.
 * Handles 10k+ items at 60fps with infinite scroll.
 */
export function TransactionTable({
  transactions,
  onLoadMore,
  hasMore,
  isLoading,
  selectedIds,
  onToggleAll,
  onToggleOne,
  isAllSelected,
  isSomeSelected,
}: TransactionTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const loadMoreEl = loadMoreRef.current;
    if (!loadMoreEl || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreEl);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className="flex-1 overflow-hidden border rounded-lg">
      {/* Table Header */}
      <div className="flex items-center bg-muted/50 border-b font-medium text-sm text-muted-foreground">
        <div className="w-[44px] px-3 py-3 flex items-center justify-center">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label="Select all transactions"
            {...(isSomeSelected ? { "data-state": "indeterminate" } : {})}
          />
          {isSomeSelected && (
            <Minus className="absolute h-3.5 w-3.5 pointer-events-none" />
          )}
        </div>
        <div className="w-[120px] px-4 py-3">Date</div>
        <div className="flex-1 px-4 py-3 min-w-0">Merchant</div>
        <div className="w-[100px] px-4 py-3 text-right">Amount</div>
        <div className="w-[140px] px-4 py-3">Source</div>
        <div className="w-[120px] px-4 py-3">Category</div>
        <div className="w-[100px] px-4 py-3">Status</div>
        <div className="w-[50px] px-2 py-3"></div>
        <div className="w-[110px] px-2 py-3"></div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="h-[calc(100vh-280px)] overflow-auto"
      >
        <table className="w-full">
          <tbody
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const transaction = transactions[virtualRow.index];
              if (!transaction) return null;

              return (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  isSelected={selectedIds.has(transaction.id)}
                  onToggle={() => onToggleOne(transaction.id)}
                />
              );
            })}
          </tbody>
        </table>

        {/* Load More Trigger */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="h-20 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="space-y-2 w-full px-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Scroll to load more...
              </span>
            )}
          </div>
        )}

        {/* End of list indicator */}
        {!hasMore && transactions.length > 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            End of transactions
          </div>
        )}
      </div>
    </div>
  );
}
