# M002: Immutable Ledger

**Vision:** A faithful electronic copy of every line item from every uploaded financial document, normalized into common schemas per document type, stored as an immutable read-only ledger queryable alongside the existing subscription detection system.

## Success Criteria

- A bank statement PDF uploaded via /vault/load produces line items matching every entry visible on the PDF
- A credit card statement PDF uploaded produces line items with credit-card-specific fields
- A loan statement PDF uploaded produces line items with loan-specific fields
- No API endpoint permits modification of line items after creation
- The existing subscription detection pipeline continues to work unchanged
- Line items are browsable in the UI with correct fields per document type
- Line items are exportable as CSV

## Key Risks / Unknowns

- **AI extraction quality** — GPT-4o has only been prompted for subscription detection; full line-item extraction with field normalization across different bank formats is a different problem. Extraction accuracy is uncertain until tested with real PDFs.
- **Two-pass vs single-pass extraction** — Extracting all line items AND identifying subscriptions could be one AI call or two. Single pass is cheaper; two-pass is cleaner. Need to validate quality of single-pass approach first.
- **Volume impact** — Full extraction means 10–50x more rows per statement. Must verify query performance doesn't degrade for the transaction browser and coverage views.

## Proof Strategy

- AI extraction quality → retire in S01 by proving a bank statement PDF produces correct line items with normalized fields matching the visible PDF content
- Two-pass vs single-pass → retire in S04 by proving subscription detection still works correctly when fed from line items instead of a separate AI call
- Volume impact → retire in S05 by proving the line item browser and coverage views perform well with full extraction data

## Verification Classes

- Contract verification: unit tests for extraction schema validation, Zod parsing, and field normalization
- Integration verification: real PDF upload → AI extraction → DB insert → API read → UI display
- Operational verification: none (dev environment only)
- UAT / human verification: visual comparison of extracted line items against original PDF content

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slices marked [x] with passing verification
- Bank, credit card, and loan extraction prompts produce normalized line items from real PDFs
- statement_line_items table populated correctly with immutable records
- Read-only API enforced (no UPDATE/PATCH/DELETE on line items except via re-extraction)
- Line item viewer UI shows correct fields per document type
- Existing subscription detection and transaction browser still work
- Success criteria re-checked against live behavior

## Requirement Coverage

- Covers: LEDGER-01, LEDGER-02, LEDGER-03, LEDGER-04, LEDGER-05, LEDGER-06, LEDGER-07, LEDGER-08, LEDGER-09, LEDGER-10, LEDGER-11, LEDGER-12
- Partially covers: none
- Leaves for later: re-extraction of previously uploaded statements (manual backfill)
- Orphan risks: none

## Slices

- [x] **S01: Bank Statement Schema & Extraction** `risk:high` `depends:[]`
  > After this: a bank_debit PDF uploaded via /vault/load produces immutable line items with normalized common fields (date, description, debit, credit, balance, reference) stored in statement_line_items and visible via API
- [x] **S02: Credit Card Extraction** `risk:medium` `depends:[S01]`
  > After this: a credit_card PDF uploaded produces line items with credit-card-specific fields (posting date, merchant, foreign currency) using the same table and immutability pattern from S01
- [x] **S03: Loan Extraction** `risk:medium` `depends:[S01]`
  > After this: a loan PDF uploaded produces line items with loan-specific fields (principal, interest, fees, remaining balance) using the same table and immutability pattern from S01
- [x] **S04: Subscription Detection Integration** `risk:medium` `depends:[S01]`
  > After this: subscription detection still works — the batch process pipeline populates both statement_line_items (full ledger) and transactions (subscription candidates), and the transaction browser and subscription tagging are unaffected
- [x] **S05: Line Item Viewer & Export** `risk:low` `depends:[S01,S04]`
  > After this: users can browse all extracted line items per statement in a read-only UI with correct fields per document type, export as CSV, and see line item counts in coverage grid and statement metadata

## Boundary Map

### S01 → S02, S03, S04, S05

Produces:
- `statement_line_items` pgTable in schema.ts with common columns + `details JSONB` + `documentType` discriminator
- `StatementLineItem`, `NewStatementLineItem`, `BankLineItemDetails` TypeScript types
- Migration 0013 creating the table with indexes
- `extractBankLineItems(text: string)` function with bank-specific GPT-4o prompt
- `GET /api/statements/[id]/line-items` read-only endpoint
- Zod validation schemas for line item creation (used internally by process pipeline, not exposed)

Consumes:
- nothing (first slice)

### S02 → S05

Produces:
- `CreditCardLineItemDetails` TypeScript type
- `extractCreditCardLineItems(text: string)` function with credit-card-specific prompt
- Credit card field handling in the process pipeline

Consumes:
- statement_line_items table and types from S01

### S03 → S05

Produces:
- `LoanLineItemDetails` TypeScript type
- `extractLoanLineItems(text: string)` function with loan-specific prompt
- Loan field handling in the process pipeline

Consumes:
- statement_line_items table and types from S01

### S04 → S05

Produces:
- Updated batch/process/route.ts that inserts line items AND transactions
- Proof that existing transaction browser and subscription tagging work unchanged

Consumes:
- statement_line_items table from S01
- extractBankLineItems from S01

### S05

Produces:
- Line item read-only viewer component
- CSV export for line items
- Updated coverage grid with line item counts

Consumes:
- All line item types from S01, S02, S03
- Updated process pipeline from S04
