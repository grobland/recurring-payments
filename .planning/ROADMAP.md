# Roadmap: Subscription Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-01-30)
- ✅ **v1.1 Import Improvements** — Phases 5-8 (shipped 2026-02-02)
- ✅ **v1.2 Production Polish** — Phases 9-12 (shipped 2026-02-05)
- ✅ **v1.3 Data & Intelligence** — Phases 13-18 (shipped 2026-02-08)
- ✅ **v2.0 Statement Hub** — Phases 19-23 (shipped 2026-02-10)
- ✅ **v2.1 Billing & Monetization** — Phases 24-30 (shipped 2026-02-18)
- ✅ **v2.2 Financial Data Vault** — Phases 31-34 (shipped 2026-02-21)
- 🚧 **v3.0 Navigation & Account Vault** — Phases 35-40 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-01-30</summary>

- [x] Phase 1: Service Configuration (2 plans)
- [x] Phase 2: PDF Import Verification (2 plans)
- [x] Phase 3: Core CRUD Verification (2 plans)
- [x] Phase 4: Email Reminders Verification (1 plan)

</details>

<details>
<summary>✅ v1.1 Import Improvements (Phases 5-8) — SHIPPED 2026-02-02</summary>

- [x] Phase 5: Category Management (3 plans)
- [x] Phase 6: Statement Source Tracking (3 plans)
- [x] Phase 7: Smart Import UX (3 plans)
- [x] Phase 8: Renewal Date Intelligence (2 plans)

</details>

<details>
<summary>✅ v1.2 Production Polish (Phases 9-12) — SHIPPED 2026-02-05</summary>

- [x] Phase 9: Reliability Foundation (2 plans)
- [x] Phase 10: Error Handling (3 plans)
- [x] Phase 11: Loading & Empty States (2 plans)
- [x] Phase 12: Mobile & Visual Polish (3 plans)

</details>

<details>
<summary>✅ v1.3 Data & Intelligence (Phases 13-18) — SHIPPED 2026-02-08</summary>

- [x] Phase 13: Analytics Infrastructure (3 plans)
- [x] Phase 14: Duplicate Detection (4 plans)
- [x] Phase 15: Spending Analytics & Trends (3 plans)
- [x] Phase 16: Pattern Recognition (3 plans)
- [x] Phase 17: Spending Forecasting (4 plans)
- [x] Phase 18: Anomaly Detection & Alerts (4 plans)

</details>

<details>
<summary>✅ v2.0 Statement Hub (Phases 19-23) — SHIPPED 2026-02-10</summary>

- [x] Phase 19: Batch Upload Foundation (5 plans)
- [x] Phase 20: Statement Browser & Filtering (2 plans)
- [x] Phase 21: Manual Tagging & Conversion (6 plans)
- [x] Phase 22: Source Dashboard & Re-import (4 plans)
- [x] Phase 23: AI Suggestions & Pattern Detection (4 plans)

</details>

<details>
<summary>✅ v2.1 Billing & Monetization (Phases 24-30) — SHIPPED 2026-02-18</summary>

- [x] Phase 24: Webhook Infrastructure Hardening (3 plans)
- [x] Phase 25: Multi-Tier Product Setup (5 plans)
- [x] Phase 26: Feature Gating Infrastructure (2 plans)
- [x] Phase 27: Pricing & Portal UI (3 plans)
- [x] Phase 28: Voucher System (3 plans)
- [x] Phase 29: Apply Feature Gating (1 plan)
- [x] Phase 30: Fix URLs & Admin Security (2 plans)

</details>

<details>
<summary>✅ v2.2 Financial Data Vault (Phases 31-34) — SHIPPED 2026-02-21</summary>

- [x] Phase 31: Storage Foundation (2 plans) — completed 2026-02-19
- [x] Phase 32: PDF Viewer (2 plans) — completed 2026-02-19
- [x] Phase 33: Vault UI (2 plans) — completed 2026-02-20
- [x] Phase 34: Coverage & Historical Upload (3 plans) — completed 2026-02-21

</details>

### 🚧 v3.0 Navigation & Account Vault (In Progress)

**Milestone Goal:** Restructure the entire navigation into a structured financial hub and introduce account-level management where sources become named accounts with dedicated pages showing coverage, transactions, and spending.

- [ ] **Phase 35: Database Foundation** - financial_accounts table + nullable accountId FK on statements (migration 0011)
- [ ] **Phase 36: Navigation Restructure** - New sidebar section hierarchy, 308 redirects, active-state fix
- [ ] **Phase 37: Account CRUD + List Page** - API routes, hooks, AccountForm, account list grouped by type, source linking
- [ ] **Phase 38: Account Detail Pages** - Per-account page with coverage, transactions, and spending tabs
- [ ] **Phase 39: Payment Type Selector** - nuqs URL filters, type toggles, combined filters on Payments page
- [ ] **Phase 40: Static Pages** - Data Schema viewer + Help page with accordion FAQ

## Phase Details

