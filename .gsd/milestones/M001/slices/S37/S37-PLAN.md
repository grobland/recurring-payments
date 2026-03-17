# S37: Account Crud List Page

**Goal:** Build the complete backend data layer for financial account CRUD: schema migration for source linking, Zod validation, REST API routes, and TanStack Query hooks.
**Demo:** Build the complete backend data layer for financial account CRUD: schema migration for source linking, Zod validation, REST API routes, and TanStack Query hooks.

## Must-Haves


## Tasks

- [x] **T01: 37-account-crud-list-page 01** `est:4min`
  - Build the complete backend data layer for financial account CRUD: schema migration for source linking, Zod validation, REST API routes, and TanStack Query hooks.

Purpose: Provides the full data pipeline (DB -> API -> client hooks) that the UI components in Plan 02 will consume. All eight ACCT requirements depend on this foundation.

Output: Migration 0012 applied (linkedSourceType column), validation schemas, four API endpoints, and four TanStack Query hooks ready for UI consumption.
- [x] **T02: 37-account-crud-list-page 02** `est:5min`
  - Build all UI components for account management and wire the batch upload auto-assignment for ACCT-08.

Purpose: Delivers the user-facing account creation, editing, deletion, and listing experience. Also completes the source-to-account auto-assignment pipeline so future imports inherit the linked account.

Output: Five React components (form, card, list, delete dialog, barrel export), replaced accounts page stub, and modified batch upload route.

## Files Likely Touched

- `src/lib/db/schema.ts`
- `src/lib/db/migrations/0012_*.sql`
- `src/lib/db/migrations/meta/_journal.json`
- `src/lib/db/migrations/meta/0012_snapshot.json`
- `src/lib/validations/account.ts`
- `src/app/api/accounts/route.ts`
- `src/app/api/accounts/[id]/route.ts`
- `src/lib/hooks/use-accounts.ts`
- `src/lib/hooks/index.ts`
- `src/components/accounts/account-form.tsx`
- `src/components/accounts/account-card.tsx`
- `src/components/accounts/account-list.tsx`
- `src/components/accounts/account-delete-dialog.tsx`
- `src/components/accounts/index.ts`
- `src/app/(dashboard)/accounts/page.tsx`
- `src/app/api/batch/upload/route.ts`
