# Phase 23: AI Suggestions & Pattern Detection - Research

**Researched:** 2026-02-09
**Domain:** Pattern detection algorithms, UI for suggestions management, bulk operations, timeline visualization
**Confidence:** HIGH

## Summary

This phase builds on existing pattern detection infrastructure already implemented in the codebase. The system already has:
- Database schema with `recurring_patterns` table
- Detection algorithm using SQL window functions (LAG) to identify recurring charges
- Confidence scoring system (0-100 scale) with three tiers (high/medium/low)
- Basic API routes for detect, suggestions, accept, and dismiss
- Dashboard widget showing pattern suggestions with accept/dismiss actions

**What's needed:** Expand the existing basic implementation into a full-featured suggestions management system with a dedicated page, bulk operations, timeline visualization, evidence display improvements, and auto-tagging integration with transaction imports.

**Primary recommendation:** Build on the existing pattern detection infrastructure by creating a dedicated `/suggestions` page using shadcn/ui components, leveraging the existing bulk operations pattern from transaction tagging, and integrating Recharts for timeline visualization of charge occurrences.

## Standard Stack

The codebase already uses a consistent stack that this phase should continue:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.2.3 | UI framework | Latest stable, already in use |
| Next.js 16 | 16.1.4 | App framework with App Router | Already established in codebase |
| TypeScript | ^5 | Type safety | Fully adopted throughout codebase |
| TanStack Query | ^5.90.19 | Data fetching/caching | Used for all API interactions |
| Drizzle ORM | ^0.45.1 | Database queries | Established ORM with existing schema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | - | Component library (Radix UI + Tailwind) | All UI components (Card, Badge, Accordion, Checkbox, etc.) |
| Recharts | ^3.7.0 | Chart visualization | Timeline visualization of charge occurrences |
| sonner | ^2.0.7 | Toast notifications | Import completion toasts, bulk action feedback |
| date-fns | ^4.1.0 | Date manipulation | Date formatting, interval calculations |
| Zod | ^4.3.5 | Schema validation | API request/response validation |
| Lucide React | ^0.562.0 | Icon library | Consistent icons throughout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Apache ECharts, Nivo | Recharts already installed, simpler API for small charts |
| sonner | react-toastify, react-hot-toast | sonner already integrated with shadcn/ui |
| TanStack Query | SWR, custom fetch | TanStack Query established pattern in codebase |

**Installation:**
No new dependencies required - all libraries already installed.

## Architecture Patterns

### Existing Pattern Detection Infrastructure

The codebase already has pattern detection implemented:

**Database Schema:**
```typescript
// src/lib/db/schema.ts (lines 400-445)
export const recurringPatterns = pgTable(
  "recurring_patterns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    merchantName: varchar("merchant_name", { length: 255 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    occurrenceCount: integer("occurrence_count").notNull(),
    avgAmount: decimal("avg_amount", { precision: 10, scale: 2 }).notNull(),
    amountStddev: decimal("amount_stddev", { precision: 10, scale: 2 }),
    avgIntervalDays: integer("avg_interval_days"),
    intervalStddev: integer("interval_stddev"),
    detectedFrequency: frequencyEnum("detected_frequency"), // monthly | yearly | null
    chargeDates: jsonb("charge_dates").$type<string[]>().notNull(),
    amounts: jsonb("amounts").$type<number[]>().notNull(),
    confidenceScore: integer("confidence_score").notNull(), // 0-100
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdSubscriptionId: uuid("created_subscription_id").references(() => subscriptions.id),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  }
);
```

**Confidence Scoring Algorithm:**
```typescript
// src/lib/utils/pattern-detection.ts
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,    // Green - high confidence pattern
  MEDIUM: 50,  // Yellow - medium confidence
  LOW: 0,      // Red - low confidence
  MIN_DISPLAY: 70,  // Minimum score to show suggestion
} as const;

// Scoring factors (0-100 total):
// - Occurrence count (0-30): More occurrences = stronger pattern
// - Interval consistency (0-40): Lower stddev relative to average = more regular
// - Amount consistency (0-30): Lower stddev relative to average = more stable
```

