# Phase 21: Manual Tagging & Conversion - Research

**Researched:** 2026-02-09
**Domain:** Multi-select table interactions, custom tagging systems, transaction-to-subscription conversion
**Confidence:** HIGH

## Summary

This phase implements manual enrichment of statement transactions through custom tagging and one-click conversion to subscriptions. The research confirms the existing codebase patterns for comboboxes (cmdk-based), mutations (TanStack Query with optimistic updates), and toast notifications (Sonner with undo actions) provide the foundation. A new database schema for user-defined tags is required.

The key architectural decisions from CONTEXT.md are locked: inline icon button for tagging (not modal), multiple custom tags per transaction, checkbox-based bulk selection with floating action bar, one-click conversion with confirmation toast (not form modal), and bidirectional linking between transactions and subscriptions.

**Primary recommendation:** Use the existing CategoryCombobox pattern (cmdk + Popover) for tag selection, implement bulk selection state in the TransactionBrowser component, and create a floating action bar component that appears when items are selected. Conversion creates a subscription via the existing API and links it to the transaction via a new PATCH endpoint.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.x (existing) | Mutations for tag/convert operations | Already in codebase, provides optimistic updates |
| cmdk | 1.x (existing via shadcn) | Tag combobox dropdown | Already powers Command component in codebase |
| sonner | 2.x (existing) | Toast with undo action for conversions | Already in codebase, supports action buttons |
| drizzle-orm | 0.45.x (existing) | Tag and junction table queries | Already in codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (existing) | Tag icon, checkbox icons | Icon buttons in transaction rows |
| zod | 4.x (existing) | Tag and conversion validation | API input validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cmdk Popover | Radix DropdownMenu | cmdk provides search/filter built-in, better for growing tag lists |
| React state for selection | TanStack Table row selection | TanStack Table is heavyweight for simple checkbox state; codebase uses custom virtualization |
| Floating UI for action bar | CSS fixed positioning | Floating UI adds complexity; fixed position is simpler for bottom bar |

**Installation:**
No new dependencies required - all necessary libraries are already in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/
│   ├── tags/
│   │   └── route.ts                    # GET (list), POST (create tag)
│   ├── transactions/
│   │   ├── [id]/
│   │   │   ├── tags/
│   │   │   │   └── route.ts            # PATCH (update tags), DELETE (remove tag)
│   │   │   └── convert/
│   │   │       └── route.ts            # POST (convert to subscription)
│   │   └── bulk/
│   │       └── route.ts                # POST (bulk tag/convert)
├── components/transactions/
│   ├── tag-combobox.tsx                # Inline tag selector dropdown
│   ├── tag-badge.tsx                   # Colored tag pill display
│   ├── transaction-row.tsx             # UPDATE: Add checkbox + tag button
│   ├── transaction-card.tsx            # UPDATE: Add checkbox + tag button
│   ├── bulk-action-bar.tsx             # Floating bottom action bar
│   └── converted-badge.tsx             # "Converted" indicator with link
├── components/settings/
│   └── tag-manager.tsx                 # Tag CRUD in settings area
└── lib/
    ├── db/
    │   └── schema.ts                   # UPDATE: Add tags + transaction_tags tables
    ├── hooks/
    │   ├── use-tags.ts                 # Tag CRUD hooks
    │   ├── use-transaction-tags.ts     # Transaction tagging mutations
    │   └── use-convert-transaction.ts  # Conversion mutation with undo
    └── validations/
        └── tag.ts                      # Tag schemas
