# Phase 7: Smart Import UX - Research

**Researched:** 2026-02-02
**Domain:** Review-Before-Import UX, Bulk Selection, Inline Editing, Confidence Visualization, Data Persistence
**Confidence:** HIGH

## Summary

Smart Import UX transforms the PDF import flow from auto-import to review-before-import, showing users all detected items with confidence scores (0-100) and letting them select which ones to import. The phase builds on Phase 6's statement source tracking foundation and requires adding inline editing capabilities, confidence badge visualization, bulk selection controls, and raw extraction data persistence for audit/reprocessing.

The standard approach uses React state for editable table rows (not TanStack Table overkill for 5-20 items), custom Badge variants for confidence color-coding (green ≥70%, yellow 40-69%, red <40%), bulk selection with "Select all high confidence" button, and JSONB column in import_audits for raw extraction data persistence. The UI follows existing card-based layout from the import page rather than introducing a full data table component.

**Primary recommendation:** Keep import page card-based layout with editable fields inline (avoid TanStack Table complexity), extend Badge component with success/warning/destructive variants for confidence visualization, use simple React state for selection management, persist raw AI extraction to JSONB column for future audit.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Badge | Installed | Confidence score visualization | Base component, extend with custom variants |
| shadcn/ui Tooltip | Installed | Confidence explanation on hover | Already used for contextual help |
| React useState | React 19 | Selection + inline edit state | Sufficient for small item lists (5-20), no heavy library needed |
| Drizzle ORM | Installed | Add rawExtractionData JSONB column | Already used for all schema changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | Installed (via shadcn) | Badge variant configuration | For custom success/warning variants |
| Zod | Installed | Runtime validation of extraction data | Validate before persisting to JSONB |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simple React state | TanStack Table row selection | Overkill for 5-20 items, adds complexity for no benefit |
| Card-based layout | Full data table component | Inconsistent with existing import page design, table harder to make responsive |
| Custom Badge variants | Tailwind className overrides | Less maintainable, loses semantic variant system |
| JSONB in import_audits | Separate extraction_data table | Over-normalization for audit data, JSONB more appropriate |

**Installation:**
```bash
# All dependencies already installed
# Just need schema migration and Badge variant extension
npm run db:generate  # Generate migration for rawExtractionData column
npm run db:migrate   # Apply migration
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   └── badge.tsx                # MODIFY - Add success/warning variants
│   └── import/
│       └── account-combobox.tsx     # EXISTING - Already built in Phase 6
├── lib/
│   ├── db/
│   │   └── schema.ts                # MODIFY - Add rawExtractionData to import_audits
│   └── validations/
│       └── import.ts                # EXISTING - Already has confirmImportSchema
└── app/
    ├── (dashboard)/
    │   └── import/
    │       └── page.tsx             # MODIFY - Add selection controls, inline editing
    └── api/
        ├── import/
        │   ├── route.ts             # MODIFY - Return full AI response for persistence
        │   └── confirm/
        │       └── route.ts         # MODIFY - Persist rawExtractionData to audit
        └── subscriptions/
            └── [id]/
                └── route.ts         # NO CHANGE - Not in phase scope
```

### Pattern 1: Confidence Badge with Color-Coded Variants
**What:** Extend Badge component with success/warning variants for green/yellow/red confidence visualization
**When to use:** When displaying AI confidence scores with semantic color thresholds
**Example:**
```typescript
// src/components/ui/badge.tsx - Add custom variants
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",

        // NEW - Confidence score variants
        success: "border-transparent bg-green-500 text-white dark:bg-green-600",
        warning: "border-transparent bg-yellow-500 text-black dark:bg-yellow-600 dark:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Usage in import page
function ConfidenceBadge({ score }: { score: number }) {
  const variant = score >= 70 ? "success" : score >= 40 ? "warning" : "destructive";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant}>{score}%</Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>AI confidence this is a recurring subscription</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

**Color thresholds (from context decisions):**
- Green (success variant): ≥70% confidence
- Yellow (warning variant): 40-69% confidence
- Red (destructive variant): <40% confidence

### Pattern 2: Bulk Selection with Criteria-Based Controls
**What:** Three selection controls - "Select all", "Select none", "Select high confidence" (≥70%)
**When to use:** When users need quick selection presets in addition to individual checkboxes
**Example:**
```typescript
// src/app/(dashboard)/import/page.tsx
const [items, setItems] = useState<ImportItem[]>([]);

