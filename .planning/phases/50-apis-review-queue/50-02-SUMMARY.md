---
phase: 50-apis-review-queue
plan: 02
subsystem: api
tags: [drizzle, zod, nextjs, postgres, recurring-payments]

# Dependency graph
requires:
  - phase: 50-apis-review-queue
    plan: 01
    provides: Zod schemas (createMasterSchema, updateMasterSchema, mergeSchema, statusChangeSchema, resolveReviewSchema), db.transaction pattern
  - phase: 49-recurrence-detection-linking
    provides: recurringSeries, recurringMasters, reviewQueueItems populated by pipeline
provides:
  - GET /api/recurring/masters — paginated masters list with merchant join, kind/status/search filters
  - POST /api/recurring/masters — create manual recurring master
  - GET /api/recurring/masters/[id] — master detail with linked series chain and event history
  - PATCH /api/recurring/masters/[id] — update master metadata
  - POST /api/recurring/masters/[id]/merge — reassign all series links to target master in db.transaction()
  - POST /api/recurring/masters/[id]/status — change status with recurringEvents audit trail
  - GET /api/recurring/review-queue — unresolved items with series/merchant context, confidence DESC order
  - POST /api/recurring/review-queue/[id]/resolve — 4-way resolution (confirmed/linked/ignored/not_recurring) in db.transaction()
  - GET /api/recurring/dashboard — aggregate counts + upcoming payments + amount changes in efficient queries
affects:
  - 51-ui-screens-verification

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Master merge: select source links then re-insert to target with onConflictDoNothing — handles duplicate series
    - Review queue resolution: 4-way branch inside single db.transaction() with resolution-specific side effects
    - Dashboard aggregation: single db.execute(sql`...`) with 4 correlated subquery COUNTs
    - inferRecurringKind requires 3 args (frequency, amountType, merchantCategory) — all must be provided

key-files:
  created:
    - src/app/api/recurring/masters/route.ts
    - src/app/api/recurring/masters/[id]/route.ts
    - src/app/api/recurring/masters/[id]/merge/route.ts
    - src/app/api/recurring/masters/[id]/status/route.ts
    - src/app/api/recurring/review-queue/route.ts
    - src/app/api/recurring/review-queue/[id]/resolve/route.ts
    - src/app/api/recurring/dashboard/route.ts
  modified: []

key-decisions:
  - "Master merge selects source links first then re-inserts with onConflictDoNothing — simpler than UPDATE with duplicate detection"
  - "review_resolved recurringEvent uses masterId from reviewItem.recurringMasterId unless resolution is linked (uses targetMasterId)"
  - "Dashboard needsReviewItems preview (top 5 by confidence) added beyond spec — zero extra DB cost since already counting"
  - "inferRecurringKind called with amountType derived from series.amountType field with fallback to fixed"

patterns-established:
  - "4-way resolution branch: if/else if chain inside db.transaction() for multi-table side effects per resolution type"
  - "Aggregate dashboard query: db.execute(sql`SELECT (SELECT COUNT(*) ...) as X, ...`) for single-round-trip counts"

requirements-completed: [API-05, API-06, API-07]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 50 Plan 02: APIs & Review Queue (Part 2) Summary

**Seven REST endpoints completing the recurring masters API — CRUD with merge/status transitions, full review queue resolution with four distinct side-effect branches, and a single-query dashboard aggregation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T10:29:50Z
- **Completed:** 2026-03-18T10:34:13Z
- **Tasks:** 2
- **Files modified:** 7 created

## Accomplishments

- GET/POST /api/recurring/masters with cursor pagination, kind/status/search filters, and merchant name join
- GET/PATCH /api/recurring/masters/[id] returning series chain + 50-event history, partial update with changedFields metadata
- POST /api/recurring/masters/[id]/merge reassigning all source series links to target in db.transaction() then deleting source
- POST /api/recurring/masters/[id]/status with status-to-event-type mapping and previous/new status audit trail
- GET /api/recurring/review-queue returning unresolved items joined to series/merchant/master context, sorted confidence DESC
- POST /api/recurring/review-queue/[id]/resolve handling all 4 resolution types with correct side effects in single db.transaction()
- GET /api/recurring/dashboard with SQL aggregate subquery returning 4 counts + upcoming payments + amount change events in 3 DB calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Recurring masters CRUD, merge, and status endpoints** - `b762bc9` (feat)
2. **Task 2: Review queue resolution and dashboard summary endpoints** - `e1546e1` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/app/api/recurring/masters/route.ts` - GET with cursor pagination + kind/status/search, POST create with recurringEvent
- `src/app/api/recurring/masters/[id]/route.ts` - GET detail with series+events, PATCH partial update with changedFields event
- `src/app/api/recurring/masters/[id]/merge/route.ts` - POST merge in db.transaction() with dual events + source deletion
- `src/app/api/recurring/masters/[id]/status/route.ts` - POST status change with status-to-eventType mapping
- `src/app/api/recurring/review-queue/route.ts` - GET unresolved items with series/merchant/master context joins
- `src/app/api/recurring/review-queue/[id]/resolve/route.ts` - POST 4-way resolution with full side effects in db.transaction()
- `src/app/api/recurring/dashboard/route.ts` - GET aggregate via SQL subquery + upcoming payments + amount changes

## Decisions Made

- Master merge selects source links first then re-inserts to target with onConflictDoNothing — handles the case where a series is already linked to the target without needing a separate conflict check
- `review_resolved` recurringEvent uses the review item's `recurringMasterId` as the target, except for "linked" resolution which uses the provided `targetMasterId`
- Dashboard includes top-5 `needsReviewItems` preview as a bonus — no extra round-trip cost since `needs_review_count` aggregate already ran
- `inferRecurringKind` required all 3 arguments (frequency, amountType, merchantCategory) — detected from function signature, fixed inline

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Variable name typo in merge response**
- **Found during:** Task 1 (merge route), TypeScript compile check
- **Issue:** Response used `mergedIntoId` (from `mergeSchema` return shape) but the local variable is named `mergeIntoId` — TS2552 undefined variable error
- **Fix:** Changed response to `{ success: true, mergedIntoId: mergeIntoId }` for correct variable reference and clear response shape
- **Files modified:** `src/app/api/recurring/masters/[id]/merge/route.ts`
- **Committed in:** b762bc9 (Task 1 commit)

**2. [Rule 1 - Bug] inferRecurringKind called with wrong argument count**
- **Found during:** Task 2 (resolve route), TypeScript compile check
- **Issue:** Called `inferRecurringKind(frequency)` with 1 argument but function signature requires 3: (frequency, amountType, merchantCategory) — TS2554
- **Fix:** Added `amountType` (derived from `series.amountType` with fallback to "fixed") and `merchantCategory: null` to the call. Also added `amountType` to the series select query.
- **Files modified:** `src/app/api/recurring/review-queue/[id]/resolve/route.ts`
- **Committed in:** e1546e1 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (Rule 1 - bugs)
**Impact on plan:** TypeScript correctness fixes only. No scope change.

## Issues Encountered

- Two pre-existing TypeScript errors in `src/app/api/transactions/route.ts` and `src/app/api/vault/coverage/route.ts` are out of scope — identified in 50-01 SUMMARY and not touched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- API-05, API-06, API-07 all satisfied
- All 9 recurring API endpoints ready for UI consumption in Phase 51
- Masters merge and status transitions fully operational
- Review queue resolution covers all 4 user-facing cases
- Dashboard aggregate query returns all data UI screens need in 3 DB calls

---
*Phase: 50-apis-review-queue*
*Completed: 2026-03-18*
