# Architecture Patterns: Statement Hub Integration

**Domain:** Batch Import + Statement Line Item Storage + Statement Browser
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

This architecture document outlines how to integrate Statement Hub features (batch import, line item storage, and statement browser) into the existing subscription manager without disrupting current functionality. The design follows three principles:

1. **Extend, don't replace** - Current import flow continues working; Statement Hub adds parallel capabilities
2. **Progressive enhancement** - Line items are optional metadata; subscriptions remain primary entities
3. **Deferred joins** - Keep line items separate until conversion to subscriptions

**Key architectural decisions:**
- New `statement_line_items` table stores ALL transactions from uploaded statements
- `import_audits` tracks batch metadata (already has `statementSource` from Phase 6)
- Existing subscription import flow enhanced to optionally create line items first
- New statement browser UI queries line items with filters, enables tagging for conversion
- Line items linked to subscriptions via new `sourceLineItemId` column on subscriptions table

## Current Architecture Baseline

### Existing Import Flow (Single File)
```
User uploads PDF/image
    ↓
POST /api/import
    → pdf2json extracts text (for PDFs)
    → GPT-4o identifies subscriptions
    → Returns detected subscriptions + duplicates
    ↓
User reviews detected items
    ↓
POST /api/import/confirm
    → Creates subscriptions table rows
    → Creates import_audits record
    → Links subscriptions.importAuditId → import_audits.id
    ↓
Complete
```

### Current Database Schema (Relevant Tables)

**import_audits** (existing, extended in Phase 6):
- Tracks import metadata per upload session
- Fields: userId, statementSource, fileCount, detectedCount, confirmedCount, rawExtractionData (JSONB)
- Already supports batch via `fileCount` (currently always 1)

**subscriptions** (existing):
- Core entity for recurring charges user is tracking
- Fields: userId, name, amount, currency, frequency, importAuditId
- Linked to import_audits via `importAuditId` (nullable FK)

**Existing Integration Points:**
1. File upload UI: `src/app/(dashboard)/import/page.tsx` - React Dropzone for single/multi-file
2. Import API: `src/app/api/import/route.ts` - Handles file processing and GPT-4 parsing
3. Confirm API: `src/app/api/import/confirm/route.ts` - Creates subscriptions + audit record
4. Schema: `src/lib/db/schema.ts` - Drizzle ORM table definitions

## Recommended Architecture: Statement Hub Extension

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    STATEMENT HUB FLOW                        │
└─────────────────────────────────────────────────────────────┘

User uploads multiple PDFs (batch)
    ↓
POST /api/import (ENHANCED)
    → Process each file: extract text + parse with GPT-4o
    → Detect BOTH subscriptions AND all line items
    → Return aggregated results
    ↓
User chooses flow:
    ├─ Convert subscriptions → existing confirm flow
    └─ Save all line items → new line item flow
        ↓
    POST /api/statements/line-items/batch
        → Creates import_audits record (batch metadata)
        → Bulk insert to statement_line_items
        → Returns line item IDs
        ↓
    User browses line items in Statement Browser
        ↓
    GET /api/statements/line-items?source=X&tagged=potential
        → Filters line items by source, tags, date range
        → Returns paginated results
        ↓
    User tags items as "potential subscription"
        ↓
    POST /api/statements/line-items/[id]/tag
        → Updates tags JSONB field
        ↓
    User converts tagged item to subscription
        ↓
    POST /api/subscriptions/from-line-item
        → Creates subscription row
        → Sets subscription.sourceLineItemId = line_item.id
        → Marks line item as converted
        ↓
    Complete
