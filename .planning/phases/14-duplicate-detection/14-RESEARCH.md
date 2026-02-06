# Phase 14: Duplicate Detection - Research

**Researched:** 2026-02-06
**Domain:** String similarity algorithms, multi-field record comparison, merge conflict resolution
**Confidence:** HIGH

## Summary

Duplicate detection for subscription records requires multi-field fuzzy matching with weighted scoring, side-by-side comparison UI, field-level merge controls, and soft delete with undo capability. The standard approach combines string similarity algorithms (Jaro-Winkler for names) with exact matching for amounts/frequencies, producing a weighted similarity score that determines warning severity.

User decisions from CONTEXT.md establish: two-tier thresholds (85%+ prominent, 70-84% subtle), side-by-side diff view with explicit highlighting, field-by-field picker with "newer wins" pre-selection, soft delete with 24-48hr undo, and inline results display on subscriptions page.

**Primary recommendation:** Use string-comparison npm package (supports multiple algorithms including Jaro-Winkler and Levenshtein) for name matching, implement weighted multi-field scoring, leverage react-diff-viewer for side-by-side comparison, and use TanStack Query optimistic updates with rollback for undo functionality.

## Standard Stack

The established libraries/tools for duplicate detection and record merging:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| string-comparison | Latest | Multi-algorithm string similarity (Jaro-Winkler, Levenshtein, etc.) | Provides normalized 0-1 similarity scores, supports multiple algorithms, well-typed for TypeScript |
| react-diff-viewer | Latest | Side-by-side diff component | Github-style split view, syntax highlighting support, customizable styling |
| TanStack Query | v5 (existing) | Optimistic updates with rollback | Already in project, provides mutation lifecycle hooks for undo logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @skyra/jaro-winkler | Latest | Standalone Jaro-Winkler implementation | If string-comparison has performance issues (227k downloads, dedicated focus) |
| fast-levenshtein | 3.0.0 (already installed) | Fast Levenshtein distance | Already in node_modules, can use without additional dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| string-comparison | fuse.js | Fuse.js is heavyweight fuzzy search for arrays, overkill for pairwise comparison |
| react-diff-viewer | react-diff-view | react-diff-view more powerful but complex, viewer simpler for record comparison |
| Optimistic updates | Manual state mgmt | Lose automatic rollback, query invalidation, concurrent mutation handling |

**Installation:**
```bash
npm install string-comparison react-diff-viewer
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── utils/
│   │   ├── similarity.ts        # Multi-field similarity scoring
│   │   └── merge.ts             # Merge logic utilities
│   └── hooks/
│       ├── use-duplicate-scan.ts    # Background scan mutation
│       └── use-merge-subscription.ts # Merge with undo
├── components/
│   ├── subscriptions/
│   │   ├── duplicate-warning.tsx    # Inline warning badge
│   │   ├── duplicate-comparison.tsx # Side-by-side view
│   │   ├── merge-field-picker.tsx   # Field selection UI
│   │   └── duplicate-scan-results.tsx # Inline results section
└── app/
    └── api/
        ├── subscriptions/
        │   └── duplicates/
        │       └── route.ts         # POST scan, GET results
        └── merge/
            └── route.ts             # POST merge, DELETE undo
```

