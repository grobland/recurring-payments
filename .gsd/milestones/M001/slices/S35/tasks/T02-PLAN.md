# T02: 35-database-foundation 02

**Slice:** S35 — **Milestone:** M001

## Description

Generate migration 0011, manually verify the FK SQL for Drizzle bug #4147 corruption, apply the migration to Supabase, and verify the database state.

Purpose: The migration execution is separated from schema editing because a human must read the generated SQL before it runs. This is a non-negotiable safety step — Drizzle bug #4147 can silently generate a malformed FK reference when adding a FK column to an existing table. A corrupt migration applied to production would require a manual fix.

Output: Migration 0011 applied to Supabase; financial_accounts table live; statements.account_id column live; TypeScript compile confirms no regressions.

## Must-Haves

- [ ] "Migration 0011 generated SQL reviewed manually before execution"
- [ ] "statements.account_id FK references financial_accounts(id) correctly in generated SQL (not garbled — Drizzle bug #4147 check)"
- [ ] "npm run db:migrate runs without error"
- [ ] "financial_accounts table exists in the Supabase PostgreSQL database"
- [ ] "statements table has account_id nullable UUID column in the database"
- [ ] "account_type PostgreSQL enum exists with values bank_debit, credit_card, loan"

## Files

- `src/lib/db/migrations/0011_financial_accounts.sql`