```

### New Database Tables

#### statement_line_items

Stores ALL transaction line items from uploaded statements, not just subscriptions.

```typescript
export const statementLineItems = pgTable(
  "statement_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    importAuditId: uuid("import_audit_id")
      .notNull()
      .references(() => importAudits.id, { onDelete: "cascade" }),

    // Transaction data
    merchantName: varchar("merchant_name", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),

    // Raw text from statement (for reference/audit)
    rawText: text("raw_text"),

    // Classification/tagging
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    // Common tags: "potential_subscription", "one_time", "refund", "ignored"

    // Subscription conversion tracking
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    convertedToSubscriptionId: uuid("converted_to_subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" }
    ),

    // Confidence from AI (if detected as potential subscription)
    aiConfidence: integer("ai_confidence"), // 0-100, null if not analyzed

    // Metadata
    metadata: jsonb("metadata").$type<{
      category?: string;
      notes?: string;
      recurring_indicator?: boolean; // AI hint: looks like subscription
    }>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("statement_line_items_user_id_idx").on(table.userId),
    index("statement_line_items_import_audit_idx").on(table.importAuditId),
    index("statement_line_items_transaction_date_idx").on(table.transactionDate),
    index("statement_line_items_merchant_name_idx").on(table.merchantName),
    // GIN index for JSONB tags column for efficient tag filtering
    index("statement_line_items_tags_idx").on(table.tags).using("gin"),
  ]
);
```

**Design rationale:**
- `importAuditId` links all line items from same batch upload
- `tags` JSONB array enables flexible categorization (potential_subscription, ignored, etc.)
- `convertedToSubscriptionId` tracks which line items became subscriptions (prevents double-conversion)
- `aiConfidence` stores GPT-4 confidence for items flagged as recurring
- Indexes on userId, date, and merchant enable fast filtering in browser UI
- GIN index on tags JSONB for efficient `WHERE tags @> '["potential_subscription"]'` queries

#### Extend subscriptions table

Add optional reference back to source line item.

```typescript
// Add to existing subscriptions table:
sourceLineItemId: uuid("source_line_item_id").references(
  () => statementLineItems.id,
  { onDelete: "set null" }
),
```

**Design rationale:**
- Nullable FK (subscriptions can exist without line items - manual entry or old imports)
- Set null on delete (if line item deleted, subscription persists)
- Enables "show original statement line" feature in subscription detail view

### Enhanced Import Flow

#### Option 1: Current Flow (Subscription-focused import)

**No changes required.** Existing flow continues to work:
1. Upload PDF → detect subscriptions → create subscriptions directly
2. Line items NOT created
3. Use case: User only cares about tracking subscriptions

#### Option 2: New Flow (Statement Hub - line item storage)

**Enhanced import with line item storage:**

```typescript
// POST /api/import - ENHANCED
// Add new extraction mode parameter

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  const mode = formData.get("mode") as "subscriptions" | "full_statement";

  // Process each file
  const allLineItems: DetectedLineItem[] = [];
  const allSubscriptions: DetectedSubscription[] = [];

  for (const file of files) {
    // Extract text
    const text = await extractTextFromPdf(pdfBuffer);

    if (mode === "subscriptions") {
      // EXISTING: Parse for subscriptions only
      const result = await parseTextForSubscriptions(text);
      allSubscriptions.push(...result.subscriptions);
    } else {
      // NEW: Parse for ALL line items + subscriptions
      const result = await parseTextForFullStatement(text);
      allLineItems.push(...result.lineItems);
      allSubscriptions.push(...result.subscriptions);
    }
  }

  return NextResponse.json({
    mode,
    subscriptions: allSubscriptions,
    lineItems: allLineItems, // NEW
    fileCount: files.length,
  });
}
```

**New GPT-4 prompt for full statement parsing:**
```typescript
// src/lib/openai/statement-parser.ts
const FULL_STATEMENT_PROMPT = `Analyze this bank/credit card statement and extract ALL transaction line items.

For each transaction, extract:
1. Merchant/payee name
2. Amount (positive for charges, negative for credits/refunds)
3. Currency (ISO code)
4. Transaction date (YYYY-MM-DD)
5. Raw text from statement line
6. Recurring indicator (true if this looks like a subscription/recurring charge)

Return JSON array:
[
  {
    "merchantName": "Netflix",
    "amount": 15.99,
    "currency": "USD",
    "transactionDate": "2026-01-15",
    "rawText": "01/15 NETFLIX.COM CA",
    "recurringIndicator": true,
    "aiConfidence": 95
  },
  ...
]

Include ALL transactions - one-time purchases, refunds, transfers, everything.
Set recurringIndicator=true only for charges that appear to be subscriptions.`;
```

#### Batch Line Item Creation API

```typescript
// POST /api/statements/line-items/batch

export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json();
  const { lineItems, statementSource } = body;

  // Create import audit record
  const [audit] = await db.insert(importAudits).values({
    userId: session.user.id,
    statementSource,
    fileCount: 1, // Or track actual file count from client
    detectedCount: lineItems.length,
    confirmedCount: 0, // Will update when items converted to subscriptions
  }).returning();

  // Bulk insert line items (Drizzle ORM supports batch inserts)
  const insertedItems = await db.insert(statementLineItems).values(
    lineItems.map((item: DetectedLineItem) => ({
      userId: session.user.id,
      importAuditId: audit.id,
      merchantName: item.merchantName,
      amount: item.amount.toFixed(2),
      currency: item.currency,
      transactionDate: new Date(item.transactionDate),
      rawText: item.rawText,
      tags: item.recurringIndicator ? ["potential_subscription"] : [],
      aiConfidence: item.aiConfidence,
      metadata: {
        recurring_indicator: item.recurringIndicator,
      },
    }))
  ).returning();

  return NextResponse.json({
    created: insertedItems.length,
    importAuditId: audit.id,
  });
}
```

### Statement Browser Architecture

#### Query API with Filtering

```typescript
// GET /api/statements/line-items?source=X&tagged=Y&from=date&to=date&page=N