const selectedCount = items.filter((item) => item.selected).length;
const highConfidenceCount = items.filter((item) => item.confidence >= 70).length;

const selectAll = () => {
  setItems((prev) => prev.map((item) => ({ ...item, selected: true })));
};

const selectNone = () => {
  setItems((prev) => prev.map((item) => ({ ...item, selected: false })));
};

const selectHighConfidence = () => {
  setItems((prev) =>
    prev.map((item) => ({
      ...item,
      selected: item.confidence >= 70,
    }))
  );
};

// UI controls
<div className="flex items-center gap-2 mb-4">
  <Button variant="outline" size="sm" onClick={selectAll}>
    Select all
  </Button>
  <Button variant="outline" size="sm" onClick={selectNone}>
    Select none
  </Button>
  <Button variant="outline" size="sm" onClick={selectHighConfidence}>
    Select high confidence ({highConfidenceCount})
  </Button>
</div>
```

**UX considerations:**
- "Select high confidence" is the default on page load (pre-selected automatically)
- Button shows count to communicate how many will be selected
- No visual distinction between bulk-selected vs manually-selected items
- Selection state persists across inline edits

### Pattern 3: Inline Editing with Controlled State
**What:** Editable name/amount/cycle/category fields within card layout, changes stored in React state
**When to use:** Small number of editable rows (5-20), no pagination, all data loaded client-side
**Example:**
```typescript
// src/app/(dashboard)/import/page.tsx
interface ImportItem extends DetectedSubscription {
  selected: boolean;
  categoryId: string | null;
  nextRenewalDate: Date;
  action: "create" | "skip" | "merge";
}

const updateItem = (index: number, updates: Partial<ImportItem>) => {
  setItems((prev) =>
    prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
  );
};

// Inline editing UI
{item.selected && (
  <div className="grid gap-3 sm:grid-cols-2">
    {/* Name field - NEW */}
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        Name
      </label>
      <Input
        value={item.name}
        onChange={(e) => updateItem(index, { name: e.target.value })}
        className="mt-1"
      />
    </div>

    {/* Amount field - NEW */}
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        Amount
      </label>
      <Input
        type="number"
        step="0.01"
        value={item.amount}
        onChange={(e) => updateItem(index, { amount: parseFloat(e.target.value) })}
        className="mt-1"
      />
    </div>

    {/* Frequency - NEW */}
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        Cycle
      </label>
      <Select
        value={item.frequency}
        onValueChange={(v) => updateItem(index, { frequency: v as "monthly" | "yearly" })}
      >
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="yearly">Yearly</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Category - EXISTING (already in codebase) */}
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        Category
      </label>
      <Select
        value={item.categoryId ?? "none"}
        onValueChange={(v) => updateItem(index, { categoryId: v === "none" ? null : v })}
      >
        {/* ... existing category selector ... */}
      </Select>
    </div>
  </div>
)}
```

**Why simple state works:**
- Import flows typically yield 5-20 detected items (not thousands)
- All items loaded at once (no pagination needed)
- No complex filtering, sorting, or virtualization required
- React state updates are fast enough for this scale

### Pattern 4: Raw Extraction Data Persistence (JSONB)
**What:** Store complete AI response as JSONB in import_audits for audit trail and reprocessing
**When to use:** When preserving raw ML/AI output for debugging, audit, or future reprocessing
**Example:**
```typescript
// src/lib/db/schema.ts - Add to import_audits table
export const importAudits = pgTable(
  "import_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // ... existing fields (statementSource, fileCount, etc.)

    // NEW - Raw extraction data for audit and reprocessing
    rawExtractionData: jsonb("raw_extraction_data").$type<{
      subscriptions: DetectedSubscription[];
      model: string;
      processingTime: number;
      pageCount: number;
      extractedAt: string; // ISO timestamp
    }>(),

    // ... rest of fields
  },
  (table) => [index("import_audits_user_id_idx").on(table.userId)]
);

// src/app/api/import/route.ts - Capture full response
const parseResult = await parseDocumentForSubscriptions(base64Images, mimeType);

