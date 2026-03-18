# Phase 47: Schema & Domain Model - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Create all new database tables, enums, and indexes for the three-layer recurring payment model (transactions → recurring_series → recurring_masters) with merchant resolution, review queue, and audit trail. Refactor the existing transactions table additively. All changes must be safe, rollback-friendly, and non-destructive to existing features.

</domain>

<decisions>
## Implementation Decisions

### Transactions table refactor strategy
- **Additive only** — add `normalized_description` (text, nullable) and `source_hash` (varchar(64), nullable with unique partial index) columns
- Do NOT remove existing subscription-specific columns (`tagStatus`, `convertedToSubscriptionId`, `categoryGuess`, `confidenceScore`, `aiMetadata`, `rawText`) in this phase — they are used by live features (transaction tagging, AI suggestions, subscription conversion)
- Column removal deferred to a future deprecation phase after v4.0 migration is stable
- `source_hash` gets a unique constraint scoped to userId (partial index: WHERE source_hash IS NOT NULL) for deduplication
- Existing `fingerprint` column stays — it serves a different dedup purpose (merchant+amount+date); `source_hash` is statement-line-origin-based

### Raw statement lines — reuse statementLineItems
- Do NOT create a separate `raw_statement_lines` table — the existing `statementLineItems` table already stores immutable raw extracted lines from PDFs with sequence numbers, raw descriptions, amounts, and type-specific details
- Where REQUIREMENTS says "raw_statement_lines" (SCHEMA-06, INGEST-03), the implementation maps to existing `statementLineItems`
- This avoids data duplication and leverages the existing immutable ledger design
- **Assumption:** statementLineItems has sufficient fields for the ingestion pipeline's needs (it does — description, amount, date, currency, sequence, documentType, details JSONB)

### Recurring patterns — coexistence, not replacement
- Keep existing `recurringPatterns` table untouched — it powers the current AI suggestions feature
- Create new `recurring_series` alongside it as a separate, richer model
- No data migration between them in this phase
- The old `recurringPatterns` becomes effectively deprecated once Phase 49 (detection engine) is live, but stays in schema until explicit cleanup phase
- **Assumption:** no FK relationships needed between recurringPatterns and the new tables

### New enums
- `recurring_kind`: subscription, utility, insurance, loan, rent_mortgage, membership, installment, other_recurring (8 values per SCHEMA-01)
- `recurring_status`: active, paused, cancelled, dormant, needs_review (5 values per SCHEMA-02)
- `amount_type`: fixed, variable (2 values per SCHEMA-03)
- All new enums — no modification to existing enums

### New tables (8 new + 2 junction)
All new tables use UUID PKs (`uuid("id").primaryKey().defaultRandom()`), `userId` FK with CASCADE on delete, and `createdAt`/`updatedAt` timestamps matching existing patterns.

1. **merchant_entities** — canonical merchant identity (name, category, website, logo_url). One per real-world merchant.
2. **merchant_aliases** — maps statement descriptors to merchant entities. Trigram-indexed for fuzzy matching. Many-to-one with merchant_entities.
3. **recurring_series** — algorithmically detected stream of related transactions. Has cadence info (frequency, interval_days, day_of_month), amount stats (avg, min, max, stddev), confidence score, amount_type (fixed/variable), detected_frequency, first/last seen dates.
4. **recurring_series_transactions** — junction linking transactions to series with match_confidence score per link.
5. **recurring_masters** — user-facing recurring payment record. Has recurring_kind, recurring_status, importance_rating, expected amount range, confidence, billing frequency, merchant_entity FK, notes, url.
6. **recurring_master_series_links** — junction linking masters to series (one master can have multiple series across accounts/time periods). Includes is_primary flag.
7. **user_transaction_labels** — user decisions on individual transactions: recurring, not_recurring, ignore. Influences future matching. One label per user+transaction.
8. **review_queue_items** — items awaiting user review. Type discriminator (new_series, amount_change, descriptor_change, unmatched), confidence, suggested_action JSONB, resolution status.
9. **recurring_events** — audit trail for recurring master lifecycle (created, linked, unlinked, amount_changed, paused, cancelled, reactivated, merged). JSONB metadata per event.

### Foreign key cascade strategy
- User deletion: CASCADE on all new tables (user data cleanup)
- merchant_entities deletion: SET NULL on recurring_masters.merchantEntityId, CASCADE on merchant_aliases (aliases are meaningless without entity)
- recurring_masters deletion: CASCADE on recurring_master_series_links and recurring_events (orphan cleanup)
- recurring_series deletion: CASCADE on recurring_series_transactions junction rows
- transactions deletion: CASCADE on recurring_series_transactions and user_transaction_labels junction rows
- statements deletion: existing CASCADE on transactions propagates naturally

