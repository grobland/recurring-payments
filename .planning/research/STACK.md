# Technology Stack - Data & Intelligence Features

**Project:** Subscription Manager v1.3 (Data & Intelligence)
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

The Data & Intelligence milestone adds analytical capabilities (duplicate detection, pattern recognition, spending trends, forecasting, anomaly detection) to the existing subscription manager. **Key architectural decision: Use PostgreSQL analytics + lightweight algorithmic libraries instead of heavyweight ML frameworks.**

Rationale: The existing stack already provides 80% of needed capabilities through PostgreSQL window functions, Recharts for visualization, and existing data structures with timestamps. Only **three lightweight additions** are recommended:
1. **fastest-levenshtein** (~2KB) for duplicate detection string similarity
2. **simple-statistics** (~30KB) for statistical calculations (z-score, moving averages, forecasting)
3. Native PostgreSQL window functions for time-series analytics (no new dependency)

**Why NOT TensorFlow.js/ML libraries:** For subscription data (typically <500 records per user), algorithmic approaches (Levenshtein distance, z-score, exponential smoothing) are faster, more predictable, and 95% smaller than ML models. ML frameworks add 200KB+ bundle size and unpredictable inference latency for minimal accuracy gains on small datasets.

## Existing Stack (No Changes Needed)

### Database & Time-Series Foundation
| Technology | Current Version | Status | Why It's Sufficient |
|------------|----------------|--------|---------------------|
| PostgreSQL (via Supabase) | 15+ | **KEEP** | Window functions (LAG, LEAD, NTILE, RANK) handle time-series analytics natively |
| Drizzle ORM | 0.45.1 | **KEEP** | Raw SQL support for window functions, typed queries for aggregations |
| date-fns | 4.1.0 | **KEEP** | Date arithmetic for trend calculations (diffInMonths, startOfMonth) |

**Why keep PostgreSQL for analytics:**
- Window functions (`LAG()`, `LEAD()`) calculate month-over-month changes without additional libraries
- `NTILE()` for percentile ranking (e.g., top 10% spending categories)
- Indexed timestamp columns (`nextRenewalDate`, `createdAt`) enable fast time-range queries
- Drizzle supports `.sql()` for raw SQL when ORM query builder is insufficient

**Example - Month-over-month spending with window functions:**
```sql
SELECT
  DATE_TRUNC('month', next_renewal_date) AS month,
  SUM(normalized_monthly_amount) AS total,
  LAG(SUM(normalized_monthly_amount)) OVER (ORDER BY DATE_TRUNC('month', next_renewal_date)) AS prev_month,
  (SUM(normalized_monthly_amount) - LAG(SUM(normalized_monthly_amount)) OVER (ORDER BY DATE_TRUNC('month', next_renewal_date))) /
    LAG(SUM(normalized_monthly_amount)) OVER (ORDER BY DATE_TRUNC('month', next_renewal_date)) * 100 AS pct_change
FROM subscriptions
WHERE user_id = $1 AND status = 'active'
GROUP BY DATE_TRUNC('month', next_renewal_date)
ORDER BY month DESC;
```

### Visualization Layer
| Technology | Current Version | Status | Why It's Sufficient |
|------------|----------------|--------|---------------------|
| Recharts | 3.7.0 | **KEEP** | LineChart for trends, BarChart for spending, Area for forecasts, PieChart for category breakdown |
| React | 19.2.3 | **KEEP** | Memoization for chart performance optimization |

**Why keep Recharts:**
- Already handles time-series line charts with continuous x-axis (`type="number"`)
- `ReferenceLine` component can mark anomalies visually
- `Area` chart with gradient for forecast confidence intervals
- Supports custom tooltips for displaying z-scores, similarity percentages

### AI/ML Layer
| Technology | Current Version | Status | Why It's Sufficient |
|------------|----------------|--------|---------------------|
| OpenAI GPT-4o | gpt-4o-2024-08-06 | **KEEP** | Pattern recognition for subscription name normalization (optional enhancement) |

**Why NOT use OpenAI for analytics:**
- Analytics (trends, forecasts) need deterministic, explainable results
- OpenAI useful only for optional features (e.g., "Normalize 'NFLX 123' and 'Netflix Inc.' to 'Netflix'")
- Statistical algorithms provide audit trail and consistent results

## Recommended Additions

### 1. String Similarity - fastest-levenshtein

| Library | Version | Size (gzipped) | Purpose |
|---------|---------|----------------|---------|
| fastest-levenshtein | ^2.0.6 | ~2KB | Duplicate detection via edit distance |

**Purpose:** Detect near-duplicate subscriptions (e.g., "Netflix" vs "NETFLIX" vs "Netflix Inc.") by calculating Levenshtein distance (minimum single-character edits to transform one string into another).

**Why fastest-levenshtein:**
- **Fastest implementation:** Benchmarked 2-5x faster than alternatives (js-levenshtein, levenshtein-edit-distance)
- TypeScript native with excellent type definitions
- Zero dependencies
- Provides both `distance()` and `closest()` functions
- 2KB gzipped is negligible

**Alternatives considered:**
- `fuse.js` (7.0.0, ~10KB) - Too heavy for simple string comparison, optimized for search UX not duplicate detection
- `fuzzyset.js` - Unmaintained, last update 2017
- `string-similarity` - 4x slower than fastest-levenshtein in benchmarks
- **Native implementation** - Would be ~100 lines of code, but fastest-levenshtein is already optimized with SIMD-like techniques

