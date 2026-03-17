# S35: Database Foundation

**Goal:** Prepare the Drizzle schema for the financial_accounts table migration by renaming the conflicting manual backfill file and editing schema.
**Demo:** Prepare the Drizzle schema for the financial_accounts table migration by renaming the conflicting manual backfill file and editing schema.

## Must-Haves


## Tasks

- [x] **T01: 35-database-foundation 01** `est:2min`
  - Prepare the Drizzle schema for the financial_accounts table migration by renaming the conflicting manual backfill file and editing schema.ts with all required additions.

Purpose: Phase 35's sole purpose is adding the financial_accounts table and a nullable accountId FK on statements. This plan handles all schema.ts edits and pre-generate safety steps so Plan 02 can cleanly run db:generate + db:migrate.

Output: An edited schema.ts with accountTypeEnum, financialAccounts table (before statements), accountId FK on statements, updated relations in three places, and three new type exports. The manual 0011 backfill file renamed to avoid filename collision.
- [x] **T02: 35-database-foundation 02** `est:18min`
  - Generate migration 0011, manually verify the FK SQL for Drizzle bug #4147 corruption, apply the migration to Supabase, and verify the database state.

Purpose: The migration execution is separated from schema editing because a human must read the generated SQL before it runs. This is a non-negotiable safety step — Drizzle bug #4147 can silently generate a malformed FK reference when adding a FK column to an existing table. A corrupt migration applied to production would require a manual fix.

Output: Migration 0011 applied to Supabase; financial_accounts table live; statements.account_id column live; TypeScript compile confirms no regressions.

## Files Likely Touched

- `src/lib/db/schema.ts`
- `src/lib/db/migrations/0011_backfill_statement_date.sql`
- `src/lib/db/migrations/0011_financial_accounts.sql`
