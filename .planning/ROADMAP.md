# Roadmap: Subscription Manager

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-01-30)
- ✅ **v1.1 Import Improvements** - Phases 5-8 (shipped 2026-02-02)
- ✅ **v1.2 Production Polish** - Phases 9-12 (shipped 2026-02-05)
- 🚧 **v1.3 Data & Intelligence** - Phases 13-18 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-01-30</summary>

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
<summary>✅ v1.1 Import Improvements (Phases 5-8) - SHIPPED 2026-02-02</summary>

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
<summary>✅ v1.2 Production Polish (Phases 9-12) - SHIPPED 2026-02-05</summary>

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

### 🚧 v1.3 Data & Intelligence (In Progress)

**Milestone Goal:** Transform raw subscription data into actionable insights with duplicate detection, pattern recognition, and comprehensive spending analytics.

#### Phase 13: Analytics Infrastructure
**Goal**: Analytics foundation with pre-computed aggregates for all intelligence features
**Depends on**: Phase 12
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03
**Success Criteria** (what must be TRUE):
  1. User can view total monthly spending on dashboard (normalized to user's default currency)
  2. User can view total yearly spending on dashboard (current year)
  3. User can view spending breakdown by category with visual chart (pie/bar)
  4. Analytics data refreshes automatically every 15 minutes via background job
  5. Dashboard analytics load in under 100ms (querying materialized views)
**Plans**: 3 plans

Plans:
- [x] 13-01-PLAN.md — Database materialized view + cron refresh infrastructure
- [x] 13-02-PLAN.md — Analytics API endpoint + TanStack Query hook
- [x] 13-03-PLAN.md — Dashboard UI (period selector, stat cards, donut chart)

#### Phase 14: Duplicate Detection
**Goal**: Users are warned about potential duplicates during import and can find duplicates in existing subscriptions
**Depends on**: Phase 13
**Requirements**: DUP-01, DUP-02, DUP-03, DUP-04, DUP-05, DUP-06
**Success Criteria** (what must be TRUE):
  1. User sees warning banner when importing subscription similar to existing one (85%+ similarity)
  2. User can view similarity score and matching fields (name, amount, frequency) during import
  3. User can choose to keep both, skip duplicate, or merge during import
  4. User can trigger background scan from subscriptions page to find all potential duplicates
  5. User can review list of potential duplicates with evidence (matching fields displayed)
  6. User can merge two subscriptions into one, combining best data from both records
**Plans**: 4 plans

Plans:
- [x] 14-01-PLAN.md — TDD: Multi-field weighted similarity algorithm
- [x] 14-02-PLAN.md — Import-time duplicate detection with warnings and actions
- [x] 14-03-PLAN.md — Background scan, merge API, and subscriptions page UI
- [x] 14-04-PLAN.md — Integration wiring and verification checkpoint

#### Phase 15: Spending Analytics & Trends
**Goal**: Users can visualize spending trends over time and understand how spending changes
**Depends on**: Phase 13
**Requirements**: ANLYT-04, ANLYT-05, ANLYT-06
**Success Criteria** (what must be TRUE):
  1. User can view month-over-month spending change with percentage and trend indicator (up/down arrow)
  2. User can view year-over-year spending comparison in line chart (current vs previous year)
  3. User can view spending trend over time for each category with multi-line chart
  4. Charts handle multi-currency subscriptions correctly (converted at transaction-time rates)
  5. Trends display meaningful data even with limited history (graceful degradation)
**Plans**: TBD

Plans:
- [ ] 15-01: TBD

#### Phase 16: Pattern Recognition
**Goal**: Users receive suggestions for subscriptions based on recurring charges detected across statements
**Depends on**: Phase 13
**Requirements**: PTRN-01, PTRN-02, PTRN-03
**Success Criteria** (what must be TRUE):
  1. System detects recurring charges across multiple statement imports (same merchant, similar amount, regular frequency)
  2. User sees suggested subscriptions from detected patterns with confidence score (70%+ shown)
  3. User can accept pattern suggestion to create subscription with pre-filled data
  4. User can dismiss pattern suggestion permanently (won't show again for this pattern)
  5. Pattern suggestions display evidence: charge dates, amounts, detected frequency
**Plans**: TBD

Plans:
- [ ] 16-01: TBD

#### Phase 17: Spending Forecasting
**Goal**: Users can view predicted future spending with confidence intervals
**Depends on**: Phase 15
**Requirements**: FCST-01, FCST-02, FCST-03, FCST-04
**Success Criteria** (what must be TRUE):
  1. User can view upcoming charges calendar showing next 30/60/90 days with known renewals
  2. User can view monthly spending projections for next 3-6 months
  3. User can view annual spending forecast with total projection (extrapolated from current subscriptions)
  4. Forecasts display confidence intervals (80% and 95% bands) showing uncertainty range via fan charts
  5. Forecasts incorporate known renewal events (annual subscriptions) not just averages
**Plans**: TBD

Plans:
- [ ] 17-01: TBD

#### Phase 18: Anomaly Detection & Alerts
**Goal**: Users are alerted to unusual spending patterns and subscription changes
**Depends on**: Phase 15
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04
**Success Criteria** (what must be TRUE):
  1. User is alerted when a subscription's price increases beyond threshold (>5% or >$2)
  2. User can view all alerts in notification center with timestamps and context
  3. User can dismiss individual alerts or acknowledge them (mark as reviewed)
  4. User is alerted when expected renewal charge doesn't appear (missed renewal detection)
  5. Alerts are batched in weekly digest (not real-time) to prevent alert fatigue
**Plans**: TBD

Plans:
- [ ] 18-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 13 → 14 → 15 → 16 → 17 → 18

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
| 15. Spending Analytics & Trends | v1.3 | 0/0 | Not started | - |
| 16. Pattern Recognition | v1.3 | 0/0 | Not started | - |
| 17. Spending Forecasting | v1.3 | 0/0 | Not started | - |
| 18. Anomaly Detection & Alerts | v1.3 | 0/0 | Not started | - |
