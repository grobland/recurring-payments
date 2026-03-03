# Phase 42: CSV Export - Research

**Researched:** 2026-03-03
**Domain:** CSV generation, formula injection sanitization, browser download UX
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Export button placement
- Subscriptions page: outline button with Download icon and "Export CSV" text, next to "Add Subscription" in the page header area
- Transactions page: outline button with Download icon and "Export CSV" text, right-aligned above the filter bar (alongside PaymentTypeSelector area)
- Both buttons visible on all screen sizes (stacks vertically on mobile)

#### Transaction export scope
- Transaction export respects current filters (source, date range, payment type, search)
- Server-side fetch of ALL matching transactions (no pagination limit) — complete export regardless of what's loaded in the virtual list
- Subscriptions export always exports all active (non-deleted) subscriptions regardless of page filter state — matches existing API behavior

#### Transaction CSV columns
- Columns: Date, Description, Amount, Currency, Source, Tags, Linked Subscription
- Tags formatted as comma-separated values in a single cell (CSV quoting handles embedded commas)
- Date format: yyyy-MM-dd (ISO) — consistent with existing subscriptions export
- Subscriptions CSV keeps existing 13 columns (Name, Description, Category, Amount, Currency, Frequency, Monthly Equivalent, Next Renewal Date, Start Date, Status, URL, Notes, Created At)

#### Export feedback UX
- Click triggers immediate browser download via fetch + blob
- Success toast via sonner ("CSV downloaded") after download completes
- Button shows loading spinner and disables while fetching (prevents double-clicks)
- Button disabled (grayed out) when there are zero items to export
- Filenames: `subscriptions-YYYY-MM-DD.csv` / `transactions-YYYY-MM-DD.csv` (date-stamped, matches existing pattern)

### Claude's Discretion
- Exact spinner implementation (lucide Loader2 animate-spin or similar)
- How to construct the fetch + blob download trigger on the client
- Transaction export API query optimization for large datasets
- Error toast wording if export fails

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPRT-01 | User can download active subscriptions as CSV from subscriptions page | Existing export API at `/api/subscriptions/export/route.ts` already works; needs BOM + sanitization + export button wired to it |
| EXPRT-02 | User can download transaction history as CSV from transactions page | New API route needed at `/api/transactions/export/route.ts`; reuse existing filter logic from `/api/transactions/route.ts`; new export button in `TransactionBrowser` |
| EXPRT-03 | CSV export sanitizes formula injection characters (CWE-1236 prevention) | Add `sanitizeFormulaInjection()` to `src/lib/utils/csv.ts`; apply in `escapeCSVValue()` before CSV quoting logic |
| EXPRT-04 | CSV files include UTF-8 BOM for correct Excel rendering of international characters | Prepend `\uFEFF` to CSV string in `createCSVResponse()` or in `objectsToCSV()`; update Content-Type header to include charset=utf-8 |
</phase_requirements>

## Summary

Phase 42 is a focused enhancement to an already partially-implemented feature. The subscriptions CSV export API (`/api/subscriptions/export/route.ts`) exists and is functional with 13 columns. The CSV utility (`src/lib/utils/csv.ts`) exists but lacks two security/compatibility features: UTF-8 BOM (EXPRT-04) and formula injection sanitization (EXPRT-03). The export button that triggers the download also does not exist yet in the UI for either page.

The phase has four concrete deliverables: (1) patch `csv.ts` to add BOM and formula sanitization, (2) add an export button to the subscriptions page header, (3) create a new transaction export API route that mirrors the existing transactions route but removes pagination and returns CSV, and (4) add an export button inside `TransactionBrowser` that passes current filter state to the new API.

The fetch + blob download pattern is the correct client-side technique for triggering browser downloads from authenticated API routes — it preserves the auth session cookie, handles errors before the browser attempts to open a file, and works in all modern browsers without a third-party library. No new npm packages are needed for any part of this phase.