// Return with additional metadata for persistence
return NextResponse.json({
  subscriptions: subscriptionsWithDuplicates,
  pageCount: parseResult.pageCount,
  processingTime: parseResult.processingTime,
  detectedCount: parseResult.subscriptions.length,
  duplicateCount: duplicates.size,

  // NEW - Full extraction data for persistence
  rawExtractionData: {
    subscriptions: parseResult.subscriptions,
    model: "gpt-4o",
    processingTime: parseResult.processingTime,
    pageCount: parseResult.pageCount,
    extractedAt: new Date().toISOString(),
  },
});

// src/app/(dashboard)/import/page.tsx - Store extraction data
const [rawExtractionData, setRawExtractionData] = useState<any>(null);

const processFiles = async () => {
  // ... existing processing logic

  const data = await response.json();
  setRawExtractionData(data.rawExtractionData); // NEW - Capture for confirm step

  // ... transform to ImportItem[]
};

// src/app/api/import/confirm/route.ts - Persist to database
const confirmImportSchema = z.object({
  subscriptions: z.array(/* ... */),
  statementSource: z.string().min(1).max(50).trim(),
  rawExtractionData: z.object({
    subscriptions: z.array(z.any()),
    model: z.string(),
    processingTime: z.number(),
    pageCount: z.number(),
    extractedAt: z.string(),
  }).optional(), // NEW
});

const [audit] = await db
  .insert(importAudits)
  .values({
    userId: session.user.id,
    statementSource,
    fileCount: 1,
    totalPageCount: 1,
    detectedCount: toImport.length,
    confirmedCount: 0,
    rejectedCount: 0,
    mergedCount: 0,
    rawExtractionData, // NEW - Persist raw AI response
  })
  .returning();
```

**Storage considerations:**
- JSONB is appropriate for audit data (write-once, read rarely)
- Typical extraction has 5-20 items × 150 bytes ≈ 750-3000 bytes (well under 2KB TOAST threshold)
- No performance impact - JSONB not queried, only stored for audit
- Alternative would be separate extraction_data table, but over-normalized for this use case

### Pattern 5: Empty State and Low-Confidence Handling
**What:** Graceful handling of edge cases (zero items, no high-confidence items)
**When to use:** When AI extraction may yield empty or low-quality results
**Example:**
```typescript
// src/app/(dashboard)/import/page.tsx

