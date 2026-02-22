---
phase: 19-batch-upload-foundation
plan: 03
subsystem: ui
tags: [batch-upload, hooks, queue-management, localStorage]
dependency-graph:
  requires:
    - 19-01 (hashFile utility)
    - 19-02 (batch API endpoints)
  provides:
    - useBatchUpload hook for multi-file queue management
    - Per-file status tracking with progress
    - localStorage persistence for interrupted uploads
  affects:
    - Future batch upload UI components (20-xx or similar)
tech-stack:
  added: []
  patterns:
    - Sequential file processing
    - LocalStorage queue persistence
    - Ref-based processing state
key-files:
  created:
    - src/lib/hooks/use-batch-upload.ts
  modified:
    - src/lib/hooks/index.ts
decisions:
  - id: sequential-processing
    choice: Process one file at a time
    reason: Prevent memory exhaustion with large PDFs (50-100MB)
  - id: localstorage-persistence
    choice: Save queue metadata to localStorage
    reason: Survive page refresh (File objects cannot be serialized, but status persists)
  - id: ref-based-processing
    choice: Use useRef for processing flag
    reason: Avoid stale closure issues in async processing loop
metrics:
  duration: ~3 min
  completed: 2026-02-08
---

# Phase 19 Plan 03: Batch Upload Hook Summary

**One-liner:** useBatchUpload hook with sequential file processing, per-file status tracking, and localStorage persistence for queue state.

## What Was Built

### useBatchUpload Hook

A React hook that manages multi-file upload queues with sequential processing to prevent memory exhaustion.

**Key features:**
- Sequential processing: one file at a time through the pipeline
- Per-file status tracking: pending, hashing, checking, uploading, processing, complete, error, duplicate
- Progress percentage for each file (0-100)
- localStorage persistence: queue state survives page refresh
- Duplicate detection: pauses when duplicate found, awaits user decision
- Retry capability: failed files can be retried
- Cancel all: remove all pending files at once
- Stats: total, pending, processing, complete, failed, duplicate counts

**Processing pipeline per file:**
1. `hashing` (10-20%): SHA-256 hash via hashFile utility
2. `checking` (30%): POST /api/batch/check-hash for duplicates
3. `uploading` (40-60%): POST /api/batch/upload creates statement record
4. `processing` (70-100%): POST /api/batch/process for AI extraction

**Hook API:**
```typescript
const {
  queue,           // QueuedFile[] - all files with status
  stats,           // { total, pending, processing, complete, failed, duplicate }
  isProcessing,    // boolean - currently processing queue
  addFiles,        // (files: File[]) => void - add files to queue
  removeFile,      // (id: string) => void - remove single file
  cancelAll,       // () => void - cancel all pending files
  retryFile,       // (id: string) => void - retry a failed file
  resolveDuplicate, // (id: string, action: DuplicateAction) => void
  startProcessing, // () => void - start processing pending files
} = useBatchUpload({ sourceType, onComplete });
```

**LocalStorage persistence:**
- Queue metadata saved on every update
- Expires after 24 hours
- File objects not serialized (can't be), but status/progress persists
- Cleared on successful completion

## Key Technical Decisions

1. **Sequential processing:** Large PDFs (50-100MB) would cause memory issues if processed in parallel. Processing one at a time keeps memory bounded.

2. **Ref-based processing flag:** Using `useRef` for the `processingRef` prevents stale closure issues in the async while loop. The `isProcessing` state is for UI reactivity.

3. **localStorage with File map:** File objects cannot be serialized to localStorage. The hook maintains a `fileMapRef` Map for File references, while localStorage stores metadata only.

4. **Duplicate detection pauses:** When a duplicate is detected, processing stops for that file and status becomes "duplicate". User must call `resolveDuplicate` before the queue continues.

## Files Changed

| File | Change |
|------|--------|
| src/lib/hooks/use-batch-upload.ts | Created with full hook implementation |
| src/lib/hooks/index.ts | Added exports for hook and types |

## Commits

- `883d2f0` feat(19-03): add useBatchUpload hook for queue management
- `e0d1d4d` feat(19-03): export useBatchUpload from hooks barrel

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 19 complete.** The batch upload foundation provides:

1. **Schema (19-01):** statements and transactions tables with user-scoped uniqueness
2. **API (19-02):** Three endpoints for check-hash, upload, and process
3. **Hook (19-03):** Client-side queue management with persistence

**For future batch upload UI:**
- Import `useBatchUpload` from `@/lib/hooks`
- Pass `sourceType` for the bank/card name
- Call `addFiles` when user selects PDFs
- Call `startProcessing` to begin processing
- Render `queue` with status and progress for each file
- Handle duplicates with `resolveDuplicate`
