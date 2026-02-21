---
phase: 33-vault-ui
plan: 02
subsystem: ui
tags: [next.js, react, tanstack-query, date-fns, drizzle-orm, shadcn, lucide-react]

# Dependency graph
requires:
  - phase: 33-vault-ui-plan-01
    provides: VaultPage shell with Tabs, useSources hook, FileCabinetView, empty state
  - phase: 32-pdf-viewer
    provides: PdfViewerModal component and hasPdf boolean pattern
  - phase: 31-statement-source-tracking
    provides: statements table with statementDate, pdfStoragePath, transactionCount columns
provides:
  - GET /api/vault/timeline — cross-source statement list with transaction stats and aggregate counts
  - useVaultTimeline hook with VaultTimelineResponse and VaultTimelineStatement types
  - VaultStatsBar stats strip showing N sources · N statements · N PDFs stored
  - TimelineGrid CSS Grid calendar with year headers and clickable month cells
  - TimelineView with expandable detail panel and Date Unknown section
  - Fully wired vault-page.tsx with stats bar above tabs and TimelineView replacing placeholder
affects: [34-coverage-grid]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Timeline API derives hasPdf from pdfStoragePath IS NOT NULL — raw path never sent to client
    - Client-side month grouping via date-fns format(parseISO(date), "yyyy-MM") key
    - Year-grouped CSS Grid sections (grid-cols-4 sm:grid-cols-6) with year headers for long timelines
    - Toggle-select pattern: onSelectMonth(isSelected ? null : key) for accordion-style detail panel
    - TimelineStatementRow duplicates PdfStatusIcon + rich row format from folder-statements.tsx (same 6-line local component pattern)
    - useVaultTimeline fetched in vault-page.tsx for stats bar and in TimelineView for grid (TanStack Query deduplicates)

key-files:
  created:
    - src/app/api/vault/timeline/route.ts
    - src/lib/hooks/use-vault-timeline.ts
    - src/components/vault/vault-stats-bar.tsx
    - src/components/vault/timeline-grid.tsx
    - src/components/vault/timeline-view.tsx
  modified:
    - src/components/vault/vault-page.tsx

key-decisions:
  - "Timeline API collects all statement IDs then queries transaction stats with inArray — same N+1-avoiding pattern as /api/sources/[sourceType]/statements/route.ts"
  - "Stats bar rendered above Tabs component, hidden when timelineData.totalStatements === 0"
  - "Empty month cells rendered as non-interactive divs (not buttons) to avoid tab-stop noise"
  - "Year headers group months for long timelines — matches research recommendation"
  - "PdfStatusIcon duplicated locally in timeline-view.tsx (same 6-line component, avoids premature abstraction)"

patterns-established:
  - "Timeline grid cells use toggle: clicking selected cell deselects (passes null to onSelectMonth)"
  - "Date Unknown section always rendered below grid if any dateless statements exist"

requirements-completed: [VAULT-02, VAULT-03]

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 33 Plan 02: Vault UI — Timeline View and Stats Bar Summary

**Interactive timeline calendar grid at /vault with year-grouped month cells, clickable detail panel, dateless statement section, and aggregate stats bar using GET /api/vault/timeline**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-20T18:00:00Z
- **Completed:** 2026-02-20T18:08:00Z
- **Tasks:** 2
- **Files modified:** 6 (1 modified, 5 created)

## Accomplishments
- GET /api/vault/timeline returns all user statements cross-source with per-statement transaction stats (converted/skipped/pending) and aggregate totals (totalSources, totalStatements, totalPdfs)
- TimelineGrid renders a year-by-year CSS Grid calendar; filled cells show green PDF icon (if any PDF stored) or gray, with statement count badge; empty months are faded and non-interactive
- Clicking a filled month cell toggles a detail panel below the grid with rich statement rows matching folder-statements.tsx format (PDF icon, filename, source label, date, tx count, status breakdown, View details link, PdfViewerModal)
- Dateless statements surfaced in a "Date Unknown" section below the grid so all statements are visible
- VaultStatsBar strips "N sources · N statements · N PDFs stored" above the tab bar, hidden when no data

## Task Commits

Each task was committed atomically:

1. **Task 1: Create timeline API endpoint and hook** - `d515a63` (feat)
2. **Task 2: Build timeline calendar grid view and stats bar** - `5c62a03` (feat)

## Files Created/Modified
- `src/app/api/vault/timeline/route.ts` - GET endpoint: all user statements, per-statement transaction stats, totalSources/totalStatements/totalPdfs aggregates
- `src/lib/hooks/use-vault-timeline.ts` - useVaultTimeline hook with 2-min staleTime; exports VaultTimelineResponse and VaultTimelineStatement types
- `src/components/vault/vault-stats-bar.tsx` - Stats strip component: N sources · N statements · N PDFs stored
- `src/components/vault/timeline-grid.tsx` - CSS Grid calendar grouped by year; interactive month cells with PDF icon + count badge
- `src/components/vault/timeline-view.tsx` - Full timeline tab: skeleton loading, grid, toggleable detail panel, Date Unknown section
- `src/components/vault/vault-page.tsx` - Added VaultStatsBar above Tabs, wired TimelineView replacing placeholder

## Decisions Made
- Timeline API uses `inArray(transactions.statementId, statementIds)` to fetch all tx stats in a single query, same pattern as `/api/sources/[sourceType]/statements/route.ts`
- Stats bar uses `timelineData.totalStatements > 0` guard (not sources.length) so bar hides if source list exists but no statements yet
- Empty month cells are non-interactive `<div>` elements to avoid keyboard tab-stop noise
- PdfStatusIcon duplicated locally in timeline-view.tsx (same 6-line local component established in plan 01)

## Deviations from Plan
None — plan executed exactly as written. All components created per specification, build passes cleanly.

## Issues Encountered
None — build compiled cleanly on first attempt with all 6 files in place.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- /vault is now fully complete: File Cabinet view + Timeline view + Stats bar
- Phase 34 (coverage-grid) can reference TimelineGrid patterns for its own calendar rendering approach
- No blockers

## Self-Check: PASSED

- FOUND: src/app/api/vault/timeline/route.ts
- FOUND: src/lib/hooks/use-vault-timeline.ts
- FOUND: src/components/vault/vault-stats-bar.tsx
- FOUND: src/components/vault/timeline-grid.tsx
- FOUND: src/components/vault/timeline-view.tsx
- FOUND: src/components/vault/vault-page.tsx (modified)
- FOUND: commit d515a63 (Task 1)
- FOUND: commit 5c62a03 (Task 2)

---
*Phase: 33-vault-ui*
*Completed: 2026-02-20*
