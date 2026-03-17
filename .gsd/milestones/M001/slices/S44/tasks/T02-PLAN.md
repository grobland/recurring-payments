# T02: 44-onboarding-hints 02

**Slice:** S44 — **Milestone:** M001

## Description

Wire dismissible empty states into all five target pages: subscriptions, vault, transactions, dashboard, and suggestions.

Purpose: Complete ONBRD-01 through ONBRD-05 by integrating Plan 01's DismissibleEmptyState component and useHintDismissals hook into each page's zero-data branch.

Output:
- 5 pages updated with dismissible onboarding hints
- Each hint independently dismissible with persistent state

## Must-Haves

- [ ] "Subscriptions list empty state shows X dismiss button and uses DismissibleEmptyState; after dismiss shows 'No subscriptions yet'"
- [ ] "Vault empty state shows X dismiss button; after dismiss shows 'No statements yet'"
- [ ] "Transactions empty state (when no filters active) shows X dismiss button; after dismiss shows 'No transactions yet'"
- [ ] "Dashboard shows a dismissible hint banner at the top of the page when subscriptions are empty; after dismiss the banner is gone"
- [ ] "Suggestions empty state shows X dismiss button; after dismiss shows 'No suggestions yet'"
- [ ] "Each page's hint dismisses independently — dismissing subscriptions hint does not affect vault hint"
- [ ] "Filtered empty states (subscriptions with search, transactions with filters) are NOT dismissible — only zero-data empty states are"

## Files

- `src/app/(dashboard)/payments/subscriptions/page.tsx`
- `src/components/vault/vault-empty-state.tsx`
- `src/components/transactions/transaction-browser.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/suggestions/page.tsx`
