# Phase 16: Pattern Recognition - Research

**Researched:** 2026-02-06
**Domain:** Recurring Payment Pattern Detection, Time Series Analysis, PostgreSQL Window Functions
**Confidence:** HIGH

## Summary

Pattern Recognition automatically detects recurring subscription charges across multiple bank statement imports by analyzing transaction history for patterns in merchant name, amount, and payment intervals. The system uses PostgreSQL window functions (LAG) to calculate intervals between charges, applies fuzzy matching for merchant names, and generates confidence scores based on pattern strength. Users see suggested subscriptions on the dashboard with evidence (dates, amounts, frequency) and can accept to create a subscription or dismiss permanently.

The implementation leverages the existing Jaro-Winkler similarity algorithm from Phase 14 (duplicate detection), uses PostgreSQL window functions for time-series interval analysis, and follows the established dashboard card pattern from Phase 15. Pattern storage uses a new `recurring_patterns` table with `dismissed_at` soft delete. The confidence scoring combines multiple factors: occurrence count, interval consistency, amount variance, and name similarity.

**Primary recommendation:** Build PostgreSQL-based pattern detection query using window functions and raw SQL via Drizzle's `sql` template, create new table for pattern storage with dismissal tracking, implement dashboard card component following Phase 15's trend cards pattern, reuse similarity.ts for merchant name fuzzy matching, use 10-second toast with undo matching Phase 14's merge pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.1 | Pattern table schema + raw SQL for window functions | Already used for all database operations; supports `sql` template for complex queries |
| PostgreSQL Window Functions | Built-in | LAG function for interval calculation between charges | Native PostgreSQL feature for time-series analysis, no additional library needed |
| string-comparison | 1.3.0 | Jaro-Winkler fuzzy matching for merchant names | Already installed and used in Phase 14 for duplicate detection |
| TanStack Query | Installed | Fetch patterns, invalidate after accept/dismiss | Already used throughout app for server state management |
| Sonner | 2.0.7 | Success toast with 10-second undo after accepting pattern | Already used for Phase 14 merge undo pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Installed | Calculate days between charges for interval detection | Already used throughout app for date manipulation |
| shadcn/ui Card | Installed | Dashboard pattern suggestion card | Already used for all dashboard widgets |
| React Hook Form + Zod | Installed | Validation for pattern acceptance API | Already used for all form submissions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL window functions | Client-side pattern detection | Would require fetching all transactions to browser, O(n²) performance, no database optimization |
| Separate patterns table | Store patterns on subscriptions table | Loses dismissal history, can't track "user said no" state |
| ML-based confidence scoring | Rule-based scoring algorithm | Over-engineering for well-defined problem, adds complexity with no clear benefit |
| Dedicated time-series DB (TimescaleDB) | Standard PostgreSQL with window functions | Overkill for simple interval detection, adds infrastructure dependency |
| Store full transaction history | Analyze only import_audits + subscriptions | Phase scope is pattern detection, not transaction storage |

**Installation:**
```bash
# All dependencies already installed
# Just need schema migration for patterns table
npm run db:generate  # Generate migration for recurring_patterns table
npm run db:migrate   # Apply migration
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── dashboard/
│   │   ├── pattern-suggestions-card.tsx    # NEW - Dashboard card showing X patterns detected
│   │   ├── pattern-suggestion-item.tsx     # NEW - Individual pattern with evidence + actions
│   │   └── analytics-cards.tsx             # EXISTING - Reference for card layout
│   └── subscriptions/
│       └── duplicate-comparison.tsx         # EXISTING - Reference for side-by-side comparison
├── lib/
│   ├── db/
│   │   └── schema.ts                        # MODIFY - Add recurring_patterns table
│   ├── hooks/
│   │   ├── use-pattern-suggestions.ts       # NEW - Fetch active suggestions
│   │   ├── use-accept-pattern.ts            # NEW - Accept pattern mutation with undo
│   │   ├── use-dismiss-pattern.ts           # NEW - Dismiss pattern mutation
│   │   └── use-duplicate-scan.ts            # EXISTING - Reference for mutation pattern
│   ├── utils/
│   │   ├── pattern-detection.ts             # NEW - Confidence score calculation
│   │   ├── category-guesser.ts              # NEW - AI-free category matching from merchant name
│   │   └── similarity.ts                    # EXISTING - Reuse Jaro-Winkler for merchants
│   └── validations/
│       └── patterns.ts                      # NEW - Zod schemas for accept/dismiss
└── app/
    ├── (dashboard)/
    │   └── dashboard/
    │       └── page.tsx                     # MODIFY - Add PatternSuggestionsCard
    └── api/
        └── patterns/
            ├── detect/
            │   └── route.ts                 # NEW - POST - Run detection query, store patterns
            ├── suggestions/
            │   └── route.ts                 # NEW - GET - Fetch active suggestions for user
            ├── accept/
            │   └── route.ts                 # NEW - POST - Create subscription, mark accepted
            └── dismiss/
                └── route.ts                 # NEW - POST - Soft delete pattern
```

