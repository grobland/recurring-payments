# Phase 15: Spending Analytics & Trends - Research

**Researched:** 2026-02-06
**Domain:** Data visualization, time-series analytics, Recharts charting
**Confidence:** HIGH

## Summary

This phase extends the existing analytics foundation (Phase 13) with trend visualization: month-over-month indicators, year-over-year comparison charts, and per-category trend lines. The research confirms that Recharts 3.7.0 (already installed) fully supports all required chart types with minimal additional complexity.

The existing codebase has a solid foundation:
- `SpendingTrendChart` component using AreaChart with proper styling
- `CategoryPieChart` with category-based color mapping
- Analytics API with multi-currency conversion via `user_analytics_mv` materialized view
- TanStack Query hooks for data fetching with proper caching

Key findings indicate the phase can be implemented by extending existing patterns rather than introducing new libraries or significant architectural changes.

**Primary recommendation:** Extend the existing `SpendingTrendChart` to support LineChart variants (YoY dual-line, category multi-line) and enhance the analytics API to return historical comparison data.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.7.0 | Chart rendering | Already in project, React-native, composable |
| date-fns | 4.1.0 | Date manipulation | Already in project, tree-shakeable, immutable |
| TanStack Query | 5.x | Data fetching/caching | Already in project, handles loading/error states |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.NumberFormat | Built-in | Currency formatting | Already used via `formatCurrency` utility |
| Tailwind CSS v4 | 4.x | Chart container styling | Card/layout styling around charts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts LineChart | AreaChart | LineChart better for YoY comparison (cleaner dual-line), AreaChart better for single series |
| New analytics endpoint | Extend existing `/api/analytics` | Extending is simpler, single endpoint pattern |

**Installation:**
No new packages required. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── charts/
│       ├── spending-trend-chart.tsx      # Existing - enhance
│       ├── category-pie-chart.tsx        # Existing - no changes
│       ├── year-over-year-chart.tsx      # NEW - dual line comparison
│       └── category-trends-chart.tsx     # NEW - multi-line per category
├── lib/
│   └── hooks/
│       └── use-analytics.ts              # Existing - extend query params
└── app/
    └── api/
        └── analytics/
            ├── route.ts                  # Existing - extend response
            └── trends/
                └── route.ts              # NEW - historical trend data
```

### Pattern 1: Multi-Line Chart with Category Colors
**What:** Use LineChart with multiple `<Line>` components, each with category-assigned color
**When to use:** Category trends visualization (ANLYT-06)
**Example:**
```typescript
// Pattern from Recharts 3.x official docs
<LineChart data={trendData}>
  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
  <XAxis dataKey="month" />
  <YAxis tickFormatter={(v) => formatCurrency(v, currency)} />
  <Tooltip content={<CustomTooltip />} />
  <Legend />
  {categories.map((cat) => (
    <Line
      key={cat.id}
      type="monotone"
      dataKey={cat.slug}
      name={cat.name}
      stroke={cat.color}
      strokeWidth={2}
      dot={false}
      connectNulls
    />
  ))}
</LineChart>
```

### Pattern 2: Year-over-Year Dual Line Comparison
**What:** Two Line components on shared x-axis (months Jan-Dec), different years as dataKeys
**When to use:** YoY spending comparison (ANLYT-05)
**Example:**
```typescript
// Data shape for YoY comparison
const data = [
  { month: 'Jan', currentYear: 4500, previousYear: 3200 },
  { month: 'Feb', currentYear: 4800, previousYear: 3400 },
  // ... 12 months
];

<LineChart data={data}>
  <Line
    dataKey="currentYear"
    stroke="hsl(var(--primary))"
    strokeWidth={2}
    name={`${currentYear}`}
  />
  <Line
    dataKey="previousYear"
    stroke="hsl(var(--muted-foreground))"
    strokeWidth={2}
    strokeDasharray="5 5"
    name={`${currentYear - 1}`}
  />
