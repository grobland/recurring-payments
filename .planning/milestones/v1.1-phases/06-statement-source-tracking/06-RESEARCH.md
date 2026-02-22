# Phase 6: Statement Source Tracking - Research

**Researched:** 2026-02-02
**Domain:** Import Source Tracking, Autocomplete UX, Database Schema Extension
**Confidence:** HIGH

## Summary

Statement Source Tracking allows users to tag PDF imports with the bank/credit card account name, enabling them to track which statement each subscription came from. This requires adding a `statementSource` column to `import_audits`, modifying the import flow to capture the account name before upload, and displaying the source on subscription detail pages.

The implementation follows the established combobox pattern from Phase 5 (CategoryCombobox), with autocomplete suggestions pulled from distinct previous import sources. The source field appears BEFORE file upload, is required, and supports both typing new account names and selecting from recently-used accounts.

**Primary recommendation:** Extend schema first (migration), update import API to capture source, build AccountCombobox component following CategoryCombobox pattern, display source in subscription metadata section.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | Already installed | Schema migration for statementSource | Already used for all database operations |
| shadcn/ui Combobox | n/a (composition) | Account autocomplete dropdown | Same pattern as CategoryCombobox from Phase 5 |
| React Hook Form | 7.71.1 (installed) | Import form with account field | Already used in import flow |
| TanStack Query | Already installed | Fetch distinct accounts for autocomplete | Already used for data fetching |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Command + Popover | n/a (installed) | Combobox primitives | For searchable account dropdown with "Create new" option |
| date-fns | Already installed | Sort accounts by last import date | Already used throughout app for date manipulation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Combobox with autocomplete | Plain text input | Loses autocomplete UX, users must remember exact account names |
| Store source on subscriptions | Store source on import_audits only | Would duplicate data across subscriptions, violates normalization |
| Separate accounts table | Add column to import_audits | Over-engineering for simple tagging feature, CRUD management deferred |
| Full account management | Simple source tagging | Phase scope is tracking imports, not managing accounts |

**Installation:**
```bash
# All dependencies already installed
# Just need schema migration and new components
npm run db:generate  # Generate migration for statementSource column
npm run db:migrate   # Apply migration
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── import/                     # NEW - Import-specific components
│   │   └── account-combobox.tsx   # Account autocomplete selector
│   ├── categories/                 # EXISTING - Reference for combobox pattern
│   │   └── category-combobox.tsx  # Pattern to follow
│   └── subscriptions/
│       └── subscription-detail.tsx # MODIFY - Add source display
├── lib/
│   ├── db/
│   │   └── schema.ts               # MODIFY - Add statementSource to import_audits
│   ├── hooks/
│   │   └── use-import-sources.ts   # NEW - Fetch distinct sources with sorting
│   └── validations/
│       └── import.ts               # MODIFY - Add source validation
└── app/
    ├── (dashboard)/
    │   └── import/
    │       └── page.tsx            # MODIFY - Add account field before upload
    └── api/
        ├── import/
        │   ├── route.ts            # MODIFY - Accept statementSource in POST
        │   ├── confirm/
        │   │   └── route.ts        # MODIFY - Pass source to import_audits
        │   └── sources/
        │       └── route.ts        # NEW - GET endpoint for distinct sources
        └── subscriptions/
            └── [id]/
                └── route.ts        # MODIFY - Include source in response
```

### Pattern 1: Schema Extension for Statement Source
**What:** Add nullable varchar column to import_audits for tracking bank/card name
**When to use:** When extending existing table with optional metadata
**Example:**
```typescript
// src/lib/db/schema.ts - import_audits table
export const importAudits = pgTable(
  "import_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // NEW - Statement source (bank/card account name)
    statementSource: varchar("statement_source", { length: 50 }),

    // File info (metadata only, no actual file stored)
    fileCount: integer("file_count").notNull(),
    totalPageCount: integer("total_page_count"),

    // ... rest of existing fields
  },
  (table) => [index("import_audits_user_id_idx").on(table.userId)]
);
```

**Migration strategy:**
- Add nullable column (allows existing records to have NULL source)
- Max length 50 chars (reasonable for "Chase Visa" or "Wells Fargo Checking")
- No index needed (queries filter by userId first, then sort/distinct)
- Validation happens at API level (Zod schema)

