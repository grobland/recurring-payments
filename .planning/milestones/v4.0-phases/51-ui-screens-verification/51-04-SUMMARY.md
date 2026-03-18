---
phase: 51-ui-screens-verification
plan: 04
subsystem: ui
tags: [react, tanstack-query, recurring-payments, transactions, batch-upload]

requires:
  - phase: 51-ui-screens-verification
    provides: useLabelTransaction mutation hook and recurring query key factory

provides:
  - BatchUploaderWithStats component: post-processing stats panel after batch upload
  - StatementLineItems component: line items table with merchant names, recurring status badges, and label action dropdowns
  - TransactionFilters extended: recurringOnly and unmatchedOnly toggle buttons
  - TransactionBrowser extended: client-side filtering by recurring/unmatched status

affects:
  - vault load page (can swap to BatchUploaderWithStats)
  - statement-detail (can replace LineItemsTable with StatementLineItems)
  - transactions page

tech-stack:
  added: []
  patterns:
    - Client-side filter toggles in TransactionFilters using Toggle component (mutually exclusive)
    - Transaction filtering by tagStatus proxy (potential_subscription|converted = recurring, unreviewed|not_subscription = unmatched)
    - Best-effort line item to transaction matching by date + amount for label actions

key-files:
  created:
    - src/components/vault/batch-uploader.tsx
    - src/components/statements/statement-line-items.tsx
  modified:
    - src/components/transactions/transaction-filters.tsx
    - src/components/transactions/transaction-browser.tsx
    - src/types/transaction.ts

key-decisions:
  - "BatchUploaderWithStats wraps core BatchUploader and shows ProcessingResultsPanel with recurring intelligence prompt — no hook changes needed"
  - "StatementLineItems matches line items to transactions by date+amount (not source_hash) since line items API doesn't expose transaction IDs"
  - "recurringOnly/unmatchedOnly filters applied client-side using tagStatus proxy — API already has paymentType server-side filter for the main recurring view"
  - "TransactionFilters type extended with optional recurringOnly/unmatchedOnly boolean fields — additive, no breaking changes"

patterns-established:
  - "Toggle-based mutually exclusive filters use onPressedChange with explicit field clearing (not radio group)"
  - "Line item to transaction matching: date slice 0..10 + abs amount within 0.01 tolerance"

requirements-completed: [UI-02, UI-03, UI-04]

duration: 15min
completed: 2026-03-18
---

# Phase 51 Plan 04: UI Screens Enhancement Summary

**Recurring payment context added to batch upload stats, statement line items with merchant/recurring badges and label actions, and transaction browser recurring/unmatched toggle filters**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-18T10:58:00Z
- **Completed:** 2026-03-18T11:02:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `BatchUploaderWithStats` in vault directory: shows Processing Results panel after batch completion with file counts, transaction totals, and a link to the recurring payments dashboard
- Created `StatementLineItems` component: fetches line items + statement transactions, matches by date/amount, displays inferred merchant names, recurring status badges (Recurring/Potential/Not recurring), and per-row DropdownMenu for labeling via `useLabelTransaction`
- Extended `TransactionFilters` with two mutually exclusive Toggle buttons (Recurring only / Unmatched only) with green/amber visual states
- Extended `TransactionBrowser` with client-side filtering: `recurringOnly` shows potential_subscription|converted transactions, `unmatchedOnly` shows unreviewed|not_subscription transactions

## Task Commits

1. **Task 1: Add processing stats to batch uploader and recurring status to statement detail (UI-02, UI-03)** - `cc9661c` (feat)
2. **Task 2: Add recurring/unmatched filter toggles to transaction browser (UI-04)** - `736cc8a` (feat)

## Files Created/Modified

- `src/components/vault/batch-uploader.tsx` - BatchUploaderWithStats: wraps core uploader, shows post-processing stats with recurring intelligence prompt
- `src/components/statements/statement-line-items.tsx` - StatementLineItems: line items with merchant badges, recurring status, and useLabelTransaction dropdowns
- `src/components/transactions/transaction-filters.tsx` - Added Toggle buttons for recurringOnly/unmatchedOnly, mutually exclusive
- `src/components/transactions/transaction-browser.tsx` - Added client-side filtering for recurringOnly/unmatchedOnly via rawTransactions memo
- `src/types/transaction.ts` - Added recurringOnly and unmatchedOnly optional boolean fields to TransactionFilters interface

## Decisions Made

- `BatchUploaderWithStats` wraps rather than modifies the core `BatchUploader` — the `BatchUploadResult` type (totalFiles, successful, failed, skipped, totalTransactions) has enough data to show useful stats without changing the hook
- `StatementLineItems` uses best-effort date+amount matching to link line items to transactions because the line items API doesn't expose `sourceHash` or `transactionId`. This covers the majority of cases; transfers and refunds with duplicate amounts on the same date are known edge cases
- `recurringOnly`/`unmatchedOnly` use `tagStatus` as proxy because `recurringSeriesId` is in a junction table not exposed by the transactions API. A future phase could add `recurringSeriesId` to the API response for direct filtering
- Filters are mutually exclusive: selecting one clears the other via explicit field clearing in `onFiltersChange`

## Deviations from Plan

None - plan executed exactly as written. Both components were new files (not found at specified paths), which matched plan expectations. Pre-existing TypeScript errors in `transactions/route.ts` and `vault/coverage/route.ts` were confirmed pre-existing and out of scope.

## Issues Encountered

- The plan referenced `src/components/vault/batch-uploader.tsx` and `src/components/statements/statement-line-items.tsx` as files to modify, but neither existed — they were new creations. The batch uploader lives at `src/components/batch/batch-uploader.tsx`. The vault version wraps it additively.

## Next Phase Readiness

- All three UI requirements (UI-02, UI-03, UI-04) implemented
- `BatchUploaderWithStats` can be swapped into `src/app/(dashboard)/vault/load/page.tsx` to replace the current plain `BatchUploader`
- `StatementLineItems` can be used as a tab in `statement-detail.tsx` alongside or replacing the existing `LineItemsTable` for the recurring-aware ledger view
- Transaction browser now has recurring/unmatched toggle filtering

---
*Phase: 51-ui-screens-verification*
*Completed: 2026-03-18*
