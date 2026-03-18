---
phase: 48-ingestion-merchant-resolution
verified: 2026-03-18T09:40:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 48: Ingestion Pipeline & Merchant Resolution Verification Report

**Phase Goal:** Build the complete PDF-to-normalized-transactions pipeline with merchant entity resolution
**Verified:** 2026-03-18T09:40:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `normalizeMerchantDescriptor` strips processor prefixes, suffixes, trailing numbers, and normalizes whitespace | VERIFIED | Function exists in `src/lib/utils/merchant-normalization.ts`; 24 tests pass covering all 8+ processor prefixes (SQ*, PAYPAL*, GOOGLE*, STRIPE*, TST*, PP*, CKO*, APPLE.COM*), business suffixes (LTD/LLC/INC/CO/PLC/CORP), trailing 6+ digit numbers, geo suffixes (city + country code), and whitespace collapse |
| 2 | `isTransferOrRefund` correctly identifies transfer/refund keywords in descriptions | VERIFIED | Function exists in `src/lib/utils/transfer-detection.ts`; 16 tests pass covering all 10 keyword patterns, case-insensitivity, and false-positive avoidance |
| 3 | `generateSourceHash` produces deterministic SHA-256 hex from statementId + sequenceNumber | VERIFIED | Function exists in `src/lib/utils/source-hash.ts`; 8 tests pass verifying 64-char output, determinism, uniqueness across different inputs |
| 4 | `StatementParser` interface exists with `extractLineItems` method | VERIFIED | Interface declared in `src/lib/openai/parser-interface.ts` with correct signature `extractLineItems(text, documentType): Promise<LineItemExtractionResult>` |
| 5 | `GenericStatementParser` wraps existing `extractBankLineItems`/`extractCreditCardLineItems`/`extractLoanLineItems` | VERIFIED | Class implemented with exhaustive switch; imports all 3 extractors from `./line-item-extractor`; `never` type guard for compile-time coverage |
| 6 | Exact alias match resolves a normalized descriptor to its merchant entity | VERIFIED | Step 1 in `resolveMerchant` performs case-insensitive exact query on `merchantAliases.aliasText`; 2 tests confirm exact-match path and non-insert assertion |
| 7 | Fuzzy match via pg_trgm similarity finds close aliases when exact match fails | VERIFIED | Step 2 in `resolveMerchant` uses `similarity()` SQL function with 0.4 threshold and DESC ordering; test confirms `matchType: "fuzzy"` and `similarity` value returned |
| 8 | Unknown descriptors create a new merchant entity and alias automatically | VERIFIED | Step 3 uses `onConflictDoUpdate` for entity upsert and `onConflictDoNothing` for alias; test confirms `matchType: "new"` with insert called |
| 9 | After `batch/process` runs, statementLineItems are read and normalized transactions are created with `normalizedDescription` and `sourceHash` | VERIFIED | Route reads back line items, applies `normalizeMerchantDescriptor`, computes `generateSourceHash`, populates both fields before `db.insert(transactions)` |
| 10 | Re-processing same statement skips transactions that already have a sourceHash match (idempotent) | VERIFIED | Route checks `eq(transactions.sourceHash, sourceHash)` before pushing to normalizedTransactions array; `continue` on existing match |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/utils/merchant-normalization.ts` | `normalizeMerchantDescriptor` function | VERIFIED | 88 lines; exports single function with 7-step regex pipeline; no stubs |
| `src/lib/utils/transfer-detection.ts` | `isTransferOrRefund` function | VERIFIED | 44 lines; exports single function with 10-keyword includes check |
| `src/lib/utils/source-hash.ts` | `generateSourceHash` function | VERIFIED | 36 lines; uses `crypto.createHash("sha256")`; synchronous, deterministic |
| `src/lib/openai/parser-interface.ts` | `StatementParser` interface + `GenericStatementParser` class + `LineItemExtractionResult` type | VERIFIED | 71 lines; all 3 exports present; exhaustive switch with never guard |
| `src/lib/services/merchant-resolver.ts` | `resolveMerchant` + `MerchantResolution` | VERIFIED | 134 lines; 3-step resolution flow fully implemented; `resolveMerchantWithDefaultDb` convenience wrapper |
| `src/app/api/batch/process/route.ts` | Extended pipeline with normalization, dedup, merchant resolution | VERIFIED | 507 lines; all 4 new imports present; v4.0 pipeline block (lines 337-458) wired after line item insertion; existing subscription flow untouched |
| `tests/unit/merchant-normalization.test.ts` | 24 unit tests | VERIFIED | All 24 tests pass |
| `tests/unit/transfer-detection.test.ts` | 16 unit tests | VERIFIED | All 16 tests pass |
| `tests/unit/source-hash.test.ts` | 8 unit tests | VERIFIED | All 8 tests pass |
| `tests/unit/merchant-resolver.test.ts` | 5 unit tests | VERIFIED | All 5 tests pass (exact, fuzzy, new, no-insert-on-exact, no-insert-on-fuzzy) |

**Total test count verified:** 53 tests, 0 failures

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/batch/process/route.ts` | `src/lib/utils/merchant-normalization.ts` | `import normalizeMerchantDescriptor` | WIRED | Line 19: `import { normalizeMerchantDescriptor } from "@/lib/utils/merchant-normalization"` — used at line 396 |
| `src/app/api/batch/process/route.ts` | `src/lib/utils/transfer-detection.ts` | `import isTransferOrRefund` | WIRED | Line 20: `import { isTransferOrRefund } from "@/lib/utils/transfer-detection"` — used at line 442 |
| `src/app/api/batch/process/route.ts` | `src/lib/utils/source-hash.ts` | `import generateSourceHash` | WIRED | Line 21: `import { generateSourceHash } from "@/lib/utils/source-hash"` — used at line 377 |
| `src/app/api/batch/process/route.ts` | `src/lib/services/merchant-resolver.ts` | `import resolveMerchant` | WIRED | Line 22: `import { resolveMerchant } from "@/lib/services/merchant-resolver"` — used at line 447 |
| `src/lib/openai/parser-interface.ts` | `src/lib/openai/line-item-extractor.ts` | `GenericStatementParser` delegates to `extractBankLineItems`/`extractCreditCardLineItems`/`extractLoanLineItems` | WIRED | Lines 17-20: imports all 3 functions; switch delegates to each by document type |
| `src/lib/services/merchant-resolver.ts` | `src/lib/db/schema.ts` | Drizzle queries on `merchantEntities` and `merchantAliases` tables | WIRED | Lines 2-3: `import { merchantEntities, merchantAliases } from "@/lib/db/schema"` — queried in all 3 resolution steps |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INGEST-01 | 48-03 | PDF upload with file type and size validation | SATISFIED | `batch/process` validates `file.type !== "application/pdf"` (line 88); `batch/upload` has 50MB limit; SEC-01 satisfied here |
| INGEST-02 | 48-03 | Statement metadata extraction (date range, account info) | SATISFIED | Route resolves `documentType` and `accountCurrency` from financial account; `statementDate` derived from earliest transaction date or filename; `statement.accountId` used |
| INGEST-03 | 48-03 | Line item extraction preserving raw text | SATISFIED | Per architectural decision in 48-CONTEXT.md: `statementLineItems` IS the raw line storage (SCHEMA-06 renamed). Line items created with `description` (raw text preserved) and `details` JSONB (rawDescription field). |
| INGEST-04 | 48-01 | Normalize raw lines into canonical transactions with `normalized_description` | SATISFIED | `normalizeMerchantDescriptor` creates normalized form; stored in `transactions.normalizedDescription` |
| INGEST-05 | 48-01 | Calculate `source_hash` for each transaction to prevent duplicates | SATISFIED | `generateSourceHash(statementId, sequenceNumber)` produces 64-char SHA-256; dedup check in pipeline |
| INGEST-06 | 48-01 | Parser abstraction interface supporting future provider-specific parsers | SATISFIED | `StatementParser` interface in `parser-interface.ts` with extensible `extractLineItems(text, documentType)` method |
| INGEST-07 | 48-01 | Generic parser implementation using existing OpenAI extraction as base | SATISFIED | `GenericStatementParser` wraps all 3 existing OpenAI extractors |
| INGEST-08 | 48-01 | Ignore transfers and refunds where detectable | SATISFIED | `isTransferOrRefund` in transfer-detection.ts; called in pipeline at line 442 to skip merchant resolution for matched transactions |
| INGEST-09 | 48-03 | PDFs stored temporarily, structured data persisted permanently | SATISFIED | Per 48-CONTEXT.md decision: PDFs stored in Supabase Storage with signed URLs (existing `uploadStatementPdf` flow); structured data (line items, transactions, merchant entities) persisted in PostgreSQL |
| INGEST-10 | 48-03 | Pipeline runs as ordered steps | SATISFIED | Route sequence: upload → extract text → extract line items → normalize → compute sourceHash → deduplicate → create transactions → resolve merchants. Steps ordered in route.ts lines 135-458 |
| MERCH-01 | 48-01 | Normalize statement descriptors | SATISFIED | `normalizeMerchantDescriptor`: lowercase → strip prefixes → strip trailing digits → strip suffixes → strip geo → collapse spaces → trim |
| MERCH-02 | 48-02 | Match transactions to merchant_entities via merchant_aliases | SATISFIED | Step 1 (exact) in `resolveMerchant`: inner join `merchantAliases` → `merchantEntities` with case-insensitive where clause |
| MERCH-03 | 48-02 | Fuzzy matching using trigram similarity for unmatched descriptors | SATISFIED | Step 2 (fuzzy) in `resolveMerchant`: `similarity()` function with 0.4 threshold, ordered DESC, limit 1 |
| MERCH-04 | 48-02 | Create new merchant entities for unknown merchants | SATISFIED | Step 3 (new) in `resolveMerchant`: `onConflictDoUpdate` upsert for entity + `onConflictDoNothing` alias creation |
| SEC-01 | 48-03 | Validate upload file type (PDF only) and size limits | SATISFIED | Line 88: `file.type !== "application/pdf"` check in process route; 50MB size limit in upload route |
| SEC-02 | 48-03 | Uploaded PDFs stored temporarily, not permanently | SATISFIED | PDFs stored in Supabase Storage (vault) accessible via signed URLs; structural data persisted separately; no raw PDF bytes in DB |
| SEC-04 | 48-01 | Secrets and config kept out of source code | SATISFIED | All new files use env vars via `@/lib/db` and `@/lib/auth` abstractions; no hardcoded API keys, passwords, or connection strings found in any new file |