export async function GET(request: Request) {
  const session = await auth();
  const url = new URL(request.url);

  // Parse filters from query params
  const source = url.searchParams.get("source"); // statement source
  const tagged = url.searchParams.get("tagged"); // tag filter (e.g., "potential_subscription")
  const from = url.searchParams.get("from"); // date range start
  const to = url.searchParams.get("to"); // date range end
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build query with Drizzle ORM
  let query = db
    .select({
      id: statementLineItems.id,
      merchantName: statementLineItems.merchantName,
      amount: statementLineItems.amount,
      currency: statementLineItems.currency,
      transactionDate: statementLineItems.transactionDate,
      tags: statementLineItems.tags,
      aiConfidence: statementLineItems.aiConfidence,
      convertedAt: statementLineItems.convertedAt,
      importAudit: {
        statementSource: importAudits.statementSource,
      },
    })
    .from(statementLineItems)
    .innerJoin(importAudits, eq(statementLineItems.importAuditId, importAudits.id))
    .where(
      and(
        eq(statementLineItems.userId, session.user.id),
        // Dynamic filters
        source ? eq(importAudits.statementSource, source) : undefined,
        tagged ? sql`${statementLineItems.tags} @> ${JSON.stringify([tagged])}` : undefined,
        from ? gte(statementLineItems.transactionDate, new Date(from)) : undefined,
        to ? lte(statementLineItems.transactionDate, new Date(to)) : undefined,
      )
    )
    .orderBy(desc(statementLineItems.transactionDate))
    .limit(limit)
    .offset(offset);

  const items = await query;

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql`count(*)` })
    .from(statementLineItems)
    // ... same WHERE conditions

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit),
    },
  });
}
```

**Query performance optimizations:**
- Indexes on userId, transactionDate, merchantName enable fast filtering
- GIN index on tags JSONB for `@>` containment queries
- Pagination prevents loading thousands of items at once
- Consider materialized view for source aggregations if statement counts grow large

#### Frontend Browser Component

```typescript
// src/app/(dashboard)/statements/page.tsx

"use client";

export default function StatementsPage() {
  const [filters, setFilters] = useState({
    source: null,
    tagged: null,
    dateRange: { from: null, to: null },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["statement-line-items", filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(filters.source && { source: filters.source }),
        ...(filters.tagged && { tagged: filters.tagged }),
        ...(filters.dateRange.from && { from: filters.dateRange.from }),
        ...(filters.dateRange.to && { to: filters.dateRange.to }),
      });

      const res = await fetch(`/api/statements/line-items?${params}`);
      return res.json();
    },
  });

  return (
    <div>
      {/* Filter sidebar */}
      <div className="w-64 border-r">
        <StatementSourceFilter value={filters.source} onChange={...} />
        <TagFilter value={filters.tagged} onChange={...} />
        <DateRangeFilter value={filters.dateRange} onChange={...} />
      </div>

      {/* Line items table */}
      <div className="flex-1">
        <LineItemsTable
          items={data?.items}
          onTag={handleTag}
          onConvert={handleConvert}
        />
        <Pagination {...data?.pagination} />
      </div>
    </div>
  );
}
```

**UI patterns:**
- Sidebar filters (common in banking apps per research)
- Table view with sortable columns (date, merchant, amount)
- Tag badges on each row (visual indicator of classification)
- Bulk actions: "Tag selected as potential subscription", "Convert selected to subscriptions"
- Empty state: "No statements uploaded yet. Upload your first statement to get started."

### Tagging and Conversion Flows

#### Tag Line Items

```typescript
// POST /api/statements/line-items/[id]/tag

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const body = await request.json();
  const { action, tag } = body; // action: "add" | "remove", tag: string

  // Fetch current tags
  const [item] = await db
    .select({ tags: statementLineItems.tags })
    .from(statementLineItems)
    .where(
      and(
        eq(statementLineItems.id, params.id),
        eq(statementLineItems.userId, session.user.id)
      )
    );

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update tags array
  const currentTags = item.tags as string[];
  const newTags = action === "add"
    ? [...new Set([...currentTags, tag])]
    : currentTags.filter(t => t !== tag);

  await db
    .update(statementLineItems)
    .set({ tags: newTags })
    .where(eq(statementLineItems.id, params.id));

  return NextResponse.json({ success: true, tags: newTags });
}
```

#### Convert Line Item to Subscription

```typescript
// POST /api/subscriptions/from-line-item

export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json();
  const { lineItemId, frequency, categoryId } = body;

  // Fetch line item
  const [lineItem] = await db
    .select()
    .from(statementLineItems)
    .where(
      and(
        eq(statementLineItems.id, lineItemId),
        eq(statementLineItems.userId, session.user.id),
        isNull(statementLineItems.convertedAt) // Prevent double-conversion
      )
    );

  if (!lineItem) {
    return NextResponse.json({ error: "Line item not found or already converted" }, { status: 400 });
  }

  // Calculate next renewal date from transaction date
  const nextRenewalDate = frequency === "yearly"
    ? addYears(lineItem.transactionDate, 1)
    : addMonths(lineItem.transactionDate, 1);

  // Create subscription
  const [subscription] = await db.insert(subscriptions).values({
    userId: session.user.id,
    name: lineItem.merchantName,
    amount: lineItem.amount,
    currency: lineItem.currency,
    frequency,
    categoryId,
    lastRenewalDate: lineItem.transactionDate,
    nextRenewalDate,
    normalizedMonthlyAmount: calculateNormalizedMonthly(
      parseFloat(lineItem.amount),
      frequency
    ),
    sourceLineItemId: lineItem.id, // NEW: Link back to source
    status: "active",
  }).returning();

  // Mark line item as converted
  await db
    .update(statementLineItems)
    .set({
      convertedAt: new Date(),
      convertedToSubscriptionId: subscription.id,
    })
    .where(eq(statementLineItems.id, lineItemId));

  return NextResponse.json({ subscription });
}
```

**Conversion UX:**
1. User clicks "Convert to Subscription" on line item row
2. Modal opens with pre-filled data (name, amount, currency from line item)
3. User selects frequency (monthly/yearly) and category
4. Confirms → creates subscription + marks line item as converted
5. Line item row shows "Converted" badge with link to subscription

## Data Flow Diagrams

### Current Flow (Unchanged)
```
PDF Upload
    ↓
