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
- ✅ **v3.1 Test & Export** — Phases 41-42 (shipped 2026-03-03)
- 🚧 **v3.2 UX & Performance** — Phases 43-46 (in progress)

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

<details>
<summary>✅ v3.1 Test & Export (Phases 41-42) — SHIPPED 2026-03-03</summary>

- [x] Phase 41: E2E Test Infrastructure (3 plans) — completed 2026-03-03
- [x] Phase 42: CSV Export (2 plans) — completed 2026-03-03

</details>

### 🚧 v3.2 UX & Performance (In Progress)

**Milestone Goal:** Complete deferred UX improvements and performance optimization — overlap detection, onboarding hints, sidebar redesign, and bundle/Lighthouse audit.

- [x] **Phase 43: Overlap Detection** - Detect and surface same-category subscription redundancies with per-group dismissal (completed 2026-03-03)
- [x] **Phase 44: Onboarding Hints** - Add contextual empty-state hints with persistent dismissal across all key zero-data screens (completed 2026-03-03)
- [ ] **Phase 45: Sidebar Redesign** - Rename all nav items to plain English and apply warm/friendly visual design in both light and dark modes
- [ ] **Phase 46: Performance Audit** - Generate bundle treemap, document Lighthouse baseline, and apply targeted optimizations

## Phase Details

### Phase 43: Overlap Detection
**Goal**: Users can see when they are paying for redundant subscriptions in the same category and dismiss warnings they have reviewed
**Depends on**: Phase 42 (v3.1 complete)
**Requirements**: OVRLP-01, OVRLP-02, OVRLP-03
**Success Criteria** (what must be TRUE):
  1. User sees a badge on each subscription row that belongs to a same-category overlap group (e.g., two streaming services both in "Entertainment")
  2. User can dismiss an overlap badge for a given group and the badge disappears immediately
  3. When subscriptions change (new addition, deletion, or category change), previously dismissed overlap badges re-surface automatically if the overlap condition is still valid
**Plans**: 2 plans

Plans:
- [ ] 43-01-PLAN.md — Detection logic (useOverlapGroups hook + OverlapBadge component)
- [ ] 43-02-PLAN.md — Dismissal storage (useOverlapDismissals hook) + wire into subscriptions page

### Phase 44: Onboarding Hints
**Goal**: New users encounter contextual guidance on every empty-data screen, with dismissal that persists so returning users are not interrupted
**Depends on**: Phase 43
**Requirements**: ONBRD-01, ONBRD-02, ONBRD-03, ONBRD-04, ONBRD-05, ONBRD-06
**Success Criteria** (what must be TRUE):
  1. User sees a hint with a clear action CTA on the subscriptions list, vault, transactions page, dashboard, and suggestions page when each has no data
  2. Each hint tells the user what to do next and links or buttons directly to the action (not just descriptive text)
  3. User can dismiss any individual hint with a single click or interaction
  4. After page refresh or browser restart, dismissed hints remain hidden (dismissal is persisted)
**Plans**: TBD

Plans:
- [ ] 44-01: TBD

### Phase 45: Sidebar Redesign
**Goal**: Users navigate using plain English labels in a warm, friendly sidebar that works correctly in light and dark mode while preserving feature-gate logic
**Depends on**: Phase 44
**Requirements**: SIDE-01, SIDE-02, SIDE-03, SIDE-04, SIDE-05, SIDE-06
**Success Criteria** (what must be TRUE):
  1. All sidebar nav items display plain English labels with no technical jargon or camelCase product names (e.g., "Dashboard" not "payments Portal")
  2. Active and hovered sidebar items use warm accent colors (Notion/Todoist aesthetic) in both light and dark mode
  3. Sidebar sections are reorganized into 4 or more logical groups with clear, readable section headers
  4. Sidebar icons are visually consistent with and complement the warm design without clashing or looking mismatched
  5. Feature-gated nav items remain locked for users without the required tier, using the typed nav item data structure
**Plans**: TBD

Plans:
- [ ] 45-01: TBD

### Phase 46: Performance Audit
**Goal**: The bundle is measured, a Lighthouse baseline is documented, and targeted import optimizations are applied based on the audit findings
**Depends on**: Phase 45
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. A bundle treemap report file is generated and committed to the repository so the current bundle composition is visible
  2. Lighthouse baseline scores are documented in the planning files with targets confirmed (Performance 80+, Accessibility 95+, Best Practices 95+)
  3. lucide-react is configured under optimizePackageImports in next.config.ts, reducing icon tree-shaking overhead
  4. Heavy libraries (react-pdf and recharts) are dynamically imported where they are used, reducing the initial page load bundle
**Plans**: TBD

Plans:
- [ ] 46-01: TBD

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
| 41-42 | v3.1 | 5/5 | Complete | 2026-03-03 |
| 43. Overlap Detection | 2/2 | Complete    | 2026-03-03 | - |
| 44. Onboarding Hints | 2/2 | Complete   | 2026-03-03 | - |
| 45. Sidebar Redesign | v3.2 | 0/TBD | Not started | - |
| 46. Performance Audit | v3.2 | 0/TBD | Not started | - |

**Total:** 42 phases complete (115 plans) + 4 phases in v3.2

---
*Last updated: 2026-03-03 — Phase 43 planned (2 plans)*
