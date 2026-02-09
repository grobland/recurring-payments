# Phase 22: Source Dashboard & Re-import - Research

**Researched:** 2026-02-09
**Domain:** Dashboard UI with expandable lists, date gap detection, batch resume functionality
**Confidence:** HIGH

## Summary

This phase builds a source dashboard showing statement coverage by bank/credit card, with drill-down capability to view individual statements and their transactions. The core technologies are already established in the codebase: shadcn/ui Accordion for expandable rows, date-fns for date manipulation and gap detection, TanStack Query for data fetching, and the existing transaction/statement data model.

The main technical challenges are: (1) aggregating statement data by source with coverage metrics, (2) detecting gaps in monthly coverage, (3) implementing the re-import flow for skipped transactions, and (4) persisting incomplete batch state for resume functionality.

**Primary recommendation:** Use Accordion component for expandable source rows, date-fns `eachMonthOfInterval` for gap detection, existing transaction conversion API for re-import, and localStorage-based batch persistence (already established pattern in `use-batch-upload.ts`).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-accordion | latest | Expandable row primitives | Already in codebase via shadcn/ui |
| date-fns | ^3.x | Date manipulation, gap detection | Already used throughout codebase |
| @tanstack/react-query | ^5.x | Data fetching, caching | Already used for all API calls |
| react-hook-form + zod | latest | Form handling for re-import | Already used in subscription-form.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | Icons (ChevronDown, AlertTriangle) | Consistent with existing UI |
| class-variance-authority | latest | Badge variants for status | Already in badge.tsx |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Accordion | Collapsible | Accordion better for multi-item lists with single/multiple expand |
| localStorage | IndexedDB | localStorage sufficient for queue metadata, simpler API |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/
│   └── sources/
│       ├── route.ts              # GET: List sources with coverage stats
│       └── [sourceType]/
│           ├── route.ts          # GET: Statements for a source
│           └── statements/
│               └── [id]/
│                   └── transactions/
│                       └── route.ts  # GET: Transactions for statement
├── components/
│   └── sources/
│       ├── source-dashboard.tsx       # Main dashboard component
│       ├── source-list.tsx            # Accordion list of sources
│       ├── source-row.tsx             # Single expandable source row
│       ├── statement-list.tsx         # Statements within expanded source
│       ├── statement-detail.tsx       # Transaction list for a statement
│       ├── transaction-status-badge.tsx  # converted/skipped/pending badges
│       ├── coverage-gap-warning.tsx   # Gap indicator component
│       └── incomplete-batch-banner.tsx # Resume banner component
├── lib/
│   └── hooks/
│       ├── use-sources.ts             # Fetch sources with coverage
│       ├── use-source-statements.ts   # Fetch statements for source
│       └── use-statement-transactions.ts  # Fetch transactions for statement
└── types/
    └── source.ts                      # Source, coverage, gap types
```

### Pattern 1: Expandable Source Row with Accordion
**What:** Use shadcn/ui Accordion for source list with nested statement drill-down
**When to use:** Two-level navigation as specified in CONTEXT.md decisions
**Example:**
```typescript
// Source: Existing accordion.tsx pattern
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