</LineChart>
```

### Pattern 3: Custom Tooltip with Multi-Currency Support
**What:** Custom tooltip component showing original + converted amounts
**When to use:** When subscription has different currency than display currency
**Example:**
```typescript
// Recharts 3.x custom tooltip pattern
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <span>{formatCurrency(entry.value, displayCurrency)}</span>
          {entry.payload.wasConverted && (
            <span className="text-xs text-muted-foreground">
              (from {entry.payload.originalCurrency})
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Pattern 4: Month-over-Month Calculation
**What:** Calculate percentage change between current and previous period
**When to use:** Trend indicators (ANLYT-04)
**Example:**
```typescript
function calculateMoMChange(current: number, previous: number): {
  absolute: number;
  percentage: number;
  direction: 'up' | 'down' | 'neutral';
} {
  if (previous === 0) {
    return {
      absolute: current,
      percentage: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'neutral'
    };
  }

  const absolute = current - previous;
  const percentage = ((current - previous) / previous) * 100;
  const direction = percentage > 0.5 ? 'up' : percentage < -0.5 ? 'down' : 'neutral';

  return { absolute, percentage, direction };
}
```

### Anti-Patterns to Avoid
- **Wrapping Recharts in heavy abstractions:** Recharts 3.x is designed for direct composition, not wrapping
- **Using CategoricalChartState:** Removed in Recharts 3.0, use hooks instead
- **Setting `activeIndex` prop:** Removed in Recharts 3.0
- **Relying on internal props in custom components:** Many internal props removed in 3.0
- **Z-index hacking:** Use JSX render order instead (Tooltip below Legend)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range iteration | Manual loops | `date-fns/eachMonthOfInterval` | Handles edge cases, DST |
| Month boundaries | Manual date math | `date-fns/startOfMonth`, `endOfMonth` | Timezone-safe |
| Currency formatting | String concatenation | `Intl.NumberFormat` via `formatCurrency` | Locale-aware, proper symbols |
| Responsive charts | Manual resize listeners | `ResponsiveContainer` | Built-in, performant |
| Trend percentage | Custom formula | Standard MoM formula | `((curr - prev) / prev) * 100` |
| Period selection | Custom state | Shared URL params / React state | Already exists in dashboard |

**Key insight:** The existing analytics infrastructure handles the hard parts (multi-currency conversion, materialized view for performance). New code should focus on presentation, not recalculating aggregations.

## Common Pitfalls

### Pitfall 1: Recharts 3.x Breaking Changes
**What goes wrong:** Code from Recharts 2.x tutorials/examples fails silently or throws errors
**Why it happens:** Recharts 3.0 removed many internal props and changed state management
**How to avoid:** Use only documented public APIs; avoid `activeIndex`, `points`, `payload` props
**Warning signs:** TypeScript errors about missing props, charts not rendering

### Pitfall 2: Empty Chart States
**What goes wrong:** Charts render empty with no user feedback when data is insufficient
**Why it happens:** Recharts renders nothing for empty data arrays without explicit handling
**How to avoid:** Check data length before rendering chart, show "More data needed" message
**Warning signs:** Blank chart areas, confused users

### Pitfall 3: Currency Conversion Timing
**What goes wrong:** Historical spending shown with current FX rates instead of transaction-time rates
**Why it happens:** Using single cached rate for all historical data
**How to avoid:** Store converted amounts at transaction time OR use rate from transaction date
**Warning signs:** Historical totals changing when FX rates update

### Pitfall 4: Period Selector State Management
**What goes wrong:** Period selector only updates cards, not charts (or vice versa)
**Why it happens:** Duplicated state instead of shared state
**How to avoid:** Use single source of truth (URL params or lifted state)
**Warning signs:** Inconsistent UI between dashboard sections

### Pitfall 5: Multi-Line Chart Legend Overflow
**What goes wrong:** Legend gets too tall when showing all categories
**Why it happens:** Default Legend renders vertically
**How to avoid:** Use horizontal layout with wrapping, or collapsible legend
**Warning signs:** Legend taller than chart, overlapping elements

### Pitfall 6: Trend Direction Color Confusion
**What goes wrong:** Users interpret green increase as good (it's not for spending)
**Why it happens:** Default association of green=good, red=bad
**How to avoid:** Per CONTEXT.md: Red for increases (bad), green for decreases (good)
**Warning signs:** User feedback about confusing colors

## Code Examples

Verified patterns from official sources:

### Recharts 3.x LineChart with Multiple Lines
```typescript
// Source: Recharts 3.x official API + migration guide
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface YoYData {
  month: string;
  currentYear: number;
  previousYear: number;
}

export function YearOverYearChart({
  data,
  currentYear,
  currency
}: {
  data: YoYData[];
  currentYear: number;
  currency: string;
}) {
  const formatCurrencyTick = (value: number) =>
    formatCurrency(value, currency);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCurrencyTick}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
          formatter={(value) => [formatCurrency(Number(value), currency)]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="currentYear"
          name={String(currentYear)}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="previousYear"
          name={String(currentYear - 1)}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Trend Indicator Component
```typescript
// Pattern for MoM change display per CONTEXT.md decisions
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  absolute: number;
  percentage: number;
  currency: string;
}

export function TrendIndicator({ absolute, percentage, currency }: TrendIndicatorProps) {
  const isIncrease = percentage > 0.5;
  const isDecrease = percentage < -0.5;
  const isNeutral = !isIncrease && !isDecrease;

  // Per CONTEXT.md: Red for increases (bad), green for decreases (good)
  const colorClass = isIncrease
    ? "text-red-500"
    : isDecrease
    ? "text-green-500"
    : "text-muted-foreground";

  const Icon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus;

  const sign = absolute > 0 ? "+" : "";

  return (
    <div className={cn("flex items-center gap-1", colorClass)}>
      <Icon className="h-4 w-4" />
      <span>
        {sign}{formatCurrency(absolute, currency)} ({sign}{percentage.toFixed(1)}%)
      </span>
    </div>
  );
}
```

### Empty State / Insufficient Data Pattern
```typescript
// Pattern for graceful degradation
function ChartEmptyState({
  message = "More data needed for trends",
  minDataPoints = 2,
  actualDataPoints = 0,
}: {
  message?: string;
  minDataPoints?: number;
  actualDataPoints?: number;
}) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
      <div className="text-center">
        <p className="text-muted-foreground">{message}</p>
        {actualDataPoints > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {actualDataPoints} of {minDataPoints} months available
          </p>
        )}
      </div>
    </div>
  );
}

