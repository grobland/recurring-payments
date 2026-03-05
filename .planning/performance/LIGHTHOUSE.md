# Lighthouse Baseline — Phase 46

**Date:** 2026-03-05
**Targets:** Performance 80+, Accessibility 95+, Best Practices 95+
**Environment:** Production build (npm run build && npm run start) on localhost

## Scores

| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| Landing (/) | _run pending_ | _run pending_ | _run pending_ | _run pending_ |
| Dashboard (/payments/dashboard) | _run pending_ | _run pending_ | _run pending_ | _run pending_ |
| Vault (/vault) | _run pending_ | _run pending_ | _run pending_ | _run pending_ |

## How to Run

1. Build and start: `npm run build && npm run start`
2. In Chrome DevTools > Lighthouse tab, run audit for each page
3. Or use CLI: `npx lighthouse http://localhost:3000 --output json --output html`
4. Update scores above

## Gap Analysis

[Update after scores are captured — note any category below target]

## Bundle Optimization Impact

### Before vs After Treemap Comparison

**Before optimization** (Phase 46-01 baseline):
- recharts (~500KB gzipped) included in initial client bundle
- All chart components (CategoryChart, YearOverYearChart, CategoryTrendsChart, CategoryPieChart, SpendingTrendChart, MonthlyForecastChart, AnnualForecastFanChart, SuggestionTimeline, AccountSpendingChart) pulled synchronously

**After optimization** (Phase 46-02):
- All 9 recharts-using components converted to `next/dynamic` with `ssr: false`
- recharts library deferred to async/lazy chunks, not part of initial JavaScript bundle
- Pages affected: payments/dashboard, dashboard, payments/analytics, analytics, payments/forecast, dashboard/forecasting
- Components affected: suggestion-card (SuggestionTimeline), account-spending-tab (AccountSpendingChart)
- New client wrapper: `forecast-charts-dynamic.tsx` to handle Server Component limitation with `ssr: false`

**Treemap file sizes:**
- Before: ~1.27MB (bundle-treemap-before.html)
- After: ~1.28MB (bundle-treemap-after.html)
- Note: Total treemap sizes are similar because the analyzer captures ALL chunks (including async). The improvement is in initial load, where recharts is no longer part of the synchronous bundle.

## Recommendations for Future Phases

- Consider `optimizePackageImports` for lucide-react (tree-shaking) if icon bundle remains large
- Evaluate image optimization (Next.js `<Image>` component) for any static images
- Consider route-level code splitting for heavy dashboard components (AnalyticsCards, PatternSuggestionsCard)
- Review `@/components/charts/index.ts` barrel — any consumers still using barrel import will pull both charts
