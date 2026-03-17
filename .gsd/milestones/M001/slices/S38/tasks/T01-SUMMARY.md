---
id: T01
parent: S38
milestone: M001
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T01: 38-account-detail-pages 01

**# Phase 38 Plan 01: Account Detail Data Layer Summary**

## What Happened

# Phase 38 Plan 01: Account Detail Data Layer Summary

**One-liner:** Account-scoped coverage and spending API endpoints with TanStack Query hooks, plus accountId filter extension for the transactions endpoint.

## What Was Built

Two new API endpoints and four hooks providing the complete data layer for the account detail page UI (Plan 02):

### API Endpoints

**GET /api/accounts/[id]/coverage** — Returns `CoverageResponse` scoped to single account:
- Filters statements via `statements.accountId` FK (authoritative link, not `linkedSourceType` string)
- Same 12-month window algorithm as vault coverage (`startOfMonth(subMonths(now, 11))`)
- Returns at most 1 source entry with exactly 12 cells — same shape `CoverageGrid` expects
- Empty sources with months array returned when account has no linked statements

**GET /api/accounts/[id]/spending** — Returns spending aggregates:
- Monthly breakdown via `DATE_TRUNC('month', transaction_date)` + `SUM(amount)` grouped query
- Top merchant via `GROUP BY merchant_name ORDER BY SUM DESC LIMIT 1`
- All decimal/SUM results converted via `parseFloat()` — Drizzle returns these as strings
- Returns `{ totalSpent, monthlyAverage, topMerchant, topMerchantAmount, monthlyBreakdown }`

**GET /api/transactions** (modified) — Added `accountId` query parameter:
- Parses `accountId` from URL search params
- Adds `eq(statements.accountId, accountId)` to shared conditions array when present
- Works with existing LEFT JOIN to statements — effectively makes it an INNER JOIN when filtered

### Hooks

- **useAccount(id)** — Added to `use-accounts.ts`, populates `accountKeys.detail(id)` cache (shared with `useUpdateAccount`)
- **useAccountCoverage(accountId)** — New file, 2-minute staleTime matching vault coverage
- **useAccountSpending(accountId)** — New file with `AccountSpendingResponse` interface

### Type Extension

`TransactionFilters.accountId?: string` added — `useTransactions` automatically creates distinct cache entry when `accountId` is present in filters object.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/app/api/accounts/[id]/coverage/route.ts — FOUND
- src/app/api/accounts/[id]/spending/route.ts — FOUND
- src/lib/hooks/use-account-coverage.ts — FOUND
- src/lib/hooks/use-account-spending.ts — FOUND
- useAccount exported from use-accounts.ts — VERIFIED
- TransactionFilters includes accountId — VERIFIED
- TypeScript compiles with zero errors — VERIFIED
- Task commits exist: 17e8180, 7d02b49 — VERIFIED
