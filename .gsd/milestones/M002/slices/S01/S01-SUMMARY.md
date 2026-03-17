---
id: S01
parent: M002
milestone: M002
provides:
  - statement_line_items table with common + JSONB details columns
  - extractBankLineItems() function with chunked GPT-4o-mini extraction
  - GET /api/statements/[id]/line-items read-only endpoint
  - POST /api/statements/[id]/reprocess-line-items backfill endpoint
  - Parallel extraction pipeline in batch/process route
  - Zod validation schemas for bank line items (11 unit tests)
requires: []
affects:
  - S02
  - S03
  - S04
  - S05
key_files:
  - src/lib/db/schema.ts
  - src/lib/db/migrations/0013_small_storm.sql
  - src/lib/openai/line-item-extractor.ts
  - src/lib/validations/line-item.ts
  - src/app/api/statements/[id]/line-items/route.ts
  - src/app/api/statements/[id]/reprocess-line-items/route.ts
  - src/app/api/batch/process/route.ts
  - src/lib/openai/client.ts
  - src/lib/openai/pdf-parser.ts
  - tests/unit/bank-line-item-schema.test.ts
key_decisions:
  - Single table with JSONB — statement_line_items has common columns + details JSONB per document type, not separate tables
  - Signed amount convention — negative = debit, positive = credit; original debit/credit preserved in JSONB details
  - Per-item Zod fallback — if batch validation fails, items validated individually, invalid ones skipped
  - gpt-4o-mini over gpt-4o — switched extraction model for speed (gpt-4o caused 3+ minute timeouts)
  - Text chunking at 8K chars — large statements split into chunks processed sequentially to avoid OpenAI connection drops
  - Parallel extraction — subscription detection + line item extraction run via Promise.all
  - No retries for extraction calls — maxRetries:0 per-call to prevent 60s×3 timeout cascade
  - Compact prompt — reduced from ~1500 tokens to ~300 tokens for faster inference
patterns_established:
  - Line item extraction pattern — chunk text → call GPT-4o-mini per chunk → Zod validate → re-number sequences → batch insert
  - Non-fatal extraction — line item failures caught and logged, never block subscription detection
  - Reprocess endpoint pattern — download PDF from Supabase Storage → extract text → run extraction → insert
observability_surfaces:
  - Console logs with [batch/process] prefix showing parallel extraction timing, text size, results
  - Console logs with [line-item-extractor] prefix showing chunk counts and per-chunk progress
  - Console logs with [reprocess-line-items] prefix for backfill operations
  - GET /api/statements/[id]/line-items returns lineItemCount + documentType for inspection
drill_down_paths: []
duration: ~4h
verification_result: passed
completed_at: 2026-03-13
---

# S01: Bank Statement Schema & Extraction

**Immutable ledger table, chunked GPT-4o-mini extraction, and parallel pipeline for bank_debit statements — 98 line items extracted from a real Lloyds Bank PDF**

## What Happened

T01 added the `statement_line_items` table with common columns (date, description, amount, currency, balance) plus a JSONB `details` column discriminated by `documentType` enum (bank_debit, credit_card, loan). Migration 0013 applied to Supabase.

T02 built `extractBankLineItems()` with a bank-specific prompt and Zod validation. 11 unit tests cover valid items, missing fields, null handling, boundary values, and per-item fallback validation.

T03 created the read-only `GET /api/statements/[id]/line-items` endpoint with auth + ownership checks. No mutation endpoints exist.

T04 integrated extraction into `batch/process/route.ts`. Initial testing revealed severe performance issues — the sequential subscription + line item extraction took 3+ minutes per statement. This led to three critical optimizations: (1) parallel execution via `Promise.all`, (2) switching from gpt-4o to gpt-4o-mini, and (3) chunking large texts at 8K char boundaries to avoid OpenAI connection timeouts. A reprocess endpoint was also added to backfill line items for previously-processed statements.

Live verification: Lloyds Bank Feb 2026 statement (17K chars extracted text) → 3 chunks → 98 line items in 102s → all stored immutably with correct opening balance, transactions, and closing balance.

## Verification

- `npx tsc --noEmit` — zero errors
- `npx vitest run` — 100 tests passing across 6 files (11 new line item schema tests)
- Live upload: bank_debit PDF → 98 line items extracted and stored
- GET /api/statements/[id]/line-items returns correct data with opening balance, debit/credit amounts, running balances
- No PUT/PATCH/DELETE routes exist for line items

