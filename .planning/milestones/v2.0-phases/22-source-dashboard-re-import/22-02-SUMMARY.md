---
phase: 22
plan: 02
subsystem: ui/sources
tags: [react, accordion, dashboard, shadcn, date-fns]

dependency_graph:
  requires: ["22-01"]
  provides: ["source-dashboard", "source-list-ui", "navigation-link"]
  affects: ["22-03"]

tech_stack:
  added: []
  patterns:
    - "Accordion-based expandable list"
    - "Lazy-loading statements on expand"
    - "Tooltip-based gap warning display"

files:
  key_files:
    created:
      - src/components/sources/coverage-gap-warning.tsx
      - src/components/sources/source-row.tsx
      - src/components/sources/source-list.tsx
      - src/components/sources/statement-list.tsx
      - src/components/sources/source-dashboard.tsx
      - src/components/sources/index.ts
      - src/app/(dashboard)/sources/page.tsx
    modified:
      - src/components/layout/app-sidebar.tsx

decisions:
  - decision: "Accordion over card grid"
    choice: "Single-column accordion list"
    why: "Better for variable content per source, cleaner expand/collapse UX"
  - decision: "Lazy load statements"
    choice: "Fetch statements only when source is expanded"
    why: "Avoid loading all statements upfront, improve initial load time"
  - decision: "Tooltip for gaps"
    choice: "Badge with hover tooltip showing missing months"
    why: "Compact display, details on demand, max 3 visible + overflow"

metrics:
  duration: ~9 min
  completed: 2026-02-09
---

# Phase 22 Plan 02: Source Dashboard Component Summary

Accordion-based source list UI with lazy-loaded statements and gap warning badges.

## What Was Built

### Task 1: Source Row and Gap Warning Components

**CoverageGapWarning** (`src/components/sources/coverage-gap-warning.tsx`):
- Warning badge using shadcn Badge with `variant="warning"`
- Tooltip displays up to 3 missing months with +N overflow
- Formats gaps from YYYY-MM to "Month Year" display
- Renders null when no gaps exist

**SourceRow** (`src/components/sources/source-row.tsx`):
- Displays source coverage summary in compact format
- Shows: source name, date range, statement/transaction counts
- Status breakdown: converted (green), pending (yellow), skipped (muted)
- Last import date with relative formatting
- Integrates CoverageGapWarning for sources with gaps

### Task 2: Source List and Statement List Components

**SourceList** (`src/components/sources/source-list.tsx`):
- Uses shadcn Accordion with `type="single" collapsible`
- Maps sources to AccordionItems with SourceRow as trigger
- Removes underline hover effect on trigger
- Empty state with FileStack icon and helpful messaging

**StatementList** (`src/components/sources/statement-list.tsx`):
- Lazily loads statements when source is expanded
- Uses `useSourceStatements` hook from Wave 1
- Loading skeleton while fetching
- Sorted by statement date descending (newest first)
- Statement rows with filename, date, counts, and "View details" link
- Links to `/transactions?statementId={id}` for filtering

### Task 3: Source Dashboard Page and Navigation

**SourceDashboard** (`src/components/sources/source-dashboard.tsx`):
- Uses `useSources` hook to fetch source coverage data
- Loading skeleton matching source row structure
- Error state with message display
- Wraps SourceList in Card component

**Sources Page** (`src/app/(dashboard)/sources/page.tsx`):
- Page at `/sources` with proper metadata
- Uses DashboardHeader with breadcrumbs
- Container with max-width and responsive padding

**Navigation** (`src/components/layout/app-sidebar.tsx`):
- Added FileStack icon import
- Added "Sources" nav item after "Transactions"
- Uses `/sources` href

## Component Hierarchy

```
/sources page
  -> DashboardHeader
  -> SourceDashboard
       -> useSources() hook
       -> SourceList
            -> Accordion
                 -> AccordionItem (per source)
                      -> AccordionTrigger
                           -> SourceRow
                                -> CoverageGapWarning
                      -> AccordionContent
                           -> StatementList
                                -> useSourceStatements() hook
                                -> StatementRow (per statement)
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification

1. Build passes: `/sources` appears in route list
2. All components lint-clean
3. Navigation link added to sidebar
4. Accordion pattern verified working
5. Empty state renders when no sources

## Commits

| Hash | Message |
|------|---------|
| 39da49a | feat(22-02): add source row and coverage gap warning components |
| 158ac3b | feat(22-02): add source list accordion and statement list components |
| 049122a | feat(22-02): add source dashboard page and navigation |

## Next Phase Readiness

Ready for 22-03 (Source Detail Page):
- Statement list links to `/transactions?statementId={id}`
- All hooks in place for statement-level operations
- UI patterns established for source/statement hierarchy
