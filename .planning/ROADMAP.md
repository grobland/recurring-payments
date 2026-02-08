# Roadmap: Subscription Manager

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-01-30)
- ✅ **v1.1 Import Improvements** - Phases 5-8 (shipped 2026-02-02)
- ✅ **v1.2 Production Polish** - Phases 9-12 (shipped 2026-02-05)
- ✅ **v1.3 Data & Intelligence** - Phases 13-18 (shipped 2026-02-08)
- 📋 **v2.0 Statement Hub** - Phases 19-23 (planned)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-01-30</summary>

### Phase 1: Service Configuration
**Goal**: All external service integrations configured and verified
**Plans**: 4 plans

Plans:
- [x] 01-01: OpenAI GPT-4 Vision configuration
- [x] 01-02: Stripe test mode setup
- [x] 01-03: Resend email configuration
- [x] 01-04: Vercel deployment with cron jobs

### Phase 2: PDF Import Verification
**Goal**: PDF import flow works end-to-end with AI extraction
**Plans**: 2 plans

Plans:
- [x] 02-01: PDF parsing with pdf2json
- [x] 02-02: GPT-4 Vision extraction integration

### Phase 3: Core CRUD Verification
**Goal**: Subscription management fully functional with tests
**Plans**: 3 plans

Plans:
- [x] 03-01: Subscription CRUD API endpoints
- [x] 03-02: Dashboard UI with analytics
- [x] 03-03: E2E test coverage (7 tests)

### Phase 4: Email Reminders Verification
**Goal**: Email reminder system functional with logging
**Plans**: 2 plans

Plans:
- [x] 04-01: Reminder cron job implementation
- [x] 04-02: Email delivery with database tracking

</details>

<details>
<summary>v1.1 Import Improvements (Phases 5-8) - SHIPPED 2026-02-02</summary>

### Phase 5: Category Management
**Goal**: Users can fully manage subscription categories
**Plans**: 3 plans

Plans:
- [x] 05-01: Category CRUD operations
- [x] 05-02: Searchable category dropdown
- [x] 05-03: Category deletion handling

### Phase 6: Statement Source Tracking
**Goal**: Users can track import sources and reuse them
**Plans**: 3 plans

Plans:
- [x] 06-01: Statement source capture during import
- [x] 06-02: Autocomplete from previous imports
- [x] 06-03: Source management UI

### Phase 7: Smart Import UX
**Goal**: Users see all detected items with confidence scores
**Plans**: 3 plans

Plans:
- [x] 07-01: Confidence score visualization (green/yellow/red)
- [x] 07-02: Selective item import UI
- [x] 07-03: Raw extraction data storage

### Phase 8: Renewal Date Intelligence
**Goal**: Renewal dates calculated from transaction dates
**Plans**: 2 plans

Plans:
- [x] 08-01: Transaction date extraction
- [x] 08-02: Inline date editing with recalculation

</details>

<details>
<summary>v1.2 Production Polish (Phases 9-12) - SHIPPED 2026-02-05</summary>

### Phase 9: Reliability Foundation
**Goal**: Production monitoring and error tracking operational
**Plans**: 2 plans

Plans:
- [x] 09-01: Sentry integration with performance monitoring
- [x] 09-02: Structured logging and health checks

### Phase 10: Error Handling
**Goal**: Users see helpful error messages, not technical jargon
**Plans**: 3 plans

Plans:
- [x] 10-01: Error transformation utility
- [x] 10-02: Form validation improvements
- [x] 10-03: API retry logic

### Phase 11: Loading & Empty States
**Goal**: Users understand system state at all times
**Plans**: 2 plans

Plans:
- [x] 11-01: Loading states with skeleton loaders
- [x] 11-02: Empty state messages with CTAs

### Phase 12: Mobile & Visual Polish
**Goal**: App is mobile-first and visually consistent
**Plans**: 3 plans

Plans:
- [x] 12-01: Mobile responsiveness (44px touch targets)
- [x] 12-02: Typography and spacing refinement
- [x] 12-03: Visual consistency across all pages

</details>

<details>
<summary>v1.3 Data & Intelligence (Phases 13-18) - SHIPPED 2026-02-08</summary>

### Phase 13: Analytics Infrastructure
**Goal**: Analytics foundation with pre-computed aggregates for all intelligence features
**Plans**: 3 plans

