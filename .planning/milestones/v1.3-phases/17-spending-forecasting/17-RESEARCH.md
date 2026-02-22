# Phase 17: Spending Forecasting - Research

**Researched:** 2026-02-06
**Domain:** Time-series forecasting, confidence intervals, calendar visualization, Recharts fan charts
**Confidence:** HIGH

## Summary

Phase 17 adds spending forecasting capabilities to the subscription manager: upcoming charges calendar (30/60/90 days), monthly spending projections (3-6 months), annual forecast extrapolation, and confidence intervals (80%/95%) via fan charts. The research confirms that the existing infrastructure (Phase 13's materialized views, Phase 15's Recharts patterns) provides a solid foundation. The constraint from REQUIREMENTS.md to avoid "complex statistical models" and use "simple-statistics library" is validated: subscription data is highly predictable (known renewal dates + fixed amounts) making sophisticated ARIMA/ML models unnecessary.

The key architectural insight is that **subscription forecasting differs fundamentally from general time-series forecasting**. We have:
1. **Known future events** (subscription renewal dates stored in database)
2. **Fixed amounts** (subscription.amount is constant unless user changes it)
3. **Minimal uncertainty** (only comes from potential cancellations, not amount variability)

This means the "forecast" is primarily **deterministic projection** (sum of known renewals) plus **simple uncertainty bands** (based on historical churn or variance). We don't need regression models for the core forecast—just aggregate scheduled renewals. Confidence intervals represent cancellation risk, not prediction error.

The tech stack requires only one new dependency: `simple-statistics` for standard deviation calculations (confidence interval widths). Recharts 3.7.0 already supports fan charts via stacked Area components with transparency.

**Primary recommendation:** Build three distinct forecast views: (1) Calendar view listing known renewals by date, (2) Monthly projection chart showing stacked bars of scheduled charges with ±2σ bands, (3) Annual extrapolation with fan chart showing 80%/95% confidence intervals based on historical volatility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| simple-statistics | 7.8.8 | Standard deviation, variance | Explicitly required by REQUIREMENTS.md, 316 dependents, well-maintained |
| Recharts | 3.7.0 | Fan chart visualization | Already in project, supports stacked areas for confidence bands |
| date-fns | 4.1.0 | Date range calculations | Already in project, `eachDayOfInterval`, `addMonths` |
| PostgreSQL | Native | Known renewals query | Existing subscriptions table has `nextRenewalDate` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | 9.13.0 | Calendar UI (already in shadcn) | Calendar view of upcoming charges |
| TanStack Query | 5.90.19 | Forecast data caching | Already used for analytics |
| Drizzle ORM | 0.45.1 | Database queries | Query subscriptions for forecast |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simple variance-based CI | ARIMA forecasting | ARIMA overkill for deterministic subscription data; violates REQUIREMENTS.md |
| Stacked Area fan chart | D3 custom fan chart | Recharts simpler, already in project, maintainable by team |
| react-day-picker calendar | react-calendar or FullCalendar | react-day-picker already in shadcn/ui, consistent design |
| Manual calendar grid | shadcn Calendar component | Shadcn provides pre-built, accessible calendar |

**Installation:**
```bash
npm install simple-statistics
```
(All other dependencies already installed)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/
│   └── forecast/
│       ├── calendar/
│       │   └── route.ts          # GET /api/forecast/calendar?days=30
│       ├── monthly/
│       │   └── route.ts          # GET /api/forecast/monthly?months=6
│       └── annual/
│           └── route.ts          # GET /api/forecast/annual
├── lib/
│   └── utils/
│       └── forecast.ts           # Forecast calculation logic
├── components/
│   └── forecast/
│       ├── upcoming-charges-calendar.tsx  # Calendar view
│       ├── monthly-forecast-chart.tsx     # Bar chart with projections
│       └── annual-forecast-fan-chart.tsx  # Fan chart with CI bands
└── types/
    └── forecast.ts               # TypeScript interfaces