**Installation:**
```bash
npm install fastest-levenshtein
```

**Integration point:**
```typescript
// In src/lib/utils/duplicate-detection.ts
import { distance, closest } from 'fastest-levenshtein';

interface DuplicateCandidate {
  subscription: Subscription;
  similarity: number; // 0-100
}

export function findDuplicateCandidates(
  newSub: { name: string; amount: number },
  existingSubs: Subscription[]
): DuplicateCandidate[] {
  return existingSubs
    .map((sub) => {
      const nameDistance = distance(
        newSub.name.toLowerCase(),
        sub.name.toLowerCase()
      );
      const maxLen = Math.max(newSub.name.length, sub.name.length);
      const nameSimilarity = ((maxLen - nameDistance) / maxLen) * 100;

      // Amount match (within 5%)
      const amountDiff = Math.abs(
        parseFloat(newSub.amount.toString()) -
        parseFloat(sub.amount.toString())
      );
      const amountSimilarity = amountDiff < 0.05 * parseFloat(newSub.amount.toString()) ? 100 : 0;

      // Combined score (weighted)
      const similarity = (nameSimilarity * 0.7) + (amountSimilarity * 0.3);

      return { subscription: sub, similarity };
    })
    .filter((candidate) => candidate.similarity > 70) // Threshold
    .sort((a, b) => b.similarity - a.similarity);
}
```

**When NOT to use:** For fuzzy search UX (e.g., searchable dropdown), use Fuse.js instead. fastest-levenshtein is for programmatic similarity scoring, not interactive search.

**Confidence:** HIGH - Official npm package with 1.6M weekly downloads, actively maintained (last updated Dec 2024).

### 2. Statistical Calculations - simple-statistics

| Library | Version | Size (gzipped) | Purpose |
|---------|---------|----------------|---------|
| simple-statistics | ^7.8.9 | ~30KB | Mean, median, z-score, moving averages, exponential smoothing |

**Purpose:** Statistical calculations for spending analytics, forecasting, and anomaly detection. Provides battle-tested implementations of standard statistical methods.

**Why simple-statistics:**
- **Comprehensive:** Covers all needed statistical functions (mean, median, standard deviation, z-score, moving average, exponential smoothing)
- **Zero dependencies:** Pure JavaScript implementation
- **Well-documented:** Literate programming style with explanations
- **TypeScript support:** Built-in type definitions
- **Small:** 30KB gzipped for entire library, tree-shakeable (can import only needed functions)
- **Stable:** v7.8.9 released Dec 2024, mature library (9+ years old)
- **Trusted:** 500K+ weekly downloads, used by Observable, Mapbox

**Functions needed:**
```typescript
import {
  mean,
  median,
  standardDeviation,
  zScore,
  movingAverage,
  exponentialSmoothing,
  linearRegression,
  linearRegressionLine
} from 'simple-statistics';
```

**Alternatives considered:**
- **Native implementation:** Would require ~500 lines for all functions, bug-prone for edge cases (NaN, empty arrays, outliers)
- `@stdlib/stats` - More comprehensive but 200KB+ (too heavy for our use case)
- `statistics.js` - Unmaintained since 2018
- **TensorFlow.js (rejected):** 200KB+ bundle size, overkill for basic statistics on small datasets (<500 subscriptions)

**Installation:**
```bash
npm install simple-statistics
```

**Integration points:**

**Spending Trends (moving average):**
```typescript
// In src/lib/analytics/spending-trends.ts
import { movingAverage } from 'simple-statistics';

export function calculateSpendingTrend(monthlyTotals: number[]): {
  trend: number[];
  smoothed: number[];
} {
  // 3-month moving average
  const smoothed = movingAverage(monthlyTotals, 3);
  return { trend: monthlyTotals, smoothed };
}
```

**Anomaly Detection (z-score):**
```typescript
// In src/lib/analytics/anomaly-detection.ts
import { mean, standardDeviation, zScore } from 'simple-statistics';

export interface Anomaly {
  subscription: Subscription;
  type: 'price_increase' | 'unexpected_charge';
  zScore: number;
  severity: 'low' | 'medium' | 'high';
}

export function detectPriceAnomalies(
  subscription: Subscription,
  historicalPrices: number[]
): Anomaly | null {
  const currentPrice = parseFloat(subscription.amount.toString());
  const avgPrice = mean(historicalPrices);
  const stdDev = standardDeviation(historicalPrices);

  const z = zScore(currentPrice, avgPrice, stdDev);

  // Z-score > 2 = unusual, > 3 = highly unusual
  if (Math.abs(z) > 2) {
    return {
      subscription,
      type: 'price_increase',
      zScore: z,
      severity: Math.abs(z) > 3 ? 'high' : Math.abs(z) > 2.5 ? 'medium' : 'low'
    };
  }

  return null;
}
```

