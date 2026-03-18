# Phase 48: Ingestion Pipeline & Merchant Resolution - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the complete PDF-to-normalized-transactions pipeline with merchant entity resolution. Extends the existing batch upload/process flow to add: merchant normalization, source_hash deduplication, merchant entity/alias resolution with fuzzy matching, and transfer/refund filtering. Creates a parser abstraction wrapping existing OpenAI extractors.

This phase does NOT build recurrence detection (Phase 49) or UI screens (Phase 51). It produces normalized, deduplicated transactions with resolved merchant identities.

</domain>

<decisions>
## Implementation Decisions

### Pipeline integration strategy
- **Extend existing `/api/batch/process` route** — do NOT replace or rewrite the current batch processing flow
- The existing flow already: uploads PDF → extracts text → runs line item extraction → creates transactions → creates statementLineItems
- Phase 48 adds new steps AFTER existing extraction: normalize descriptions → compute source_hash → deduplicate → resolve merchants → filter transfers/refunds
- The 10-step pipeline (INGEST-10) maps onto the existing flow as extensions, not a new parallel system
- Existing subscription detection (`parseDocumentForSubscriptions`) continues to run alongside — it serves a different purpose (finding subscriptions vs creating normalized transactions)

### Parser abstraction (INGEST-06, INGEST-07)
- Create a `StatementParser` TypeScript interface in `src/lib/openai/parser-interface.ts`
- Interface methods: `extractLineItems(text: string, documentType: DocumentType): Promise<LineItemExtractionResult>`
- Generic implementation (`GenericStatementParser`) wraps the existing `extractBankLineItems`, `extractCreditCardLineItems`, `extractLoanLineItems` functions from `line-item-extractor.ts`
- Future provider-specific parsers (e.g., Chase, HSBC) can implement the same interface
- The abstraction is thin — do NOT over-engineer. One interface, one implementation wrapping existing code.

### Raw line storage (INGEST-03)
- **Carried from Phase 47:** `statementLineItems` IS the raw line storage. No separate `raw_statement_lines` table.
- Line items are already created by the existing batch/process flow — Phase 48 does not change how they're stored
- The pipeline reads FROM statementLineItems as input for transaction normalization

### Transaction normalization (INGEST-04)
- Create normalized transactions from statementLineItems, populating `normalizedDescription` and `sourceHash`
- `normalizedDescription` = output of merchant normalization function applied to line item description
- `sourceHash` = deterministic hash of (statementId + sequenceNumber) — uniquely identifies which line item produced this transaction
- Existing transactions created by subscription detection keep their current fields — Phase 48 transactions are additive alongside them
- **Decision:** When batch/process runs, create transactions from ALL line items (not just subscription-detected ones). This gives the recurrence engine (Phase 49) full transaction coverage.

### Source hash deduplication (INGEST-05, SCHEMA-17)
- `sourceHash` = SHA-256 of `${statementId}:${sequenceNumber}` — deterministic, reproducible
- On re-upload of same statement: the statement itself is already blocked by pdfHash uniqueness constraint
- On re-processing of existing statement: check sourceHash before inserting — skip if exists (idempotent reprocessing)
- Partial unique index already created in Phase 47 migration (WHERE source_hash IS NOT NULL, scoped to userId)

### Merchant normalization (MERCH-01)
- Create `src/lib/utils/merchant-normalization.ts` with a `normalizeMerchantDescriptor(raw: string): string` function
- Rules (in order):
  1. Lowercase the entire string
  2. Strip common payment processor prefixes: SQ*, TST*, PP*, PAYPAL*, CKO*, STRIPE*, GOOGLE*, APPLE.COM*
  3. Strip trailing reference numbers (sequences of 6+ digits at end)
  4. Strip common suffixes: LTD, LLC, INC, CO, PLC, CORP
  5. Strip city/state/country suffixes (common patterns like "LONDON GB", "NEW YORK US")
  6. Collapse multiple spaces to single space
  7. Trim whitespace
- This function is pure, deterministic, and testable without DB access
- Output stored in `transactions.normalizedDescription`

### Merchant entity/alias resolution (MERCH-02, MERCH-03, MERCH-04)
- Create `src/lib/services/merchant-resolver.ts`
- Resolution flow:
  1. Exact match: normalized descriptor → merchant_aliases.aliasText (case-insensitive)
  2. Fuzzy match: normalized descriptor → merchant_aliases.aliasText using pg_trgm similarity() with threshold ≥ 0.4
  3. If match found: link transaction to merchant entity via the alias
  4. If no match found: create new merchant entity with normalized name, create alias entry
- Fuzzy matching query uses the trigram GIN indexes created in Phase 47
- Merchant entities are userId-scoped (carried from Phase 47)
- New merchant entities get `category: null` (user or Phase 49 fills in later)

### Transfer/refund filtering (INGEST-08)
- Do NOT delete transfers and refunds — flag them instead
- Add a `isExcluded` boolean column to transactions (default false) — or use the existing `tagStatus` with a new value
- **Decision:** Use existing `tagStatus` column — do NOT add new column. This is Phase 48's only schema change consideration.
- **Revised decision:** Do NOT modify the tagStatus enum. Instead, flag transfers/refunds by setting a JSONB metadata field or by simply skipping them during recurrence detection (Phase 49). The detection engine ignores transactions matching transfer/refund patterns.
- Pattern matching in normalization: detect keywords like TRANSFER, TFR, REFUND, REVERSAL, PAYMENT RECEIVED, CASHBACK, INTEREST PAID and mark in aiMetadata or skip during processing
- **Final approach:** Create a utility function `isTransferOrRefund(description: string): boolean` that the pipeline uses to skip creating merchant entities for these transactions. The transactions still exist in the DB but are not processed further for recurrence detection.

