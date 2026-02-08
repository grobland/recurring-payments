# Requirements: Subscription Manager v2.0

**Defined:** 2026-02-08
**Core Value:** Users can see all their subscriptions in one place and never get surprised by a renewal again

## v2.0 Requirements

Requirements for Statement Hub milestone. Each maps to roadmap phases.

### Batch Import

- [ ] **BATCH-01**: User can drag-and-drop multiple PDF files (12+) at once
- [ ] **BATCH-02**: User sees upload progress indicator per file
- [ ] **BATCH-03**: System processes PDFs sequentially to prevent memory exhaustion
- [ ] **BATCH-04**: User can resume interrupted batch (per-file status tracking)
- [ ] **BATCH-05**: System detects duplicate statements and prompts user to skip or re-import

### Statement Data

- [ ] **DATA-01**: System stores ALL line items from statements (not just subscriptions)
- [ ] **DATA-02**: Each line item links to its source (bank/credit card name)
- [ ] **DATA-03**: System fingerprints transactions for deduplication (merchant + amount + date)
- [ ] **DATA-04**: System auto-tags high-confidence items (>80%) as potential subscriptions

### Statement Browser

- [ ] **BRWS-01**: User can view list of all transactions across all sources
- [ ] **BRWS-02**: User can filter transactions by source (bank/card)
- [ ] **BRWS-03**: User can filter transactions by date range
- [ ] **BRWS-04**: User can search transactions by merchant name
- [ ] **BRWS-05**: Browser uses virtualized scrolling for 10k+ items
- [ ] **BRWS-06**: User can filter transactions by tags (potential, converted, dismissed)

### Manual Enrichment

- [ ] **ENRCH-01**: User can tag any transaction as "potential subscription"
- [ ] **ENRCH-02**: User can convert any transaction to subscription with one click
- [ ] **ENRCH-03**: User can bulk-tag multiple transactions at once
- [ ] **ENRCH-04**: Subscription form pre-fills with transaction data (name, amount, date)

### Source Management

- [ ] **SRC-01**: User sees source dashboard with cards per bank/credit card
- [ ] **SRC-02**: Each source card shows coverage dates (earliest to latest statement)
- [ ] **SRC-03**: User can view statement detail (all items from a specific import)
- [ ] **SRC-04**: User can re-import skipped items from previous statements

### AI Suggestions

- [ ] **AI-01**: System detects recurring patterns in statement data
- [ ] **AI-02**: System suggests subscriptions with evidence (occurrences, dates, amounts)
- [ ] **AI-03**: User can accept suggestion (creates subscription)
- [ ] **AI-04**: User can dismiss suggestion (won't show again)

## Future Requirements

Deferred to later milestones.

### Billing & Monetization
- **BILL-01**: User can subscribe to premium plan via Stripe
- **BILL-02**: User sees pricing page with plan comparison

### Production
- **PROD-01**: Custom domain configured
- **PROD-02**: Production email domain verified

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Automatic reconciliation | Enterprise complexity users don't need |
| Transaction splitting | Rare use case, adds UX friction |
| Budgeting features | Different product domain |
| Bank API integration (Plaid) | Security/compliance burden, PDF import sufficient |
| Mobile app | Web-first approach |
| OpenAI Batch API | 24-hour latency unacceptable for import flow |
| Parallel PDF processing | Memory exhaustion risk |
| OFFSET pagination | Performance collapse at scale |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BATCH-01 | TBD | Pending |
| BATCH-02 | TBD | Pending |
| BATCH-03 | TBD | Pending |
| BATCH-04 | TBD | Pending |
| BATCH-05 | TBD | Pending |
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| DATA-04 | TBD | Pending |
| BRWS-01 | TBD | Pending |
| BRWS-02 | TBD | Pending |
| BRWS-03 | TBD | Pending |
| BRWS-04 | TBD | Pending |
| BRWS-05 | TBD | Pending |
| BRWS-06 | TBD | Pending |
| ENRCH-01 | TBD | Pending |
| ENRCH-02 | TBD | Pending |
| ENRCH-03 | TBD | Pending |
| ENRCH-04 | TBD | Pending |
| SRC-01 | TBD | Pending |
| SRC-02 | TBD | Pending |
| SRC-03 | TBD | Pending |
| SRC-04 | TBD | Pending |
| AI-01 | TBD | Pending |
| AI-02 | TBD | Pending |
| AI-03 | TBD | Pending |
| AI-04 | TBD | Pending |

**Coverage:**
- v2.0 requirements: 27 total
- Mapped to phases: 0
- Unmapped: 27

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after initial definition*
