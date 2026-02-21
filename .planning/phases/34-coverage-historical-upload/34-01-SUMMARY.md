---
phase: 34-coverage-historical-upload
plan: 01
subsystem: api
tags: [drizzle, tanstack-query, supabase-storage, date-fns, vault, coverage-grid]

# Dependency graph
requires:
  - phase: 33-vault-ui
    provides: vault navigation, timeline view, GET /api/vault/timeline pattern
  - phase: 31-pdf-storage
    provides: uploadStatementPdf helper, Supabase Storage integration
  - phase: 32-pdf-viewer
    provides: statement ownership verification pattern

provides:
  - GET /api/vault/coverage — per-source x 12-month coverage grid endpoint
  - POST /api/vault/attach-pdf — PDF attachment for existing statements without re-extraction
  - useVaultCoverage hook — typed TanStack Query hook with CoverageCell/CoverageSource/CoverageResponse types

affects:
  - 34-02-coverage-grid-ui
  - any future vault feature needing coverage data

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Coverage grid computed server-side — single query per scope (window statements + all sources)
    - Cell state derived from pdfStoragePath at API boundary, never exposed to client
    - selectDistinct for sources ensures rows for sources with only pre-window statements
    - Import type vs runtime import separation for "use client" hooks used as type sources

key-files:
  created:
    - src/app/api/vault/coverage/route.ts
    - src/app/api/vault/attach-pdf/route.ts
    - src/lib/hooks/use-vault-coverage.ts
  modified: []

key-decisions:
  - "Coverage route defines response types inline — avoids importing from use client hook file at runtime"
  - "selectDistinct sources query separate from window query — ensures sources with only old statements appear in grid"
  - "attach-pdf endpoint is storage-only — no transaction extraction triggered (contrast with batch/upload)"
  - "CoverageCell.state derived from pdfStoragePath at server — hasPdf boolean pattern from Phase 31 extended to three states"

patterns-established:
  - "Coverage grid: sourceType::yyyy-MM map key for O(1) cell lookup in 12x12 grid"
  - "PDF preference: when multiple statements per cell, prefer statement with PDF for state determination"
  - "Month window: subMonths(now, 11) to subMonths(now, 0) = exactly 12 months inclusive of current"

requirements-completed:
  - VENH-01
  - VENH-02

# Metrics
duration: 15min
completed: 2026-02-21
---

# Phase 34 Plan 01: Coverage Data Layer Summary

**Coverage grid data layer: GET /api/vault/coverage returning 12-month per-source cells (pdf/data/missing), POST /api/vault/attach-pdf for storage-only PDF attachment, and typed useVaultCoverage TanStack Query hook**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-21T08:24:20Z
- **Completed:** 2026-02-21T08:39:00Z
- **Tasks:** 3 of 3
- **Files modified:** 3 created

## Accomplishments

- Coverage API returns per-source x 12-month grid with exactly 12 cells per source, states derived from pdfStoragePath without exposing it
- Attach-PDF endpoint provides targeted storage-only attachment for yellow cells (data exists, no PDF) using ownership verification from Phase 31/32 pattern
- useVaultCoverage hook exports all 5 documented types (CoverageCell, CoverageSource, CoverageResponse, vaultCoverageKeys) with 2-minute staleTime matching vault timeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GET /api/vault/coverage endpoint** - `ef881a9` (feat)
2. **Task 2: Create POST /api/vault/attach-pdf endpoint** - `24d576a` (feat)
3. **Task 3: Create useVaultCoverage hook with TypeScript types** - `450a78d` (feat)

## Files Created/Modified

- `src/app/api/vault/coverage/route.ts` - Coverage grid endpoint: 12-month window query, distinct sources query, cell state computation (pdf/data/missing), gapCount
- `src/app/api/vault/attach-pdf/route.ts` - PDF attachment endpoint: ownership check, uploadStatementPdf call, pdfStoragePath update, billing gate
- `src/lib/hooks/use-vault-coverage.ts` - TanStack Query hook with CoverageCell, CoverageSource, CoverageResponse interfaces, vaultCoverageKeys factory

## Decisions Made

- **Coverage route types defined inline** — the hook file has `"use client"` directive; to avoid server route importing from a client module, type annotations were removed from the route (TypeScript infers the response shape). Types are canonical in the hook file for UI consumption.
- **selectDistinct for all-sources query** — a second query fetches distinct sourceTypes for the user without date filter, so sources with statements older than 12 months still appear as rows in the grid. This follows the plan requirement exactly.
- **attach-pdf is storage-only** — no transaction extraction, no processing status change. This is intentional: the yellow cell already has data, the user just wants to attach the original PDF document.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript compilation passed cleanly on first run with zero errors.

## User Setup Required

None — no new external service configuration required. Uses existing Supabase Storage setup from Phase 31.

## Next Phase Readiness

- Coverage data layer complete — Plan 02 can build the coverage grid UI component consuming `useVaultCoverage`
- Hook exports all types Plan 02 needs: `CoverageCell`, `CoverageSource`, `CoverageResponse`, `vaultCoverageKeys`
- Both endpoints ready for integration: GET returns correct shape, POST accepts FormData with file + statementId

---
*Phase: 34-coverage-historical-upload*
*Completed: 2026-02-21*