// Usage in chart component
if (data.length < 2) {
  return <ChartEmptyState actualDataPoints={data.length} />;
}
```

### Data Transformation for Category Trends
```typescript
// Transform API data to Recharts multi-line format
import { eachMonthOfInterval, format, subMonths } from "date-fns";

interface CategoryTrendData {
  month: string;
  [categorySlug: string]: string | number; // month is string, others are numbers
}

function transformToCategoryTrends(
  apiData: AnalyticsResponse[],
  categories: { id: string; slug: string; name: string }[],
  months: number = 12
): CategoryTrendData[] {
  const now = new Date();
  const startDate = subMonths(now, months - 1);

  const monthRange = eachMonthOfInterval({ start: startDate, end: now });

  return monthRange.map((monthDate) => {
    const monthKey = format(monthDate, "yyyy-MM");
    const displayMonth = format(monthDate, "MMM");

    const dataPoint: CategoryTrendData = { month: displayMonth };

    // Find matching data for each category
    categories.forEach((cat) => {
      const monthData = apiData.find(
        (d) => format(new Date(d.month), "yyyy-MM") === monthKey
      );
      const categoryData = monthData?.categories.find((c) => c.id === cat.id);
      dataPoint[cat.slug] = categoryData?.amount ?? 0;
    });

    return dataPoint;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts internal props | Public hooks API | Recharts 3.0 (2024) | Must use `useActiveTooltipLabel` etc. |
| `activeIndex` prop | Controlled via hooks | Recharts 3.0 (2024) | Remove prop usage |
| `CategoricalChartState` | Removed entirely | Recharts 3.0 (2024) | Use hooks for state |
| Z-index props | JSX render order | Recharts 3.0 (2024) | Order elements in JSX |
| `blendStroke` on Pie | `stroke="none"` | Recharts 3.0 (2024) | Update if using Pie charts |

**Deprecated/outdated:**
- `alwaysShow` on Reference components: Removed
- `isFront` on reference elements: Does nothing since pre-2.0
- Wrapping custom components: No longer needed in 3.x

## Open Questions

Things that couldn't be fully resolved:

1. **Historical FX rates storage**
   - What we know: Current implementation uses cached current rates
   - What's unclear: Whether to store converted amounts at import time or fetch historical rates
   - Recommendation: Store converted amounts at transaction time (simpler, matches CONTEXT.md "transaction-time rates")

2. **Performance with many categories**
   - What we know: CONTEXT.md says "Show all categories on chart"
   - What's unclear: Performance impact if user has 20+ categories
   - Recommendation: Test with realistic data; may need lazy rendering or virtualization

3. **Materialized view refresh for trends**
   - What we know: Current MV refreshes every 15 mins, aggregates by month
   - What's unclear: Whether existing MV supports all trend queries or needs extension
   - Recommendation: Verify MV query can provide historical month-by-month data

## Sources

### Primary (HIGH confidence)
- Recharts 3.x official API docs - LineChart, Line, Tooltip components
- [Recharts 3.0 Migration Guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) - Breaking changes verified
- Existing codebase - `spending-trend-chart.tsx`, `use-analytics.ts`, `analytics/route.ts`
- package.json - Confirmed Recharts 3.7.0, date-fns 4.1.0

### Secondary (MEDIUM confidence)
- [Recharts GitHub Issues/Discussions](https://github.com/recharts/recharts) - Multi-line patterns
- [Month-over-Month calculation guides](https://adapty.io/blog/month-over-month-growth/) - Standard formula
- [Primer degraded experiences](https://primer.style/ui-patterns/degraded-experiences/) - Empty state UX

### Tertiary (LOW confidence)
- shadcn/ui chart patterns - Referenced but docs not fully accessible

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, versions verified
- Architecture: HIGH - Patterns derived from existing codebase + official Recharts 3.x docs
- Pitfalls: HIGH - Recharts 3.0 breaking changes verified from migration guide

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable libraries)
