---
phase: 41-e2e-test-infrastructure
plan: "03"
subsystem: testing
tags: [playwright, e2e, csv-export, overlap-detection, onboarding, test-infrastructure]

# Dependency graph
requires:
  - phase: 41-01
    provides: Fixed auth setup, v3.0 URL paths, data-testid attributes
provides:
  - export.spec.ts: 3 test.skip tests for CSV export (Phase 42 EXPRT-01, EXPRT-02)
  - overlap.spec.ts: 3 test.skip skeleton tests for overlap detection (Phase 43 OVRLP-01..03)
  - onboarding.spec.ts: 3 active tests for onboarding wizard (page load, step navigation, skip flow)
affects: [42-csv-export, 43-overlap-detection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "test.skip with phase/requirement comments — marks future tests with clear un-skip instructions"
    - "Onboarding tests navigate to /onboarding and interact with the 4-step wizard UI"
    - "Skip flow test uses waitForURL glob pattern to handle query params on /payments/dashboard"

key-files:
  created:
    - tests/e2e/export.spec.ts
    - tests/e2e/overlap.spec.ts
    - tests/e2e/onboarding.spec.ts
  modified: []

key-decisions:
  - "All export tests use test.skip — Phase 42 ships the export button, un-skipping EXPRT-01 and EXPRT-02"
  - "All overlap tests use test.skip — Phase 43 ships overlap detection, un-skipping OVRLP-01..03"
  - "Onboarding skip test uses waitForURL glob **/payments/dashboard** to survive Phase 44 query params"
  - "Onboarding tests written against actual Step 0 UI: Welcome title, Skip setup button, Continue button"

patterns-established:
  - "test.skip phase comments: include phase number and requirement ID for easy discovery (e.g., '// Phase 42: EXPRT-01')"
  - "Skeleton test bodies: even skipped tests have real assertion code ready to execute"

requirements-completed: [TEST-02]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 41 Plan 03: Export, Overlap, and Onboarding E2E Specs Summary

**3 new Playwright spec files: export (3 skipped for Phase 42), overlap (3 skipped for Phase 43), onboarding (3 active tests against existing wizard UI)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T00:08:51Z
- **Completed:** 2026-03-03T00:10:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created export.spec.ts with 3 test.skip tests covering CSV download trigger, content-type verification, and transaction export — all ready to un-skip when Phase 42 ships EXPRT-01/EXPRT-02
- Created overlap.spec.ts with 3 test.skip skeleton tests for Phase 43 overlap detection (OVRLP-01, OVRLP-02, OVRLP-03) with real assertion stubs
- Created onboarding.spec.ts with 3 active tests: page load (Welcome step verification), step navigation (Continue → Profile, Back → Welcome), and skip flow (Skip setup → /payments/dashboard)
- All spec files have beforeEach console capture per project convention

## Task Commits

Each task was committed atomically:

1. **Task 1: Write export and overlap spec files** - `21826ff` (feat)
2. **Task 2: Write onboarding spec file** - `5a3cbe4` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tests/e2e/export.spec.ts` - 3 test.skip tests for CSV export feature (ships Phase 42); covers subscription download, content-type header, and transaction export
- `tests/e2e/overlap.spec.ts` - 3 test.skip skeleton tests for overlap detection (ships Phase 43); covers badge appearance, dismissal, and re-surface logic
- `tests/e2e/onboarding.spec.ts` - 3 active tests for 4-step onboarding wizard; covers page load, step navigation with Back button, and Skip setup redirect

## Decisions Made
- Export and overlap tests are all test.skip because the features don't exist yet — tests have real assertion bodies ready for Phase 42/43 to un-skip
- Onboarding tests written against the actual onboarding page Step 0 UI: "Welcome to Subscription Manager" heading, "Skip setup" button, "Continue" button
- Step navigation test advances to Step 1 ("Your Profile") using the Continue button, then returns with Back
- Skip flow uses `**/payments/dashboard**` glob in waitForURL per the established pattern from Plan 41-01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All 9 test slots from TEST-02 are now defined across 3 plan iterations (Plans 41-01, 41-02, 41-03)
- Phase 42 (CSV Export) can un-skip export.spec.ts tests by removing test.skip from EXPRT-01/EXPRT-02 tests
- Phase 43 (Overlap Detection) can un-skip overlap.spec.ts tests when badges and dismissal ship
- export.spec.ts and overlap.spec.ts have clear phase/requirement comments for easy discovery

---
*Phase: 41-e2e-test-infrastructure*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: tests/e2e/export.spec.ts
- FOUND: tests/e2e/overlap.spec.ts
- FOUND: tests/e2e/onboarding.spec.ts
- FOUND: commit 21826ff (Task 1: export and overlap specs)
- FOUND: commit 5a3cbe4 (Task 2: onboarding spec)
- VERIFIED: export.spec.ts has 3 tests (all test.skip)
- VERIFIED: overlap.spec.ts has 3 tests (all test.skip)
- VERIFIED: onboarding.spec.ts has 3 active tests
- VERIFIED: All files exceed minimum line requirements (export: 47, overlap: 28, onboarding: 52)
