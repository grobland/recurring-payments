---
phase: 17-spending-forecasting
plan: 02
subsystem: api
tags: [forecast, confidence-intervals, tanstack-query, statistics, spending-projection]

# Dependency graph
requires:
  - phase: 17-01
    provides: forecast types and utility functions
  - phase: 13
    provides: user_analytics_mv materialized view for historical data
provides:
  - GET /api/forecast/monthly with expanding CI bands
  - GET /api/forecast/annual with sqrt(12) uncertainty scaling
  - useForecast hooks for React components
  - forecastKeys query key factory
affects: [17-03, 17-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Monthly projection from known renewal dates
    - Volatility-based confidence intervals (CV approach)
    - sqrt(time) uncertainty scaling for fan effect
    - TanStack Query hooks with retry logic

key-files:
  created:
    - src/app/api/forecast/monthly/route.ts
    - src/app/api/forecast/annual/route.ts
    - src/lib/hooks/use-forecast.ts
  modified: []

key-decisions:
  - "Use volatility (CV) for CI calculation rather than raw stdDev"
  - "Monthly CI uses sqrt(monthsAhead) for expanding bands"
  - "Annual stdDev scales by sqrt(12) per statistical convention"
  - "All hooks share 5-min staleTime for consistent caching"

patterns-established:
  - "Forecast API pattern: project renewals, get historical volatility, add expanding CI"
  - "Annual uncertainty: monthly stdDev * sqrt(12) for 12 independent months"
  - "useForecast hooks: forecastKeys factory, isRetryableError, 5-min staleTime"

# Metrics
duration: 9min
completed: 2026-02-07
---

# Phase 17 Plan 02: Monthly/Annual Forecast APIs Summary

**Monthly and annual forecast endpoints with expanding confidence intervals, plus React hooks for all forecast data**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-07T10:30:00Z
- **Completed:** 2026-02-07T10:39:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Monthly forecast API projects known renewals with expanding CI bands
- Annual forecast API uses sqrt(12) scaling for proper uncertainty propagation
- React hooks with TanStack Query for calendar, monthly, and annual data
- Query key factory enables targeted cache invalidation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create monthly forecast API endpoint** - `282dc81` (feat)
2. **Task 2: Create annual forecast API endpoint** - `0c03748` (feat)
3. **Task 3: Create useForecast hooks** - `8363c5a` (feat)

## Files Created/Modified

- `src/app/api/forecast/monthly/route.ts` - GET /api/forecast/monthly?months=6 with projections and CI
- `src/app/api/forecast/annual/route.ts` - GET /api/forecast/annual with 12-month projection
- `src/lib/hooks/use-forecast.ts` - useForecastCalendar, useForecastMonthly, useForecastAnnual hooks

## Decisions Made

1. **Volatility-based CI calculation:** Using coefficient of variation (stdDev/mean) rather than raw stdDev. This scales intervals proportionally to forecast amount - higher spending means wider bands.

2. **sqrt(time) scaling for fan effect:** Confidence intervals widen with sqrt(monthsAhead) to create proper fan chart data. Month 6 has ~2.45x wider bands than month 1.

3. **sqrt(12) for annual uncertainty:** Annual standard deviation is monthly stdDev * sqrt(12) per statistical convention for independent monthly variations.

4. **Shared staleTime across hooks:** All forecast hooks use 5-minute staleTime to match analytics hooks pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **Plan 01 API signature changed:** The addConfidenceIntervals function signature was updated by Plan 01 to take volatility (CV) instead of baseStdDev. Adapted monthly route to use the new API.

2. **Drizzle result access pattern:** Used `result as unknown as Type[]` pattern (matching trends route) instead of `.rows` accessor.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Monthly and annual APIs ready for chart components
- Hooks available for Plan 03 (monthly forecast chart) and Plan 04 (annual fan chart)
- Calendar API (created in Plan 01) + monthly + annual = complete forecast API layer

---
*Phase: 17-spending-forecasting*
*Completed: 2026-02-07*
