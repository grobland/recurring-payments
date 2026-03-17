# S38: Account Detail Pages

**Goal:** Build all backend API endpoints and client-side hooks needed for account detail page data fetching: account-scoped coverage, spending aggregates, and accountId-filtered transactions.
**Demo:** Build all backend API endpoints and client-side hooks needed for account detail page data fetching: account-scoped coverage, spending aggregates, and accountId-filtered transactions.

## Must-Haves


## Tasks

- [x] **T01: 38-account-detail-pages 01**
  - Build all backend API endpoints and client-side hooks needed for account detail page data fetching: account-scoped coverage, spending aggregates, and accountId-filtered transactions.

Purpose: Provides the complete data layer that the UI components in Plan 02 will consume. The coverage tab needs account-scoped coverage data, the spending tab needs aggregate stats and monthly breakdown, the transactions tab needs accountId filtering, and the details tab needs single-account fetching.

Output: Two new API endpoints (coverage, spending), one modified endpoint (transactions with accountId filter), three new hooks (useAccount, useAccountCoverage, useAccountSpending), and extended TransactionFilters type.
- [x] **T02: 38-account-detail-pages 02**
  - Build the complete account detail page UI: route file, tab shell with cross-tab state coordination, all four tab content components, spending chart, and AccountCard navigation link.

Purpose: Delivers the user-facing experience for DETAIL-01 through DETAIL-04 — viewing/editing account details, coverage grid, transaction browsing, and spending summary all scoped to a single account.

Output: One Next.js route page, seven new React components (detail page shell, header, four tab contents, spending chart), modified AccountCard, and updated barrel exports.

## Files Likely Touched

- `src/app/api/accounts/[id]/coverage/route.ts`
- `src/app/api/accounts/[id]/spending/route.ts`
- `src/app/api/transactions/route.ts`
- `src/lib/hooks/use-accounts.ts`
- `src/lib/hooks/use-account-coverage.ts`
- `src/lib/hooks/use-account-spending.ts`
- `src/types/transaction.ts`
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