### Recommended Project Structure
```
src/
├── app/(dashboard)/
│   └── suggestions/
│       └── page.tsx                    # NEW: Dedicated suggestions page
├── components/
│   ├── suggestions/                    # NEW: Suggestion-specific components
│   │   ├── suggestion-card.tsx        # Individual suggestion with expand
│   │   ├── suggestion-timeline.tsx    # Recharts timeline visualization
│   │   ├── evidence-list.tsx          # Transaction list with links
│   │   ├── confidence-badge.tsx       # Reusable confidence score badge
│   │   └── bulk-actions-bar.tsx       # Multi-select toolbar
│   └── transactions/
│       └── transaction-status-badge.tsx # MODIFY: Add "AI Suggested" variant
├── lib/
│   ├── hooks/
│   │   ├── use-pattern-suggestions.ts  # EXISTS: Fetch suggestions
│   │   ├── use-accept-pattern.ts       # EXISTS: Accept mutation
│   │   ├── use-dismiss-pattern.ts      # EXISTS: Dismiss mutation
│   │   └── use-bulk-patterns.ts        # NEW: Bulk accept/dismiss
│   ├── utils/
│   │   └── pattern-detection.ts        # EXISTS: Confidence scoring
│   └── validations/
│       └── patterns.ts                  # EXISTS: Zod schemas
└── app/api/
    ├── patterns/
    │   ├── detect/route.ts              # EXISTS: Run detection
    │   ├── suggestions/route.ts         # EXISTS: Fetch suggestions
    │   ├── accept/route.ts              # EXISTS: Accept pattern
    │   ├── dismiss/route.ts             # EXISTS: Dismiss pattern
    │   └── bulk/route.ts                # NEW: Bulk operations
    └── batch/
        └── process/route.ts             # MODIFY: Trigger detection after import
```

### Pattern 1: Detection Query with SQL Window Functions
**What:** Use PostgreSQL LAG window function to calculate intervals between recurring charges
**When to use:** Pattern detection runs after imports or on schedule
**Example:**
```sql
-- Source: src/app/api/patterns/detect/route.ts (lines 35-78)
WITH merchant_transactions AS (
  SELECT
    s.name as merchant_name,
    s.amount::numeric as amount,
    s.currency,
    s.last_renewal_date as charge_date,
    LAG(s.last_renewal_date) OVER (
      PARTITION BY LOWER(s.name), s.currency
      ORDER BY s.last_renewal_date
    ) as prev_charge_date
  FROM subscriptions s
  WHERE s.user_id = $userId
    AND s.last_renewal_date >= $windowStart
    AND s.import_audit_id IS NOT NULL
)
SELECT
  merchant_name,
  COUNT(*) as occurrence_count,
  AVG(interval_days) as avg_interval_days,
  STDDEV(interval_days) as interval_stddev
FROM merchant_transactions
GROUP BY merchant_name, currency
HAVING COUNT(*) >= 2
```
**Why this works:** PostgreSQL window functions efficiently calculate intervals without self-joins, enabling pattern detection on large transaction datasets.

### Pattern 2: Bulk Operations with Multi-Select UI
**What:** Checkbox-based selection with bulk action toolbar (accept all, dismiss all)
**When to use:** Users need to process multiple suggestions at once
**Example:**
```typescript
// Similar pattern from src/lib/hooks/use-bulk-tag-transactions.ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const bulkAccept = useMutation({
  mutationFn: async (patternIds: string[]) => {
    const response = await fetch("/api/patterns/bulk", {
      method: "POST",
      body: JSON.stringify({ patternIds, action: "accept" }),
    });
    return response.json();
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: patternKeys.lists() });
    toast.success(`Accepted ${data.count} suggestion${data.count > 1 ? "s" : ""}`);
  },
});
```
**Key features:**
- Set-based selection tracking for O(1) lookups
- Indeterminate checkbox state for "select all"
- Keyboard accessibility (Space/Enter for selection)
- Optimistic UI updates with invalidation

### Pattern 3: Expandable Evidence with Accordion
**What:** Compact card view that expands to show transaction history and timeline
**When to use:** Default view is high-density, details revealed on demand
**Example:**
```typescript
// Source: Radix UI Accordion pattern used in existing codebase
<Accordion type="multiple">
  {suggestions.map((pattern) => (
    <AccordionItem key={pattern.id} value={pattern.id}>
      <AccordionTrigger>
        {/* Compact view: merchant, amount, count, confidence */}
      </AccordionTrigger>
      <AccordionContent>
        {/* Expanded: timeline + transaction list */}
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```
**Benefits:** Follows shadcn/ui patterns, accessible by default, smooth animations.