**Deferred per plan (correctly excluded):**

| Requirement | Reason |
|-------------|--------|
| MERCH-05 | Deferred — User can create/edit merchant aliases via Settings UI. Phase 51 (UI-08). |
| SEC-03 | Deferred — Audit trail via `user_transaction_labels` and `recurring_events`. Schema exists from Phase 47; tables populated in later phases. |

---

### Anti-Patterns Found

No anti-patterns found in any phase 48 file.

| File | Scan | Result |
|------|------|--------|
| All new utility files | TODO/FIXME/PLACEHOLDER comments | None found |
| All new utility files | Empty implementations (`return null`, `return {}`) | None found |
| All new utility files | Hardcoded secrets/keys | None found |
| `batch/process/route.ts` | Console-log-only handlers | Not applicable — console.log used for operational logging alongside real logic |

---

### Commit Verification

All commits documented in SUMMARY files confirmed present in git log:

| Commit | Description | Status |
|--------|-------------|--------|
| `94f8d98` | feat(48-01): merchant normalization and transfer detection utilities | VERIFIED |
| `245cd6c` | feat(48-01): source hash utility and statement parser abstraction | VERIFIED |
| `4ef2eb9` | feat(48-02): create merchant resolver service with 3-step resolution | VERIFIED |
| `007ab94` | test(48-02): add merchant resolver unit tests covering all 3 resolution paths | VERIFIED |
| `9cee73d` | feat(48-03): wire v4.0 ingestion pipeline into batch/process route | VERIFIED |