### Pattern 2: Combobox with "Create New" Functionality
**What:** Account selector with autocomplete from previous imports, plus ability to type new account names
**When to use:** When users need to select from history OR create new entries inline
**Example:**
```typescript
// src/components/import/account-combobox.tsx
// Pattern adapted from CategoryCombobox (Phase 5)
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AccountComboboxProps {
  value: string;
  onChange: (value: string) => void;
  previousAccounts: string[];  // Sorted by most recently used
  disabled?: boolean;
}

export function AccountCombobox({
  value,
  onChange,
  previousAccounts,
  disabled = false,
}: AccountComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Contains-match filtering
  const filtered = previousAccounts.filter((account) =>
    account.toLowerCase().includes(search.toLowerCase())
  );

  const showCreateOption = search.trim() && !filtered.includes(search);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value || "Select or type account name..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search accounts..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !showCreateOption && (
              <CommandEmpty>No accounts found.</CommandEmpty>
            )}
            <CommandGroup>
              {showCreateOption && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onChange(search.trim());
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">Create "{search}"</span>
                </CommandItem>
              )}
              {filtered.map((account) => (
                <CommandItem
                  key={account}
                  value={account}
                  onSelect={() => {
                    onChange(account);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {account}
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

### Pattern 3: Fetch Distinct Sources with Recency Sorting
**What:** API endpoint returning unique account names sorted by most recent import
**When to use:** When building autocomplete from historical data
**Example:**
```typescript
// src/app/api/import/sources/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { importAudits } from "@/lib/db/schema";
import { eq, isNotNull, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch distinct sources ordered by most recent import
    const sources = await db
      .selectDistinct({ source: importAudits.statementSource })
      .from(importAudits)
      .where(
        eq(importAudits.userId, session.user.id),
        isNotNull(importAudits.statementSource)
      )
      .orderBy(desc(importAudits.createdAt))
      .limit(50);

    return NextResponse.json({
      sources: sources.map((s) => s.source).filter(Boolean),
    });
  } catch (error) {
    console.error("Fetch sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}
```

**Note:** `selectDistinct` on single column returns unique values. Ordering by `createdAt DESC` means most recently used accounts appear first.

### Pattern 4: Display Source in Subscription Detail
**What:** Show statement source in metadata section alongside other subscription details
**When to use:** When subscription was imported (has importAuditId)
**Example:**
```typescript
// src/app/(dashboard)/subscriptions/[id]/page.tsx
// Add to Details Card (around line 302)

{/* Import Source - NEW */}
{subscription.importAudit?.statementSource && (
  <div>
    <p className="text-sm font-medium text-muted-foreground">
      Imported From
    </p>
    <p>{subscription.importAudit.statementSource}</p>
  </div>
)}

{/* Show "Manual entry" for subscriptions without import */}
{!subscription.importAudit && (
  <div>
    <p className="text-sm font-medium text-muted-foreground">
      Source
    </p>
    <p className="text-muted-foreground">Manual entry</p>
  </div>
)}
```

**Display strategy:**
- Subscription query already joins `importAudit` relation (line 410-414 in schema.ts)
- No additional query needed, just access `subscription.importAudit?.statementSource`
- Show "Manual entry" for subscriptions created via form (no importAuditId)
- Could also show source as column in subscription list view

### Pattern 5: Required Field in Import Flow
**What:** Account field appears BEFORE upload, blocks file selection until filled
**When to use:** When metadata must be captured before processing begins
**Example:**
```typescript
// src/app/(dashboard)/import/page.tsx
// Add account field before file dropzone (around line 215)

{step === "upload" && (
  <Card>
    <CardHeader>
      <CardTitle>Upload Documents</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* NEW - Account field */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Account <span className="text-destructive">*</span>
        </label>
        <AccountCombobox
          value={statementSource}
          onChange={setStatementSource}
          previousAccounts={importSources}
          disabled={isProcessing}
        />
        <p className="text-xs text-muted-foreground">
          e.g., "Chase Visa" or "Wells Fargo Checking"
        </p>
      </div>

      {/* Dropzone - disabled until account selected */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          !statementSource && "opacity-50 cursor-not-allowed",
          // ... rest of classes
        )}
      >
        <input {...getInputProps()} disabled={!statementSource} />
        {/* ... rest of dropzone */}
      </div>

      <Button
        onClick={processFiles}
        disabled={files.length === 0 || !statementSource}
        className="w-full"
      >
        Process Files
      </Button>
    </CardContent>
  </Card>
)}
```

**UX considerations:**
- Show field BEFORE upload UI to establish clear sequence
- Disable dropzone until account is entered (visual + functional)
- Required indicator (asterisk) clarifies mandatory nature
- Help text suggests format ("Chase Visa")
- Disable "Process Files" button if account missing

### Anti-Patterns to Avoid

- **Storing source on subscriptions table:** Violates normalization, duplicates data. Source belongs to import audit, subscriptions reference it via importAuditId.
- **Optional account field:** Allowing blank sources defeats tracking purpose. Make it required at form level.
- **Case-sensitive account matching:** "Chase Visa" vs "chase visa" creates duplicates. Normalize to lowercase for comparison, display as entered.
- **Fetching all import audits for autocomplete:** Inefficient. Use `selectDistinct` on source column with user filter.
- **Not showing source for manual entries:** Confusing omission. Explicitly show "Manual entry" so users understand why no source appears.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Autocomplete dropdown | Custom input with datalist | shadcn Combobox (Command + Popover) | Better keyboard nav, "Create new" UX, accessibility |
| Distinct sources query | Fetch all audits, dedupe in JS | SQL DISTINCT with ORDER BY | Orders of magnitude more efficient, database-level deduplication |
| Account similarity matching | Levenshtein distance for fuzzy match | Contains-match filtering | Phase scope is autocomplete, not duplicate detection. Simple substring match sufficient. |
| Account management UI | Full CRUD settings page | Simple tagging during import | Deferred to future phase (noted in context doc). Keep Phase 6 scope tight. |

**Key insight:** This is metadata tagging, not entity management. Don't build an accounts system - just track strings and provide autocomplete convenience.

## Common Pitfalls

### Pitfall 1: Forgetting to Pass Source Through Confirm Import
**What goes wrong:** User selects account, uploads file, sees detected subscriptions, but source is lost when confirming import

**Why it happens:** Import flow has two API calls:
1. `POST /api/import` - uploads files, returns detected subscriptions (no DB write yet)
2. `POST /api/import/confirm` - creates subscriptions and import audit (DB write happens here)

The `statementSource` must be captured in client state during step 1 and passed to step 2.

**How to avoid:**
```typescript
// src/app/(dashboard)/import/page.tsx
const [statementSource, setStatementSource] = useState<string>("");

// When calling confirm
const confirmImport = async () => {
  const toImport = items.map((item) => ({
    name: item.name,
    amount: item.amount,
    // ... other fields
  }));

  const response = await fetch("/api/import/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscriptions: toImport,
      statementSource,  // NEW - pass through
    }),
  });
};
```

**Warning signs:** Import succeeds but subscription detail shows "Manual entry" instead of account name

### Pitfall 2: Not Handling NULL Sources in Existing Data
**What goes wrong:** Migration adds nullable column, but queries assume non-null values, causing errors

**Why it happens:** Existing import_audits records have NULL statementSource after migration. JOIN or display logic that doesn't handle NULL throws errors.

**How to avoid:**
```typescript
// Good - null-safe access
subscription.importAudit?.statementSource ?? "Manual entry"