{items.length === 0 ? (
  // No items detected at all
  <div className="py-8 text-center">
    <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
    <p className="mt-4 font-medium">No subscriptions detected</p>
    <p className="mt-1 text-sm text-muted-foreground">
      Try uploading a clearer image or a different statement
    </p>
    <div className="mt-4 flex justify-center gap-2">
      <Button variant="outline" onClick={() => { setStep("upload"); setFiles([]); }}>
        Try Again
      </Button>
      <Button onClick={() => router.push("/subscriptions/new")}>
        Add Manually
      </Button>
    </div>
  </div>
) : (
  <>
    {/* Warning banner if no high-confidence items */}
    {highConfidenceCount === 0 && (
      <div className="mb-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              No clear subscriptions found
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              The AI had low confidence in these detections. Please review carefully before importing.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Items list */}
    <div className="space-y-4">
      {items.map((item, index) => (
        <ImportItemCard key={index} item={item} index={index} />
      ))}
    </div>
  </>
)}
```

**UX decisions (from context):**
- Zero items: Show empty state with "Try Again" + "Add Manually" options
- No high-confidence items: Show warning banner but display all items normally (no separate low-confidence section)
- All items appear in original PDF order (not sorted by confidence)
- Low-confidence items not visually separated - just get red badge

### Anti-Patterns to Avoid

- **Using TanStack Table for 5-20 items:** Massive complexity overhead for no benefit. Simple React state with array mapping is sufficient.
- **Separate tables for low-confidence items:** Creates visual clutter and forces users to check two places. Single list with color-coded badges is clearer.
- **Disabling selection for low-confidence items:** User explicitly chose to review items - let them import what they want without restrictions.
- **Sorting items by confidence:** Breaks mental model of "this is what the PDF showed". Users want to verify AI against source document, original order helps.
- **Not persisting raw extraction data:** Makes debugging AI issues impossible. "Why did it detect this?" questions can't be answered without raw data.
- **Custom table implementation from scratch:** shadcn/ui already provides responsive card patterns in existing import page. Reuse that pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table row selection | Custom checkbox state management | React useState with array.map | Simple state sufficient, no library needed for <50 items |
| Confidence color thresholds | Inline className logic | Badge variants with CVA | Semantic, maintainable, consistent with design system |
| Inline validation | Custom error state per field | Existing Zod schemas at submit | Validation happens at confirm, no need for field-level |
| Tooltips for confidence | Custom hover state DIVs | shadcn Tooltip component | Accessibility, keyboard nav, proper z-index handling |
| JSONB queries | String parsing with JSON.parse | Drizzle ORM JSONB support | Type safety, proper escaping, no SQL injection risk |

**Key insight:** This is a review-before-import UI, not a full data management dashboard. Keep it simple with React basics rather than introducing heavy table libraries.

## Common Pitfalls

### Pitfall 1: Forgetting to Pass Raw Extraction Data to Confirm
**What goes wrong:** User reviews items, clicks import, but rawExtractionData is lost between steps

**Why it happens:** Import flow has two API calls:
1. `POST /api/import` - returns detected items + raw extraction data
2. `POST /api/import/confirm` - creates subscriptions + audit record

The raw extraction data must be captured in client state during step 1 and passed to step 2.

**How to avoid:**
```typescript
// Capture during processing
const [rawExtractionData, setRawExtractionData] = useState<any>(null);

const processFiles = async () => {
  const response = await fetch("/api/import", { method: "POST", body: formData });
  const data = await response.json();

  setRawExtractionData(data.rawExtractionData); // Store for later
  setItems(transformToImportItems(data.subscriptions));
  setStep("review");
};

// Pass during confirm
const confirmImport = async () => {
  const response = await fetch("/api/import/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscriptions: toImport,
      statementSource,
      rawExtractionData, // Include in request
    }),
  });
};
```

**Warning signs:** Audit records created without rawExtractionData, can't debug "why did AI detect this?" questions

### Pitfall 2: Badge Variant Type Mismatch
**What goes wrong:** TypeScript error when using new success/warning variants: `Type '"success"' is not assignable to type 'Variant'`

**Why it happens:** Badge component's type inference doesn't automatically pick up new variants from CVA config

**How to avoid:**
```typescript
// src/components/ui/badge.tsx
// After defining badgeVariants with CVA...

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  // ... implementation
}

// Usage - TypeScript now knows about success/warning
<Badge variant="success">High confidence</Badge>
<Badge variant="warning">Medium confidence</Badge>
```

**Warning signs:** TypeScript errors when using new variants, autocomplete not suggesting success/warning

### Pitfall 3: Losing Selection State After Inline Edit
**What goes wrong:** User selects item, edits name/amount, checkbox unchecks itself

**Why it happens:** State update creates new object reference, checkbox controlled by `item.selected` gets reset

**How to avoid:**
```typescript
// Good - preserve all fields when updating
const updateItem = (index: number, updates: Partial<ImportItem>) => {
  setItems((prev) =>
    prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
  );
};

// Bad - reconstructs object, loses selected state
const updateItem = (index: number, updates: Partial<ImportItem>) => {
  setItems((prev) =>
    prev.map((item, i) => (i === index ? updates : item)) // Missing spread
  );
};

// Checkbox always uses current item.selected
<Checkbox
  checked={item.selected}
  onCheckedChange={() => toggleItem(index)}
/>
```

**Warning signs:** Selection checkboxes flicker or uncheck when editing fields, users complain about losing selections

### Pitfall 4: JSONB Column Size Assumptions
**What goes wrong:** Import fails with "value too long" error after adding rawExtractionData

**Why it happens:** JSONB has no size limit in schema, but TOAST storage performance degrades beyond 2KB

**How to avoid:**
```typescript
// Validate size before persisting
const rawExtractionDataSchema = z.object({
  subscriptions: z.array(z.any()).max(100), // Reasonable limit
  model: z.string(),
  processingTime: z.number(),
  pageCount: z.number(),
  extractedAt: z.string(),
});

// In confirm API
const result = confirmImportSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
}