GPT-4o Subscription Detection
    ↓
User Review & Confirm
    ↓
Create Subscriptions + Import Audit
    ↓
END
```

### New Statement Hub Flow
```
Multiple PDFs Upload
    ↓
GPT-4o Full Statement Parsing (ALL line items)
    ↓
User Chooses:
    ├─ Save as Subscriptions (current flow)
    └─ Save as Line Items (new flow)
        ↓
    Create Import Audit + Bulk Insert Line Items
        ↓
    Browse in Statement Browser
        ↓
    Filter by Source / Tag / Date
        ↓
    Tag items as "potential_subscription"
        ↓
    Convert tagged items to Subscriptions
        ↓
    Subscription created + Line item marked converted
        ↓
    END
```

### Relationships
```
users (1) ──── (N) import_audits
import_audits (1) ──── (N) statement_line_items
import_audits (1) ──── (N) subscriptions
statement_line_items (1) ──── (0..1) subscriptions (via convertedToSubscriptionId)
subscriptions (N) ──── (0..1) statement_line_items (via sourceLineItemId)
```

**Note:** Circular reference is intentional:
- Line item → subscription: Tracks which subscription was created from this line item
- Subscription → line item: Enables "view source statement line" feature

## Integration Points with Existing Code

### Files to Modify

#### 1. Schema Extension
**File:** `src/lib/db/schema.ts`
**Changes:**
- Add `statementLineItems` table definition
- Add `sourceLineItemId` column to `subscriptions` table
- Add relations: `statementLineItemsRelations`, update `subscriptionsRelations`

#### 2. Import API Enhancement
**File:** `src/app/api/import/route.ts`
**Changes:**
- Add `mode` parameter to POST handler ("subscriptions" | "full_statement")
- Add conditional logic: if mode === "full_statement", call new parser
- Return both subscriptions and lineItems in response

#### 3. New Statement Parser
**File:** `src/lib/openai/statement-parser.ts` (NEW)
**Changes:**
- Create `parseTextForFullStatement()` function
- New GPT-4 prompt for ALL line items (not just subscriptions)
- Return `{ lineItems: DetectedLineItem[], subscriptions: DetectedSubscription[] }`

#### 4. Import UI Enhancement
**File:** `src/app/(dashboard)/import/page.tsx`
**Changes:**
- Add mode toggle: "Import Subscriptions" vs "Import Full Statement"
- If full statement mode: show "Save Line Items" button instead of confirm flow
- Call new batch line items API

#### 5. New Line Items Batch API
**File:** `src/app/api/statements/line-items/batch/route.ts` (NEW)
**Changes:**
- POST handler for bulk line item creation
- Creates import_audits record + bulk inserts line items
- Returns created count and import audit ID

#### 6. New Statement Browser Page
**File:** `src/app/(dashboard)/statements/page.tsx` (NEW)
**Changes:**
- Filter sidebar (source, tags, date range)
- Line items table with pagination
- Tag actions (add/remove tags)
- Convert to subscription modal

#### 7. Line Items Query API
**File:** `src/app/api/statements/line-items/route.ts` (NEW)
**Changes:**
- GET handler with filters (source, tagged, date range)
- Pagination support
- JOIN with import_audits for source filtering

#### 8. Tag API
**File:** `src/app/api/statements/line-items/[id]/tag/route.ts` (NEW)
**Changes:**
- POST handler for adding/removing tags
- Update tags JSONB array

#### 9. Convert to Subscription API
**File:** `src/app/api/subscriptions/from-line-item/route.ts` (NEW)
**Changes:**
- POST handler for line item → subscription conversion
- Creates subscription + marks line item as converted
- Links via sourceLineItemId

#### 10. Subscription Detail Enhancement (Optional)
**File:** `src/app/(dashboard)/subscriptions/[id]/page.tsx`
**Changes:**
- If subscription.sourceLineItemId exists, show "View Source Statement" link
- Displays original line item data (transaction date, raw text, etc.)

### Files to Create (New)

| File | Purpose |
|------|---------|
| `src/lib/openai/statement-parser.ts` | Full statement parsing with GPT-4o |
| `src/app/api/statements/line-items/batch/route.ts` | Batch line item creation |
| `src/app/api/statements/line-items/route.ts` | Line items query with filters |
| `src/app/api/statements/line-items/[id]/tag/route.ts` | Tagging API |
| `src/app/api/subscriptions/from-line-item/route.ts` | Conversion API |
| `src/app/(dashboard)/statements/page.tsx` | Statement browser UI |
| `src/components/statements/line-items-table.tsx` | Line items table component |
| `src/components/statements/filters-sidebar.tsx` | Filter controls |
| `src/components/statements/convert-modal.tsx` | Line item → subscription modal |
| `src/lib/hooks/use-line-items.ts` | TanStack Query hook for line items |

## Build Order and Dependencies

### Phase 1: Database Foundation
**Goal:** Establish data model without breaking existing functionality

1. **Schema migration** - Add `statement_line_items` table
2. **Schema extension** - Add `sourceLineItemId` to `subscriptions`
3. **Migration testing** - Ensure existing import flow still works
4. **Rollback plan** - Document how to revert if issues arise

**Dependencies:** None (additive changes only)
**Risk:** Low (nullable columns, no data migration needed)

### Phase 2: Line Item Storage (Backend)
**Goal:** Enable saving line items from imports

1. **Statement parser** - Create `statement-parser.ts` with full line item extraction
2. **Batch API** - Create `/api/statements/line-items/batch` for bulk inserts
3. **Testing** - Upload sample statement, verify line items saved correctly
4. **Edge cases** - Test with malformed data, large batches (1000+ items)

**Dependencies:** Phase 1 complete
**Risk:** Medium (GPT-4 prompt tuning for ALL transactions, not just subscriptions)

### Phase 3: Import Flow Enhancement
**Goal:** Let users choose subscription-only vs full statement import

1. **Import API enhancement** - Add `mode` parameter to `/api/import`
2. **Import UI mode toggle** - Add radio buttons: "Subscriptions Only" | "Full Statement"
3. **Conditional flow** - Route to confirm (subscriptions) or batch (line items) based on mode
4. **Testing** - Verify both flows work independently

**Dependencies:** Phase 2 complete
**Risk:** Low (existing flow unchanged, new flow is optional)

### Phase 4: Statement Browser (Frontend)
**Goal:** UI for browsing and managing line items

1. **Query API** - Create `/api/statements/line-items` GET with filters
2. **Browser page** - Create `/statements` page with table + filters
3. **Filter components** - Source filter, tag filter, date range picker
4. **Pagination** - Implement page navigation for large result sets
5. **Testing** - Load 100+ line items, test filter combinations

**Dependencies:** Phase 2 complete (line items must exist to browse)
**Risk:** Medium (complex filtering logic, performance tuning needed)

### Phase 5: Tagging System
**Goal:** Enable user classification of line items

1. **Tag API** - Create `/api/statements/line-items/[id]/tag` POST
2. **Tag UI** - Add tag dropdown to line item rows
3. **Bulk tagging** - Add "Tag selected items" action
4. **Tag filtering** - Integrate with browser filters
5. **Testing** - Tag 50 items, filter by tag, verify results

**Dependencies:** Phase 4 complete (browser UI must exist)
**Risk:** Low (simple JSONB array updates)

### Phase 6: Conversion Flow
**Goal:** Convert line items to subscriptions

1. **Conversion API** - Create `/api/subscriptions/from-line-item` POST
2. **Conversion modal** - Pre-filled form with line item data
3. **Linking logic** - Set sourceLineItemId + mark line item as converted
4. **Prevent double-conversion** - Check convertedAt before allowing conversion
5. **Testing** - Convert item, verify subscription created + link established

**Dependencies:** Phase 5 complete (tagging helps identify items to convert)
**Risk:** Medium (date calculations, duplicate prevention)

### Phase 7: Source Viewing (Optional Enhancement)
**Goal:** Show original statement line in subscription detail

1. **Subscription query enhancement** - Include sourceLineItem relation
2. **Detail page UI** - Add "Source Statement Line" section if sourceLineItemId exists
3. **Testing** - Create subscription from line item, verify source displays

**Dependencies:** Phase 6 complete
**Risk:** Low (read-only display, no business logic)

## Performance Considerations

### Line Item Volume Projections

**Assumptions:**
- Average bank statement: 50-100 transactions/month
- Power user uploads: 12 statements/year (monthly statements)
- Line items per user per year: 50 * 12 = 600 items
- At 10,000 users: 6,000,000 line items/year

**Implications:**
- Table will grow large quickly (millions of rows within first year)
- Queries MUST be indexed properly
- Consider partitioning by date for long-term scalability

### Query Optimization Strategies

#### 1. Composite Indexes
```sql
-- Fast filtering by user + date range
CREATE INDEX idx_line_items_user_date
  ON statement_line_items(user_id, transaction_date DESC);

