---
phase: 39-payment-type-selector
plan: 02
subsystem: ui
tags: [nuqs, toggle-group, segmented-control, transactions, filter, radix-ui]

# Dependency graph
requires:
  - phase: 39-01
    provides: nuqs@2.8.8 installed, NuqsAdapter in providers, PaymentType type + PAYMENT_TYPES const, useTransactions hook with paymentType param, API route paymentType filter

provides:
  - PaymentTypeSelector segmented control component (four segments: All, Recurring, Subscriptions, One-time)
  - nuqs URL-persisted paymentType state in TransactionBrowser
  - PaymentTypeSelector positioned above TransactionFilters in all render paths
  - Contextual empty state messages per payment type
  - Inline subscription checkbox on recurring transaction rows (desktop + mobile)
  - Amber dot indicator distinguishing suggested from confirmed subscriptions

affects: [40-payment-type-selector-tests, transactions-page, account-detail-transactions-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - nuqs useQueryState with parseAsStringLiteral for enum URL state — paymentType defaults to 'all', selecting 'all' removes param (clean URL)
    - filterControls() helper function to render shared PaymentTypeSelector + TransactionFilters in all render branches (loading, error, empty, main)
    - Conditional subscription checkbox column in virtualized table — only visible when paymentType === 'recurring'
    - Amber dot indicator (-top-1 -right-1 positioned span) for suggested vs confirmed subscription visual distinction

key-files:
  created:
    - src/components/transactions/payment-type-selector.tsx
  modified:
    - src/components/transactions/transaction-browser.tsx
    - src/components/transactions/transaction-table.tsx
    - src/components/transactions/transaction-card-list.tsx
    - src/components/transactions/transaction-row.tsx
    - src/components/transactions/transaction-card.tsx
    - src/components/transactions/index.ts

key-decisions:
  - "filterControls() helper renders PaymentTypeSelector + TransactionFilters in a shared closure — avoids repeating JSX across all four render branches"
  - "ToggleGroup with variant=outline, spacing=0 and border rounded-lg p-0.5 bg-muted/40 wrapper achieves iOS-style connected pill appearance within shadcn conventions"
  - "Subscription checkbox is one-way in v1: check triggers convert flow, uncheck not supported (confirmed subscriptions are disabled, use existing UI to unconvert)"
  - "TransactionCard in recurring mode replaces Convert button with Subscription label + checkbox — avoids two actions competing for the same ml-auto slot"

patterns-established:
  - "PaymentType prop threading: TransactionBrowser -> TransactionTable/TransactionCardList -> TransactionRow/TransactionCard"
  - "Conditional column: showSubscriptionCheckbox = paymentType === 'recurring' — column header and cell both conditionally rendered"

requirements-completed:
  - FILTER-01
  - FILTER-02
  - FILTER-03

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 39 Plan 02: UI Integration Summary

**iOS-style PaymentTypeSelector segmented control wired to nuqs URL state in TransactionBrowser, with inline subscription checkbox and amber dot suggested-vs-confirmed visual distinction on recurring rows**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T23:55:38Z
- **Completed:** 2026-02-26T23:59:02Z
- **Tasks:** 3
- **Files modified:** 6 (+ 1 created)

## Accomplishments

- PaymentTypeSelector (shadcn ToggleGroup, iOS-style pill) renders above all existing filters in TransactionBrowser (FILTER-01)
- nuqs useQueryState persists paymentType in URL, selecting "All" clears the param for a clean URL, browser back/forward navigates between selections (FILTER-02)
- paymentType combined into debouncedFilters and passed to useTransactions, combining with all existing filters (FILTER-03)
- Contextual empty state messages: "No recurring payments found", "No subscriptions found", "No one-time payments found" per selected type
- Inline subscription checkbox visible on each row when paymentType === 'recurring', with amber dot for suggested (potential_subscription) vs clean checked for confirmed
- Build passes with no type errors

## Task Commits

1. **Task 1: Create PaymentTypeSelector component** - `cd8e5f1` (feat)
2. **Task 2: Wire nuqs and PaymentTypeSelector into TransactionBrowser** - `6559f60` (feat)
3. **Task 3: Add inline subscription checkbox on recurring transaction rows** - `737c481` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `src/components/transactions/payment-type-selector.tsx` - Segmented control component with four payment type segments using ToggleGroup
- `src/components/transactions/transaction-browser.tsx` - nuqs paymentType state, PaymentTypeSelector integration, contextual empty states, prop threading
- `src/components/transactions/transaction-table.tsx` - PaymentType prop, conditional "Sub?" column header
- `src/components/transactions/transaction-card-list.tsx` - PaymentType prop passed through to TransactionCard
- `src/components/transactions/transaction-row.tsx` - Inline subscription checkbox with amber dot indicator
- `src/components/transactions/transaction-card.tsx` - Mobile card subscription checkbox replacing Convert button in recurring view
- `src/components/transactions/index.ts` - PaymentTypeSelector export added

## Decisions Made

- `filterControls()` helper: renders PaymentTypeSelector + TransactionFilters in a shared closure to avoid repeating JSX across four render branches (loading, error, empty, main)
- ToggleGroup styling: `variant="outline" spacing={0}` with `border rounded-lg p-0.5 bg-muted/40` wrapper achieves iOS-style connected pills within shadcn conventions
- Subscription checkbox is one-way in v1: check triggers `useConvertTransaction`, uncheck not supported (confirmed subscriptions rendered as disabled)
- Mobile card (TransactionCard): in recurring mode, replaces the Convert button with "Subscription" label + checkbox to avoid competing ml-auto actions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All FILTER-01, FILTER-02, FILTER-03 requirements met
- Phase 39 is complete (both plans done) — payment type selector fully shipped
- Phase 40 (if planned) could add E2E tests for the filter feature

---
*Phase: 39-payment-type-selector*
*Completed: 2026-02-26*