### Pattern 1: PostgreSQL Window Functions with LAG for Interval Detection
**What:** Use LAG() to compare each transaction with the previous occurrence from the same merchant
**When to use:** Detecting time intervals between recurring events in time-series data
**Example:**
```typescript
// Source: PostgreSQL Window Functions documentation + Drizzle sql template
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

// Detection query using window functions
const detectionQuery = sql`
  WITH merchant_transactions AS (
    SELECT
      s.id as subscription_id,
      s.name as merchant_name,
      s.amount::numeric as amount,
      s.currency,
      s.created_at as charge_date,
      s.import_audit_id,
      ia.statement_source,
      LAG(s.created_at) OVER (
        PARTITION BY
          LOWER(s.name),  -- Group by merchant (case-insensitive)
          s.currency      -- Same currency only
        ORDER BY s.created_at
      ) as prev_charge_date,
      LAG(s.amount::numeric) OVER (
        PARTITION BY LOWER(s.name), s.currency
        ORDER BY s.created_at
      ) as prev_amount
    FROM subscriptions s
    LEFT JOIN import_audits ia ON s.import_audit_id = ia.id
    WHERE s.user_id = ${userId}
      AND s.created_at >= NOW() - INTERVAL '12 months'  -- 12-month window
      AND s.import_audit_id IS NOT NULL  -- Only imported charges
  ),
  patterns_with_intervals AS (
    SELECT
      merchant_name,
      currency,
      COUNT(*) as occurrence_count,
      ARRAY_AGG(charge_date ORDER BY charge_date) as charge_dates,
      ARRAY_AGG(amount ORDER BY charge_date) as amounts,
      AVG(amount) as avg_amount,
      STDDEV(amount) as amount_stddev,
      -- Calculate average days between charges
      AVG(
        EXTRACT(EPOCH FROM (charge_date - prev_charge_date)) / 86400
      )::integer as avg_interval_days,
      -- Calculate interval standard deviation
      STDDEV(
        EXTRACT(EPOCH FROM (charge_date - prev_charge_date)) / 86400
      )::integer as interval_stddev
    FROM merchant_transactions
    WHERE prev_charge_date IS NOT NULL  -- Exclude first occurrence
    GROUP BY merchant_name, currency
    HAVING COUNT(*) >= 2  -- Minimum 2 occurrences
  )
  SELECT * FROM patterns_with_intervals
  WHERE occurrence_count >= 2;
`;

// Execute with Drizzle
const rawPatterns = await db.execute(detectionQuery);
```
**Why this works:**
- LAG() efficiently compares each charge with the previous charge from same merchant
- PARTITION BY groups by merchant+currency so LAG looks only within same merchant
- ORDER BY ensures chronological comparison
- STDDEV measures consistency (lower = more regular pattern)
- Single query processes all patterns without N+1 queries