### PDF storage (INGEST-09, SEC-02)
- Already handled by existing flow: PDFs uploaded to Supabase Storage via `uploadStatementPdf()`
- Existing behavior: PDFs stored permanently (not temporarily as REQUIREMENTS suggests)
- **Decision:** Keep permanent storage — users need PDFs in the vault. SEC-02 is already satisfied by the existing secure storage implementation.

### Security (SEC-01 through SEC-04)
- SEC-01 (file type/size validation): Already implemented in batch upload route — validates PDF MIME type, 10MB limit
- SEC-02 (temporary storage): Satisfied by Supabase Storage with signed URLs (already implemented)
- SEC-03 (audit trail): `user_transaction_labels` and `recurring_events` tables exist from Phase 47
- SEC-04 (secrets out of source): Already enforced via .env.local pattern

### Claude's Discretion
- Exact similarity threshold for fuzzy matching (starting at 0.4, can be tuned)
- How to handle line items with no amount (opening balances, info lines) — recommendation: skip them for transaction creation
- Batch size for processing large statements (recommendation: process all line items in one pass, no pagination needed for typical statement sizes)
- Error handling granularity within the pipeline steps

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Ingestion Pipeline (INGEST-01 to INGEST-10) — Pipeline step definitions
- `.planning/REQUIREMENTS.md` §Merchant Resolution (MERCH-01 to MERCH-05) — Normalization and matching rules
- `.planning/REQUIREMENTS.md` §Security & Privacy (SEC-01 to SEC-04) — Upload validation and audit trail

### Phase 47 decisions
- `.planning/phases/47-schema-domain-model/47-CONTEXT.md` — Schema decisions: statementLineItems reuse, additive transactions, merchant_entities userId-scoped

### Existing code (MUST READ)
- `src/app/api/batch/process/route.ts` — Current batch processing endpoint (extend, don't replace)
- `src/app/api/batch/upload/route.ts` — Current upload endpoint (no changes needed)
- `src/lib/openai/line-item-extractor.ts` — Existing extraction functions to wrap in parser abstraction
- `src/lib/openai/pdf-parser.ts` — Existing subscription detection (runs alongside, not replaced)
- `src/lib/utils/file-hash.ts` — Existing fingerprint generation (reference for sourceHash approach)
- `src/lib/utils/similarity.ts` — Existing Jaro-Winkler similarity (reference, not reused for merchant matching — pg_trgm used instead)
- `src/lib/db/schema.ts` — Full schema with Phase 47 tables (merchant_entities, merchant_aliases, etc.)

### Architecture
- `.gsd/DECISIONS.md` — Prior architectural decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `extractBankLineItems`, `extractCreditCardLineItems`, `extractLoanLineItems` in `line-item-extractor.ts`: Wrap in parser abstraction
- `generateTransactionFingerprint()` in `file-hash.ts`: Reference pattern for sourceHash generation
- `uploadStatementPdf()` in `pdf-storage.ts`: Already handles PDF storage — no changes needed
- Batch upload hook (`use-batch-upload.ts`): Client-side state management — may need status updates for new pipeline steps
- `calculateSimilarity()` in `similarity.ts`: Jaro-Winkler — NOT used for merchant matching (pg_trgm replaces it), but reference for weighted scoring

### Established Patterns
- API routes use NextAuth session check (`await auth()`) at top of handler
- DB queries use `db.select().from(table).where(...)` pattern with Drizzle
- Batch processing runs two parallel extractions (`Promise.all([subscriptionDetection, lineItemExtraction])`)
- OpenAI calls use `openai.chat.completions.create()` with structured JSON response format
- Error handling: try/catch with `NextResponse.json({ error: message }, { status: code })`

### Integration Points
- `/api/batch/process/route.ts` — Main integration point: add pipeline steps after existing extraction
- `schema.ts` — merchant_entities, merchant_aliases tables already exist from Phase 47
- `statementLineItems` — Read as input for transaction normalization
- `transactions` table — Write normalizedDescription and sourceHash to new columns

</code_context>

<specifics>
## Specific Ideas

- The pipeline extends the existing batch/process flow — users won't see a new upload experience, just richer data after processing
- Merchant normalization is a pure function — can be unit tested exhaustively without DB
- pg_trgm fuzzy matching replaces Jaro-Winkler for merchant resolution — database-level, works across all users' aliases
- sourceHash uses statement ID + sequence number (not content-based) — guarantees uniqueness even for identical line items across different statements

</specifics>

<deferred>
## Deferred Ideas

- Provider-specific parser implementations (Chase, HSBC, etc.) — future phase, interface ready
- Merchant category auto-detection from descriptors — Phase 49 or later
- User-facing merchant alias management UI — Phase 51 (UI-08)
- Batch processing progress websocket updates — future enhancement
- PDF text extraction improvement (replace pdf2json) — out of scope

</deferred>

---

*Phase: 48-ingestion-merchant-resolution*
*Context gathered: 2026-03-18*