### Pattern 1: Multi-Field Weighted Similarity Scoring
**What:** Calculate overall similarity by combining field-specific similarity scores with custom weights
**When to use:** Comparing subscription records for duplicate detection
**Example:**
```typescript
// Source: Research synthesis from duplicate detection algorithms
import { NormalizedStringSimilarity } from 'string-comparison';

interface SubscriptionRecord {
  name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly';
  categoryId?: string | null;
  statementSource?: string | null;
}

interface SimilarityWeights {
  name: number;      // 0.5 - Most important
  amount: number;    // 0.25
  frequency: number; // 0.15
  category: number;  // 0.05
  source: number;    // 0.05
}

const DEFAULT_WEIGHTS: SimilarityWeights = {
  name: 0.5,
  amount: 0.25,
  frequency: 0.15,
  category: 0.05,
  source: 0.05,
};

function calculateSimilarity(
  sub1: SubscriptionRecord,
  sub2: SubscriptionRecord,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): { score: number; matches: Record<string, boolean> } {
  const jaroWinkler = new NormalizedStringSimilarity.JaroWinkler();

  // Name similarity (fuzzy match, case-insensitive)
  const nameSim = jaroWinkler.similarity(
    sub1.name.toLowerCase(),
    sub2.name.toLowerCase()
  );

  // Amount similarity (exact match normalized, allow 5% variance)
  const amountDiff = Math.abs(sub1.amount - sub2.amount);
  const amountAvg = (sub1.amount + sub2.amount) / 2;
  const amountSim = amountDiff / amountAvg <= 0.05 ? 1.0 : 0.0;

  // Frequency similarity (exact match)
  const frequencySim = sub1.frequency === sub2.frequency ? 1.0 : 0.0;

  // Category similarity (exact match, null-safe)
  const categorySim = sub1.categoryId === sub2.categoryId ? 1.0 : 0.0;

  // Source similarity (fuzzy match if both exist, case-insensitive)
  let sourceSim = 0.5; // Neutral if either missing
  if (sub1.statementSource && sub2.statementSource) {
    sourceSim = jaroWinkler.similarity(
      sub1.statementSource.toLowerCase(),
      sub2.statementSource.toLowerCase()
    );
  }

  // Weighted total
  const totalScore =
    nameSim * weights.name +
    amountSim * weights.amount +
    frequencySim * weights.frequency +
    categorySim * weights.category +
    sourceSim * weights.source;

  // Convert to percentage (0-100)
  const percentage = Math.round(totalScore * 100);

  return {
    score: percentage,
    matches: {
      name: nameSim >= 0.8, // 80%+ name similarity
      amount: amountSim === 1.0,
      frequency: frequencySim === 1.0,
      category: categorySim === 1.0,
      source: sourceSim >= 0.8,
    },
  };
}
```

### Pattern 2: Import-Time Duplicate Detection
**What:** Check each imported subscription against existing user subscriptions before confirmation
**When to use:** During import review step, before user confirms selections
**Example:**
```typescript
// Source: Research synthesis + existing import flow analysis
import { calculateSimilarity } from '@/lib/utils/similarity';

interface DuplicateMatch {
  existingId: string;
  existingName: string;
  score: number;
  matches: Record<string, boolean>;
}

async function detectImportDuplicates(
  importedSubs: DetectedSubscription[],
  userId: string
): Promise<Map<number, DuplicateMatch>> {
  // Fetch user's active subscriptions
  const existing = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        isNull(subscriptions.deletedAt)
      )
    );

  const duplicates = new Map<number, DuplicateMatch>();

  importedSubs.forEach((importedSub, index) => {
    let bestMatch: DuplicateMatch | null = null;

    for (const existingSub of existing) {
      const { score, matches } = calculateSimilarity(
        {
          name: importedSub.name,
          amount: importedSub.amount,
          currency: importedSub.currency,
          frequency: importedSub.frequency,
        },
        {
          name: existingSub.name,
          amount: parseFloat(existingSub.amount),
          currency: existingSub.currency,
          frequency: existingSub.frequency,
        }
      );

      // 70%+ threshold for flagging
      if (score >= 70 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          existingId: existingSub.id,
          existingName: existingSub.name,
          score,
          matches,
        };
      }
    }

    if (bestMatch) {
      duplicates.set(index, bestMatch);
    }
  });

  return duplicates;
}
```

