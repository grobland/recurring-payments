# Project Research Summary

**Project:** Subscription Manager v1.3 - Data & Intelligence
**Domain:** Subscription analytics with AI-powered duplicate detection, pattern recognition, spending forecasting, and anomaly alerts
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

The v1.3 Data & Intelligence milestone adds analytical capabilities to the existing subscription manager: duplicate detection, multi-statement pattern recognition, spending trends (MoM/YoY), forecasting, and anomaly alerts. Research reveals a critical architectural insight: **use PostgreSQL analytics with lightweight algorithmic libraries instead of heavyweight ML frameworks.**

The existing stack already provides 80% of needed capabilities through PostgreSQL window functions, Recharts visualization, and timestamped data structures. Only three lightweight additions are recommended: **fastest-levenshtein** (~2KB) for duplicate detection via Levenshtein distance, **simple-statistics** (~30KB) for statistical calculations (z-score, moving averages, exponential smoothing), and PostgreSQL's native window functions for time-series analytics. This adds 32KB to the bundle vs 200KB+ for ML frameworks like TensorFlow.js, with no meaningful accuracy loss for typical subscription datasets (100-500 records per user).

The primary risk is **false positive explosion in duplicate detection**. With 300 subscriptions, there are 44,850 possible pairs - even 99.99% specificity yields 4 false positives per scan. Prevention requires multi-signal confidence scoring (name similarity + amount match + frequency match), blocking strategies to reduce comparison space by 90%+, and showing evidence not just confidence scores. The critical finding: intelligence features fail when they make autonomous suggestions about existing user data without calibrated confidence. One bad duplicate suggestion erodes trust in all AI features, not just duplicates.

## Key Findings

### Recommended Stack

Research recommends **algorithmic approaches over ML frameworks** for subscription data. For datasets with 100-500 records per user, statistical methods (Levenshtein distance, z-score anomaly detection, exponential smoothing forecasts) are faster, smaller (32KB vs 200KB+), more maintainable, and provide explainable results that users can verify.

**Core technologies:**
- **fastest-levenshtein (2KB)**: Duplicate detection via edit distance - benchmarked 2-5x faster than alternatives, provides both distance() and closest() functions
- **simple-statistics (30KB)**: Mean, median, z-score, moving averages, exponential smoothing - comprehensive, zero dependencies, tree-shakeable
- **PostgreSQL window functions (no dependency)**: LAG/LEAD for MoM changes, NTILE for percentile ranking, AVG OVER for moving averages - already available in Supabase
- **Recharts (existing)**: 67.6% faster than Chart.js for datasets >100K points due to virtual DOM optimization

**What NOT to add:**
- TensorFlow.js/ML libraries: 200KB+ bundle size, unpredictable latency, black box results unsuitable for small datasets
- Fuse.js for duplicate detection: Optimized for search UX not programmatic similarity scoring, 10KB vs 2KB
- TimescaleDB: Overkill for monthly/yearly subscription events (not high-frequency IoT data)
- ARIMA/Prophet forecasting: Requires 50+ data points, adds 500KB+, exponential smoothing sufficient for 3-6 month forecasts

### Expected Features

Research reveals duplicate detection and spending analytics are **table stakes** (users expect them), while advanced pattern recognition and forecasting are **differentiators** that set the product apart.

**Must have (table stakes):**
- Duplicate detection on import - prevents importing same subscription twice, standard in all import flows
- Basic spending totals - sum of active subscriptions grouped by period (monthly/annual)
- Category spending breakdown - see which categories cost most, standard in finance apps
- Upcoming renewals calendar - next 30/60/90 days with grouped display
- Price increase detection - alert when subscription price changes

**Should have (competitive):**
- Background duplicate scanning - proactively find duplicates in existing subscriptions (not just imports)
- Multi-statement pattern detection - identify recurring charges across multiple imports
- Spending forecast calendar - visual calendar showing predicted future spending
- MoM/YoY trend charts - line charts showing spending evolution over time
- Anomaly detection alerts - notify when spending deviates from normal patterns

