# T01: 38-account-detail-pages 01

**Slice:** S38 — **Milestone:** M001

## Description

Build all backend API endpoints and client-side hooks needed for account detail page data fetching: account-scoped coverage, spending aggregates, and accountId-filtered transactions.

Purpose: Provides the complete data layer that the UI components in Plan 02 will consume. The coverage tab needs account-scoped coverage data, the spending tab needs aggregate stats and monthly breakdown, the transactions tab needs accountId filtering, and the details tab needs single-account fetching.

Output: Two new API endpoints (coverage, spending), one modified endpoint (transactions with accountId filter), three new hooks (useAccount, useAccountCoverage, useAccountSpending), and extended TransactionFilters type.

## Must-Haves

- [ ] "GET /api/accounts/[id]/coverage returns a CoverageResponse shaped object with sources (0 or 1 entry), gapCount, and 12 months — same shape CoverageGrid expects"
- [ ] "GET /api/accounts/[id]/spending returns totalSpent, monthlyAverage, topMerchant, topMerchantAmount, and monthlyBreakdown array"
- [ ] "GET /api/transactions accepts an optional accountId query parameter and filters transactions to those from statements with matching account_id"
- [ ] "useAccount(id) hook fetches a single account via GET /api/accounts/[id] and populates accountKeys.detail(id) cache"
- [ ] "useAccountCoverage(accountId) hook fetches GET /api/accounts/[id]/coverage with staleTime matching vault coverage"
- [ ] "useAccountSpending(accountId) hook fetches GET /api/accounts/[id]/spending"
- [ ] "TransactionFilters type includes an optional accountId field"

## Files

- `src/app/api/accounts/[id]/coverage/route.ts`
- `src/app/api/accounts/[id]/spending/route.ts`
- `src/app/api/transactions/route.ts`
- `src/lib/hooks/use-accounts.ts`
- `src/lib/hooks/use-account-coverage.ts`
- `src/lib/hooks/use-account-spending.ts`
- `src/types/transaction.ts`
