# Roadmap: Subscription Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-01-30)
- ✅ **v1.1 Import Improvements** — Phases 5-8 (shipped 2026-02-02)
- ✅ **v1.2 Production Polish** — Phases 9-12 (shipped 2026-02-05)
- ✅ **v1.3 Data & Intelligence** — Phases 13-18 (shipped 2026-02-08)
- ✅ **v2.0 Statement Hub** — Phases 19-23 (shipped 2026-02-10)
- ✅ **v2.1 Billing & Monetization** — Phases 24-30 (shipped 2026-02-18)
- 🚧 **v2.2 Financial Data Vault** — Phases 31-34 (in progress)

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

### v2.2 Financial Data Vault (In Progress)

**Milestone Goal:** Transform the app into a financial data vault where users store, organize, and browse original bank statement PDFs with all data extracted into the database.

- [x] **Phase 31: Storage Foundation** - Wire Supabase Storage into the batch import flow so uploaded PDFs are persisted and retrievable
- [x] **Phase 32: PDF Viewer** - Deliver an in-app modal that renders stored PDFs page by page with download capability (completed 2026-02-19)
- [ ] **Phase 33: Vault UI** - Build the /vault page with file cabinet and timeline views for browsing all stored statements
- [ ] **Phase 34: Coverage & Historical Upload** - Surface a coverage grid showing gaps and guide users to fill missing months via a wizard

## Phase Details

### Phase 31: Storage Foundation
**Goal**: Uploaded PDFs are persisted in Supabase Storage during import so every new statement has a retrievable original file
**Depends on**: Phase 30 (v2.1 complete)
**Requirements**: STOR-01, STOR-02
**Success Criteria** (what must be TRUE):
  1. When a user uploads a PDF through batch import, the file appears in the Supabase Storage private bucket under their user ID path
  2. The `pdfStoragePath` column on the statement row is non-null after a successful upload
  3. Statements imported before v2.2 show a "No file stored" indicator rather than a broken link or error
  4. If the storage upload fails, the import still completes successfully with `pdfStoragePath = NULL` (non-fatal degradation)
**Plans**: 2 plans

Plans:
- [x] 31-01-PLAN.md — Storage infrastructure + batch upload integration (STOR-01)
- [x] 31-02-PLAN.md — hasPdf API field + PDF status icon UI (STOR-02)

### Phase 32: PDF Viewer
**Goal**: Users can open any stored PDF in a modal dialog and view all pages in-app, or download the original file
**Depends on**: Phase 31
**Requirements**: VIEW-01, VIEW-02
**Success Criteria** (what must be TRUE):
  1. User can click "View PDF" on any statement with a stored file and see the PDF rendered in a modal within the app
  2. User can navigate between pages of a multi-page PDF using previous/next controls
  3. User can click "Download" to save the original PDF file to their computer
  4. If the PDF fails to render, the modal shows a fallback download link rather than a blank screen
**Plans**: 2 plans

Plans:
- [x] 32-01-PLAN.md — PDF viewer components, hook, and download-aware API endpoint (VIEW-01, VIEW-02)
- [x] 32-02-PLAN.md — Wire viewer into statement list and detail views (VIEW-01, VIEW-02)

### Phase 33: Vault UI
**Goal**: Users can browse all their statements in a dedicated vault page with both a source-grouped file cabinet view and a chronological timeline view
**Depends on**: Phase 32
**Requirements**: VAULT-01, VAULT-02, VAULT-03, VAULT-04
**Success Criteria** (what must be TRUE):
  1. User can navigate to /vault from the sidebar and see all statements grouped by source in an expandable file cabinet view
  2. User can switch to a timeline view showing statements sorted chronologically with month separators
  3. User's last chosen view (file cabinet or timeline) is remembered across sessions without requiring a login
  4. A user who has never uploaded any statements sees an empty state with guidance text and a clear upload call to action
**Plans**: 2 plans

Plans:
- [ ] 33-01-PLAN.md — Vault page, sidebar nav, file cabinet view with expandable folder cards, empty state (VAULT-01, VAULT-03, VAULT-04)
- [ ] 33-02-PLAN.md — Timeline API endpoint, calendar grid view, stats bar (VAULT-02, VAULT-03)

### Phase 34: Coverage & Historical Upload
**Goal**: Users can see which months have stored PDFs versus data-only versus missing, and use a guided wizard to upload historical statements for gap months
**Depends on**: Phase 33
**Requirements**: VENH-01, VENH-02
**Success Criteria** (what must be TRUE):
  1. User can see a grid for each source showing the last 12-24 months with distinct visual states for "PDF stored," "data only — no file," and "no data"
  2. User can click into a gap month on the coverage grid and open a wizard that guides them through uploading a statement for that specific source and month
  3. After completing the wizard upload, the coverage grid updates to reflect the newly stored PDF
**Plans**: TBD

Plans:
- [ ] 34-01: TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-4 | v1.0 | 7 | Complete | 2026-01-30 |
| 5-8 | v1.1 | 11 | Complete | 2026-02-02 |
| 9-12 | v1.2 | 10 | Complete | 2026-02-05 |
| 13-18 | v1.3 | 21 | Complete | 2026-02-08 |
| 19-23 | v2.0 | 21 | Complete | 2026-02-10 |
| 24-30 | v2.1 | 19 | Complete | 2026-02-18 |
| 31. Storage Foundation | v2.2 | Complete    | 2026-02-19 | 2026-02-19 |
| 32. PDF Viewer | 2/2 | Complete   | 2026-02-19 | 2026-02-19 |
| 33. Vault UI | 1/2 | In Progress|  | - |
| 34. Coverage & Historical Upload | v2.2 | TBD | Not started | - |

**Total:** 30 phases, 91 plans completed across 6 milestones (+ 2 phases remaining for v2.2)

---
*Last updated: 2026-02-19 after Phase 32 verified*
