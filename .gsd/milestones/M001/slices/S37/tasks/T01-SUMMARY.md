---
id: T01
parent: S37
milestone: M001
provides:
  - linked_source_type column on financial_accounts (migration 0012)
  - createAccountSchema, updateAccountSchema, createAccountFormSchema Zod schemas with type-specific field validation
  - GET /api/accounts list endpoint ordered by type then name
  - POST /api/accounts create endpoint with source-link conflict enforcement and statement bulk-link
  - GET /api/accounts/[id] single-resource endpoint with ownership check
  - PATCH /api/accounts/[id] update with type-lock, source-conflict check, and statement re-linking
  - DELETE /api/accounts/[id] hard delete with DB set-null cascade
  - accountKeys, useAccounts, useCreateAccount, useUpdateAccount, useDeleteFinancialAccount TanStack Query hooks
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 4min
verification_result: passed
completed_at: 2026-02-26
blocker_discovered: false
---
# T01: 37-account-crud-list-page 01

**# Phase 37 Plan 01: Account CRUD Data Layer Summary**

## What Happened

# Phase 37 Plan 01: Account CRUD Data Layer Summary

**Financial account backend: migration 0012 adds linkedSourceType, Zod schemas with type-specific field validation, four REST endpoints with source-link conflict enforcement and statement bulk-linking, and four TanStack Query hooks following the tags CRUD pattern**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T11:16:35Z
- **Completed:** 2026-02-26T11:19:54Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Migration 0012 applied: `linked_source_type varchar(100)` column on `financial_accounts` table
- Zod schemas enforce type-specific fields: credit_card requires creditLimit, loan requires interestRate + loanTermMonths
- All four REST endpoints created with auth, isUserActive, ownership checks, and source-link uniqueness enforcement
- POST and PATCH endpoints bulk-update existing statements when a linkedSourceType is provided
- Four TanStack Query hooks with exponential backoff retry, error toasts, and targeted cache invalidation

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + Zod validation** - `7cbada5` (feat)
2. **Task 2: CRUD API routes for financial accounts** - `f2b5f38` (feat)
3. **Task 3: TanStack Query hooks for accounts** - `ebbf63f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added linkedSourceType varchar(100) to financialAccounts table
- `src/lib/db/migrations/0012_redundant_boomerang.sql` - Migration: ALTER TABLE financial_accounts ADD COLUMN linked_source_type
- `src/lib/db/migrations/meta/_journal.json` - Updated with migration 0012 entry
- `src/lib/db/migrations/meta/0012_snapshot.json` - Snapshot for migration 0012
- `src/lib/validations/account.ts` - createAccountFormSchema/createAccountSchema/updateAccountSchema with superRefine validation
- `src/app/api/accounts/route.ts` - GET list + POST create endpoints
- `src/app/api/accounts/[id]/route.ts` - GET single + PATCH update + DELETE endpoints
- `src/lib/hooks/use-accounts.ts` - accountKeys + useAccounts, useCreateAccount, useUpdateAccount, useDeleteFinancialAccount
- `src/lib/hooks/index.ts` - Added account hook exports

## Decisions Made

- **useDeleteFinancialAccount naming:** `useDeleteAccount` was already exported from `use-user.ts` for GDPR account deletion. Named the financial account delete hook `useDeleteFinancialAccount` to avoid the collision and clearly distinguish the two operations.
- **interestRate convention:** Form accepts percentage (e.g. 4.99 for 4.99%). API handler divides by 100 before storing (DB column is decimal(5,4) holding 0.0499). Documented in a comment in both the validation file and the API route.
- **Source-link uniqueness via application logic:** Enforced via 409 conflict check in application code rather than a DB unique constraint. Keeps the migration simple and avoids constraint violations during updates.
- **Type lock on PATCH:** The PATCH handler deletes `accountType` from the update payload before applying. Account type cannot change after creation per CONTEXT.md decisions.
- **Five query invalidations on useUpdateAccount:** Per STATE.md blocker note, updating an account can affect vault coverage, vault timeline, sources view, and transactions — all five keys are invalidated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed hook to avoid export collision**
- **Found during:** Task 3 (TanStack Query hooks)
- **Issue:** Plan specified exporting `useDeleteAccount` but `src/lib/hooks/use-user.ts` already exports `useDeleteAccount` (GDPR user account deletion). Exporting both from `index.ts` would cause a TypeScript export collision.
- **Fix:** Named the hook `useDeleteFinancialAccount` in `use-accounts.ts` and updated the index.ts export accordingly. The hook's functionality is identical to the plan spec.
- **Files modified:** `src/lib/hooks/use-accounts.ts`, `src/lib/hooks/index.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `ebbf63f` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking - naming collision)
**Impact on plan:** Minor renaming only. All planned functionality implemented. Plan 02 UI components should import `useDeleteFinancialAccount` instead of `useDeleteAccount`.

## Issues Encountered

None beyond the naming collision documented above.

## Next Phase Readiness

- All backend data pipeline ready for Plan 02 UI consumption
- Hooks are importable from `@/lib/hooks` via named exports
- API endpoints follow REST conventions and return `{ accounts }` / `{ account }` / `{ message }` shapes
- Plan 02 should use `useDeleteFinancialAccount` (not `useDeleteAccount`) for the delete mutation

## Self-Check: PASSED

All files verified present. All commits verified in git log.

- FOUND: src/lib/db/schema.ts
- FOUND: src/lib/db/migrations/0012_redundant_boomerang.sql
- FOUND: src/lib/validations/account.ts
- FOUND: src/app/api/accounts/route.ts
- FOUND: src/app/api/accounts/[id]/route.ts
- FOUND: src/lib/hooks/use-accounts.ts
- FOUND commit: 7cbada5 (Task 1)
- FOUND commit: f2b5f38 (Task 2)
- FOUND commit: ebbf63f (Task 3)
- FOUND commit: 3368cbc (metadata)

---
*Phase: 37-account-crud-list-page*
*Completed: 2026-02-26*
