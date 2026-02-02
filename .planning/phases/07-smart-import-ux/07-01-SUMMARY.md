---
phase: 07-smart-import-ux
plan: 01
subsystem: database
tags: [drizzle, jsonb, audit, openai, gpt-4o]

# Dependency graph
requires:
  - phase: 06-statement-source-tracking
    provides: importAudits table and import flow
provides:
  - rawExtractionData JSONB column for storing complete AI extraction metadata
  - Import APIs return and persist raw extraction data
  - Foundation for future debugging and reprocessing capabilities
affects: [07-02-badge-variants, 07-03-confidence-ui, future audit features]

# Tech tracking
tech-stack:
  added: []
  patterns: [JSONB column for structured metadata storage]

key-files:
  created:
    - src/lib/db/migrations/0001_salty_the_watchers.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/validations/import.ts
    - src/app/api/import/route.ts
    - src/app/api/import/confirm/route.ts

key-decisions:
  - "Store complete extraction metadata including model, timing, and page count"
  - "Make rawExtractionData optional in validation for backward compatibility"
  - "Use totalPageCount from rawExtractionData when available"

patterns-established:
  - "JSONB columns with TypeScript type definitions via $type<>"
  - "Audit trail pattern: capture raw inputs for future debugging"

# Metrics
duration: 2min
completed: 2026-02-02
---

# Phase 07 Plan 01: Raw Extraction Data Persistence Summary

**Import flow now captures complete AI extraction metadata (model, timing, raw subscriptions) in JSONB column for audit and reprocessing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-02T19:08:52Z
- **Completed:** 2026-02-02T19:11:19Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added rawExtractionData JSONB column to import_audits table with typed schema
- POST /api/import returns complete extraction metadata including model and timing
- POST /api/import/confirm persists raw extraction data for future debugging

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rawExtractionData column to schema and update validation** - `3a6b3ae` (feat)
2. **Task 2: Update import APIs to return and persist raw extraction data** - `6932313` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added rawExtractionData JSONB column to importAudits with typed structure
- `src/lib/validations/import.ts` - Added rawExtractionData to confirmImportSchema as optional field
- `src/lib/db/migrations/0001_salty_the_watchers.sql` - Database migration adding raw_extraction_data column
- `src/app/api/import/route.ts` - Returns rawExtractionData in response with model, timing metadata
- `src/app/api/import/confirm/route.ts` - Accepts and persists rawExtractionData to database

## Decisions Made
- **Store complete extraction metadata:** Include model name, processing time, page count, extracted timestamp for comprehensive audit trail
- **Optional validation field:** Made rawExtractionData optional in confirmImportSchema for backward compatibility and graceful degradation
- **Use typed JSONB:** Leveraged Drizzle's $type<> for type-safe JSONB column definition

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Raw extraction data now captured for all imports
- Ready for badge variant implementation (07-02) which will display confidence levels
- Foundation in place for confidence-based UI features (07-03)
- Enables future "reprocess with improved prompt" functionality

---
*Phase: 07-smart-import-ux*
*Completed: 2026-02-02*
