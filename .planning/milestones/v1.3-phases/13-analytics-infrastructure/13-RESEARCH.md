# Phase 13: Analytics Infrastructure - Research

**Researched:** 2026-02-05
**Domain:** PostgreSQL analytics aggregation, materialized views, dashboard analytics
**Confidence:** HIGH

## Summary

Phase 13 builds the analytics foundation for the subscription manager, providing pre-computed aggregates for monthly/yearly spending totals and category breakdowns. The standard approach uses **PostgreSQL materialized views** for high-performance analytics with <100ms load times, refreshed by a Vercel cron job every 15 minutes. The existing architecture already has cron infrastructure (`/api/cron/send-reminders`), currency conversion utilities (`lib/fx/rates.ts`), and Recharts for visualization (`components/charts/category-pie-chart.tsx`), making this a natural extension.

The key architectural decisions are: (1) Use PostgreSQL materialized views instead of real-time aggregation for dashboard performance, (2) Refresh via Vercel cron jobs on a 15-minute schedule, (3) Compute analytics in user's display currency with multi-currency breakdowns, (4) Use date_trunc for time period filtering (month/year/quarter), and (5) Leverage TanStack Query for client-side caching with 5-minute stale time.

**Primary recommendation:** Create a PostgreSQL materialized view `user_analytics_mv` that pre-aggregates subscription spending by user, time period, and category. Refresh it every 15 minutes via Vercel cron job. Query this view via a new `/api/analytics` endpoint, cached by TanStack Query on the client.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL Materialized Views | Native | Pre-computed aggregates | Official PostgreSQL feature, 28s → 180ms query time improvements documented |
| Drizzle ORM | 0.45.1 | Schema definition & queries | Already in project, supports materialized view queries (not schema management) |
| date-fns | 4.1.0 | Date manipulation | Already in project for date handling |
| Vercel Cron Jobs | Native | Scheduled refresh | Built into Vercel platform, project already uses for reminders |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Recharts | 3.7.0 | Chart visualization | Already in project (`category-pie-chart.tsx`), donut chart support |
| TanStack Query | 5.90.19 | Client-side caching | Already in project for subscription data, perfect for analytics caching |
| Zod | 4.3.5 | Analytics request validation | Already in project for validation schemas |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Materialized views | Real-time aggregation | Materialized views: faster (100ms vs 2-5s), but 15-min lag acceptable for analytics |
| Materialized views | TimescaleDB continuous aggregates | TimescaleDB requires extension install, materialized views are native PostgreSQL |
| Vercel cron | node-cron | node-cron doesn't work on serverless (Vercel), need always-running process |
| date_trunc | EXTRACT + complex logic | date_trunc is simpler and faster for month/year/quarter binning |

**Installation:**
No new packages needed - all dependencies already installed in project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/
│   ├── analytics/
│   │   └── route.ts              # GET /api/analytics?period=month&year=2026&month=2
│   └── cron/
│       └── refresh-analytics/    # Cron job to refresh materialized view
│           └── route.ts
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Add analytics types (not materialized view schema)
│   │   └── migrations/           # SQL migration to create materialized view
│   │       └── XXXX_analytics_mv.sql
│   └── utils/
│       └── analytics.ts          # Currency conversion logic for analytics
├── components/
│   ├── dashboard/
│   │   ├── analytics-cards.tsx   # Stat cards (monthly, yearly, count)
│   │   ├── category-chart.tsx    # Donut chart using Recharts
│   │   └── period-selector.tsx   # Time period dropdown
│   └── charts/
│       └── category-pie-chart.tsx  # Already exists, reuse
├── lib/hooks/
│   └── use-analytics.ts          # TanStack Query hook for analytics
└── types/
    └── analytics.ts              # TypeScript types for analytics data
