# T01: 37-account-crud-list-page 01

**Slice:** S37 — **Milestone:** M001

## Description

Build the complete backend data layer for financial account CRUD: schema migration for source linking, Zod validation, REST API routes, and TanStack Query hooks.

Purpose: Provides the full data pipeline (DB -> API -> client hooks) that the UI components in Plan 02 will consume. All eight ACCT requirements depend on this foundation.

Output: Migration 0012 applied (linkedSourceType column), validation schemas, four API endpoints, and four TanStack Query hooks ready for UI consumption.

## Must-Haves

- [ ] "POST /api/accounts creates a financial account with name, type, institution, and optional type-specific fields"
- [ ] "GET /api/accounts returns all accounts for the authenticated user ordered by type then name"
- [ ] "PATCH /api/accounts/[id] updates account details with ownership check and source-link conflict detection"
- [ ] "DELETE /api/accounts/[id] removes an account and DB set-null cascades statements.account_id"
- [ ] "Linking a source to an account is enforced unique per user (409 if another account claims the same sourceType)"
- [ ] "useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount hooks are exported and follow the tags CRUD pattern"

## Files

- `src/lib/db/schema.ts`
- `src/lib/db/migrations/0012_*.sql`
- `src/lib/db/migrations/meta/_journal.json`
- `src/lib/db/migrations/meta/0012_snapshot.json`
- `src/lib/validations/account.ts`
- `src/app/api/accounts/route.ts`
- `src/app/api/accounts/[id]/route.ts`
- `src/lib/hooks/use-accounts.ts`
- `src/lib/hooks/index.ts`
