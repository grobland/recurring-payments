# S01: Bank Statement Schema & Extraction

**Goal:** New `statement_line_items` table with common + JSONB details columns, a bank-statement-specific GPT-4o extraction function, a read-only API endpoint, and integration into the batch process pipeline for bank_debit accounts.
**Demo:** Upload a bank_debit PDF via /vault/load → all line items (not just subscriptions) appear in `statement_line_items` with normalized fields → GET /api/statements/[id]/line-items returns them as read-only JSON.

## Must-Haves

- `statement_line_items` pgTable with: id, statementId FK, userId FK, sequenceNumber, transactionDate, description, amount (signed decimal), currency, balance, documentType discriminator, details JSONB, createdAt
- `documentTypeEnum` with values: bank_debit, credit_card, loan
- `BankLineItemDetails` type for the JSONB column: { debitAmount, creditAmount, reference, type, rawDescription }
- `StatementLineItem` and `NewStatementLineItem` type exports
- Drizzle migration 0013 applied to Supabase
- `extractBankLineItems(text: string)` function with bank-specific GPT-4o prompt that extracts ALL line items
- Zod validation schema for parsed AI output
- `GET /api/statements/[id]/line-items` read-only endpoint (no PUT/PATCH/DELETE)
- Updated batch/process/route.ts to call extractBankLineItems and insert line items for bank_debit accounts
- Immutability: no mutation endpoints exist for line items

## Proof Level

- This slice proves: integration (real PDF → AI extraction → DB insert → API read)
- Real runtime required: yes (OpenAI API for extraction, Supabase for storage)
- Human/UAT required: yes (visual comparison of extracted line items vs PDF content)

## Verification

- `npx tsc --noEmit` exits with zero errors
- `npx vitest run` — all existing tests still pass
- `tests/unit/bank-line-item-schema.test.ts` — Zod schema validates correct bank line items, rejects malformed data
- Upload a bank_debit PDF → verify line items in DB via GET /api/statements/[id]/line-items
- Verify no PUT/PATCH/DELETE routes exist for line items

## Observability / Diagnostics

- Runtime signals: processingStatus on statements table (pending → processing → complete/failed)
- Inspection surfaces: GET /api/statements/[id]/line-items returns lineItemCount + items array
- Failure visibility: processingError on statements table captures extraction failures
- Redaction constraints: none (financial data is user-owned, not secret)

## Integration Closure

- Upstream surfaces consumed: `statements` table (accountId FK → financialAccounts.accountType), `batch/process/route.ts` pipeline, `extractPdfTextServer()` function
- New wiring introduced in this slice: statement_line_items table, extractBankLineItems function, line-items API route, process pipeline branching by accountType
- What remains before the milestone is truly usable end-to-end: credit card extraction (S02), loan extraction (S03), subscription detection integration (S04), UI viewer (S05)

## Tasks

- [x] **T01: Schema — statement_line_items table and types** `est:20m`
  - Why: Foundation table that all subsequent slices depend on
  - Files: `src/lib/db/schema.ts`, `src/lib/db/migrations/0013_*.sql`
  - Do:
    1. Add `documentTypeEnum` pgEnum with values `bank_debit`, `credit_card`, `loan`
    2. Add `statementLineItems` pgTable BEFORE transactions in schema.ts with columns:
       - id (uuid, pk, defaultRandom)
       - statementId (uuid FK → statements.id, onDelete cascade, notNull)
       - userId (uuid FK → users.id, onDelete cascade, notNull)
       - sequenceNumber (integer, notNull) — position on the PDF (1-indexed)
       - transactionDate (timestamp with tz) — nullable (some lines like opening balance may not have a date)
       - description (text, notNull) — normalized description
       - amount (decimal 12,2) — signed: negative for debits, positive for credits. Nullable for non-monetary lines.
       - currency (varchar 3)
       - balance (decimal 12,2) — running balance after this line item. Nullable.
       - documentType (documentTypeEnum, notNull) — discriminator for JSONB details
       - details (jsonb) — type-specific fields, schema varies by documentType
       - createdAt (timestamp with tz, defaultNow, notNull)
    3. Add indexes: statementId, userId, transactionDate, (statementId + sequenceNumber unique)
    4. Add relations: statementLineItems → statement (one), statementLineItems → user (one)
    5. Update statementsRelations to include `lineItems: many(statementLineItems)`
    6. Export `StatementLineItem`, `NewStatementLineItem` types
    7. Define `BankLineItemDetails` TypeScript interface: `{ debitAmount?: string; creditAmount?: string; reference?: string; type?: string; rawDescription?: string; }`
    8. Run `npm run db:generate` to create migration, review SQL, run `npm run db:migrate`
  - Verify: `npx tsc --noEmit` passes, migration applied to Supabase
  - Done when: statement_line_items table exists in DB with correct columns and indexes