Plans:
- [x] 13-01: Database materialized view + cron refresh infrastructure
- [x] 13-02: Analytics API endpoint + TanStack Query hook
- [x] 13-03: Dashboard UI (period selector, stat cards, donut chart)

### Phase 14: Duplicate Detection
**Goal**: Users are warned about potential duplicates during import and can find duplicates in existing subscriptions
**Plans**: 4 plans

Plans:
- [x] 14-01: TDD: Multi-field weighted similarity algorithm
- [x] 14-02: Import-time duplicate detection with warnings and actions
- [x] 14-03: Background scan, merge API, and subscriptions page UI
- [x] 14-04: Integration wiring and verification checkpoint

### Phase 15: Spending Analytics & Trends
**Goal**: Users can visualize spending trends over time and understand how spending changes
**Plans**: 3 plans

Plans:
- [x] 15-01: Trends API endpoint + useTrends hook
- [x] 15-02: TrendIndicator component + analytics cards enhancement
- [x] 15-03: YoY chart + category trends chart + dashboard integration

### Phase 16: Pattern Recognition
**Goal**: Users receive suggestions for subscriptions based on recurring charges detected across statements
**Plans**: 3 plans

Plans:
- [x] 16-01: Schema + pattern detection algorithm + category guesser
- [x] 16-02: API endpoints (detect, suggestions, accept, dismiss) + hooks
- [x] 16-03: Dashboard UI (PatternSuggestionsCard) + integration

### Phase 17: Spending Forecasting
**Goal**: Users can view predicted future spending with confidence intervals
**Plans**: 4 plans

Plans:
- [x] 17-01: Types, utilities, and calendar API endpoint
- [x] 17-02: Monthly and annual API endpoints + useForecast hooks
- [x] 17-03: Calendar view component with day selector
- [x] 17-04: Forecast charts + dashboard integration + verification

### Phase 18: Anomaly Detection & Alerts
**Goal**: Users are alerted to unusual spending patterns and subscription changes
**Plans**: 4 plans

Plans:
- [x] 18-01: Database schema + detection utilities + cron job
- [x] 18-02: Alerts API endpoints + TanStack Query hooks + price detection
- [x] 18-03: Notification bell UI + dropdown component
- [x] 18-04: Weekly digest email + cron job + verification

</details>

## v2.0 Statement Hub (Planned)

**Milestone Goal:** Transform import from single-file extraction to comprehensive statement management system with batch uploads, full data retention, and manual enrichment capabilities.

### Phase 19: Batch Upload Foundation
**Goal**: Users can upload multiple PDFs at once and system stores all statement line items with robust deduplication
**Depends on**: Phase 18
**Requirements**: BATCH-01, BATCH-02, BATCH-03, BATCH-04, BATCH-05, DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. User can drag-and-drop 12+ PDF files at once and see upload progress for each file
  2. System processes PDFs sequentially without memory exhaustion (handles 50-100MB files)
  3. All transactions from statements are stored (not just high-confidence subscriptions)
  4. System detects when user uploads duplicate statements and prompts to skip or re-import
  5. Batch import can resume if interrupted (per-file status tracking persists)
**Plans**: 5 plans

Plans:
- [ ] 19-01: Schema + file hashing utility (statements, transactions tables)
- [ ] 19-02: Batch API endpoints (check-hash, upload, process)
- [ ] 19-03: useBatchUpload hook (queue management, sequential processing)
- [ ] 19-04: UI components (BatchUploader, FileQueue, FileItem)
- [ ] 19-05: Integration + verification (batch import page, navigation)

### Phase 20: Statement Browser & Filtering
**Goal**: Users can browse and filter all stored transactions with fast, responsive UI
**Depends on**: Phase 19
**Requirements**: BRWS-01, BRWS-02, BRWS-03, BRWS-04, BRWS-05, BRWS-06
**Success Criteria** (what must be TRUE):
  1. User can view list of all transactions across all sources with virtualized scrolling (10k+ items at 60fps)
  2. User can filter transactions by source (bank/card), date range, and search by merchant name
  3. User can filter by tag status (potential subscription, converted, dismissed)
  4. Browser uses keyset pagination (not OFFSET) for fast page loads even at deep pages
  5. Mobile view shows card layout (not broken table with horizontal scrolling)
**Plans**: TBD

Plans:
- [ ] 20-01: TBD during phase planning
- [ ] 20-02: TBD during phase planning