// Optional: Check JSON size before insert
const rawDataString = JSON.stringify(result.data.rawExtractionData);
if (rawDataString.length > 50000) { // 50KB limit
  console.warn("Raw extraction data exceeds 50KB, truncating...");
  // Could truncate or skip rawText fields
}
```

**Size expectations:**
- 5 items × 150 bytes = 750 bytes
- 20 items × 150 bytes = 3KB
- 100 items × 150 bytes = 15KB (edge case)

**Warning signs:** Slow queries on import_audits, "tuple too large" errors, unexpectedly high database storage usage

### Pitfall 5: Not Handling Undefined Confidence Scores
**What goes wrong:** Some items show "NaN%" badge or crash with "Cannot read property of undefined"

**Why it happens:** AI sometimes omits confidence field, or value is null/undefined after parsing

**How to avoid:**
```typescript
// src/lib/openai/pdf-parser.ts - Already has defensive default
subscriptions = subscriptions.map((sub) => ({
  ...sub,
  name: sub.name.trim(),
  currency: sub.currency.toUpperCase(),
  confidence: Math.min(100, Math.max(0, sub.confidence || 50)), // Default to 50 if missing
}));

// Component - additional safety check
function ConfidenceBadge({ score }: { score: number }) {
  const safeScore = typeof score === "number" && !isNaN(score) ? score : 50;
  const variant = safeScore >= 70 ? "success" : safeScore >= 40 ? "warning" : "destructive";

  return <Badge variant={variant}>{safeScore}%</Badge>;
}
```

**Warning signs:** "NaN" text in badges, console errors about undefined values, inconsistent badge colors

## Code Examples

Verified patterns from codebase and official sources:

### Extended Badge Component with Confidence Variants
```typescript
// src/components/ui/badge.tsx - Add success/warning variants
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // NEW - Confidence score variants
        success:
          "border-transparent bg-green-500 text-white [a&]:hover:bg-green-600 dark:bg-green-600 dark:[a&]:hover:bg-green-700",
        warning:
          "border-transparent bg-yellow-500 text-black [a&]:hover:bg-yellow-600 dark:bg-yellow-600 dark:text-white dark:[a&]:hover:bg-yellow-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
```

### Confidence Badge with Tooltip
```typescript
// src/app/(dashboard)/import/page.tsx - Helper component
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

function ConfidenceBadge({ score }: { score: number }) {
  const safeScore = typeof score === "number" && !isNaN(score) ? score : 50;

  // Thresholds from context decisions
  const variant = safeScore >= 70 ? "success" : safeScore >= 40 ? "warning" : "destructive";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant}>{safeScore}%</Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>AI confidence this is a recurring subscription</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Bulk Selection Controls
```typescript
// src/app/(dashboard)/import/page.tsx - Selection controls
const selectedCount = items.filter((item) => item.selected).length;
const highConfidenceCount = items.filter((item) => item.confidence >= 70).length;

const selectAll = () => {
  setItems((prev) => prev.map((item) => ({ ...item, selected: true })));
};

const selectNone = () => {
  setItems((prev) => prev.map((item) => ({ ...item, selected: false })));
};

const selectHighConfidence = () => {
  setItems((prev) =>
    prev.map((item) => ({
      ...item,
      selected: item.confidence >= 70,
    }))
  );
};

// Render controls above items list
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={selectAll}>
      Select all
    </Button>
    <Button variant="outline" size="sm" onClick={selectNone}>
      Select none
    </Button>
    <Button variant="outline" size="sm" onClick={selectHighConfidence}>
      Select high confidence ({highConfidenceCount})
    </Button>
  </div>
  <p className="text-sm text-muted-foreground">
    {selectedCount} of {items.length} selected
  </p>
</div>
```

### Inline Editing Fields (Enhanced Import Item Card)
```typescript
// src/app/(dashboard)/import/page.tsx - Editable fields
<div className="space-y-4">
  {items.map((item, index) => (
    <div
      key={index}
      className={cn(
        "rounded-lg border p-4 transition-colors",
        item.selected ? "border-primary bg-primary/5" : ""
      )}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={item.selected}
          onCheckedChange={() => toggleItem(index)}
          className="mt-1"
        />
        <div className="flex-1 space-y-3">
          {/* Header row with name and confidence */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(item.amount, item.currency)} / {item.frequency}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ConfidenceBadge score={item.confidence} />
              {item.isDuplicate && (
                <Badge variant="destructive">
                  Duplicate of {item.duplicateOf}
                </Badge>
              )}
            </div>
          </div>

          {/* Inline edit fields - only show when selected */}
          {item.selected && (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) =>
                    updateItem(index, { amount: parseFloat(e.target.value) })
                  }
                  className="mt-1"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Cycle
                </label>
                <Select
                  value={item.frequency}
                  onValueChange={(v) =>
                    updateItem(index, { frequency: v as "monthly" | "yearly" })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category - EXISTING pattern */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <Select
                  value={item.categoryId ?? "none"}
                  onValueChange={(v) =>
                    updateItem(index, { categoryId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Next Renewal - EXISTING pattern */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Next Renewal
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="mt-1 w-full justify-start text-left font-normal"
                    >
                      {format(item.nextRenewalDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={item.nextRenewalDate}
                      onSelect={(date) =>
                        date && updateItem(index, { nextRenewalDate: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ))}
</div>
```