### Pattern 4: Timeline Visualization with Recharts
**What:** Small scatter plot or bar chart showing charge dates with amount variance
**When to use:** Expanded evidence view to visualize pattern regularity
**Example:**
```typescript
// Based on Recharts usage in src/components/dashboard/category-chart.tsx
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip } from "recharts";

const chartData = pattern.chargeDates.map((date, i) => ({
  date: new Date(date).getTime(),
  amount: pattern.amounts[i],
}));

<ResponsiveContainer width="100%" height={100}>
  <ScatterChart>
    <XAxis
      dataKey="date"
      type="number"
      domain={['dataMin', 'dataMax']}
      tickFormatter={(ts) => format(ts, 'MMM yyyy')}
    />
    <YAxis dataKey="amount" hide />
    <Scatter data={chartData} fill="#8884d8" />
    <Tooltip
      content={({ payload }) => {
        if (!payload?.[0]) return null;
        const point = payload[0].payload;
        return (
          <div className="bg-popover border rounded p-2">
            <p>{format(point.date, 'MMM d, yyyy')}</p>
            <p>{formatCurrency(point.amount, pattern.currency)}</p>
          </div>
        );
      }}
    />
  </ScatterChart>
</ResponsiveContainer>
```
**Alternative:** Simple CSS-based timeline dots if chart feels heavy.

### Pattern 5: Auto-Tagging During Import
**What:** Tag transactions as "potential_subscription" based on confidence threshold during PDF processing
**When to use:** Real-time during batch import processing
**Example:**
```typescript
// Source: src/app/api/batch/process/route.ts (lines 137-140)
const transactionRecords = parseResult.subscriptions.map((item) => ({
  // ... other fields
  tagStatus: item.confidence >= 80
    ? ("potential_subscription" as const)
    : ("unreviewed" as const),
  confidenceScore: item.confidence,
}));

// After import completes, trigger pattern detection
await fetch("/api/patterns/detect", { method: "POST" });
```
**Integration point:** Existing batch process already has confidence-based tagging logic.

### Anti-Patterns to Avoid

- **Don't re-fetch suggestions on every action:** Use TanStack Query's optimistic updates and invalidation patterns
- **Don't make timeline visualization blocking:** Load timeline data lazily when accordion expands
- **Don't run pattern detection synchronously during import:** Trigger async after all transactions inserted
- **Don't show dismissed patterns again:** Database has `dismissedAt` field - respect it in queries
- **Don't auto-accept patterns:** Even high confidence (>80%) should require user review per CONTEXT decisions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select state management | Custom Set/Array logic | TanStack Query with Set-based selection | Handles edge cases (select all, shift+click ranges) |
| Toast notifications | Custom snackbar component | sonner (already installed) | Accessible, stacks properly, action buttons built-in |
| Date interval visualization | Custom SVG timeline | Recharts ScatterChart or BarChart | Responsive, handles edge cases, tooltip built-in |
| Pattern detection SQL | Custom aggregation logic | PostgreSQL LAG window function | Database-optimized, handles gaps correctly |
| Confidence score display | Custom colored badge | shadcn/ui Badge with CVA variants | Consistent with codebase, dark mode support |
| Bulk API operations | Multiple sequential requests | Single bulk endpoint with transaction | Prevents partial failures, faster |
| Transaction linking | Manual ID tracking | Use `convertedToSubscriptionId` relation | Already in schema, prevents orphans |

**Key insight:** The codebase already has excellent patterns for bulk operations (see `use-bulk-tag-transactions.ts`), multi-select UI (transaction browser), and collapsible evidence (pattern suggestion item). Extend these patterns rather than reinventing.

## Common Pitfalls

### Pitfall 1: Pattern Detection Performance at Scale
**What goes wrong:** Running detection query on 10k+ transactions without proper indexing causes slow queries
**Why it happens:** Window functions (LAG) can be expensive without indexes on partition columns
**How to avoid:**
- Ensure indexes exist: `index("subscriptions_user_id_idx").on(userId)` (already exists)
- Add compound index on `(user_id, last_renewal_date)` if detection is slow
- Limit detection window (default 12 months) to avoid processing years of data
**Warning signs:** Detection POST endpoint takes >2 seconds to respond

### Pitfall 2: Amount Variance Misinterpretation
**What goes wrong:** Flagging legitimate subscriptions as low confidence due to price changes (e.g., annual increase)
**Why it happens:** Amount stddev penalty in confidence scoring
**How to avoid:**
- Show amount variance flag in UI: "Amounts vary significantly - possible price change"
- Don't auto-dismiss patterns with amount variance
- Display all amounts in evidence list (already implemented in `pattern-suggestion-item.tsx`)
**Warning signs:** User feedback that known subscriptions aren't suggested

### Pitfall 3: Duplicate Patterns After Re-Import
**What goes wrong:** Re-importing same statement creates duplicate pattern suggestions
**Why it happens:** Detection doesn't check for existing patterns with same merchant+currency
**How to avoid:**
- Detection API already upserts patterns (lines 186-216 in `detect/route.ts`)
- Statement hash prevents duplicate imports (`statements_user_hash_idx`)
- Pattern detection filters already-converted subscriptions (lines 157-176)
**Warning signs:** Multiple cards for same merchant with different occurrence counts