-- Fast filtering by user + source
CREATE INDEX idx_line_items_user_source
  ON statement_line_items(user_id, import_audit_id);
```

#### 2. Partial Indexes
```sql
-- Index only unconverted items (most common query)
CREATE INDEX idx_line_items_unconverted
  ON statement_line_items(user_id, transaction_date DESC)
  WHERE converted_at IS NULL;
```

#### 3. GIN Index for Tags
```sql
-- Fast containment queries: WHERE tags @> '["potential_subscription"]'
CREATE INDEX idx_line_items_tags
  ON statement_line_items USING gin(tags);
```

#### 4. Pagination Required
```typescript
// ALWAYS use LIMIT/OFFSET or cursor-based pagination
// NEVER fetch all line items for a user

// Good
.limit(50).offset(page * 50)

// Bad
.where(eq(statementLineItems.userId, userId)) // No limit - could return 10,000+ rows
```

### Data Retention Strategy

**Problem:** Line items accumulate forever, degrading performance over time.

**Solutions:**

#### Option 1: Soft Delete Old Items (Recommended for MVP)
```typescript
// Add deletedAt column
deletedAt: timestamp("deleted_at", { withTimezone: true }),

// Archive items older than 2 years
// Run monthly via cron
UPDATE statement_line_items
SET deleted_at = NOW()
WHERE transaction_date < NOW() - INTERVAL '2 years'
  AND converted_at IS NULL; -- Don't delete converted items
