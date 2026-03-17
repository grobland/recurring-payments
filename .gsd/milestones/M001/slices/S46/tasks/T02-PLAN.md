# T02: 46-performance-audit 02

**Slice:** S46 — **Milestone:** M001

## Description

Convert all 9 recharts chart component imports to next/dynamic with ssr:false at their call sites, verify react-pdf is not leaking, generate the after-optimization treemap, and document Lighthouse baseline scores.

Purpose: Reduce initial page load bundle by deferring heavy recharts library to lazy-loaded async chunks, then measure and document the results.
Output: All chart imports dynamified, after-treemap committed, LIGHTHOUSE.md with baseline scores.

## Must-Haves

- [ ] "All 9 recharts chart components are loaded via next/dynamic with ssr:false at their call sites"
- [ ] "react-pdf is confirmed not leaking into initial client bundle (already dynamic)"
- [ ] "After-optimization treemap is committed showing reduced initial bundle"
- [ ] "Lighthouse baseline scores are documented for 3 key pages"

## Files

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
