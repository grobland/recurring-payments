---
phase: 32-pdf-viewer
plan: 01
subsystem: ui
tags: [react-pdf, pdfjs, next-dynamic, tanstack-query, supabase-storage, signed-url]

# Dependency graph
requires:
  - phase: 31-storage-foundation
    provides: "generatePdfSignedUrl helper, /api/statements/[id]/pdf-url endpoint, pdfStoragePath in schema"
provides:
  - "PdfViewerInner: react-pdf Document/Page with worker config, page navigation, download button"
  - "PdfViewerModal: dynamic(ssr:false) Dialog wrapper with loading/error/render-error states"
  - "usePdfUrl TanStack Query hook for lazy signed URL fetch (enabled flag, 55-min staleTime)"
  - "API endpoint returns both { url, downloadUrl } — single call, no double-fetch on client"
  - "generatePdfSignedUrl accepts download option for Content-Disposition: attachment URLs"
affects: [32-pdf-viewer-02, sources-ui, statement-detail]

# Tech tracking
tech-stack:
  added: ["react-pdf@^10.3.0 (bundles pdfjs-dist 5.4.296)"]
  patterns:
    - "Two-file react-pdf split: inner (worker + Document) + outer (dynamic ssr:false wrapper)"
    - "Worker config as module-level statement in same file as <Document>"
    - "Lazy signed URL fetch via TanStack Query enabled flag"
    - "Dual signed URL: one for viewing (inline), one for download (Content-Disposition: attachment)"

key-files:
  created:
    - src/components/statements/pdf-viewer-inner.tsx
    - src/components/statements/pdf-viewer-modal.tsx
    - src/lib/hooks/use-pdf-url.ts
  modified:
    - src/app/api/statements/[id]/pdf-url/route.ts
    - src/lib/storage/pdf-storage.ts
    - package.json

key-decisions:
  - "react-pdf@^10.3.0 installed without separate pdfjs-dist — version mismatch would cause API/Worker version error"
  - "Worker config in pdf-viewer-inner.tsx as module-level statement — same file as <Document> (mandatory to prevent fake worker)"
  - "Single API call returns both url and downloadUrl — avoids double-fetch on client"
  - "generatePdfSignedUrl extended with optional download option using Supabase { download: filename } to set Content-Disposition: attachment"
  - "Page width capped at Math.min(760, window.innerWidth - 80) — stays within max-w-4xl dialog with padding"

patterns-established:
  - "react-pdf two-file split: pdf-viewer-inner (SSR-unsafe) + pdf-viewer-modal (dynamic SSR-disabled wrapper)"
  - "Lazy URL fetch: usePdfUrl(id, enabled) — only fetches when modal open, 55-min staleTime just under 1-hour URL expiry"

requirements-completed: [VIEW-01, VIEW-02]

# Metrics
duration: 25min
completed: 2026-02-19
---

# Phase 32 Plan 01: PDF Viewer Component Stack Summary

**react-pdf v10 viewer modal with dynamic SSR-disabled import, page navigation, download button, and dual signed URL endpoint (inline view + Content-Disposition download)**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-19
- **Completed:** 2026-02-19
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified) + package.json/lock

## Accomplishments
- react-pdf@^10.3.0 installed — bundles its own pdfjs-dist, no separate install
- PdfViewerInner created with worker config in same file as Document, page navigation (shadcn Button + ChevronLeft/Right icons), download anchor with Content-Disposition URL
- PdfViewerModal created with dynamic(ssr:false) import, Dialog shell, loading/error/render-error states, resets renderError on re-open
- usePdfUrl TanStack Query hook: lazy fetch with enabled flag, 55-min staleTime (just under 1-hour signed URL expiry), 1-hour gcTime, retry: 1
- API endpoint updated to return both url (viewing) and downloadUrl (Content-Disposition: attachment) in single call
- generatePdfSignedUrl extended with optional { download } option using Supabase Storage createSignedUrl download parameter
- `npm run build` passes — SSR safety confirmed via dynamic import pattern
- `npx tsc --noEmit` passes — full type safety

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-pdf and create PDF viewer components with hook** - `a5f3d61` (feat)
2. **Task 2: Add download support to PDF URL endpoint** - `3bf3210` (feat)

## Files Created/Modified
- `src/components/statements/pdf-viewer-inner.tsx` - react-pdf Document/Page, worker config, page nav buttons, download anchor
- `src/components/statements/pdf-viewer-modal.tsx` - dynamic(ssr:false) wrapper, Dialog shell, loading/error/render-error states
- `src/lib/hooks/use-pdf-url.ts` - TanStack Query hook, lazy fetch, 55-min staleTime
- `src/app/api/statements/[id]/pdf-url/route.ts` - now returns { url, downloadUrl } via parallel generatePdfSignedUrl calls
- `src/lib/storage/pdf-storage.ts` - generatePdfSignedUrl extended with optional download option
- `package.json` - react-pdf@^10.3.0 added to dependencies

## Decisions Made
- react-pdf@^10.3.0 without separate pdfjs-dist install to avoid version mismatch
- Worker config at module level in pdf-viewer-inner.tsx (same file as Document) — mandatory pattern from research to prevent "fake worker" blank renders
- Single API call returning both URLs eliminates double-fetch on client
- Supabase `{ download: filename }` option used for Content-Disposition header — ensures cross-origin download works (browser `download` attribute ignored for cross-origin URLs)
- Page width computed as `Math.min(760, window.innerWidth - 80)` — responsive, fits max-w-4xl dialog

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required beyond Phase 31's Supabase Storage setup.

## Next Phase Readiness
- PDF viewer component stack complete — PdfViewerModal ready to be wired into PdfStatusIcon onClick handlers
- Phase 32 Plan 02 can now import PdfViewerModal from `@/components/statements/pdf-viewer-modal` and wire it into statement-list.tsx and statement-detail.tsx
- No blockers

---
*Phase: 32-pdf-viewer*
*Completed: 2026-02-19*