```

**Pros:** Simple, reversible, no data loss
**Cons:** Bloats table with soft-deleted rows

#### Option 2: Partition by Date (Future Enhancement)
```sql
-- Partition line_items table by year
CREATE TABLE statement_line_items_2026
  PARTITION OF statement_line_items
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Drop old partitions when no longer needed
DROP TABLE statement_line_items_2024;
```

**Pros:** Fast deletes (drop partition), query optimization (partition pruning)
**Cons:** Requires PostgreSQL 10+, schema migration complexity

**Recommendation:** Start with soft delete (Option 1), migrate to partitioning when table exceeds 10M rows.

### Batch Insert Optimization

**Problem:** Inserting 100+ line items per statement upload could be slow with individual INSERTs.

**Solution:** Use Drizzle ORM batch inserts (single SQL statement)

```typescript
// Good - Single INSERT with multiple VALUES
await db.insert(statementLineItems).values([
  { userId: "...", merchantName: "Netflix", ... },
  { userId: "...", merchantName: "Spotify", ... },
  // ... 100 more items
]);

// Generates:
// INSERT INTO statement_line_items (user_id, merchant_name, ...)
// VALUES ($1, $2, ...), ($3, $4, ...), ...

// Bad - N individual INSERTs in loop
for (const item of lineItems) {
  await db.insert(statementLineItems).values(item);
}
```

**Performance impact:** 100 items = 1 query vs 100 queries (100x faster)

## Architecture Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Line Items in JSONB on Import Audit
❌ **What NOT to do:**
```typescript
// Don't store all line items as nested JSON
export const importAudits = pgTable("import_audits", {
  // ...
  lineItems: jsonb("line_items").$type<DetectedLineItem[]>(), // BAD
});
```

**Why it's bad:**
- Can't query individual line items (WHERE merchant = 'Netflix')
- Can't tag individual items
- Can't link subscriptions back to specific line items
- JSONB becomes massive (100 items * 500 bytes = 50KB per audit)

**What to do instead:** Separate `statement_line_items` table (as designed above)

### Anti-Pattern 2: Creating Subscriptions First, Then Line Items
❌ **What NOT to do:**
```typescript
// Don't create subscription, THEN create line item as copy
const subscription = await createSubscription(...);
await db.insert(statementLineItems).values({
  ...subscription,
  convertedToSubscriptionId: subscription.id,
});
```

**Why it's bad:**
- Duplicate data entry
- Line item doesn't represent original statement data (user might edit subscription)
- Violates "line items are source of truth for statements"

**What to do instead:** Line items come from statement upload, subscriptions created FROM line items (one direction)

### Anti-Pattern 3: Allowing Conversion of Already-Converted Items
❌ **What NOT to do:**
```typescript
// Don't skip checking if line item already converted
const subscription = await createSubscriptionFromLineItem(lineItemId);
// Creates duplicate subscription if called twice on same line item
```

**Why it's bad:**
- User accidentally converts same line item twice → duplicate subscriptions
- No audit trail of conversion

**What to do instead:** Check `convertedAt IS NULL` before allowing conversion (as implemented above)

### Anti-Pattern 4: Fetching All Line Items to Filter Client-Side
❌ **What NOT to do:**
```typescript
// Don't fetch all items and filter in JavaScript
const allItems = await db
  .select()
  .from(statementLineItems)
  .where(eq(statementLineItems.userId, userId));

// Filter in JS
const filtered = allItems.filter(item =>
  item.tags.includes("potential_subscription")
);
```

**Why it's bad:**
- Fetches 10,000+ rows from database
- Wastes bandwidth
- Slow client-side filtering

**What to do instead:** Use SQL WHERE clauses with indexes (as implemented in query API above)

### Anti-Pattern 5: Not Linking Line Items to Import Audit
❌ **What NOT to do:**
```typescript
// Don't create line items without importAuditId
await db.insert(statementLineItems).values({
  userId: "...",
  merchantName: "...",
  // Missing: importAuditId
});
```

**Why it's bad:**
- Can't determine which statement upload created this line item
- Can't display source (bank account name)
- Breaks data lineage

**What to do instead:** ALWAYS set importAuditId (as implemented in batch API above)

## Scalability Roadmap

### Current Design (MVP)
**Handles:** 10K users, 6M line items/year
**Query time:** <100ms for filtered results (with indexes)
**Storage:** ~1GB/year (estimated)

### Future Enhancements (100K+ users)

#### 1. Read Replicas
- Statement browser queries hit read replica
- Write operations (import, tagging) hit primary
- Reduces load on primary database

#### 2. Materialized Views for Aggregations
```sql
-- Pre-compute line item counts by source
CREATE MATERIALIZED VIEW line_item_counts_by_source AS
SELECT
  import_audit_id,
  statement_source,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE tags @> '["potential_subscription"]') as tagged_items
