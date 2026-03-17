# S05: Line Item Viewer & Export

**Goal:** Users can browse all extracted line items for any statement in a read-only table, export as CSV, and see line item counts in the statement detail page. The viewer respects document type — showing type-appropriate columns.
**Demo:** Navigate to a statement that has line items → see a "Ledger" tab with all line items in a sortable table → click "Export CSV" → get a complete CSV download.

## Must-Haves

- `useStatementLineItems` React Query hook fetching GET /api/statements/[id]/line-items
- Line items table component showing: seq, date, description, debit, credit, balance, type/category (varies by docType)
- Integrated into the existing statement detail page as a tab alongside transactions
- CSV export button that downloads all line items for the statement
- Line item count badge visible in the statement detail header
- Works for bank_debit, credit_card, and loan document types with appropriate columns

## Verification

- `npx tsc --noEmit` exits with zero errors
- `npx vitest run` — all 123 tests pass
- Browser: navigate to /statements/[lloyds-feb-26-id] → see Ledger tab with 98 line items
- Browser: click Export CSV → file downloads with correct data
- Browser: verify debit/credit columns show correct amounts

## Tasks

- [x] **T01: useStatementLineItems hook** `est:10m`
- [x] **T02: LineItemsTable component** `est:25m`
- [x] **T03: CSV export** `est:10m`
- [x] **T04: Integrate into statement detail page** `est:15m`

## Files Likely Touched

- `src/lib/hooks/use-statement-line-items.ts`
- `src/components/statements/line-items-table.tsx`
- `src/components/sources/statement-detail.tsx`
- `src/app/(dashboard)/statements/[id]/page.tsx`
