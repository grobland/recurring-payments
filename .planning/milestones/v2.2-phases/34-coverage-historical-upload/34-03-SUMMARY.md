---
phase: 34-coverage-historical-upload
plan: 03
subsystem: api
tags: [drizzle, postgresql, next.js, formdata, coverage-grid, statements]

# Dependency graph
requires:
  - phase: 34-coverage-historical-upload
    provides: Coverage grid API and historical upload modal (Plans 01 and 02)
provides:
  - statementDate populated on INSERT in batch/upload when targetMonth sent from modal
  - statementDate derived from earliest transaction date in batch/process for normal imports
  - historical-upload-modal sends targetMonth as statementDate for missing-cell uploads
affects:
  - vault/coverage API (reads statementDate — already correct, now gets populated data)
  - Coverage grid cells (green/yellow instead of all-gray after this fix)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional FormData field pattern: parse with fallback undefined, spread conditional into values object"
    - "Derived date pattern: Math.min(...timestamps) to find earliest transaction date"
    - "Guard pattern: !statement.statementDate prevents overwriting existing date on re-process"

key-files:
  created: []
  modified:
    - src/app/api/batch/upload/route.ts
    - src/app/api/batch/process/route.ts
    - src/components/vault/historical-upload-modal.tsx

key-decisions:
  - "statementDate parsed as first-of-month UTC date from yyyy-MM FormData string (avoids timezone edge cases)"
  - "batch/process derives statementDate only when statement.statementDate is null — historical uploads not overwritten"
  - "derivedStatementDate uses Math.min over timestamp array — safe with spread for typical statement sizes"

patterns-established:
  - "Conditional spread for optional DB fields: ...(value ? { field: value } : {}) in Drizzle insert/update"

requirements-completed:
  - VENH-01
  - VENH-02

# Metrics
duration: 12min
completed: 2026-02-21
---

# Phase 34 Plan 03: Coverage Pipeline statementDate Fix Summary

**Root-cause fix: statementDate now populated in both upload paths so coverage grid cells render green/yellow instead of all-gray**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-21T11:54:19Z
- **Completed:** 2026-02-21T12:06:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `batch/upload` accepts optional `statementDate` from FormData, parses yyyy-MM to first-of-month UTC Date, persists on INSERT
- `historical-upload-modal` sends `targetMonth` as `statementDate` when uploading for a missing coverage cell
- `batch/process` derives `statementDate` from earliest transaction date after AI extraction, only sets it when not already present (preserves historical upload value)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire statementDate through upload pipeline and historical upload modal** - `ceb7d07` (feat)
2. **Task 2: Derive statementDate from transaction dates in batch/process** - `31e8b9f` (feat)

**Plan metadata:** (committed with final docs commit)

## Files Created/Modified

- `src/app/api/batch/upload/route.ts` - Parses optional `statementDate` from FormData; includes in INSERT values when present
- `src/components/vault/historical-upload-modal.tsx` - Appends `formData.append("statementDate", targetMonth)` in the "missing" upload branch
- `src/app/api/batch/process/route.ts` - Selects `statementDate` in columns fetch; computes `derivedStatementDate` from `Math.min` of transaction timestamps; conditionally includes in UPDATE only when `statement.statementDate` is null

## Decisions Made

- **yyyy-MM parsed as first-of-month UTC:** `new Date(str + "-01T00:00:00Z")` avoids timezone ambiguity when the grid cell's month maps to a specific calendar month.
- **Guard against overwrite:** `!statement.statementDate && derivedStatementDate` ensures historical upload statementDate (set in Task 1) is never overwritten by the transaction-derived date in batch/process.
- **Coverage route unchanged:** The existing coverage API already correctly skips null-date statements and maps non-null dates to grid cells — only the population side needed fixing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both tasks executed cleanly with zero TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Root cause of all-gray coverage grid resolved: new uploads via historical upload wizard will show green cells; re-processed statements will derive dates from transactions and appear in the grid
- Existing statements with NULL statementDate remain gray until user re-imports or a future backfill migration runs (by design — noted in plan)
- Phase 34 is now functionally complete (Plans 01-03 shipped); UAT tests 3 and 11 should pass after a fresh upload

---
*Phase: 34-coverage-historical-upload*
*Completed: 2026-02-21*