// Good - filter nulls in distinct query
.where(isNotNull(importAudits.statementSource))

// Bad - assumes always present
subscription.importAudit.statementSource.toUpperCase()  // TypeError if null
```

**Warning signs:** "Cannot read property of undefined" errors on subscription detail page after migration

### Pitfall 3: Autocomplete Query Performance with Large Import History
**What goes wrong:** User with 1000+ imports experiences slow autocomplete dropdown load

**Why it happens:** `SELECT DISTINCT statementSource` without LIMIT can return hundreds of unique accounts, especially if users enter typos or variations.

**How to avoid:**
1. Add LIMIT clause to distinct query (50 accounts sufficient)
2. Order by most recent first (recently used accounts appear at top)
3. Client-side filtering handles narrowing down from 50
```typescript
// Good
.orderBy(desc(importAudits.createdAt))
.limit(50)

// Bad - unbounded query
.selectDistinct({ source: importAudits.statementSource })
// No limit, could return 1000+ accounts
```

**Warning signs:** Dropdown takes >1s to open, shows hundreds of accounts users don't remember

### Pitfall 4: Source Validation Too Strict
**What goes wrong:** User wants to enter "Chase Visa (Business)" but validation rejects it

**Why it happens:** Overly restrictive regex or character whitelist prevents legitimate account names

**How to avoid:**
```typescript
// Good - simple length and non-empty
statementSource: z.string().min(1).max(50).trim()

