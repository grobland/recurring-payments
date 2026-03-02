# Roadmap: Subscription Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-01-30)
- ✅ **v1.1 Import Improvements** — Phases 5-8 (shipped 2026-02-02)
- ✅ **v1.2 Production Polish** — Phases 9-12 (shipped 2026-02-05)
- ✅ **v1.3 Data & Intelligence** — Phases 13-18 (shipped 2026-02-08)
- ✅ **v2.0 Statement Hub** — Phases 19-23 (shipped 2026-02-10)
- ✅ **v2.1 Billing & Monetization** — Phases 24-30 (shipped 2026-02-18)
- ✅ **v2.2 Financial Data Vault** — Phases 31-34 (shipped 2026-02-21)
- ✅ **v3.0 Navigation & Account Vault** — Phases 35-40 (shipped 2026-02-27)
- 🚧 **v3.1 UX & Quality** — Phases 41-46 (in progress)

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

<details>
<summary>✅ v3.0 Navigation & Account Vault (Phases 35-40) — SHIPPED 2026-02-27</summary>

- [x] Phase 35: Database Foundation (2 plans) — completed 2026-02-22
- [x] Phase 36: Navigation Restructure (3 plans) — completed 2026-02-25
- [x] Phase 37: Account CRUD + List Page (2 plans) — completed 2026-02-26
- [x] Phase 38: Account Detail Pages (2 plans) — completed 2026-02-26
- [x] Phase 39: Payment Type Selector (2 plans) — completed 2026-02-27
- [x] Phase 40: Static Pages (1 plan) — completed 2026-02-27

</details>

### 🚧 v3.1 UX & Quality (In Progress)

**Milestone Goal:** Redesign the sidebar for clarity and warmth, add onboarding hints for new users, enable data export, detect subscription overlaps, and establish E2E test coverage with performance optimization.

- [ ] **Phase 41: E2E Test Infrastructure** - Fix broken v3.0 auth setup and establish regression baseline with 25-30 Playwright tests covering all major flows
- [ ] **Phase 42: CSV Export** - Add export buttons for subscriptions and transactions with security-hardened CSV output
- [ ] **Phase 43: Overlap Detection** - Detect and surface same-category subscription redundancies with per-group dismissal
- [ ] **Phase 44: Onboarding Hints** - Add contextual empty-state hints with persistent dismissal across all key zero-data screens
- [ ] **Phase 45: Sidebar Redesign** - Rename all nav items to plain English and apply warm/friendly visual design in both light and dark modes
- [ ] **Phase 46: Performance Audit** - Generate bundle treemap, document Lighthouse baseline, and apply targeted optimizations

## Phase Details

### Phase 41: E2E Test Infrastructure
**Goal**: Reliable Playwright test suite covering all major v3.1 user flows runs clean with zero auth failures
**Depends on**: Nothing (first phase of v3.1)
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Existing E2E tests pass with correct v3.0 URLs and zero auth errors from stale `waitForURL` calls
  2. 25-30 Playwright tests cover auth, subscriptions, vault, analytics, billing, accounts, export, overlap, and onboarding flows
  3. Interactive elements have `data-testid` attributes that tests rely on for reliable selectors
**Plans**: 3 plans
- [ ] 41-01-PLAN.md -- Fix auth setup, update existing test URLs, add data-testid attributes
- [ ] 41-02-PLAN.md -- Write auth, vault, analytics, billing, and accounts test specs
- [ ] 41-03-PLAN.md -- Write export, overlap, and onboarding test specs

### Phase 42: CSV Export
**Goal**: Users can download their subscription and transaction data as well-formatted, safe CSV files
**Depends on**: Phase 41
**Requirements**: EXPRT-01, EXPRT-02, EXPRT-03, EXPRT-04
**Success Criteria** (what must be TRUE):
  1. User can click an export button on the subscriptions page and receive a CSV file of all active subscriptions
  2. User can click an export button on the transactions page and receive a CSV file of transaction history
  3. CSV files open correctly in Excel for international users (UTF-8 BOM present, special characters preserved)
  4. CSV cells with leading `=`, `+`, `-`, or `@` characters are sanitized so they do not execute as formulas in Excel
**Plans**: TBD

### Phase 43: Overlap Detection
**Goal**: Users can see which subscriptions may be redundant and dismiss warnings per overlap group
**Depends on**: Phase 42
**Requirements**: OVRLP-01, OVRLP-02, OVRLP-03
**Success Criteria** (what must be TRUE):
  1. Subscriptions in the same category with similar amounts and nearby renewal dates display an inline amber badge on their rows
  2. User can dismiss an overlap badge for a group and it stays dismissed across page refresh
  3. Dismissed overlap badges reappear automatically when a subscription in that category is added, removed, or updated
**Plans**: TBD

### Phase 44: Onboarding Hints
**Goal**: New users see contextual guidance on every zero-data screen with a clear action to take next
**Depends on**: Phase 43
**Requirements**: ONBRD-01, ONBRD-02, ONBRD-03, ONBRD-04, ONBRD-05, ONBRD-06
**Success Criteria** (what must be TRUE):
  1. User sees a contextual hint with a direct action CTA on each of the five empty-state screens (subscriptions, vault, transactions, dashboard, suggestions)
  2. Hints only appear when the screen has no data and the page has finished loading (no flash during load)
  3. User can dismiss any individual hint and it does not reappear after page refresh or navigation away and back
**Plans**: TBD

### Phase 45: Sidebar Redesign
**Goal**: Navigation uses plain English labels and a warm, friendly visual style that works in both light and dark modes
**Depends on**: Phase 44
**Requirements**: SIDE-01, SIDE-02, SIDE-03, SIDE-04, SIDE-05, SIDE-06
**Success Criteria** (what must be TRUE):
  1. All sidebar nav items display plain English labels with no internal shorthand (e.g., "Dashboard", "Subscriptions", "Upload Statements")
  2. The active nav item is visually distinct with a warm accent color that clearly communicates the current location
  3. Sidebar sections are organized into 4 or more logical groups with clear, user-facing section names
  4. Feature-gate wrappers and locked nav items remain fully functional after the visual redesign
  5. Warm theme displays correctly with no broken colors or contrast failures in dark mode
**Plans**: TBD

### Phase 46: Performance Audit
**Goal**: Bundle size is understood, Lighthouse baseline is documented, and known heavy imports are optimized
**Depends on**: Phase 45
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Bundle treemap report is generated and committed so future milestones have a size baseline to compare against
  2. Lighthouse scores are documented against the production build (targets: Performance 80+, Accessibility 95+, Best Practices 95+)
  3. `lucide-react` is configured with `optimizePackageImports` in `next.config.ts`, reducing icon bundle weight
  4. Heavy components identified by the audit (react-pdf, recharts) are dynamically imported to reduce initial bundle
**Plans**: TBD

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
| 35-40 | v3.0 | 12/12 | Complete | 2026-02-27 |
| 41. E2E Test Infrastructure | v3.1 | 0/3 | Planned | - |
| 42. CSV Export | v3.1 | 0/TBD | Not started | - |
| 43. Overlap Detection | v3.1 | 0/TBD | Not started | - |
| 44. Onboarding Hints | v3.1 | 0/TBD | Not started | - |
| 45. Sidebar Redesign | v3.1 | 0/TBD | Not started | - |
| 46. Performance Audit | v3.1 | 0/TBD | Not started | - |

**Total:** 40 phases complete (110 plans) + 6 phases planned for v3.1

---
*Last updated: 2026-03-02 — v3.1 roadmap created*