### Phase 35: Database Foundation
**Goal**: The financial_accounts table and accountTypeEnum exist in the database, and statements have a nullable accountId FK column, unblocking all account feature work
**Depends on**: Phase 34
**Requirements**: Enables ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ACCT-06, ACCT-07, ACCT-08 (infrastructure phase — no direct user-facing requirement; all account requirements depend on this schema)
**Success Criteria** (what must be TRUE):
  1. Migration 0011 runs without error and financial_accounts table exists with accountTypeEnum (bank_debit, credit_card, loan) values
  2. statements table has a nullable accountId UUID column with FK referencing financial_accounts.id
  3. Drizzle schema exports financial_accounts table and accountTypeEnum so TypeScript types are available to all subsequent phases
  4. Generated SQL reviewed manually before execution and confirmed correct (no Drizzle FK bug #4147 corruption)
**Plans**: TBD

Plans:
- [ ] 35-01: TBD

### Phase 36: Navigation Restructure
**Goal**: Users can navigate the app through a reorganized sidebar with three named sections (fin Vault, payments Portal, Support), correct active state highlighting, and all existing bookmarked URLs still work via 308 redirects
**Depends on**: Phase 35
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. Sidebar displays three labeled sections — fin Vault, payments Portal, Support — each with the correct sub-items per spec
  2. All existing screens are reachable via the new menu paths (doc Vault, doc Load, subs Dash, subs Forecast, subs Master List, subs Selector, subs Suggestions, subs Settings)
  3. The active nav item highlights for exactly the current page with no false positives on parent or sibling items in the nested structure
  4. Any URL that moved returns a 308 redirect to the new path so existing bookmarks and email links continue to work
**Plans**: TBD

Plans:
- [ ] 36-01: TBD

### Phase 37: Account CRUD + List Page
**Goal**: Users can create, view, edit, and delete financial accounts of three types (Bank/Debit, Credit Card, Loan) with type-specific fields, see all accounts grouped by type on the data Vault page, and link existing statement sources to accounts
**Depends on**: Phase 35
**Requirements**: ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ACCT-06, ACCT-07, ACCT-08
**Success Criteria** (what must be TRUE):
  1. User can create a Bank/Debit, Credit Card, or Loan account with name and institution name; Credit Card accounts accept a credit limit field; Loan accounts accept interest rate and loan term fields
  2. User can edit any account's details and delete an account from the account list or detail page
  3. The data Vault page shows all accounts organized into three type groups (Bank/Debit, Credit Cards, Loans) with an empty state when no accounts exist
  4. User can link an existing statement source (sourceType string) to an account during creation or editing, and future imports from that source are automatically assigned to that account
**Plans**: TBD

Plans:
- [ ] 37-01: TBD

### Phase 38: Account Detail Pages
**Goal**: Each financial account has a dedicated page where users can view and edit account details, see coverage of linked statements by month, browse all transactions from linked statements, and review a spending summary
**Depends on**: Phase 37
**Requirements**: DETAIL-01, DETAIL-02, DETAIL-03, DETAIL-04
**Success Criteria** (what must be TRUE):
  1. Navigating to an account's page shows account details (name, type, institution, type-specific fields) and an edit form that saves changes
  2. The coverage tab on an account page shows the coverage grid scoped to statements linked to that account (months with PDF, data-only, or missing)
  3. The transactions tab shows the full virtualized transaction browser filtered to the account's linked statements, with all existing filters (search, date range, tag status) functional
  4. The spending tab shows total spent, top merchants, and a monthly breakdown chart derived from the account's linked transactions
**Plans**: TBD

Plans:
- [ ] 38-01: TBD

### Phase 39: Payment Type Selector
**Goal**: Users can filter the transaction browser by payment type (All, Recurring/Subscriptions, One-time) with the selection persisted in the URL and combined with all existing filters
**Depends on**: Phase 36
**Requirements**: FILTER-01, FILTER-02, FILTER-03
**Success Criteria** (what must be TRUE):
  1. The Payments page has a toggle group showing All, Recurring/Subscriptions, and One-time options that visibly change which transactions are displayed
  2. Selecting a payment type updates the URL via a shallow nuqs update without resetting the virtualized transaction list's scroll position
  3. The payment type filter works simultaneously with existing tag status, date range, and search filters — combining filters narrows results correctly
**Plans**: TBD

Plans:
- [ ] 39-01: TBD

### Phase 40: Static Pages
**Goal**: Users can view a read-only data schema page describing the system's data model and a Help page with accordion-organized FAQ and documentation
**Depends on**: Phase 36
**Requirements**: SCHEMA-01, HELP-01
**Success Criteria** (what must be TRUE):
  1. The Data Schema page renders a static read-only representation of the system data model (tables, columns, types, relationships) with no live DB queries
  2. The Help page displays FAQ and documentation content organized into accordion sections that expand and collapse independently
  3. Both pages are accessible via the Support section of the restructured sidebar (Phase 36)
**Plans**: TBD

Plans:
- [ ] 40-01: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 7/7 | Complete | 2026-01-30 |
| 5-8 | v1.1 | 11/11 | Complete | 2026-02-02 |
| 9-12 | v1.2 | 10/10 | Complete | 2026-02-05 |
| 13-18 | v1.3 | 21/21 | Complete | 2026-02-08 |
| 19-23 | v2.0 | 21/21 | Complete | 2026-02-10 |
| 24-30 | v2.1 | 19/19 | Complete | 2026-02-18 |
| 31-34 | v2.2 | 9/9 | Complete | 2026-02-21 |
| 35. Database Foundation | v3.0 | 0/TBD | Not started | - |
| 36. Navigation Restructure | v3.0 | 0/TBD | Not started | - |
| 37. Account CRUD + List Page | v3.0 | 0/TBD | Not started | - |
| 38. Account Detail Pages | v3.0 | 0/TBD | Not started | - |
| 39. Payment Type Selector | v3.0 | 0/TBD | Not started | - |
| 40. Static Pages | v3.0 | 0/TBD | Not started | - |

**Total:** 34 phases (1-34) complete, 6 phases (35-40) planned for v3.0

---
*Last updated: 2026-02-22 — v3.0 Navigation & Account Vault roadmap created*