// Bad - overly restrictive
statementSource: z.string().regex(/^[a-zA-Z\s]+$/)  // Rejects parentheses, hyphens, numbers
```

**Validation rules:**
- Min 1 char (after trim)
- Max 50 chars (reasonable for account names)
- Trim whitespace
- Allow letters, numbers, spaces, parentheses, hyphens, ampersands
- No emoji/special characters (optional enhancement)

**Warning signs:** User complaints about "invalid account name" when entering reasonable values

### Pitfall 5: Duplicate Account Names with Different Casing
**What goes wrong:** Autocomplete shows both "Chase Visa" and "chase visa" as separate options

**Why it happens:** DISTINCT query is case-sensitive in PostgreSQL by default

**How to avoid:**
```typescript
// Option 1: Normalize in application layer
const sources = await db
  .selectDistinct({ source: importAudits.statementSource })
  // ...
  .then((results) => {
    const normalized = new Map<string, string>();
    results.forEach((r) => {
      const lower = r.source.toLowerCase();
      if (!normalized.has(lower)) {
        normalized.set(lower, r.source);  // Keep first occurrence
      }
    });
    return Array.from(normalized.values());
  });

// Option 2: Use DISTINCT ON with LOWER (PostgreSQL-specific)
// But Drizzle doesn't have clean API for this, stick with Option 1
```

**Warning signs:** Autocomplete shows "Chase", "chase", "CHASE" as three options

## Code Examples

Verified patterns from codebase and official sources:

### Schema Migration for Statement Source
```typescript
// src/lib/db/schema.ts - Add to import_audits table
export const importAudits = pgTable(
  "import_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // NEW - Statement source tracking
    statementSource: varchar("statement_source", { length: 50 }),

    // File info (metadata only, no actual file stored)
    fileCount: integer("file_count").notNull(),
    totalPageCount: integer("total_page_count"),

    // Processing results
    detectedCount: integer("detected_count").notNull(),
    confirmedCount: integer("confirmed_count").default(0).notNull(),
    rejectedCount: integer("rejected_count").default(0).notNull(),
    mergedCount: integer("merged_count").default(0).notNull(),

    // Status
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("import_audits_user_id_idx").on(table.userId)]
);
```

### Validation Schema Update
```typescript
// src/lib/validations/import.ts - Add to confirmImportSchema
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
  statementSource: z.string().min(1).max(50).trim(),  // NEW
});
```

### Update Confirm Import API
```typescript
// src/app/api/import/confirm/route.ts
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

  const { subscriptions: toImport, statementSource } = result.data;  // NEW

  // ... process subscriptions

  // Create audit record with source
  const [audit] = await db.insert(importAudits).values({
    userId: session.user.id,
    fileCount: 1,
    totalPageCount: 1,
    detectedCount: toImport.length,
    confirmedCount: createdCount,
    rejectedCount: skippedCount,
    mergedCount,
    statementSource,  // NEW
    completedAt: new Date(),
  }).returning();

  // Link subscriptions to audit
  if (createdSubscriptions.length > 0) {
    await db
      .update(subscriptions)
      .set({ importAuditId: audit.id })
      .where(
        inArray(subscriptions.id, createdSubscriptions.map((s) => s.id))
      );
  }

  return NextResponse.json({
    created: createdCount,
    skipped: skippedCount,
    merged: mergedCount,
    subscriptions: createdSubscriptions,
  });
}
```

### Hook for Fetching Import Sources
```typescript
// src/lib/hooks/use-import-sources.ts
import { useQuery } from "@tanstack/react-query";

