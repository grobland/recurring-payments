---
phase: 19-batch-upload-foundation
plan: 02
subsystem: api
tags: [batch-upload, endpoints, pdf-processing, deduplication]
dependency-graph:
  requires:
    - 19-01 (statements table, transactions table, hashFile utility, fingerprint generator)
  provides:
    - POST /api/batch/check-hash for duplicate detection
    - POST /api/batch/upload for PDF file upload
    - POST /api/batch/process for AI extraction
  affects:
    - 19-03 (batch upload UI will call these endpoints)
tech-stack:
  added: []
  patterns:
    - FormData for file upload
    - Server-side PDF text extraction
    - Processing status lifecycle
key-files:
  created:
    - src/app/api/batch/check-hash/route.ts
    - src/app/api/batch/upload/route.ts
    - src/app/api/batch/process/route.ts
  modified: []
decisions:
  - id: server-side-pdf-extraction
    choice: Extract PDF text server-side using pdf2json
    reason: Consistent with existing import route pattern
  - id: form-data-upload
    choice: Accept PDF via FormData for process endpoint
    reason: PDF not stored in blob storage yet, so must be sent with processing request
  - id: tag-threshold
    choice: 80% confidence threshold for potential_subscription tag
    reason: Match existing import confidence handling
metrics:
  duration: ~5 min
  completed: 2026-02-08
---

# Phase 19 Plan 02: Batch Upload API Endpoints Summary

**One-liner:** Three API endpoints for batch uploads: hash check for duplicates, upload for statement creation, process for AI extraction of transactions.

## What Was Built

### POST /api/batch/check-hash

Checks if a PDF hash already exists for the current user.

**Request:**
```json
{ "hash": "64-character-hex-sha256-hash" }
```

**Response:**
```json
{
  "isDuplicate": true,
  "existing": {
    "id": "uuid",
    "sourceType": "Chase Sapphire",
    "filename": "statement.pdf",
    "uploadedAt": "2026-02-08T...",
    "status": "complete",
    "transactionCount": 15
  }
}
```

### POST /api/batch/upload

Creates a statement record for a PDF file.

**Request (FormData):**
- `file`: PDF file
- `hash`: SHA-256 hash
- `sourceType`: Bank/card name

**Response:**
```json
{
  "statementId": "uuid",
  "status": "pending",
  "message": "Statement created, ready for processing"
}
```

**Validations:**
- Requires authentication
- Checks user trial/subscription status
- PDF only, 50MB limit
- Double-checks for duplicates (race condition protection)

### POST /api/batch/process

Processes a statement using AI extraction.

**Request (FormData):**
- `statementId`: Statement UUID
- `file`: PDF file (sent again since not stored in blob storage yet)

**Response:**
```json
{
  "success": true,
  "statementId": "uuid",
  "transactionCount": 15,
  "processingTime": 2500
}
```

**Processing flow:**
1. Extract text from PDF server-side using pdf2json
2. Verify statement belongs to user and is pending
3. Update status to "processing"
4. Call parseTextForSubscriptions for AI extraction
5. Transform results to transaction records with fingerprints
6. Insert transactions into database
7. Update statement as complete (or failed on error)

## Key Technical Decisions

1. **Server-side PDF extraction:** Uses pdf2json to extract text from PDF buffer, consistent with existing import route.

2. **FormData for process endpoint:** Since PDFs are not stored in blob storage yet, the file must be sent with the processing request. Future enhancement: store PDF in Supabase Storage during upload, retrieve during processing.

3. **80% confidence threshold:** Transactions with confidence >= 80% are tagged as `potential_subscription`, matching existing import behavior.

4. **Processing status lifecycle:** States transition from `pending` -> `processing` -> `complete`/`failed`. Prevents re-processing already completed statements.

## Files Created

| File | Purpose |
|------|---------|
| src/app/api/batch/check-hash/route.ts | Duplicate detection endpoint |
| src/app/api/batch/upload/route.ts | PDF upload and statement creation |
| src/app/api/batch/process/route.ts | AI extraction and transaction storage |

## Commits

- `de75777` feat(19-02): add check-hash endpoint for duplicate detection
- `8e20b8a` feat(19-02): add upload endpoint for PDF files
- `d30bf2e` feat(19-02): add process endpoint for AI extraction

## Deviations from Plan

**[Rule 1 - Bug] Fixed pdf2json error type handling**
- **Found during:** Task 3
- **Issue:** TypeScript error with pdf2json error event type
- **Fix:** Used `unknown` type and runtime type checking, consistent with existing import route
- **Files modified:** src/app/api/batch/process/route.ts
- **Commit:** d30bf2e (included in process endpoint commit)

## Next Phase Readiness

**For 19-03 (Batch Upload UI):**
- All three endpoints ready for client integration
- hashFile utility from 19-01 provides client-side hash calculation
- Flow: hashFile -> check-hash -> upload -> process

**Parser scope note:** Current AI parser (parseTextForSubscriptions) focuses on subscription-like items. Full ALL-items extraction is tracked for Phase 23 or a dedicated parser upgrade phase.