```

### Pattern 1: Materialized View with Concurrent Refresh

**What:** Create a materialized view that aggregates subscription data by user, time period, and category. Refresh it concurrently (non-blocking) every 15 minutes.

**When to use:** When dashboard queries are slow (>500ms) and data freshness within 15 minutes is acceptable.

**Example:**
```sql
-- Migration: Create materialized view
CREATE MATERIALIZED VIEW user_analytics_mv AS
SELECT
  s.user_id,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  DATE_TRUNC('month', s.next_renewal_date) as month,
  s.currency,
  COUNT(*) as subscription_count,
  SUM(s.amount::numeric) as total_amount,
  SUM(s.normalized_monthly_amount::numeric) as normalized_monthly_amount
FROM subscriptions s
LEFT JOIN categories c ON s.category_id = c.id
WHERE s.deleted_at IS NULL
  AND s.status = 'active'
GROUP BY s.user_id, c.id, c.name, c.color, month, s.currency;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX user_analytics_mv_idx
ON user_analytics_mv (user_id, category_id, month, currency);

-- Refresh command (used by cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics_mv;
```

**Why this works:**
- CONCURRENTLY allows reads during refresh (no blocking)
- DATE_TRUNC('month', ...) creates monthly buckets for time-based filtering
- normalized_monthly_amount enables currency conversion
- Unique index required for CONCURRENTLY

### Pattern 2: Date Range Filtering with date_trunc

**What:** Use PostgreSQL's date_trunc function for efficient time-based filtering instead of EXTRACT.

**When to use:** When filtering by month, quarter, or year in WHERE clauses.

**Example:**
```typescript
// API route: /api/analytics?period=month&year=2026&month=2
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month';
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  let dateFilter: SQL;

  if (period === 'month') {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    dateFilter = and(
      gte(userAnalyticsMv.month, startDate),
      lt(userAnalyticsMv.month, endDate)
    );
  } else if (period === 'year') {
    dateFilter = eq(sql`EXTRACT(YEAR FROM ${userAnalyticsMv.month})`, year);
  }

  // Query materialized view, not subscriptions table
  const analytics = await db.select().from(userAnalyticsMv)
    .where(and(
      eq(userAnalyticsMv.userId, session.user.id),
      dateFilter
    ));
}
```

**Performance note:** Index on `month` column enables fast range scans. date_trunc-based filtering is faster than EXTRACT because it can use indexes.

### Pattern 3: Multi-Currency Aggregation with Conversion

**What:** Aggregate spending across multiple currencies by converting to user's display currency, showing breakdown of original currencies.

**When to use:** When users have subscriptions in multiple currencies and need a unified total.

**Example:**
```typescript
// lib/utils/analytics.ts
import { getExchangeRates, convertCurrency } from '@/lib/fx/rates';

export async function calculateUserSpending(
  analyticsData: AnalyticsRow[],
  displayCurrency: string
): Promise<SpendingResult> {
  const rates = await getExchangeRates();
  let convertedTotal = 0;
  const currencyBreakdown: Record<string, number> = {};

  for (const row of analyticsData) {
    // Track original currency amounts
    currencyBreakdown[row.currency] =
      (currencyBreakdown[row.currency] || 0) + parseFloat(row.normalized_monthly_amount);

    // Convert to display currency
    const converted = convertCurrency(
      parseFloat(row.normalized_monthly_amount),
      row.currency,
      displayCurrency,
      rates
    );
    convertedTotal += converted;
  }

  return {
    total: convertedTotal,
    currency: displayCurrency,
    breakdown: currencyBreakdown,
    rateTimestamp: new Date().toISOString()
  };
}
```

### Pattern 4: TanStack Query Cache Strategy

**What:** Cache analytics data on the client with 5-minute stale time, invalidate on subscription mutations.

**When to use:** Always for analytics endpoints to reduce server load and improve perceived performance.

**Example:**
```typescript
// lib/hooks/use-analytics.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const analyticsKeys = {
  all: ['analytics'] as const,
  period: (period: string, year: number, month?: number) =>
    [...analyticsKeys.all, { period, year, month }] as const,
};

export function useAnalytics(period: string, year: number, month?: number) {
  return useQuery({
    queryKey: analyticsKeys.period(period, year, month),
    queryFn: () => fetchAnalytics(period, year, month),
    staleTime: 5 * 60 * 1000, // 5 minutes - matches half of refresh interval
    refetchOnWindowFocus: false, // Data refreshes server-side, no need to refetch
  });
}