FROM statement_line_items
GROUP BY import_audit_id, statement_source;

-- Refresh hourly via cron
REFRESH MATERIALIZED VIEW line_item_counts_by_source;
```

**Use case:** Show "You have 15 potential subscriptions in Chase Visa" without counting every row

#### 3. Table Partitioning by Date
- Partition line_items by year or month
- Queries only scan relevant partitions (partition pruning)
- Drop old partitions to reclaim space

#### 4. Archive to Cold Storage
- Move line items older than 2 years to separate archive table
- Keep metadata (import audit) but remove line item details
- User can request archive restoration if needed

## Testing Strategy

### Unit Tests
- Schema validation (Drizzle ORM type checking)
- Date calculation logic (transaction date → renewal date)
- Tag array updates (add/remove operations)

### Integration Tests
- Full import flow: Upload → parse → save line items → verify in DB
- Conversion flow: Tag item → convert → verify subscription created + link established
- Filter queries: Apply filters → verify correct items returned

### E2E Tests (Playwright)
```typescript
test("Import full statement and convert line item to subscription", async ({ page }) => {
  // Upload sample PDF in full statement mode
  await page.goto("/import");
  await page.selectOption('[name="mode"]', 'full_statement');
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/sample-statement.pdf');
  await page.click('button:has-text("Process")');

  // Wait for processing
  await page.waitForSelector('text=line items detected');
  await page.click('button:has-text("Save Line Items")');

  // Navigate to statement browser
  await page.goto("/statements");

  // Filter by tag
  await page.click('text=Potential Subscriptions');

  // Convert first item
  await page.click('button:has-text("Convert"):first');
  await page.selectOption('[name="frequency"]', 'monthly');
  await page.click('button:has-text("Create Subscription")');

  // Verify subscription created
  await page.goto("/subscriptions");
  await expect(page.locator('text=Netflix')).toBeVisible();
});
```

### Performance Tests
- Bulk insert 1000 line items → measure time (<5s acceptable)
- Query 10,000 line items with filters → measure time (<100ms acceptable)
- Concurrent import by 10 users → no deadlocks or timeout errors

## Migration Plan

### Step 1: Schema Migration (No Downtime)
```bash
# Generate migration
npm run db:generate

# Review generated SQL
# Ensure nullable columns (no data migration needed)

