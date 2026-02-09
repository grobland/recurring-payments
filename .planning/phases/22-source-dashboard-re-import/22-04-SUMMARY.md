---
phase: 22
plan: 04
subsystem: import
tags: [batch-upload, localStorage, banner, user-experience]

dependencies:
  requires: [19-03, 19-04]
  provides: [incomplete-batch-detection, resume-flow]
  affects: [22-05]

tech-stack:
  added: []
  patterns:
    - useIncompleteBatch hook for localStorage detection
    - AlertDialog for destructive action confirmation

key-files:
  created:
    - src/lib/hooks/use-incomplete-batch.ts
    - src/components/sources/incomplete-batch-banner.tsx
  modified:
    - src/app/(dashboard)/import/batch/page.tsx

decisions:
  - id: incomplete-batch-detection
    choice: Parse existing localStorage key from use-batch-upload
    why: Reuse existing persistence mechanism, no new storage

metrics:
  duration: ~4min
  completed: 2026-02-09
---

# Phase 22 Plan 04: Incomplete Batch Banner Summary

Incomplete batch detection hook and warning banner for interrupted batch imports.

## What Was Built

### useIncompleteBatch Hook

New hook in `src/lib/hooks/use-incomplete-batch.ts` that detects incomplete batch uploads:

- Reads from existing `batch-upload-queue` localStorage key (same as use-batch-upload.ts)
- Returns null when no incomplete batch or data expired (24-hour expiry)
- Returns IncompleteBatch object with:
  - Progress counts (processed/total)
  - Last error message if any file failed
  - Lists of completed and pending files
- Provides discard() function to clear localStorage
- Handles SSR hydration properly with useEffect initialization

### IncompleteBatchBanner Component

New component in `src/components/sources/incomplete-batch-banner.tsx`:

- Amber/yellow styling matching existing trial-banner pattern
- Shows progress: "Incomplete import: X of Y files processed"
- Shows last error message when available (e.g., "Network error")
- Resume button links to /import/batch
- Discard button opens AlertDialog confirmation:
  - "Discard incomplete import?"
  - Shows count of unprocessed files to be deleted
  - Prevents accidental data loss

### Page Integration

Updated `src/app/(dashboard)/import/batch/page.tsx`:

- Banner renders at top of content area
- Auto-hides when no incomplete batch exists
- Non-blocking - user can still use the uploader while banner is visible

## Commits

| Hash | Message |
|------|---------|
| 2bfc76f | feat(22-04): add useIncompleteBatch hook for detecting interrupted imports |
| 73a5438 | feat(22-04): add IncompleteBatchBanner component |
| 4e21e06 | feat(22-04): integrate IncompleteBatchBanner into batch import page |

## Decisions Made

### Reuse Existing LocalStorage Key

Used the same `batch-upload-queue` key that use-batch-upload.ts writes to. This means:
- No duplicate storage
- Automatic detection of incomplete batches from the real upload hook
- Same 24-hour expiry policy

### Resume Shows Status Only

Full resume (re-attaching actual File objects) requires blob storage which is deferred. Current implementation:
- Shows what happened in the previous attempt
- User understands status and can re-upload pending files manually
- Clean UX path forward

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 22-05 (Re-import Flow) which will enable re-processing files with new settings.