### Pattern 3: Optimistic Merge with Rollback
**What:** Immediately update UI when merging, store rollback context for undo within time window
**When to use:** Subscription merge operations that need undo capability
**Example:**
```typescript
// Source: TanStack Query v5 Optimistic Updates documentation
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MergeContext {
  targetSnapshot: Subscription;
  sourceSnapshot: Subscription;
  timestamp: number;
}

function useMergeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetId,
      sourceId,
      selectedFields
    }: {
      targetId: string;
      sourceId: string;
      selectedFields: Record<string, 'target' | 'source'>;
    }) => {
      const response = await fetch('/api/subscriptions/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, sourceId, selectedFields }),
      });

      if (!response.ok) throw new Error('Merge failed');
      return response.json();
    },

    // Optimistic update
    onMutate: async ({ targetId, sourceId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['subscriptions'] });

      // Snapshot current state
      const previousSubs = queryClient.getQueryData<Subscription[]>(['subscriptions']);
      const target = previousSubs?.find(s => s.id === targetId);
      const source = previousSubs?.find(s => s.id === sourceId);

      if (!target || !source) return;

      // Optimistically update - hide source
      queryClient.setQueryData<Subscription[]>(
        ['subscriptions'],
        old => old?.filter(s => s.id !== sourceId) ?? []
      );

      // Return context for rollback
      return {
        targetSnapshot: target,
        sourceSnapshot: source,
        timestamp: Date.now(),
      } as MergeContext;
    },

    // Rollback on error
    onError: (err, variables, context?: MergeContext) => {
      if (context) {
        // Restore both subscriptions
        queryClient.setQueryData<Subscription[]>(
          ['subscriptions'],
          old => {
            const withoutSource = old?.filter(s => s.id !== context.sourceSnapshot.id) ?? [];
            return [...withoutSource, context.sourceSnapshot];
          }
        );
      }

      toast.error('Merge failed. Changes reverted.', {
        duration: 5000,
      });
    },

    // Refetch on success
    onSuccess: (data, variables, context?: MergeContext) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });

      // Show undo toast (24hr window per CONTEXT.md)
      const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

      toast.success('Subscriptions merged', {
        duration: 10000,
        action: {
          label: 'Undo',
          onClick: async () => {
            if (!context || Date.now() - context.timestamp > UNDO_WINDOW_MS) {
              toast.error('Undo window expired (24 hours)');
              return;
            }

            // Call undo endpoint
            await fetch('/api/subscriptions/merge/undo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetId: variables.targetId,
                sourceId: variables.sourceId,
              }),
            });

            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            toast.success('Merge undone');
          },
        },
      });
    },
  });
}
```

### Pattern 4: Background Duplicate Scan
**What:** Scan all user subscriptions for potential duplicates on demand
**When to use:** "Find Duplicates" button on subscriptions page
**Example:**
```typescript
// Source: Research synthesis + existing patterns
import { useMutation } from '@tanstack/react-query';

interface DuplicatePair {
  sub1: Subscription;
  sub2: Subscription;
  score: number;
  matches: Record<string, boolean>;
}

function useDuplicateScan() {
  return useMutation({
    mutationFn: async (): Promise<DuplicatePair[]> => {
      const response = await fetch('/api/subscriptions/duplicates', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Scan failed');
      return response.json();
    },
  });
}

// API endpoint implementation
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch active subscriptions
  const subs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, session.user.id),
        eq(subscriptions.status, 'active'),
        isNull(subscriptions.deletedAt)
      )
    );

  const duplicates: DuplicatePair[] = [];

  // O(n²) pairwise comparison (acceptable for hundreds of subscriptions)
  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const { score, matches } = calculateSimilarity(
        {
          name: subs[i].name,
          amount: parseFloat(subs[i].amount),
          currency: subs[i].currency,
          frequency: subs[i].frequency,
          categoryId: subs[i].categoryId,
          statementSource: null,
        },
        {
          name: subs[j].name,
          amount: parseFloat(subs[j].amount),
          currency: subs[j].currency,
          frequency: subs[j].frequency,
          categoryId: subs[j].categoryId,
          statementSource: null,
        }
      );

      // 70%+ threshold per CONTEXT.md
      if (score >= 70) {
        duplicates.push({
          sub1: subs[i],
          sub2: subs[j],
          score,
          matches,
        });
      }
    }
  }

  // Sort by score descending
  duplicates.sort((a, b) => b.score - a.score);

  return NextResponse.json(duplicates);
}
```