# Apply migration
npm run db:migrate
```

**Rollback:** Drop `statement_line_items` table, remove `sourceLineItemId` column

### Step 2: Deploy Backend APIs (Backward Compatible)
- Deploy new APIs: `/api/statements/line-items/*`
- Existing import flow unchanged
- New features gated behind UI flag (not accessible yet)

**Rollback:** No rollback needed (new APIs unused)

### Step 3: Deploy Frontend (Feature Flag)
- Add mode toggle to import UI (default: "subscriptions" mode)
- Add statement browser page (route: `/statements`)
- Feature flag: `NEXT_PUBLIC_ENABLE_STATEMENT_HUB=false` (initially off)

**Rollback:** Set feature flag to false

### Step 4: Beta Testing (Select Users)
- Enable feature flag for internal users
- Upload real statements, test full flow
- Monitor error logs, query performance

**Rollback:** Disable feature flag

### Step 5: Public Release
- Enable feature flag for all users
- Announce new feature via email/blog post
- Monitor support tickets for confusion

**Rollback:** Disable feature flag, data persists but UI hidden

## Open Questions

### 1. Should we automatically tag items based on AI confidence?
**What we know:**
- GPT-4 returns `recurringIndicator` boolean + `aiConfidence` score
- High confidence items (>80%) are likely subscriptions

**Options:**
- A) Auto-tag items with confidence >80% as "potential_subscription"
- B) Show confidence score but let user decide what to tag
- C) Hybrid: Auto-tag but allow user to remove tag

**Recommendation:** Option A (auto-tag). Reduces manual work, user can always remove tag.

### 2. What happens to line items when user deletes import audit?
**What we know:**
- Line items have FK: `importAuditId → import_audits.id`
- FK set to `onDelete: "cascade"` (line items deleted when audit deleted)

**Options:**
- A) Keep cascade delete (line items deleted with audit)
- B) Set null (orphaned line items remain)
- C) Prevent deletion if line items exist

**Recommendation:** Option A (cascade delete). Import audit represents "this upload session" - deleting it should remove all artifacts.

### 3. Should converted line items be hidden from browser by default?
**What we know:**
- Converted items have `convertedAt` timestamp + `convertedToSubscriptionId` link
- After conversion, user probably doesn't need to see them again

**Options:**
- A) Hide converted items by default (filter: `convertedAt IS NULL`)
- B) Show all items with "Converted" badge
- C) Add toggle: "Show converted items"

**Recommendation:** Option C (toggle). Default to hiding, but allow user to view conversion history.

### 4. How to handle multi-currency statements?
**What we know:**
- Users might upload statements from foreign bank accounts
- Line items store currency (USD, EUR, etc.)
- Subscriptions normalize to monthly amount in displayCurrency

**Options:**
- A) Store line items in original currency, convert during subscription creation
- B) Convert all line items to user's displayCurrency on import
- C) Support filtering by currency in browser

**Recommendation:** Option A + C. Keep original currency (audit accuracy), convert during conversion, allow currency filtering.

## Sources

### Primary (HIGH confidence)
- **Codebase Analysis:**
  - `src/lib/db/schema.ts` - Existing schema structure, import_audits, subscriptions tables
  - `src/app/api/import/route.ts` - Current import flow, file processing, GPT-4 parsing
  - `src/app/api/import/confirm/route.ts` - Subscription creation, import audit linking
  - `src/lib/openai/pdf-parser.ts` - GPT-4 prompt structure, DetectedSubscription interface
  - `src/app/(dashboard)/import/page.tsx` - Import UI, React Dropzone, multi-step flow

- **Drizzle ORM Documentation:**
  - [Drizzle Relations v2](https://orm.drizzle.team/docs/relations-v2) - One-to-many relationships, nested queries with `with`
  - [Drizzle Query API](https://orm.drizzle.team/docs/rqb-v2) - Relational queries, partial field selection
  - [Drizzle SELECT DISTINCT](https://orm.drizzle.team/docs/select#distinct) - Distinct query patterns

- **PostgreSQL Data Modeling:**
  - [Data Models for Financial Transactions](https://www.jessym.com/articles/data-models-for-financial-transactions) - Header/line item schema patterns
  - [Working with Money in Postgres](https://www.crunchydata.com/blog/working-with-money-in-postgres) - DECIMAL vs MONEY types for financial data

### Secondary (MEDIUM confidence)
- **Next.js File Uploads:**
  - [How to Handle File Uploads in Next.js](https://oneuptime.com/blog/post/2026-01-24-nextjs-file-uploads/view) - Multi-file upload with formData.getAll()
  - [Next.js Route Handlers](https://strapi.io/blog/nextjs-16-route-handlers-explained-3-advanced-usecases) - Serverless timeout considerations, streaming patterns

- **Transaction Categorization:**
  - [Modern Treasury Transaction Tagging](https://www.moderntreasury.com/journal/transaction-tagging-transforming-raw-bank-data-into-real-insights) - Tagging system design, governance, audit trails
  - [Line Item Classification](https://nanonets.com/blog/line-item-classification/) - Automated categorization patterns

- **UI/UX Patterns:**
  - [Complex Filters UX](https://smart-interface-design-patterns.com/articles/complex-filtering/) - Filter sidebar vs top filters, visual cues for active filters
  - [Filter UI Design Best Practices](https://www.eleken.co/blog-posts/filter-ux-and-ui-for-saas) - Clear all/reset options, mobile considerations
  - [Banking App UI Best Practices 2026](https://procreator.design/blog/banking-app-ui-top-best-practices/) - Card layouts for transactions, visual hierarchy

- **Data Retention Strategies:**
  - [PostgreSQL Data Archiving](https://dataegret.com/2025/05/data-archiving-and-retention-in-postgresql-best-practices-for-large-datasets/) - Partitioning, soft delete, hot/cold data management
  - [Auto-archiving with pg_partman](https://www.crunchydata.com/blog/auto-archiving-and-data-retention-management-in-postgres-with-pg_partman) - Partition detachment for archiving
  - [Time-based Retention in Postgres](https://blog.sequinstream.com/time-based-retention-strategies-in-postgres/) - Scheduled deletions, performance impact

### Tertiary (LOW confidence - general patterns)
- [Database Schema Best Practices](https://blog.devart.com/database-design-best-practices.html) - Normalization, indexing strategies, naming conventions
- [Scalable Next.js Architecture](https://blog.logrocket.com/structure-scalable-next-js-project-architecture/) - Feature-sliced design, API organization

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Database Schema | HIGH | Follows established patterns (header/line items), matches existing codebase style |
| GPT-4 Integration | HIGH | Extends existing pdf-parser.ts pattern with new prompt |
| Drizzle ORM Queries | HIGH | Official docs verified, patterns match existing usage |
| API Design | HIGH | Mirrors existing import API structure, REST conventions |
| UI Architecture | MEDIUM | Browser component is new pattern (not currently in app), based on research |
| Performance Estimates | MEDIUM | Index strategy solid, volume projections are assumptions |
| Data Retention | MEDIUM | Multiple valid approaches, recommendation is one option |

**Overall Confidence:** HIGH - Architecture extends existing patterns cleanly with minimal breaking changes.

---

**Research Date:** 2026-02-08
**Valid Until:** 2026-05-08 (90 days - stable technologies with slow-changing APIs)
