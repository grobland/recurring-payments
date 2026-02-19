---
phase: 31-storage-foundation
plan: 02
subsystem: ui
tags: [react, typescript, lucide-react, tanstack-query, supabase-storage]

# Dependency graph
requires:
  - phase: 31-storage-foundation
    provides: pdfStoragePath column in statements table (from plan 01)
provides:
  - hasPdf boolean field in StatementSummary type
  - hasPdf boolean in GET /api/sources/[sourceType]/statements response
  - hasPdf boolean in GET /api/statements/[id] response
  - PdfStatusIcon component (green for stored, gray for not stored)
  - Statement list rows show PDF storage status icon
  - Statement detail header shows PDF storage status icon
affects:
  - 31-03-PLAN (PDF viewer — will use hasPdf to conditionally show open button)
  - 32 (PDF viewer phase — reads hasPdf from same APIs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "hasPdf derived from pdfStoragePath IS NOT NULL at API boundary — raw path never exposed to client"
    - "PdfStatusIcon: local function component per file (two copies acceptable for 6-line component)"
    - "Color coding: text-green-500 for stored, text-muted-foreground/40 for not stored"

key-files:
  created: []
  modified:
    - src/types/source.ts
    - src/app/api/sources/[sourceType]/statements/route.ts
    - src/app/api/statements/[id]/route.ts
    - src/components/sources/statement-list.tsx
    - src/components/sources/statement-detail.tsx
    - src/lib/hooks/use-statement.ts

key-decisions:
  - "hasPdf boolean only — raw pdfStoragePath path never sent to client (security + simplicity)"
  - "PdfStatusIcon duplicated locally in both files rather than extracting to shared module (6-line component, avoids premature abstraction)"
  - "Icons informational only in Phase 31 — no onClick, no cursor change; Phase 32 adds viewer on click"

patterns-established:
  - "PDF status: derive boolean at API boundary (IS NOT NULL), never expose storage path to UI"
  - "Status icons: aria-label on every status icon for accessibility"

requirements-completed: [STOR-02]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 31 Plan 02: PDF Storage Status Indicators Summary

**hasPdf boolean derived from pdfStoragePath IS NOT NULL in both statement APIs, surfaced as green/gray FileText icon on every statement row and detail header**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T17:45:15Z
- **Completed:** 2026-02-19T17:47:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Updated `StatementSummary` type with `hasPdf: boolean` field and JSDoc
- Both statement APIs (`/api/sources/[sourceType]/statements` and `/api/statements/[id]`) now return `hasPdf` derived from `pdfStoragePath IS NOT NULL`
- `PdfStatusIcon` component created locally in both `statement-list.tsx` and `statement-detail.tsx` — green (`text-green-500`) for stored PDFs, muted gray (`text-muted-foreground/40`) for missing
- Statement rows use `PdfStatusIcon` instead of the old static gray `FileText` icon
- Statement detail header shows `PdfStatusIcon` inline next to the filename
- All icons include `aria-label` for screen reader accessibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hasPdf to statement APIs and type definitions** - `3db2b1a` (feat)
2. **Task 2: Add PDF status icon to statement list and detail views** - `33918e5` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/types/source.ts` - Added `hasPdf: boolean` to `StatementSummary` interface
- `src/app/api/sources/[sourceType]/statements/route.ts` - Selects `pdfStoragePath`, maps to `hasPdf` in response
- `src/app/api/statements/[id]/route.ts` - Selects `pdfStoragePath`, adds `hasPdf` to response JSON
- `src/components/sources/statement-list.tsx` - Added `PdfStatusIcon` component, replaced static icon in `StatementRow`
- `src/components/sources/statement-detail.tsx` - Added `PdfStatusIcon` component, inserted in statement header
- `src/lib/hooks/use-statement.ts` - Added `hasPdf: boolean` to `StatementInfo` type to match API response

## Decisions Made
- Raw `pdfStoragePath` is never sent to the client — only the derived boolean `hasPdf`. This is both simpler and avoids exposing internal storage paths.
- `PdfStatusIcon` is defined locally in both component files rather than being extracted to a shared module. At 6 lines, extraction would be premature abstraction.
- Icons are informational only in Phase 31 (no `onClick`, no pointer cursor). Phase 32 will add the PDF viewer and make the icon clickable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added hasPdf to StatementInfo hook type**
- **Found during:** Task 2 (Add PDF status icon to statement list and detail views)
- **Issue:** `use-statement.ts` defines a local `StatementInfo` type that was missing `hasPdf`. TypeScript correctly reported `Property 'hasPdf' does not exist on type 'StatementInfo'` when the component tried to use it.
- **Fix:** Added `hasPdf: boolean` to the `StatementInfo` type in `src/lib/hooks/use-statement.ts` to match the updated API response.
- **Files modified:** `src/lib/hooks/use-statement.ts`
- **Verification:** `npx tsc --noEmit` passes with no errors after fix.
- **Committed in:** `33918e5` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — type definition not synchronized with API)
**Impact on plan:** Required fix for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed type deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All statement APIs now return `hasPdf` — Phase 32 PDF viewer can conditionally show "Open PDF" button based on this boolean
- `PdfStatusIcon` establishes the visual pattern (green/gray) that Phase 32 will evolve into a clickable control
- Pre-v2.2 statements (null `pdfStoragePath`) correctly display the "No file stored" gray icon

---
*Phase: 31-storage-foundation*
*Completed: 2026-02-19*

## Self-Check: PASSED

- FOUND: src/types/source.ts
- FOUND: src/app/api/sources/[sourceType]/statements/route.ts
- FOUND: src/app/api/statements/[id]/route.ts
- FOUND: src/components/sources/statement-list.tsx
- FOUND: src/components/sources/statement-detail.tsx
- FOUND: src/lib/hooks/use-statement.ts
- FOUND: .planning/phases/31-storage-foundation/31-02-SUMMARY.md
- FOUND commit: 3db2b1a (Task 1)
- FOUND commit: 33918e5 (Task 2)