### Pattern 2: Multi-Factor Confidence Score Algorithm
**What:** Weighted scoring combining occurrence count, interval consistency, amount variance
**When to use:** Converting pattern detection data into user-facing confidence scores (0-100)
**Example:**
```typescript
// src/lib/utils/pattern-detection.ts
interface DetectedPattern {
  merchantName: string;
  currency: string;
  occurrenceCount: number;
  chargeDates: Date[];
  amounts: number[];
  avgAmount: number;
  amountStddev: number;
  avgIntervalDays: number;
  intervalStddev: number;
}

interface ConfidenceFactors {
  occurrenceScore: number;    // 0-30 points (more occurrences = stronger)
  intervalScore: number;      // 0-40 points (consistent intervals = stronger)
  amountScore: number;        // 0-30 points (similar amounts = stronger)
}

export function calculatePatternConfidence(
  pattern: DetectedPattern
): { score: number; factors: ConfidenceFactors; frequency: 'monthly' | 'yearly' | null } {
  // Factor 1: Occurrence count (0-30 points)
  // 2 occurrences = 15, 3 = 20, 4 = 25, 5+ = 30
  const occurrenceScore = Math.min(30, 10 + (pattern.occurrenceCount * 5));

  // Factor 2: Interval consistency (0-40 points)
  // Lower stddev relative to average = more consistent = higher score
  const intervalCv = pattern.intervalStddev / pattern.avgIntervalDays; // Coefficient of variation
  const intervalScore = Math.max(0, 40 - (intervalCv * 100));

  // Factor 3: Amount consistency (0-30 points)
  // Similar amounts across charges = higher score
  const amountCv = pattern.amountStddev / pattern.avgAmount;
  const amountScore = Math.max(0, 30 - (amountCv * 100));

  const totalScore = Math.round(occurrenceScore + intervalScore + amountScore);

  // Detect frequency from average interval (±7 days tolerance)
  let frequency: 'monthly' | 'yearly' | null = null;
  if (Math.abs(pattern.avgIntervalDays - 30) <= 7) {
    frequency = 'monthly';
  } else if (Math.abs(pattern.avgIntervalDays - 365) <= 7) {
    frequency = 'yearly';
  }

  return {
    score: Math.min(100, totalScore), // Cap at 100
    factors: { occurrenceScore, intervalScore, amountScore },
    frequency,
  };
}
```

### Pattern 3: Fuzzy Merchant Name Matching for Duplicate Filtering
**What:** Reuse Jaro-Winkler algorithm to check if pattern matches existing subscription
**When to use:** Filtering out patterns that already exist as subscriptions before showing suggestions
**Example:**
```typescript
// src/lib/utils/pattern-detection.ts
import { calculateSimilarity, type SubscriptionRecord } from './similarity';

interface Pattern {
  merchantName: string;
  avgAmount: number;
  currency: string;
  frequency: 'monthly' | 'yearly';
}

/**
 * Check if a detected pattern matches an existing subscription
 * Returns true if pattern should be hidden (already exists)
 */
export function patternMatchesExistingSubscription(
  pattern: Pattern,
  existingSubscriptions: SubscriptionRecord[]
): boolean {
  for (const sub of existingSubscriptions) {
    const result = calculateSimilarity(
      {
        name: pattern.merchantName,
        amount: pattern.avgAmount,
        currency: pattern.currency,
        frequency: pattern.frequency,
      },
      sub
    );

    // Use same 70% threshold as duplicate detection
    if (result.score >= 70) {
      return true; // Pattern matches existing subscription
    }
  }

  return false; // Pattern is new
}
```
**Rationale:** Reuses existing duplicate detection logic to avoid showing patterns for subscriptions user already tracks manually.

### Pattern 4: Category Guessing from Merchant Name
**What:** Simple keyword-based category matching without AI
**When to use:** Pre-filling category when user accepts a pattern suggestion
**Example:**
```typescript
// src/lib/utils/category-guesser.ts
import type { Category } from '@/lib/db/schema';

// Keyword mapping to category slugs
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  streaming: ['netflix', 'hulu', 'disney', 'hbo', 'prime video', 'paramount', 'peacock', 'apple tv'],
  software: ['adobe', 'microsoft', 'github', 'figma', 'notion', 'slack', 'zoom', 'dropbox', 'google workspace'],
  gaming: ['xbox', 'playstation', 'nintendo', 'steam', 'epic games', 'twitch'],
  music: ['spotify', 'apple music', 'youtube music', 'tidal', 'soundcloud'],
  news: ['nytimes', 'wsj', 'washington post', 'atlantic', 'economist'],
  health: ['fitness', 'peloton', 'calm', 'headspace', 'myfitnesspal'],
  cloud: ['icloud', 'google one', 'onedrive', 'dropbox'],
  finance: ['quickbooks', 'mint', 'ynab', 'turbotax'],
  utilities: ['phone', 'internet', 'electric', 'gas', 'water'],
};

/**
 * Guess category from merchant name using keyword matching
 * Returns null if no confident match found
 */
export function guessCategory(
  merchantName: string,
  categories: Category[]
): string | null {
  const lowerMerchant = merchantName.toLowerCase();

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMerchant.includes(keyword)) {
        // Find matching category by slug
        const category = categories.find(c => c.slug === slug);
        return category?.id ?? null;
      }
    }
  }

  return null; // No match - let user choose
}
```
**Why keyword-based:** Simple, fast, predictable. No API calls, no training data needed, easy to debug and extend.