**Primary recommendation:** Patch `csv.ts` first (BOM + sanitization), apply to existing subscriptions route, then build the transaction export route by copying the query logic from `route.ts` and stripping pagination, then wire both UI buttons last.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None (native) | — | CSV generation | No library needed; `objectsToCSV()` in `src/lib/utils/csv.ts` already exists and is sufficient |
| date-fns | ^4.1.0 | Date formatting for filenames and export columns | Already used in existing export route; `format(new Date(), "yyyy-MM-dd")` |
| lucide-react | ^0.562.0 | Download + Loader2 icons for export button | Already installed; `Download` icon and `Loader2` with `animate-spin` |
| sonner | ^2.0.7 | Success/error toast after download | Already used project-wide for all toast notifications |
| drizzle-orm | ^0.45.1 | Server-side query for transaction export | Already used everywhere; same `and(...conditions)` pattern as transactions route |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nuqs | ^2.8.8 | Read current paymentType URL param for export | TransactionBrowser already reads paymentType via `useQueryState`; export button needs to read the same state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fetch + blob download | `<a href="/api/...">` direct link | Direct link cannot send auth cookies (session token), will return 401 for authenticated routes |
| fetch + blob download | `papaparse` or `csv-writer` | Overkill — `objectsToCSV()` already handles all needed cases; no new library justified |
| Prepending `\uFEFF` BOM | `iconv-lite` encoding | Node.js/Next.js Response can set `charset=utf-8` and BOM via string prefix; no package needed |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/utils/csv.ts           # Patch: add sanitizeFormulaInjection + BOM to createCSVResponse
├── app/api/subscriptions/
│   └── export/route.ts        # Patch: apply sanitization (already uses objectsToCSV + createCSVResponse)
├── app/api/transactions/
│   └── export/route.ts        # NEW: filter-aware transaction export, no pagination
├── app/(dashboard)/subscriptions/
│   └── page.tsx               # Patch: add ExportCSVButton next to "Add Subscription"
└── components/transactions/
    └── transaction-browser.tsx # Patch: add ExportCSVButton above PaymentTypeSelector
```

### Pattern 1: Formula Injection Sanitization (CWE-1236)
**What:** Prefix cells beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote or tab to prevent spreadsheet formula execution
**When to use:** Always applied inside `escapeCSVValue()` before quoting logic, so all CSV output is automatically safe
**Example:**
```typescript
// In src/lib/utils/csv.ts — add before existing quote-wrapping logic
function sanitizeFormulaInjection(value: string): string {
  // CWE-1236: Prepend tab to cells that start with formula trigger characters
  // Tab is invisible in Excel and does not alter the displayed value
  if (/^[=+\-@\t\r]/.test(value)) {
    return `\t${value}`;
  }
  return value;
}

