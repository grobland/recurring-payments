---
id: S39
parent: M001
milestone: M001
provides:
  - nuqs@2.8.8 installed with NuqsAdapter in provider tree
  - shadcn toggle-group component (src/components/ui/toggle-group.tsx)
  - PaymentType type and PAYMENT_TYPES const from src/types/transaction.ts
  - paymentType field in TransactionFilters interface
  - useTransactions hook passes paymentType param to API
  - GET /api/transactions?paymentType=recurring|subscriptions|one-time server-side filter
  - PaymentTypeSelector segmented control component (four segments: All, Recurring, Subscriptions, One-time)
  - nuqs URL-persisted paymentType state in TransactionBrowser
  - PaymentTypeSelector positioned above TransactionFilters in all render paths
  - Contextual empty state messages per payment type
  - Inline subscription checkbox on recurring transaction rows (desktop + mobile)
  - Amber dot indicator distinguishing suggested from confirmed subscriptions
requires: []
affects: []
key_files: []
key_decisions:
  - "Raw SQL subquery for recurringPatterns merchant match — Drizzle inArray does not support cross-table subqueries cleanly; LOWER() in raw SQL is simpler and correct"
  - "Unified single query builder — sourceType moved into conditions[] array, eliminating two-branch if/else structure"
  - "effectivePaymentType validation guards — invalid paymentType values silently treated as 'all' (no error, no filter)"
  - "NuqsAdapter positioned inside QueryClientProvider and outside ThemeProvider per plan spec"
  - "filterControls() helper renders PaymentTypeSelector + TransactionFilters in a shared closure — avoids repeating JSX across all four render branches"
  - "ToggleGroup with variant=outline, spacing=0 and border rounded-lg p-0.5 bg-muted/40 wrapper achieves iOS-style connected pill appearance within shadcn conventions"
  - "Subscription checkbox is one-way in v1: check triggers convert flow, uncheck not supported (confirmed subscriptions are disabled, use existing UI to unconvert)"
  - "TransactionCard in recurring mode replaces Convert button with Subscription label + checkbox — avoids two actions competing for the same ml-auto slot"
patterns_established:
  - "PaymentType filter: server-side only — cursor-based pagination requires all filtering at DB level"
  - "PAYMENT_TYPES as const array with derived type — enables exhaustive checks and autocomplete"
  - "PaymentType prop threading: TransactionBrowser -> TransactionTable/TransactionCardList -> TransactionRow/TransactionCard"
  - "Conditional column: showSubscriptionCheckbox = paymentType === 'recurring' — column header and cell both conditionally rendered"
observability_surfaces: []
drill_down_paths: []
duration: 4min
verification_result: passed
completed_at: 2026-02-26
blocker_discovered: false
---
# S39: Payment Type Selector

**# Phase 39 Plan 01: Infrastructure + API Summary**

## What Happened

# Phase 39 Plan 01: Infrastructure + API Summary

**nuqs@2.8.8 + NuqsAdapter installed, PaymentType type system established, and server-side paymentType filter (recurring/subscriptions/one-time) implemented in transactions API with recurringPatterns SQL subquery**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T23:47:45Z
- **Completed:** 2026-02-26T23:52:51Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Installed nuqs@2.8.8 and shadcn toggle-group; wired NuqsAdapter into provider tree (QueryClientProvider > NuqsAdapter > ThemeProvider)
- Extended TransactionFilters with PaymentType type (all/recurring/subscriptions/one-time) and updated useTransactions hook to omit param when 'all'
- Refactored transactions API from two-branch query to single unified query builder; added paymentType server-side filter using recurringPatterns LOWER() subquery

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and add NuqsAdapter** - `53a4028` (feat)
2. **Task 2: Extend types and hook with paymentType filter** - `2d02200` (feat)
3. **Task 3: Implement paymentType filter in transactions API route** - `e5eb7fb` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/components/ui/toggle-group.tsx` - shadcn ToggleGroup and ToggleGroupItem components (via radix-ui)
- `src/components/ui/toggle.tsx` - shadcn Toggle primitive (dependency of toggle-group)
- `src/app/providers.tsx` - NuqsAdapter added wrapping ThemeProvider children
- `src/types/transaction.ts` - PAYMENT_TYPES const, PaymentType type, paymentType field in TransactionFilters
- `src/lib/hooks/use-transactions.ts` - passes paymentType param to API (skips when 'all')
- `src/app/api/transactions/route.ts` - paymentType param parsing, validation, filter conditions, unified query

## Decisions Made

- Raw SQL subquery used for recurringPatterns merchant matching because Drizzle's `inArray` does not support cross-table subqueries in a clean way; `LOWER()` comparison in raw SQL is the cleanest approach per plan spec
- sourceType filter moved into the shared `conditions[]` array to eliminate the original two-branch if/else query structure — single query now handles all filter combinations
- Invalid paymentType values (anything not in recurring/subscriptions/one-time) are silently treated as 'all' — no 400 error returned, consistent with how tagStatus handles invalid values
- NuqsAdapter positioned inside QueryClientProvider, wrapping ThemeProvider — matches plan spec for correct provider nesting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All infrastructure ready for Phase 39 Plan 02 (UI toggle-group segmented control)
- NuqsAdapter in provider tree enables `useQueryState` anywhere in the component tree
- PaymentType type exported for UI consumption
- API correctly handles all four paymentType values with correct AND combination with existing filters

---
*Phase: 39-payment-type-selector*
*Completed: 2026-02-26*

## Self-Check: PASSED

- FOUND: src/components/ui/toggle-group.tsx
- FOUND: src/app/providers.tsx
- FOUND: src/types/transaction.ts
- FOUND: src/lib/hooks/use-transactions.ts
- FOUND: src/app/api/transactions/route.ts
- FOUND commit 53a4028 (Task 1)
- FOUND commit 2d02200 (Task 2)
- FOUND commit e5eb7fb (Task 3)

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
