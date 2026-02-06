# Requirements: Subscription Manager v1.3

**Defined:** 2026-02-05
**Core Value:** Users can see all their subscriptions in one place and never get surprised by a renewal again

## v1.3 Requirements

Requirements for Data & Intelligence milestone. Each maps to roadmap phases.

### Duplicate Detection

- [x] **DUP-01**: User sees warning when importing subscription similar to existing one
- [x] **DUP-02**: User can view similarity score and matching fields during import
- [x] **DUP-03**: User can choose to keep both, merge, or skip duplicate during import
- [x] **DUP-04**: User can trigger background scan for potential duplicates in existing subscriptions
- [x] **DUP-05**: User can review list of potential duplicates found by background scan
- [x] **DUP-06**: User can merge two subscriptions into one (combining best data from both)

### Spending Analytics

- [x] **ANLYT-01**: User can view total monthly spending on dashboard
- [x] **ANLYT-02**: User can view total yearly spending on dashboard
- [x] **ANLYT-03**: User can view spending breakdown by category (pie/bar chart)
- [ ] **ANLYT-04**: User can view month-over-month spending change with trend indicator
- [ ] **ANLYT-05**: User can view year-over-year spending comparison chart
- [ ] **ANLYT-06**: User can view spending trend over time for each category

### Pattern Recognition

- [ ] **PTRN-01**: System detects recurring charges across multiple statement imports
- [ ] **PTRN-02**: User sees suggested subscriptions from detected patterns with confidence
- [ ] **PTRN-03**: User can accept pattern suggestion to create subscription or dismiss it

### Forecasting

- [ ] **FCST-01**: User can view upcoming charges calendar showing next 30/60/90 days
- [ ] **FCST-02**: User can view monthly spending projections for upcoming months
- [ ] **FCST-03**: User can view annual spending forecast with total projection
- [ ] **FCST-04**: Forecasts display confidence intervals showing uncertainty range

### Anomaly Alerts

- [ ] **ALRT-01**: User is alerted when a subscription's price increases (>5% or >$2)
- [ ] **ALRT-02**: User can view all alerts in a notification center
- [ ] **ALRT-03**: User can dismiss or acknowledge alerts
- [ ] **ALRT-04**: User is alerted when expected renewal charge doesn't appear (missed renewal)

## Future Requirements

Deferred to v1.4+. Tracked but not in current roadmap.

### Advanced Analytics

- **ANLYT-07**: User can export analytics data (CSV/PDF)
- **ANLYT-08**: User can set custom date ranges for analytics

### Advanced Alerts

- **ALRT-05**: User receives weekly digest email of alerts
- **ALRT-06**: User can configure alert thresholds (custom price change %)
- **ALRT-07**: User is alerted for unexpected charges (not matching known subscriptions)

### Advanced Forecasting

- **FCST-05**: User can run "what-if" scenarios (if I cancel X...)
- **FCST-06**: User can compare forecast to actual spending

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| ML-based pattern detection | Cold start problem — not enough data per user; heuristics sufficient |
| Real-time anomaly alerts | Alert fatigue risk — weekly batching preferred per research |
| Collaborative filtering | Requires cross-user data; privacy concerns; insufficient scale |
| Auto-merge duplicates | User trust critical — always require confirmation |
| Complex statistical models | simple-statistics library sufficient; ARIMA/etc. overkill for subscription data |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DUP-01 | Phase 14 | Complete |
| DUP-02 | Phase 14 | Complete |
| DUP-03 | Phase 14 | Complete |
| DUP-04 | Phase 14 | Complete |
| DUP-05 | Phase 14 | Complete |
| DUP-06 | Phase 14 | Complete |
| ANLYT-01 | Phase 13 | Complete |
| ANLYT-02 | Phase 13 | Complete |
| ANLYT-03 | Phase 13 | Complete |
| ANLYT-04 | Phase 15 | Pending |
| ANLYT-05 | Phase 15 | Pending |
| ANLYT-06 | Phase 15 | Pending |
| PTRN-01 | Phase 16 | Pending |
| PTRN-02 | Phase 16 | Pending |
| PTRN-03 | Phase 16 | Pending |
| FCST-01 | Phase 17 | Pending |
| FCST-02 | Phase 17 | Pending |
| FCST-03 | Phase 17 | Pending |
| FCST-04 | Phase 17 | Pending |
| ALRT-01 | Phase 18 | Pending |
| ALRT-02 | Phase 18 | Pending |
| ALRT-03 | Phase 18 | Pending |
| ALRT-04 | Phase 18 | Pending |

**Coverage:**
- v1.3 requirements: 23 total
- Mapped to phases: 23/23 (100%)
- Unmapped: 0

**Phase distribution:**
- Phase 13 (Analytics Infrastructure): 3 requirements
- Phase 14 (Duplicate Detection): 6 requirements
- Phase 15 (Spending Analytics & Trends): 3 requirements
- Phase 16 (Pattern Recognition): 3 requirements
- Phase 17 (Spending Forecasting): 4 requirements
- Phase 18 (Anomaly Detection & Alerts): 4 requirements

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 after roadmap creation*
