---
phase: 38-account-detail-pages
plan: "02"
subsystem: ui-components
tags: [ui, react, next.js, typescript, recharts, tanstack-query, accounts, coverage, spending, transactions]
dependency_graph:
  requires:
    - 38-01 (useAccount, useAccountCoverage, useAccountSpending hooks, TransactionFilters.accountId)
    - 37-02 (useUpdateAccount, useDeleteFinancialAccount, AccountForm, AccountDeleteDialog)
    - vault/coverage-grid.tsx (CoverageGrid, CoverageCellClickInfo)
    - transaction-browser.tsx (TransactionFilters, TransactionTable, TransactionCardList, BulkActionBar)
  provides:
    - GET /accounts/[id] route (server component page)
    - AccountDetailPage (client tab shell with cross-tab state coordination)
    - AccountDetailHeader (account info, edit/delete actions, back navigation)
    - AccountDetailsTab (inline edit form, type locked)
    - AccountCoverageTab (scoped CoverageGrid with cross-tab navigation)
    - AccountTransactionsTab (account-scoped browser with count summary banner)
    - AccountSpendingTab (stat cards + monthly bar chart)
    - AccountSpendingChart (Recharts BarChart)
    - AccountCard navigation (left section clickable to /accounts/[id])
  affects:
    - /accounts list page (AccountCard now navigates to detail on left click)
decisions:
  - "AccountTransactionsTab is a self-contained component (not a modified TransactionBrowser) — avoids breaking the global transactions page while supporting initialFilters prop for cross-tab navigation"
  - "transactionFilters state initialized with { accountId } in AccountDetailPage — accountId always present as base filter"
  - "Coverage empty state check uses account.linkedSourceType (not sources.length) — faster, no extra network request needed"
  - "useEffect on initialFilters in AccountTransactionsTab syncs cross-tab navigation — filters from coverage cell click propagate without prop drilling"
  - "TransactionFilters UI shown without sourceTypes in account context — source filter would be redundant when already scoped to account"
tech_stack:
  added: []
  patterns:
    - Controlled Tabs (value + onValueChange) for cross-tab state coordination
    - Cross-tab navigation via callback props lifted to AccountDetailPage
    - Self-contained component pattern (AccountTransactionsTab) vs modified existing component
    - interestRate display convention: multiply DB value (0.0499) by 100 for form display (4.99%)
    - BarChart pattern matching project's spending-trend-chart.tsx (hsl CSS vars, Intl.NumberFormat)
key_files:
  created:
    - src/app/(dashboard)/accounts/[id]/page.tsx
    - src/components/accounts/account-detail-page.tsx
    - src/components/accounts/account-detail-header.tsx
    - src/components/accounts/account-details-tab.tsx
    - src/components/accounts/account-coverage-tab.tsx
    - src/components/accounts/account-transactions-tab.tsx
    - src/components/accounts/account-spending-tab.tsx
    - src/components/accounts/account-spending-chart.tsx
  modified:
    - src/components/accounts/account-card.tsx (added router.push navigation on left section)
    - src/components/accounts/index.ts (added 7 new exports)
metrics:
  duration_minutes: 4
  completed_date: "2026-02-26"
  tasks_completed: 2
  tasks_planned: 2
  files_created: 8
  files_modified: 2
---

# Phase 38 Plan 02: Account Detail Pages UI Summary

**One-liner:** Full account detail page UI with four tabs (Details inline form, Coverage grid, Transactions browser, Spending chart), cross-tab navigation from coverage cells, and AccountCard click-to-navigate.

## What Was Built

### Route and Shell

**`/accounts/[id]` route** (`src/app/(dashboard)/accounts/[id]/page.tsx`) — Next.js server component with `await params` (required for Next.js 16), DashboardHeader with breadcrumbs (Data Vault > Account), and AccountDetailPage client component.

**`AccountDetailPage`** — Client "use client" tab shell owning two pieces of state:
- `activeTab: string` — controls which tab is visible (Details | Coverage | Transactions | Spending)
- `transactionFilters: TransactionFilters` — always contains `{ accountId }` as base, extended with `dateFrom`/`dateTo` when navigating from coverage cells

Cross-tab navigation: `handleCoverageCellToTransactions(dateFrom, dateTo)` sets filters and switches to Transactions tab atomically.

### Header

**`AccountDetailHeader`** — Shows account name, type badge (Bank/Debit, Credit Card, Loan), institution, type-specific key stat (credit limit or interest rate), back button (ArrowLeft -> /accounts), and Edit/Delete action buttons. Edit opens the existing `AccountForm` modal; Delete opens `AccountDeleteDialog` and navigates to /accounts on success.

### Four Tab Components

**`AccountDetailsTab`** — Inline edit form using react-hook-form + Zod, same field structure as AccountForm but without the Dialog wrapper. Type buttons rendered as disabled (visual-only, type locked after creation). `interestRate` correctly multiplied by 100 for display (DB stores 0.0499, form shows 4.99). Saves via `useUpdateAccount` mutation with `toast.success`. Linked source info section below the form shows current linked source or "no source" message.

**`AccountCoverageTab`** — Wraps `CoverageGrid` with account-scoped data from `useAccountCoverage`. Empty state shown when `account.linkedSourceType` is null (CTA button switches to Details tab via `onNavigateToDetails` callback). Data cells click -> `onNavigateToTransactions` with computed date range for the month. Missing cells click -> navigate to `/vault/load?source=...` for upload.

**`AccountTransactionsTab`** — Self-contained transaction browser (not modifying existing `TransactionBrowser`). Key features:
- `initialFilters` prop seeded from AccountDetailPage state, synced via `useEffect` when prop changes (cross-tab nav)
- `accountId` always merged into `debouncedFilters` before `useTransactions` call
- Count summary banner: "X transactions · Y tagged · Z subscriptions"
- Source type filter UI hidden (not relevant when scoped to account)
- Full selection, bulk-tag, pagination, responsive table/card switching

**`AccountSpendingTab`** — Three stat cards (Total Spent, Monthly Average, Top Merchant) in responsive 3-column grid, plus `AccountSpendingChart`. Empty state when `totalSpent === 0`. Loading shows skeleton cards + chart skeleton. Error state with retry.

**`AccountSpendingChart`** — Recharts `BarChart` with `ResponsiveContainer`, `CartesianGrid` (border color), `XAxis`/`YAxis` (muted-foreground, no tick/axis lines), `Tooltip` (background/border CSS vars), and `Bar` with `fill="hsl(var(--primary))"` and rounded top corners.

### AccountCard Navigation

Modified left content section wrapped in `<button>` with `onClick={() => router.push('/accounts/${account.id}')}`. The `DropdownMenu` trigger remains outside the button, so dropdown actions (Edit, Delete) fire independently without click propagation conflicts.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/app/(dashboard)/accounts/[id]/page.tsx — FOUND
- src/components/accounts/account-detail-page.tsx — FOUND
- src/components/accounts/account-detail-header.tsx — FOUND
- src/components/accounts/account-details-tab.tsx — FOUND
- src/components/accounts/account-coverage-tab.tsx — FOUND
- src/components/accounts/account-transactions-tab.tsx — FOUND
- src/components/accounts/account-spending-tab.tsx — FOUND
- src/components/accounts/account-spending-chart.tsx — FOUND
- TypeScript compiles with zero errors — VERIFIED
- Task 1 commit: 68bad2b — VERIFIED
- Task 2 commit: 67e85ff — VERIFIED
