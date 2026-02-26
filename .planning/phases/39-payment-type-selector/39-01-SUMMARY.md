---
phase: 39-payment-type-selector
plan: 1
subsystem: api
tags: [nuqs, drizzle, transactions, filter, toggle-group, react-query]

# Dependency graph
requires:
  - phase: 38-account-detail-pages
    provides: accountId filter in transactions route (shared conditions[] pattern)
provides:
  - nuqs@2.8.8 installed with NuqsAdapter in provider tree
  - shadcn toggle-group component (src/components/ui/toggle-group.tsx)
  - PaymentType type and PAYMENT_TYPES const from src/types/transaction.ts
  - paymentType field in TransactionFilters interface
  - useTransactions hook passes paymentType param to API
  - GET /api/transactions?paymentType=recurring|subscriptions|one-time server-side filter
affects:
  - 39-02 (UI toggle-group segmented control consumes this infrastructure)

# Tech tracking
tech-stack:
  added: [nuqs@2.8.8, @radix-ui/react-toggle-group]
  patterns:
    - All transaction filter conditions added to shared conditions[] array (no per-condition query branching)
    - LOWER() subquery for case-insensitive merchant matching against recurringPatterns
    - effectivePaymentType validation pattern (invalid values fall through as null)

key-files:
  created:
    - src/components/ui/toggle-group.tsx
    - src/components/ui/toggle.tsx
  modified:
    - package.json
    - src/app/providers.tsx
    - src/types/transaction.ts
    - src/lib/hooks/use-transactions.ts
    - src/app/api/transactions/route.ts

key-decisions:
  - "Raw SQL subquery for recurringPatterns merchant match — Drizzle inArray does not support cross-table subqueries cleanly; LOWER() in raw SQL is simpler and correct"
  - "Unified single query builder — sourceType moved into conditions[] array, eliminating two-branch if/else structure"
  - "effectivePaymentType validation guards — invalid paymentType values silently treated as 'all' (no error, no filter)"
  - "NuqsAdapter positioned inside QueryClientProvider and outside ThemeProvider per plan spec"

patterns-established:
  - "PaymentType filter: server-side only — cursor-based pagination requires all filtering at DB level"
  - "PAYMENT_TYPES as const array with derived type — enables exhaustive checks and autocomplete"

requirements-completed: [FILTER-01, FILTER-02, FILTER-03]

# Metrics
duration: 5min
completed: 2026-02-26
---

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