### Pitfall 4: Bulk Accept Race Conditions
**What goes wrong:** Accepting multiple patterns simultaneously creates duplicate subscriptions
**Why it happens:** Parallel API calls don't lock the pattern record
**How to avoid:**
- Implement bulk endpoint with database transaction
- Lock pattern rows with `SELECT FOR UPDATE` during bulk accept
- Use TanStack Query mutation to serialize accepts if bulk not implemented
**Warning signs:** User reports duplicate subscriptions after bulk accept

### Pitfall 5: Timeline Visualization Clutter
**What goes wrong:** Timeline becomes unreadable with 12+ data points in small container
**Why it happens:** Recharts doesn't auto-simplify dense data
**How to avoid:**
- Set `ResponsiveContainer` height based on data points (min 80px, max 200px)
- Use `tickFormatter` to show only month/year for crowded X-axis
- Consider showing only first/last 5 transactions if occurrence count > 10
- Alternative: Replace timeline with simple text list for high occurrence counts
**Warning signs:** Overlapping axis labels, illegible tooltips

### Pitfall 6: Auto-Tagging Notification Overload
**What goes wrong:** Toast notification for every high-confidence transaction during batch import
**Why it happens:** Showing per-transaction feedback during import processing
**How to avoid:**
- Show single summary toast after entire batch completes: "5 potential subscriptions detected"
- Don't show toast during sequential processing - only after all statements processed
- Store potential count during import, return in batch completion response
**Warning signs:** 20+ toast notifications stacking during import

## Code Examples

Verified patterns from official sources:

### Example 1: Bulk Accept Mutation Hook
```typescript
// NEW: src/lib/hooks/use-bulk-accept-patterns.ts
// Pattern based on use-bulk-tag-transactions.ts

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { patternKeys } from "./use-pattern-suggestions";

type BulkAcceptInput = {
  patternIds: string[];
};

export function useBulkAcceptPatterns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkAcceptInput) => {
      const response = await fetch("/api/patterns/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, action: "accept" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept patterns");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: patternKeys.lists() });
      toast.success(
        `Accepted ${data.acceptedCount} suggestion${data.acceptedCount > 1 ? "s" : ""}`,
        {
          action: {
            label: "View Subscriptions",
            onClick: () => window.location.href = "/subscriptions",
          },
        }
      );
    },
  });
}
```

### Example 2: Confidence Badge Component
```typescript
// NEW: src/components/suggestions/confidence-badge.tsx
// Based on AI confidence visualization patterns

import { Badge } from "@/components/ui/badge";
import { getConfidenceTier } from "@/lib/utils/pattern-detection";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface ConfidenceBadgeProps {
  score: number;
  showTooltip?: boolean;
}

export function ConfidenceBadge({ score, showTooltip = true }: ConfidenceBadgeProps) {
  const tier = getConfidenceTier(score);

  const colors = {
    high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const badge = (
    <Badge variant="outline" className={colors[tier]}>
      {score}% match
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          {tier === "high" && "High confidence - likely a subscription"}
          {tier === "medium" && "Medium confidence - review recommended"}
          {tier === "low" && "Low confidence - verify carefully"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Example 3: Transaction Evidence List with Variance Flag
```typescript
// NEW: src/components/suggestions/evidence-list.tsx

import { format } from "date-fns";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import Link from "next/link";

interface EvidenceListProps {
  chargeDates: string[];
  amounts: number[];
  currency: string;
  merchantName: string;
}