## Requirements Advanced

- LEDGER-01 — statement_line_items table created with immutable design (no update/delete endpoints)
- LEDGER-02 — bank_debit extraction working with normalized common fields
- LEDGER-03 — JSONB details column stores bank-specific fields (debitAmount, creditAmount, reference, type, rawDescription)
- LEDGER-04 — read-only API endpoint operational
- LEDGER-05 — extraction integrated into batch upload pipeline

## Requirements Validated

- LEDGER-01 — 98 real line items stored, no mutation endpoints exist
- LEDGER-02 — bank_debit extraction validated against real Lloyds Bank PDF

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **Model change**: Plan specified gpt-4o; switched to gpt-4o-mini after gpt-4o caused 3+ minute timeouts and OpenAI connection drops on dense 17K-char statements
- **Text chunking**: Not in original plan; added after discovering OpenAI drops connections on responses requiring >60s generation time
- **Parallel extraction**: Original plan had sequential calls; refactored to Promise.all after first upload took 3.3 minutes
- **Reprocess endpoint**: Not in original plan; added to backfill line items for statements uploaded before the extraction pipeline existed
- **Compact prompt**: Original detailed prompt (~1500 tokens) replaced with minimal version (~300 tokens) to reduce input token cost per chunk

## Known Limitations

- Extraction takes ~100s for a dense Lloyds statement (3 chunks × ~35s each) — acceptable but not fast
- No UI to view line items yet (S05)
- Only bank_debit extraction implemented; credit_card and loan are stubs returning null
- The parseTextForSubscriptions call also switched to gpt-4o-mini — subscription detection quality should be monitored
- Chunking splits at line boundaries which may split a transaction across chunks (rare but possible)

## Follow-ups

- Monitor gpt-4o-mini subscription detection quality vs gpt-4o — if accuracy drops, consider keeping gpt-4o for subscription detection only
- Consider background/async processing for line item extraction to unblock the upload UI faster
- The reprocess endpoint could be exposed as a UI button on the vault page for batch backfill

## Files Created/Modified

- `src/lib/db/schema.ts` — added statementLineItems table, documentTypeEnum, BankLineItemDetails type, relations
- `src/lib/db/migrations/0013_small_storm.sql` — migration creating statement_line_items table
- `src/lib/openai/line-item-extractor.ts` — extractBankLineItems with chunking, compact prompt, gpt-4o-mini
- `src/lib/openai/client.ts` — increased default timeout to 120s, reduced retries to 1
- `src/lib/openai/pdf-parser.ts` — switched parseTextForSubscriptions to gpt-4o-mini with 120s timeout, no retries
- `src/lib/validations/line-item.ts` — Zod schemas for bank line item validation
- `src/app/api/statements/[id]/line-items/route.ts` — read-only GET endpoint
- `src/app/api/statements/[id]/reprocess-line-items/route.ts` — backfill endpoint for existing statements
- `src/app/api/batch/process/route.ts` — parallel extraction, timing logs, line item insert
- `tests/unit/bank-line-item-schema.test.ts` — 11 unit tests for Zod validation

## Forward Intelligence

### What the next slice should know
- The `extractChunk()` function in `line-item-extractor.ts` is the reusable primitive — S02/S03 should follow the same pattern: define a prompt, define a Zod schema, call extractChunk with the correct model
- The `details` JSONB column is untyped at the DB level — TypeScript types (`BankLineItemDetails`, future `CreditCardLineItemDetails`) enforce structure at the application layer
- The `documentType` column discriminates which details shape to expect — add new enum values for credit_card/loan extraction

### What's fragile
- OpenAI connection drops on long responses — chunking mitigates this but chunk size (8K chars) was tuned empirically for Lloyds Bank format. Other bank formats may need different sizes.
- The singleton OpenAI client caches timeout settings — changes to client.ts require a dev server restart to take effect (HMR doesn't reset the singleton)

### Authoritative diagnostics
- Server console logs prefixed `[batch/process]` and `[line-item-extractor]` show real-time extraction progress with timing and chunk counts
- `GET /api/statements/[id]/line-items` is the fastest way to verify extraction results

### What assumptions changed
- Assumed gpt-4o would handle 17K char extraction in one call — it can't, OpenAI drops the connection at ~60s
- Assumed extraction would take ~30s — actual time is ~35s per 8K chunk, ~100s total for a dense monthly statement
- Assumed per-request timeout/retry overrides work in OpenAI SDK — they don't reliably; client-level settings dominate
