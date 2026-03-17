# T02: 38-account-detail-pages 02

**Slice:** S38 — **Milestone:** M001

## Description

Build the complete account detail page UI: route file, tab shell with cross-tab state coordination, all four tab content components, spending chart, and AccountCard navigation link.

Purpose: Delivers the user-facing experience for DETAIL-01 through DETAIL-04 — viewing/editing account details, coverage grid, transaction browsing, and spending summary all scoped to a single account.

Output: One Next.js route page, seven new React components (detail page shell, header, four tab contents, spending chart), modified AccountCard, and updated barrel exports.

## Must-Haves

- [ ] "Clicking an AccountCard navigates to /accounts/[id] without conflicting with the dropdown menu click target"
- [ ] "Account detail page shows a header with account name, type badge, institution, key stat, and edit/delete actions"
- [ ] "Tab bar shows Details | Coverage | Transactions | Spending with one section visible at a time"
- [ ] "Details tab renders an inline editable form (not modal) with all account fields including source linking, with type field locked"
- [ ] "Coverage tab reuses CoverageGrid scoped to account's linked statements with empty state when no source linked"
- [ ] "Clicking a coverage cell with data switches to Transactions tab with month date range pre-filled"
- [ ] "Transactions tab shows TransactionBrowser pre-filtered to accountId with count summary banner"
- [ ] "Spending tab shows three stat cards (Total Spent, Monthly Average, Top Merchant) and a monthly bar chart"
- [ ] "Back button navigates to accounts list page"

## Files

- `src/app/(dashboard)/accounts/[id]/page.tsx`
- `src/components/accounts/account-detail-page.tsx`
- `src/components/accounts/account-detail-header.tsx`
- `src/components/accounts/account-details-tab.tsx`
- `src/components/accounts/account-coverage-tab.tsx`
- `src/components/accounts/account-transactions-tab.tsx`
- `src/components/accounts/account-spending-tab.tsx`
- `src/components/accounts/account-spending-chart.tsx`
- `src/components/accounts/account-card.tsx`
- `src/components/accounts/index.ts`
