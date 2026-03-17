# S02: Credit Card Extraction

**Goal:** `extractCreditCardLineItems()` function with credit-card-specific prompt, Zod schema, unit tests, and pipeline integration so that credit_card PDFs uploaded via /vault/load produce immutable line items with credit-card-specific JSONB details.
**Demo:** Upload a credit_card PDF → all line items appear in `statement_line_items` with `documentType: 'credit_card'` and `CreditCardLineItemDetails` in the details column → GET /api/statements/[id]/line-items returns them.

## Must-Haves

- `creditCardLineItemSchema` and `creditCardExtractionResultSchema` Zod schemas in `src/lib/validations/line-item.ts`
- `extractCreditCardLineItems(text: string)` function in `src/lib/openai/line-item-extractor.ts` following the chunked extraction pattern from S01
- Credit-card-specific prompt covering: transaction date, posting date, merchant name, amount, foreign currency amounts, references, merchant category codes
- Unit tests for the credit card Zod schema
- `batch/process/route.ts` updated to call `extractCreditCardLineItems` when `documentType === 'credit_card'`
- `reprocess-line-items/route.ts` updated to handle credit_card type
- Immutability preserved: no mutation endpoints

## Proof Level

- This slice proves: integration (credit card PDF → AI extraction → DB insert → API read)
- Real runtime required: yes (OpenAI API)
- Human/UAT required: yes (visual comparison of extracted line items vs PDF content — only if user has a credit card PDF to test)

## Verification

- `npx tsc --noEmit` exits with zero errors
- `npx vitest run` — all tests pass including new credit card schema tests
- Credit card schema Zod tests: valid items pass, missing fields rejected, foreign currency fields handled
- If a credit_card PDF is available: upload → verify via GET /api/statements/[id]/line-items

## Observability / Diagnostics

- Runtime signals: same [batch/process] and [line-item-extractor] console logs from S01 — now also fire for credit_card type
- Inspection surfaces: GET /api/statements/[id]/line-items returns documentType: 'credit_card' with CreditCardLineItemDetails
- Failure visibility: non-fatal extraction error logged with [batch/process] prefix
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `extractChunk()` and `chunkText()` from line-item-extractor.ts (S01), `CreditCardLineItemDetails` type from schema.ts (S01), batch/process/route.ts pipeline (S01)
- New wiring introduced: credit_card branch in process route and reprocess route
- What remains: loan extraction (S03), subscription detection integration (S04), UI viewer (S05)

## Tasks

- [x] **T01: Credit card Zod schema and unit tests** `est:15m`
  - Why: Validation foundation — ensures AI output matches expected shape before DB insert
  - Files: `src/lib/validations/line-item.ts`, `tests/unit/credit-card-line-item-schema.test.ts`
  - Do:
    1. Add `creditCardLineItemSchema` to line-item.ts: { sequenceNumber: number, date: string|null, postingDate: string|null, description: string, amount: number|null, foreignCurrencyAmount: number|null, foreignCurrency: string|null, reference: string|null, merchantCategory: string|null, rawDescription: string|null }
    2. Add `creditCardExtractionResultSchema` as z.array(creditCardLineItemSchema)
    3. Export `CreditCardExtractionResult` type
    4. Create unit tests covering: valid item, missing description fails, null optional fields pass, foreign currency pair validation, amount handling
  - Verify: `npx vitest run tests/unit/credit-card-line-item-schema.test.ts`
  - Done when: schema validates correct credit card line items and rejects malformed data

- [x] **T02: extractCreditCardLineItems function** `est:20m`
  - Why: Core extraction logic for credit card statements
  - Files: `src/lib/openai/line-item-extractor.ts`
  - Do:
    1. Add `CREDIT_CARD_EXTRACTION_PROMPT` — concise prompt (~300 tokens) covering credit card fields: transaction date, posting date, merchant, amount, foreign currency, reference, merchant category
    2. Add `extractCreditCardLineItems(text: string)` following the same pattern as bank: chunk text → call extractChunk with credit card prompt → Zod validate → re-number sequences
    3. Reuse `chunkText()` and adapt `extractChunk()` to accept prompt + schema as parameters (or create a credit-card-specific chunk function)
  - Verify: `npx tsc --noEmit` passes
  - Done when: function exists, compiles, follows chunked extraction pattern

- [x] **T03: Pipeline integration for credit_card** `est:15m`
  - Why: Wires credit card extraction into upload and reprocess flows
  - Files: `src/app/api/batch/process/route.ts`, `src/app/api/statements/[id]/reprocess-line-items/route.ts`
  - Do:
    1. In batch/process/route.ts: add `else if (documentType === 'credit_card')` branch in the lineItemPromise section, calling `extractCreditCardLineItems(extractedText)` with `.catch()` for non-fatal failure
    2. Map credit card extraction results to lineItemRecords with `documentType: 'credit_card'` and `CreditCardLineItemDetails` in details column
    3. In reprocess-line-items/route.ts: add credit_card handling alongside existing bank_debit
    4. Import `CreditCardLineItemDetails` type from schema
  - Verify: `npx tsc --noEmit` passes; if credit card PDF available, upload and verify line items
  - Done when: credit_card PDFs produce line items in the same table with correct documentType and details shape

## Files Likely Touched

- `src/lib/validations/line-item.ts`
- `src/lib/openai/line-item-extractor.ts`
- `src/app/api/batch/process/route.ts`
- `src/app/api/statements/[id]/reprocess-line-items/route.ts`
- `tests/unit/credit-card-line-item-schema.test.ts`
