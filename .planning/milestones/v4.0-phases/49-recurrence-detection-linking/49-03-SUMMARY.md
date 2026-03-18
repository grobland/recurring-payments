---
phase: 49-recurrence-detection-linking
plan: "03"
subsystem: api
tags: [recurrence, detection, linking, orchestrator, batch-processing, pipeline]

# Dependency graph
requires:
  - phase: 49-01
    provides: detectRecurringSeries() — groups transactions by merchant entity and applies rules A-E
  - phase: 49-02
    provides: linkDetectedSeries() — upserts series records and links/creates recurring masters

provides:
  - recurrence-orchestrator.ts with detectAndLinkRecurrences() wiring detector + linker
  - batch/process pipeline calls detection after merchant resolution before statement completion
  - API response includes recurrenceDetected, mastersCreated, reviewItemsCreated stats

affects:
  - phase-50-apis-review-queue
  - phase-51-ui-screens

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Thin orchestrator pattern: glue function wires two services, catches all errors, returns null on failure (non-fatal)
    - Pipeline ordering: extract -> normalize -> deduplicate -> resolve merchants -> detect recurrences -> complete statement

key-files:
  created:
    - src/lib/services/recurrence-orchestrator.ts
    - tests/unit/recurrence-orchestrator.test.ts
  modified:
    - src/app/api/batch/process/route.ts

key-decisions:
  - "Orchestrator runs when normalizedTransactionCount > 0 OR lineItemCount > 0 (catches re-runs with existing line items)"
  - "recurrenceResult declared as let before if-block so it is in scope for the API response"
  - "Detection errors are non-fatal — returns null, pipeline continues to statement completion"

patterns-established:
  - "Non-fatal service wrappers: catch all errors, log with [recurrence] prefix, return null instead of throwing"
  - "API response enrichment: new pipeline stats appended to existing response shape, defaulting to 0 via nullish coalescing"

requirements-completed: [LINK-05, LINK-07]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 49 Plan 03: Recurrence Orchestration & Pipeline Integration Summary

**Thin orchestrator wiring detectRecurringSeries + linkDetectedSeries into batch/process pipeline with non-fatal error containment and recurrence stats in API response**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T10:06:33Z
- **Completed:** 2026-03-18T10:08:25Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Created recurrence-orchestrator.ts that chains the detector and linker, logs progress, and returns null on any error
- Integrated detectAndLinkRecurrences into batch/process route after merchant resolution, before statement completion
- API response now includes recurrenceDetected, mastersCreated, reviewItemsCreated counts
- 7 unit tests covering: error containment (detect throws, link throws), durationMs present, call ordering (detect before link), empty series handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Create recurrence orchestrator and wire into pipeline** - `f0a8297` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/lib/services/recurrence-orchestrator.ts` - Orchestrator calling detectRecurringSeries then linkDetectedSeries with non-fatal error handling
- `src/app/api/batch/process/route.ts` - Added import and detection call after merchant resolution; recurrence stats in response
- `tests/unit/recurrence-orchestrator.test.ts` - 7 tests for error containment, call ordering, and result structure

## Decisions Made

- Orchestrator runs when `normalizedTransactionCount > 0 || lineItemCount > 0` (not just normalized count) to handle re-runs where line items exist but no new transactions were inserted
- `recurrenceResult` declared as `let ... = null` before the conditional block so it is in scope for the `NextResponse.json()` call
- Pre-existing TypeScript errors in transactions/route.ts and vault/coverage/route.ts confirmed as unrelated — not in scope for this plan

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full end-to-end pipeline now functional: PDF upload -> extract -> normalize -> deduplicate -> resolve merchants -> detect recurrences -> link to masters
- Phase 50 (APIs & Review Queue) can expose the recurring_masters and review_queue_items data via REST endpoints
- Phase 51 (UI Screens) can display detected recurring payments and review queue

---
*Phase: 49-recurrence-detection-linking*
*Completed: 2026-03-18*