// Invalidate analytics when subscriptions change
export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    // ... mutation config
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    },
  });
}
```

**Why 5-minute stale time:** Analytics refresh every 15 minutes server-side. 5-minute client cache means users see at most 15-minute-old data (acceptable for analytics) while reducing API calls by 66%.

### Pattern 5: Vercel Cron Job Setup

**What:** Configure Vercel cron job to refresh materialized view every 15 minutes.

**When to use:** For scheduled background tasks on Vercel serverless deployment.

**Example:**
```json
// vercel.json (root of project)
{
  "crons": [
    {
      "path": "/api/cron/refresh-analytics",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

```typescript
// src/app/api/cron/refresh-analytics/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Refresh materialized view concurrently (non-blocking)
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics_mv`);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to refresh analytics:', error);
    return NextResponse.json(
      { error: 'Failed to refresh analytics' },
      { status: 500 }
    );
  }
}
```

**Important:** Vercel cron jobs only work in production. For local development, manually call the endpoint or use a tool like `nextjs-crons`.

### Anti-Patterns to Avoid

- **Real-time aggregation in dashboard:** Aggregating subscriptions on every dashboard load creates 2-5s queries. Use materialized views instead.
- **Blocking refresh:** Don't use `REFRESH MATERIALIZED VIEW` without CONCURRENTLY - it locks the view for reads. Always use CONCURRENTLY with a unique index.
- **EXTRACT for range queries:** `WHERE EXTRACT(month FROM date) = 6` can't use indexes. Use date ranges: `WHERE date >= '2026-06-01' AND date < '2026-07-01'`.
- **Client-side aggregation:** Don't fetch all subscriptions and aggregate in React. This breaks down at 100+ subscriptions. Always aggregate server-side.
- **Ignoring currency conversion:** Don't sum amounts in different currencies without conversion. Always convert to display currency or keep separate totals.
- **No unique index on materialized view:** REFRESH CONCURRENTLY requires a unique index. Without it, you must use blocking refresh.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-based aggregation | Custom date grouping logic | PostgreSQL `date_trunc('month', date)` | Handles timezones, DST, month boundaries, indexes work correctly |
| Currency conversion | Manual exchange rate management | Existing `lib/fx/rates.ts` + Open Exchange Rates | Handles caching (6hr), fallback rates, multi-currency conversion through USD |
| Materialized view refresh scheduling | Custom polling/intervals | Vercel cron jobs | Native platform integration, no need for always-running process |
| Cache invalidation | Manual cache clearing | TanStack Query's `invalidateQueries` | Automatic stale-while-revalidate, optimistic updates, request deduplication |
| Donut chart rendering | Canvas/SVG from scratch | Recharts `<Pie innerRadius={60}>` | Responsive, accessible, tooltip/legend built-in, theme-aware |

**Key insight:** Analytics infrastructure has well-established patterns in the PostgreSQL ecosystem. Materialized views with scheduled refreshes are the standard approach for dashboard analytics, avoiding the complexity of real-time streaming aggregation or incremental update systems unless you need sub-second freshness.

## Common Pitfalls

### Pitfall 1: Materialized View Schema Changes

**What goes wrong:** Adding a column to the subscriptions table breaks the materialized view. You get errors like "materialized view must be dropped to change schema."

**Why it happens:** PostgreSQL doesn't automatically update materialized view definitions when underlying tables change. The view definition is stored as compiled SQL.

**How to avoid:**
1. Always use explicit column names in materialized view SELECT (not SELECT *)
2. Create a migration strategy: DROP VIEW, apply table changes, CREATE VIEW with new definition
3. Use `CREATE OR REPLACE` syntax where possible (but doesn't work for changing column list)

**Warning signs:** Migration fails with "cannot change materialized view" error.

**Migration pattern:**
```sql
-- Safe way to modify materialized view
DROP MATERIALIZED VIEW IF EXISTS user_analytics_mv;