**Defer (v2+):**
- AI-generated spending insights - NLG complexity, uncertain ROI
- Category benchmarking - requires aggregate user data, privacy concerns
- Real-time bank monitoring - Plaid integration adds security/compliance burden
- Automatic subscription cancellation - liability risk, requires account access

### Architecture Approach

Research shows the optimal architecture combines **PostgreSQL-native extensions** (fuzzystrmatch for duplicate detection, BRIN indexes for time-series), **computed aggregates** (materialized views for analytics), and **hybrid processing** (batch background jobs for pattern recognition, real-time for anomaly detection).

**Major components:**
1. **Materialized Views for Analytics** - Pre-compute category spending, time-series trends, and subscription patterns; refresh every 15 minutes via Vercel cron; reduces query time from 200-500ms to 5-10ms
2. **Database-Side Fuzzy Matching** - Enable fuzzystrmatch and pg_trgm extensions; use Soundex pre-filter + Levenshtein distance for 100x performance improvement (100ms to 1ms for 15K records)
3. **Server-Side Forecast Calculation + Client-Side Visualization** - Calculate forecasts (moving average/exponential smoothing) in API route; render with Recharts fan charts showing prediction intervals (not point estimates)
4. **Hybrid Anomaly Detection** - Rules-based detection (price changes) in real-time on subscription updates; pattern-based detection (spending spikes) in daily background job; weekly digest instead of per-anomaly alerts

### Critical Pitfalls

1. **Quadratic False Positive Explosion** - With 300 subscriptions (44,850 pairs), even 99.99% specificity yields 4 false positives. Prevention: use blocking (group by amount first to reduce comparison space 90%+), multi-signal confidence scoring (name + amount + frequency + category + date proximity), show evidence not just confidence, learn from user feedback to calibrate thresholds

2. **Pattern Recognition Cold Start Problem** - ML-based suggestions require 100+ data points; median user has insufficient data for meaningful patterns. Prevention: use rule-based heuristics ("if video streaming but no music, suggest Spotify"), transfer learning from aggregate data (pre-computed co-occurrence patterns), graceful degradation with explicit messaging ("Add 10 subscriptions for suggestions")

3. **Multi-Currency Analytics with Wrong Exchange Rate Timing** - Using current rates for historical transactions means analytics measure "currency market performance" not "user spending behavior." Prevention: store FX rates at transaction time in database, use monthly averages for forecasts, show currency breakdown not just converted totals, warn users about FX volatility exposure

4. **Forecasting Without Uncertainty Bands** - Showing "$245.67" (false precision) without uncertainty creates miscalibrated expectations; 19% error is excellent for time-series forecasting but user expects ±$5 accuracy not ±$50. Prevention: show prediction intervals (80% and 95% confidence bands), visualize uncertainty with fan charts, explain forecast limitations upfront, track accuracy over time

5. **Anomaly Detection Alert Fatigue** - Static thresholds generate 5-10 alerts per week (annual renewals, user-initiated changes, small fluctuations); after 2 weeks users ignore all alerts or disable them. Prevention: learn user-specific baselines (not global thresholds), use sliding window to avoid alerting after intentional changes, batch alerts weekly (not real-time), learn from user feedback to calibrate thresholds

## Implications for Roadmap

Based on research, suggested phase structure prioritizes foundational analytics infrastructure first, then builds progressively more complex intelligence features:

### Phase 1: Analytics Infrastructure (Foundation)
**Rationale:** All other features depend on pre-computed analytics (forecasting needs trends, anomalies need baselines). Must establish materialized views and background job infrastructure before building intelligence features.

**Delivers:**
- Materialized views for category spending, spending trends, subscription patterns
- `/api/analytics/summary` endpoint querying pre-computed data
- Vercel cron job for 15-minute view refresh
- Updated analytics page consuming pre-computed data instead of client-side aggregation

**Stack:** PostgreSQL materialized views, Drizzle raw SQL support, Vercel cron jobs

