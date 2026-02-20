---
phase: 33-vault-ui
plan: 01
subsystem: ui
tags: [next.js, react, tanstack-query, shadcn, collapsible, tabs, lucide-react]

# Dependency graph
requires:
  - phase: 32-pdf-viewer
    provides: PdfViewerModal component and hasPdf boolean pattern
  - phase: 31-statement-source-tracking
    provides: useSources, useSourceStatements hooks, SourceCoverage, StatementSummary types
provides:
  - /vault route accessible from sidebar with Archive icon
  - VaultPage client component with File Cabinet / Timeline tab switching
  - VaultEmptyState with Upload Statements CTA
  - FileCabinetView with responsive 3-column folder card grid
  - FolderCard Collapsible tile (multiple simultaneously expandable)
  - FolderStatements with lazy-loaded rich statement rows (PDF icon, filename, date, tx count, status breakdown, View PDF, View details)
affects: [33-02-timeline, 34-coverage-grid]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Collapsible (not Accordion) for multi-open folder cards
    - Lazy fetch via useSourceStatements only on folder expand
    - PdfStatusIcon duplicated locally in vault components (same 6-line pattern as statement-list)
    - Fragment wrapper per statement row to co-locate row + PdfViewerModal

key-files:
  created:
    - src/app/(dashboard)/vault/page.tsx
    - src/components/vault/vault-page.tsx
    - src/components/vault/vault-empty-state.tsx
    - src/components/vault/file-cabinet-view.tsx
    - src/components/vault/folder-card.tsx
    - src/components/vault/folder-statements.tsx
  modified:
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "Vault nav item added after Dashboard (index 1) in mainNavItems with Archive icon from lucide-react"
  - "Collapsible used instead of Accordion so multiple folder cards can be open simultaneously"
  - "Statements lazy-fetch only when folder expanded (useSourceStatements enabled by sourceType)"
  - "Tab defaultValue always file-cabinet — no persistence (per locked plan decision)"
  - "FolderStatements sorts statements newest-first (dateless last) matching statement-list.tsx pattern"

patterns-established:
  - "Vault components in src/components/vault/ directory"
  - "FolderCard uses Collapsible with open state via useState — not Accordion"
  - "PdfStatusIcon defined locally in folder-statements.tsx (6-line, avoids premature abstraction)"

requirements-completed: [VAULT-01, VAULT-03, VAULT-04]

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 33 Plan 01: Vault UI — Sidebar + File Cabinet Summary

**Collapsible file cabinet view at /vault with expandable source folder cards, lazy statement loading, and empty state — accessible from sidebar via Archive icon**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-20T17:48:03Z
- **Completed:** 2026-02-20T17:50:39Z
- **Tasks:** 2
- **Files modified:** 7 (1 modified, 6 created)

## Accomplishments
- Vault entry added to sidebar after Dashboard with Archive icon — navigates to /vault
- File Cabinet view renders all statement sources as expandable Collapsible folder cards in a 3-column responsive grid
- Folder cards expand inline showing rich statement rows (PDF icon, filename, date, tx count, status breakdown, View PDF, View details); multiple cards open simultaneously
- Empty state displayed for users with no statements (illustration + Upload Statements CTA to /import/batch)
- Tab bar switches between File Cabinet (active) and Timeline (placeholder, ready for Plan 02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Vault to sidebar and create /vault page route** - `7570e56` (feat)
2. **Task 2: Build vault page shell, empty state, and file cabinet with expandable folder cards** - `bbd220a` (feat)

## Files Created/Modified
- `src/components/layout/app-sidebar.tsx` - Added Archive import and Vault nav item after Dashboard
- `src/app/(dashboard)/vault/page.tsx` - Server component: DashboardHeader + VaultPage, metadata exported
- `src/components/vault/vault-page.tsx` - Client component: Tabs (File Cabinet/Timeline), useSources hook, loading skeleton, empty state gate
- `src/components/vault/vault-empty-state.tsx` - Empty state: Archive icon, text, Upload Statements button to /import/batch
- `src/components/vault/file-cabinet-view.tsx` - Responsive grid (1/2/3 cols) mapping SourceCoverage[] to FolderCards
- `src/components/vault/folder-card.tsx` - Collapsible tile: FolderOpen/FolderClosed icons, ChevronDown rotation, triggers FolderStatements on expand
- `src/components/vault/folder-statements.tsx` - Lazy-loaded statement rows with rich row format, PdfViewerModal per hasPdf statement

## Decisions Made
- Collapsible (not Accordion) used for multi-open folder behavior — matches locked plan decision
- Tab `defaultValue="file-cabinet"` with no persistence — matches locked plan decision
- Vault nav item positioned at index 1 (after Dashboard, before Subscriptions) in mainNavItems
- FolderStatements sorts newest-first, dateless statements last — matches statement-list.tsx pattern

## Deviations from Plan
None - plan executed exactly as written. All components created per specification, build passes cleanly.

## Issues Encountered
None - build compiled cleanly on first attempt with all 7 files in place.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /vault is complete with File Cabinet view, ready for Plan 02 (Timeline view)
- FolderCard grid structure ready to accept additional metadata in future plans
- No blockers

## Self-Check: PASSED

- FOUND: src/app/(dashboard)/vault/page.tsx
- FOUND: src/components/vault/vault-page.tsx
- FOUND: src/components/vault/vault-empty-state.tsx
- FOUND: src/components/vault/file-cabinet-view.tsx
- FOUND: src/components/vault/folder-card.tsx
- FOUND: src/components/vault/folder-statements.tsx
- FOUND: commit 7570e56 (Task 1)
- FOUND: commit bbd220a (Task 2)

---
*Phase: 33-vault-ui*
*Completed: 2026-02-20*