export function useImportSources() {
  return useQuery({
    queryKey: ["import-sources"],
    queryFn: async () => {
      const response = await fetch("/api/import/sources");
      if (!response.ok) {
        throw new Error("Failed to fetch import sources");
      }
      const data = await response.json();
      return data.sources as string[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - sources don't change often
  });
}
```

### Display Source in Subscription Detail
```typescript
// src/app/(dashboard)/subscriptions/[id]/page.tsx
// Add to Details Card (CardContent around line 302)

<CardContent className="space-y-4">
  {/* ... existing fields */}

  {/* NEW - Import source */}
  <div>
    <p className="text-sm font-medium text-muted-foreground">
      Source
    </p>
    {subscription.importAudit?.statementSource ? (
      <p>{subscription.importAudit.statementSource}</p>
    ) : (
      <p className="text-muted-foreground">Manual entry</p>
    )}
  </div>

  {/* Separator and timestamps below */}
  <Separator />
  {/* ... rest of details */}
</CardContent>
```

### AccountCombobox Component
```typescript
// src/components/import/account-combobox.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AccountComboboxProps {
  value: string;
  onChange: (value: string) => void;
  previousAccounts: string[];
  disabled?: boolean;
}

export function AccountCombobox({
  value,
  onChange,
  previousAccounts,
  disabled = false,
}: AccountComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Contains-match filtering (case-insensitive)
  const filtered = previousAccounts.filter((account) =>
    account.toLowerCase().includes(search.toLowerCase())
  );

  // Show "Create [name]" option when typing new account
  const showCreateOption = search.trim() && !filtered.some(
    (acc) => acc.toLowerCase() === search.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value || "Select or type account name..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search accounts..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !showCreateOption && (
              <CommandEmpty>Type to create new account</CommandEmpty>
            )}
            <CommandGroup>
              {showCreateOption && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onChange(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                  className="font-medium"
                >
                  Create "{search}"
                </CommandItem>
              )}
              {filtered.map((account) => (
                <CommandItem
                  key={account}
                  value={account}
                  onSelect={() => {
                    onChange(account);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {account}
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store source in notes field | Dedicated statementSource column | 2024-2025 | Structured data, queryable, enables autocomplete |
| Manual text input only | Combobox with autocomplete | 2023-2024 | Faster data entry, consistent naming, reduces typos |
| Fetch all audits for sources | SELECT DISTINCT with limit | Always | Orders of magnitude more efficient |
| Show source as tag/badge | Plain text in metadata section | N/A | Simpler UX, not prominent enough to need badge |
| Case-sensitive matching | Normalize to lowercase | 2024 | Prevents duplicate "Chase" vs "chase" |

**Deprecated/outdated:**
- **Storing source in subscription notes:** Unstructured, not queryable, duplicates data
- **Separate accounts table for Phase 6:** Over-engineering for MVP, deferred to future (account management is Phase 6++ work)
- **HTML datalist for autocomplete:** Poor UX compared to Command palette, limited styling

## Open Questions

Things that couldn't be fully resolved:

1. **Should source be editable after import?**
   - What we know: Source stored on import_audits, which is immutable once created
   - What's unclear: If user misspells account, can they fix it? Would affect all subscriptions from that import.
   - Recommendation: Make immutable for v1.1 (Phase 6 scope). If editing needed, defer to account management feature (Phase 6++).

2. **Should subscription list view show source as a column?**
   - What we know: Detail page will show source in metadata section
   - What's unclear: Is source useful for filtering/sorting subscriptions in list view?
   - Recommendation: Start with detail page only for Phase 6. Add to list view if user requests it (minimal effort, just add column).

3. **How to handle merged subscriptions from different sources?**
   - What we know: Import flow allows merging detected subscription into existing one
   - What's unclear: Which source should be displayed if subscription has multiple imports?
   - Recommendation: Show source from first import (subscription.importAuditId points to first import). Don't track multi-source history in Phase 6.

4. **Should "Manual entry" be clickable to add a source retroactively?**
   - What we know: Manually-created subscriptions have no importAuditId
   - What's unclear: Do users want to tag manual subscriptions with source later?
   - Recommendation: Keep "Manual entry" as read-only text for Phase 6. Retroactive tagging is separate feature.

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `src/lib/db/schema.ts` - import_audits table structure (lines 312-340)
  - `src/app/api/import/route.ts` - Import flow, file processing (lines 56-195)
  - `src/app/api/import/confirm/route.ts` - Subscription creation, audit record (lines 10-119)
  - `src/app/(dashboard)/import/page.tsx` - Import UI, multi-step flow (lines 61-522)
  - `src/app/(dashboard)/subscriptions/[id]/page.tsx` - Subscription detail display (lines 44-369)
  - `src/components/categories/category-combobox.tsx` - Combobox pattern reference (lines 1-122)
- shadcn/ui Combobox - https://ui.shadcn.com/docs/components/combobox
- Drizzle ORM SELECT DISTINCT - https://orm.drizzle.team/docs/select#distinct

### Secondary (MEDIUM confidence)
- Phase 5 Research Doc - CategoryCombobox implementation pattern
- Phase 6 Context Doc - User decisions on source entry UX
- PostgreSQL DISTINCT performance - https://www.postgresql.org/docs/current/sql-select.html#SQL-DISTINCT

### Tertiary (LOW confidence)
- N/A - All findings verified with codebase or official docs

## Metadata

**Confidence breakdown:**
- Schema extension: HIGH - Simple nullable varchar column, standard pattern
- Combobox pattern: HIGH - Exact same pattern as CategoryCombobox from Phase 5
- API integration: HIGH - Straightforward extension of existing import flow
- Display logic: HIGH - Simple null-safe access pattern, already used elsewhere

**Research date:** 2026-02-02
**Valid until:** 2026-05-02 (90 days - stable technologies with slow-changing APIs)