### Schema Migration for Raw Extraction Data
```typescript
// src/lib/db/schema.ts - Add to import_audits table
import { pgTable, uuid, varchar, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";

export const importAudits = pgTable(
  "import_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Statement source (bank/credit card account name)
    statementSource: varchar("statement_source", { length: 50 }),

    // File info (metadata only, no actual file stored)
    fileCount: integer("file_count").notNull(),
    totalPageCount: integer("total_page_count"),

    // Processing results
    detectedCount: integer("detected_count").notNull(),
    confirmedCount: integer("confirmed_count").default(0).notNull(),
    rejectedCount: integer("rejected_count").default(0).notNull(),
    mergedCount: integer("merged_count").default(0).notNull(),

    // NEW - Raw extraction data for audit and reprocessing
    rawExtractionData: jsonb("raw_extraction_data").$type<{
      subscriptions: Array<{
        name: string;
        amount: number;
        currency: string;
        frequency: "monthly" | "yearly";
        confidence: number;
        rawText?: string;
      }>;
      model: string;
      processingTime: number;
      pageCount: number;
      extractedAt: string;
    }>(),

    // Status
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("import_audits_user_id_idx").on(table.userId)]
);
```

### Updated Validation Schema
```typescript
// src/lib/validations/import.ts - Add rawExtractionData
import { z } from "zod";

export const detectedSubscriptionSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  frequency: z.enum(["monthly", "yearly"]),
  confidence: z.number().min(0).max(100),
  rawText: z.string().optional(),
});

export const confirmImportSchema = z.object({
  subscriptions: z.array(
    z.object({
      name: z.string().min(1, "Name is required"),
      amount: z.number().positive("Amount must be positive"),
      currency: z.string().length(3),
      frequency: z.enum(["monthly", "yearly"]),
      categoryId: z.string().uuid().optional().nullable(),
      nextRenewalDate: z.coerce.date(),
      action: z.enum(["create", "skip", "merge"]),
      mergeWithId: z.string().uuid().optional(),
    })
  ),
  statementSource: z
    .string()
    .min(1, "Account name is required")
    .max(50, "Account name must be 50 characters or less")
    .trim(),

  // NEW - Raw extraction data for persistence
  rawExtractionData: z.object({
    subscriptions: z.array(detectedSubscriptionSchema),
    model: z.string(),
    processingTime: z.number(),
    pageCount: z.number(),
    extractedAt: z.string(),
  }).optional(),
});

export type DetectedSubscription = z.infer<typeof detectedSubscriptionSchema>;
export type ConfirmImportInput = z.infer<typeof confirmImportSchema>;
```

### Updated Import API (Return Raw Extraction Data)
```typescript
// src/app/api/import/route.ts - Return raw extraction for persistence
export async function POST(request: Request) {
  // ... existing validation and processing

  const parseResult = await parseDocumentForSubscriptions(base64Images, mimeType);

  // ... duplicate detection

  return NextResponse.json({
    subscriptions: subscriptionsWithDuplicates,
    pageCount: parseResult.pageCount,
    processingTime: parseResult.processingTime,
    detectedCount: parseResult.subscriptions.length,
    duplicateCount: duplicates.size,

    // NEW - Include raw extraction data for persistence
    rawExtractionData: {
      subscriptions: parseResult.subscriptions,
      model: "gpt-4o",
      processingTime: parseResult.processingTime,
      pageCount: parseResult.pageCount,
      extractedAt: new Date().toISOString(),
    },
  });
}
```