### Trigram indexes (SCHEMA-16)
- pg_trgm extension must be enabled in Supabase (manual step, one-time)
- Trigram GIN indexes on: merchant_aliases.alias_text, merchant_entities.name, transactions.normalized_description (when populated)
- These enable `%` LIKE and similarity() queries for fuzzy matching in Phase 48

### Migration approach
- Single Drizzle migration file (0014) generated by `npm run db:generate`
- Migration is purely additive: new enums, new tables, new columns on transactions, new indexes
- No column drops, no renames, no data transformation
- pg_trgm extension creation (`CREATE EXTENSION IF NOT EXISTS pg_trgm`) added as a manual SQL step or prepended to migration
- Rollback = drop new tables + drop new columns + drop new enums (standard reverse migration)

### Claude's Discretion
- Exact column lengths for varchar fields (reasonable defaults: 255 for names, 64 for hashes, 3 for currencies)
- Whether to add `updatedAt` to all tables or only mutable ones (recommendation: only mutable — skip for junction tables and events)
- Index naming conventions (follow existing pattern: `tablename_column_idx`)
- Whether merchant_entities needs a `userId` scope or is global (recommendation: userId-scoped to start, can be promoted to global later)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema requirements
- `.planning/REQUIREMENTS.md` §Schema & Domain Model — SCHEMA-01 through SCHEMA-17, defines all tables, enums, and constraints
- `.planning/ROADMAP.md` §Phase 47 — Phase goal, success criteria, and downstream dependencies

### Existing schema
- `src/lib/db/schema.ts` — Current 22-table schema with all enums, relations, indexes, and type exports. This is the file being extended.
- `drizzle.config.ts` — Drizzle ORM configuration pointing to schema.ts and migrations dir

### Architecture decisions
- `.gsd/DECISIONS.md` — 50+ accumulated decisions from prior milestones, including naming conventions, cascade patterns, and migration practices

### Project context
- `.planning/STATE.md` — Current project state, v4.0 blockers (pg_trgm extension, DB pool limits, merchant normalization quality)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `statementLineItems` table: Already stores immutable raw PDF lines — reuse as `raw_statement_lines` equivalent
- UUID PK pattern: All existing tables use `uuid("id").primaryKey().defaultRandom()`
- Timestamp pattern: `createdAt`/`updatedAt` with `{ withTimezone: true }` and `.defaultNow().notNull()`
- Relations pattern: Separate `*Relations` export per table using `relations()` from drizzle-orm
- Type exports: `type X = typeof table.$inferSelect` / `type NewX = typeof table.$inferInsert` at bottom of file

### Established Patterns
- Enum-first: All enums defined at top of schema.ts before tables
- Index naming: `tablename_column_idx` pattern (e.g., `transactions_user_id_idx`)
- Composite indexes: Used for common query patterns (e.g., `subscriptions_user_status_idx`)
- Unique indexes: Used for business constraints (e.g., `statements_user_hash_source_idx`)
- JSONB typing: `jsonb("col").$type<TypeHere>()` for typed JSON columns
- Nullable FKs: Used when relationship is optional (e.g., `statements.accountId`)

### Integration Points
- `schema.ts` is the single source of truth — all tables in one file
- `drizzle.config.ts` points to `./src/lib/db/schema.ts`
- Migrations generated to `./src/lib/db/migrations/` (currently 0000-0013 + 1 manual)
- Relations must be added for new tables to enable Drizzle query API
- Type exports must be added for new tables to enable TypeScript typing in API routes and hooks
- `usersRelations` must be extended with new `many()` references for any new user-scoped tables

</code_context>

<specifics>
## Specific Ideas

- Additive changes first where possible — no column drops or renames in this migration
- Preserve rollback simplicity — pure additive migration means rollback is just "drop new stuff"
- Keep migration risk low — single migration, no data transformation, no breaking changes
- Call out uncertain assumptions explicitly (marked with **Assumption:** throughout)
- pg_trgm extension is a manual prerequisite, not part of the Drizzle migration itself
- merchant_entities scoped to userId initially (can be promoted to global/shared in future phase)

</specifics>

<deferred>
## Deferred Ideas

- Removing deprecated subscription-specific columns from transactions table (after v4.0 stable)
- Migrating data from recurringPatterns to recurring_series (after Phase 49 detection engine)
- Dropping recurringPatterns table (after migration confirmed)
- Global merchant entity catalog (shared across users) — future phase
- merchant_entities logo/branding enrichment via external API
- subscriptions → recurring_masters data migration path (Phase 51 or post-v4.0)

</deferred>

---

*Phase: 47-schema-domain-model*
*Context gathered: 2026-03-17*