```

### Pattern 1: Deterministic Forecast from Known Renewals

**What:** Query subscriptions table for upcoming renewal dates, aggregate by time period
**When to use:** Core forecast calculation (before adding uncertainty bands)
**Example:**
```typescript
// Source: Project schema.ts + PostgreSQL date functions
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { addMonths, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Calculate deterministic forecast based on known subscription renewals.
 * No prediction model needed—just aggregate scheduled charges.
 */
export async function calculateMonthlyForecast(
  userId: string,
  months: number
): Promise<MonthlyForecast[]> {
  const today = new Date();
  const endDate = addMonths(today, months);

  // Query subscriptions that renew within forecast window
  const subs = await db
    .select({
      id: subscriptions.id,
      name: subscriptions.name,
      amount: subscriptions.amount,
      currency: subscriptions.currency,
      frequency: subscriptions.frequency,
      nextRenewalDate: subscriptions.nextRenewalDate,
      normalizedMonthlyAmount: subscriptions.normalizedMonthlyAmount,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gte(subscriptions.nextRenewalDate, today),
        lte(subscriptions.nextRenewalDate, endDate)
      )
    );

  // Project renewals across forecast period
  const monthlyCharges: Record<string, number> = {};

  for (const sub of subs) {
    let renewalDate = new Date(sub.nextRenewalDate);

    while (renewalDate <= endDate) {
      const monthKey = format(renewalDate, 'yyyy-MM');
      monthlyCharges[monthKey] =
        (monthlyCharges[monthKey] || 0) +
        parseFloat(sub.normalizedMonthlyAmount);

      // Calculate next renewal
      renewalDate =
        sub.frequency === 'monthly'
          ? addMonths(renewalDate, 1)
          : addMonths(renewalDate, 12);
    }
  }

  return Object.entries(monthlyCharges).map(([month, amount]) => ({
    month,
    forecast: amount,
  }));
}
```

### Pattern 2: Confidence Intervals from Historical Variance

**What:** Calculate prediction intervals using historical spending variance, not regression
**When to use:** Adding uncertainty bands to deterministic forecast
**Example:**
```typescript
// Source: simple-statistics docs + PSU STAT 501
import { sampleStandardDeviation, mean } from 'simple-statistics';

interface ForecastWithCI {
  month: string;
  forecast: number;
  lower80: number;  // 80% confidence interval
  upper80: number;
  lower95: number;  // 95% confidence interval
  upper95: number;
}

/**
 * Add confidence intervals to forecast based on historical volatility.
 * Uses standard deviation of past spending, not regression prediction interval.
 */
export function addConfidenceIntervals(
  forecast: MonthlyForecast[],
  historicalMonthly: number[]  // Past 12+ months of actual spending
): ForecastWithCI[] {
  // Calculate historical volatility
  const historicalMean = mean(historicalMonthly);
  const stdDev = sampleStandardDeviation(historicalMonthly);

  // Coefficient of variation (volatility relative to mean)
  const cv = stdDev / historicalMean;

  return forecast.map(f => {
    // Scale uncertainty by forecast amount (higher spending = higher variance)
    const forecastStdDev = f.forecast * cv;

    return {
      month: f.month,
      forecast: f.forecast,
      // 80% CI ≈ ±1.28 standard deviations (assuming normal distribution)
      lower80: Math.max(0, f.forecast - 1.28 * forecastStdDev),
      upper80: f.forecast + 1.28 * forecastStdDev,
      // 95% CI ≈ ±1.96 standard deviations
      lower95: Math.max(0, f.forecast - 1.96 * forecastStdDev),
      upper95: f.forecast + 1.96 * forecastStdDev,
    };
  });
}
```

**Why this approach:** Subscription forecasting isn't about predicting unknown amounts—it's about modeling cancellation risk. Historical variance captures typical month-to-month fluctuations (new subs, cancellations, pauses). This is simpler and more appropriate than regression prediction intervals.

### Pattern 3: Fan Chart with Stacked Area Bands

**What:** Visualize confidence intervals as expanding bands (fan chart) using Recharts stacked areas
**When to use:** Annual forecast visualization showing increasing uncertainty over time
**Example:**
```typescript
// Source: Recharts 3.x docs + D3 Graph Gallery confidence interval pattern
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FanChartProps {
  data: ForecastWithCI[];
  currency: string;
}

/**
 * Fan chart showing forecast with 80% and 95% confidence interval bands.
 * Uses stacked areas with transparency to create "fan" effect.
 */
export function AnnualForecastFanChart({ data, currency }: FanChartProps) {
  // Transform data for stacked areas
  // Stack order: lower95 (transparent) -> 95-80 band -> 80-center band -> center line
  const chartData = data.map(d => ({
    month: d.month,
    lower95: d.lower95,  // Base (will be transparent)
    band95to80: d.lower80 - d.lower95,  // 95-80% lower band
    band80toForecast: d.forecast - d.lower80,  // 80% to forecast
    forecastToUpper80: d.upper80 - d.forecast,  // Forecast to 80% upper
    upperBand80to95: d.upper95 - d.upper80,  // 80-95% upper band
    forecast: d.forecast,  // Center line
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          {/* Gradients for fan bands */}
          <linearGradient id="band95" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="band80" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(v) => formatCurrency(v, currency)}
        />
        <Tooltip
          content={<CustomForecastTooltip currency={currency} />}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />

        {/* Stacked areas create fan effect */}
        <Area
          type="monotone"
          dataKey="lower95"
          stackId="1"
          stroke="none"
          fill="transparent"  // Transparent base
        />
        <Area
          type="monotone"
          dataKey="band95to80"
          stackId="1"
          stroke="none"
          fill="url(#band95)"  // 95% band (light)
        />
        <Area
          type="monotone"
          dataKey="band80toForecast"
          stackId="1"
          stroke="none"
          fill="url(#band80)"  // 80% band (darker)
        />
        <Area
          type="monotone"
          dataKey="forecastToUpper80"
          stackId="1"
          stroke="none"
          fill="url(#band80)"
        />
        <Area
          type="monotone"
          dataKey="upperBand80to95"
          stackId="1"
          stroke="none"
          fill="url(#band95)"
        />

        {/* Forecast center line (not stacked) */}
        <Area
          type="monotone"
          dataKey="forecast"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="none"
          dot={{ fill: "hsl(var(--primary))", r: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

**Why stacked areas:** Recharts doesn't have native fan chart support, but stacking transparent areas creates the same visual effect. This is the standard pattern used in D3 confidence interval examples, adapted for Recharts.

### Pattern 4: Calendar View of Upcoming Charges

**What:** Use shadcn Calendar component with custom day rendering to show renewal dates
**When to use:** 30/60/90 day upcoming charges view (FCST-01)
**Example:**
```typescript
// Source: shadcn/ui Calendar docs + react-day-picker
import { Calendar } from '@/components/ui/calendar';
import { addDays, isSameDay } from 'date-fns';

interface UpcomingCharge {
  date: Date;
  subscriptionName: string;
  amount: number;
  currency: string;
}

interface ChargesCalendarProps {
  charges: UpcomingCharge[];
  days: 30 | 60 | 90;
}

/**
 * Calendar showing dots/badges on days with subscription renewals.
 * Click day to see list of charges.
 */
export function UpcomingChargesCalendar({ charges, days }: ChargesCalendarProps) {
  const today = new Date();
  const endDate = addDays(today, days);

  // Group charges by date
  const chargesByDate = charges.reduce((acc, charge) => {
    const dateKey = format(charge.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(charge);
    return acc;
  }, {} as Record<string, UpcomingCharge[]>);

  // Custom day component showing charge indicator
  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayCharges = chargesByDate[dateKey] || [];

    if (dayCharges.length === 0) {
      return <span>{day.getDate()}</span>;
    }

    const totalAmount = dayCharges.reduce((sum, c) => sum + c.amount, 0);

    return (
      <div className="relative">
        <span>{day.getDate()}</span>
        <div className="absolute -top-1 -right-1">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {formatCurrency(totalAmount, dayCharges[0].currency)}
        </p>
      </div>
    );
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const selectedCharges = selectedDate
    ? chargesByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        fromDate={today}
        toDate={endDate}
        components={{
          Day: ({ date }) => renderDay(date),
        }}
        className="rounded-md border"
      />

      {/* Charge details panel */}
      <div className="space-y-2">
        <h3 className="font-medium">
          {selectedDate
            ? format(selectedDate, 'MMMM d, yyyy')
            : 'Select a date'}
        </h3>
        {selectedCharges.length > 0 ? (
          <ul className="space-y-2">
            {selectedCharges.map((charge, i) => (
              <li key={i} className="flex justify-between border-b pb-2">
                <span>{charge.subscriptionName}</span>
                <span className="font-medium">
                  {formatCurrency(charge.amount, charge.currency)}
                </span>
              </li>
            ))}
            <li className="flex justify-between pt-2 font-bold">
              <span>Total</span>
              <span>
                {formatCurrency(
                  selectedCharges.reduce((sum, c) => sum + c.amount, 0),
                  selectedCharges[0].currency
                )}
              </span>
            </li>
          </ul>
        ) : (
          <p className="text-muted-foreground">No charges on this date</p>
        )}
      </div>
    </div>
  );
}
```

### Pattern 5: Annual Extrapolation from Monthly Average

**What:** Calculate annual forecast by extrapolating current monthly run rate
**When to use:** Annual total projection (FCST-03)
**Example:**
```typescript
/**
 * Extrapolate annual spending from current monthly rate.
 * Uses 12-month projection with compounding uncertainty.
 */
export function calculateAnnualForecast(
  currentMonthlyForecast: number,
  historicalMonthly: number[]
): AnnualForecastResult {
  // Annual forecast = monthly * 12 (assumes current subscriptions continue)
  const annualForecast = currentMonthlyForecast * 12;

  // Annual variance compounds monthly variance
  const monthlyStdDev = sampleStandardDeviation(historicalMonthly);
  // Sqrt(12) scaling for independent monthly variations
  const annualStdDev = monthlyStdDev * Math.sqrt(12);

  return {
    forecast: annualForecast,
    lower80: Math.max(0, annualForecast - 1.28 * annualStdDev),
    upper80: annualForecast + 1.28 * annualStdDev,
    lower95: Math.max(0, annualForecast - 1.96 * annualStdDev),
    upper95: annualForecast + 1.96 * annualStdDev,
  };
}
```

**Why sqrt(12) scaling:** For independent monthly variations, variance scales linearly (Var(X1 + ... + X12) = 12 * Var(Xi)), so standard deviation scales as sqrt(12) ≈ 3.46. This assumes month-to-month changes are independent, which is reasonable for subscription churn.

### Anti-Patterns to Avoid

- **Using linear regression for subscription forecasting:** Subscriptions have known renewal dates, not trends to predict. Regression is for unknown relationships, not deterministic schedules.
- **Ignoring known renewal events:** Don't just extrapolate historical averages. You have actual `nextRenewalDate` data—use it directly.
- **Overfitting with ARIMA/ML:** Violates REQUIREMENTS.md constraint and adds complexity without accuracy gain for subscription data.
- **Showing false precision:** Don't display forecasts to 2 decimal places. Round to whole dollars for monthly/annual projections.
- **Single-point forecasts without uncertainty:** Always show confidence intervals. Users need to understand forecast reliability.
- **Narrow confidence intervals:** Don't underestimate uncertainty. Better to be conservative than overconfident.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Standard deviation calculation | Manual variance loop | `simple-statistics/sampleStandardDeviation` | Handles edge cases (n=1, NaN), numerically stable |
| Date range iteration | Manual loop incrementing dates | `date-fns/eachMonthOfInterval` | Handles month boundaries, leap years, DST |
| Calendar UI | Custom grid with date logic | shadcn Calendar (react-day-picker) | Accessible, keyboard nav, timezone-safe |
| T-distribution critical values | Custom lookup table | Use z-scores (1.28, 1.96) for large samples | T-dist ≈ normal for n > 30 (subscription data) |
| Confidence interval bands | Custom D3 paths | Recharts stacked Area | Responsive, tooltip support, theme integration |
| Currency conversion | Multiply by rate | Existing `convertCurrency` utility | Handles FX cache, fallback rates |

**Key insight:** The hard part of subscription forecasting isn't statistics—it's data architecture. The existing materialized view (Phase 13) and subscription schema (nextRenewalDate, frequency) provide the foundation. Statistical calculations are straightforward with simple-statistics.

## Common Pitfalls

### Pitfall 1: Confusing Prediction Intervals with Confidence Intervals

**What goes wrong:** Using confidence interval formula (SE without MSE term) instead of prediction interval formula
**Why it happens:** Tutorials often show confidence intervals for regression line, not prediction intervals for new points
**How to avoid:** For subscription forecasting, use historical variance approach (Pattern 2), not regression prediction intervals
**Warning signs:** Confidence bands too narrow, don't widen over time

**Clarification:** In statistical literature, "confidence interval" refers to uncertainty about a parameter (e.g., mean), while "prediction interval" refers to uncertainty about a future value. For user-facing UI, use simpler language: "80% confidence" means "we're 80% confident actual spending will fall within this range."

### Pitfall 2: Linear Regression on Time-Series Subscription Data

**What goes wrong:** Treating subscription data as Y vs. X regression, forecasting with `linearRegressionLine`
**Why it happens:** simple-statistics has linear regression, so developers assume it's needed
**How to avoid:** Subscriptions are deterministic projections, not trends. Use known renewals (Pattern 1), not fitted lines
**Warning signs:** Regression line doesn't match obvious subscription step changes

**When regression IS appropriate:** If analyzing correlation between subscription count and revenue, or analyzing pricing changes over time. NOT for forecasting future charges from known renewals.

### Pitfall 3: Not Scaling Confidence Intervals Over Time

**What goes wrong:** Using same ±σ band for month 1 and month 12
**Why it happens:** Forgetting that uncertainty compounds over longer time horizons
**How to avoid:** Widen bands over time using sqrt(months_ahead) scaling
**Warning signs:** Fan chart doesn't fan out; parallel bands instead of expanding

**Correct scaling:**
```typescript
const monthsAhead = [1, 2, 3, 6, 12];
const monthlyStdDev = sampleStandardDeviation(historicalMonthly);

monthsAhead.forEach(m => {
  const scaledStdDev = monthlyStdDev * Math.sqrt(m);
  // Use scaledStdDev for CI width at month m
});
```

### Pitfall 4: Forgetting Annual Subscriptions in Monthly Forecast

**What goes wrong:** Monthly forecast only sums monthly subscriptions, misses annual renewals
**Why it happens:** Filtering by `frequency = 'monthly'` or forgetting to project annual subs across 12 months
**How to avoid:** Project both monthly and annual subscriptions based on `nextRenewalDate`, not just frequency
**Warning signs:** Large spending spike in one month not reflected in forecast

**Correct projection:**
```typescript
// BAD: Only includes subscriptions renewing this month
const monthlyOnly = subs.filter(s => s.frequency === 'monthly');

// GOOD: Projects all subscriptions based on renewal schedule
for (const sub of allActiveSubs) {
  let renewalDate = new Date(sub.nextRenewalDate);
  const increment = sub.frequency === 'monthly' ? 1 : 12;

  while (renewalDate <= forecastEndDate) {
    addToMonth(renewalDate, sub.normalizedMonthlyAmount);
    renewalDate = addMonths(renewalDate, increment);
  }
}
```

### Pitfall 5: Overcomplicated Tooltip in Fan Chart

**What goes wrong:** Tooltip shows raw stacked area values (lower95, band95to80, etc.) instead of actual CI values
**Why it happens:** Default Recharts tooltip shows dataKeys as-is
**How to avoid:** Use custom tooltip that reconstructs forecast ± CI from stacked values
**Warning signs:** Tooltip displays confusing "band95to80: 12.34" instead of "95% range: $100-$150"

**Custom tooltip pattern:**
```typescript
const CustomForecastTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null;

  // Reconstruct original values from stacked areas
  const lower95 = payload[0].value;
  const lower80 = lower95 + payload[1].value;
  const forecast = lower80 + payload[2].value;
  const upper80 = forecast + payload[3].value;
  const upper95 = upper80 + payload[4].value;

  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="font-medium">Forecast: {formatCurrency(forecast)}</p>
      <p className="text-xs">80% range: {formatCurrency(lower80)} - {formatCurrency(upper80)}</p>
      <p className="text-xs">95% range: {formatCurrency(lower95)} - {formatCurrency(upper95)}</p>
    </div>
  );
};
```

### Pitfall 6: Negative Lower Confidence Bound

**What goes wrong:** Lower bound of confidence interval goes negative (e.g., "-$50 to $200")
**Why it happens:** Symmetric intervals (forecast ± kσ) can produce negative values when forecast is small
**How to avoid:** Use `Math.max(0, forecast - kσ)` to floor at zero
**Warning signs:** Negative dollar amounts in tooltip or chart

**Always floor at zero:**
```typescript
return {
  forecast: f.forecast,
  lower95: Math.max(0, f.forecast - 1.96 * stdDev),  // ✓ Correct
  // NOT: lower95: f.forecast - 1.96 * stdDev  // ✗ Can go negative
};
```

## Code Examples

Verified patterns from official sources and statistical best practices:

### Example 1: Complete Forecast API Route

```typescript
// src/app/api/forecast/monthly/route.ts
// Source: Project patterns + simple-statistics docs

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { addMonths, format } from 'date-fns';
import { sampleStandardDeviation, mean } from 'simple-statistics';
import { z } from 'zod';

const querySchema = z.object({
  months: z.coerce.number().int().min(1).max(12).default(6),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!params.success) {
      return NextResponse.json(
        { error: params.error.issues[0].message },
        { status: 400 }
      );
    }

    const { months } = params.data;
    const today = new Date();
    const forecastEnd = addMonths(today, months);

    // Step 1: Get active subscriptions
    const activeSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, 'active')
        )
      );

    // Step 2: Project renewals across forecast window
    const monthlyForecasts: Record<string, number> = {};

    for (const sub of activeSubs) {
      let renewalDate = new Date(sub.nextRenewalDate);
      const incrementMonths = sub.frequency === 'monthly' ? 1 : 12;

      while (renewalDate <= forecastEnd) {
        const monthKey = format(renewalDate, 'yyyy-MM');
        monthlyForecasts[monthKey] =
          (monthlyForecasts[monthKey] || 0) +
          parseFloat(sub.normalizedMonthlyAmount);

        renewalDate = addMonths(renewalDate, incrementMonths);
      }
    }

    // Step 3: Get historical spending for confidence intervals
    // Query analytics MV for past 12 months
    const historicalData = await db.execute(sql`
      SELECT
        DATE_TRUNC('month', month) as month,
        SUM(normalized_monthly_amount) as total
      FROM user_analytics_mv
      WHERE user_id = ${session.user.id}
        AND month >= ${addMonths(today, -12)}
        AND month < ${today}
      GROUP BY DATE_TRUNC('month', month)
      ORDER BY month
    `);

    const historicalMonthly = historicalData.rows.map(r =>
      parseFloat(r.total)
    );

    // Step 4: Calculate confidence intervals
    const historicalMean = mean(historicalMonthly);
    const stdDev = sampleStandardDeviation(historicalMonthly);
    const cv = stdDev / historicalMean;  // Coefficient of variation

    const forecastWithCI = Object.entries(monthlyForecasts).map(([month, forecast]) => {
      const forecastStdDev = forecast * cv;

      return {
        month,
        forecast,
        lower80: Math.max(0, forecast - 1.28 * forecastStdDev),
        upper80: forecast + 1.28 * forecastStdDev,
        lower95: Math.max(0, forecast - 1.96 * forecastStdDev),
        upper95: forecast + 1.96 * forecastStdDev,
      };
    });

    return NextResponse.json({
      forecasts: forecastWithCI,
      metadata: {
        historicalMonths: historicalMonthly.length,
        baseStdDev: stdDev,
        coefficientOfVariation: cv,
      },
    });
  } catch (error) {
    console.error('Monthly forecast error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
```

### Example 2: Upcoming Charges Query

```typescript
// src/app/api/forecast/calendar/route.ts
// Source: Project schema + date-fns

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { addDays, addMonths, eachDayOfInterval } from 'date-fns';
import { z } from 'zod';

const querySchema = z.object({
  days: z.enum(['30', '60', '90']).default('30'),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!params.success) {
      return NextResponse.json(
        { error: params.error.issues[0].message },
        { status: 400 }
      );
    }

    const days = parseInt(params.data.days);
    const today = new Date();
    const endDate = addDays(today, days);

    // Get active subscriptions
    const activeSubs = await db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        frequency: subscriptions.frequency,
        nextRenewalDate: subscriptions.nextRenewalDate,
        categoryId: subscriptions.categoryId,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, 'active')
        )
      );

    // Project renewals within the next N days
    const upcomingCharges: Array<{
      date: string;
      subscriptionId: string;
      subscriptionName: string;
      amount: number;
      currency: string;
      categoryId: string | null;
    }> = [];

    for (const sub of activeSubs) {
      let renewalDate = new Date(sub.nextRenewalDate);
      const incrementMonths = sub.frequency === 'monthly' ? 1 : 12;

      // Include renewals within forecast window
      while (renewalDate >= today && renewalDate <= endDate) {
        upcomingCharges.push({
          date: renewalDate.toISOString(),
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          amount: parseFloat(sub.amount),
          currency: sub.currency,
          categoryId: sub.categoryId,
        });

        renewalDate = addMonths(renewalDate, incrementMonths);
      }
    }

    // Sort chronologically
    upcomingCharges.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate summary stats
    const totalCharges = upcomingCharges.reduce((sum, c) => sum + c.amount, 0);
    const uniqueSubscriptions = new Set(upcomingCharges.map(c => c.subscriptionId)).size;

    return NextResponse.json({
      charges: upcomingCharges,
      summary: {
        totalAmount: totalCharges,
        chargeCount: upcomingCharges.length,
        uniqueSubscriptions,
        startDate: today.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Calendar forecast error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar' },
      { status: 500 }
    );
  }
}
```

### Example 3: Fan Chart Component

```typescript
// src/components/forecast/annual-forecast-fan-chart.tsx
// Source: Recharts 3.x + D3 Graph Gallery confidence interval pattern

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';

interface ForecastDataPoint {
  month: string;
  forecast: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
}

interface FanChartProps {
  data: ForecastDataPoint[];
  currency: string;
  title?: string;
}

export function AnnualForecastFanChart({
  data,
  currency,
  title = 'Annual Spending Forecast',
}: FanChartProps) {
  // Transform to stacked area format
  const chartData = data.map(d => ({
    month: d.month,
    // Stack from bottom to top:
    lower95: d.lower95,
    band95_lower: d.lower80 - d.lower95,  // 95-80 lower band
    band80_lower: d.forecast - d.lower80,  // 80-forecast lower
    band80_upper: d.upper80 - d.forecast,  // forecast-80 upper
    band95_upper: d.upper95 - d.upper80,  // 80-95 upper band
    // Store originals for tooltip
    _forecast: d.forecast,
    _lower80: d.lower80,
    _upper80: d.upper80,
    _lower95: d.lower95,
    _upper95: d.upper95,
  }));

  const formatCurrencyTick = (value: number) =>
    formatCurrency(value, currency);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Insufficient data for forecast</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Shaded bands show 80% and 95% confidence intervals
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="font-medium mb-2">{data.month}</p>
                    <p className="text-sm">
                      <strong>Forecast:</strong>{' '}
                      {formatCurrency(data._forecast, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      80% confidence: {formatCurrency(data._lower80, currency)} -{' '}
                      {formatCurrency(data._upper80, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      95% confidence: {formatCurrency(data._lower95, currency)} -{' '}
                      {formatCurrency(data._upper95, currency)}
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              content={() => (
                <div className="flex justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 bg-primary/35" />
                    <span>80% confidence</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 bg-primary/15" />
                    <span>95% confidence</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-0.5 w-4 bg-primary" />
                    <span>Forecast</span>
                  </div>
                </div>
              )}
            />

            {/* Stacked areas create fan effect */}
            <Area
              type="monotone"
              dataKey="lower95"
              stackId="1"
              stroke="none"
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="band95_lower"
              stackId="1"
              stroke="none"
              fill="url(#band95)"
            />
            <Area
              type="monotone"
              dataKey="band80_lower"
              stackId="1"
              stroke="none"
              fill="url(#band80)"
            />
            <Area
              type="monotone"
              dataKey="band80_upper"
              stackId="1"
              stroke="none"
              fill="url(#band80)"
            />
            <Area
              type="monotone"
              dataKey="band95_upper"
              stackId="1"
              stroke="none"
              fill="url(#band95)"
            />

            {/* Forecast center line (not stacked) */}
            <Area
              type="monotone"
              dataKey="_forecast"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="none"
              dot={{ fill: 'hsl(var(--primary))', r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Example 4: Historical Volatility Utility

```typescript
// src/lib/utils/forecast.ts
// Source: simple-statistics docs + statistical best practices

import { sampleStandardDeviation, mean } from 'simple-statistics';

/**
 * Calculate coefficient of variation (relative volatility) from historical data.
 * Returns dimensionless ratio: stdDev / mean.
 *
 * Used to scale confidence intervals proportionally to forecast amount.
 *
 * @param historicalMonthly - Array of past monthly spending totals
 * @returns Coefficient of variation (0-1+ range, typically 0.1-0.3 for subscriptions)
 */
export function calculateVolatility(historicalMonthly: number[]): number {
  if (historicalMonthly.length < 2) {
    // Not enough data for variance calculation
    // Return conservative default (20% volatility)
    return 0.20;
  }

  const historicalMean = mean(historicalMonthly);

  if (historicalMean === 0) {
    // Avoid division by zero
    return 0.20;
  }

  const stdDev = sampleStandardDeviation(historicalMonthly);
  const cv = stdDev / historicalMean;

  // Cap at 100% (CV > 1 means volatility exceeds mean, very unstable)
  return Math.min(cv, 1.0);
}

/**
 * Scale confidence interval width based on time horizon.
 * Uncertainty grows with sqrt(time) for independent variations.
 *
 * @param baseStdDev - Standard deviation for 1-month forecast
 * @param monthsAhead - Number of months into the future
 * @returns Scaled standard deviation for monthsAhead forecast
 */
export function scaleUncertainty(
  baseStdDev: number,
  monthsAhead: number
): number {
  // Sqrt rule: variance scales linearly, stdDev scales as sqrt
  return baseStdDev * Math.sqrt(monthsAhead);
}

/**
 * Convert z-score to confidence level percentage.
 * Common z-scores: 1.28 (80%), 1.645 (90%), 1.96 (95%), 2.576 (99%)
 */
export const CONFIDENCE_LEVELS = {
  80: 1.28,
  90: 1.645,
  95: 1.96,
  99: 2.576,
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ARIMA for subscription forecasting | Deterministic projection from known renewals | N/A | Subscription data is scheduled, not stochastic; ARIMA adds complexity without accuracy |
| Regression prediction intervals | Historical variance-based CI | N/A | Regression assumes unknown relationship; subscriptions are deterministic |
| D3 custom fan charts | Recharts stacked Area | Recharts 3.0 (2024) | Simpler implementation, React-native, maintainable |
| Manual standard deviation | simple-statistics library | N/A | Numerically stable, handles edge cases |
| Symmetric CI around zero | Floored at zero (non-negative) | Best practice | Spending can't be negative |

**Deprecated/outdated:**
- **ARIMA/Prophet for subscription forecasting:** Overkill for deterministic renewal schedules. Only use if modeling churn probability, not charge amounts.
- **Linear regression on time:** Subscriptions don't follow linear trends (they step up/down with adds/cancellations). Use actual renewal dates.
- **Single-point forecasts:** Always provide uncertainty bands. Users need to understand forecast reliability.
- **Client-side statistical calculations:** For large datasets, calculate server-side. Simple-statistics works both places.

## Open Questions

Things that couldn't be fully resolved:

1. **Churn rate incorporation**
   - What we know: Historical variance captures realized churn, but doesn't model it explicitly
   - What's unclear: Should we estimate churn probability and reduce forecast accordingly? E.g., "10% chance of cancellation → reduce 6-month forecast by 5%"
   - Recommendation: Start with variance-based CI (simpler, captures aggregate effect). Add explicit churn modeling in future phase if users request it. Most SaaS forecasting tools use aggregate variance, not per-subscription churn probability.

2. **Intra-month day-of-month effects**
   - What we know: Subscriptions renew on specific days (e.g., 15th). Calendar view shows this.
   - What's unclear: Do users care about cash flow within the month? Should monthly forecast show distribution of charges across days?
   - Recommendation: Monthly forecast shows month total (sufficient for budgeting). Calendar view handles day-level granularity (FCST-01 satisfied). Don't add daily cash flow projection unless explicitly requested.

3. **Currency conversion for future dates**
   - What we know: Current FX rates cached for 6 hours (Phase 13)
   - What's unclear: Should forecasts use current rates or attempt to predict future FX rates?
   - Recommendation: Use current rates with disclaimer "Based on current exchange rates". FX prediction is out of scope and low-value for personal subscription tracking.

4. **Confidence interval methodology disclosure**
   - What we know: Using historical variance with z-score multipliers (1.28, 1.96)
   - What's unclear: How much statistical detail to show users? "80% confidence" vs. "80% of outcomes fall within this range, assuming historical volatility continues"
   - Recommendation: Use simple language: "80% confidence" with tooltip: "Based on your past spending patterns, we're 80% confident actual spending will fall within this range." Include link to help doc explaining methodology.

## Sources

### Primary (HIGH confidence)
- [simple-statistics npm package](https://www.npmjs.com/package/simple-statistics) - Version 7.8.8, official API docs
- [simple-statistics documentation](https://simple-statistics.github.io/docs/) - linearRegression, sampleStandardDeviation, mean
- [PSU STAT 501: Prediction Intervals](https://online.stat.psu.edu/stat501/lesson/3/3.3) - Standard error formula, prediction vs confidence intervals
- [DataCamp: Confidence vs Prediction Intervals](https://www.datacamp.com/blog/confidence-intervals-vs-prediction-intervals) - Key differences, when to use each
- [D3 Graph Gallery: Line with Confidence Interval](https://d3-graph-gallery.com/graph/line_confidence_interval.html) - Fan chart pattern with d3.area()
- [Recharts AreaChart Stacking](https://recharts.github.io/en-US/examples/StackedAreaChart/) - Official stacked area examples
- [shadcn/ui Calendar](https://ui.shadcn.com/docs/components/radix/calendar) - react-day-picker integration
- Existing codebase: `src/lib/db/schema.ts` (nextRenewalDate, frequency), `src/components/charts/category-trends-chart.tsx` (Recharts patterns)

### Secondary (MEDIUM confidence)
- [Finance Dictionary Pro: Fan Chart](https://financedictionarypro.com/definitions/f/fan-chart/) - Fan chart definition, Bank of England usage
- [Subscription Revenue Forecasting - Chargebee](https://www.chargebee.com/blog/subscription-revenue-forecasting/) - MRR-based forecasting approach
- [Younium: Forecasting Subscription Revenue](https://www.younium.com/blog/forecasting-subscription-revenue) - Industry best practices
- [Real Statistics: Confidence and Prediction Intervals](https://real-statistics.com/regression/confidence-and-prediction-intervals/) - Excel formulas (adaptable to JavaScript)
- [GitHub issue #316: Recharts Area range](https://github.com/recharts/recharts/issues/316) - Community discussion on confidence bands

### Tertiary (LOW confidence)
- [shadcn Full Calendar Component](https://next.jqueryscript.net/shadcn-ui/full-calendar-component-shadcn-ui/) - Third-party calendar (not official shadcn)
- [Subscription Calendar app](https://subcal.onegai.app/) - Competitor product example (UI patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - simple-statistics explicitly required, all other dependencies already installed
- Deterministic forecast approach: HIGH - Verified by subscription management industry practices, schema supports it
- Confidence interval calculations: HIGH - Statistical formulas verified from PSU, DataCamp, Real Statistics
- Fan chart implementation: MEDIUM - Pattern verified in D3 examples, adapted to Recharts (not native feature)
- Calendar UI approach: MEDIUM - shadcn Calendar confirmed, custom day rendering pattern extrapolated

**Research date:** 2026-02-06
**Valid until:** 2026-04-06 (60 days - stable domain, simple-statistics slow-moving)
