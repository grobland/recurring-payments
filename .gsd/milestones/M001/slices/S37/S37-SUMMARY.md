---
id: S37
parent: M001
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
  - AccountForm modal with type selector, conditional fields, source linking dropdown
  - AccountCard grid card with icon, name, institution, source badge, and action menu
  - AccountDeleteDialog with statement-unlinking warning
  - AccountList tabbed grid with global and per-type empty states
  - accounts/page.tsx full implementation (replaces stub)
  - batch/upload/route.ts auto-assigns accountId for linked sources (ACCT-08)
requires: []
affects: []
key_files: []
key_decisions:
  - "useDeleteFinancialAccount name used instead of useDeleteAccount to avoid export collision with use-user.ts GDPR hook"
  - "interestRate convention: form accepts percentage (4.99%), API divides by 100 before DB insert (stores 0.0499)"
  - "Source-link uniqueness enforced in application logic (409 check) not DB constraint — simpler migration, easier to change"
  - "PATCH strips accountType before applying update — account type is locked after creation per CONTEXT.md"
  - "useUpdateAccount invalidates five query keys: accounts, vault/coverage, vault/timeline, sources, transactions"
  - "useDeleteFinancialAccount used (not useDeleteAccount) per Plan 01 naming convention"
  - "AccountFormValues uses string fields for react-hook-form state — z.coerce.number() infers unknown in form generics; parsing done at submit time in onSubmit handler"
  - "EmptyState shared component not used — it requires an href; account empty states need onClick to open modals; inline JSX used instead"
  - "Global empty state shown when accounts.length === 0; Tabs shown when any accounts exist (all three tabs always visible)"
  - "Per-type add button preselects the tab type via defaultAccountType prop on AccountForm"
patterns_established:
  - "Source-link conflict check pattern: findFirst with userId + linkedSourceType match, 409 if found"
  - "Statement bulk-link pattern: db.update(statements).set({ accountId }).where(userId + sourceType + isNull(accountId))"
  - "Account hooks follow tags hook pattern exactly (queryKeys factory, retry, error toast, cache update)"
  - "Modal state management pattern: isCreateOpen + editingAccount + preselectedType local state in list component"
  - "Form values as strings pattern: use string fields in useForm when Zod schema uses z.coerce; cast to numbers in onSubmit"
observability_surfaces: []
drill_down_paths: []
duration: 5min
verification_result: passed
completed_at: 2026-02-26
blocker_discovered: false
---
# S37: Account Crud List Page

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

# Phase 37 Plan 02: Account UI Components Summary

**Five React components delivering the complete account management UI: form modal with type-specific conditional fields and source linking, delete confirmation dialog, grid card, tabbed list with global/per-type empty states, and batch upload auto-assignment (ACCT-08)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T11:22:58Z
- **Completed:** 2026-02-26T11:27:49Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- AccountForm: Dialog modal with three-button type selector (disabled in edit mode), account name/institution fields, source linking Select populated from useSources(), conditional creditLimit (credit_card) and interestRate/loanTermMonths (loan) fields
- AccountCard: Rounded card with type icon, name, institution, formatted credit limit / interest rate, linked source Badge, and DropdownMenu (edit/delete actions)
- AccountDeleteDialog: AlertDialog following tag-delete-dialog pattern; shows statement-unlinking warning when account has linkedSourceType
- AccountList: Loading skeleton grid, global empty state (no accounts), tabbed view with count badges, per-type empty states with type-preselected add buttons
- accounts/page.tsx: Server component wrapping AccountList (stub with disabled button replaced)
- Batch upload: Looks up linked financial account before insert and sets accountId (ACCT-08)

## Task Commits

Each task was committed atomically:

1. **Task 1: Form modal, delete dialog, and card** - `6c19781` (feat)
2. **Task 2: List, barrel exports, page, batch upload** - `53e1404` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/accounts/account-form.tsx` - Modal with type selector, source linking, conditional fields
- `src/components/accounts/account-card.tsx` - Grid card with icon, name, institution, source badge, action menu
- `src/components/accounts/account-delete-dialog.tsx` - AlertDialog with optional unlinking warning
- `src/components/accounts/account-list.tsx` - Tabbed list, global/per-type empty states, modal state management
- `src/components/accounts/index.ts` - Barrel exports for all four components
- `src/app/(dashboard)/accounts/page.tsx` - Full page replacing stub (now renders AccountList)
- `src/app/api/batch/upload/route.ts` - Added financialAccounts import, linkedAccount lookup, accountId in insert values

## Decisions Made

- **AccountFormValues as string fields:** The Zod schema uses `z.coerce.number()` which causes TypeScript to infer the input type as `unknown` in form generics. To avoid casting issues, all numeric fields in the react-hook-form state are typed as `string`. Parsing to number happens in the `onSubmit` handler before passing to mutation.
- **Inline empty states (not shared EmptyState component):** The shared `EmptyState` component requires `primaryAction.href` (renders a `<Link>`). Account empty states need to open a modal (no navigation), so inline JSX is used instead.
- **useDeleteFinancialAccount:** Used per the Plan 01 naming convention that avoided collision with the GDPR `useDeleteAccount` in `use-user.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Simplified form type to avoid z.coerce unknown inference**
- **Found during:** Task 1 TypeScript check
- **Issue:** `zodResolver(createAccountFormSchema)` infers numeric fields as `unknown` due to `z.coerce.number()` in the Zod schema. Using `CreateAccountInput` as the `useForm` generic caused 8+ TypeScript errors about incompatible resolver types.
- **Fix:** Typed `useForm<AccountFormValues>` with string fields for all numeric inputs. The `zodResolver` is cast with `as any` (single annotation). In `onSubmit`, values are parsed from string to number before being passed to mutations. The form submission behavior is identical to the plan spec.
- **Files modified:** `src/components/accounts/account-form.tsx`
- **Commit:** `6c19781`

**2. [Rule 2 - Missing] Inline empty states instead of shared EmptyState**
- **Found during:** Task 2 (account-list.tsx implementation)
- **Issue:** The shared `EmptyState` component only supports `primaryAction.href` (a Link), but the account list needs a button that opens a modal (no URL change).
- **Fix:** Implemented inline empty state JSX in AccountList directly. The visual result matches the plan spec exactly (icon, title, description, CTA button).
- **Files modified:** `src/components/accounts/account-list.tsx`
- **Commit:** `53e1404`

---

**Total deviations:** 2 auto-fixed (1 bug - type compatibility, 1 missing - interface mismatch)
**Impact on plan:** None — all planned functionality implemented as specified. UI behavior identical to plan spec.

## Issues Encountered

None beyond the two deviations documented above.

## Next Phase Readiness

- All eight ACCT requirements now complete (ACCT-01 through ACCT-08)
- Phase 37 Plan 03 can proceed (if applicable) or phase is complete
- Accounts page is fully functional at /accounts route

## Self-Check: PASSED

All files verified present. All commits verified in git log.

- FOUND: src/components/accounts/account-form.tsx
- FOUND: src/components/accounts/account-card.tsx
- FOUND: src/components/accounts/account-delete-dialog.tsx
- FOUND: src/components/accounts/account-list.tsx
- FOUND: src/components/accounts/index.ts
- FOUND: src/app/(dashboard)/accounts/page.tsx (modified)
- FOUND: src/app/api/batch/upload/route.ts (modified)
- FOUND commit: 6c19781 (Task 1)
- FOUND commit: 53e1404 (Task 2)

---
*Phase: 37-account-crud-list-page*
*Completed: 2026-02-26*