function SourceList({ sources }: { sources: Source[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {sources.map((source) => (
        <AccordionItem key={source.sourceType} value={source.sourceType}>
          <AccordionTrigger className="hover:no-underline">
            <SourceRowHeader source={source} />
          </AccordionTrigger>
          <AccordionContent>
            <StatementList sourceType={source.sourceType} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
```

### Pattern 2: Gap Detection with date-fns
**What:** Use `eachMonthOfInterval` to generate expected months, compare with actual
**When to use:** Highlighting missing coverage periods
**Example:**
```typescript
// Source: date-fns official documentation
import { eachMonthOfInterval, format, startOfMonth } from "date-fns";

interface CoverageGap {
  month: string; // "Mar 2025"
  date: Date;
}

function detectCoverageGaps(
  earliestDate: Date,
  latestDate: Date,
  statementMonths: Date[]
): CoverageGap[] {
  // Generate all expected months in the range
  const expectedMonths = eachMonthOfInterval({
    start: startOfMonth(earliestDate),
    end: startOfMonth(latestDate),
  });

  // Create Set of actual months (normalized to start of month)
  const actualMonthKeys = new Set(
    statementMonths.map(d => format(startOfMonth(d), "yyyy-MM"))
  );

  // Find gaps
  return expectedMonths
    .filter(month => !actualMonthKeys.has(format(month, "yyyy-MM")))
    .map(date => ({
      month: format(date, "MMM yyyy"),
      date,
    }));
}
```

### Pattern 3: Re-import Wizard Flow
**What:** Sequential processing of multiple selected transactions
**When to use:** Re-importing skipped items one at a time
**Example:**
```typescript
// Based on existing conversion flow in /api/transactions/[id]/convert
interface ReimportState {
  queue: string[];           // Transaction IDs to process
  currentIndex: number;      // Current position in queue
  completed: string[];       // Successfully imported
}

function ReimportWizard({ transactionIds, onComplete }: Props) {
  const [state, setState] = useState<ReimportState>({
    queue: transactionIds,
    currentIndex: 0,
    completed: [],
  });

  const currentTransaction = useTransaction(state.queue[state.currentIndex]);

  const handleSave = async (data: SubscriptionInput) => {
    await convertTransaction(currentTransaction.id, data);
    setState(prev => ({
      ...prev,
      completed: [...prev.completed, prev.queue[prev.currentIndex]],
      currentIndex: prev.currentIndex + 1,
    }));
  };

  if (state.currentIndex >= state.queue.length) {
    onComplete(state.completed);
    return null;
  }

  return (
    <SubscriptionForm
      defaultValues={prefillFromTransaction(currentTransaction)}
      onSubmit={handleSave}
      submitLabel={`Save (${state.currentIndex + 1} of ${state.queue.length})`}
    />
  );
}
```

### Pattern 4: Incomplete Batch Banner (localStorage persistence)
**What:** Detect and display incomplete batch state from localStorage
**When to use:** Resume functionality for interrupted imports
**Example:**
```typescript
// Based on existing use-batch-upload.ts pattern
const STORAGE_KEY = "batch-upload-queue";

interface IncompleteBatch {
  sourceType: string;
  timestamp: number;
  processed: number;
  total: number;
  lastError?: string;
  pendingFiles: { id: string; fileName: string }[];
}

function useIncompleteBatch() {
  const [batch, setBatch] = useState<IncompleteBatch | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      // Expire after 24 hours (established pattern)
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Check if incomplete (has pending items)
      const pendingCount = data.queue.filter(
        (f: any) => f.status === "pending" || f.status === "error"
      ).length;

      if (pendingCount > 0) {
        setBatch({
          sourceType: data.sourceType,
          timestamp: data.timestamp,
          processed: data.queue.length - pendingCount,
          total: data.queue.length,
          lastError: data.queue.find((f: any) => f.status === "error")?.error,
          pendingFiles: data.queue
            .filter((f: any) => f.status === "pending" || f.status === "error")
            .map((f: any) => ({ id: f.id, fileName: f.fileName })),
        });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const discard = () => {
    localStorage.removeItem(STORAGE_KEY);
    setBatch(null);
  };

  return { batch, discard };
}
```

### Anti-Patterns to Avoid
- **Fetching all transactions upfront:** Use lazy loading - only fetch statement transactions when user expands/clicks
- **Storing File objects in localStorage:** Files cannot be serialized; store metadata only
- **Detecting gaps on frontend from raw data:** Calculate gaps in API response for efficiency
- **Modal for re-import flow:** Use inline wizard as specified in CONTEXT.md decisions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Expandable rows | Custom disclosure state | shadcn/ui Accordion | Animation, a11y, keyboard nav built-in |
| Date gap detection | Manual loop comparison | date-fns eachMonthOfInterval | Edge cases (leap years, DST) handled |
| Transaction conversion | New endpoint | Existing /api/transactions/[id]/convert | Already handles category guess, status update |
| Batch state persistence | Custom persistence layer | localStorage pattern from use-batch-upload.ts | Established pattern with expiration |
| Status badges | Inline conditional styling | Existing Badge variants (success/warning) | Consistent styling across app |

**Key insight:** This phase is primarily UI composition of existing patterns rather than new infrastructure. The data model (statements, transactions) and conversion logic already exist.

## Common Pitfalls

### Pitfall 1: N+1 Queries for Nested Data
**What goes wrong:** Fetching statements individually as accordion expands
**Why it happens:** Lazy loading without batching
**How to avoid:** Prefetch all statements for a source in single query when source row is expanded
**Warning signs:** Slow expansion, network waterfall in devtools

### Pitfall 2: Stale Selection State After Actions
**What goes wrong:** Checkbox selection refers to transactions that were just converted
**Why it happens:** Selection state not cleared after bulk operations
**How to avoid:** Clear selection after any mutation (established pattern in transaction-browser.tsx)
**Warning signs:** "Transaction already converted" errors

### Pitfall 3: Gap Detection Timezone Issues
**What goes wrong:** Same month appears as both present and missing
**Why it happens:** Date comparison without normalizing to start of month
**How to avoid:** Always use `startOfMonth()` before comparing dates
**Warning signs:** Inconsistent gap display, "phantom" gaps

### Pitfall 4: Banner Not Showing After Page Refresh
**What goes wrong:** Incomplete batch banner doesn't appear after browser refresh
**Why it happens:** Reading localStorage in useEffect without proper hydration handling
**How to avoid:** Initialize state as null, update in useEffect (avoid hydration mismatch)
**Warning signs:** Flash of incorrect content, React hydration warnings

### Pitfall 5: Re-import Wizard Loses State
**What goes wrong:** User refreshes mid-wizard and loses progress
**Why it happens:** Wizard state only in React state
**How to avoid:** Persist wizard queue to localStorage like batch upload does
**Warning signs:** User frustration reports about lost progress

## Code Examples

Verified patterns from official sources:

### Coverage Summary Component
```typescript
// Based on existing card patterns and CONTEXT.md decisions
interface CoverageStats {
  sourceType: string;
  earliestDate: Date;
  latestDate: Date;
  statementCount: number;
  transactionCount: number;
  lastImportDate: Date;
  gaps: string[]; // ["Mar 2025", "Apr 2025"]
}

function SourceCoverageCard({ stats }: { stats: CoverageStats }) {
  const hasGaps = stats.gaps.length > 0;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium truncate">{stats.sourceType}</span>
        {hasGaps && (
          <Badge variant="warning" className="shrink-0">
            {stats.gaps.length} gap{stats.gaps.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {format(stats.earliestDate, "MMM yyyy")} - {format(stats.latestDate, "MMM yyyy")}
      </div>
      <div className="text-xs text-muted-foreground">
        {stats.statementCount} statements / {stats.transactionCount} transactions
      </div>
      {hasGaps && (
        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Missing: {stats.gaps.slice(0, 3).join(", ")}
          {stats.gaps.length > 3 && ` +${stats.gaps.length - 3} more`}
        </div>
      )}
    </div>
  );
}
```

### Transaction Status Badge Mapping
```typescript
// Based on existing tag-status-badge.tsx and CONTEXT.md decisions
// green=converted, yellow=skipped, gray=pending
type TransactionImportStatus = "converted" | "skipped" | "pending";

function getImportStatusFromTagStatus(tagStatus: string): TransactionImportStatus {
  switch (tagStatus) {
    case "converted":
      return "converted";
    case "not_subscription":
      return "skipped";
    default:
      return "pending";
  }
}

function ImportStatusBadge({ status }: { status: TransactionImportStatus }) {
  const config = {
    converted: { variant: "success" as const, label: "Converted" },
    skipped: { variant: "warning" as const, label: "Skipped" },
    pending: { variant: "secondary" as const, label: "Pending" },
  };

  const { variant, label } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
```

### Incomplete Batch Banner
```typescript
// Based on existing trial-banner.tsx pattern and CONTEXT.md decisions
function IncompleteBatchBanner() {
  const { batch, discard } = useIncompleteBatch();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!batch) return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          <strong>Incomplete import:</strong>{" "}
          {batch.processed} of {batch.total} files processed
          {batch.lastError && ` (${batch.lastError})`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="h-7">
          <Link href="/import/batch">Resume</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={() => setShowConfirm(true)}
        >
          Discard
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard incomplete import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {batch.total - batch.processed} unprocessed files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={discard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### Source Coverage API Response Type
```typescript
// Types for API response
interface SourceCoverage {
  sourceType: string;
  earliestStatementDate: string;  // ISO date
  latestStatementDate: string;    // ISO date
  statementCount: number;
  transactionCount: number;
  lastImportDate: string;         // ISO date
  stats: {
    converted: number;
    skipped: number;    // not_subscription status
    pending: number;    // unreviewed + potential_subscription
  };
  gaps: string[];  // ["2025-03", "2025-04"] - YYYY-MM format
}

interface SourcesResponse {
  sources: SourceCoverage[];
}

interface StatementSummary {
  id: string;
  originalFilename: string;
  statementDate: string;
  uploadedAt: string;
  transactionCount: number;
  stats: {
    converted: number;
    skipped: number;
    pending: number;
  };
}

interface SourceStatementsResponse {
  statements: StatementSummary[];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal drill-down | Inline accordion expansion | 2024 | Better UX, keeps context visible |
| Offset pagination | Keyset cursor pagination | Already in codebase | O(1) performance at depth |
| Single selection | Checkbox multi-select | Phase 21 | Batch operations enabled |

**Deprecated/outdated:**
- Card grid layouts for lists: Per CONTEXT.md, using list with expandable rows instead

## Open Questions

Things that couldn't be fully resolved:

1. **Gap granularity threshold**
   - What we know: User wants to see gaps in coverage
   - What's unclear: Is a single missing month always a "gap" or only consecutive missing periods?
   - Recommendation: Start with single-month granularity, can aggregate later if noisy

2. **Re-import vs full form edit**
   - What we know: Re-import opens pre-filled subscription form
   - What's unclear: Should user be able to edit all fields or just confirm?
   - Recommendation: Full form access (current SubscriptionForm) for flexibility

3. **Batch resume file restoration**
   - What we know: Can persist queue metadata in localStorage
   - What's unclear: How to restore File objects (cannot serialize)
   - Recommendation: Resume only shows which files were pending; user re-selects files to continue

## Sources

### Primary (HIGH confidence)
- Codebase: `src/components/ui/accordion.tsx` - Accordion pattern
- Codebase: `src/lib/hooks/use-batch-upload.ts` - localStorage persistence pattern
- Codebase: `src/lib/utils/dates.ts` - date-fns usage patterns
- Codebase: `src/app/api/transactions/[id]/convert/route.ts` - Conversion API
- Codebase: `src/components/billing/trial-banner.tsx` - Banner styling pattern
- [shadcn/ui Accordion](https://ui.shadcn.com/docs/components/radix/accordion) - Component documentation
- [date-fns eachMonthOfInterval](https://date-fns.org/) - Gap detection function

### Secondary (MEDIUM confidence)
- [shadcn.io expandable data table](https://www.shadcn.io/patterns/data-table-advanced-1) - Row expansion patterns
- [date-fns GitHub issue #3097](https://github.com/date-fns/date-fns/issues/3097) - Timezone edge cases

### Tertiary (LOW confidence)
- None - all patterns verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use in codebase
- Architecture: HIGH - follows established patterns from phases 20-21
- Pitfalls: HIGH - derived from existing code patterns and known issues

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable patterns, no fast-moving dependencies)
