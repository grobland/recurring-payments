---
phase: 15
plan: 02
subsystem: dashboard
tags: [components, trends, spending, indicators]
dependency-graph:
  requires: [15-01]
  provides: [TrendIndicator-component, mom-display]
  affects: [dashboard-ux]
tech-stack:
  added: []
  patterns: [spending-indicator-colors]
key-files:
  created:
    - src/components/dashboard/trend-indicator.tsx
  modified:
    - src/components/dashboard/analytics-cards.tsx
decisions:
  - id: spending-color-scheme
    desc: Red for increases (bad), green for decreases (good) - inverted from typical
metrics:
  duration: 4min
  completed: 2026-02-06
---

# Phase 15 Plan 02: MoM Indicators Summary

TrendIndicator component displaying month-over-month spending change with direction arrows and color-coded percentages on dashboard cards.

## What Was Done

### Task 1: Create TrendIndicator Component

**File created:** `src/components/dashboard/trend-indicator.tsx`

**Component props:**
- `change: MoMChange` - Month-over-month change data from useTrends
- `currency: string` - Currency for formatting amounts
- `className?: string` - Optional container styling

**Visual behavior:**
- **Up (spending increased):** Red text + TrendingUp icon
- **Down (spending decreased):** Green text + TrendingDown icon
- **Neutral:** Muted text + Minus icon

**Display format:** `+$24.00 (+12.5%)` or `-$15.00 (-8.3%)`

### Task 2: Integrate TrendIndicator into Analytics Cards

**File modified:** `src/components/dashboard/analytics-cards.tsx`

**Changes:**
- Added `useTrends(12)` hook call for 12-month history
- Added `TrendIndicator` below monthly spending value
- Added skeleton for trend indicator during loading
- Graceful handling: indicator hidden when `momChange` is null (insufficient data)

## Technical Details

### Color Scheme Rationale

Per CONTEXT.md, spending context inverts typical indicator colors:
- **Red = up** because more spending is generally bad
- **Green = down** because less spending is generally good

This differs from stock/investment indicators where up = good.

### Display Logic

```typescript
// Direction determines color and icon
const colorClass = isIncrease
  ? "text-red-500"    // spending went UP (bad)
  : isDecrease
  ? "text-green-500"  // spending went DOWN (good)
  : "text-muted-foreground"; // neutral (within 0.5%)

const Icon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus;
```

### Sign Handling

```typescript
// Shows + for positive, nothing for negative (formatCurrency handles minus)
const sign = absolute > 0 ? "+" : absolute < 0 ? "" : "";
const percentSign = percentage > 0 ? "+" : percentage < 0 ? "" : "";
```

## Deviations from Plan

None - plan executed exactly as written.

## Key Links Verified

| From | To | Pattern |
|------|-----|---------|
| `analytics-cards.tsx` | `useTrends` | `useTrends(12)` |
| `trend-indicator.tsx` | `MoMChange` | `change: MoMChange` |
| `analytics-cards.tsx` | `TrendIndicator` | `<TrendIndicator change=` |

## Next Phase Readiness

**Ready for 15-03 (YoY Charts):**
- Trends data already fetched via useTrends in dashboard
- Pattern established for displaying trend indicators
- Colors and icons consistent for reuse

## Commits

| Hash | Message |
|------|---------|
| 1e6b87e | feat(15-02): create TrendIndicator component |
| 6d65ef7 | feat(15-02): integrate TrendIndicator into analytics cards |