### Anti-Patterns to Avoid
- **Storing raw transaction data:** Phase scope is pattern detection, not transaction storage. Derive patterns from existing subscriptions/imports, don't duplicate data.
- **Client-side pattern detection:** Expensive O(n²) comparisons belong in PostgreSQL, not browser. Use database for heavy lifting.
- **Re-running detection on every dashboard load:** Detection is expensive. Run on schedule (daily cron) or after imports, cache results in recurring_patterns table.
- **Showing dismissed patterns again:** Once user dismisses, honor that decision permanently unless pattern changes significantly (e.g., new occurrences increase confidence by 20+ points).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy string matching for merchants | Custom Levenshtein or edit distance algorithm | Jaro-Winkler via string-comparison (already installed) | Jaro-Winkler specifically optimized for short strings like names, handles typos/abbreviations better than edit distance |
| Time interval calculations | Manual date arithmetic with 86400 magic numbers | date-fns differenceInDays, addMonths, addYears | Handles edge cases (DST, leap years, month boundaries) that manual math breaks on |
| Confidence score thresholding | Magic numbers scattered in code | Centralized constants with comments explaining thresholds | Same confidence tier system as existing codebase (80+ high, 50-79 medium, 0-49 low) |
| Toast notifications with undo | Custom timer + state management | Sonner with action prop (already used in Phase 14) | Handles toast queue, timer pause on hover, accessibility, mobile responsiveness |
| Window function queries | Multiple sequential queries with application-side joins | Single PostgreSQL query with LAG window function | Database executes orders of magnitude faster, handles NULL edge cases correctly, scales to thousands of records |

**Key insight:** Pattern detection is fundamentally a database problem (time-series analysis over large record sets). Push computation to PostgreSQL where it belongs. The browser just displays pre-computed results.

## Common Pitfalls

### Pitfall 1: Not Filtering Already-Tracked Subscriptions
**What goes wrong:** User sees pattern suggestion for "Netflix $15.99/month" but they already have Netflix subscription tracked manually. Suggestion feels redundant and annoying.
**Why it happens:** Detection query looks only at imported charges, doesn't cross-reference with existing manually-entered subscriptions.
**How to avoid:** After detection, filter patterns against active subscriptions using similarity algorithm (≥70% match = hide pattern).
**Warning signs:** User feedback like "why is it suggesting things I already have?" or duplicate subscription entries after accepting patterns.

### Pitfall 2: Treating NULL Intervals as Zero
**What goes wrong:** LAG() returns NULL for first occurrence (no previous charge to compare). If treated as 0, interval calculations break with division by zero or nonsense averages.
**Why it happens:** PostgreSQL aggregate functions (AVG, STDDEV) skip NULLs by default, but manual calculations might not.
**How to avoid:** Always filter `WHERE prev_charge_date IS NOT NULL` before aggregating intervals. Never include first occurrence in interval calculations.
**Warning signs:** Extremely high confidence scores for single-occurrence merchants, division by zero errors in logs.

### Pitfall 3: Ignoring Currency Mismatches
**What goes wrong:** Pattern detection groups "Spotify $9.99 USD" with "Spotify £9.99 GBP" as same pattern, then suggests nonsense frequency/amount.
**Why it happens:** Forgot to partition window function by currency.
**How to avoid:** Always include currency in PARTITION BY clause for LAG. Add currency to GROUP BY in aggregation.
**Warning signs:** Patterns with mixed currency amounts in `amounts` array, incorrect average calculations.

### Pitfall 4: Re-showing Dismissed Patterns on Every Detection Run
**What goes wrong:** User dismisses "Spotify" pattern, but next detection run finds it again and shows it again. Frustrating UX.
**Why it happens:** Detection query doesn't check `dismissed_at` in recurring_patterns table.
**How to avoid:** LEFT JOIN detection results with existing patterns, exclude where `dismissed_at IS NOT NULL` unless pattern strengthened significantly (20+ point confidence increase).
**Warning signs:** User feedback about "I keep dismissing this", high dismiss-to-accept ratio in analytics.

