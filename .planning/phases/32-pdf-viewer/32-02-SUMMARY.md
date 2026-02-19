---
phase: 32-pdf-viewer
plan: 02
subsystem: ui
tags: [react, pdf, modal, react-pdf, next-js]

# Dependency graph
requires:
  - phase: 32-pdf-viewer/32-01
    provides: PdfViewerModal component, usePdfUrl hook, and /api/statements/[id]/pdf-url endpoint
provides:
  - PdfStatusIcon in statement-list.tsx is now a clickable button that opens PdfViewerModal
  - PdfStatusIcon in statement-detail.tsx is now a clickable button that opens PdfViewerModal
  - PDF viewer accessible from statement list rows and statement detail header
affects: [sources, statements, pdf-viewer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Clickable icon wrapped in <button> with disabled/cursor-default for non-interactive state"
    - "Modal rendered conditionally on hasPdf to avoid API calls for statements without PDFs"
    - "pdfOpen state local to the component — opened by button onClick, closed by modal onClose"

key-files:
  created: []
  modified:
    - src/components/sources/statement-list.tsx
    - src/components/sources/statement-detail.tsx

key-decisions:
  - "Modal only rendered in DOM when hasPdf is true — avoids usePdfUrl hook running for non-PDF statements"
  - "button wraps PdfStatusIcon with disabled attribute for non-PDF rows — accessibility compliant"
  - "Fragment wrapper in StatementRow return to co-locate row div and modal without extra DOM node"

patterns-established:
  - "Icon-as-trigger pattern: wrap informational icon in <button> with disabled + cursor-default for non-interactive variant"

requirements-completed: [VIEW-01, VIEW-02]

# Metrics
duration: 8min
completed: 2026-02-19
---

# Phase 32 Plan 02: PDF Viewer Wiring Summary

**PdfViewerModal wired into statement list rows and statement detail header via clickable PdfStatusIcon buttons; gray icons remain disabled and non-interactive**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-19T21:55:47Z
- **Completed:** 2026-02-19T22:03:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- statement-list.tsx: PdfStatusIcon wrapped in a button with `setPdfOpen(true)` onClick; PdfViewerModal renders below the row when hasPdf is true
- statement-detail.tsx: PdfStatusIcon in the header wrapped in a button; PdfViewerModal renders at the end of the component JSX when hasPdf is true
- Non-PDF statements have a disabled button with `cursor-default` — no visual affordance, no modal mount, no API calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire PdfViewerModal into statement list and detail views** - `c7d199b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/sources/statement-list.tsx` - Added useState import, PdfViewerModal import, pdfOpen state, button wrapper on PdfStatusIcon, conditional PdfViewerModal render
- `src/components/sources/statement-detail.tsx` - Added PdfViewerModal import, pdfOpen state, button wrapper on PdfStatusIcon in header, conditional PdfViewerModal render at end of JSX

## Decisions Made
- Modal only mounted in DOM when `hasPdf` is true — prevents usePdfUrl hook triggering for statements without PDFs (no wasted signed URL API calls)
- Fragment (`<>...</>`) wrapper in StatementRow to co-locate the row div and the modal without adding a wrapper DOM element that would break list layout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 32 is complete — all 4 success criteria met:
  1. View PDF on any statement with stored file (modal opens, PDF renders via react-pdf)
  2. Navigate between pages (prev/next controls in PdfViewerInner)
  3. Download original file (download button with Content-Disposition via Supabase download signed URL)
  4. Error fallback (render error shows download link)
- Ready for Phase 33

---
*Phase: 32-pdf-viewer*
*Completed: 2026-02-19*