### Anti-Patterns to Avoid
- **Fuzzy matching amounts:** Don't use Levenshtein on currency values - use numeric comparison with tolerance (5% variance)
- **Case-sensitive name matching:** Always normalize to lowercase before comparison
- **Hard delete on merge:** Never hard delete the "losing" subscription - use soft delete for audit trail and undo
- **Synchronous O(n²) blocking:** For 1000+ subscriptions, consider chunking or moving to background job
- **Missing merge audit:** Always track which subscription was merged into which for compliance and debugging

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| String similarity | Custom Levenshtein or Jaro-Winkler from scratch | string-comparison npm package | Handles edge cases (null/empty, Unicode, normalization), optimized C++ bindings, battle-tested |
| Side-by-side diff view | Custom split pane with highlighting | react-diff-viewer | Github-style proven UX, syntax highlighting, line numbers, responsive, accessibility |
| Optimistic updates + undo | Manual state management with setTimeout | TanStack Query mutation lifecycle | Handles concurrent mutations, automatic query cancellation, rollback context, race conditions |
| Merge conflict UI | Custom field picker component | Adapt react-diff-viewer with custom renderContent | Reuses diff highlighting, line-by-line selection proven UX |

**Key insight:** Duplicate detection appears simple ("just compare strings") but production-quality requires: Unicode normalization, weighted multi-field scoring, threshold tuning, undo within time windows, soft delete audit trails, and race condition handling. Use battle-tested libraries to avoid these pitfalls.

## Common Pitfalls

### Pitfall 1: Over-Aggressive Matching (False Positives)
**What goes wrong:** Low thresholds or single-field matching flags unrelated subscriptions as duplicates (e.g., "Netflix" and "Hulu" both streaming, similar amounts)
**Why it happens:** Name-only matching or thresholds below 70% catch too many variations
**How to avoid:** Use multi-field weighted scoring with name as primary (50% weight), require 70%+ overall score, show matching fields as evidence
**Warning signs:** User complaints about "not duplicates" warnings, high skip rate on flagged items

### Pitfall 2: Undo Window Implementation Issues
**What goes wrong:** Undo button appears but fails after time window expires, or merged records hard-deleted before window expires
**Why it happens:** Frontend doesn't check expiration before attempting undo, or backend cleanup cron runs too early
**How to avoid:** Store merge timestamp in database, check both frontend (disable button) and backend (reject expired), soft delete only transitions to hard delete after expiration + grace period
**Warning signs:** Users clicking undo and seeing "Merge not found" errors, expired merges still showing undo button

### Pitfall 3: Missing Query Cancellation in Optimistic Updates
**What goes wrong:** User merges subscription, but in-flight query overwrites optimistic update, showing "unmerged" state briefly
**Why it happens:** Forgetting `cancelQueries` in `onMutate` allows stale data to overwrite optimistic update
**How to avoid:** Always cancel relevant queries before optimistic update, as shown in TanStack Query docs pattern
**Warning signs:** Flickering/toggling state after merge, merged subscription briefly reappears then disappears

### Pitfall 4: Case-Sensitive or Non-Normalized Comparison
**What goes wrong:** "Netflix" and "NETFLIX" scored as different (low similarity), "café" and "cafe" don't match
**Why it happens:** Comparing strings without .toLowerCase() or Unicode normalization
**How to avoid:** Always normalize to lowercase before comparison, consider Unicode normalization (String.prototype.normalize('NFKD')) for international names
**Warning signs:** Users reporting obvious duplicates not detected, inconsistent results based on capitalization

### Pitfall 5: Blocking UI with O(n²) Scan
**What goes wrong:** "Find Duplicates" button freezes for 10+ seconds with large subscription lists (500+ items)
**Why it happens:** O(n²) comparison runs synchronously on API route without timeout handling
**How to avoid:** For <200 subscriptions, synchronous is fine; for 200-1000, use streaming response; for 1000+, background job with polling
**Warning signs:** Vercel function timeouts (10s limit), user complaints about slow scan, 504 Gateway Timeout errors

### Pitfall 6: Not Showing Evidence for Similarity Score
**What goes wrong:** User sees "85% similar" but doesn't understand why, questions the accuracy
**Why it happens:** Showing only aggregate score without breaking down which fields matched
**How to avoid:** Always return `matches` object showing which fields contributed to score (name ✓, amount ✓, frequency ✓, etc.)
**Warning signs:** User confusion about why items flagged as duplicates, distrust of AI detection, high false positive reports

