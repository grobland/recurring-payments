# Requirements

## Active

### LEDGER-01 — Every line item from an uploaded bank statement PDF is extracted and stored electronically
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S01
- Description: When a bank_debit account statement PDF is processed, the AI extracts ALL line items (not just subscriptions) and stores them as immutable records in statement_line_items.

### LEDGER-02 — Every line item from an uploaded credit card statement PDF is extracted and stored electronically
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S02
- Description: When a credit_card account statement PDF is processed, the AI extracts ALL line items with credit-card-specific fields (posting date, merchant category, foreign currency) and stores them as immutable records.

### LEDGER-03 — Every line item from an uploaded loan statement PDF is extracted and stored electronically
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S03
- Description: When a loan account statement PDF is processed, the AI extracts ALL line items with loan-specific fields (principal, interest, fees, remaining balance) and stores them as immutable records.

### LEDGER-04 — Line items use a common normalized schema per document type
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S01
- Description: Different banks/card issuers use different labels for the same data. The extraction normalizes these into a common field set per document type so the data is consistent regardless of source institution.

### LEDGER-05 — Line items are immutable after extraction
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S01
- Description: Statement line items cannot be modified via any API endpoint after creation. They must match the PDF data, which is static. Re-extraction replaces all line items for a statement wholesale.

### LEDGER-06 — Line items are queryable and exportable
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S05
- Description: Users can search, filter, and export the complete electronic data from their statements. The data is structured for SQL queries via common fields and JSONB type-specific fields.

### LEDGER-07 — Line items are browsable in a read-only UI per statement
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S05
- Description: Users can view all extracted line items for a statement in a read-only list/table, with the correct fields displayed per document type.

### LEDGER-08 — Existing subscription detection continues to work
- Status: active
- Class: continuity
- Source: inferred
- Primary Slice: M002/S04
- Description: The existing transactions table and subscription tagging pipeline must continue to function. The new ledger is additive — subscription candidates are still identified and stored in transactions for user annotation.

### LEDGER-09 — Line item counts appear in statement metadata and coverage grid
- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: M002/S05
- Description: The coverage grid and statement detail views show the total line item count (not just subscription-candidate count) for each processed statement.

### LEDGER-10 — Bank statement common fields include: date, description, debit amount, credit amount, balance, reference/type
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S01
- Description: The normalized bank statement schema captures these common fields regardless of which bank issued the statement. Field labels from different banks are mapped to these standard names.

### LEDGER-11 — Credit card statement common fields include: transaction date, posting date, description/merchant, amount, foreign currency amount, original currency, reference
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S02
- Description: The normalized credit card schema captures these common fields regardless of which card issuer produced the statement.

### LEDGER-12 — Loan statement common fields include: date, description, payment amount, principal, interest, fees, remaining balance
- Status: active
- Class: core-capability
- Source: user
- Primary Slice: M002/S03
- Description: The normalized loan schema captures these common fields regardless of which lender issued the statement.

## Validated

### OVRLP-01 — User sees inline badge on subscription rows that are part of a same-category overlap group

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User sees inline badge on subscription rows that are part of a same-category overlap group

### OVRLP-02 — User can dismiss overlap badges per group

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User can dismiss overlap badges per group

### OVRLP-03 — Dismissed badges re-surface automatically when the subscription set changes

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Dismissed badges re-surface automatically when the subscription set changes

### ONBRD-01 — User sees contextual hint with action CTA on empty subscriptions list

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User sees contextual hint with action CTA on empty subscriptions list

### ONBRD-02 — User sees contextual hint with action CTA on empty vault

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User sees contextual hint with action CTA on empty vault

### ONBRD-03 — User sees contextual hint with action CTA on empty transactions page

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User sees contextual hint with action CTA on empty transactions page

### ONBRD-04 — User sees contextual hint with action CTA on empty dashboard

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User sees contextual hint with action CTA on empty dashboard

### ONBRD-05 — User sees contextual hint with action CTA on empty suggestions page

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User sees contextual hint with action CTA on empty suggestions page

### ONBRD-06 — User can dismiss hints individually and dismissal persists across page refresh

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User can dismiss hints individually and dismissal persists across page refresh

### SIDE-01 — User sees plain English labels on all sidebar nav items (Dashboard, Subscriptions, Upload Statements, etc.)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User sees plain English labels on all sidebar nav items (Dashboard, Subscriptions, Upload Statements, etc.)

### SIDE-02 — Sidebar uses warm/friendly accent colors for active item and hover states (Notion/Todoist aesthetic)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Sidebar uses warm/friendly accent colors for active item and hover states (Notion/Todoist aesthetic)

### SIDE-03 — Sidebar sections reorganized into 4+ logical groups with clearer section names

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Sidebar sections reorganized into 4+ logical groups with clearer section names

### SIDE-04 — Sidebar icons refreshed to complement warm visual design

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Sidebar icons refreshed to complement warm visual design

### SIDE-05 — Feature-gate logic preserved via typed nav item data structure during redesign

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Feature-gate logic preserved via typed nav item data structure during redesign

### SIDE-06 — Warm theme works correctly in both light and dark modes

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Warm theme works correctly in both light and dark modes

### PERF-01 — Bundle treemap report generated and committed

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Bundle treemap report generated and committed

### PERF-02 — Lighthouse baseline scores documented (targets: Performance 80+, Accessibility 95+, Best Practices 95+)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Lighthouse baseline scores documented (targets: Performance 80+, Accessibility 95+, Best Practices 95+)

### PERF-03 — optimizePackageImports configured for lucide-react in next.config.ts

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

optimizePackageImports configured for lucide-react in next.config.ts

### PERF-04 — Heavy components (react-pdf, recharts) dynamically imported based on audit findings

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Heavy components (react-pdf, recharts) dynamically imported based on audit findings

## Deferred

## Out of Scope