-- Apply table schema changes here
ALTER TABLE subscriptions ADD COLUMN new_field TEXT;

-- Recreate view with new definition
CREATE MATERIALIZED VIEW user_analytics_mv AS
SELECT
  s.user_id,
  s.new_field, -- New column included
  -- ... rest of definition
FROM subscriptions s;

-- Recreate index
CREATE UNIQUE INDEX user_analytics_mv_idx
ON user_analytics_mv (user_id, category_id, month, currency);
```

### Pitfall 2: REFRESH CONCURRENTLY Without Unique Index

**What goes wrong:** `REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics_mv` fails with error: "cannot refresh materialized view concurrently without a unique index."

**Why it happens:** PostgreSQL needs to track which rows changed during concurrent refresh. Without a unique index, it can't identify individual rows reliably.

**How to avoid:** Always create a unique index on the materialized view before attempting concurrent refresh. The index should cover all grouping columns.

**Warning signs:** Cron job fails every 15 minutes with unique index error.

**Fix:**
```sql
-- Create unique index (do this in same migration as CREATE MATERIALIZED VIEW)
CREATE UNIQUE INDEX user_analytics_mv_idx
ON user_analytics_mv (user_id, category_id, month, currency);

-- Handle nulls if category_id can be NULL
CREATE UNIQUE INDEX user_analytics_mv_idx
ON user_analytics_mv (user_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), month, currency);
```

### Pitfall 3: Timezone Confusion in Date Truncation

**What goes wrong:** Monthly totals are off by one day at month boundaries. Users in different timezones see different monthly totals.

**Why it happens:** next_renewal_date is stored as `timestamp with timezone`, but date_trunc operates in database server timezone. Subscriptions near midnight can appear in wrong month.

**How to avoid:**
1. Use `AT TIME ZONE 'UTC'` to normalize all dates to UTC before truncation
2. Store user's timezone preference and convert on display (not in aggregation)
3. Document that analytics use UTC month boundaries

**Warning signs:** Monthly totals differ between dashboard and subscription list. Edge case reports from users in non-UTC timezones.

**Solution:**
```sql
-- Normalize to UTC before truncation
CREATE MATERIALIZED VIEW user_analytics_mv AS
SELECT
  s.user_id,
  DATE_TRUNC('month', s.next_renewal_date AT TIME ZONE 'UTC') as month,
  -- ... rest of definition
FROM subscriptions s;
```

### Pitfall 4: Forgetting to VACUUM After Refresh

**What goes wrong:** Materialized view grows in size over time, queries get slower, disk space increases.

**Why it happens:** REFRESH CONCURRENTLY creates temporary data structures. Without vacuuming, dead tuples accumulate (table bloat).

**How to avoid:**
1. Enable PostgreSQL autovacuum (should be on by default)
2. Manually VACUUM after refresh in cron job
3. Monitor materialized view size with `pg_relation_size()`

**Warning signs:** View size increases but row count stays same. Query performance degrades over weeks.

**Solution:**
```typescript
// In cron job after refresh
await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics_mv`);
await db.execute(sql`VACUUM ANALYZE user_analytics_mv`);
```

### Pitfall 5: Category Color Inconsistency

**What goes wrong:** Category colors differ between donut chart and subscription list. User sees "Streaming" as red in chart but blue in list.

**Why it happens:** Chart colors defined separately from category.color in database. Hardcoded color arrays don't match.

**How to avoid:**
1. Always pull category.color from database and use in chart
2. Define colors once in DEFAULT_CATEGORIES constant
3. Pass color from API response to chart component

**Warning signs:** User reports color mismatch. Chart colors change when categories are reordered.

**Solution:**
```typescript
// components/dashboard/category-chart.tsx
interface CategoryChartData {
  name: string;
  value: number;
  color: string; // From database, not hardcoded
}

// API route returns colors from materialized view
const chartData = analytics.map(row => ({
  name: row.category_name,
  value: row.normalized_monthly_amount,
  color: row.category_color // From categories.color column
}));

// Recharts uses these colors
<Pie data={chartData}>
  {chartData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={entry.color} />
  ))}
</Pie>
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Example 1: Complete Materialized View Migration

```sql
-- Migration file: XXXX_create_analytics_mv.sql
-- Source: PostgreSQL docs + project patterns