### Pitfall 5: Showing Patterns with Confidence < 70%
**What goes wrong:** Dashboard cluttered with low-quality suggestions that user rejects, erodes trust in feature.
**Why it happens:** No minimum confidence threshold applied in suggestions query.
**How to avoid:** Store all detected patterns (even low confidence) for analytics, but only show ≥70% in dashboard. Filter in API, not in UI component.
**Warning signs:** High dismiss rate, user feedback about "too many irrelevant suggestions".

## Code Examples

Verified patterns from official sources and existing codebase:

### PostgreSQL LAG Window Function with Interval Calculation
```sql
-- Source: PostgreSQL official documentation + existing Drizzle usage
-- Calculate days between charges for each merchant
SELECT
  merchant_name,
  charge_date,
  prev_charge_date,
  EXTRACT(EPOCH FROM (charge_date - prev_charge_date)) / 86400 as days_since_last
FROM (
  SELECT
    name as merchant_name,
    created_at as charge_date,
    LAG(created_at) OVER (
      PARTITION BY LOWER(name), currency
      ORDER BY created_at
    ) as prev_charge_date
  FROM subscriptions
  WHERE user_id = $1 AND import_audit_id IS NOT NULL
) subquery
WHERE prev_charge_date IS NOT NULL;
```

### Drizzle Raw SQL Query with Type Safety
```typescript
// Source: Drizzle ORM sql template documentation
import { sql } from 'drizzle-orm';

interface PatternRow {
  merchant_name: string;
  currency: string;
  occurrence_count: number;
  charge_dates: Date[];
  amounts: string[]; // PostgreSQL returns numeric as string
  avg_amount: string;
  amount_stddev: string | null;
  avg_interval_days: number | null;
  interval_stddev: number | null;
}

// Type-safe raw SQL execution
const patterns = await db.execute<PatternRow>(sql`
  -- Complex detection query here
`);

// Convert PostgreSQL numeric strings to numbers
const processedPatterns = patterns.rows.map(p => ({
  ...p,
  amounts: p.amounts.map(a => parseFloat(a)),
  avgAmount: parseFloat(p.avg_amount),
  amountStddev: p.amount_stddev ? parseFloat(p.amount_stddev) : 0,
}));
```

### React Hook for Pattern Acceptance with Undo Toast
```typescript
// Source: Existing use-merge-subscription.ts pattern
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAcceptPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patternId: string) => {
      const response = await fetch('/api/patterns/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId }),
      });
      if (!response.ok) throw new Error('Failed to accept pattern');
      return response.json();
    },
    onSuccess: (data, patternId) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['patterns'] });

      toast.success('Subscription added from pattern', {
        description: 'Pattern suggestion accepted.',
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await fetch('/api/patterns/undo', {
                method: 'POST',
                body: JSON.stringify({ patternId }),
              });
              queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
              queryClient.invalidateQueries({ queryKey: ['patterns'] });
              toast.success('Pattern acceptance undone');
            } catch (error) {
              toast.error('Failed to undo');
            }
          },
        },
        duration: 10000, // 10-second undo window
      });
    },
  });
}
```

