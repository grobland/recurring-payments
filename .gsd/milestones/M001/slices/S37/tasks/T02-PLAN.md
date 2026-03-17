# T02: 37-account-crud-list-page 02

**Slice:** S37 — **Milestone:** M001

## Description

Build all UI components for account management and wire the batch upload auto-assignment for ACCT-08.

Purpose: Delivers the user-facing account creation, editing, deletion, and listing experience. Also completes the source-to-account auto-assignment pipeline so future imports inherit the linked account.

Output: Five React components (form, card, list, delete dialog, barrel export), replaced accounts page stub, and modified batch upload route.

## Must-Haves

- [ ] "User can open a modal form, fill in account details with type-specific fields, and create a new financial account"
- [ ] "User can edit an existing account via modal with pre-filled values and disabled type selector"
- [ ] "User can delete an account via confirmation dialog that warns about statement unlinking"
- [ ] "User can see all accounts grouped by type in tabs (Bank/Debit, Credit Cards, Loans) on the accounts page"
- [ ] "User can link a statement source to an account via dropdown in the create/edit modal"
- [ ] "Future PDF imports from a linked source automatically get assigned to the linked account"
- [ ] "Empty state shows when no accounts exist with a CTA to create the first account"
- [ ] "Per-type empty state shows inside a tab when that type has no accounts"

## Files

- `src/components/accounts/account-form.tsx`
- `src/components/accounts/account-card.tsx`
- `src/components/accounts/account-list.tsx`
- `src/components/accounts/account-delete-dialog.tsx`
- `src/components/accounts/index.ts`
- `src/app/(dashboard)/accounts/page.tsx`
- `src/app/api/batch/upload/route.ts`