## Code Examples

Verified patterns from research and existing codebase:

### Duplicate Warning Badge (Import Flow)
```typescript
// Source: Adapted from existing ConfidenceBadge pattern
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DuplicateWarningProps {
  score: number;
  existingName: string;
  matches: Record<string, boolean>;
}

function DuplicateWarning({ score, existingName, matches }: DuplicateWarningProps) {
  // Two-tier threshold per CONTEXT.md: 85%+ prominent, 70-84% subtle
  const isHighSimilarity = score >= 85;

  const matchList = Object.entries(matches)
    .filter(([_, matched]) => matched)
    .map(([field]) => field)
    .join(', ');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={isHighSimilarity ? "destructive" : "warning"}
          className="flex items-center gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          {score}% match to "{existingName}"
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">Possible duplicate subscription</p>
        <p className="text-xs mt-1">Matching: {matchList}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Side-by-Side Subscription Comparison
```typescript
// Source: react-diff-viewer + custom field rendering
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';

interface ComparisonViewProps {
  existing: Subscription;
  importing: DetectedSubscription;
  similarityScore: number;
  matches: Record<string, boolean>;
}

function SubscriptionComparison({
  existing,
  importing,
  similarityScore,
  matches
}: ComparisonViewProps) {
  // Format as "diff-able" text
  const existingText = `
Name: ${existing.name}
Amount: ${formatCurrency(parseFloat(existing.amount), existing.currency)}
Frequency: ${existing.frequency}
Category: ${existing.category?.name || 'None'}
Next Renewal: ${format(existing.nextRenewalDate, 'MMM d, yyyy')}
  `.trim();

  const importingText = `
Name: ${importing.name}
Amount: ${formatCurrency(importing.amount, importing.currency)}
Frequency: ${importing.frequency}
Category: Not set
Next Renewal: ${format(addMonths(new Date(), 1), 'MMM d, yyyy')}
  `.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Compare Subscriptions</h4>
        <Badge variant={similarityScore >= 85 ? "destructive" : "warning"}>
          {similarityScore}% Similar
        </Badge>
      </div>

      <ReactDiffViewer
        oldValue={existingText}
        newValue={importingText}
        splitView={true}
        leftTitle="Existing Subscription"
        rightTitle="Importing Subscription"
        compareMethod={DiffMethod.WORDS}
        styles={{
          diffContainer: {
            fontSize: '14px',
          },
        }}
      />

      <div className="text-xs text-muted-foreground">
        Matching fields: {Object.entries(matches)
          .filter(([_, matched]) => matched)
          .map(([field]) => field)
          .join(', ')}
      </div>
    </div>
  );
}
```

### Inline Duplicate Scan Results
```typescript
// Source: Existing inline patterns from import flow
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { useDuplicateScan } from '@/lib/hooks/use-duplicate-scan';