export function EvidenceList({
  chargeDates,
  amounts,
  currency,
  merchantName
}: EvidenceListProps) {
  // Calculate amount variance
  const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const variance = amounts.some(amt => Math.abs(amt - avgAmount) / avgAmount > 0.1);

  return (
    <div className="space-y-3">
      {variance && (
        <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Amounts vary significantly - possible price change or different charges</p>
        </div>
      )}

      <div className="space-y-1">
        {chargeDates.map((date, i) => (
          <Link
            key={i}
            href={`/transactions?search=${encodeURIComponent(merchantName)}&dateFrom=${date}`}
            className="flex items-center justify-between text-sm hover:bg-accent rounded px-2 py-1 group"
          >
            <span className="flex items-center gap-2">
              {format(new Date(date), "MMM d, yyyy")}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="font-medium">
              {formatCurrency(amounts[i], currency)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Example 4: Bulk Actions Toolbar
```typescript
// NEW: src/components/suggestions/bulk-actions-bar.tsx

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BulkActionsBarProps {
  selectedCount: number;
  onAcceptAll: () => void;
  onDismissAll: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onAcceptAll,
  onDismissAll,
  onClearSelection,
  isProcessing = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 p-4 shadow-lg z-50">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onDismissAll}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-1" />
            Dismiss All
          </Button>
          <Button
            size="sm"
            onClick={onAcceptAll}
            disabled={isProcessing}
          >
            <Check className="h-4 w-4 mr-1" />
            Accept All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            Clear
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual subscription entry | AI-powered pattern detection | 2024-2026 trend | Reduces user effort, increases completeness |
| Simple string matching | Statistical confidence scoring with intervals | Modern fintech pattern | More accurate, fewer false positives |
| Separate accept/dismiss actions | Bulk operations with multi-select | UX best practice 2026 | Faster workflow for power users |
| Static transaction lists | Interactive timeline visualization | Data-heavy UI trend | Better pattern understanding |
| Post-import manual review | Real-time auto-tagging during import | Progressive enhancement | Immediate feedback |

**Deprecated/outdated:**
- **Manual interval calculation in UI:** Calculate server-side in detection query, store in database
- **Client-side pattern detection:** Too slow for large datasets, use PostgreSQL window functions
- **Toast per transaction:** Batch notifications, show summary after completion

## Open Questions

Things that couldn't be fully resolved:

1. **Auto-linking transactions to accepted subscriptions**
   - What we know: User decision requires auto-linking matched transactions when accepting pattern
   - What's unclear: How to identify which specific transactions match pattern (detection uses subscriptions table, not transactions table)
   - Recommendation: Create junction table `pattern_transactions` during detection to track which transactions contributed to pattern, use for linking on accept

2. **Pattern detection trigger timing**
   - What we know: Should run after imports, but async to avoid blocking
   - What's unclear: Should it be part of batch process response or separate cron job?
   - Recommendation: Trigger POST `/api/patterns/detect` at end of batch upload (all files processed), but don't await response. Consider daily cron as backup.

3. **Confidence threshold for auto-tagging**
   - What we know: Requirements say >80%, CONTEXT says user controls threshold
   - What's unclear: Should threshold be user-configurable or system constant?
   - Recommendation: Start with 80% constant, add user setting in Phase 24+ if requested

4. **Timeline visualization performance with 50+ occurrences**
   - What we know: Recharts can handle datasets, but UX may be cluttered
   - What's unclear: Should we paginate evidence or show summary for high counts?
   - Recommendation: Show all in expanded view, but add "First 5 charges" / "Last 5 charges" quick links if count > 10

5. **Bulk accept with different categories**
   - What we know: Each pattern may need different category assignment
   - What's unclear: Should bulk accept use AI-suggested categories or require manual review?
   - Recommendation: Bulk accept uses AI-suggested categories (already in suggestion response), allow edit after creation

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `src/lib/db/schema.ts` - Complete recurring_patterns schema
  - `src/app/api/patterns/detect/route.ts` - SQL window function detection query
  - `src/lib/utils/pattern-detection.ts` - Confidence scoring algorithm
  - `src/components/dashboard/pattern-suggestion-item.tsx` - Existing UI pattern
  - `src/lib/hooks/use-bulk-tag-transactions.ts` - Bulk operations pattern
  - `src/components/dashboard/category-chart.tsx` - Recharts implementation example

### Secondary (MEDIUM confidence)
- [SQL Habit: How to detect recurring payments with SQL](https://www.sqlhabit.com/blog/how-to-detect-recurring-payments-with-sql) - LAG window function pattern
- [Shadcn/ui React Series: Sonner Toast Notifications](https://medium.com/@rivainasution/shadcn-ui-react-series-part-19-sonner-modern-toast-notifications-done-right-903757c5681f) - Actionable toast best practices
- [Simple Table: React Table Row Selection Guide](https://www.simple-table.com/blog/react-table-row-selection-guide) - Multi-select patterns
- [Agentic Design: Confidence Visualization Patterns](https://agentic-design.ai/patterns/ui-ux-patterns/confidence-visualization-patterns) - UI patterns for AI confidence scores

### Tertiary (LOW confidence)
- [Meniga: Recurring Payments Identification](https://www.meniga.com/resources/recurring-payments/) - Industry approaches to pattern detection
- [LogRocket: React Select Guide](https://blog.logrocket.com/react-select-comprehensive-guide/) - Multi-select component patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used extensively in codebase
- Architecture: HIGH - Existing pattern detection infrastructure provides solid foundation
- Pitfalls: HIGH - Based on actual codebase patterns and common React/PostgreSQL gotchas

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain with established patterns)
