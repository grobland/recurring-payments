# S46: Performance Audit

**Goal:** Install @next/bundle-analyzer, configure next.
**Demo:** Install @next/bundle-analyzer, configure next.

## Must-Haves


## Tasks

- [x] **T01: 46-performance-audit 01** `est:18min`
  - Install @next/bundle-analyzer, configure next.config.ts with bundle analyzer chaining and optimizePackageImports for lucide-react, add the npm analyze script, and generate the before-optimization treemap.

Purpose: Establish the measurement baseline before any dynamic import optimizations are applied (Plan 02). The before treemap is essential for showing optimization impact.
Output: Configured next.config.ts, package.json with analyze script, before-treemap HTML committed.
- [x] **T02: 46-performance-audit 02** `est:15min`
  - Convert all 9 recharts chart component imports to next/dynamic with ssr:false at their call sites, verify react-pdf is not leaking, generate the after-optimization treemap, and document Lighthouse baseline scores.

Purpose: Reduce initial page load bundle by deferring heavy recharts library to lazy-loaded async chunks, then measure and document the results.
Output: All chart imports dynamified, after-treemap committed, LIGHTHOUSE.md with baseline scores.

## Files Likely Touched

- `next.config.ts`
- `package.json`
- `.planning/performance/bundle-treemap-before.html`
- `src/app/(dashboard)/payments/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/payments/analytics/page.tsx`
- `src/app/(dashboard)/analytics/page.tsx`
- `src/app/(dashboard)/payments/forecast/page.tsx`
- `src/app/(dashboard)/dashboard/forecasting/page.tsx`
- `src/components/suggestions/suggestion-card.tsx`
- `src/components/accounts/account-spending-tab.tsx`
- `.planning/performance/bundle-treemap-after.html`
- `.planning/performance/LIGHTHOUSE.md`
