---
phase: 17-spending-forecasting
plan: 03
completed: 2026-02-07
duration: 4m
subsystem: forecast-ui
tags: [calendar, react, shadcn, date-fns]

dependencies:
  requires:
    - 17-01 (types and utilities)
    - 17-02 (forecast APIs and hooks)
  provides:
    - UpcomingChargesCalendar component
    - CalendarDaySelector component
  affects:
    - 17-04 (forecast dashboard page)

tech-stack:
  patterns:
    - shadcn Calendar with custom modifiers for charge indicators
    - useMemo for date grouping and lookup
    - Responsive grid layout (2-col desktop, stacked mobile)

key-files:
  created:
    - src/components/forecast/calendar-day-selector.tsx
    - src/components/forecast/upcoming-charges-calendar.tsx

decisions:
  - Dot indicator via CSS after pseudo-element for charge days
  - Category color dot next to subscription name in details panel
  - Date range restricted to today + days for calendar navigation
---

# Phase 17 Plan 03: Upcoming Charges Calendar Summary

Calendar view enabling users to see exactly when subscription renewals occur in the next 30/60/90 days.

## What Was Built

### CalendarDaySelector (62 lines)
A dropdown selector component following the period-selector pattern:
- Three options: 30, 60, or 90 days
- Uses shadcn Select component
- Clean callback interface for parent state management

### UpcomingChargesCalendar (251 lines)
Full calendar view with charge details panel:
- **Calendar with modifiers**: Days with charges show a dot indicator via CSS `after:` pseudo-element
- **Date grouping**: useMemo to group charges by date for O(1) lookup
- **Details panel**: Shows subscription name, category, color, and amount for selected date
- **Summary header**: Total upcoming charges, count of renewals, subscription count
- **Day selector**: Switches between 30/60/90 day ranges
- **State handling**: Loading (skeletons), error (retry button), empty (no charges message)
- **Responsive layout**: Two-column on desktop, stacked on mobile

## Key Implementation Details

### Calendar Modifiers Pattern
```tsx
modifiers={{
  hasCharge: datesWithCharges,
}}
modifiersClassNames={{
  hasCharge:
    "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1.5 after:rounded-full after:bg-primary",
}}
```

### Date Grouping for Performance
```tsx
const chargesByDate = useMemo(() => {
  if (!data?.charges) return {};
  return data.charges.reduce((acc, charge) => {
    const dateKey = format(parseISO(charge.date), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(charge);
    return acc;
  }, {} as Record<string, UpcomingCharge[]>);
}, [data?.charges]);
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| a54f21f | feat | Add calendar day range selector |
| fe29fd6 | feat | Add upcoming charges calendar component |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] TypeScript compiles without errors
- [x] Both components exist in src/components/forecast/
- [x] Calendar shows dot indicators on days with charges
- [x] Clicking day shows charge list
- [x] Day selector switches between 30/60/90 day ranges
- [x] calendar-day-selector.tsx: 62 lines (>30 min)
- [x] upcoming-charges-calendar.tsx: 251 lines (>100 min)

## Next Phase Readiness

Ready for 17-04 (Forecast Dashboard Page). All forecast UI components are now available:
- MonthlyForecastChart (from 17-04 wave 1)
- AnnualForecastFanChart (from 17-04 wave 1)
- UpcomingChargesCalendar (this plan)
- CalendarDaySelector (this plan)