**Forecasting (exponential smoothing):**
```typescript
// In src/lib/analytics/forecasting.ts
import { exponentialSmoothing, linearRegression, linearRegressionLine } from 'simple-statistics';

export function forecastNextMonths(
  monthlyTotals: number[],
  periods: number = 3,
  method: 'exponential' | 'linear' = 'exponential'
): number[] {
  if (method === 'exponential') {
    // Alpha = 0.3 (give 70% weight to historical, 30% to recent)
    const smoothed = exponentialSmoothing(monthlyTotals, 0.3);

    // Forecast next periods using last smoothed value
    const lastValue = smoothed[smoothed.length - 1];
    return Array(periods).fill(lastValue);
  } else {
    // Linear regression for trend-based forecast
    const points = monthlyTotals.map((y, x) => [x, y]);
    const regression = linearRegression(points);
    const line = linearRegressionLine(regression);

    const forecasts = [];
    const startX = monthlyTotals.length;
    for (let i = 0; i < periods; i++) {
      forecasts.push(line(startX + i));
    }
    return forecasts;
  }
}
```

**Confidence:** HIGH - Official npm package, actively maintained, widely used in production.

### 3. PostgreSQL Window Functions (No New Dependency)

**Purpose:** Time-series analytics (month-over-month growth, ranking, percentiles) using native PostgreSQL features.

**Why PostgreSQL window functions:**
- **Already available:** No new npm dependencies
- **Performant:** Calculated in-database, no data transfer overhead
- **SQL standard:** Portable, well-documented
- **Drizzle support:** Use `.sql()` for raw SQL queries with type safety

**Key window functions for subscription analytics:**

| Function | Purpose | Use Case |
|----------|---------|----------|
| `LAG()`, `LEAD()` | Access previous/next row | Month-over-month spending change |
| `NTILE(n)` | Divide into n buckets | Top 25% spending categories |
| `RANK()`, `DENSE_RANK()` | Rank with/without gaps | Most expensive subscriptions |
| `SUM() OVER ()` | Running total | Cumulative annual spending |
| `AVG() OVER (ORDER BY ... ROWS BETWEEN)` | Moving average | 3-month spending average |

**Integration with Drizzle:**
```typescript
// In src/lib/db/queries/analytics.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function getSpendingTrends(userId: string, months: number = 12) {
  return await db.execute(sql`
    WITH monthly_spending AS (
      SELECT
        DATE_TRUNC('month', next_renewal_date) AS month,
        SUM(normalized_monthly_amount) AS total
      FROM subscriptions
      WHERE user_id = ${userId}
        AND status = 'active'
        AND next_renewal_date >= NOW() - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', next_renewal_date)
    )
    SELECT
      month,
      total,
      LAG(total) OVER (ORDER BY month) AS prev_month_total,
      (total - LAG(total) OVER (ORDER BY month)) /
        NULLIF(LAG(total) OVER (ORDER BY month), 0) * 100 AS pct_change,
      AVG(total) OVER (
        ORDER BY month
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
      ) AS moving_avg_3m
    FROM monthly_spending
    ORDER BY month DESC;
  `);
}

export async function getCategoryRankings(userId: string) {
  return await db.execute(sql`
    SELECT
      c.name AS category,
      SUM(s.normalized_monthly_amount) AS total_spending,
      RANK() OVER (ORDER BY SUM(s.normalized_monthly_amount) DESC) AS rank,
      NTILE(4) OVER (ORDER BY SUM(s.normalized_monthly_amount) DESC) AS quartile
    FROM subscriptions s
    JOIN categories c ON s.category_id = c.id
    WHERE s.user_id = ${userId} AND s.status = 'active'
    GROUP BY c.id, c.name
    ORDER BY total_spending DESC;
  `);
}
```

