# T01: 35-database-foundation 01

**Slice:** S35 — **Milestone:** M001

## Description

Prepare the Drizzle schema for the financial_accounts table migration by renaming the conflicting manual backfill file and editing schema.ts with all required additions.

Purpose: Phase 35's sole purpose is adding the financial_accounts table and a nullable accountId FK on statements. This plan handles all schema.ts edits and pre-generate safety steps so Plan 02 can cleanly run db:generate + db:migrate.

Output: An edited schema.ts with accountTypeEnum, financialAccounts table (before statements), accountId FK on statements, updated relations in three places, and three new type exports. The manual 0011 backfill file renamed to avoid filename collision.

## Must-Haves

- [ ] "schema.ts defines accountTypeEnum with values bank_debit, credit_card, loan"
- [ ] "schema.ts defines financialAccounts table BEFORE the statements table"
- [ ] "statements table in schema.ts has a nullable accountId UUID column with onDelete set null FK to financialAccounts"
- [ ] "financialAccountsRelations, statementsRelations, and usersRelations are updated to reflect the new table"
- [ ] "FinancialAccount, NewFinancialAccount, and AccountType types are exported from schema.ts"
- [ ] "0011_backfill_statement_date.sql is renamed so Drizzle db:generate does not collide with it"

## Files

- `src/lib/db/schema.ts`
- `src/lib/db/migrations/0011_backfill_statement_date.sql`
