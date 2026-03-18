---
phase: 48-ingestion-merchant-resolution
plan: 02
subsystem: database
tags: [drizzle, postgresql, pg_trgm, fuzzy-matching, merchant-resolution, vitest]

# Dependency graph
requires:
  - phase: 47-schema-domain-model
    provides: merchantEntities and merchantAliases tables with trigram GIN indexes
provides:
  - resolveMerchant function: 3-step descriptor-to-entity resolution (exact, fuzzy, auto-create)
  - MerchantResolution type: typed result with matchType and optional similarity score
  - Unit tests for all 3 resolution paths
affects:
  - 48-03 (ingestion pipeline — will call resolveMerchant for each normalized descriptor)
  - 49-recurrence-detection (merchant entities provide canonical grouping for recurrence)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Injectable db client pattern for testable Drizzle service functions
    - Sequenced mock db pattern for testing chained Drizzle query builders

key-files:
  created:
    - src/lib/services/merchant-resolver.ts
    - tests/unit/merchant-resolver.test.ts
  modified: []

key-decisions:
  - "Test file placed in tests/unit/ (not src/lib/services/) — Vitest config restricts include pattern to tests/unit/**/*.test.{ts,tsx}"
  - "DbClient type alias from typeof defaultDb enables testability without a full mock type"
  - "lowerDescriptor local variable avoids redundant .toLowerCase() calls across all 3 query steps"

patterns-established:
  - "Injectable db pattern: pass db instance as first arg to service functions for unit testability"
  - "Convenience wrapper: resolveMerchantWithDefaultDb wraps resolveMerchant with the default db for production use"
  - "Sequenced mock: makeSequencedDb tracks call count to return different results per select invocation"

requirements-completed: [MERCH-02, MERCH-03, MERCH-04]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 48 Plan 02: Merchant Resolver Service Summary

**Drizzle service with exact + pg_trgm fuzzy alias matching and idempotent auto-creation of merchant entities, with 5 passing unit tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T09:26:03Z
- **Completed:** 2026-03-18T09:28:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `resolveMerchant(db, userId, normalizedDescriptor)` with 3-step resolution: exact alias match, pg_trgm fuzzy match (0.4 threshold), auto-create new entity
- New merchant entities use `onConflictDoUpdate` for idempotent upsert; aliases use `onConflictDoNothing` for race condition safety
- Unit tests cover all 3 resolution paths plus negative cases (insert not called on match), all 5 passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create merchant resolver service with exact match, fuzzy match, and auto-creation** - `4ef2eb9` (feat)
2. **Task 2: Create merchant resolver unit test with mocked DB** - `007ab94` (test)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/lib/services/merchant-resolver.ts` - Core resolver service with resolveMerchant and resolveMerchantWithDefaultDb exports
- `tests/unit/merchant-resolver.test.ts` - 5 unit tests covering exact/fuzzy/new paths and insert-not-called assertions

## Decisions Made
- Test file placed in `tests/unit/` rather than `src/lib/services/` because Vitest config restricts the `include` pattern to `tests/unit/**/*.test.{ts,tsx}`
- Used injectable `DbClient` type (typeof defaultDb) rather than an interface — simpler, avoids over-engineering, Drizzle's return type inference still works
- `lowerDescriptor` computed once at function start to avoid repeated `.toLowerCase()` across all 3 steps

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file relocated from src/ to tests/unit/**
- **Found during:** Task 2 (creating unit test)
- **Issue:** Plan specified `src/lib/services/merchant-resolver.test.ts` but Vitest config `include` pattern is `tests/unit/**/*.test.{ts,tsx}` — test was not discovered
- **Fix:** Created test at `tests/unit/merchant-resolver.test.ts` instead; imported resolver via `@/lib/services/merchant-resolver` path alias
- **Files modified:** tests/unit/merchant-resolver.test.ts (new location)
- **Verification:** `npx vitest run tests/unit/merchant-resolver.test.ts` — 5 tests pass
- **Committed in:** 007ab94 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking — wrong test file location)
**Impact on plan:** Required to make tests discoverable by Vitest. No scope creep.

## Issues Encountered
- Vitest `include` pattern in vitest.config.ts limits test discovery to `tests/unit/` — plan's specified test path `src/lib/services/` would silently fail. Fixed by relocating test file.

## Next Phase Readiness
- `resolveMerchant` is ready for Plan 03 (ingestion pipeline) to call after merchant normalization
- Function signature: `resolveMerchant(db, userId, normalizedDescriptor): Promise<MerchantResolution>`
- No blockers

## Self-Check: PASSED

- FOUND: src/lib/services/merchant-resolver.ts
- FOUND: tests/unit/merchant-resolver.test.ts
- FOUND: .planning/phases/48-ingestion-merchant-resolution/48-02-SUMMARY.md
- FOUND commit: 4ef2eb9 feat(48-02)
- FOUND commit: 007ab94 test(48-02)

---
*Phase: 48-ingestion-merchant-resolution*
*Completed: 2026-03-18*
