---
phase: 47-schema-domain-model
plan: 01
subsystem: database
tags: [drizzle-orm, postgres, schema, recurring-payments, domain-model, enums, uuid]

# Dependency graph
requires: []
provides:
  - recurringKindEnum (8 values), recurringStatusEnum (5 values), amountTypeEnum (2 values)
  - merchantEntities table (userId-scoped canonical merchant identity)
  - merchantAliases table (descriptor-to-entity mapping, fuzzy-match ready)
  - recurringSeries table (algorithmically detected recurring streams)
  - recurringSeriesTransactions junction (series <-> transaction links with confidence)
  - recurringMasters table (user-facing recurring payment records)
  - recurringMasterSeriesLinks junction (master <-> series links with isPrimary flag)
  - userTransactionLabels table (user decisions: recurring/not_recurring/ignore)
  - reviewQueueItems table (pending review items with suggestedAction JSONB)
  - recurringEvents table (append-only audit trail with eventType + metadata JSONB)
  - transactions.normalizedDescription column (nullable, for ingestion pipeline)
  - transactions.sourceHash column (nullable varchar(64), unique per userId for dedup)
affects: [48-ingestion-pipeline, 49-recurrence-detection, 50-apis-review-queue, 51-ui-screens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Three-layer recurring model: transactions -> recurring_series -> recurring_masters
    - Merchant resolution layer: merchantAliases -> merchantEntities (trigram-indexed via raw SQL)
    - Append-only audit table pattern (recurringEvents: no updatedAt)
    - JSONB typed columns for suggestedAction and recurringEvents.metadata

key-files:
  created: []
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "Trigram GIN indexes deferred to raw SQL in migration — Drizzle DSL does not support GIN + pg_trgm operator class"
  - "transactions_user_source_hash_idx defined as regular uniqueIndex — partial WHERE clause (source_hash IS NOT NULL) added as raw SQL in migration"
  - "merchantEntities scoped to userId initially — can be promoted to global shared catalog in future phase"
  - "recurringEvents has no updatedAt (append-only audit trail pattern)"
  - "recurringMasterSeriesLinks uses UUID PK (not composite) — needed because junction has additional fields (isPrimary, linkedAt)"

patterns-established:
  - "Append-only audit table: no updatedAt, eventType varchar(50) + metadata JSONB"
  - "Three-layer model FK cascade: user->CASCADE, merchant_entities->SET NULL, masters/series->CASCADE on junctions"

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
duration: 3min
completed: 2026-03-17
---

# Phase 47 Plan 01: Schema & Domain Model Summary

**Three-layer recurring payment domain model (10 new tables, 3 enums, 2 transaction columns) in schema.ts as pure additive Drizzle schema definitions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T22:57:18Z
- **Completed:** 2026-03-17T23:00:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added 3 new PostgreSQL enums: `recurring_kind` (8 values), `recurring_status` (5 values), `amount_type` (2 values)
- Added 8 new tables + 2 junction tables covering the full three-layer model: merchant resolution, series detection, master records, review queue, and audit trail
- Extended transactions table with `normalized_description` and `source_hash` columns plus a unique index for deduplication
- All FK cascade behaviors per CONTEXT.md decisions (CASCADE for user/junction, SET NULL for optional merchant references)
- TypeScript compiles clean (zero schema.ts errors)

## Task Commits

1. **Task 1: Add enums, merchant tables, and transaction columns** - `ac4a83b` (feat)
2. **Task 2: Add recurring model tables, user labels, review queue, and events** - `db26527` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added 3 enums, 10 tables, 2 columns, 1 unique index; total +311 lines

## Decisions Made

- Trigram GIN indexes on `merchant_aliases.alias_text`, `merchant_entities.name`, `transactions.normalized_description` cannot be expressed in Drizzle DSL — deferred to raw SQL in migration (Plan 02)
- `transactions_user_source_hash_idx` defined as regular `uniqueIndex` — the partial `WHERE source_hash IS NOT NULL` clause will be added as raw SQL in migration (Plan 02)
- `recurringMasterSeriesLinks` uses UUID PK (not composite primaryKey) because the junction has additional data columns (`isPrimary`, `linkedAt`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation shows zero errors in schema.ts (pre-existing drizzle-orm node_modules type errors are unrelated to this work).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All v4.0 domain model tables and enums defined in schema.ts
- Ready for Plan 02: Drizzle relations, TypeScript type exports, and migration generation
- pg_trgm extension must be enabled in Supabase before migration is applied (noted in STATE.md blockers)

---
*Phase: 47-schema-domain-model*
*Completed: 2026-03-17*
