---
phase: 48-ingestion-merchant-resolution
plan: 01
subsystem: api
tags: [normalization, merchant, transaction, hashing, sha256, parser, openai]

# Dependency graph
requires:
  - phase: 47-schema-domain-model
    provides: transactions.normalizedDescription, transactions.sourceHash columns, DocumentType enum

provides:
  - normalizeMerchantDescriptor function (merchant-normalization.ts)
  - isTransferOrRefund function (transfer-detection.ts)
  - generateSourceHash function (source-hash.ts)
  - StatementParser interface (parser-interface.ts)
  - GenericStatementParser class wrapping all 3 OpenAI extractors

affects:
  - 48-02 (merchant resolver service uses normalizeMerchantDescriptor and isTransferOrRefund)
  - 48-03 (pipeline integration uses all 4 utilities as building blocks)
  - 49-recurrence-detection (consumes transactions with normalizedDescription and sourceHash)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure utility functions with no DB dependencies — testable in isolation"
    - "TDD workflow: RED tests first, then GREEN implementation, fix until passing"
    - "Tests in tests/unit/ not co-located with source (vitest.config.ts include pattern)"
    - "Regex pipeline: ordered rules applied sequentially to input string"
    - "Exhaustive switch with never type for compile-time document type coverage"

key-files:
  created:
    - src/lib/utils/merchant-normalization.ts
    - src/lib/utils/transfer-detection.ts
    - src/lib/utils/source-hash.ts
    - src/lib/openai/parser-interface.ts
    - tests/unit/merchant-normalization.test.ts
    - tests/unit/transfer-detection.test.ts
    - tests/unit/source-hash.test.ts
  modified: []

key-decisions:
  - "Test files placed in tests/unit/ (not co-located) to match vitest.config.ts include pattern: tests/unit/**/*.test.{ts,tsx}"
  - "Geo suffix regex updated from bare 2-letter code to optional-city + optional-digits + 2-letter code to handle TESCO STORES 3287 LONDON GB and SQ*COFFEE SHOP LONDON GB test cases"
  - "generateSourceHash is synchronous (createHash is sync) despite plan mentioning Promise — exported as plain function"

patterns-established:
  - "Merchant normalization: lowercase → strip prefixes → strip trailing digits (6+) → strip business suffixes → strip geo suffixes → collapse spaces → trim"
  - "Transfer detection: lowercase → includes() check against keyword list (intentionally broad)"
  - "Source hash: SHA-256 of statementId:sequenceNumber via Node.js crypto"

requirements-completed: [INGEST-04, INGEST-05, INGEST-06, INGEST-07, INGEST-08, MERCH-01, SEC-04]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 48 Plan 01: Utility Functions & Parser Abstraction Summary

**Pure merchant normalization, transfer detection, source hash generation, and StatementParser abstraction — 48 unit tests, all passing, no DB dependencies**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T09:26:03Z
- **Completed:** 2026-03-18T09:29:52Z
- **Tasks:** 2
- **Files modified:** 7 (4 source, 3 test)

## Accomplishments

- `normalizeMerchantDescriptor` strips 8+ processor prefixes (SQ*, PAYPAL*, STRIPE*, GOOGLE*, APPLE.COM*, TST*, PP*, CKO*), business suffixes (LTD/LLC/INC/CO/PLC/CORP), trailing 6+ digit reference numbers, and geographic suffixes (city + 2-letter country code)
- `isTransferOrRefund` identifies 10 transfer/refund patterns via substring match — intentionally broad, false positives acceptable
- `generateSourceHash` produces deterministic 64-char SHA-256 hex from `statementId:sequenceNumber` for idempotent pipeline re-processing
- `StatementParser` interface + `GenericStatementParser` class wraps all 3 existing OpenAI extractors with exhaustive type switch

## Task Commits

Each task was committed atomically:

1. **Task 1: Merchant normalization and transfer detection utilities** - `94f8d98` (feat)
2. **Task 2: Source hash utility and parser abstraction** - `245cd6c` (feat)

**Plan metadata:** `e6626f8` (docs: complete plan)

_Note: TDD tasks had RED → GREEN cycle. One implementation fix required (geo suffix regex) between RED and GREEN for Task 1._

## Files Created/Modified

- `src/lib/utils/merchant-normalization.ts` - `normalizeMerchantDescriptor(raw: string): string` — 7-step regex pipeline
- `src/lib/utils/transfer-detection.ts` - `isTransferOrRefund(description: string): boolean` — keyword includes check
- `src/lib/utils/source-hash.ts` - `generateSourceHash(statementId, sequenceNumber): string` — SHA-256 via Node.js crypto
- `src/lib/openai/parser-interface.ts` - `StatementParser` interface, `GenericStatementParser` class, `LineItemExtractionResult` type
- `tests/unit/merchant-normalization.test.ts` - 24 tests covering all processor prefixes, suffixes, edge cases
- `tests/unit/transfer-detection.test.ts` - 16 tests covering all keywords, case-insensitivity, false positives
- `tests/unit/source-hash.test.ts` - 8 tests covering determinism, uniqueness, length, format

## Decisions Made

- Test files placed in `tests/unit/` (not co-located with source) to match project's vitest.config.ts `include: ["tests/unit/**/*.test.{ts,tsx}"]` pattern
- `generateSourceHash` implemented as synchronous function — Node.js `createHash` is sync, no async needed
- Geo suffix regex extended from bare 2-letter code to `(\s+\d+)?(\s+[a-z]+)?\s+[a-z]{2}$` to correctly strip "TESCO STORES 3287 LONDON GB" and "SQ*COFFEE SHOP LONDON GB" per test spec
- Exhaustive switch in `GenericStatementParser` uses `never` type guard for compile-time coverage of new document types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Geo suffix regex insufficient for city + country patterns**
- **Found during:** Task 1 (normalizeMerchantDescriptor GREEN phase)
- **Issue:** Plan's rule 5 described stripping `\s+[A-Z]{2}$` (bare 2-letter code) but test cases "SQ*COFFEE SHOP LONDON GB" → "coffee shop" and "TESCO STORES 3287 LONDON GB" → "tesco stores" require stripping city names and short numeric codes too
- **Fix:** Updated regex to `(\s+\d+)?(\s+[a-z]+)?\s+[a-z]{2}$` to match optional digits + optional city word + 2-letter country code as a unit
- **Files modified:** `src/lib/utils/merchant-normalization.ts`
- **Verification:** All 24 merchant normalization tests pass including both failing cases
- **Committed in:** `94f8d98` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix to correctly implement the test spec. The plan's rule description was ambiguous; the test cases were authoritative.

**2. [Rule 3 - Blocking] Test file paths corrected for vitest config**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** Plan specified test files at `src/lib/utils/*.test.ts` but vitest.config.ts only scans `tests/unit/**/*.test.{ts,tsx}`
- **Fix:** Created test files in `tests/unit/` instead of `src/lib/utils/`
- **Files modified:** N/A (path correction, not a file modification)
- **Verification:** Tests discovered and run by vitest
- **Committed in:** `94f8d98` (Task 1 commit)

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All building blocks ready for Plan 02 (merchant resolver service): `normalizeMerchantDescriptor` and `isTransferOrRefund` are the utility inputs, `generateSourceHash` is ready for pipeline integration
- `StatementParser` interface ready for Plan 03 (pipeline integration)
- Pre-existing TypeScript errors in `src/app/api/transactions/route.ts` and `src/app/api/vault/coverage/route.ts` reference Phase 47 schema columns (`normalizedDescription`, `sourceHash`) — these will be resolved when those API routes are updated in Phase 48 Plan 03

---
*Phase: 48-ingestion-merchant-resolution*
*Completed: 2026-03-18*
