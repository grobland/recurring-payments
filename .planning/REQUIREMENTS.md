# Requirements: Subscription Manager

**Defined:** 2026-02-22
**Core Value:** Users can see all their subscriptions in one place and never get surprised by a renewal again

## v3.0 Requirements

Requirements for v3.0 Navigation & Account Vault milestone.

### Navigation Restructure

- [ ] **NAV-01**: User can see reorganized sidebar with fin Vault, payments Portal, and Support sections with correct sub-items per spec
- [ ] **NAV-02**: User can navigate to all existing screens via new menu paths (doc Vault, doc Load, subs Dash, subs Forecast, subs Master List, subs Selector, subs Suggestions, subs Settings)
- [ ] **NAV-03**: Active nav item highlights correctly for nested section structure
- [ ] **NAV-04**: Old URL routes redirect (308) to new paths preserving bookmarks and email links

### Account Management

- [ ] **ACCT-01**: User can create a financial account with name, type (Bank/Debit, Credit Card, or Loan), and institution name
- [ ] **ACCT-02**: Loan accounts include type-specific fields: interest rate and loan term
- [ ] **ACCT-03**: Credit card accounts include type-specific field: credit limit
- [ ] **ACCT-04**: User can edit a financial account's details
- [ ] **ACCT-05**: User can delete a financial account
- [ ] **ACCT-06**: User can see all accounts on the data Vault page grouped by type (Bank/Debit, Credit Cards, Loans)
- [ ] **ACCT-07**: User can link an existing statement source (sourceType string) to a financial account
- [ ] **ACCT-08**: Future PDF imports from a linked source are automatically assigned to the associated account

### Account Detail Pages

- [ ] **DETAIL-01**: User can view account details and edit from the account's own page
- [ ] **DETAIL-02**: User can view coverage grid scoped to the account's linked statements
- [ ] **DETAIL-03**: User can browse transactions from the account's linked statements
- [ ] **DETAIL-04**: User can view spending summary (total spent, top merchants, monthly breakdown) for the account

### Payment Type Selector

- [ ] **FILTER-01**: User can toggle transaction types (Recurring/Subscriptions, One-time) on the Payment Type Selector page
- [ ] **FILTER-02**: Selected type filters persist in the URL (nuqs shallow updates, no scroll reset)
- [ ] **FILTER-03**: Type filters combine with existing tag status, date range, and search filters

### Static Pages

- [ ] **SCHEMA-01**: User can view a static read-only representation of the system data model on the Data Schema page
- [ ] **HELP-01**: User can view static FAQ and documentation on the Help page with accordion sections

## Future Requirements

### Enhanced Account Management

- **ACCT-F01**: User can link multiple sourceType strings to one account (e.g., "Chase" and "Chase Sapphire" → same account)
- **ACCT-F02**: Account merge/consolidation for duplicate accounts
- **ACCT-F03**: Real-time account balance tracking

### Analytics

- **ANLYT-F01**: Cross-account spending comparison
- **ANLYT-F02**: Net worth snapshot derived from account balances
- **ANLYT-F03**: Year-end financial summary / exportable report

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-migrate all sources to accounts | User trust — account naming and type assignment must be user-controlled |
| Account merge/deduplicate UI | Trust-destroying in financial context; defer to future |
| Live DB introspection for schema viewer | Security risk; static metadata is correct approach |
| Multiple sourceType strings per account (junction table) | Complexity; one-to-one source link sufficient for v3.0 |
| Account balance tracking | Requires bank API or manual entry — out of scope per existing decision |
| Bank API integration (Plaid/MX) | Compliance burden and cost prohibitive — carried forward from prior milestones |
| Interactive schema editor | Security risk; read-only viewer only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | — | Pending |
| NAV-02 | — | Pending |
| NAV-03 | — | Pending |
| NAV-04 | — | Pending |
| ACCT-01 | — | Pending |
| ACCT-02 | — | Pending |
| ACCT-03 | — | Pending |
| ACCT-04 | — | Pending |
| ACCT-05 | — | Pending |
| ACCT-06 | — | Pending |
| ACCT-07 | — | Pending |
| ACCT-08 | — | Pending |
| DETAIL-01 | — | Pending |
| DETAIL-02 | — | Pending |
| DETAIL-03 | — | Pending |
| DETAIL-04 | — | Pending |
| FILTER-01 | — | Pending |
| FILTER-02 | — | Pending |
| FILTER-03 | — | Pending |
| SCHEMA-01 | — | Pending |
| HELP-01 | — | Pending |

**Coverage:**
- v3.0 requirements: 21 total
- Mapped to phases: 0 (populated by roadmapper)
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after initial definition*
