---
id: S46
parent: M001
milestone: M001
provides:
  - "@next/bundle-analyzer installed and configured in next.config.ts"
  - "withBundleAnalyzer chained inside withSentryConfig wrapper"
  - "optimizePackageImports for lucide-react (PERF-03)"
  - "npm run analyze script using cross-env and --webpack flag"
  - "Before-optimization client bundle treemap at .planning/performance/bundle-treemap-before.html"
  - "Baseline metrics: 73 client chunks, 3.96MB uncompressed, largest chunk 562KB"
  - All 9 recharts chart components converted to next/dynamic with ssr:false at 8 call sites
  - forecast-charts-dynamic.tsx client wrapper for Server Component pages
  - After-optimization bundle treemap at .planning/performance/bundle-treemap-after.html
  - LIGHTHOUSE.md with baseline score template at .planning/performance/LIGHTHOUSE.md
requires: []
affects: []
key_files: []
key_decisions:
  - "Use --webpack flag in analyze script because Next.js 16.1.4 defaults to Turbopack which is incompatible with @next/bundle-analyzer"
  - "Add cross-env devDependency to make ANALYZE=true env var work on Windows in npm scripts"
  - "Sentry is outermost wrapper (withSentryConfig(withBundleAnalyzer(nextConfig))) per Sentry requirements"
  - "lucide-react listed in optimizePackageImports as belt-and-suspenders even though Next.js 16 auto-optimizes it"
  - "Next.js Server Components cannot use ssr:false in next/dynamic — created forecast-charts-dynamic.tsx client wrapper to work around restriction"
  - "Analytics pages switch from barrel import (@/components/charts) to direct file imports for individual dynamic imports"
  - "SuggestionTimeline uses compact inline skeleton (h-20 animate-pulse) instead of standard Skeleton component per plan spec"
patterns_established:
  - "Bundle analysis baseline pattern: run analyze once before optimizations, commit treemap, then compare after"
  - "Windows-compatible npm analyze scripts require cross-env for env var setting"
  - "Client wrapper pattern: when a Server Component page needs ssr:false dynamic imports, create a co-located *-dynamic.tsx client file"
  - "All recharts dynamic imports follow: dynamic(() => import('path').then(m => ({ default: m.ExportName })), { ssr: false, loading: () => <Skeleton /> })"
observability_surfaces: []
drill_down_paths: []
duration: 15min
verification_result: passed
completed_at: 2026-03-05
blocker_discovered: false
---
# S46: Performance Audit

**# Phase 46 Plan 01: Bundle Analyzer Setup Summary**

## What Happened

# Phase 46 Plan 01: Bundle Analyzer Setup Summary

**@next/bundle-analyzer installed and configured with webpack fallback for Turbopack-default Next.js 16, generating 1.27MB baseline treemap showing 3.96MB uncompressed client bundle across 73 chunks**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-05T17:54:00Z
- **Completed:** 2026-03-05T18:12:20Z
- **Tasks:** 2
- **Files modified:** 4 (next.config.ts, package.json, package-lock.json, bundle-treemap-before.html)

## Accomplishments
- Installed @next/bundle-analyzer and cross-env as devDependencies
- Configured next.config.ts with bundle analyzer chained inside withSentryConfig (Sentry outermost)
- Added `experimental.optimizePackageImports: ["lucide-react"]` for PERF-03 (belt-and-suspenders, already auto-optimized in Next.js 16)
- Generated and committed pre-optimization client bundle treemap (1.27MB HTML file)
- Established baseline: 73 client chunks, 3.96MB uncompressed, largest chunk 562KB

## Baseline Bundle Metrics

| Metric | Value |
|--------|-------|
| Total client chunks | 73 |
| Total uncompressed size | 3.96MB |
| Largest chunk | 562KB (2490-b87c29dd3f7522ba.js) |
| 2nd largest | 422KB (8542-fb0f950e89f4dd23.js) |
| 3rd largest | 390KB (main-351e0ab518bfa4db.js) |
| react-pdf/pdfjs in client bundle | Not detected (good - likely server-side only) |
| Treemap file size | 1.27MB HTML |

## Task Commits

Each task was committed atomically:

1. **Task 1: Install bundle analyzer, configure next.config.ts, add analyze script** - `321a08b` (feat)
2. **Task 2: Generate before-optimization bundle treemap** - `109c7a9` (feat)

**Plan metadata:** `[final commit hash]` (docs: complete plan)

## Files Created/Modified
- `next.config.ts` - Added withBundleAnalyzer import and chaining, added experimental.optimizePackageImports
- `package.json` - Added @next/bundle-analyzer and cross-env to devDependencies, added analyze script
- `package-lock.json` - Updated with new dependencies
- `.planning/performance/bundle-treemap-before.html` - 1.27MB interactive treemap of pre-optimization client bundle

## Decisions Made
- Used `--webpack` flag in analyze script because Next.js 16.1.4 defaults to Turbopack, which is incompatible with `@next/bundle-analyzer`. The `--webpack` flag forces the webpack bundler for the analysis build only.
- Added `cross-env` devDependency to make `ANALYZE=true` env var work on Windows in npm scripts.
- `withSentryConfig` remains the outermost wrapper per Sentry documentation requirements.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added --webpack flag to analyze script for Turbopack incompatibility**
- **Found during:** Task 2 (Generate before-optimization bundle treemap)
- **Issue:** Next.js 16.1.4 defaults to Turbopack, which prints "The Next Bundle Analyzer is not compatible with Turbopack builds" and skips report generation. The plan's `ANALYZE=true next build` command produced no treemap.
- **Fix:** Added `--webpack` flag to the analyze script to force webpack bundler, and added `cross-env` devDependency to make the env var work on Windows (`cross-env ANALYZE=true next build --webpack`).
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm run analyze` generates `.next/analyze/client.html` (1.27MB)
- **Committed in:** 109c7a9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Turbopack/webpack incompatibility)
**Impact on plan:** Required deviation - without the --webpack flag the treemap would not be generated at all. The analyze script behavior is slightly different (forces webpack build instead of Turbopack) but the output is the correct bundle analysis artifact.

## Issues Encountered
- Turbopack incompatibility with `@next/bundle-analyzer` in Next.js 16.1.4 — resolved by adding `--webpack` flag to the analyze script.
- `ANALYZE=true` environment variable syntax fails on Windows cmd — resolved by adding `cross-env` devDependency.

## Notable Treemap Findings
- react-pdf/pdfjs-dist does NOT appear in the initial client bundle (good signal for PERF-04 — it may already be lazy-loaded or server-only).
- lucide-react icons appear as individual ES module files in the treemap (e.g., `lucide-react/dist/esm/icons/download.js`) — confirming tree-shaking/individual import optimization is working.
- Largest client chunk (562KB uncompressed) is a shared/vendor chunk — likely a candidate for further splitting in Plan 02 optimizations.

## Next Phase Readiness
- Baseline established — Plan 02 can now implement dynamic import optimizations and compare against this baseline.
- The `.planning/performance/bundle-treemap-before.html` provides the before-state for visual comparison after Plan 02 optimizations.
- `npm run analyze` works correctly and can be re-run after optimizations to generate the after-treemap.

## Self-Check: PASSED

- next.config.ts: FOUND
- .planning/performance/bundle-treemap-before.html: FOUND (1.27MB)
- .planning/phases/46-performance-audit/46-01-SUMMARY.md: FOUND
- Commit 321a08b (Task 1): FOUND
- Commit 109c7a9 (Task 2): FOUND

---
*Phase: 46-performance-audit*
*Completed: 2026-03-05*

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