### Dashboard Card Component Pattern
```typescript
// Source: Existing AnalyticsCards component from Phase 15
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface PatternSuggestionsCardProps {
  patterns: Pattern[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function PatternSuggestionsCard({
  patterns,
  onAccept,
  onDismiss,
}: PatternSuggestionsCardProps) {
  if (patterns.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          {patterns.length} Pattern{patterns.length > 1 ? 's' : ''} Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {patterns.map(pattern => (
          <PatternSuggestionItem
            key={pattern.id}
            pattern={pattern}
            onAccept={() => onAccept(pattern.id)}
            onDismiss={() => onDismiss(pattern.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side pattern detection with loops | PostgreSQL window functions (LAG/LEAD) | PostgreSQL 8.4+ (2009) | 10-100x performance improvement, handles thousands of records efficiently |
| Manual date arithmetic for intervals | EXTRACT(EPOCH FROM interval) / 86400 | PostgreSQL built-in | Handles timezones, DST, leap seconds correctly |
| AI/ML for category guessing | Simple keyword mapping | N/A - pattern recognition doesn't need ML complexity | Faster, more predictable, no API costs, easier to debug |
| Separate time-series database | PostgreSQL with window functions | PostgreSQL 11+ window function improvements (2018) | No additional infrastructure, same ACID guarantees, simpler deployment |
| Edit distance for fuzzy matching | Jaro-Winkler algorithm | Academic research (1990s) | Better for short strings (merchant names), handles transpositions well |

**Deprecated/outdated:**
- **Serial primary keys**: Use `uuid().defaultRandom()` instead (already established in codebase)
- **Storing confidence as percentage string**: Store as integer 0-100, not "85%" string
- **Manual SQL string concatenation**: Use Drizzle's `sql` template for parameterized queries
- **UNION for combining patterns**: Use CTEs (WITH clause) for better readability and PostgreSQL query planner optimization

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal pattern re-evaluation frequency**
   - What we know: Roadmap says "re-evaluate patterns on every import" but doesn't specify if existing patterns should be updated or only new patterns detected
   - What's unclear: Should we increase confidence score of existing pattern when new occurrence found, or create new pattern entry?
   - Recommendation: Update existing pattern (increment occurrence_count, append to charge_dates array) if merchant+currency+frequency match exactly. This shows pattern strengthening over time. Store update timestamp to potentially re-show dismissed patterns if confidence jumps 20+ points.

2. **Handling pattern frequency changes**
   - What we know: Some subscriptions change frequency (yearly → monthly) due to promotions or user action
   - What's unclear: Should we detect frequency changes and notify user, or treat as separate patterns?
   - Recommendation: Treat monthly and yearly as separate patterns initially. Future enhancement could detect frequency changes, but out of scope for Phase 16 MVP.

3. **Pattern confidence recalibration after user feedback**
   - What we know: Users accepting/dismissing patterns provides signal about algorithm accuracy
   - What's unclear: Should we adjust confidence score weighting based on historical accept/dismiss rates?
   - Recommendation: Track accept/dismiss rates in analytics but don't auto-tune algorithm in Phase 16. Manual tuning after observing real usage data is safer than automated adjustment that could drift in wrong direction.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL Window Functions Official Documentation](https://www.postgresql.org/docs/current/tutorial-window.html) - LAG/LEAD syntax, PARTITION BY usage
- [Drizzle ORM sql Template Documentation](https://orm.drizzle.team/docs/sql) - Type-safe raw SQL queries
- [PostgreSQL LAG Function Examples (Neon)](https://neon.com/postgresql/postgresql-window-function/postgresql-lag-function) - Interval calculation patterns
- Existing codebase - src/lib/utils/similarity.ts (Jaro-Winkler implementation), src/lib/hooks/use-merge-subscription.ts (undo toast pattern)

### Secondary (MEDIUM confidence)
- [Recurring Payment Detection by Subaio](https://subaio.com/subaio-explained/how-does-subaio-detect-recurring-payments) - Industry approach to pattern detection (98.7% accuracy with similar methods)
- [Plaid Recurring Transactions](https://plaid.com/blog/recurring-transactions/) - 3 occurrences minimum for "matured stream" (we use 2 for earlier detection)
- [Time Series Pattern Detection (Baeldung)](https://www.baeldung.com/cs/pattern-recognition-time-series) - Autocorrelation and Fourier transform approaches (decided against for simplicity)
- [PostgreSQL Window Functions for IoT (EDB)](https://www.enterprisedb.com/blog/using-window-functions-time-series-iot-analytics-postgres-bdr) - Real-world window function usage patterns

### Tertiary (LOW confidence)
- [Confidence Scores in ML (Ultralytics)](https://www.ultralytics.com/glossary/confidence) - Confidence score concepts (adapted to rule-based algorithm rather than ML)
- [RobustPeriod Framework (arXiv)](https://arxiv.org/pdf/2002.09535) - Advanced periodicity detection (overkill for our use case but informed interval consistency scoring)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, PostgreSQL window functions are well-documented and stable since 2009
- Architecture: HIGH - Leverages existing patterns (Phase 14 similarity, Phase 15 dashboard cards), minimal new concepts
- Pitfalls: HIGH - Documented from real-world issues (NULL handling, currency mismatches) and existing codebase patterns
- Detection algorithm: MEDIUM - Confidence scoring weights are educated guesses, will need tuning based on real user data

**Research date:** 2026-02-06
**Valid until:** 90 days (stable domain - PostgreSQL window functions and pattern detection are mature technologies)
