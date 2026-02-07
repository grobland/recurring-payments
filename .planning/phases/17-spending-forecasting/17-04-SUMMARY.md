---
phase: 17-spending-forecasting
plan: 04
completed: 2026-02-07
duration: 8m
subsystem: forecast-ui
tags: [recharts, visualization, confidence-intervals, fan-chart, dashboard]

dependencies:
  requires:
    - 17-01 (types and utilities)
    - 17-02 (forecast APIs and hooks)
    - 17-03 (upcoming charges calendar)
  provides:
    - MonthlyForecastChart component
    - AnnualForecastFanChart component
    - /dashboard/forecasting page
    - Forecast navigation link
  affects:
    - None (phase complete)

tech-stack:
  patterns:
    - Recharts AreaChart with stacked areas for fan effect
    - Gradient fills for confidence band visualization
    - Custom tooltips with forecast and CI ranges
    - sqrt(time) scaling for uncertainty widening

key-files:
  created:
    - src/components/forecast/monthly-forecast-chart.tsx (264 lines)
    - src/components/forecast/annual-forecast-fan-chart.tsx (298 lines)
    - src/app/(dashboard)/dashboard/forecasting/page.tsx (48 lines)
  modified:
    - src/components/layout/app-sidebar.tsx (added Forecast nav link)

decisions:
  - Stacked area pattern for fan chart (lower95 base, then bands stacked up)
  - Gradient opacity for CI bands (95% at 15%, 80% at 35%)
  - Month labels formatted as "MMM 'YY" for chart x-axis
  - Three-section page layout (calendar, monthly, annual)
---

# Phase 17 Plan 04: Forecast Visualizations Summary

Forecast chart components with expanding confidence intervals and a unified dashboard page bringing all forecasting views together.

## What Was Built

### MonthlyForecastChart (264 lines)
Six-month spending projection chart using Recharts AreaChart:
- **Stacked confidence bands**: 95% band (lighter), 80% band (darker), forecast centerline
- **Gradient fills**: Using `linearGradient` with HSL colors matching theme
- **Custom tooltip**: Shows forecast value with 80% and 95% CI ranges
- **Month labels**: Formatted as "Mar '26" for readability
- **States**: Loading skeleton, error with message, empty state for no data
- **Props**: Configurable months (default 6) and title

### AnnualForecastFanChart (298 lines)
Twelve-month projection with classic fan chart visualization:
- **Stacked area approach**: Five bands stack from lower95 base upward
- **Fan effect**: Bands visually widen toward the right (future uncertainty)
- **Annual summary**: Header showing total annual forecast with full CI range
- **Custom legend**: Visual indicators for 80% CI, 95% CI, and forecast line
- **Gradient defs**: SVG linearGradient for smooth color transitions
- **Tooltip**: Shows month, forecast, and both confidence intervals

### Forecasting Dashboard Page (48 lines)
Unified page integrating all forecast components:
- **Three sections**: Upcoming Charges (calendar), Monthly Projections, Annual Forecast
- **Metadata**: Proper title and description for SEO
- **Clear hierarchy**: Section headers with consistent spacing
- **Imports**: All three forecast components from wave 1-3

### Navigation Integration
Added Forecast link to app sidebar:
- **Icon**: TrendingUp icon for consistency
- **Label**: "Forecast"
- **Path**: /dashboard/forecasting
- **Position**: Added in analytics section of navigation

## Key Implementation Details

### Stacked Area Pattern for Fan Chart
```tsx
// Transform data for stacking (bands from bottom to top)
const chartData = data.monthlyProjections.map(d => ({
  lower95: d.lower95,                    // Base level
  band95_lower: d.lower80 - d.lower95,   // Gap from 95 to 80 lower
  band80_lower: d.forecast - d.lower80,  // Gap from 80 lower to center
  band80_upper: d.upper80 - d.forecast,  // Gap from center to 80 upper
  band95_upper: d.upper95 - d.upper80,   // Gap from 80 to 95 upper
  // Original values preserved for tooltip
  _forecast: d.forecast,
  _lower80: d.lower80,
  // ...
}));
```

### Gradient Definitions
```tsx
<defs>
  <linearGradient id="band95" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
  </linearGradient>
  <linearGradient id="band80" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
  </linearGradient>
</defs>
```

### Custom Legend Component
```tsx
<div className="flex justify-center gap-4 text-xs mt-4">
  <div className="flex items-center gap-1">
    <div className="h-3 w-3 bg-primary/35 rounded" />
    <span>80% confidence</span>
  </div>
  <div className="flex items-center gap-1">
    <div className="h-3 w-3 bg-primary/15 rounded" />
    <span>95% confidence</span>
  </div>
  <div className="flex items-center gap-1">
    <div className="h-0.5 w-4 bg-primary" />
    <span>Forecast</span>
  </div>
</div>
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 649b910 | feat | Add monthly forecast chart with CI bands |
| 10020da | feat | Add annual forecast fan chart with expanding CI |
| ad405e9 | feat | Add forecasting dashboard page with nav link |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] TypeScript compiles without errors
- [x] Monthly chart shows 6-month projections with CI bands
- [x] Annual fan chart shows 12-month projection with fan-out effect
- [x] Confidence bands visually widen toward future months
- [x] Custom tooltips show forecast value with CI ranges
- [x] Page integrates all three forecast views
- [x] Navigation link added to sidebar
- [x] User verification: APPROVED - all visualizations work correctly

### Line Count Verification
- monthly-forecast-chart.tsx: 264 lines (>80 min)
- annual-forecast-fan-chart.tsx: 298 lines (>150 min)
- page.tsx: 48 lines (~50 expected)

## Phase 17 Complete

With this plan complete, Phase 17 (Spending Forecasting) is fully implemented:

| Plan | Feature | Status |
|------|---------|--------|
| 17-01 | Forecast types, utilities, volatility calculation | Complete |
| 17-02 | Forecast APIs (upcoming/monthly/annual) and hooks | Complete |
| 17-03 | Upcoming charges calendar UI | Complete |
| 17-04 | Monthly/annual charts, dashboard page | Complete |

All FCST requirements from RESEARCH.md are satisfied:
- FCST-01: Upcoming charges calendar with 30/60/90 day range
- FCST-02: Monthly spending projections with uncertainty
- FCST-03: Annual forecast with confidence intervals
- FCST-04: Fan chart visualization with expanding bands
