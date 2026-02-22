# Phase 19: Batch Upload Foundation - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-file PDF upload with full statement storage and deduplication. Users can upload 12+ PDFs at once, system processes sequentially to avoid memory exhaustion, stores ALL transactions (not just subscriptions), and detects duplicate statements before processing.

</domain>

<decisions>
## Implementation Decisions

### Upload UX
- Vertical list of files with progress bars and percentage per file
- Users can add more files while batch is processing (queue them)
- Individual cancel buttons (X) on each file row plus "Cancel All" button

### File processing
- When extraction fails for one file: mark as failed, continue with remaining files
- After batch completes: show counts only ("12 files processed, 847 transactions found")
- Failed files show "Retry" button — user can attempt again without re-uploading

### Transaction storage
- Store ALL transactions from statements (groceries, one-time purchases, everything)
- Full extraction metadata: date, merchant, amount, description, category guesses, confidence scores, raw text
- Full lineage: Transaction → Statement → Source (bank/card) — can trace back to original PDF
- Store original PDF files in blob storage for potential re-extraction later

### Duplicate handling
- File hash match (SHA-256 of PDF) for detection — exact file match only
- Duplicate check happens client-side before upload (calculate hash, check against server)
- When duplicate detected: show warning with options (Skip, Re-import, Import anyway)
- Re-import replaces raw transactions only — preserves any subscriptions created from old data

### Claude's Discretion
- Drop zone highlight style during drag-over
- Progress visualization per file (status text vs multi-stage bar)
- Exact styling of file list rows and error states
- Blob storage implementation details

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-batch-upload-foundation*
*Context gathered: 2026-02-08*