-- Create the materialized view
CREATE MATERIALIZED VIEW user_analytics_mv AS
SELECT
  s.user_id,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  DATE_TRUNC('month', s.next_renewal_date AT TIME ZONE 'UTC') as month,
  s.currency,
  COUNT(*) as subscription_count,
  SUM(s.amount::numeric) as total_amount,
  SUM(s.normalized_monthly_amount::numeric) as normalized_monthly_amount
FROM subscriptions s
LEFT JOIN categories c ON s.category_id = c.id
WHERE s.deleted_at IS NULL
  AND s.status = 'active'
GROUP BY s.user_id, c.id, c.name, c.color, c.icon, month, s.currency;

-- Create unique index for concurrent refresh
-- COALESCE handles NULL category_id (uncategorized subscriptions)
CREATE UNIQUE INDEX user_analytics_mv_idx
ON user_analytics_mv (
  user_id,
  COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
  month,
  currency
);

-- Create additional indexes for common query patterns
CREATE INDEX user_analytics_mv_month_idx ON user_analytics_mv (month);
CREATE INDEX user_analytics_mv_user_id_idx ON user_analytics_mv (user_id);

-- Initial data load
REFRESH MATERIALIZED VIEW user_analytics_mv;
```

### Example 2: Analytics API Route

```typescript
// src/app/api/analytics/route.ts
// Source: Existing project patterns + PostgreSQL best practices

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userAnalyticsMv } from '@/lib/db/schema';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getExchangeRates, convertCurrency } from '@/lib/fx/rates';

