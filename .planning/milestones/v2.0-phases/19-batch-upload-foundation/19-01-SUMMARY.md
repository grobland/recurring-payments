---
phase: 19-batch-upload-foundation
plan: 01
subsystem: data
tags: [schema, hashing, deduplication, transactions]
dependency-graph:
  requires: []
  provides:
    - statements table with pdfHash unique constraint
    - transactions table with fingerprint deduplication
    - hashFile utility for client-side SHA-256
    - generateTransactionFingerprint for dedup
  affects:
    - 19-02 (batch upload UI)
    - 19-03 (processing endpoints)
tech-stack:
  added: []
  patterns:
    - chunked file hashing (1MB chunks)
    - user-scoped unique constraints
    - transaction fingerprinting
key-files:
  created:
    - src/lib/db/migrations/0005_strange_triathlon.sql
    - src/lib/utils/file-hash.ts
  modified:
    - src/lib/db/schema.ts
decisions:
  - id: chunk-size
    choice: 1MB chunks for file hashing
    reason: balance between memory and performance
  - id: fingerprint-algo
    choice: simple 32-bit hash for fingerprints
    reason: synchronous, fast, only needs determinism not security
  - id: unique-constraint
    choice: user-scoped pdfHash uniqueness
    reason: different users can upload same statement
metrics:
  duration: ~4 min
  completed: 2026-02-08
---

# Phase 19 Plan 01: Schema and Hashing Summary

**One-liner:** Added statements/transactions tables with user-scoped pdfHash uniqueness and chunked SHA-256 file hashing utility.

## What Was Built

### Database Schema

**statements table:**
- Stores uploaded PDF statement metadata
- `pdfHash` (SHA-256) for duplicate detection with user-scoped uniqueness
- `processingStatus` enum (pending/processing/complete/failed)
- References to users with cascade delete
- Indexes on userId, pdfHash, and composite unique on (userId, pdfHash)

**transactions table:**
- Stores ALL transactions extracted from statements (not just subscriptions)
- `fingerprint` for merchant+amount+date deduplication
- `tagStatus` enum (unreviewed/potential_subscription/not_subscription/converted)
- AI metadata JSONB field for extraction details
- References to statements (cascade delete) and subscriptions (set null)
- Indexes on userId, statementId, fingerprint, tagStatus, transactionDate

### File Hashing Utility

**hashFile(file: File):**
- SHA-256 hashing using Web Crypto API
- Chunked processing (1MB chunks) for memory efficiency
- Sequential chunk processing prevents memory exhaustion
- Single-chunk files hashed directly for speed

**generateTransactionFingerprint(merchant, amount, date, currency):**
- Synchronous fingerprint generation
- Normalizes merchant name (lowercase, alphanumeric only)
- Deterministic string: `{merchant}:{amount}:{date}:{currency}`
- 16-character hex output

## Key Technical Decisions

1. **Chunked hashing (1MB):** Large PDFs (50-100MB) would cause memory issues if loaded entirely. Chunks are processed sequentially to prevent OOM.

2. **User-scoped uniqueness:** The same PDF can be uploaded by different users, so uniqueness constraint is on `(userId, pdfHash)` not just `pdfHash`.

3. **Simple fingerprint hash:** Transaction fingerprints only need determinism for deduplication, not cryptographic security. Using 32-bit hash is fast and synchronous.

4. **Sequential chunk processing:** Research showed parallel Promise.all for chunks can still cause memory spikes. Sequential processing is safer.

## Files Changed

| File | Change |
|------|--------|
| src/lib/db/schema.ts | Added enums, tables, relations, type exports |
| src/lib/db/migrations/0005_strange_triathlon.sql | Generated migration |
| src/lib/utils/file-hash.ts | Created with hashFile and fingerprint utilities |

## Commits

- `de9b33d` feat(19-01): add statements and transactions tables
- `3494840` feat(19-01): add client-side file hashing utility

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**For 19-02 (Batch Upload UI):**
- Schema ready for storing uploaded statements
- hashFile utility ready for client-side duplicate detection
- generateTransactionFingerprint ready for transaction dedup

**Migration required:**
- Run `npm run db:migrate` to apply 0005_strange_triathlon.sql