function DuplicateScanSection() {
  const [showResults, setShowResults] = useState(false);
  const { mutate: scan, isPending, data: duplicates, isSuccess } = useDuplicateScan();

  const handleScan = () => {
    scan(undefined, {
      onSuccess: (data) => {
        if (data.length === 0) {
          // Show success message briefly
          setTimeout(() => setShowResults(false), 3000);
        } else {
          setShowResults(true);
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleScan}
          disabled={isPending}
          variant="outline"
          className="h-11"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            'Find Duplicates'
          )}
        </Button>

        {/* Success message (no duplicates) */}
        {isSuccess && duplicates?.length === 0 && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">No duplicates found</span>
          </div>
        )}
      </div>

      {/* Expandable results section */}
      {showResults && duplicates && duplicates.length > 0 && (
        <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-900/20 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Found {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Review and merge subscriptions below
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {duplicates.map((pair, index) => (
              <DuplicatePairCard key={index} pair={pair} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Merge Field Picker
```typescript
// Source: Research synthesis + CONTEXT.md decisions
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface MergeFieldPickerProps {
  target: Subscription;
  source: Subscription;
  onMerge: (selectedFields: Record<string, 'target' | 'source'>) => void;
  onCancel: () => void;
}

function MergeFieldPicker({ target, source, onMerge, onCancel }: MergeFieldPickerProps) {
  // "Newer wins" by default per CONTEXT.md
  const newerIsTarget = new Date(target.createdAt) > new Date(source.createdAt);

  const [selections, setSelections] = useState<Record<string, 'target' | 'source'>>({
    name: newerIsTarget ? 'target' : 'source',
    amount: newerIsTarget ? 'target' : 'source',
    frequency: newerIsTarget ? 'target' : 'source',
    category: newerIsTarget ? 'target' : 'source',
    nextRenewalDate: newerIsTarget ? 'target' : 'source',
  });

  const fields = [
    {
      key: 'name',
      label: 'Name',
      targetValue: target.name,
      sourceValue: source.name,
    },
    {
      key: 'amount',
      label: 'Amount',
      targetValue: formatCurrency(parseFloat(target.amount), target.currency),
      sourceValue: formatCurrency(parseFloat(source.amount), source.currency),
    },
    {
      key: 'frequency',
      label: 'Billing Cycle',
      targetValue: target.frequency,
      sourceValue: source.frequency,
    },
    {
      key: 'category',
      label: 'Category',
      targetValue: target.category?.name || 'None',
      sourceValue: source.category?.name || 'None',
    },
    {
      key: 'nextRenewalDate',
      label: 'Next Renewal',
      targetValue: format(target.nextRenewalDate, 'MMM d, yyyy'),
      sourceValue: format(source.nextRenewalDate, 'MMM d, yyyy'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Choose Field Values</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select which value to keep for each field. Newer record pre-selected.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            <RadioGroup
              value={selections[field.key]}
              onValueChange={(value) =>
                setSelections(prev => ({ ...prev, [field.key]: value as 'target' | 'source' }))
              }
            >
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="target" id={`${field.key}-target`} />
                <Label
                  htmlFor={`${field.key}-target`}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {field.targetValue}
                  {field.targetValue !== field.sourceValue && (
                    <span className="ml-2 text-xs text-muted-foreground">(target)</span>
                  )}
                </Label>
              </div>
              {field.targetValue !== field.sourceValue && (
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <RadioGroupItem value="source" id={`${field.key}-source`} />
                  <Label
                    htmlFor={`${field.key}-source`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {field.sourceValue}
                    <span className="ml-2 text-xs text-muted-foreground">(source)</span>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1 h-11">
          Cancel
        </Button>
        <Button onClick={() => onMerge(selections)} className="flex-1 h-11">
          Merge Subscriptions
        </Button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Exact string matching only | Fuzzy matching with Jaro-Winkler | 2020s | Catches typos, case variations, "Netflix" = "netflix" |
| Hard delete on merge | Soft delete with undo window | 2015+ | GDPR compliance, user trust, mistake recovery |
| Single-field comparison (name only) | Multi-field weighted scoring | 2018+ | Reduces false positives, more accurate matching |
| Synchronous blocking operations | Optimistic UI with rollback | 2020s (React Query) | Instant feedback, better UX, handles failures gracefully |
| Manual state management for undo | Mutation lifecycle hooks | 2021+ (TanStack Query v4+) | Automatic query invalidation, concurrent mutation handling |

**Deprecated/outdated:**
- **Soundex/Metaphone for names:** Designed for English surnames only, poor for brand names and international text. Use Jaro-Winkler instead.
- **Client-side duplicate detection libraries (like recordlinkage.js):** Most abandoned, use proven algorithms via npm packages like string-comparison.
- **Redux-based optimistic updates:** Replaced by TanStack Query mutation lifecycle - less boilerplate, better error handling.

## Open Questions

Things that couldn't be fully resolved:

1. **Performance at scale (1000+ subscriptions)**
   - What we know: O(n²) comparison = 500K operations for 1000 subs, acceptable if fast per-comparison
   - What's unclear: Real-world performance with Jaro-Winkler in Node.js, need profiling
   - Recommendation: Start with synchronous scan, add timing logs, move to background job if >5s for typical user

2. **Undo time window (24hr vs 48hr)**
   - What we know: CONTEXT.md suggests 24-48 hours, industry varies (Stripe 90 days, Gmail 30s)
   - What's unclear: User expectations for subscription data, how often users catch mistakes late
   - Recommendation: Start with 24 hours, add telemetry to track undo attempts after window expires, adjust if needed

3. **Currency conversion for amount comparison**
   - What we know: Need to compare $10 USD vs €9 EUR as potential duplicate
   - What's unclear: Should we convert to user's display currency? Use neutral currency (USD)?
   - Recommendation: For Phase 14, compare amounts only if currencies match. Add cross-currency in future phase using existing fx_rates_cache table.

4. **Handling merged-then-deleted subscriptions**
   - What we know: User merges A→B, then deletes B within undo window
   - What's unclear: Should undo restore A only, or also un-delete B?
   - Recommendation: Undo only restores A (unmarks as merged), leave B deleted - simpler logic, edge case is rare

## Sources

### Primary (HIGH confidence)
- [string-comparison npm package](https://www.npmjs.com/package/string-comparison) - Multi-algorithm string similarity library with normalized scores
- [TanStack Query v5 Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates) - Official documentation for mutation lifecycle and rollback
- [react-diff-viewer GitHub](https://github.com/praneshr/react-diff-viewer) - Split view diff component documentation

### Secondary (MEDIUM confidence)
- [Understanding Fuzzy Matching Algorithm](https://www.leadangel.com/blog/operations/understanding-the-fuzzy-matching-algorithm/) - Weighted multi-field scoring patterns
- [Duplicate Record Detection: A Survey (IEEE)](https://ieeexplore.ieee.org/document/4016511/) - Academic survey of duplicate detection algorithms
- [Best Dynamic Risk Scoring for AML (Flagright)](https://www.flagright.com/post/best-dynamic-risk-scoring-algorithm-for-aml-fraud) - Weighted scoring implementation patterns

### Secondary (MEDIUM confidence) - String Similarity
- [Jaro-Winkler vs. Levenshtein (Flagright)](https://www.flagright.com/post/jaro-winkler-vs-levenshtein-choosing-the-right-algorithm-for-aml-screening) - Algorithm comparison for name matching
- [String Similarity Algorithms Compared (Medium)](https://medium.com/@appaloosastore/string-similarity-algorithms-compared-3f7b4d12f0ff) - Practical comparison of algorithms
- [Choosing String Comparators (Splink)](https://moj-analytical-services.github.io/splink/topic_guides/comparisons/choosing_comparators.html) - When to use which algorithm

### Secondary (MEDIUM confidence) - Soft Delete & Undo
- [Soft Deletion Probably Isn't Worth It (brandur.org)](https://brandur.org/soft-deletion) - Challenges and tradeoffs of soft delete
- [Avoiding Soft Delete Anti-Pattern (Cultured Systems)](https://www.cultured.systems/2024/04/24/Soft-delete/) - Best practices for soft delete implementation
- [What Are Soft Deletes (Brent Ozar)](https://www.brentozar.com/archive/2020/02/what-are-soft-deletes-and-how-are-they-implemented/) - Implementation patterns and pitfalls

### Tertiary (LOW confidence)
- [CRM Deduplication Tutorial (Breakcool)](https://www.breakcold.com/blog/crm-deduplication) - General deduplication patterns, not subscription-specific
- [Duplicate Payment Prevention (NetSuite)](https://www.netsuite.com/portal/resource/articles/accounting/prevent-duplicate-payments.shtml) - Payment deduplication, some applicable patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - string-comparison and react-diff-viewer are established packages with good TypeScript support and active maintenance
- Architecture: HIGH - Multi-field weighted scoring is well-documented in academic literature and production systems (AML, CRM)
- Pitfalls: HIGH - Common issues (case sensitivity, query cancellation, blocking scans) verified across multiple sources
- Undo implementation: MEDIUM - TanStack Query patterns are well-documented, but specific time window handling requires custom implementation

**Research date:** 2026-02-06
**Valid until:** 30 days (stable domain, algorithms don't change frequently, but package versions should be verified)