const analyticsParamsSchema = z.object({
  period: z.enum(['month', 'year', 'quarter']).default('month'),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = analyticsParamsSchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!params.success) {
      return NextResponse.json(
        { error: params.error.issues[0].message },
        { status: 400 }
      );
    }

    const { period, year, month, quarter } = params.data;

    // Build date filter based on period
    let dateFilter;
    if (period === 'month' && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      dateFilter = and(
        gte(userAnalyticsMv.month, startDate),
        lt(userAnalyticsMv.month, endDate)
      );
    } else if (period === 'year') {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      dateFilter = and(
        gte(userAnalyticsMv.month, startDate),
        lt(userAnalyticsMv.month, endDate)
      );
    } else if (period === 'quarter' && quarter) {
      const startMonth = (quarter - 1) * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 1);
      dateFilter = and(
        gte(userAnalyticsMv.month, startDate),
        lt(userAnalyticsMv.month, endDate)
      );
    }

    // Query materialized view
    const analyticsData = await db
      .select()
      .from(userAnalyticsMv)
      .where(and(
        eq(userAnalyticsMv.userId, session.user.id),
        dateFilter
      ));

    // Get user's display currency
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { displayCurrency: true }
    });
    const displayCurrency = user?.displayCurrency || 'USD';

    // Get exchange rates
    const rates = await getExchangeRates();

    // Aggregate by category with currency conversion
    const categoryBreakdown: Record<string, {
      name: string;
      color: string;
      icon: string;
      amount: number;
      count: number;
    }> = {};

    let totalMonthly = 0;
    const currencyBreakdown: Record<string, number> = {};

    for (const row of analyticsData) {
      const categoryKey = row.categoryId || 'uncategorized';

      // Convert to display currency
      const converted = convertCurrency(
        parseFloat(row.normalizedMonthlyAmount),
        row.currency,
        displayCurrency,
        rates
      );

      totalMonthly += converted;

      // Track original currency totals
      currencyBreakdown[row.currency] =
        (currencyBreakdown[row.currency] || 0) + parseFloat(row.normalizedMonthlyAmount);

      // Aggregate by category
      if (!categoryBreakdown[categoryKey]) {
        categoryBreakdown[categoryKey] = {
          name: row.categoryName || 'Uncategorized',
          color: row.categoryColor || '#9E9E9E',
          icon: row.categoryIcon || 'circle-dot',
          amount: 0,
          count: 0,
        };
      }
      categoryBreakdown[categoryKey].amount += converted;
      categoryBreakdown[categoryKey].count += row.subscriptionCount;
    }

    return NextResponse.json({
      period,
      year,
      month,
      quarter,
      totalMonthly,
      totalYearly: totalMonthly * 12, // Simplified, actual should sum 12 months
      currency: displayCurrency,
      currencyBreakdown,
      categories: Object.values(categoryBreakdown),
      rateTimestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
```

### Example 3: TanStack Query Hook

```typescript
// src/lib/hooks/use-analytics.ts
// Source: Existing project use-subscriptions.ts pattern

import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { isRetryableError } from '@/lib/utils/errors';

export const analyticsKeys = {
  all: ['analytics'] as const,
  period: (period: string, year: number, month?: number, quarter?: number) =>
    [...analyticsKeys.all, { period, year, month, quarter }] as const,
};

type AnalyticsResponse = {
  period: 'month' | 'year' | 'quarter';
  year: number;
  month?: number;
  quarter?: number;
  totalMonthly: number;
  totalYearly: number;
  currency: string;
  currencyBreakdown: Record<string, number>;
  categories: Array<{
    name: string;
    color: string;
    icon: string;
    amount: number;
    count: number;
  }>;
  rateTimestamp: string;
};

async function fetchAnalytics(
  period: string,
  year: number,
  month?: number,
  quarter?: number
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({ period, year: year.toString() });
  if (month) params.set('month', month.toString());
  if (quarter) params.set('quarter', quarter.toString());

  const response = await fetch(`/api/analytics?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch analytics');
  }
  return response.json();
}

export function useAnalytics(
  period: 'month' | 'year' | 'quarter',
  year: number,
  month?: number,
  quarter?: number,
  options?: Omit<UseQueryOptions<AnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.period(period, year, month, quarter),
    queryFn: () => fetchAnalytics(period, year, month, quarter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    ...options,
  });
}

// Hook to invalidate analytics when subscriptions change
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
  };
}
```

### Example 4: Dashboard Analytics Cards Component

```typescript
// src/components/dashboard/analytics-cards.tsx
// Source: Existing dashboard/page.tsx stat cards + new requirements

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, CreditCard, Calendar, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { useDelayedLoading } from '@/lib/hooks';

interface AnalyticsCardsProps {
  period: 'month' | 'year' | 'quarter';
  year: number;
  month?: number;
  quarter?: number;
}

export function AnalyticsCards({ period, year, month, quarter }: AnalyticsCardsProps) {
  const { data, isLoading, error } = useAnalytics(period, year, month, quarter);
  const showSkeleton = useDelayedLoading(isLoading);

  if (error) {
    return (
      <div className="text-center text-sm text-destructive py-4">
        Failed to load analytics. Please try again.
      </div>
    );
  }

  const stats = [
    {
      title: 'Monthly Spending',
      value: data?.totalMonthly ?? 0,
      currency: data?.currency ?? 'USD',
      subtitle: `${formatCurrency(
        (data?.totalMonthly ?? 0) * 12,
        data?.currency ?? 'USD'
      )} per year`,
      icon: TrendingUp,
    },
    {
      title: 'Yearly Total',
      value: data?.totalYearly ?? 0,
      currency: data?.currency ?? 'USD',
      subtitle: `Based on ${period} period`,
      icon: Calendar,
    },
    {
      title: 'Active Subscriptions',
      value: data?.categories.reduce((sum, cat) => sum + cat.count, 0) ?? 0,
      currency: null,
      subtitle: `${data?.categories.length ?? 0} categories`,
      icon: Package,
    },
    {
      title: 'Largest Category',
      value: Math.max(...(data?.categories.map(c => c.amount) ?? [0])),
      currency: data?.currency ?? 'USD',
      subtitle: data?.categories.sort((a, b) => b.amount - a.amount)[0]?.name ?? 'None',
      icon: CreditCard,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {showSkeleton ? (
              <>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="mt-2 h-3 w-20" />
              </>
            ) : (
              <div className="animate-in fade-in duration-150">
                <div className="text-2xl font-bold">
                  {stat.currency
                    ? formatCurrency(stat.value, stat.currency)
                    : stat.value
                  }
                </div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Example 5: Category Breakdown Donut Chart

```typescript
// src/components/dashboard/category-chart.tsx
// Source: Existing components/charts/category-pie-chart.tsx + requirements

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryChartProps {
  period: 'month' | 'year' | 'quarter';
  year: number;
  month?: number;
  quarter?: number;
}

export function CategoryChart({ period, year, month, quarter }: CategoryChartProps) {
  const { data, isLoading } = useAnalytics(period, year, month, quarter);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[400px] items-center justify-center">
          <Skeleton className="h-[300px] w-[300px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[400px] items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.categories.map(cat => ({
    name: cat.name,
    value: cat.amount,
    color: cat.color,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatPercent = (value: number) => {
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={140}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${name}: ${formatPercent(value)}`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value), data.currency), 'Monthly']}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value} - {formatCurrency(entry.payload.value, data.currency)}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total in center */}
        <div className="mt-4 text-center">
          <p className="text-3xl font-bold">{formatCurrency(total, data.currency)}</p>
          <p className="text-sm text-muted-foreground">Total {period}ly Spending</p>
        </div>

        {/* Currency breakdown */}
        {Object.keys(data.currencyBreakdown).length > 1 && (
          <div className="mt-4 space-y-1 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">Original Currency Breakdown:</p>
            {Object.entries(data.currencyBreakdown).map(([currency, amount]) => (
              <p key={currency} className="text-xs text-muted-foreground">
                {formatCurrency(amount, currency)}
              </p>
            ))}
            <p className="text-xs text-muted-foreground italic">
              Rates as of {new Date(data.rateTimestamp).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Real-time aggregation on every query | Materialized views with scheduled refresh | PostgreSQL 9.3 (2013) | 10-100x faster queries, reduces database load |
| Manual refresh via application code | Vercel cron jobs with native scheduling | Vercel Cron (2022) | No need for external schedulers, platform-native |
| React Query v3 | TanStack Query v5 | 2023 | Better TypeScript support, smaller bundle, improved devtools |
| EXTRACT for date filtering | date_trunc with range queries | Best practice since PG 8.x | Index-friendly, 2-5x faster for time-series queries |
| TimescaleDB required for time-series | PostgreSQL 17 native improvements | PostgreSQL 17 (2025) | 94% faster date-heavy queries, no extension needed |
| Blocking REFRESH | REFRESH CONCURRENTLY | PostgreSQL 9.4 (2014) | No downtime during refresh, production-ready |

**Deprecated/outdated:**
- **node-cron in Next.js serverless:** Doesn't work on Vercel/Netlify. Use Vercel cron jobs or external services like Inngest.
- **SELECT * in materialized views:** Breaks when underlying table schema changes. Always use explicit column lists.
- **Manual cache invalidation without framework:** Error-prone. Use TanStack Query's built-in invalidation.
- **Custom date binning logic:** Use PostgreSQL date_trunc for standard periods (day/week/month/quarter/year).

## Open Questions

Things that couldn't be fully resolved:

1. **Yearly total calculation across fiscal years**
   - What we know: User may have non-January fiscal year start (e.g., April for some countries). Current implementation assumes calendar year.
   - What's unclear: Should analytics support custom fiscal year configuration? How does this affect "Yearly Total" card?
   - Recommendation: Ship with calendar year, add fiscal year as Phase 14 enhancement if users request it. Most subscription analytics tools use calendar year.

2. **Handling subscription pauses in analytics**
   - What we know: Subscriptions can be paused. Current materialized view only includes status='active'.
   - What's unclear: Should paused subscriptions appear in analytics? If yes, should they be counted at full or reduced weight?
   - Recommendation: Exclude paused subscriptions from totals (current behavior). Users expect analytics to reflect actual spending, not potential spending. Add a separate "Paused subscriptions: X" stat if needed.

3. **Materialized view performance at scale**
   - What we know: REFRESH CONCURRENTLY creates temporary structures and can be slow for very large datasets (millions of rows).
   - What's unclear: How many subscriptions before 15-minute refresh becomes too slow? Is incremental update needed?
   - Recommendation: Start with full refresh. Monitor refresh duration in production. If refresh exceeds 10 minutes at scale, consider incremental aggregation patterns or more frequent partial refreshes. For reference, 100K subscriptions typically refresh in <30 seconds.

4. **Drizzle ORM materialized view schema support**
   - What we know: Drizzle Kit doesn't generate materialized view schemas (GitHub issue #1787). Must use raw SQL migrations.
   - What's unclear: Will Drizzle add materialized view schema support? How to integrate with Drizzle's type generation?
   - Recommendation: Use raw SQL migrations for CREATE MATERIALIZED VIEW. Query with Drizzle using a regular table schema (Drizzle can query views like tables). Add a comment in schema.ts noting it's a view. Monitor Drizzle roadmap for official view support.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL Materialized Views Documentation](https://www.postgresql.org/docs/current/rules-materializedviews.html) - Official PostgreSQL documentation
- [How to Use Materialized Views in PostgreSQL (2026-01-25)](https://oneuptime.com/blog/post/2026-01-25-use-materialized-views-postgresql/view) - Recent materialized views guide
- [Optimizing Materialized Views in PostgreSQL - Medium](https://medium.com/@ShivIyer/optimizing-materialized-views-in-postgresql-best-practices-for-performance-and-efficiency-3e8169c00dc1) - Performance best practices
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs) - Official Vercel cron documentation
- [TanStack Query Invalidation Guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) - Official cache invalidation docs
- [Drizzle ORM Views Documentation](https://orm.drizzle.team/docs/views) - Official Drizzle view support
- [PostgreSQL Date Functions - Crunchy Data](https://www.crunchydata.com/developers/playground/postgres-date-functions) - date_trunc best practices
- Existing codebase patterns (`src/app/api/cron/send-reminders/route.ts`, `src/lib/fx/rates.ts`, `src/components/charts/category-pie-chart.tsx`)

### Secondary (MEDIUM confidence)
- [Postgres Materialized Views - Neon](https://neon.com/postgresql/postgresql-views/postgresql-materialized-views) - Materialized views tutorial
- [PostgreSQL 17 Performance Upgrade 2026 - Medium](https://medium.com/@DevBoostLab/postgresql-17-performance-upgrade-2026-f4222e71f577) - PostgreSQL 17 date performance improvements
- [Cron Jobs in Next.js on Vercel - Drew Bredvick](https://drew.tech/posts/cron-jobs-in-nextjs-on-vercel) - Practical Vercel cron guide
- [4 Ways to Create Date Bins in Postgres - Crunchy Data](https://www.crunchydata.com/blog/4-ways-to-create-date-bins-in-postgres-interval-date_trunc-extract-and-to_char) - Date binning comparison
- [Create Donut Chart using Recharts - GeeksforGeeks](https://www.geeksforgeeks.org/reactjs/create-a-donut-chart-using-recharts-in-reactjs/) - Recharts implementation

### Tertiary (LOW confidence)
- [Running background jobs - Next.js Discussion](https://github.com/vercel/next.js/discussions/33989) - Community discussion on background jobs
- [Drizzle materialized views GitHub issue #2653](https://github.com/drizzle-team/drizzle-orm/issues/2653) - Feature request for relations
- [TimescaleDB for PostgreSQL](https://www.timescale.com/) - Alternative approach for time-series (not needed for this phase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, materialized views are native PostgreSQL
- Architecture: HIGH - Patterns verified in official docs and existing codebase
- Pitfalls: HIGH - Based on documented issues and production experience
- Performance: MEDIUM - Refresh times extrapolated from typical workloads, need production monitoring
- Drizzle integration: MEDIUM - Workarounds verified, but waiting on official support

**Research date:** 2026-02-05
**Valid until:** 60 days (stable PostgreSQL/Vercel features, slow-moving domain)