**Addresses:** Basic spending totals (table stakes), category spending breakdown (table stakes), time-series foundation for trends

**Avoids:** Analytics queries without indexes (Pitfall #8 - performance degrades at scale)

**Estimated Effort:** 5-6 days

### Phase 2: Duplicate Detection
**Rationale:** Independent feature valuable for import flow; established AI confidence calibration pattern from PDF imports provides trust foundation; must be built with conservative thresholds to avoid eroding user trust.

**Delivers:**
- fuzzystrmatch and pg_trgm PostgreSQL extensions enabled
- `/api/subscriptions/duplicates` endpoint with Soundex pre-filter + Levenshtein distance
- `<DuplicateWarning />` component with multi-signal evidence display
- Duplicate detection integration in subscription form and import review
- Background duplicate scanning job (optional for v1.3)

**Stack:** fastest-levenshtein (2KB), PostgreSQL fuzzystrmatch

**Addresses:** Duplicate detection on import (table stakes), manual duplicate marking (table stakes), background duplicate scanning (differentiator)

**Avoids:** Quadratic false positive explosion (Pitfall #1 - critical) via blocking, multi-signal scoring, evidence display; import timing issues (Pitfall #7 - moderate) via importAuditId checks

**Estimated Effort:** 4-5 days

### Phase 3: Spending Analytics & Trends
**Rationale:** Builds on Phase 1 infrastructure; high user visibility; low technical risk; establishes multi-currency handling patterns for forecasting.

**Delivers:**
- MoM/YoY trend charts with percentage changes
- Category trend analysis (which categories growing/shrinking)
- Subscription clustering (grouping similar subscriptions)
- Multi-currency aggregation with FX rate storage at transaction time
- Recharts LineChart and PieChart visualizations

**Stack:** simple-statistics (moving averages), PostgreSQL window functions (LAG/LEAD), Recharts

**Addresses:** MoM/YoY trend charts (differentiator), category trend analysis (differentiator), subscription clustering (differentiator)

**Avoids:** Multi-currency with wrong FX timing (Pitfall #3 - critical) via stored transaction-time rates; deleted subscriptions in historical analytics (Pitfall #12 - minor) via inclusive queries

**Estimated Effort:** 5-6 days

### Phase 4: Spending Forecasting
**Rationale:** Requires stable analytics data from Phase 3; pure computation with no side effects (low risk); must include uncertainty visualization from day 1.

**Delivers:**
- Spending forecast API endpoint with exponential smoothing
- 6-month forecast calendar with prediction intervals (80% and 95% confidence bands)
- Fan chart visualization with Recharts AreaChart
- Forecast limitations explanation in UI
- Known renewal events incorporated (annual subscriptions)

**Stack:** simple-statistics (exponentialSmoothing, linearRegression), Recharts AreaChart

**Addresses:** Spending forecast calendar (differentiator), spending projections (differentiator), renewal density heatmap (optional)

**Avoids:** Accuracy expectations without uncertainty (Pitfall #4 - important) via prediction intervals; ignoring seasonality (Pitfall #6 - moderate) via seasonal adjustment factors; ignoring known events (Pitfall #9 - moderate) via annual renewal calendar integration

**Estimated Effort:** 4-5 days

### Phase 5: Anomaly Detection & Alerts
**Rationale:** Most complex feature; requires historical data from Phase 3 to establish baselines; false positive risk needs careful calibration; start with rules-based detection (price changes), expand to pattern-based (spending spikes) only after validating thresholds.

**Delivers:**
- `anomalies` table and schema
- Rules-based price change detection (real-time on subscription update)
- Pattern-based spending spike detection (daily background job)
- `/api/anomalies` endpoint with user-specific filtering
- `<AnomalyAlerts />` component with dismissible alerts
- Weekly digest email (not per-anomaly alerts)
- User feedback tracking for threshold calibration

**Stack:** simple-statistics (mean, standardDeviation, zScore), background job infrastructure

**Addresses:** Price increase detection (table stakes), missed renewal detection (differentiator), spending deviation alerts (differentiator)

**Avoids:** Alert fatigue from uncalibrated thresholds (Pitfall #5 - critical) via user-specific baselines, sliding window for intentional changes, weekly batching, feedback learning

**Estimated Effort:** 5-6 days

### Phase Ordering Rationale

- **Phase 1 first**: Analytics infrastructure is dependency for all other phases (forecasting needs trends, anomalies need baselines, duplicate detection benefits from pattern data)
- **Phase 2 early**: Duplicate detection is independent, high-value for imports, establishes AI trust calibration
- **Phase 3 before 4**: Forecasting requires stable historical analytics data with correct multi-currency handling
- **Phase 5 last**: Anomaly detection most complex, needs validated analytics foundation, false positive risk requires careful tuning with real user data

**Parallelization opportunity:** Phases 2 and 4 can be developed in parallel after Phase 1 completes (no dependencies on each other)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Anomaly Detection):** Threshold calibration is user-specific and domain-specific; may need additional research during implementation to tune false positive rates with real data; consider `/gsd:research-phase` if initial thresholds generate too many alerts

Phases with standard patterns (skip research-phase):
- **Phase 1 (Analytics Infrastructure):** PostgreSQL materialized views are well-documented with established patterns; Vercel cron jobs standard for Next.js background processing
- **Phase 2 (Duplicate Detection):** Levenshtein distance is gold standard for fuzzy matching; PostgreSQL fuzzystrmatch widely used in production
- **Phase 3 (Spending Analytics):** Window functions and Recharts integration follow established Next.js patterns
- **Phase 4 (Forecasting):** Exponential smoothing is well-understood time-series technique with clear implementation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | fastest-levenshtein and simple-statistics are official npm packages (1.6M and 500K weekly downloads); PostgreSQL window functions are standard features; Recharts already in use |
| Features | HIGH | Table stakes clear from banking/finance app research (Brex, Wave, PocketSmith); differentiators based on 2026 fintech trends and subscription apps (Rocket Money, Monarch) |
| Architecture | HIGH | Materialized views proven PostgreSQL pattern; fuzzy matching with fuzzystrmatch widely used; Recharts performance benefits documented (67.6% faster than Chart.js for large datasets) |
| Pitfalls | HIGH | False positive quadratic growth documented in research (arxiv.org/abs/1907.02821); cold start problem well-known in recommender systems; alert fatigue documented in cybersecurity literature (59% report too many alerts) |

**Overall confidence:** HIGH

### Gaps to Address

Areas where research was conclusive but implementation needs validation:

- **Duplicate detection threshold calibration:** Research shows 70%+ similarity threshold recommended, but optimal value depends on actual subscription name patterns in production data; start with 85% (conservative), adjust based on user feedback tracking in `duplicate_decisions` table

- **Anomaly detection false positive rate:** Research shows z-score >2.5 is standard statistical threshold, but subscription spending has user-specific volatility; validate with first 50 users, calculate FPR from `anomaly_feedback` table, adjust thresholds if FPR >20%

- **Forecast accuracy validation:** Research shows MAPE 15-25% is typical for monthly forecasts, but actual accuracy depends on user subscription stability (high churn = lower accuracy); track actual vs predicted in `spending_forecasts` table, show accuracy metrics in UI after 3+ months

- **Multi-currency FX data source:** Research recommends transaction-time spot rates, but needs decision on FX data provider (e.g., exchangerate-api.io free tier: 1500 requests/month); confirm during implementation that free tier sufficient for user base growth projections

- **Materialized view refresh performance:** Research shows concurrent refresh takes 5-10s for 100K subscriptions, but Vercel Pro has 60s timeout; validate refresh completes within timeout at target scale (1000 users × 200 subscriptions = 200K records); if timeout occurs, split into user-segmented views refreshed in sequence

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- [PostgreSQL fuzzystrmatch Documentation](https://www.postgresql.org/docs/current/fuzzystrmatch.html) - Official PostgreSQL fuzzy matching extension
- [PostgreSQL Materialized Views Documentation](https://www.postgresql.org/docs/current/rules-materializedviews.html) - Official PostgreSQL materialized views feature
- [fastest-levenshtein GitHub](https://github.com/ka-weihe/fastest-levenshtein) - Official npm package (1.6M weekly downloads)
- [simple-statistics GitHub](https://github.com/simple-statistics/simple-statistics) - Official npm package (500K weekly downloads)
- [Recharts vs Chart.js Performance](https://www.oreateai.com/blog/recharts-vs-chartjs-navigating-the-performance-maze-for-big-data-visualizations/) - Benchmarked 67.6% faster for large datasets

**Features Research:**
- [Brex: Prevent Duplicate Payments](https://www.brex.com/spend-trends/accounting/prevent-duplicate-payments-in-accounts-payable) - Duplicate detection patterns in financial apps
- [PocketSmith: Duplicate Transactions](https://learn.pocketsmith.com/article/1419-duplicate-transactions-in-accounts-with-a-bank-feed) - Fuzzy matching in subscription tracking
- [AWS Cost Anomaly Detection](https://aws.amazon.com/aws-cost-management/aws-cost-anomaly-detection/) - Anomaly detection patterns in spending analytics

**Architecture Research:**
- [Fuzzy Name Matching in PostgreSQL - Crunchy Data](https://www.crunchydata.com/blog/fuzzy-name-matching-in-postgresql) - Production implementation patterns with Soundex pre-filtering
- [Optimizing Materialized Views in PostgreSQL](https://medium.com/@ShivIyer/optimizing-materialized-views-in-postgresql-best-practices-for-performance-and-efficiency-3e8169c00dc1) - Concurrent refresh best practices
- [Vercel Cron Jobs](https://vercel.com/templates/next.js/vercel-cron) - Official Vercel cron job implementation

**Pitfalls Research:**
- [Benchmarking Unsupervised Near-Duplicate Detection](https://arxiv.org/abs/1907.02821) - False positive rates grow quadratically with dataset size (peer-reviewed research)
- [Cold Start Problem in Machine Learning](https://www.kdnuggets.com/2019/01/data-scientist-dilemma-cold-start-machine-learning.html) - Pattern recognition requires 100+ data points
- [Alert Fatigue Is Killing Your SOC](https://torq.io/blog/cybersecurity-alert-management-2026/) - 59% of leaders report too many alerts as main inefficiency
- [Multi-Currency Financial Management Challenges](https://controllerscouncil.org/navigating-the-challenges-of-multi-currency-financial-management/) - Transaction risk from exchange rate timing

### Secondary (MEDIUM confidence)

- [Data Ladder: Fuzzy Matching 101](https://dataladder.com/fuzzy-matching-101/) - Duplicate detection best practices in CRM systems
- [Subscription Market 2026: 76 Million Users](https://senalnews.com/en/data/subscription-market-2026-data-from-76-million-users-shows-retention-now-outweighs-acquisition) - Subscription spending seasonality patterns
- [Evaluating Forecast Accuracy](https://otexts.com/fpp2/accuracy.html) - Time-series forecasting error metrics (MAPE 15-25% typical)
- [Rocket Money Review](https://www.rocketmoney.com/) - Feature benchmark for competitive analysis

### Tertiary (LOW confidence)

- [Multi-Currency Support in Google Analytics - A Flawed Feature](https://brianclifton.com/blog/2013/02/15/multi-currency-support-in-google-analytics-a-flawed-feature/) - Pitfalls of daily rate adjustments (older but still relevant)
- [Detecting Anomalies with Z-Scores](https://medium.com/@akashsri306/detecting-anomalies-with-z-scores-a-practical-approach-2f9a0f27458d) - Statistical anomaly detection tutorial (needs validation with production data)

---
*Research completed: 2026-02-05*
*Ready for roadmap: yes*
