---
phase: 34-coverage-historical-upload
plan: 02
subsystem: ui
tags: [vault, coverage-grid, heat-map, upload-wizard, react-dropzone, date-fns, tanstack-query]

# Dependency graph
requires:
  - phase: 34-01
    provides: useVaultCoverage hook, CoverageCell/CoverageSource/CoverageResponse types, /api/vault/coverage, /api/vault/attach-pdf
  - phase: 32-pdf-viewer
    provides: PdfViewerModal component, hasPdf pattern

provides:
  - coverage-grid.tsx — GitHub-style heat map grid with cell coloring, tooltips, click handlers
  - historical-upload-modal.tsx — Upload wizard modal with dropzone for both missing and attach modes
  - coverage-view.tsx — Coverage tab content with gap count header, grid, and modal orchestration
  - vault-page.tsx — Coverage tab integrated alongside File Cabinet and Timeline

affects:
  - /vault page UX (new Coverage tab)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single TooltipProvider wrapping entire grid — avoids per-cell provider instantiation
    - Cell dispatch pattern: state determines which modal opens (missing->upload, data->attach, pdf->viewer)
    - Modal only rendered in DOM when state is non-null (hasPdf pattern from Phase 32)
    - useEffect reset on open=false for modal state hygiene

key-files:
  created:
    - src/components/vault/coverage-grid.tsx
    - src/components/vault/historical-upload-modal.tsx
    - src/components/vault/coverage-view.tsx
  modified:
    - src/components/vault/vault-page.tsx

key-decisions:
  - "Used @radix-ui/react-tooltip primitives directly in CoverageGrid to wrap all cells in a single TooltipProvider — avoids shadcn Tooltip which embeds its own provider"
  - "PdfViewerModal only rendered when pdfViewer state is non-null — consistent with Phase 32 hasPdf pattern"
  - "Coverage tab appended after Timeline as third tab; File Cabinet remains default"
  - "localStorage guard extended to include 'coverage' string for tab preference persistence"

patterns-established:
  - "Single TooltipProvider wrapping large interactive grids — not one provider per cell"
  - "Modal state as null|object — null means unmounted, object means mounted (open or closing)"

requirements-completed:
  - VENH-01
  - VENH-02

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 34 Plan 02: Coverage Grid UI Summary

**GitHub-style heat map coverage grid with cell coloring (green/yellow/gray), tooltips, historical upload wizard modal (react-dropzone, dual mode), and Coverage tab wired into /vault page**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-21T08:29:31Z
- **Completed:** 2026-02-21T08:32:13Z
- **Tasks:** 3 of 3
- **Files modified:** 3 created, 1 modified

## Accomplishments

- CoverageGrid renders a 12-column heat map with CSS Grid, single TooltipProvider wrapping all cells for performance, legend bar, and full accessibility (aria-label, role=grid/row/gridcell)
- HistoricalUploadModal handles both "missing" (gray cell -> /api/batch/upload with hash) and "attach" (yellow cell -> /api/vault/attach-pdf) modes with react-dropzone, error handling, retry, and cache invalidation on success
- CoverageView orchestrates all three modals/components, gap count amber banner, loading skeleton
- vault-page.tsx extended with Coverage tab (BarChart3 icon, third position), localStorage persistence includes "coverage" value

## Task Commits

Each task was committed atomically:

1. **Task 1: Create coverage-grid.tsx heat map component** - `e59ce24` (feat)
2. **Task 2: Create historical-upload-modal.tsx wizard** - `d4330b1` (feat)
3. **Task 3: Create coverage-view.tsx and wire Coverage tab into vault-page.tsx** - `6e69d0b` (feat)

## Files Created/Modified

- `src/components/vault/coverage-grid.tsx` - GitHub-style heat map: CSS Grid layout, per-cell state coloring, single TooltipProvider, legend bar, CoverageCellClickInfo interface
- `src/components/vault/historical-upload-modal.tsx` - Upload wizard: react-dropzone with drag state, file clear, dual-mode POST to batch/upload or attach-pdf, error+retry, cache invalidation
- `src/components/vault/coverage-view.tsx` - Orchestration layer: useVaultCoverage hook, cell click dispatch, gap count amber banner, modal state management
- `src/components/vault/vault-page.tsx` - Added BarChart3 import, CoverageView import, "coverage" to localStorage guard, third TabsTrigger and TabsContent

## Decisions Made

- **Single Radix TooltipProvider** — the shadcn `Tooltip` component embeds its own `TooltipProvider` per call; for a 12x12 grid this would instantiate many nested providers. Used `@radix-ui/react-tooltip` primitives directly to wrap the entire grid in one provider with `delayDuration={300}`.
- **Modal-as-null pattern** — upload modal and PDF viewer states are typed `null | object`. When null the component is not rendered at all, consistent with Phase 32 hasPdf pattern. This avoids unnecessary signed-URL API calls when the viewer is not needed.
- **Coverage tab position** — File Cabinet remains default tab (index 0), Coverage appended as third tab after Timeline per plan specification.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/components/vault/coverage-grid.tsx
- FOUND: src/components/vault/historical-upload-modal.tsx
- FOUND: src/components/vault/coverage-view.tsx
- FOUND: src/components/vault/vault-page.tsx (modified)

Commits verified:
- FOUND: e59ce24 — feat(34-02): create coverage-grid.tsx heat map component
- FOUND: d4330b1 — feat(34-02): create historical-upload-modal.tsx upload wizard
- FOUND: 6e69d0b — feat(34-02): create coverage-view.tsx and add Coverage tab to vault-page

TypeScript: `npx tsc --noEmit` passes with zero errors.

---
*Phase: 34-coverage-historical-upload*
*Completed: 2026-02-21*
