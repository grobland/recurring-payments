---
phase: 37-account-crud-list-page
plan: 02
subsystem: ui, api
tags: [react, shadcn, tanstack-query, next-js, forms, zod]

# Dependency graph
requires:
  - phase: 37-01
    provides: useAccounts, useCreateAccount, useUpdateAccount, useDeleteFinancialAccount hooks; account API endpoints; createAccountFormSchema
provides:
  - AccountForm modal with type selector, conditional fields, source linking dropdown
  - AccountCard grid card with icon, name, institution, source badge, and action menu
  - AccountDeleteDialog with statement-unlinking warning
  - AccountList tabbed grid with global and per-type empty states
  - accounts/page.tsx full implementation (replaces stub)
  - batch/upload/route.ts auto-assigns accountId for linked sources (ACCT-08)
affects:
  - vault/accounts page (now functional)
  - future PDF imports (auto-assigned accountId when source is linked)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Form values typed as raw strings (AccountFormValues) for react-hook-form + zodResolver compatibility with z.coerce schemas"
    - "Type selector implemented as three styled Button elements with variant toggle (not RadioGroup)"
    - "AccountList manages all modal state internally (isCreateOpen, editingAccount, deletingAccount)"
    - "Global empty state bypasses Tabs; per-type empty states live inside TabsContent"
    - "PerTypeEmptyState extracted as local component with onAdd callback for type preselection"

key-files:
  created:
    - src/components/accounts/account-form.tsx
    - src/components/accounts/account-card.tsx
    - src/components/accounts/account-delete-dialog.tsx
    - src/components/accounts/account-list.tsx
    - src/components/accounts/index.ts
  modified:
    - src/app/(dashboard)/accounts/page.tsx (replaces stub)
    - src/app/api/batch/upload/route.ts (adds ACCT-08 linked account lookup)

key-decisions:
  - "useDeleteFinancialAccount used (not useDeleteAccount) per Plan 01 naming convention"
  - "AccountFormValues uses string fields for react-hook-form state — z.coerce.number() infers unknown in form generics; parsing done at submit time in onSubmit handler"
  - "EmptyState shared component not used — it requires an href; account empty states need onClick to open modals; inline JSX used instead"
  - "Global empty state shown when accounts.length === 0; Tabs shown when any accounts exist (all three tabs always visible)"
  - "Per-type add button preselects the tab type via defaultAccountType prop on AccountForm"

patterns-established:
  - "Modal state management pattern: isCreateOpen + editingAccount + preselectedType local state in list component"
  - "Form values as strings pattern: use string fields in useForm when Zod schema uses z.coerce; cast to numbers in onSubmit"

requirements-completed: [ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ACCT-06, ACCT-07, ACCT-08]

# Metrics
duration: 5min
completed: 2026-02-26
---

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