```

### Pattern 1: User-Defined Tags Schema
**What:** Separate tags table with junction table for many-to-many relationship
**When to use:** Multiple custom tags per transaction, user-managed tag list
**Example:**
```typescript
// Source: Existing codebase pattern from categories table
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 7 }).notNull(), // Hex color
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("tags_user_name_idx").on(table.userId, table.name),
  ]
);

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.transactionId, table.tagId] }),
    index("transaction_tags_transaction_idx").on(table.transactionId),
    index("transaction_tags_tag_idx").on(table.tagId),
  ]
);
```

### Pattern 2: Inline Tag Combobox
**What:** Popover-based combobox showing existing tags with search
**When to use:** Tagging a single transaction inline in the row
**Example:**
```typescript
// Source: Existing CategoryCombobox pattern
export function TagCombobox({
  transactionId,
  appliedTags,
  availableTags,
  onTagToggle,
}: TagComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Tag className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {availableTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => onTagToggle(transactionId, tag.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      appliedTags.includes(tag.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### Pattern 3: Bulk Selection State
**What:** React state managing selected transaction IDs, checkbox column in virtualized list
**When to use:** Multi-select for bulk operations
**Example:**
```typescript
// Source: TanStack Table row selection pattern adapted for custom virtualization
export function TransactionBrowser() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Only visible transactions can be selected via header checkbox
  const visibleTransactionIds = useMemo(
    () => allTransactions.map(t => t.id),
    [allTransactions]
  );

  const isAllVisibleSelected = visibleTransactionIds.length > 0 &&
    visibleTransactionIds.every(id => selectedIds.has(id));

  const isSomeSelected = selectedIds.size > 0 && !isAllVisibleSelected;

  const toggleAll = () => {
    if (isAllVisibleSelected) {
      // Deselect all visible
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleTransactionIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleTransactionIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      {/* Table with checkbox column */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onTag={() => handleBulkTag(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </>
  );
}
```

### Pattern 4: Floating Action Bar
**What:** Fixed-position bar at screen bottom showing selection count and bulk actions
**When to use:** When one or more transactions are selected
**Example:**
```typescript
// Source: Common bulk action pattern
export function BulkActionBar({
  count,
  onTag,
  onConvert,
  onClear,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-4 bg-background border rounded-lg shadow-lg px-4 py-3">
        <span className="text-sm font-medium">
          {count} item{count !== 1 ? 's' : ''} selected
        </span>
        <div className="h-4 w-px bg-border" />
        <Button variant="outline" size="sm" onClick={onTag}>
          <Tag className="mr-2 h-4 w-4" />
          Tag
        </Button>
        <Button variant="outline" size="sm" onClick={onConvert}>
          <ArrowRightCircle className="mr-2 h-4 w-4" />
          Convert
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### Pattern 5: One-Click Conversion with Toast
**What:** Convert transaction to subscription, show confirmation toast with undo
**When to use:** Converting a single transaction or bulk converting selected transactions
**Example:**
```typescript
// Source: Sonner toast with action pattern
export function useConvertTransaction() {
  const queryClient = useQueryClient();
  const createSubscription = useCreateSubscription();

  return useMutation({
    mutationFn: async (transaction: TransactionWithSource) => {
      // Create subscription with pre-filled data
      const subscriptionData = {
        name: transaction.merchantName,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        frequency: guessFrequency(transaction), // Default to monthly
        nextRenewalDate: calculateNextRenewal(transaction.transactionDate),
        categoryId: await guessCategoryFromMerchant(transaction.merchantName),
        status: 'active' as const,
        reminderEnabled: true,
      };

      // Create subscription
      const { subscription } = await createSubscription.mutateAsync(subscriptionData);

      // Link transaction to subscription
      await fetch(`/api/transactions/${transaction.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      return { transaction, subscription };
    },
    onSuccess: ({ transaction, subscription }) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });

      toast.success(`Converted "${transaction.merchantName}" to subscription`, {
        duration: 8000, // Longer duration for undo opportunity
        action: {
          label: 'Undo',
          onClick: async () => {
            // Unlink transaction and optionally delete subscription
            await fetch(`/api/transactions/${transaction.id}/convert`, {
              method: 'DELETE',
            });
            queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
            toast.info('Conversion undone');
          },
        },
      });
    },
  });
}
```

### Pattern 6: Bidirectional Link Display
**What:** Transaction shows linked subscription badge, subscription shows source transaction
**When to use:** After conversion, displaying the relationship in both directions
**Example:**
```typescript
// Transaction row: Show "Converted" badge with link
{transaction.convertedToSubscriptionId && (
  <Link href={`/subscriptions/${transaction.convertedToSubscriptionId}`}>
    <Badge variant="secondary" className="bg-green-100 text-green-800">
      <Link2 className="mr-1 h-3 w-3" />
      Converted
    </Badge>
  </Link>
)}

// Subscription detail: Show source transaction
{subscription.sourceTransactionId && (
  <div className="text-sm text-muted-foreground">
    <span>Created from </span>
    <Link href={`/transactions?highlight=${subscription.sourceTransactionId}`}>
      bank statement transaction
    </Link>
  </div>
)}
```

### Anti-Patterns to Avoid
- **Modal dialogs for quick tagging:** CONTEXT.md specifies inline combobox. Modals add friction.
- **Form modal for conversion:** CONTEXT.md specifies one-click with toast. Form modal slows users down.
- **Selecting ALL matching filter rows:** CONTEXT.md specifies visible rows only. All-matching is confusing with infinite scroll.
- **Tags at merchant pattern level:** CONTEXT.md specifies transaction-level tags. Same merchant can have different tags.
- **Overwriting tags on re-import:** CONTEXT.md specifies preserve tags. Duplicate detection keeps existing tagged transaction.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combobox with search | Custom dropdown + filter | cmdk Command component | Accessible, keyboard navigation, search built-in |
| Checkbox indeterminate state | Manual three-state logic | shadcn Checkbox with data-state | Native indeterminate support |
| Toast with action button | Custom notification + timer | Sonner toast.success() with action | Built-in dismiss, action callbacks |
| Optimistic cache updates | Manual state management | TanStack Query mutation callbacks | Handles rollback, refetch, cache invalidation |
| Color picker for tags | Input type="color" | Predefined color palette | Consistent brand colors, no ugly picker |

**Key insight:** The codebase already has patterns for all these interactions (CategoryCombobox, CategoryManager, useCreateSubscription, Sonner toasts). Reuse these patterns rather than inventing new approaches.

## Common Pitfalls

### Pitfall 1: Tag State Drift Between Virtualized Rows
**What goes wrong:** Tags applied in-memory don't reflect in newly virtualized rows after scroll
**Why it happens:** React state updated but virtualized row re-renders with stale data
**How to avoid:** Use TanStack Query cache as source of truth, invalidate after mutation
**Warning signs:** Tags disappear when scrolling away and back

### Pitfall 2: Bulk Selection State Lost on Filter Change
**What goes wrong:** User selects items, changes filter, selection includes items no longer visible
**Why it happens:** Selection state independent of filter state
**How to avoid:** Clear selection when filters change, or only operate on intersection of selected and visible
**Warning signs:** "N items selected" but N is larger than visible count

### Pitfall 3: Race Condition in One-Click Conversion
**What goes wrong:** User clicks convert twice quickly, creates duplicate subscriptions
**Why it happens:** Mutation fires before UI disables button
**How to avoid:** Use mutation.isPending to disable button, or debounce clicks
**Warning signs:** Same merchant appears twice in subscriptions

### Pitfall 4: Undo Toast Dismissed Before Action
**What goes wrong:** User clicks elsewhere, toast disappears, can't undo
**Why it happens:** Default Sonner duration too short, or user clicks dismisses toast
**How to avoid:** Use longer duration (8000ms), add "View subscription" link as fallback
**Warning signs:** User complaints about "accidental" conversions

### Pitfall 5: Re-import Overwrites Manual Tags
**What goes wrong:** User tags transactions, re-imports same statement, tags disappear
**Why it happens:** Duplicate detection creates new transaction instead of matching existing
**How to avoid:** Fingerprint-based deduplication skips existing transactions entirely
**Warning signs:** Tags gone after re-importing statement

### Pitfall 6: Converted Badge Obscures Other Tags
**What goes wrong:** "Converted" badge takes all space, custom tags not visible
**Why it happens:** Row has limited width, all badges compete for space
**How to avoid:** "Converted" is distinct from user tags visually (different style/position), or show in separate column
**Warning signs:** Users ask "where are my tags?" on converted transactions

## Code Examples

### Tag API Route
```typescript
// Source: Existing category API pattern
// src/app/api/tags/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createTagSchema } from '@/lib/validations/tag';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userTags = await db.query.tags.findMany({
    where: eq(tags.userId, session.user.id),
    orderBy: (tags, { asc }) => [asc(tags.name)],
  });

  return NextResponse.json({ tags: userTags });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = createTagSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const [tag] = await db
    .insert(tags)
    .values({
      userId: session.user.id,
      name: result.data.name,
      color: result.data.color,
    })
    .returning();

  return NextResponse.json({ tag }, { status: 201 });
}
```

### Transaction Convert API Route
```typescript
// Source: New endpoint following existing patterns
// src/app/api/transactions/[id]/convert/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { transactions, subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscriptionId } = await request.json();

  // Verify transaction belongs to user
  const transaction = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.id, params.id),
      eq(transactions.userId, session.user.id)
    ),
  });

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  // Link transaction to subscription
  await db
    .update(transactions)
    .set({
      convertedToSubscriptionId: subscriptionId,
      tagStatus: 'converted',
    })
    .where(eq(transactions.id, params.id));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Unlink transaction from subscription (undo conversion)
  const [transaction] = await db
    .update(transactions)
    .set({
      convertedToSubscriptionId: null,
      tagStatus: 'unreviewed',
    })
    .where(and(
      eq(transactions.id, params.id),
      eq(transactions.userId, session.user.id)
    ))
    .returning();

  // Optionally: Delete the linked subscription
  // This is left to the caller to decide

  return NextResponse.json({ success: true, transaction });
}
```

### useTags Hook
```typescript
// Source: Following existing useCategories pattern
export const tagKeys = {
  all: ['tags'] as const,
  list: () => [...tagKeys.all, 'list'] as const,
};

export function useTags() {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: async () => {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json() as Promise<{ tags: Tag[] }>;
    },
    staleTime: 5 * 60 * 1000, // Tags rarely change
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagInput) => {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create tag');
      return res.json() as Promise<{ tag: Tag }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.list() });
    },
  });
}
```

### Transaction Tag Toggle
```typescript
// Toggle a tag on/off for a transaction
export function useToggleTransactionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, tagId, action }: {
      transactionId: string;
      tagId: string;
      action: 'add' | 'remove';
    }) => {
      const method = action === 'add' ? 'POST' : 'DELETE';
      const res = await fetch(`/api/transactions/${transactionId}/tags`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
      if (!res.ok) throw new Error('Failed to update tags');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed enum tag status | User-defined custom tags | This phase | More flexibility, user-managed vocabulary |
| Form modal for actions | One-click with toast confirmation | UX best practice | Faster workflows, less friction |
| Radio-style tagging | Multi-select tags per item | This phase | Richer categorization |
| Server-side selection | Client-side selection state | Always | Faster feedback, no round-trips |

**Deprecated/outdated:**
- The existing `transactionTagStatusEnum` (unreviewed, potential_subscription, etc.) remains for AI confidence tracking but is separate from user-defined tags

## Open Questions

1. **AI Category Guessing for Conversion**
   - What we know: CONTEXT.md mentions "AI-guessed category from merchant name"
   - What's unclear: Is this existing functionality or needs to be built?
   - Recommendation: Check if categoryGuess field already exists in transactions (it does). Use that as default categoryId lookup by name match.

2. **Bulk Conversion Flow**
   - What we know: User can bulk-tag, but bulk-convert isn't explicitly required
   - What's unclear: Should bulk convert be available?
   - Recommendation: Start with bulk tagging only. Conversion is higher stakes - keep it single-item to avoid mass mistakes.

3. **Tag Color Palette**
   - What we know: Tags need colors for badge display
   - What's unclear: Predefined palette or color picker?
   - Recommendation: Predefined palette of 8-10 colors (like category colors) for consistency.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/components/categories/category-combobox.tsx` - Combobox pattern
- Existing codebase: `src/lib/hooks/use-subscriptions.ts` - Mutation pattern with toast
- Existing codebase: `src/lib/hooks/use-categories.ts` - CRUD hooks pattern
- Existing codebase: `src/lib/db/schema.ts` - Table schema patterns
- [Sonner Toast Documentation](https://sonner.emilkowal.ski/toast) - Action button API
- [TanStack Table Row Selection](https://tanstack.com/table/v8/docs/guide/row-selection) - Selection pattern

### Secondary (MEDIUM confidence)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) - Row selection with checkboxes
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Mutation callbacks

### Tertiary (LOW confidence)
- General UX patterns for floating action bars - No specific authoritative source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase
- Architecture: HIGH - Following established codebase patterns
- Pitfalls: MEDIUM - Based on common React/virtualization issues

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable libraries, established patterns)
