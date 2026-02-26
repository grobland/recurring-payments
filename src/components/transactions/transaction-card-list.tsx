"use client";

import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TransactionWithSource, PaymentType } from "@/types/transaction";
import { TransactionCard } from "./transaction-card";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionCardListProps {
  transactions: TransactionWithSource[];
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  paymentType?: PaymentType;
}

const CARD_HEIGHT = 120;
const OVERSCAN = 10;

/**
 * Virtualized card list component for mobile transaction view.
 * Handles 10k+ items at 60fps with infinite scroll.
 */
export function TransactionCardList({
  transactions,
  onLoadMore,
  hasMore,
  isLoading,
  selectedIds,
  onToggleOne,
  paymentType,
}: TransactionCardListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT,
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
    <div
      ref={parentRef}
      className="flex-1 h-[calc(100vh-220px)] overflow-auto"
    >
      <div
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
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              isSelected={selectedIds.has(transaction.id)}
              onToggle={() => onToggleOne(transaction.id)}
              paymentType={paymentType}
            />
          );
        })}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="h-20 flex items-center justify-center"
        >
          {isLoading ? (
            <div className="space-y-2 w-full px-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
  );
}
