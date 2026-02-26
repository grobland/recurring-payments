---
phase: 38-account-detail-pages
plan: "01"
subsystem: api-data-layer
tags: [api, hooks, typescript, drizzle, tanstack-query, accounts, coverage, spending, transactions]
dependency_graph:
  requires:
    - 37-02 (account CRUD hooks — accountKeys, useAccounts, useUpdateAccount)
    - vault/coverage endpoint (CoverageResponse shape reference)
    - src/lib/db/schema.ts (financialAccounts, statements, transactions tables)
  provides:
    - GET /api/accounts/[id]/coverage (account-scoped CoverageResponse)
    - GET /api/accounts/[id]/spending (spending aggregates endpoint)
    - useAccount(id) hook (single-record query)
    - useAccountCoverage(accountId) hook
    - useAccountSpending(accountId) hook
    - TransactionFilters.accountId (extended filter type)
  affects:
    - 38-02 (UI components consume all hooks from this plan)
    - GET /api/transactions (now accepts optional accountId filter)
tech_stack:
  added: []
  patterns:
    - Drizzle sql template for PostgreSQL aggregates (DATE_TRUNC, TO_CHAR, SUM)
    - parseFloat() on all Drizzle decimal/SUM results (returns strings)
    - statements.accountId FK as authoritative account-to-statement link
    - CoverageResponse shape reused from vault coverage for CoverageGrid compatibility
key_files:
  created:
    - src/app/api/accounts/[id]/coverage/route.ts
    - src/app/api/accounts/[id]/spending/route.ts
    - src/lib/hooks/use-account-coverage.ts
    - src/lib/hooks/use-account-spending.ts
  modified:
    - src/lib/hooks/use-accounts.ts (added useAccount + fetchAccount)
    - src/lib/hooks/use-transactions.ts (added accountId param passing)
    - src/app/api/transactions/route.ts (added accountId filter on statements.accountId)
    - src/types/transaction.ts (added accountId to TransactionFilters)
decisions:
  - "Coverage endpoint filters by statements.accountId FK (not linkedSourceType string) — FK is authoritative link, handles edge cases where sourceType was relinked"
  - "Coverage returns at most 1 source entry per account (not all user sources) — account detail is scoped to single account"
  - "sourceTypeLabel derived from account.linkedSourceType (primary) or first statement's sourceType (fallback) or account.name (last resort)"
  - "accountId condition added to shared conditions[] array in transactions route — applies in both sourceType and non-sourceType branches via existing LEFT JOIN"
  - "Empty sources [] returned when account has no linkedSourceType and no FK-linked statements — months array still populated for CoverageGrid header"
metrics:
  duration_minutes: 25
  completed_date: "2026-02-26"
  tasks_completed: 2
  tasks_planned: 2
  files_created: 4
  files_modified: 4
---

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