function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = sanitizeFormulaInjection(String(value));
  // ... existing quote-wrapping logic unchanged
}
```

**Alternative sanitization approach:** Wrapping in double-quotes alone does NOT prevent formula injection — Excel evaluates `"=SUM(1+1)"` as a formula. The tab prefix is the OWASP-recommended approach (invisible, non-destructive, universally effective).

### Pattern 2: UTF-8 BOM in createCSVResponse
**What:** Prepend the Unicode BOM byte sequence `\uFEFF` to the CSV content body
**When to use:** Always — BOM signals to Excel and other spreadsheet apps that the file is UTF-8 encoded, preventing mojibake for non-ASCII characters (accented names, non-USD currencies, etc.)
**Example:**
```typescript
// In src/lib/utils/csv.ts
export function createCSVResponse(csv: string, filename: string): Response {
  const BOM = "\uFEFF";
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

Note: The existing `Content-Type: text/csv; charset=utf-8` header is already correct. Adding `\uFEFF` to the body is the critical change.

### Pattern 3: Fetch + Blob Client Download
**What:** Client fetches the export API route, reads the Response as a Blob, creates an object URL, triggers a synthetic anchor click, then revokes the URL
**When to use:** Any time a download must be triggered from an authenticated API endpoint (fetch preserves cookies; `<a href>` navigations do not carry `httpOnly` session cookies in all contexts)
**Example:**
```typescript
// In subscriptions page or TransactionBrowser component
const [isExporting, setIsExporting] = useState(false);

async function handleExport() {
  setIsExporting(true);
  try {
    const res = await fetch("/api/subscriptions/export");
    if (!res.ok) throw new Error("Export failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("CSV downloaded");
  } catch {
    toast.error("Export failed. Please try again.");
  } finally {
    setIsExporting(false);
  }
}
```

### Pattern 4: Transaction Export API Route
**What:** New route at `/api/transactions/export` that accepts the same query params as `/api/transactions` but removes the `PAGE_SIZE` limit and cursor logic, and returns CSV instead of JSON
**When to use:** Transaction export only — subscriptions export already has its own dedicated route
**Key difference from `/api/transactions`:** Remove `cursorDate/cursorId` handling, remove `.limit(PAGE_SIZE + 1)`, remove `hasMore`/cursor computation, and add tags fetch for ALL results (not just a page)

```typescript
// src/app/api/transactions/export/route.ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, statements, subscriptions, transactionTags, tags, categories } from "@/lib/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { objectsToCSV, createCSVResponse } from "@/lib/utils/csv";
import { format } from "date-fns";
// ... same filter-building logic as /api/transactions/route.ts, minus cursor + limit

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Build conditions array (copy from /api/transactions/route.ts, remove cursor conditions)
  // Run query WITHOUT .limit()
  // Fetch tags for all results
  // Map to CSV columns: Date, Description, Amount, Currency, Source, Tags, Linked Subscription
  // Return createCSVResponse(csv, `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`)
}
```

### Pattern 5: Export Button in TransactionBrowser
**What:** Export button placed in the `filterControls` render function, right-aligned alongside the PaymentTypeSelector, passing the current `debouncedFilters` state to the export API as query params
**Key integration point:** `debouncedFilters` already contains `paymentType`, `sourceType`, `dateFrom`, `dateTo`, `search`, `accountId` — these can be serialized directly to query params for the export endpoint, producing a consistent "export what I see" behavior

```typescript
// In TransactionBrowser — export button passes current debouncedFilters to export URL
const filterControls = (sourceTypes: string[]) => (
  <div className="flex flex-col gap-2 mb-2">
    <div className="flex items-center justify-between">
      <PaymentTypeSelector value={paymentType} onChange={setPaymentType} />
      <ExportButton filters={debouncedFilters} disabled={allTransactions.length === 0} />
    </div>
    <TransactionFilters ... />
  </div>
);
```

### Anti-Patterns to Avoid
- **Direct anchor link to export route:** `<a href="/api/subscriptions/export">` — fails silently for authenticated routes in some browsers (httpOnly cookies not forwarded in navigation); use fetch + blob instead
- **CSV quoting alone for injection prevention:** Wrapping `=formula` in double quotes is insufficient — Excel still evaluates `"=CMD"` as a formula in some configurations. Use tab prefix.
- **Returning JSON error from export routes:** Existing subscriptions export returns `new Response("Unauthorized")` and `new Response("An error occurred")` — keep this pattern (not `NextResponse.json`) for consistency
- **Fetching all transactions in the browser export button:** The export must call the server-side export endpoint, not re-use the client-side `useTransactions` hook data — the hook only has the currently-loaded paginated pages, not ALL matching records

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV serialization | Custom string join logic in the route | `objectsToCSV()` from `src/lib/utils/csv.ts` | Already handles quoting of commas, quotes, newlines; just patch it for BOM + sanitization |
| BOM + encoding | Custom Buffer manipulation, `iconv-lite` | `"\uFEFF"` string prefix in `createCSVResponse()` | JavaScript strings are UTF-16 internally; Next.js Response serializes to UTF-8; BOM is a simple string prepend |
| Formula sanitization | Field-by-field sanitization in each route | Patch `escapeCSVValue()` in `csv.ts` once | Central function called for every cell; one fix covers both export routes |
| Download trigger | Window.location or `<a href>` | fetch + URL.createObjectURL + synthetic click | Authenticated endpoint, needs cookie; the blob approach works universally |

**Key insight:** The CSV infrastructure already exists. This phase is 80% wiring and 20% security patching.

## Common Pitfalls

### Pitfall 1: Forgetting to fetch tags for transaction export
**What goes wrong:** The transactions route fetches tags in a second query only for the current page IDs. The export route fetches ALL transactions; if the same pattern is used but the results array is large, tags must be fetched for all IDs, not just `transactionIds.slice(0, PAGE_SIZE)`.
**Why it happens:** Copy-paste from the paginated route that has a `page` variable (sliced to PAGE_SIZE); the export route has no slicing, so `transactionIds` is already the full set.
**How to avoid:** In export route, fetch tags for the full results array (no slice). For very large exports (10k+ transactions), consider batching the tag `inArray` query into chunks of 1000 to avoid Postgres `IN` clause limits.
**Warning signs:** Exported CSV has empty Tags column despite transactions having tags in the UI.

### Pitfall 2: Double-appending BOM
**What goes wrong:** If BOM is added in both `objectsToCSV()` and `createCSVResponse()`, the file opens with a visible garbage character in cell A1.
**Why it happens:** BOM should be a transport-level concern (the HTTP response body), not a data-level concern (the CSV string). Adding it in `objectsToCSV` would corrupt the string if it's ever used outside of `createCSVResponse`.
**How to avoid:** Add BOM only in `createCSVResponse()`, not in `objectsToCSV()`. The CSV string itself remains BOM-free.

### Pitfall 3: Export button enabled with zero subscriptions
**What goes wrong:** Clicking export with no subscriptions returns an empty CSV (headers only). Not an error, but confusing UX.
**How to avoid:** Per the locked decisions, disable the export button when the item count is zero. For subscriptions page, use `displayedSubscriptions.length === 0` or `subscriptions.length === 0`. For transactions, use `allTransactions.length === 0`.
**Warning signs:** Export button triggers download of a file with only a header row.

### Pitfall 4: Tags column with embedded commas not quoted
**What goes wrong:** Tags are formatted as comma-separated values ("Netflix, Hulu") in a single cell. If the `escapeCSVValue` function doesn't quote this string (it detects commas and wraps in quotes), the CSV parser splits the cell.
**Why it happens:** The existing `escapeCSVValue()` already handles this correctly — strings containing commas are wrapped in double quotes. This will work as long as the tags string is passed through `escapeCSVValue` like every other value.
**How to avoid:** Confirm tags are joined with `", "` before being passed as the column value. The existing CSV utility's quoting handles the rest automatically.

### Pitfall 5: URL.createObjectURL memory leak
**What goes wrong:** If `URL.revokeObjectURL(url)` is not called after the download, the browser holds the blob in memory until the tab closes.
**How to avoid:** Always call `URL.revokeObjectURL(url)` after `a.click()`. The download is initiated synchronously; revocation can happen immediately after triggering.

### Pitfall 6: Transaction export includes cursor-based conditions
**What goes wrong:** Copy-pasting the transactions route includes the `cursorDate`/`cursorId` WHERE clause. If the client sends no cursor params, this is a no-op, but the code is confusing and could cause bugs if the export URL accidentally includes cursor params from a previous request.
**How to avoid:** When creating the export route, explicitly omit the cursor-handling code block. The export route should only accept: `sourceType`, `tagStatus`, `dateFrom`, `dateTo`, `search`, `accountId`, `paymentType`.

## Code Examples

### Complete csv.ts with BOM and Sanitization
```typescript
// src/lib/utils/csv.ts (full patched version)

/**
 * Sanitizes a string value to prevent CSV formula injection (CWE-1236).
 * Cells starting with =, +, -, @, \t, \r are prefixed with a tab character.
 * The tab is invisible in spreadsheet apps and does not alter the displayed value.
 */
function sanitizeFormulaInjection(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `\t${value}`;
  }
  return value;
}

/**
 * Escapes a value for CSV format with formula injection protection.
 * Wraps in quotes if contains comma, quote, or newline.
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const sanitized = sanitizeFormulaInjection(String(value));

  if (
    sanitized.includes(",") ||
    sanitized.includes('"') ||
    sanitized.includes("\n") ||
    sanitized.includes("\r")
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  return sanitized;
}

/**
 * Converts an array of objects to CSV format.
 */
export function objectsToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) {
    return columns.map((col) => escapeCSVValue(col.header)).join(",");
  }

  const header = columns.map((col) => escapeCSVValue(col.header)).join(",");
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        return escapeCSVValue(value as string | number | null | undefined);
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

/**
 * Creates a downloadable CSV response with UTF-8 BOM for Excel compatibility.
 * BOM (\uFEFF) signals UTF-8 encoding to Excel and prevents mojibake for
 * international characters (accented names, non-USD currencies, etc.).
 */
export function createCSVResponse(csv: string, filename: string): Response {
  const BOM = "\uFEFF";
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

### Transaction Export Route Skeleton
```typescript
// src/app/api/transactions/export/route.ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, statements, subscriptions, transactionTags, tags, categories } from "@/lib/db/schema";
import { and, eq, or, gte, lte, ilike, desc, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { objectsToCSV, createCSVResponse } from "@/lib/utils/csv";
import { format } from "date-fns";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // Parse same filter params as /api/transactions (sourceType, tagStatus, dateFrom, dateTo, search, accountId, paymentType)
    // Build conditions array — same logic as /api/transactions/route.ts
    // NO cursorDate/cursorId handling
    // NO .limit() on the query

    const results = await db
      .select({ /* same selectFields as main route */ })
      .from(transactions)
      .leftJoin(statements, eq(transactions.statementId, statements.id))
      .leftJoin(subscriptions, eq(transactions.convertedToSubscriptionId, subscriptions.id))
      .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.transactionDate), desc(transactions.id));
    // No .limit()

    // Fetch tags for ALL results
    const transactionIds = results.map((t) => t.id);
    let tagsMap = new Map<string, string[]>();
    if (transactionIds.length > 0) {
      const tagResults = await db
        .select({ transactionId: transactionTags.transactionId, tagName: tags.name })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.id))
        .where(inArray(transactionTags.transactionId, transactionIds));
      for (const row of tagResults) {
        const existing = tagsMap.get(row.transactionId) ?? [];
        existing.push(row.tagName);
        tagsMap.set(row.transactionId, existing);
      }
    }

    // Map to CSV columns: Date, Description, Amount, Currency, Source, Tags, Linked Subscription
    const exportData = results.map((t) => ({
      date: format(new Date(t.transactionDate), "yyyy-MM-dd"),
      description: t.merchantName,
      amount: t.amount,
      currency: t.currency,
      source: t.sourceType ?? "",
      tags: (tagsMap.get(t.id) ?? []).join(", "),
      linkedSubscription: t.convertedToSubscriptionId ? "Yes" : "",
    }));

    const columns = [
      { key: "date" as const, header: "Date" },
      { key: "description" as const, header: "Description" },
      { key: "amount" as const, header: "Amount" },
      { key: "currency" as const, header: "Currency" },
      { key: "source" as const, header: "Source" },
      { key: "tags" as const, header: "Tags" },
      { key: "linkedSubscription" as const, header: "Linked Subscription" },
    ];

    const csv = objectsToCSV(exportData, columns);
    const filename = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    return createCSVResponse(csv, filename);
  } catch (error) {
    console.error("Export transactions error:", error);
    return new Response("An error occurred", { status: 500 });
  }
}
```

### Export Button Component (Reusable)
```typescript
// Can be inline in each page or extracted as a small shared component
// Subscriptions page usage:
const [isExporting, setIsExporting] = useState(false);

