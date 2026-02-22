---
phase: 20
plan: 01
status: complete
started: 2026-02-09T09:58:08Z
completed: 2026-02-09T10:05:01Z
duration: 7m
subsystem: transactions
tags: [api, hooks, pagination, tanstack-query, drizzle]

requires:
  - 19-01 # Schema for transactions and statements tables

provides:
  - GET /api/transactions endpoint with keyset pagination
  - useTransactions hook with infinite query
  - useDebouncedValue utility hook
  - Transaction types (TransactionFilters, TransactionPage, TransactionCursor)

affects:
  - 20-02 # Virtualized table will consume this hook
  - 20-03 # Filter bar will use these types
  - 20-04 # Tag status updates will invalidate transaction queries

tech-stack:
  patterns:
    - keyset-pagination: Cursor-based (date, id) for consistent performance
    - infinite-query: TanStack Query useInfiniteQuery for paginated data
    - debounce-state: Debounce query key state, not queryFn

key-files:
  created:
    - src/app/api/transactions/route.ts
    - src/lib/hooks/use-transactions.ts
    - src/lib/hooks/use-debounced-value.ts
    - src/types/transaction.ts
  modified:
    - src/lib/hooks/index.ts

decisions:
  - id: keyset-over-offset
    choice: Keyset pagination with (transactionDate, id) cursor
    why: O(1) performance at any depth vs O(n) for OFFSET

metrics:
  tasks: 3/3
  commits: 3
  files-created: 4
  files-modified: 1
  loc-added: ~315
---

# Phase 20 Plan 01: Transaction Data Layer Summary

**One-liner:** GET /api/transactions with keyset pagination and useInfiniteQuery hook for 10k+ row browsing.

## What Was Built

### API Endpoint (src/app/api/transactions/route.ts)

GET endpoint with:
- Authentication via NextAuth session
- Keyset pagination using `(transactionDate DESC, id DESC)` cursor
- Filter support: sourceType, tagStatus, dateFrom, dateTo, search
- Left join with statements table to include sourceType in results
- PAGE_SIZE of 50 with hasMore detection

### useTransactions Hook (src/lib/hooks/use-transactions.ts)

TanStack Query infinite query hook with:
- Query key factory pattern: `['transactions', 'list', filters]`
- Cursor-based pagination via pageParam
- Filter parameters passed as URLSearchParams
- Computed helpers: `allTransactions` (flattened array), `totalLoaded` (count)

### useDebouncedValue Hook (src/lib/hooks/use-debounced-value.ts)

Generic debounce utility:
- Debounces value at state level (not queryFn)
- Default 300ms delay, configurable
- Proper cleanup on unmount

### Transaction Types (src/types/transaction.ts)

- `TransactionFilters`: sourceType, tagStatus, dateFrom, dateTo, search
- `TransactionCursor`: transactionDate, id for pagination
- `TransactionPage`: API response shape with transactions, nextCursor, hasMore
- `TransactionWithSource`: Transaction with joined sourceType field

## Key Decisions

### Keyset vs OFFSET Pagination

**Decision:** Keyset with composite cursor (transactionDate, id)

**Why:** OFFSET pagination degrades linearly with page depth. For 10k+ transactions, page 200 would scan 10,000 rows before returning results. Keyset pagination uses index seeks for O(1) performance at any depth.

**Cursor design:** Using `(date < cursorDate) OR (date = cursorDate AND id < cursorId)` ensures stable ordering even with multiple transactions on the same date.

## Verification

All success criteria met:
- [x] GET /api/transactions returns paginated results with cursor
- [x] Keyset pagination uses (date, id) composite cursor
- [x] Filters (sourceType, tagStatus, dateFrom, dateTo, search) all work
- [x] useTransactions hook uses useInfiniteQuery correctly
- [x] useDebouncedValue hook debounces values at state level
- [x] All types are properly exported

## Commits

| Hash | Message |
|------|---------|
| c9b077b | feat(20-01): add transaction types and debounce utility |
| a3e73c8 | feat(20-01): create transactions API with keyset pagination |
| 316506f | feat(20-01): implement useTransactions infinite query hook |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Plan 02 (Virtualized Table):
- API endpoint tested and working
- Hook returns all properties needed for UI: data, isLoading, fetchNextPage, hasNextPage
- Types exported for use in UI components

## Usage Example

```tsx
"use client";

import { useState } from "react";
import { useTransactions, useDebouncedValue } from "@/lib/hooks";

export function TransactionBrowser() {
  const [search, setSearch] = useState("");
  const [tagStatus, setTagStatus] = useState<string>("all");

  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    allTransactions,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage
  } = useTransactions({
    search: debouncedSearch,
    tagStatus,
  });

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search transactions..."
      />

      {allTransactions.map(tx => (
        <div key={tx.id}>{tx.merchantName}: {tx.amount}</div>
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Load More
        </button>
      )}
    </div>
  );
}
```