### Phase 21: Manual Tagging & Conversion
**Goal**: Users can manually enrich statement data by tagging items and converting them to subscriptions
**Depends on**: Phase 20
**Requirements**: ENRCH-01, ENRCH-02, ENRCH-03, ENRCH-04
**Success Criteria** (what must be TRUE):
  1. User can tag any transaction as "potential subscription" with inline combobox (not modal)
  2. User can convert any transaction to subscription with one click (form pre-filled with transaction data)
  3. User can bulk-tag multiple transactions at once via multi-select
  4. Manual tags are preserved when user re-imports the same statement (not overwritten)
**Plans**: TBD

Plans:
- [ ] 21-01: TBD during phase planning
- [ ] 21-02: TBD during phase planning

### Phase 22: Source Dashboard & Re-import
**Goal**: Users can see overview of statement coverage and re-import items they initially skipped
**Depends on**: Phase 21
**Requirements**: SRC-01, SRC-02, SRC-03, SRC-04
**Success Criteria** (what must be TRUE):
  1. User sees dashboard with cards showing each bank/credit card's statement coverage (date range, item count)
  2. User can drill into specific statement to see all items (imported vs skipped)
  3. User can re-import items from previous statements they initially skipped
  4. Batch import that fails mid-process can be resumed from last successful file
**Plans**: TBD

Plans:
- [ ] 22-01: TBD during phase planning
- [ ] 22-02: TBD during phase planning

### Phase 23: AI Suggestions & Pattern Detection
**Goal**: System proactively suggests subscriptions based on recurring patterns in statement data
**Depends on**: Phase 22
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. System detects recurring patterns in statement data (same merchant, 3+ occurrences, monthly frequency)
  2. User sees suggestions dashboard showing potential subscriptions with evidence (dates, amounts, confidence scores)
  3. User can accept suggestion with one click (creates subscription) or dismiss permanently
  4. System auto-tags high-confidence items (>80%) as "potential_subscription" during import
**Plans**: TBD

Plans:
- [ ] 23-01: TBD during phase planning
- [ ] 23-02: TBD during phase planning

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Service Configuration | v1.0 | 4/4 | Complete | 2026-01-30 |
| 2. PDF Import | v1.0 | 2/2 | Complete | 2026-01-30 |
| 3. Core CRUD | v1.0 | 3/3 | Complete | 2026-01-30 |
| 4. Email Reminders | v1.0 | 2/2 | Complete | 2026-01-30 |
| 5. Category Management | v1.1 | 3/3 | Complete | 2026-02-02 |
| 6. Statement Source | v1.1 | 3/3 | Complete | 2026-02-02 |
| 7. Smart Import UX | v1.1 | 3/3 | Complete | 2026-02-02 |
| 8. Renewal Date Intelligence | v1.1 | 2/2 | Complete | 2026-02-02 |
| 9. Reliability Foundation | v1.2 | 2/2 | Complete | 2026-02-05 |
| 10. Error Handling | v1.2 | 3/3 | Complete | 2026-02-05 |
| 11. Loading & Empty States | v1.2 | 2/2 | Complete | 2026-02-05 |
| 12. Mobile & Visual Polish | v1.2 | 3/3 | Complete | 2026-02-05 |
| 13. Analytics Infrastructure | v1.3 | 3/3 | Complete | 2026-02-05 |
| 14. Duplicate Detection | v1.3 | 4/4 | Complete | 2026-02-06 |
| 15. Spending Analytics & Trends | v1.3 | 3/3 | Complete | 2026-02-06 |
| 16. Pattern Recognition | v1.3 | 3/3 | Complete | 2026-02-06 |
| 17. Spending Forecasting | v1.3 | 4/4 | Complete | 2026-02-07 |
| 18. Anomaly Detection & Alerts | v1.3 | 4/4 | Complete | 2026-02-08 |
| 19. Batch Upload Foundation | v2.0 | 0/TBD | Not started | - |
| 20. Statement Browser & Filtering | v2.0 | 0/TBD | Not started | - |
| 21. Manual Tagging & Conversion | v2.0 | 0/TBD | Not started | - |
| 22. Source Dashboard & Re-import | v2.0 | 0/TBD | Not started | - |
| 23. AI Suggestions & Pattern Detection | v2.0 | 0/TBD | Not started | - |
