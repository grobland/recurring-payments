# S44: Onboarding Hints

**Goal:** Build the hint dismissal hook and dismissible empty state wrapper component that Plan 02 will integrate into all five pages.
**Demo:** Build the hint dismissal hook and dismissible empty state wrapper component that Plan 02 will integrate into all five pages.

## Must-Haves


## Tasks

- [x] **T01: 44-onboarding-hints 01**
  - Build the hint dismissal hook and dismissible empty state wrapper component that Plan 02 will integrate into all five pages.

Purpose: Separating the shared infrastructure (hook + component) from page integration means Plan 02 only needs to swap EmptyState usages for DismissibleEmptyState. Clean reusable pattern.

Output:
- `useHintDismissals` — localStorage-backed boolean dismissal hook
- `DismissibleEmptyState` — wrapper component with X button and post-dismiss minimal text
- [x] **T02: 44-onboarding-hints 02** `est:8min`
  - Wire dismissible empty states into all five target pages: subscriptions, vault, transactions, dashboard, and suggestions.

Purpose: Complete ONBRD-01 through ONBRD-05 by integrating Plan 01's DismissibleEmptyState component and useHintDismissals hook into each page's zero-data branch.

Output:
- 5 pages updated with dismissible onboarding hints
- Each hint independently dismissible with persistent state

## Files Likely Touched

- `src/lib/hooks/use-hint-dismissals.ts`
- `src/components/shared/dismissible-empty-state.tsx`
- `src/lib/hooks/index.ts`
- `src/app/(dashboard)/payments/subscriptions/page.tsx`
- `src/components/vault/vault-empty-state.tsx`
- `src/components/transactions/transaction-browser.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/suggestions/page.tsx`
