# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Users can see all their subscriptions in one place and never get surprised by a renewal again
**Current focus:** Phase 17 - Spending Forecasting

## Current Position

Phase: 17 of 18 (Spending Forecasting)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-07 - Completed 17-01-PLAN.md (forecast foundation)

Progress: [████████████████░░] 97% (44/45 estimated total plans across all milestones)

## Performance Metrics

**Velocity:**
- Total plans completed: 44
- Average duration: ~7.0 min
- Total execution time: ~312 min (~5.2 hours)

**By Milestone:**

| Milestone | Plans | Total | Avg/Plan |
|-----------|-------|-------|----------|
| v1.0 MVP | 7 | ~57 min | ~8 min |
| v1.1 Import Improvements | 11 | ~70 min | ~6 min |
| v1.2 Production Polish | 10 | ~70 min | ~7 min |
| v1.3 Analytics (partial) | 14 | ~101 min | ~7.2 min |

**Recent Trend:**
- Last 5 plans: [8, 6, 10, 8, 7] min
- Trend: Steady execution with debugging spikes

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.
Summary of established patterns:

| Pattern | Description |
|---------|-------------|
| AI prompt comprehensive | Return ALL items with confidence scores, let user decide |
| Confidence thresholds | 80+ (high/green), 50-79 (medium/yellow), 0-49 (low/red) |
| Command palette | Use for searchable selectors (categories, sources) |
| Click-to-edit | Inline editing pattern for date fields |
| Transaction date source | Renewal dates derived from statement transaction dates |
| Delayed loading pattern | 200ms delay + 300ms minimum display to avoid flash |
| Touch targets | 44px (h-11) minimum for buttons/inputs (Apple HIG) |
| Error transformation | getErrorMessage converts technical errors to user-friendly messages |
| Retry detection | isRetryableError identifies transient failures for automatic retry |
| Materialized view pattern | CREATE MATERIALIZED VIEW with UNIQUE INDEX for CONCURRENTLY |
| Cron endpoint pattern | verify CRON_SECRET, log timing, return JSON response |
| Analytics API pattern | Query MV, convert currencies, aggregate by category |
| Hook invalidation pattern | useInvalidateAnalytics for mutation side-effects |
| Period selector pattern | Dropdown with getParams() for date calculations |
| Analytics cards grid | 2x2 mobile, 4-col desktop for responsive display |
| Similarity scoring | Return score (0-100) + matches object for field breakdown |
| Jaro-Winkler fuzzy matching | Use 0.8 threshold for name/source matches |
| Amount tolerance | 5% of average, same currency required |
| Duplicate detection threshold | 70% for detection, 85%+ defaults to Skip |
| Expandable comparison panel | Click badge to toggle comparison view |
| Duplicate action buttons | Keep Both / Skip / Merge pattern |
| Merge tracking pattern | mergedAt + mergedIntoId for soft delete with 24hr undo |
| Undo toast pattern | 10-second display with clickable undo action |
| Field picker defaults | Pre-select newer values, show identical as single option |
| Cross-resource ownership | Verify both existence AND userId before merge/update operations |
| Trends API pattern | Separate /api/analytics/trends endpoint for historical data |
| Spending indicator colors | Red=up (bad), green=down (good) - inverted from typical indicators |
| Chart empty state pattern | Show "More data needed" message with counts for insufficient history |
| YoY line styling | Solid primary for current year, dashed muted for previous year |
| Category chart colors | Use categoryColor from database for consistent color mapping |
| Pattern confidence scoring | Multi-factor (occurrence 30%, interval 40%, amount 30%) with 0-100 scale |
| Pattern confidence thresholds | MIN_DISPLAY=70, MEDIUM=50, HIGH=80 for display filtering |
| Keyword-based category guessing | Case-insensitive substring search through 14 category keyword lists |
| PostgreSQL window functions | LAG for time-series interval detection in pattern analysis |
| Fire-and-forget triggers | Background async operations don't block primary request |
| Pattern duplicate filtering | 70% similarity threshold prevents suggesting existing subscriptions |
| Forecast volatility | Coefficient of variation (CV) = stdDev/mean, default 20%, cap at 100% |
| sqrt(time) uncertainty scaling | Confidence intervals widen with sqrt(monthsAhead) for fan charts |
| Confidence interval floors | Lower bounds floored at 0 (spending cannot be negative) |

### Pending Todos

None yet.

### Blockers/Concerns

**v1.3 milestone concerns:**
- Analytics infrastructure must be established first (Phase 13 is foundation for all other phases) - RESOLVED: Phase 13 COMPLETE
- Duplicate detection false positive risk requires careful threshold calibration (start at 85% similarity) - RESOLVED: Phase 14 COMPLETE with 70% threshold
- Anomaly detection alert fatigue risk requires weekly batching, not real-time alerts
- Multi-currency handling needs transaction-time FX rates (not current rates)
- Forecast accuracy needs uncertainty visualization (prediction intervals, not point estimates) - IN PROGRESS: 17-01 adds confidence intervals

**Carried forward from v1.2:**
- RESEND_FROM_EMAIL needs verified domain for production email delivery
- NEXT_PUBLIC_SENTRY_DSN and related env vars needed for Sentry error tracking

**From 13-01:**
- Database migration 0002_create_analytics_mv.sql must be run manually via Supabase SQL Editor (user confirmed this is done)

**From 14-03:**
- Database migration 0002_gorgeous_surge.sql adds mergedAt/mergedIntoId columns - run via `npm run db:push` or Supabase SQL Editor

**From 16-01:**
- Database migration 0003_old_azazel.sql adds recurring_patterns table - run via `npm run db:push` or Supabase SQL Editor

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 17-01-PLAN.md (forecast foundation)
Resume file: None
Next step: Execute 17-02-PLAN.md (monthly/annual APIs)
