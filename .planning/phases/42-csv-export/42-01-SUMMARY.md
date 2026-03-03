---
phase: 42-csv-export
plan: 01
subsystem: api
tags: [csv, security, formula-injection, utf8, vitest, tdd]

# Dependency graph
requires: []
provides:
  - "sanitizeFormulaInjection() function in csv.ts — tab-prefix for formula trigger chars (=, +, -, @, \\t, \\r)"
  - "UTF-8 BOM prepended in createCSVResponse() for Excel international character support"
  - "Unit tests covering EXPRT-03 and EXPRT-04 in tests/unit/csv.test.ts (21 tests)"
affects: [42-02, 42-03, 42-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD (RED-GREEN): write failing tests first, then implement to make them pass"
    - "Formula injection prevention via tab-prefix (OWASP CWE-1236) inside escapeCSVValue"
    - "UTF-8 BOM only in createCSVResponse (transport level), not in objectsToCSV (data level), to prevent double-BOM"
    - "BOM tests use arrayBuffer() not response.text() — TextDecoder strips BOM on read by default"

key-files:
  created:
    - tests/unit/csv.test.ts
  modified:
    - src/lib/utils/csv.ts

key-decisions:
  - "Test file placed in tests/unit/ (not src/lib/utils/) to match vitest config include pattern"
  - "BOM tests verify raw bytes via arrayBuffer() because response.text() strips BOM via TextDecoder default behavior"
  - "sanitizeFormulaInjection is private (not exported) — called inside escapeCSVValue before quoting logic"
  - "BOM added only in createCSVResponse, not objectsToCSV — prevents double-BOM if CSV string is used directly"

patterns-established:
  - "Pattern 1: escapeCSVValue calls sanitizeFormulaInjection before quoting — central protection for all CSV output"
  - "Pattern 2: BOM is a transport concern (createCSVResponse) not a data concern (objectsToCSV)"

requirements-completed: [EXPRT-03, EXPRT-04]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 42 Plan 01: CSV Formula Injection Sanitization and UTF-8 BOM Summary

**Tab-prefix formula injection sanitization (CWE-1236) and UTF-8 BOM added to csv.ts via TDD, with 21 unit tests covering all trigger characters and byte-level BOM verification**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-03T09:00:56Z
- **Completed:** 2026-03-03T09:03:49Z
- **Tasks:** 2 (RED test commit + GREEN implementation commit)
- **Files modified:** 2

## Accomplishments

- Added `sanitizeFormulaInjection()` private function — tab-prefix for cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` per OWASP CWE-1236 guidance
- Wired sanitization inside `escapeCSVValue()` before quoting logic — all CSV output automatically protected
- Added UTF-8 BOM (`\uFEFF`) to `createCSVResponse()` body — Excel auto-detects UTF-8 for international characters
- 21 unit tests passing covering all 6 formula trigger characters, BOM byte verification, and existing behavior preservation

## Task Commits

Each task was committed atomically:

1. **Task RED: Failing unit tests** - `762a56b` (test)
2. **Task GREEN: CSV implementation** - `1f0cae4` (feat)

_TDD plan: test commit (RED) then implementation commit (GREEN)_

## Files Created/Modified

- `tests/unit/csv.test.ts` - 21 unit tests for formula injection (EXPRT-03) and BOM (EXPRT-04)
- `src/lib/utils/csv.ts` - Added `sanitizeFormulaInjection()`, updated `escapeCSVValue()`, added BOM to `createCSVResponse()`

## Decisions Made

- Test file placed in `tests/unit/csv.test.ts` rather than the plan-specified `src/lib/utils/csv.test.ts` — vitest config `include` pattern only discovers `tests/unit/**/*.test.{ts,tsx}`
- BOM tests verify via `arrayBuffer()` (checks raw bytes EF BB BF) not `response.text()` — default TextDecoder strips BOM on decode, causing false failures
- `sanitizeFormulaInjection` is private (not exported) — internal implementation detail of `escapeCSVValue`
- BOM added only in `createCSVResponse` (transport level), not `objectsToCSV` (data level), to prevent double-BOM if the CSV string is ever used outside the response function

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file location moved from src/ to tests/unit/**
- **Found during:** Task RED (creating test file)
- **Issue:** Plan specified `src/lib/utils/csv.test.ts` but vitest.config.ts `include` pattern only covers `tests/unit/**/*.test.{ts,tsx}` — test file would not be discovered
- **Fix:** Created test file at `tests/unit/csv.test.ts` to match vitest config
- **Files modified:** tests/unit/csv.test.ts (created at correct path)
- **Verification:** `npm run test -- tests/unit/csv.test.ts --run` discovers and runs all 21 tests
- **Committed in:** 762a56b (RED phase commit)

**2. [Rule 1 - Bug] BOM test assertions updated from text() to arrayBuffer()**
- **Found during:** Task GREEN (making tests pass)
- **Issue:** `response.text()` uses default TextDecoder which strips the UTF-8 BOM on read, causing BOM presence tests to fail even though BOM was correctly in the bytes
- **Fix:** Updated BOM tests to use `arrayBuffer()` and verify bytes `0xEF 0xBB 0xBF` directly
- **Files modified:** tests/unit/csv.test.ts
- **Verification:** Node.js confirmed BOM bytes EF BB BF present in arrayBuffer; all 21 tests now pass
- **Committed in:** 1f0cae4 (GREEN phase commit)

---

**Total deviations:** 2 auto-fixed (1 blocking path issue, 1 bug in test assertion approach)
**Impact on plan:** Both auto-fixes essential for tests to run and pass correctly. No scope creep.

## Issues Encountered

- `response.text()` stripping BOM is a documented behavior of the WHATWG TextDecoder API — the BOM is correctly written to bytes, it is just not visible via the text interface. Tests now accurately verify the actual file bytes that Excel and other apps receive.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `csv.ts` is fully patched with formula injection protection and BOM — ready for Plans 42-02 through 42-04 which add export buttons to UI
- The existing `/api/subscriptions/export/route.ts` already uses `objectsToCSV` + `createCSVResponse`, so it automatically benefits from these security/compatibility fixes
- Tests for EXPRT-01 and EXPRT-02 exist at `tests/e2e/export.spec.ts` (skipped from Phase 41) — can be un-skipped once the UI export buttons ship

## Self-Check: PASSED

- tests/unit/csv.test.ts: FOUND
- src/lib/utils/csv.ts: FOUND
- .planning/phases/42-csv-export/42-01-SUMMARY.md: FOUND
- Commit 762a56b (RED phase): FOUND
- Commit 1f0cae4 (GREEN phase): FOUND

---
*Phase: 42-csv-export*
*Completed: 2026-03-03*
