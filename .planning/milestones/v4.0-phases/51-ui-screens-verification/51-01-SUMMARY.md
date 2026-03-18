---
phase: 51-ui-screens-verification
plan: 01
subsystem: ui
tags: [tanstack-query, react, hooks, sidebar, dashboard, recurring-payments]

# Dependency graph
requires:
  - phase: 50-apis-review-queue
    provides: REST API endpoints for /api/recurring/* that hooks call

provides:
  - TanStack Query hooks file (use-recurring.ts) with 14 hooks for all recurring APIs
  - Sidebar nav items for Recurring (/recurring) and Review Queue (/recurring/review)
  - RecurringDashboardCard component showing activeCount, monthlyTotal, upcomingCount, needsReviewCount, amount change alerts
  - Dashboard page wired with RecurringDashboardCard after PatternSuggestionsCard

affects:
  - 51-02 (Recurring Masters list page — uses useRecurringMasters, useChangeMasterStatus, useMergeMasters)
  - 51-03 (Master detail page — uses useRecurringMasterDetail, useUpdateMaster)
  - 51-04 (Review Queue page — uses useReviewQueue, useResolveReviewItem, useConfirmSeries, useIgnoreSeries, useLabelTransaction)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "apiFetch helper wraps fetch with error extraction — consistent with use-subscriptions.ts pattern"
    - "Mutation hooks: invalidate related keys on success, toast.success on success, toast.error(getErrorMessage) on error"
    - "Additive dashboard card pattern: return null on error so card simply does not render"
    - "recurringKeys query key factory follows subscriptionKeys shape"

key-files:
  created:
    - src/lib/hooks/use-recurring.ts
    - src/components/recurring/recurring-dashboard-card.tsx
  modified:
    - src/components/layout/app-sidebar.tsx
    - src/app/(dashboard)/payments/dashboard/page.tsx

key-decisions:
  - "recurringKeys.seriesList accepts optional Record<string,string> filters — flexible for future filter expansion"
  - "RecurringDashboardCard returns null on error (additive pattern) — dashboard remains functional when recurring API fails"
  - "Dashboard card uses USD as default currency for monthlyTotal display — actual currency formatting delegated to formatCurrency"

patterns-established:
  - "Recurring hooks follow use-subscriptions.ts pattern: named apiFetch helper + exported hooks"
  - "All mutation hooks show toast on success/error — consistent UX feedback"
  - "Sidebar prefixMatchItems array extended with /recurring for child route highlighting"

requirements-completed: [UI-01]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 51 Plan 01: Recurring Hooks, Sidebar Nav, and Dashboard Card Summary

**TanStack Query hooks for all 6 recurring API endpoints plus 8 mutation hooks, sidebar navigation for /recurring and /recurring/review, and RecurringDashboardCard wired into the dashboard page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T10:52:42Z
- **Completed:** 2026-03-18T10:55:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/lib/hooks/use-recurring.ts` with 14 hooks: 6 query (useRecurringDashboard, useRecurringMasters, useRecurringMasterDetail, useRecurringSeries, useRecurringSeriesDetail, useReviewQueue) + 8 mutation (useCreateMaster, useUpdateMaster, useMergeMasters, useChangeMasterStatus, useConfirmSeries, useIgnoreSeries, useResolveReviewItem, useLabelTransaction)
- Updated sidebar with RefreshCcw/ClipboardCheck icons, Recurring in overviewItems, Review Queue in manageItems, /recurring added to prefixMatchItems
- Built RecurringDashboardCard showing 4 stats in 2x2 grid, amount change alerts with amber styling, and footer link — all with skeleton loading states
- Wired RecurringDashboardCard into dashboard page after PatternSuggestionsCard

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TanStack Query hooks + update sidebar** - `d38a8ef` (feat)
2. **Task 2: Build RecurringDashboardCard + wire into dashboard** - `c829f74` (feat)

**Plan metadata:** (see final commit hash)

## Files Created/Modified

- `src/lib/hooks/use-recurring.ts` - All 14 recurring query/mutation hooks with recurringKeys factory
- `src/components/recurring/recurring-dashboard-card.tsx` - Dashboard summary card with stats, amount change alerts, loading/error states
- `src/components/layout/app-sidebar.tsx` - Added Recurring + Review Queue nav items with lucide icons
- `src/app/(dashboard)/payments/dashboard/page.tsx` - Added RecurringDashboardCard import and placement

## Decisions Made

- recurringKeys.seriesList accepts optional Record<string,string> — flexible for future filter expansion
- RecurringDashboardCard returns null on error (additive pattern) — dashboard remains functional when recurring API is unavailable
- monthlyTotal displayed in USD by default via formatCurrency — actual multi-currency support deferred to future enhancement

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

2 pre-existing TypeScript errors in `src/app/api/transactions/route.ts` and `src/app/api/vault/coverage/route.ts` were present before this plan and remain unmodified. No new errors introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All data-fetching hooks are available for plans 02, 03, and 04 (Recurring Masters list, Master detail, Review Queue pages)
- Sidebar navigation provides access to /recurring and /recurring/review
- Dashboard RecurringDashboardCard will display live data once the API endpoints (Phase 50) are deployed

---
*Phase: 51-ui-screens-verification*
*Completed: 2026-03-18*