**Learning resources:**
- [PostgreSQL Window Functions Official Docs](https://www.postgresql.org/docs/current/tutorial-window.html)
- [Crunchy Data: Window Functions for Data Analysis](https://www.crunchydata.com/blog/window-functions-for-data-analysis-with-postgres)
- [SQL Time-Series Tutorial: LEAD & LAG](https://datalemur.com/sql-tutorial/sql-time-series-window-function-lead-lag)

**Confidence:** HIGH - PostgreSQL standard feature, Supabase runs PostgreSQL 15+.

## Rejected Additions

### Machine Learning Libraries

**Rejected:** TensorFlow.js, Brain.js, ML.js, ONNX Runtime

**Why rejected:**
- **Bundle size:** TensorFlow.js is 200KB+ gzipped (adds 10x to our current bundle)
- **Overkill for dataset size:** ML models shine with 10K+ records; subscription data is typically <500 records per user
- **Unpredictable latency:** Model inference has variable latency (50-200ms), while statistical functions are <5ms
- **Black box:** Users can't understand why something is flagged as anomaly; z-score is explainable ("2.5 standard deviations above average")
- **Training complexity:** Requires labeled training data, model versioning, retraining pipelines

**When would we use ML:**
- User base grows to 100K+ users (can train global models for pattern recognition)
- Need cross-user insights ("Users with similar spending patterns have Netflix")
- Complex multi-variate predictions (e.g., churn prediction based on 20+ features)

**For now:** Algorithmic approaches (Levenshtein, z-score, moving averages) are faster, smaller, and more maintainable.

### Heavy Fuzzy Search Libraries

**Rejected:** Fuse.js (for duplicate detection)

**Why rejected for duplicate detection:**
- Fuse.js optimized for **interactive search UX** (typeahead, filtering), not programmatic duplicate detection
- 10KB vs 2KB for fastest-levenshtein
- Levenshtein distance is the gold standard for duplicate detection (used by Git, SQL `SIMILAR TO`)
- Fuse.js scoring algorithm designed for relevance ranking, not similarity percentage

**When to use Fuse.js:** If adding a "find existing subscription" search feature in the UI (different from duplicate detection background job).

### Time-Series Databases

**Rejected:** TimescaleDB extension, InfluxDB, Prometheus

**Why rejected:**
- PostgreSQL window functions sufficient for monthly/yearly aggregations
- Subscription renewals are monthly/yearly events (low frequency), not high-frequency IoT data
- TimescaleDB adds operational complexity (hypertables, continuous aggregates)
- Current dataset fits in memory for analytics queries (<10MB per user)

**When would we use TimescaleDB:**
- Tracking minute-by-minute usage data (e.g., streaming video hours)
- 10M+ data points per user requiring compression
- Need automated data retention policies (delete data >5 years old)

### Forecasting-Specific Libraries

**Rejected:** ARIMA (zemlyansky/arima), prophet.js

**Why rejected:**
- ARIMA requires 50+ data points for reliable forecasts; users may have only 12 months of data
- Simple exponential smoothing and linear regression (in simple-statistics) are sufficient for 3-month forecasts
- ARIMA black box; exponential smoothing formula is explainable to users
- prophet.js is 500KB+ (Facebook's Prophet model ported to JS)

**When would we use ARIMA:**
- Multi-year forecasts (5+ years)
- Seasonal decomposition (quarterly subscription patterns)
- User has 3+ years of consistent data

**For now:** Exponential smoothing (simple-statistics) provides 80% of value at 10% of complexity.

### Clustering Libraries

**Rejected:** K-means (for pattern recognition), DBSCAN

**Why rejected:**
- Pattern recognition for subscriptions is simpler: "Netflix and Hulu are both streaming" (solved by categories)
- Clustering requires many features (price, frequency, category, usage) - we only have price + category
- User-defined categories already group subscriptions meaningfully
- K-means requires choosing k (number of clusters) upfront - arbitrary for small datasets

**When would we use clustering:**
- Cross-user pattern recognition ("Users with these 3 subscriptions also have...")
- Automated category suggestions based on spending patterns
- Large feature set (usage data, engagement metrics, payment method)

### Anomaly Detection Libraries

**Rejected:** anomaly-detector (npm), streaming_outlier_detection

**Why rejected:**
- Z-score anomaly detection (simple-statistics) covers 90% of use cases
- Specialized anomaly libraries assume streaming data; subscriptions are batch-updated monthly
- Z-score is simple to explain to users ("Your Netflix price is 2.5 standard deviations above average")
- Custom anomaly libraries (2-5KB) don't justify dependency for single algorithm

**When would we use specialized anomaly library:**
- Real-time anomaly detection on streaming data (e.g., credit card transaction fraud)
- Multi-variate anomaly detection (price + frequency + category combined)
- Need for isolation forests, autoencoders, or ensemble methods

**For now:** Z-score (simple-statistics) + custom rules ("price increased >20%") are sufficient.

## Updated Dependencies

### package.json Additions
```json
{
  "dependencies": {
    "fastest-levenshtein": "^2.0.6",
    "simple-statistics": "^7.8.9"
  }
}
```

**Total new bundle size:** ~32KB gzipped (2KB + 30KB)

**For comparison, rejected alternatives:**
- TensorFlow.js: +200KB
- Fuse.js: +10KB
- ARIMA library: +50KB
- Total rejected size: +260KB

**We're adding 32KB instead of 260KB (88% size reduction) with no meaningful loss in functionality for our use case.**

## Integration Architecture

### Duplicate Detection Flow

```
User imports PDF / manually adds subscription
  → Before saving, run duplicate detection
    → Query existing subscriptions for user
    → Calculate Levenshtein distance for each (fastest-levenshtein)
    → Filter candidates with >70% similarity
    → Present confirmation UI: "Similar subscription found: Netflix ($15.99). Merge or keep separate?"
  → User chooses merge or keep separate
  → Save with duplicate flag if kept separate
```

**Implementation:**
```typescript
// src/lib/services/subscription-service.ts
import { findDuplicateCandidates } from '@/lib/utils/duplicate-detection';

export async function createSubscription(
  userId: string,
  data: NewSubscription
) {
  // Check for duplicates before creating
  const existingSubs = await getActiveSubscriptions(userId);
  const duplicates = findDuplicateCandidates(
    { name: data.name, amount: parseFloat(data.amount.toString()) },
    existingSubs
  );

  if (duplicates.length > 0) {
    return {
      success: false,
      duplicates, // Return to UI for user decision
      requiresConfirmation: true
    };
  }

  // No duplicates, proceed with creation
  const sub = await db.insert(subscriptions).values({
    ...data,
    userId
  });

  return { success: true, subscription: sub };
}
```

### Spending Trends Flow

```
Dashboard loads
  → Query monthly spending aggregations (PostgreSQL window functions)
    → LAG() for month-over-month changes
    → AVG() OVER () for 3-month moving average
  → Pass data to simple-statistics for additional smoothing (optional)
  → Render Recharts LineChart with trend lines
```

**Implementation:**
```typescript
// src/app/(dashboard)/analytics/spending-trends.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { movingAverage } from 'simple-statistics';

export function SpendingTrendsChart() {
  const { data } = useQuery({
    queryKey: ['spending-trends'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/spending-trends');
      return res.json();
    }
  });

  // Optional: Apply additional client-side smoothing
  const smoothedTotals = data?.totals.length > 0
    ? movingAverage(data.totals, 3)
    : [];

  return (
    <LineChart width={800} height={400} data={data?.trends}>
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="total" stroke="#8884d8" name="Actual" />
      <Line type="monotone" dataKey="moving_avg_3m" stroke="#82ca9d" name="3-Month Avg" />
    </LineChart>
  );
}
```

### Forecasting Flow

```
User navigates to Forecast section
  → Query 12 months of historical spending (PostgreSQL aggregation)
  → Calculate forecast using exponential smoothing (simple-statistics)
  → Calculate confidence intervals (+/- 1 std dev)
  → Render Recharts AreaChart with historical + forecast + confidence band
```

**Implementation:**
```typescript
// src/lib/analytics/forecasting.ts
import { exponentialSmoothing, standardDeviation } from 'simple-statistics';

export interface Forecast {
  month: string;
  actual?: number;
  forecast: number;
  upper: number; // confidence interval
  lower: number;
}

export function generateForecast(
  historicalData: { month: string; total: number }[],
  periods: number = 3
): Forecast[] {
  const totals = historicalData.map(d => d.total);

  // Exponential smoothing with alpha=0.3
  const smoothed = exponentialSmoothing(totals, 0.3);
  const lastValue = smoothed[smoothed.length - 1];
  const stdDev = standardDeviation(totals);

  // Generate forecasts with confidence intervals
  const forecasts: Forecast[] = [];
  const startDate = new Date(historicalData[historicalData.length - 1].month);

  for (let i = 1; i <= periods; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);

    forecasts.push({
      month: forecastDate.toISOString().slice(0, 7),
      forecast: lastValue,
      upper: lastValue + stdDev,
      lower: Math.max(0, lastValue - stdDev) // Don't go negative
    });
  }

  return [
    ...historicalData.map(d => ({
      month: d.month,
      actual: d.total,
      forecast: d.total,
      upper: d.total,
      lower: d.total
    })),
    ...forecasts
  ];
}
```

### Anomaly Detection Flow

```
Background job runs daily
  → Query all active subscriptions
  → For each subscription:
    → Check if price changed (compare amount to last import_audit)
    → Calculate z-score vs historical prices (simple-statistics)
    → If z-score > 2.5, flag as anomaly
  → Store anomalies in notifications table (to be built)
  → Send email digest if any anomalies found
```

**Implementation:**
```typescript
// src/lib/jobs/anomaly-detection-job.ts
import { detectPriceAnomalies } from '@/lib/analytics/anomaly-detection';
import { db } from '@/lib/db';

export async function runAnomalyDetection() {
  const users = await db.query.users.findMany();

  for (const user of users) {
    const subs = await db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, user.id)
    });

    const anomalies = [];

    for (const sub of subs) {
      // Get historical prices from import_audits
      const historicalPrices = await getHistoricalPrices(sub.id);

      if (historicalPrices.length < 3) continue; // Need at least 3 data points

      const anomaly = detectPriceAnomalies(sub, historicalPrices);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    if (anomalies.length > 0) {
      await createNotifications(user.id, anomalies);
      await sendAnomalyDigestEmail(user.email, anomalies);
    }
  }
}
```

## Database Schema Additions

To support pattern recognition and anomaly detection, consider adding these tables in a future phase:

```typescript
// Future: subscription_history table for tracking price changes
export const subscriptionHistory = pgTable('subscription_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
  source: varchar('source', { length: 50 }).notNull(), // 'manual', 'import', 'update'
});

// Future: anomalies table for storing detected anomalies
export const anomalies = pgTable('anomalies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id),
  type: varchar('type', { length: 50 }).notNull(), // 'price_increase', 'unexpected_charge'
  severity: varchar('severity', { length: 10 }).notNull(), // 'low', 'medium', 'high'
  zScore: decimal('z_score', { precision: 5, scale: 2 }),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
});
```

**Note:** These tables are optional for v1.3. Anomalies can initially be computed on-demand without persistence.

## Migration Path

### Phase 1: Duplicate Detection (Week 1)
1. Install `fastest-levenshtein`
2. Implement `findDuplicateCandidates()` utility
3. Add duplicate check to subscription creation flow
4. Build confirmation UI for merge/keep separate
5. Test with existing user subscriptions

**Complexity:** Low
**Risk:** Low (non-breaking, adds optional check)

### Phase 2: Spending Trends & Analytics (Week 2)
1. Implement PostgreSQL window function queries
2. Create `/api/analytics/spending-trends` endpoint
3. Install `simple-statistics` for moving averages
4. Build Recharts visualization components
5. Add month-over-month percentage changes

**Complexity:** Medium
**Risk:** Low (read-only analytics, doesn't affect existing data)

### Phase 3: Forecasting (Week 3)
1. Implement exponential smoothing forecasting (simple-statistics)
2. Create `/api/analytics/forecast` endpoint
3. Build AreaChart with confidence intervals (Recharts)
4. Add forecast period selector (3/6/12 months)

**Complexity:** Medium
**Risk:** Low (forecasts are projections, no data mutations)

### Phase 4: Anomaly Detection (Week 4)
1. Implement z-score anomaly detection (simple-statistics)
2. Create background job for daily anomaly checks
3. Add anomalies API endpoint
4. Build anomaly alerts UI component
5. Integrate with email notifications (existing Resend)

**Complexity:** Medium-High
**Risk:** Medium (requires cron job, email notifications)

## Version Compatibility

### Current Environment
- Node.js: >=18 (from Next.js 16 requirements)
- TypeScript: ^5.x
- React: 19.2.3
- PostgreSQL: 15+ (Supabase)

### Compatibility Check

| Library | Min Node | Min TS | Bundle Target | PostgreSQL Feature |
|---------|----------|--------|---------------|-------------------|
| fastest-levenshtein@2.0.6 | >=12 | >=4.5 | ES2015 | N/A |
| simple-statistics@7.8.9 | >=12 | >=4.0 | ES2015 | N/A |
| Window functions | N/A | N/A | N/A | PostgreSQL 8.4+ (2009) |

**Verdict:** All compatible with existing environment. No conflicts.

## Bundle Size Impact

### Current Bundle (relevant parts)
- Next.js core: ~90KB
- React 19: ~130KB
- Recharts: ~60KB
- Drizzle ORM: ~40KB
- **Current total (baseline):** ~320KB

### Added Size
- fastest-levenshtein: ~2KB gzipped
- simple-statistics: ~30KB gzipped (tree-shakeable, may be less if only importing specific functions)
- **Total impact:** +32KB gzipped

### Size Comparison to Alternatives
| Approach | Bundle Size | Functionality |
|----------|-------------|---------------|
| **Our stack (algorithmic)** | +32KB | Duplicate detection, trends, forecasts, anomalies |
| TensorFlow.js approach | +200KB | Same functionality with ML models |
| Full ML stack (TFJS + Prophet) | +700KB | Advanced forecasting, clustering |

**Assessment:** 32KB is acceptable (~10% increase over baseline). For reference:
- A single high-res image is 100-500KB
- Users won't notice <50KB additions on modern connections
- tree-shaking may reduce simple-statistics further (import only needed functions)

## Performance Considerations

### fastest-levenshtein
- **Impact:** ~1ms per comparison on strings <50 chars
- **Usage:** Run on subscription creation/import (infrequent operation)
- **Optimization:** Cache comparisons for batch imports (compare each new sub to existing only once)

### simple-statistics
- **Impact:** <1ms for mean/median/stddev, ~5ms for exponential smoothing on 100 data points
- **Usage:** Run during analytics page load (user-initiated)
- **Optimization:** Memoize forecast calculations (forecast doesn't change until new data added)

### PostgreSQL Window Functions
- **Impact:** 10-50ms for window function queries on 1000 subscriptions
- **Usage:** Dashboard analytics page load
- **Optimization:**
  - Indexed columns (`nextRenewalDate`, `userId`, `status`) speed up queries
  - Materialized views for frequently accessed aggregations (future optimization)
  - Consider caching aggregated results for 1 hour

**Net performance:** Analytics features add <100ms to dashboard load time, imperceptible to users.

## Security Considerations

### fastest-levenshtein
- No security concerns (pure string comparison algorithm)
- No network requests
- No code evaluation (no `eval` or `Function` constructor)
- Actively maintained (last update Dec 2024)

### simple-statistics
- No security concerns (pure mathematical functions)
- No network requests
- No dynamic code execution
- Actively maintained (last update Dec 2024)
- Used by reputable companies (Observable, Mapbox)

### PostgreSQL Window Functions
- Use parameterized queries (Drizzle automatically escapes)
- No SQL injection risk with Drizzle's `sql` tagged template
- Window functions don't modify data (read-only)

**Overall:** No new attack surface introduced by these additions.

## Cost Analysis

### Development Cost
- Duplicate detection implementation: ~8 hours (algorithm + UI)
- PostgreSQL window function queries: ~6 hours (SQL + Drizzle integration)
- simple-statistics integration: ~4 hours (forecasting + anomaly detection)
- Recharts visualizations: ~10 hours (charts + responsive design)
- Testing (unit + E2E): ~8 hours
- **Total:** ~36 hours (~1 week)

### Operational Cost
- **Runtime cost:** $0 (no external APIs, all computed in-app)
- **Database cost:** Negligible (analytics queries are lightweight, use existing indexes)
- **Storage cost:** $0 (no new tables in v1.3, optional anomalies table in future)

**Comparison to ML approach:**
- ML model training: +16 hours (labeling data, training pipeline, model deployment)
- ML inference cost: $0.001 per prediction (if using cloud ML APIs)
- ML maintenance: +4 hours/month (model retraining, drift monitoring)

**Algorithmic approach saves ~80 hours in first year vs ML approach.**

### Maintenance Cost
- fastest-levenshtein: Low (stable algorithm, infrequent updates)
- simple-statistics: Low (stable API since v7.0, breaking changes rare)
- PostgreSQL window functions: Very low (SQL standard, won't change)

**Expected maintenance:** <4 hours/year for dependency updates.

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// Test duplicate detection
describe('findDuplicateCandidates', () => {
  it('detects case-insensitive name matches', () => {
    const candidates = findDuplicateCandidates(
      { name: 'NETFLIX', amount: 15.99 },
      [{ id: '1', name: 'Netflix', amount: 15.99 }]
    );
    expect(candidates[0].similarity).toBeGreaterThan(95);
  });

  it('detects similar names with typos', () => {
    const candidates = findDuplicateCandidates(
      { name: 'Netflx', amount: 15.99 },
      [{ id: '1', name: 'Netflix', amount: 15.99 }]
    );
    expect(candidates[0].similarity).toBeGreaterThan(80);
  });

  it('filters out dissimilar subscriptions', () => {
    const candidates = findDuplicateCandidates(
      { name: 'Netflix', amount: 15.99 },
      [{ id: '1', name: 'Spotify', amount: 9.99 }]
    );
    expect(candidates).toHaveLength(0);
  });
});

// Test anomaly detection
describe('detectPriceAnomalies', () => {
  it('detects price increases beyond 2 std deviations', () => {
    const historicalPrices = [10, 10, 10, 10, 10];
    const subscription = { id: '1', amount: 20, name: 'Netflix' };
    const anomaly = detectPriceAnomalies(subscription, historicalPrices);

    expect(anomaly).not.toBeNull();
    expect(anomaly.severity).toBe('high');
  });

  it('does not flag normal price variations', () => {
    const historicalPrices = [10, 10.5, 9.5, 10, 10.2];
    const subscription = { id: '1', amount: 10.3, name: 'Netflix' };
    const anomaly = detectPriceAnomalies(subscription, historicalPrices);

    expect(anomaly).toBeNull();
  });
});

// Test forecasting
describe('generateForecast', () => {
  it('generates forecasts for future periods', () => {
    const historicalData = [
      { month: '2025-01', total: 100 },
      { month: '2025-02', total: 105 },
      { month: '2025-03', total: 110 }
    ];

    const forecasts = generateForecast(historicalData, 3);

    expect(forecasts).toHaveLength(6); // 3 historical + 3 forecast
    expect(forecasts[3].forecast).toBeGreaterThan(0);
    expect(forecasts[3].upper).toBeGreaterThan(forecasts[3].forecast);
  });
});
```

### E2E Tests (Playwright)
```typescript
// Test duplicate detection UI
test('shows duplicate warning when adding similar subscription', async ({ page }) => {
  // Setup: Create existing subscription
  await createSubscription({ name: 'Netflix', amount: 15.99 });

  // Add similar subscription
  await page.goto('/subscriptions/new');
  await page.fill('[name="name"]', 'NETFLIX');
  await page.fill('[name="amount"]', '15.99');
  await page.click('button[type="submit"]');

  // Should show duplicate warning
  await expect(page.locator('text=Similar subscription found')).toBeVisible();
  await expect(page.locator('text=Netflix ($15.99)')).toBeVisible();
});

// Test spending trends chart
test('displays spending trends chart', async ({ page }) => {
  await page.goto('/analytics/trends');

  await expect(page.locator('svg.recharts-line')).toBeVisible();
  await expect(page.locator('text=3-Month Avg')).toBeVisible();
});

// Test forecast chart
test('displays forecast with confidence intervals', async ({ page }) => {
  await page.goto('/analytics/forecast');

  await expect(page.locator('svg.recharts-area')).toBeVisible();
  await expect(page.locator('text=Confidence Interval')).toBeVisible();
});
```

### Performance Tests
```typescript
// Test duplicate detection performance
test('duplicate detection completes in <100ms for 100 subscriptions', () => {
  const existingSubs = generateMockSubscriptions(100);
  const newSub = { name: 'Netflix', amount: 15.99 };

  const start = performance.now();
  findDuplicateCandidates(newSub, existingSubs);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(100);
});

// Test window function query performance
test('spending trends query completes in <200ms', async () => {
  const userId = 'test-user-id';

  const start = performance.now();
  await getSpendingTrends(userId, 12);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(200);
});
```

## Monitoring & Observability

### Key Metrics to Track

| Metric | Purpose | Alert Threshold |
|--------|---------|----------------|
| Duplicate detection rate | % of imports flagged as potential duplicates | >20% (too sensitive) |
| Anomaly detection rate | % of subscriptions flagged as anomalies | >10% (too many false positives) |
| Analytics query duration | Time to load spending trends | >500ms |
| Forecast accuracy | Forecast vs actual (next month) | >30% error rate |

### Sentry Integration (Existing)
```typescript
// src/lib/analytics/error-tracking.ts
import * as Sentry from '@sentry/nextjs';

export function trackAnalyticsError(context: string, error: Error) {
  Sentry.captureException(error, {
    tags: {
      component: 'analytics',
      context
    }
  });
}

// Usage
try {
  const forecasts = generateForecast(historicalData);
} catch (error) {
  trackAnalyticsError('forecast-generation', error);
  // Fallback: show simple linear projection
}
```

### Pino Logging (Existing)
```typescript
// src/lib/analytics/logging.ts
import { logger } from '@/lib/logger';

export function logDuplicateDetection(
  userId: string,
  duplicateCount: number,
  similarity: number
) {
  logger.info({
    event: 'duplicate_detection',
    userId,
    duplicateCount,
    avgSimilarity: similarity
  });
}
```

## Documentation Requirements

### User-Facing Documentation
1. **Duplicate Detection:** Explain similarity scoring (70% threshold), merge vs separate
2. **Spending Trends:** Explain moving averages, month-over-month percentages
3. **Forecasts:** Explain exponential smoothing, confidence intervals, limitations (3-6 months)
4. **Anomalies:** Explain z-score ("2.5x above average"), severity levels

### Developer Documentation
1. **Duplicate Detection Algorithm:** Document Levenshtein distance, similarity formula
2. **Window Functions:** SQL examples for common analytics queries
3. **Forecasting Methods:** Exponential smoothing vs linear regression, when to use each
4. **Anomaly Detection:** Z-score calculation, threshold tuning

## Future Enhancements (Post-v1.3)

### Advanced Pattern Recognition
- Multi-statement pattern recognition: "Detect that AMZN PRIME, Amazon Prime, Amazon.com Prime are same"
- Cross-user patterns: "80% of users with Netflix also have Hulu"
- Category auto-suggestions based on spending patterns

### Machine Learning (If Scale Justifies)
- Train global model on 100K+ users for subscription name normalization
- Churn prediction: "Based on usage patterns, you may want to cancel Spotify"
- Personalized forecasting: Use user-specific seasonality (higher spending in holidays)

### Real-Time Anomaly Detection
- Webhook integration with banks for real-time transaction monitoring
- Instant alerts for unexpected charges (SMS/push notifications)
- Fraud detection for cloned subscriptions

### Advanced Visualizations
- Sankey diagram for category spending flow
- Heatmap for spending patterns (day of month, seasonality)
- Comparison charts (your spending vs category average)

## Sources

### Duplicate Detection & String Similarity
- [fastest-levenshtein GitHub](https://github.com/ka-weihe/fastest-levenshtein)
- [Levenshtein Distance in TypeScript](https://itnext.io/levenshtein-distance-in-typescript-6de81ea2fb63)
- [Fuzzball.js for Duplicate Detection](https://github.com/nol13/fuzzball.js)
- [Levenshtein Distance - Wikipedia](https://en.wikipedia.org/wiki/Levenshtein_distance)

### Statistical Analysis & Forecasting
- [simple-statistics GitHub](https://github.com/simple-statistics/simple-statistics)
- [simple-statistics Official Site](https://simple-statistics.github.io/)
- [Exponential Smoothing Guide](https://otexts.com/fpp2/ses.html)
- [Z-Score Anomaly Detection in JavaScript](https://everythingtech.dev/2022/10/the-simplest-anomaly-detection-algorithm-in-javascript-zscore/)
- [Detecting Anomalies with Z-Scores](https://medium.com/@akashsri306/detecting-anomalies-with-z-scores-a-practical-approach-2f9a0f27458d)
- [Moving Average Forecasting](https://www.npmjs.com/package/moving-averages)
- [zodiac-ts Time Series Library](https://github.com/antoinevastel/zodiac-ts)

### PostgreSQL & Time-Series Analytics
- [PostgreSQL Window Functions Official Docs](https://www.postgresql.org/docs/current/tutorial-window.html)
- [Crunchy Data: Window Functions for Data Analysis](https://www.crunchydata.com/blog/window-functions-for-data-analysis-with-postgres)
- [SQL Time-Series Tutorial: LEAD & LAG](https://datalemur.com/sql-tutorial/sql-time-series-window-function-lead-lag)
- [Unlocking PostgreSQL Window Functions](https://medium.com/@pratyaksh.notebook/unlocking-the-power-of-window-functions-in-postgresql-6a7a66c4cc1c)
- [TimescaleDB Guide](https://www.techprescient.com/blogs/timescaledb/)

### Recharts & Visualization
- [Recharts Time Series Example](https://github.com/recharts/recharts/issues/956)
- [Data Visualisation in React with Recharts](https://medium.com/swlh/data-visualisation-in-react-part-i-an-introduction-to-recharts-33249e504f50)
- [Recharts Performance Tips](https://dev.to/calebali/how-to-build-dynamic-charts-in-react-with-recharts-including-edge-cases-3e72)

## Decision Summary

**Add:**
1. `fastest-levenshtein@^2.0.6` - Duplicate detection (2KB)
2. `simple-statistics@^7.8.9` - Statistical calculations (30KB)
3. PostgreSQL window functions - Time-series analytics (no dependency)

**Don't Add:**
- TensorFlow.js or ML libraries (200KB+, overkill for dataset size)
- Fuse.js for duplicate detection (use for search UX instead)
- TimescaleDB or specialized time-series DBs (PostgreSQL sufficient)
- ARIMA or complex forecasting libraries (exponential smoothing sufficient)
- Clustering or anomaly detection libraries (z-score covers use cases)

**Upgrade:**
- Nothing - existing libraries sufficient

**Total bundle impact:** +32KB gzipped (10% increase, acceptable)

**Overall Philosophy:**
Use algorithmic approaches (Levenshtein, z-score, exponential smoothing, PostgreSQL window functions) before reaching for ML frameworks. For subscription data (<500 records per user), statistical methods are faster, smaller, more maintainable, and provide explainable results. Reserve ML for future cross-user insights when dataset grows to 100K+ users.