---

### Human Verification Required

#### 1. End-to-End Pipeline Integration Test

**Test:** Upload a real bank statement PDF via the UI. After processing completes, query the database to verify:
- `statement_line_items` table has rows for the statement
- `transactions` table has rows with `normalized_description` and `source_hash` populated
- `merchant_entities` and `merchant_aliases` have been populated

**Expected:** New normalized transactions exist alongside existing subscription-detected transactions. Merchant entities created automatically for each unique normalized descriptor.

**Why human:** Requires a real Supabase database connection with pg_trgm extension enabled. Automated unit tests mock the DB client and cannot verify the full SQL execution including trigram similarity queries.

#### 2. Idempotent Re-processing

**Test:** Upload the same PDF a second time (same `pdfHash` should be blocked at upload stage). Alternatively, trigger the process route with the same `statementId` a second time directly.

**Expected:** No duplicate transactions created. All line items skipped due to `sourceHash` dedup check.

**Why human:** Requires live database state to verify the dedup check actually queries existing rows by sourceHash.

#### 3. Transfer/Refund Filtering in Production Data

**Test:** Upload a bank statement containing known transfer transactions (e.g., "TRANSFER TO SAVINGS", "BACS PAYMENT RECEIVED"). Inspect the `merchant_entities` table afterward.

**Expected:** No merchant entity created for transfer/refund transactions. Merchant resolution count logged as "X transfers/refunds skipped".

**Why human:** Requires real statement data and live database to verify the filtering is actually applied correctly in the full pipeline.

---

### Gaps Summary

No gaps. All 17 in-scope requirements are satisfied. All 10 observable truths verified against the actual codebase. All 53 unit tests pass. All 5 key links are wired with import and call-site evidence. No blocker anti-patterns found.

The only items requiring attention are:
- 3 human verification items (end-to-end integration, idempotency, transfer filtering) — all require a live database and are not automatable
- MERCH-05 and SEC-03 correctly deferred to later phases as documented

---

_Verified: 2026-03-18T09:40:00Z_
_Verifier: Claude (gsd-verifier)_