async function handleExport() {
  setIsExporting(true);
  try {
    const res = await fetch("/api/subscriptions/export");
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  } catch {
    toast.error("Export failed. Please try again.");
  } finally {
    setIsExporting(false);
  }
}

// Button JSX (in the flex header next to "Add Subscription"):
<Button
  variant="outline"
  onClick={handleExport}
  disabled={isExporting || subscriptions.length === 0}
  data-testid="export-csv-button"
>
  {isExporting ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : (
    <Download className="mr-2 h-4 w-4" />
  )}
  Export CSV
</Button>
```

### Transaction Export Button — Passing Current Filters
```typescript
// In TransactionBrowser, the export URL must include the same filters as the browser view
async function handleExport() {
  setIsExporting(true);
  try {
    const params = new URLSearchParams();
    if (debouncedFilters.sourceType) params.set("sourceType", debouncedFilters.sourceType);
    if (debouncedFilters.tagStatus && debouncedFilters.tagStatus !== "all") params.set("tagStatus", debouncedFilters.tagStatus);
    if (debouncedFilters.dateFrom) params.set("dateFrom", debouncedFilters.dateFrom);
    if (debouncedFilters.dateTo) params.set("dateTo", debouncedFilters.dateTo);
    if (debouncedFilters.search) params.set("search", debouncedFilters.search);
    if (debouncedFilters.accountId) params.set("accountId", debouncedFilters.accountId);
    if (debouncedFilters.paymentType && debouncedFilters.paymentType !== "all") params.set("paymentType", debouncedFilters.paymentType);

    const url = `/api/transactions/export${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    toast.success("CSV downloaded");
  } catch {
    toast.error("Export failed. Please try again.");
  } finally {
    setIsExporting(false);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<a href="/api/export">` direct link | `fetch` + `URL.createObjectURL` + synthetic anchor click | Standard since ~2015 | Preserves auth session cookies; works for POST and authenticated GET endpoints |
| CSV without BOM | UTF-8 BOM prepended (`\uFEFF`) | Excel requirement for 20+ years | Required for Excel to detect UTF-8 encoding; without it, non-ASCII characters become mojibake |
| No injection protection | Tab-prefix for cells starting with `=`, `+`, `-`, `@` | OWASP CWE-1236 guidance | Required security control; affects any user-entered data (subscription names, notes, tags) |

**Deprecated/outdated:**
- `data:text/csv` URI approach: Creates large data URIs that can crash tabs for large files; blob URL is more memory-efficient and equally supported

## Open Questions

1. **Linked Subscription column content**
   - What we know: Column is "Linked Subscription" per the locked decisions
   - What's unclear: Should the value be the subscription name (requires a join to subscriptions.name) or a boolean "Yes/No" or the subscription ID?
   - Recommendation: Use the subscription name if the transaction has `convertedToSubscriptionId`; the export route's `selectFields` already includes the subscription join via `leftJoin(subscriptions, ...)` so `subscriptions.name` is accessible without an extra query. Fallback to empty string if not linked.

2. **Large dataset performance for transaction export**
   - What we know: No `.limit()` means a user with 50,000 transactions will get all 50,000 in one query
   - What's unclear: Whether the Supabase connection pool / query timeout will handle this
   - Recommendation: Left to Claude's discretion per CONTEXT.md; for the current scale of this app (personal subscription tracker), this is not a real concern. Add a server-side soft cap of 10,000 rows with a header note if needed, but this is likely premature optimization.

3. **Tags `inArray` size for large exports**
   - What we know: Postgres `IN` clause with thousands of UUIDs can exceed protocol limits
   - What's unclear: Practical limit depends on the Postgres driver; `node-postgres` supports up to ~65k parameters per query
   - Recommendation: For this app's scale, a single `inArray` call is fine. Document in code that batching is a future optimization if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright ^1.57.0 + Vitest ^4.0.17 |
| Config file | `playwright.config.ts` (exists) |
| Quick run command | `npm run test:e2e -- tests/e2e/export.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPRT-01 | Export button on subscriptions page triggers CSV download | E2E (Playwright) | `npm run test:e2e -- tests/e2e/export.spec.ts` | Yes (skipped) |
| EXPRT-02 | Export button on transactions page triggers CSV download | E2E (Playwright) | `npm run test:e2e -- tests/e2e/export.spec.ts` | Yes (skipped) |
| EXPRT-03 | Formula injection sanitization in CSV output | Unit (Vitest) | `npm run test -- src/lib/utils/csv.test.ts` | No — Wave 0 gap |
| EXPRT-04 | UTF-8 BOM present in CSV response | Unit (Vitest) | `npm run test -- src/lib/utils/csv.test.ts` | No — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npm run test -- src/lib/utils/csv.test.ts` (unit tests for csv.ts)
- **Per wave merge:** `npm run test:e2e -- tests/e2e/export.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/utils/csv.test.ts` — covers EXPRT-03 (formula injection) and EXPRT-04 (BOM presence); must be created before implementing `csv.ts` patches
- [ ] Un-skip 3 tests in `tests/e2e/export.spec.ts` — all 3 tests exist but are `test.skip`; they should be un-skipped as part of this phase after the implementation ships

*(The E2E spec file already exists at `tests/e2e/export.spec.ts` with the correct test structure from Phase 41. The unit test file for csv.ts does not exist and must be created.)*

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/lib/utils/csv.ts`, `src/app/api/subscriptions/export/route.ts`, `src/app/api/transactions/route.ts`, `src/components/transactions/transaction-browser.tsx`, `src/app/(dashboard)/subscriptions/page.tsx`
- `tests/e2e/export.spec.ts` — confirms 3 pre-written skipped tests from Phase 41

### Secondary (MEDIUM confidence)
- OWASP CSV Injection guidance (CWE-1236) — tab prefix as recommended prevention technique; widely documented
- MDN Web API: `URL.createObjectURL()` + `URL.revokeObjectURL()` — standard browser download pattern, universally supported

### Tertiary (LOW confidence)
- Excel UTF-8 BOM behavior — well-established historical behavior of Excel requiring BOM for UTF-8 CSV auto-detection; no version-specific source verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; no new packages; direct code inspection
- Architecture: HIGH — existing patterns are clear; fetch+blob is well-established; patching csv.ts is minimal
- Pitfalls: HIGH — most pitfalls derived from direct code reading (copy-paste risk from transactions route, BOM placement)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain; no fast-moving dependencies)
