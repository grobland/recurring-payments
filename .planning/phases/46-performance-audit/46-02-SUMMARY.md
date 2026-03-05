---
phase: 46-performance-audit
plan: 02
subsystem: ui
tags: [recharts, next-dynamic, bundle-optimization, performance, lighthouse]

# Dependency graph
requires:
  - phase: 46-01
    provides: bundle analyzer setup, before-treemap baseline, PERF requirements

provides:
  - All 9 recharts chart components converted to next/dynamic with ssr:false at 8 call sites
  - forecast-charts-dynamic.tsx client wrapper for Server Component pages
  - After-optimization bundle treemap at .planning/performance/bundle-treemap-after.html
  - LIGHTHOUSE.md with baseline score template at .planning/performance/LIGHTHOUSE.md

affects: [future performance phases, any page adding recharts charts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/dynamic with ssr:false for recharts-based components (browser-only ResizeObserver)"
    - "Client wrapper file (forecast-charts-dynamic.tsx) for ssr:false dynamic imports in Server Components"
    - "Named export dynamic pattern: import('./file').then((m) => ({ default: m.ExportName }))"

key-files:
  created:
    - src/components/forecast/forecast-charts-dynamic.tsx
    - .planning/performance/bundle-treemap-after.html
    - .planning/performance/LIGHTHOUSE.md
  modified:
    - src/app/(dashboard)/payments/dashboard/page.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/app/(dashboard)/payments/analytics/page.tsx
    - src/app/(dashboard)/analytics/page.tsx
    - src/app/(dashboard)/payments/forecast/page.tsx
    - src/app/(dashboard)/dashboard/forecasting/page.tsx
    - src/components/suggestions/suggestion-card.tsx
    - src/components/accounts/account-spending-tab.tsx

key-decisions:
  - "Next.js Server Components cannot use ssr:false in next/dynamic — created forecast-charts-dynamic.tsx client wrapper to work around restriction"
  - "Analytics pages switch from barrel import (@/components/charts) to direct file imports for individual dynamic imports"
  - "SuggestionTimeline uses compact inline skeleton (h-20 animate-pulse) instead of standard Skeleton component per plan spec"

patterns-established:
  - "Client wrapper pattern: when a Server Component page needs ssr:false dynamic imports, create a co-located *-dynamic.tsx client file"
  - "All recharts dynamic imports follow: dynamic(() => import('path').then(m => ({ default: m.ExportName })), { ssr: false, loading: () => <Skeleton /> })"

requirements-completed: [PERF-01, PERF-02, PERF-04]

# Metrics
duration: 15min
completed: 2026-03-05
---

# Phase 46 Plan 02: Dynamic Chart Imports Summary

**9 recharts components converted to next/dynamic with ssr:false across 8 call-site files, deferring recharts bundle to lazy async chunks with before/after treemaps committed**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-05T18:20:00Z
- **Completed:** 2026-03-05T18:35:00Z
- **Tasks:** 2 of 3 complete (Task 3 is a human-verify checkpoint)
- **Files modified:** 11

## Accomplishments
- Converted all 9 recharts chart components from static imports to next/dynamic with ssr:false
- Created forecast-charts-dynamic.tsx client wrapper to handle Server Component limitation
- Confirmed react-pdf not leaking (only accessed via existing dynamic import in pdf-viewer-modal.tsx)
- Generated post-optimization bundle treemap showing recharts in async/lazy chunks
- Created LIGHTHOUSE.md with score template and before/after bundle comparison notes

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert all recharts imports to next/dynamic at call sites** - `fd1f6e7` (feat)
2. **Task 2: Generate after-optimization treemap and create Lighthouse doc** - `262e78f` (feat)
3. **Task 3: Verify charts render and capture Lighthouse scores** - pending (checkpoint:human-verify)

## Files Created/Modified
- `src/components/forecast/forecast-charts-dynamic.tsx` - Client wrapper for MonthlyForecastChart and AnnualForecastFanChart dynamic imports
- `src/app/(dashboard)/payments/dashboard/page.tsx` - CategoryChart, YearOverYearChart, CategoryTrendsChart converted to dynamic
- `src/app/(dashboard)/dashboard/page.tsx` - Same 3 charts converted (mirror route)
- `src/app/(dashboard)/payments/analytics/page.tsx` - CategoryPieChart, SpendingTrendChart converted (barrel replaced with direct imports)
- `src/app/(dashboard)/analytics/page.tsx` - Same 2 charts converted (mirror route)
- `src/app/(dashboard)/payments/forecast/page.tsx` - Uses forecast-charts-dynamic.tsx wrappers
- `src/app/(dashboard)/dashboard/forecasting/page.tsx` - Uses forecast-charts-dynamic.tsx wrappers
- `src/components/suggestions/suggestion-card.tsx` - SuggestionTimeline converted with compact skeleton
- `src/components/accounts/account-spending-tab.tsx` - AccountSpendingChart converted
- `.planning/performance/bundle-treemap-after.html` - Post-optimization bundle treemap (1.28MB, covers all chunks)
- `.planning/performance/LIGHTHOUSE.md` - Baseline score template with run-pending values

## Decisions Made
- Next.js 16 does not allow `ssr: false` in Server Components — created `forecast-charts-dynamic.tsx` as a `"use client"` module that exports the dynamic wrappers, which the Server Component forecast pages then import
- Analytics pages previously used barrel import `{ CategoryPieChart, SpendingTrendChart } from "@/components/charts"` — replaced with direct file imports for individual dynamic imports
- SuggestionTimeline uses compact inline pulse skeleton `h-20` per plan spec (not standard Skeleton component)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Server Component incompatibility with ssr:false dynamic imports**
- **Found during:** Task 1 (forecast pages)
- **Issue:** `payments/forecast/page.tsx` and `dashboard/forecasting/page.tsx` are Server Components (use `export const metadata`). Next.js 16 throws: `ssr: false is not allowed with next/dynamic in Server Components`
- **Fix:** Created `src/components/forecast/forecast-charts-dynamic.tsx` as a `"use client"` module containing the dynamic imports. Forecast pages import from this wrapper instead.
- **Files modified:** src/components/forecast/forecast-charts-dynamic.tsx (created), both forecast page files (import updated)
- **Verification:** Build passes with no errors
- **Committed in:** fd1f6e7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug fix)
**Impact on plan:** Necessary workaround for Next.js Server Component restriction. No scope creep. The plan assumed all pages were client components; two forecast pages are server components requiring a wrapper.

## Issues Encountered
- Next.js 16 enforces strict separation: `ssr: false` cannot be used in Server Components. Required creating a client wrapper file pattern for the two forecast pages that use `export const metadata`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All recharts components now lazy-loaded, deferring ~500KB recharts bundle from initial page load
- Task 3 (human-verify checkpoint) still pending — user needs to verify charts render and capture Lighthouse scores
- After Lighthouse scores captured, requirements PERF-01, PERF-02, PERF-04 fully validated
