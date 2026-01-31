# Requirements: Subscription Manager

**Defined:** 2026-01-31
**Core Value:** Users can see all their subscriptions in one place and never get surprised by a renewal again

## v1.1 Requirements

Requirements for milestone v1.1 "Import Improvements". Each maps to roadmap phases.

### Smart Import

- [ ] **IMPORT-01**: User sees all detected items from statement with confidence scores (0-100)
- [ ] **IMPORT-02**: User sees visual confidence indicators (green ≥70%, yellow 40-69%, red <40%)
- [ ] **IMPORT-03**: User can select which items to import via checkboxes
- [ ] **IMPORT-04**: High-confidence items (≥70%) are pre-selected by default
- [ ] **IMPORT-05**: System persists raw extraction data for audit and reprocessing
- [ ] **IMPORT-06**: User can click "Select all high confidence" to reset selection

### Statement Sources

- [ ] **SOURCE-01**: User can enter bank/credit card name during import
- [ ] **SOURCE-02**: Statement source is stored with import audit record
- [ ] **SOURCE-03**: Subscription detail page displays which source it came from
- [ ] **SOURCE-04**: Bank/card name field autocompletes from previous sources

### Renewal Date

- [ ] **RENEW-01**: System extracts transaction date from statement text via AI
- [ ] **RENEW-02**: Next renewal date is calculated from transaction date (not import date)
- [ ] **RENEW-03**: User can override the calculated renewal date during import

### Category Management

- [ ] **CAT-01**: Category dropdown shows no duplicates (bug fix)
- [ ] **CAT-02**: User can create a new category with name, icon, and color
- [ ] **CAT-03**: User can edit an existing category
- [ ] **CAT-04**: User can delete a category (subscriptions become uncategorized)
- [ ] **CAT-05**: Category dropdown is searchable (Combobox pattern)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Smart Import (v1.2+)

- **IMPORT-07**: User can view import history and reprocess past statements

### Statement Sources (v1.2+)

- **SOURCE-05**: User can group subscriptions by source in list view
- **SOURCE-06**: Dashboard shows spending breakdown by source

### Renewal Date (v1.2+)

- **RENEW-04**: System detects billing patterns across multiple statements
- **RENEW-05**: User can set "remind X days earlier than calculated"

### Category Management (v1.2+)

- **CAT-06**: Category list shows usage stats (subscription count, total spend)

### Billing (deferred from v1.0)

- **BILL-01**: User trial status enforced (14-day limit)
- **BILL-02**: User can subscribe via Stripe checkout
- **BILL-03**: Billing status updates via webhook

### Production (deferred from v1.0)

- **PROD-01**: Custom domain configured
- **PROD-02**: Production environment variables set
- **PROD-03**: Error monitoring configured

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| AI confidence calibration dashboard | Complexity; defer until usage data collected |
| Multi-statement pattern detection | Requires historical data; defer to v1.2+ |
| Real-time OCR preview | High complexity, marginal value for MVP |
| Bulk category operations | CRUD sufficient for v1.1 |
| Source-based filtering in list | Nice-to-have, defer to v1.2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMPORT-01 | TBD | Pending |
| IMPORT-02 | TBD | Pending |
| IMPORT-03 | TBD | Pending |
| IMPORT-04 | TBD | Pending |
| IMPORT-05 | TBD | Pending |
| IMPORT-06 | TBD | Pending |
| SOURCE-01 | TBD | Pending |
| SOURCE-02 | TBD | Pending |
| SOURCE-03 | TBD | Pending |
| SOURCE-04 | TBD | Pending |
| RENEW-01 | TBD | Pending |
| RENEW-02 | TBD | Pending |
| RENEW-03 | TBD | Pending |
| CAT-01 | TBD | Pending |
| CAT-02 | TBD | Pending |
| CAT-03 | TBD | Pending |
| CAT-04 | TBD | Pending |
| CAT-05 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 (pending roadmap creation)

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after initial definition*
