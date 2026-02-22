---
phase: 17-spending-forecasting
plan: 01
subsystem: api
tags: [simple-statistics, forecast, confidence-intervals, typescript]

# Dependency graph
requires:
  - phase: 13-analytics-infrastructure
    provides: Analytics foundation with currency conversion
provides:
  - Forecast TypeScript types for calendar, monthly, annual views
  - Volatility and confidence interval utility functions
  - Calendar API endpoint for upcoming charges
affects: [17-02 monthly forecast, 17-03 annual forecast, 17-04 forecast UI]

# Tech tracking
tech-stack:
  added: [simple-statistics@7.8.8]
  patterns: [sqrt-time uncertainty scaling, coefficient of variation volatility]

key-files:
  created:
    - src/types/forecast.ts
    - src/lib/utils/forecast.ts
    - src/app/api/forecast/calendar/route.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use coefficient of variation (CV) for volatility - dimensionless ratio enables scaling"
  - "Default 20% volatility for insufficient data (< 2 months) - conservative estimate"
  - "Cap volatility at 100% to prevent unreasonably wide confidence bands"
  - "Floor lower confidence bounds at zero - spending cannot be negative"

patterns-established:
  - "sqrt(time) scaling: uncertainty grows with sqrt(monthsAhead) for fan charts"
  - "Forecast utility structure: CONFIDENCE_LEVELS, calculateVolatility, addConfidenceIntervals"

# Metrics
duration: 7min
completed: 2026-02-07
---

# Phase 17 Plan 01: Forecast Foundation Summary

**simple-statistics 7.8.8 installed with TypeScript types, volatility utilities with sqrt-time scaling, and calendar API projecting upcoming subscription renewals**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-07T13:43:04Z
- **Completed:** 2026-02-07T13:50:23Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Installed simple-statistics 7.8.8 for statistical calculations
- Created comprehensive TypeScript interfaces for all forecast views (calendar, monthly, annual)
- Built volatility and confidence interval utilities with proper edge case handling
- Implemented calendar API that projects renewals for both monthly and yearly subscriptions

## Task Commits

Each task was committed atomically:

1. **Task 1: Install simple-statistics and create forecast types** - `2cd02ff` (feat)
2. **Task 2: Create forecast utility functions** - `fedad0f` (feat)
3. **Task 3: Create calendar forecast API endpoint** - `4e6030a` (feat)

## Files Created/Modified
- `src/types/forecast.ts` - TypeScript interfaces: UpcomingCharge, CalendarResponse, MonthlyForecast, AnnualForecastResponse
- `src/lib/utils/forecast.ts` - CONFIDENCE_LEVELS, calculateVolatility, scaleUncertainty, addConfidenceIntervals
- `src/app/api/forecast/calendar/route.ts` - GET /api/forecast/calendar?days=30|60|90
- `package.json` - Added simple-statistics dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Used coefficient of variation (stdDev/mean) for volatility - this dimensionless ratio works well for scaling confidence intervals proportionally to forecast amounts
- Default 20% volatility when < 2 data points or zero mean - conservative estimate for subscription spending
- Cap volatility at 100% (1.0) to prevent confidence intervals from becoming unreasonably wide
- Floor all lower confidence bounds at 0 since spending cannot be negative
- Calendar API returns original currency amounts in charges (not converted) - summary shows totals in original currencies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Forecast types ready for monthly and annual API endpoints (Plan 02)
- Utility functions can be imported by monthly/annual APIs for confidence calculations
- Calendar API pattern can be followed for other forecast endpoints

---
*Phase: 17-spending-forecasting*
*Completed: 2026-02-07*
