---
phase: 15
plan: 01
subsystem: analytics
tags: [api, trends, hooks, recharts]
dependency-graph:
  requires: [13-01, 13-02]
  provides: [trends-api, useTrends-hook]
  affects: [15-02, 15-03]
tech-stack:
  added: []
  patterns: [trends-api-pattern]
key-files:
  created:
    - src/app/api/analytics/trends/route.ts
  modified:
    - src/types/analytics.ts
    - src/lib/hooks/use-analytics.ts
decisions: []
metrics:
  duration: 3.5min
  completed: 2026-02-06
---

# Phase 15 Plan 01: Data Layer & Trend Calculations Summary

Historical spending API and React hook for month-over-month, year-over-year, and category trend visualization.

## What Was Done

### Task 1: Trends API Endpoint and Types

**Files created/modified:**
- `src/types/analytics.ts` - Added trend types
- `src/app/api/analytics/trends/route.ts` - New endpoint

**Types added:**
- `TrendsParams` - Query parameters (months: 1-24, default 12)
- `MonthlyTrend` - Month/year/amount/wasConverted for each data point
- `CategoryTrend` - Per-category spending over time with color
- `YearComparison` - Current vs previous year by month
- `MoMChange` - Month-over-month change with direction indicator
- `TrendsResponse` - Full API response structure

**API endpoint behavior:**
- `GET /api/analytics/trends?months=12`
- Queries `user_analytics_mv` materialized view
- Converts all amounts to user's display currency
- Tracks `wasConverted` boolean for currency indicator badges
- Calculates MoM direction: `up` (>0.5%), `down` (<-0.5%), `neutral`
- Cache-Control: private, max-age=300

### Task 2: useTrends Hook

**File modified:** `src/lib/hooks/use-analytics.ts`

**Added:**
- `analyticsKeys.trends(months)` key factory
- `fetchTrends()` async function
- `useTrends(months = 12)` hook with:
  - 5-minute stale time
  - Retry logic for transient errors
  - Exponential backoff

**Invalidation:** Uses `analyticsKeys.all` prefix, so `useInvalidateAnalytics()` automatically invalidates trends data.

## Technical Details

### SQL Query Pattern

```sql
SELECT
  category_id, category_name, category_color,
  date_trunc('month', month) as month_start,
  currency,
  sum(normalized_monthly_amount) as amount
FROM user_analytics_mv
WHERE user_id = $1
  AND month >= $2  -- start date
  AND month < $3   -- end date
GROUP BY category_id, category_name, category_color,
         date_trunc('month', month), currency
ORDER BY month_start
```

### Response Structure

```typescript
{
  displayCurrency: "USD",
  monthlyTrends: [
    { month: "Feb", year: 2025, amount: 234.56, wasConverted: false },
    // ... 12 months
  ],
  categoryTrends: [
    {
      categoryId: "uuid",
      categoryName: "Streaming",
      categoryColor: "#8b5cf6",
      data: [/* 12 MonthlyTrend items */]
    }
  ],
  yearComparison: [
    { month: "Jan", currentYear: 450.00, previousYear: 320.00 },
    // ... up to current month
  ],
  momChange: {
    current: 234.56,
    previous: 210.00,
    absolute: 24.56,
    percentage: 11.7,
    direction: "up"
  },
  rateTimestamp: "2026-02-06T14:00:00Z"
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Key Links Verified

| From | To | Pattern |
|------|-----|---------|
| `use-analytics.ts` | `/api/analytics/trends` | `fetch.*api/analytics/trends` |
| `trends/route.ts` | `user_analytics_mv` | `FROM user_analytics_mv` |

## Next Phase Readiness

**Ready for 15-02 (MoM Indicators):**
- `useTrends()` hook provides `momChange` with direction
- Types exported for component consumption

**Ready for 15-03 (YoY Charts):**
- `yearComparison` array ready for Recharts LineChart
- `categoryTrends` ready for multi-line chart

## Commits

| Hash | Message |
|------|---------|
| 48324b1 | feat(15-01): create trends API endpoint and types |
| cbfa76b | feat(15-01): add useTrends hook for historical data |