- [x] **T02: AI extraction — extractBankLineItems function** `est:30m`
  - Why: Core extraction logic that turns PDF text into structured line items
  - Files: `src/lib/openai/line-item-extractor.ts`, `src/lib/validations/line-item.ts`, `tests/unit/bank-line-item-schema.test.ts`
  - Do:
    1. Create `src/lib/validations/line-item.ts` with Zod schemas:
       - `bankLineItemSchema`: { sequenceNumber: number, date: string|null, description: string, debitAmount: number|null, creditAmount: number|null, balance: number|null, reference: string|null, type: string|null, rawDescription: string|null }
       - `bankExtractionResultSchema`: z.array(bankLineItemSchema)
    2. Create `src/lib/openai/line-item-extractor.ts` with:
       - `BANK_EXTRACTION_PROMPT` — system prompt instructing GPT-4o to extract EVERY line item from a bank statement, with specific field mapping rules:
         - Date → transactionDate (ISO 8601)
         - Description/Narrative/Details → description (normalized, trimmed)
         - Money Out/Debit/Withdrawal/Payment → debitAmount
         - Money In/Credit/Deposit → creditAmount
         - Balance/Running Balance → balance
         - Reference/Cheque No/Type → reference
         - Type/Transaction Type → type
         - Include opening balance, closing balance, brought forward, carried forward as line items
         - Number line items in order of appearance (sequenceNumber starting at 1)
       - `extractBankLineItems(text: string): Promise<BankExtractionResult>` function
       - Parse response JSON, validate with Zod schema, return typed result
    3. Create unit test `tests/unit/bank-line-item-schema.test.ts`:
       - Valid bank line item passes validation
       - Missing required description fails
       - Negative amounts handled correctly
       - Null optional fields pass
       - Invalid date format fails
       - sequenceNumber must be positive integer
  - Verify: `npx vitest run tests/unit/bank-line-item-schema.test.ts` — all tests pass
  - Done when: extractBankLineItems function exists, Zod schema validates correctly, unit tests pass

- [x] **T03: API endpoint — GET /api/statements/[id]/line-items** `est:15m`
  - Why: Read-only API for accessing extracted line items
  - Files: `src/app/api/statements/[id]/line-items/route.ts`
  - Do:
    1. Create GET handler with auth + ownership check (statement.userId === session.user.id)
    2. Query statementLineItems where statementId matches, ordered by sequenceNumber ASC
    3. Return `{ lineItems: [...], lineItemCount: number, documentType: string }`
    4. No POST/PUT/PATCH/DELETE handlers — only GET exported
  - Verify: `npx tsc --noEmit` passes
  - Done when: GET endpoint returns line items for a valid statement, returns 404 for invalid/unowned, no mutation endpoints exist

- [x] **T04: Pipeline integration — batch/process inserts line items for bank_debit** `est:25m`
  - Why: Wires extraction into the real upload flow so line items are created alongside transactions
  - Files: `src/app/api/batch/process/route.ts`
  - Do:
    1. Import `extractBankLineItems` and `statementLineItems` schema
    2. After text extraction, look up the statement's accountId → join to financialAccounts to get accountType
    3. If accountType is `bank_debit` (or no account linked — fallback to bank_debit for backward compat):
       - Call `extractBankLineItems(extractedText)` 
       - Map results to `NewStatementLineItem[]` with: statementId, userId, sequenceNumber, transactionDate (parsed from date string or null), description, amount (creditAmount - debitAmount as signed value), currency (from account or detect from text), balance, documentType: 'bank_debit', details: { debitAmount, creditAmount, reference, type, rawDescription }
       - Insert all line items in a single batch insert
       - Update statement.transactionCount to lineItems.length (or keep separate — add lineItemCount column if needed)
    4. Existing subscription detection (parseTextForSubscriptions → insert transactions) continues unchanged — both run
    5. Handle extraction errors gracefully: if line item extraction fails, log error but don't fail the overall process (subscription extraction should still work)
  - Verify: Upload a bank_debit PDF → check DB for statement_line_items rows → check transactions still created
  - Done when: Both line items and transactions are created for bank_debit PDFs; failure in line item extraction doesn't block subscription detection

## Files Likely Touched

- `src/lib/db/schema.ts` — new table, enum, relations, type exports
- `src/lib/db/migrations/0013_*.sql` — migration for statement_line_items
- `src/lib/validations/line-item.ts` — Zod schemas for extraction output
- `src/lib/openai/line-item-extractor.ts` — GPT-4o extraction function
- `src/app/api/statements/[id]/line-items/route.ts` — read-only API
- `src/app/api/batch/process/route.ts` — pipeline integration
- `tests/unit/bank-line-item-schema.test.ts` — Zod validation tests
