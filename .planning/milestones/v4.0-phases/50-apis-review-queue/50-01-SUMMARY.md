---
phase: 50-apis-review-queue
plan: 01
subsystem: api
tags: [drizzle, zod, nextjs, postgres, recurring-payments]

# Dependency graph
requires:
  - phase: 49-recurrence-detection-linking
    provides: recurringSeries, recurringMasters, recurringMasterSeriesLinks, recurringEvents tables with data
  - phase: 47-schema-domain-model
    provides: userTransactionLabels, reviewQueueItems, merchantEntities schema
provides:
  - GET /api/statements — paginated statement list with account join and cursor pagination
  - POST /api/transactions/[id]/label — upsert user label into user_transaction_labels
  - GET /api/recurring/series — paginated series list with status/confidence filters
  - GET /api/recurring/series/[id] — series detail with transactions and linked master
  - POST /api/recurring/series/[id]/confirm — create or link recurring master in db.transaction()
  - POST /api/recurring/series/[id]/ignore — deactivate series, resolve review queue items
  - src/lib/validations/recurring.ts — Zod schemas for all recurring API inputs
affects:
  - 51-ui-screens-verification
  - any future recurring masters API plans

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Keyset cursor pagination using (timestamp DESC, id DESC) compound cursor
    - Auth check + isUserActive feature gate pattern on write endpoints
    - db.transaction() returning value via async callback return
    - onConflictDoUpdate for upsert with explicit conflict target columns

key-files:
  created:
    - src/lib/validations/recurring.ts
    - src/app/api/statements/route.ts
    - src/app/api/transactions/[id]/label/route.ts
    - src/app/api/recurring/series/route.ts
    - src/app/api/recurring/series/[id]/route.ts
    - src/app/api/recurring/series/[id]/confirm/route.ts
    - src/app/api/recurring/series/[id]/ignore/route.ts
  modified: []

key-decisions:
  - "confirmSeriesSchema uses existingMasterId optional UUID — caller decides create vs link"
  - "db.transaction() in confirm returns new master ID via callback return value to satisfy TypeScript definite assignment"
  - "Statements list uses (createdAt, id) compound cursor; series list uses (updatedAt, id)"
  - "Ignore endpoint resolves review queue items in same request — no separate endpoint needed"

patterns-established:
  - "Keyset cursor: (timestamp DESC, id DESC) compound cursor for stable pagination"
  - "Feature gate: every write endpoint checks isUserActive(session.user)"
  - "db.transaction returns: async callback returns value instead of assigning outer let"

requirements-completed: [API-01, API-02, API-03, API-04]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 50 Plan 01: APIs & Review Queue (Part 1) Summary

**Seven REST endpoints — statement listing, transaction labeling, and full recurring series CRUD with confirm/ignore actions — backed by seven Zod schemas**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T10:23:56Z
- **Completed:** 2026-03-18T10:27:19Z
- **Tasks:** 2
- **Files modified:** 7 created

## Accomplishments

- Zod validation schema file with 7 schemas covering all recurring API inputs
- GET /api/statements with accountId filter and keyset cursor pagination
- POST /api/transactions/[id]/label with upsert into user_transaction_labels using onConflictDoUpdate
- GET /api/recurring/series with status/minConfidence filters, merchant name join, and cursor pagination
- GET /api/recurring/series/[id] returning series detail with linked transactions and master link
- POST /api/recurring/series/[id]/confirm creating or linking recurring masters in db.transaction()
- POST /api/recurring/series/[id]/ignore deactivating series and resolving review queue items

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schemas + statement list + transaction label endpoints** - `98953b2` (feat)
2. **Task 2: Recurring series CRUD and action endpoints** - `815d2f8` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/lib/validations/recurring.ts` - 7 Zod schemas: labelTransactionSchema, confirmSeriesSchema, resolveReviewSchema, createMasterSchema, updateMasterSchema, mergeSchema, statusChangeSchema
- `src/app/api/statements/route.ts` - GET with accountId filter, left join financialAccounts, cursor pagination
- `src/app/api/transactions/[id]/label/route.ts` - POST with auth + isUserActive gate, ownership verify, upsert
- `src/app/api/recurring/series/route.ts` - GET with status/confidence filters, merchantEntities join, cursor
- `src/app/api/recurring/series/[id]/route.ts` - GET detail with recurringSeriesTransactions and master link
- `src/app/api/recurring/series/[id]/confirm/route.ts` - POST create or link master in db.transaction()
- `src/app/api/recurring/series/[id]/ignore/route.ts` - POST deactivate + resolve review queue items

## Decisions Made

- `db.transaction()` async callback returns the new master ID so TypeScript can definitively assign the outer `masterId` variable — avoids "used before assigned" error
- Statement list uses `(createdAt, id)` compound cursor since statements don't have an `updatedAt`; series list uses `(updatedAt, id)`
- Ignore endpoint resolves associated review queue items in the same handler — avoids a separate "resolve" endpoint for the common case

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript definite assignment error in confirm endpoint**
- **Found during:** Task 2 (confirm route)
- **Issue:** `let masterId: string` assigned inside `db.transaction()` callback; TypeScript cannot guarantee assignment from async callback and flags "used before assigned"
- **Fix:** Refactored `db.transaction()` to return the new master ID from the callback; assigned `masterId = await db.transaction(...)` so TypeScript sees definite assignment
- **Files modified:** `src/app/api/recurring/series/[id]/confirm/route.ts`
- **Verification:** `npx tsc --noEmit` — 0 errors in new files
- **Committed in:** 815d2f8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Minor TypeScript correctness fix. No scope creep.

## Issues Encountered

- Two pre-existing TypeScript errors in `src/app/api/transactions/route.ts` (missing `normalizedDescription`/`sourceHash` fields on `TransactionWithSource`) and `src/app/api/vault/coverage/route.ts` (`.toISOString` called without parentheses). Both are out of scope — logged but not fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 series + statement API endpoints ready for UI consumption in Phase 51
- Zod schemas exportable from `src/lib/validations/recurring.ts` for use in review queue endpoints
- API-01 (accounts) already satisfied by existing accounts routes
- API-02, API-03, API-04 completed in this plan

---
*Phase: 50-apis-review-queue*
*Completed: 2026-03-18*