### Updated Confirm API (Persist Raw Extraction Data)
```typescript
// src/app/api/import/confirm/route.ts - Persist to database
export async function POST(request: Request) {
  // ... auth and validation

  const body = await request.json();
  const result = confirmImportSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { subscriptions: toImport, statementSource, rawExtractionData } = result.data;

  // Create audit record with raw extraction data
  const [audit] = await db
    .insert(importAudits)
    .values({
      userId: session.user.id,
      statementSource,
      fileCount: 1,
      totalPageCount: 1,
      detectedCount: toImport.length,
      confirmedCount: 0,
      rejectedCount: 0,
      mergedCount: 0,
      rawExtractionData, // NEW - Persist AI response
    })
    .returning();

  // ... process subscriptions

  // Update audit with final counts
  await db
    .update(importAudits)
    .set({
      confirmedCount: createdCount,
      rejectedCount: skippedCount,
      mergedCount,
      completedAt: new Date(),
    })
    .where(eq(importAudits.id, audit.id));

  return NextResponse.json({
    created: createdCount,
    skipped: skippedCount,
    merged: mergedCount,
    subscriptions: createdSubscriptions,
  });
}
```

### Import Page State Management
```typescript
// src/app/(dashboard)/import/page.tsx - Add raw extraction state
const [rawExtractionData, setRawExtractionData] = useState<any>(null);

const processFiles = async () => {
  if (files.length === 0) return;

  setIsProcessing(true);
  setStep("processing");

  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/import", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to process files");
    }

    const data = await response.json();

    // NEW - Store raw extraction data for confirm step
    setRawExtractionData(data.rawExtractionData);

    // Transform detected subscriptions to import items
    const importItems: ImportItem[] = data.subscriptions.map(
      (sub: DetectedSubscription) => ({
        ...sub,
        selected: !sub.isDuplicate && sub.confidence >= 70, // Pre-select high confidence
        categoryId: null,
        nextRenewalDate: addMonths(new Date(), 1),
        action: sub.isDuplicate ? "skip" : "create",
      })
    );

    setItems(importItems);
    setStep("review");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to process files");
    setStep("upload");
  } finally {
    setIsProcessing(false);
  }
};

const confirmImport = async () => {
  const toImport = items.map((item) => ({
    name: item.name,
    amount: item.amount,
    currency: item.currency,
    frequency: item.frequency,
    categoryId: item.categoryId,
    nextRenewalDate: item.nextRenewalDate,
    action: item.selected ? item.action : "skip",
  }));

  setIsConfirming(true);

  try {
    const response = await fetch("/api/import/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptions: toImport,
        statementSource,
        rawExtractionData, // NEW - Include raw extraction
      }),
    });

    // ... handle response
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to import");
  } finally {
    setIsConfirming(false);
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auto-import all detected items | Review-before-import with selection | 2024-2025 | Users gain control, reduces accidental imports |
| Binary yes/no detection | 0-100 confidence scores | 2023-2024 | Transparent AI uncertainty, better user trust |
| Text-only confidence | Color-coded badges (green/yellow/red) | 2024-2025 | Faster visual scanning, semantic color meaning |
| TanStack Table for all lists | Simple state for <50 items | 2025 | Less complexity, faster implementation for small datasets |
| Separate audit logs table | JSONB in same table | 2023-2024 | Simpler queries, appropriate for write-once data |
| Static color thresholds in code | Badge variants with CVA | 2024 | Maintainable, reusable, design system consistency |

**Deprecated/outdated:**
- **TanStack Table for every list:** Modern guidance says use simple state for <50 items, reserve complex libraries for 100+ row tables with pagination/filtering
- **Inline style for confidence colors:** CVA-based variants replaced inline className logic for semantic color management
- **Separate extraction_data table:** JSONB in audit table is now preferred for write-once, read-rarely data (PostgreSQL performance improvements)
- **Modal editing for table rows:** Inline editing is faster for quick edits, modal reserved for complex multi-step forms

## Open Questions

Things that couldn't be fully resolved:

1. **Should confidence tooltip show AI reasoning?**
   - What we know: Tooltip shows "AI confidence this is a recurring subscription"
   - What's unclear: GPT-4o doesn't return reasoning by default, would need structured output or chain-of-thought prompting
   - Recommendation: Keep simple tooltip for v1.1 (Phase 7). If users request "why low confidence?", defer to Phase 7++ with structured output enhancement.

2. **How long to retain raw extraction data?**
   - What we know: JSONB persists in import_audits indefinitely
   - What's unclear: Should old extraction data be purged after 90 days? 1 year?
   - Recommendation: Keep indefinitely for Phase 7 (storage cost is minimal). Add cleanup policy in settings later if database grows large.

3. **Should "Select high confidence" button be primary action?**
   - What we know: High-confidence items are pre-selected by default
   - What's unclear: Is button needed if default selection already matches?
   - Recommendation: Keep button for "reset to defaults" use case - users might deselect/modify, then want to restore original smart selection.

4. **Should duplicate items be selectable?**
   - What we know: Duplicates are marked with badge, action defaults to "skip"
   - What's unclear: Should checkbox be disabled for duplicates?
   - Recommendation: Allow selection (user might want to merge or update existing subscription). Just default to unselected and show badge.

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `src/app/(dashboard)/import/page.tsx` - Current import flow structure (lines 62-545)
  - `src/app/api/import/route.ts` - AI extraction process (lines 56-195)
  - `src/app/api/import/confirm/route.ts` - Subscription creation flow (lines 10-135)
  - `src/lib/openai/pdf-parser.ts` - DetectedSubscription schema, confidence defaults (lines 1-286)
  - `src/lib/db/schema.ts` - import_audits table (lines 314-343)
  - `src/components/ui/badge.tsx` - Badge variants structure (lines 1-47)
  - `src/lib/validations/import.ts` - Validation schemas (lines 1-34)
- shadcn/ui Badge: [https://ui.shadcn.com/docs/components/badge](https://ui.shadcn.com/docs/components/badge)
- shadcn/ui Tooltip: [https://ui.shadcn.com/docs/components/tooltip](https://ui.shadcn.com/docs/components/tooltip)
- TanStack Table Row Selection Guide: [https://tanstack.com/table/v8/docs/guide/row-selection](https://tanstack.com/table/v8/docs/guide/row-selection)
- PostgreSQL JSONB Documentation: [https://www.postgresql.org/docs/current/datatype-json.html](https://www.postgresql.org/docs/current/datatype-json.html)

### Secondary (MEDIUM confidence)
- [Agentic Design - Confidence Visualization UI Patterns](https://agentic-design.ai/patterns/ui-ux-patterns/confidence-visualization-patterns) - AI confidence display best practices
- [Material React Table V3 - Editing Guide](https://www.material-react-table.com/docs/guides/editing) - Inline editing patterns
- [PatternFly - Bulk Selection](https://www.patternfly.org/patterns/bulk-selection/) - Bulk selection UX pattern
- [ScalegGrid - JSONB in PostgreSQL](https://scalegrid.io/blog/using-jsonb-in-postgresql-how-to-effectively-store-index-json-data-in-postgresql/) - JSONB best practices
- [pganalyze - Postgres JSONB TOAST Performance](https://pganalyze.com/blog/5mins-postgres-jsonb-toast) - JSONB size considerations
- [Simple Table - React Table Row Selection Guide](https://www.simple-table.com/blog/react-table-row-selection-guide) - Selection state management

### Tertiary (LOW confidence)
- [Jakob Nielsen 2026 UX Predictions](https://jakobnielsenphd.substack.com/p/2026-predictions) - Review fatigue and audit interfaces (prediction, not verified)
- [Medium - Designing Confidence-Based Feedback UI](https://medium.com/design-bootcamp/designing-a-confidence-based-feedback-ui-f5eba0420c8c) - Single blog post on confidence UI

## Metadata

**Confidence breakdown:**
- Badge variants extension: HIGH - Simple CVA config addition, existing codebase pattern
- Bulk selection pattern: HIGH - Standard React state management, verified in multiple sources
- Inline editing: HIGH - Existing import page already has inline fields, just extend to name/amount/cycle
- JSONB persistence: HIGH - PostgreSQL official docs, verified performance characteristics
- Confidence visualization: MEDIUM - Thresholds from context decisions, color mapping based on UX research (not tested with users)

**Research date:** 2026-02-02
**Valid until:** 2026-05-02 (90 days - stable React patterns and PostgreSQL features, slow-changing)
