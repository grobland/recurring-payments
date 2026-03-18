---
phase: 47-schema-domain-model
plan: 02
subsystem: database
tags: [drizzle, postgres, relations, typescript, migrations, trigram, pg_trgm]

# Dependency graph
requires:
  - phase: 47-01
    provides: All 9 new v4.0 tables and 3 enums defined in schema.ts

provides:
  - Drizzle relations for all 9 new v4.0 tables (enables query API joins)
  - Extended usersRelations and transactionsRelations with new many() references
  - 18 TypeScript type exports (select + insert) for all new entities
  - 3 enum literal types: RecurringKind, RecurringStatus, AmountType
  - Migration 0014_glorious_thunderball.sql ready to apply
  - Trigram GIN indexes for fuzzy merchant matching
  - Partial unique index on transactions.source_hash

affects:
  - 48-ingestion-pipeline
  - 49-recurrence-detection
  - 50-apis-review-queue
  - 51-ui-screens

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New relation blocks added at end of schema.ts under v4.0 RELATIONS section"
    - "New type exports added at end of schema.ts under v4.0 TYPE EXPORTS section"
    - "Trigram GIN indexes added as raw SQL appended to Drizzle migration (Drizzle DSL cannot express GIN+pg_trgm)"
    - "Partial unique index expressed as raw SQL in migration (WHERE source_hash IS NOT NULL)"

key-files:
  created:
    - src/lib/db/migrations/0014_glorious_thunderball.sql
    - src/lib/db/migrations/meta/0014_snapshot.json
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "Trigram GIN indexes appended as raw SQL in migration — Drizzle DSL does not support GIN + pg_trgm operator class"
  - "Partial unique index on source_hash requires raw SQL (WHERE clause not supported by Drizzle uniqueIndex DSL)"
  - "pg_trgm CREATE EXTENSION added to migration but requires manual Supabase dashboard enablement first"

patterns-established:
  - "v4.0 relations: use shorthand { fields: [...], references: [...] } without nested one/many call for readability"
  - "New sections added with clear // ============ v4.0 RELATIONS ============ and // ============ v4.0 TYPE EXPORTS ============ headers"
  - "Migration edits: pg_trgm extension at top, raw GIN indexes at bottom, partial unique overrides replace Drizzle-generated versions"

requirements-completed:
  - SCHEMA-01
  - SCHEMA-02
  - SCHEMA-03
  - SCHEMA-04
  - SCHEMA-05
  - SCHEMA-06
  - SCHEMA-07
  - SCHEMA-08
  - SCHEMA-09
  - SCHEMA-10
  - SCHEMA-11
  - SCHEMA-12
  - SCHEMA-13
  - SCHEMA-14
  - SCHEMA-15
  - SCHEMA-16
  - SCHEMA-17

# Metrics
duration: 15min
completed: 2026-03-17
---

# Phase 47 Plan 02: Schema Relations, Types & Migration Summary

**Drizzle relations and TypeScript types wired for all 9 v4.0 tables, plus migration 0014 with trigram GIN indexes and partial unique source_hash index**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-17T23:00:42Z
- **Completed:** 2026-03-17T23:15:00Z
- **Tasks:** 2 of 2
- **Files modified:** 4 (schema.ts, migration SQL, journal, snapshot)

## Accomplishments

- Extended `usersRelations` with 7 new many() references and `transactionsRelations` with 2 new many() references
- Added 9 new `*Relations` export blocks for all v4.0 tables (merchantEntities, merchantAliases, recurringSeries, recurringSeriesTransactions, recurringMasters, recurringMasterSeriesLinks, userTransactionLabels, reviewQueueItems, recurringEvents)
- Added 18 TypeScript type exports (select + insert for 9 entities) plus 3 enum literal types
- Generated migration `0014_glorious_thunderball.sql` with 9 CREATE TABLE, 3 CREATE TYPE, 2 ALTER TABLE (normalized_description + source_hash columns)
- Prepended `CREATE EXTENSION IF NOT EXISTS pg_trgm`, fixed source_hash partial unique index, appended 3 trigram GIN indexes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add relations and type exports for all new tables** - `9f9eab2` (feat)
2. **Task 2: Generate migration and add trigram indexes** - `f2bf1b5` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Extended with v4.0 relations (9 new blocks, 2 extended blocks) and 21 new type exports
- `src/lib/db/migrations/0014_glorious_thunderball.sql` - Complete additive migration for v4.0 schema
- `src/lib/db/migrations/meta/0014_snapshot.json` - Drizzle schema snapshot
- `src/lib/db/migrations/meta/_journal.json` - Updated migration journal

## Decisions Made

- Trigram GIN indexes appended as raw SQL at end of migration because Drizzle DSL cannot express GIN index with pg_trgm operator class
- Partial unique index on `transactions(user_id, source_hash) WHERE source_hash IS NOT NULL` requires raw SQL override of the Drizzle-generated non-partial version
- `CREATE EXTENSION IF NOT EXISTS pg_trgm` prepended to migration but user must enable in Supabase Dashboard before running migration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation has 2 pre-existing errors in `src/app/api/transactions/route.ts` and `src/app/api/vault/coverage/route.ts` that are unrelated to schema.ts. Zero errors in schema.ts itself.

## User Setup Required

**External service configuration required before running migration:**

1. Go to Supabase Dashboard -> Database -> Extensions
2. Search for `pg_trgm` and enable it
3. Then run `npm run db:migrate` to apply migration 0014

This must be done before the trigram GIN indexes can be created.

## Next Phase Readiness

- Complete v4.0 schema with all 3 enums, 9 tables, 2 new transaction columns, all relations wired, all types exported
- Migration SQL ready to apply once pg_trgm is enabled in Supabase
- Database supports full three-layer model (transactions → series → masters) with merchant resolution, review queue, and audit trail
- Phase 48 (Ingestion Pipeline & Merchant Resolution) can begin — all schema primitives in place

---
*Phase: 47-schema-domain-model*
*Completed: 2026-03-17*
