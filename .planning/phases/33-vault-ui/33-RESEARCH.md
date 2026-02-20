# Phase 33: Vault UI - Research

**Researched:** 2026-02-20
**Domain:** Next.js App Router page construction, Radix UI Tabs, CSS Grid calendar layout, TanStack Query data composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**View layout & switching**
- Two views: **File Cabinet** and **Timeline**, switched via a **tab bar at the top** of the vault page
- Default view is **File Cabinet** (no persistence of last-chosen view — always opens on File Cabinet)
- **File Cabinet:** Source folders shown as **cards/tiles** — clicking a card **expands inline** to reveal statements below it on the same page (no sub-page navigation)
- Always show folder cards even with a single source — consistent experience
- **Timeline:** A **calendar grid** layout — months as cells, not a flat chronological list
- Each grid cell shows a **PDF icon (green if stored, gray if data-only) + transaction count badge** — click to expand
- Clicking a filled calendar cell **expands a detail panel below the grid** (grid stays visible)

**Statement card content**
- Statement rows inside expanded folders use a **rich row** format: PDF icon + filename + statement date + transaction count + status breakdown (converted/pending/skipped) + View PDF action
- **Inline actions** directly on the row: View PDF button + link to statement detail page (no hover/menu pattern)
- Statements imported before v2.2 (no stored PDF) are **shown with a gray icon and "No file stored" indicator** — vault shows all statements, not just PDF-backed ones

**Empty & first-use state**
- New users with no statements see an **illustration/icon + explanatory text about the vault + prominent "Upload Statements" button** linking to batch import
- **Summary stats bar** in the page header: "3 sources - 12 statements - 8 PDFs stored" (visible when data exists)

**Navigation & sidebar**
- /vault placed **near the top of the sidebar** (after Dashboard) — prominent, primary feature
- Label: **"Vault"** with an **archive icon** (from lucide-react)
- **Sources page remains for now** — vault built alongside it. Intent is for vault to eventually replace Sources, but that happens after vault is proven working
- Phase 33 scope: build /vault, add sidebar link. Do NOT remove Sources page.

### Claude's Discretion
- Exact folder card design and layout (grid columns, spacing)
- Calendar grid implementation approach (CSS Grid vs component library)
- Loading skeleton design for folder cards and grid cells
- Exact summary stats formatting and positioning
- Illustration choice for empty state (can use lucide icons as placeholder)

### Deferred Ideas (OUT OF SCOPE)
- Replace/merge Sources page into Vault — after vault is proven working (future phase or cleanup task)
- View preference persistence (localStorage) — skipped for now, may add later if users request it
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VAULT-01 | User can browse statements in a file cabinet view grouped by source | Existing `/api/sources` + `/api/sources/[sourceType]/statements` APIs fully support this; reuse `useSources` and `useSourceStatements` hooks |
| VAULT-02 | User can browse statements in a timeline view sorted chronologically with month separators | Need a new `/api/vault/timeline` endpoint that returns all statements across all sources sorted by date; group by year-month client-side or server-side |
| VAULT-03 | User can toggle between file cabinet and timeline views with preference persisted | Context says NO persistence (always defaults to File Cabinet) — implement tab state with React `useState` only, no localStorage |
| VAULT-04 | New users see an empty state with guidance and upload CTA when vault is empty | Empty state branch when `sources.length === 0`; link to `/import/batch` |
</phase_requirements>

---

## Summary

Phase 33 builds a `/vault` page that gives users a dedicated home base for all their stored statements. The vault sits on top of the existing sources/statements infrastructure — all data is already available via the `/api/sources` and `/api/sources/[sourceType]/statements` endpoints built in earlier phases.

The **File Cabinet view** can be built by adapting the existing `SourceList`/`SourceRow` pattern from the Sources page, but redesigned from accordion to card/tile layout. The **Timeline view** requires a new API endpoint that returns all statements across all sources in a flat, date-sorted list — this data needs to be grouped by year-month for the calendar grid. The calendar grid itself is best done with CSS Grid (no new dependencies needed).

The **sidebar integration** requires a single line change in `app-sidebar.tsx`: add a Vault entry with the `Archive` lucide icon positioned after Dashboard in `mainNavItems`. No new layout or provider infrastructure is needed — the vault page is a standard `(dashboard)` group page.

**Primary recommendation:** Build the vault page in four focused steps: (1) new `/api/vault/timeline` endpoint, (2) new `/vault` page with tab switching, (3) file cabinet view as card tiles with inline expansion, (4) timeline view as CSS Grid calendar.

---

## Standard Stack

### Core (already installed, no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-tabs` | ^1.1.13 | Tab bar for view switching | Already installed, shadcn Tabs component exists at `src/components/ui/tabs.tsx` |
| `lucide-react` | ^0.562.0 | Archive icon for sidebar, FileText/PDF icons | Already installed, `Archive` icon available |
| `@tanstack/react-query` | ^5.90.19 | Data fetching hooks for sources/statements | Already installed, all patterns established |
| `date-fns` | ^4.1.0 | Date grouping and formatting for timeline grid | Already installed |
| Tailwind CSS v4 | ^4 | Grid layout for calendar, card styling | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-collapsible` | already installed | Inline expand/collapse of folder cards | Folder cards expand inline — Collapsible is cleaner than manual state per-card |
| `Skeleton` from shadcn | already installed | Loading placeholders | Card skeletons and grid cell skeletons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS Grid for calendar | `react-day-picker` (already installed) | react-day-picker is a date-picker widget, not a month-grid display. CSS Grid is simpler and more flexible for this use case. |
| CSS Grid for calendar | Full calendar library (react-big-calendar) | Heavy dependency not warranted; only need 12-24 month cells, not interactive event scheduling |
| Radix Collapsible per card | useState array of open IDs | Collapsible handles animation and a11y; useState array also works fine and may be simpler for few items |

**Installation:** No new packages needed. All required libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── (dashboard)/
│       └── vault/
│           └── page.tsx                  # New vault page
├── components/
│   └── vault/
│       ├── index.ts                      # Barrel export
│       ├── vault-page.tsx                # Main client component (tab state lives here)
│       ├── vault-stats-bar.tsx           # "3 sources · 12 statements · 8 PDFs stored"
│       ├── vault-empty-state.tsx         # Empty state illustration + CTA
│       ├── file-cabinet-view.tsx         # File Cabinet tab content
│       ├── folder-card.tsx               # Individual folder tile (expandable)
│       ├── folder-statements.tsx         # Statement rows inside an expanded folder
│       ├── timeline-view.tsx             # Timeline tab content
│       └── timeline-grid.tsx             # Calendar grid (months as cells)
├── lib/
│   └── hooks/
│       ├── use-vault-summary.ts          # Hook for summary stats (sources count, statements count, PDFs count)
│       └── use-vault-timeline.ts         # Hook for flat timeline data
└── app/
    └── api/
        └── vault/
            └── timeline/
                └── route.ts             # GET /api/vault/timeline
```

The page file at `src/app/(dashboard)/vault/page.tsx` is a thin server component (like `sources/page.tsx`) that renders `DashboardHeader` + delegates to the `VaultPage` client component.

### Pattern 1: Tab View Switching (Radix Tabs)

**What:** Two tabs at the top, state in client component, default is "file-cabinet".

**When to use:** When the user needs to switch between two distinct views of the same data without navigating.

**Example:**
```typescript
// vault-page.tsx — "use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function VaultPage({ sources, summary }) {
  return (
    <Tabs defaultValue="file-cabinet">
      <TabsList>
        <TabsTrigger value="file-cabinet">
          <FolderOpen className="size-4" />
          File Cabinet
        </TabsTrigger>
        <TabsTrigger value="timeline">
          <CalendarDays className="size-4" />
          Timeline
        </TabsTrigger>
      </TabsList>
      <TabsContent value="file-cabinet">
        <FileCabinetView sources={sources} />
      </TabsContent>
      <TabsContent value="timeline">
        <TimelineView />
      </TabsContent>
    </Tabs>
  );
}
```

The `shadcn/ui` Tabs component at `src/components/ui/tabs.tsx` wraps `@radix-ui/react-tabs` and is already styled. Use it directly — no custom implementation needed.

### Pattern 2: Folder Card with Inline Expansion

**What:** Each source becomes a card tile. Clicking the card expands it in-place to show statements. Multiple cards can be open simultaneously (unlike the existing accordion which allows only one).

**When to use:** File Cabinet view — user wants to see folder tiles, not a list.

**Approach:** Use per-card open state via a `Set<string>` of open sourceTypes in the parent `FileCabinetView`, OR use individual `useState` in each `FolderCard`. Individual per-card state is simpler and avoids prop drilling.

```typescript
// folder-card.tsx — "use client"
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function FolderCard({ source }: { source: SourceCoverage }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left rounded-xl border p-4 hover:bg-muted/50 transition-colors">
          {/* Folder tile content: icon, name, statement count, PDF count */}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <FolderStatements sourceType={source.sourceType} />
      </CollapsibleContent>
    </Collapsible>
  );
}
```

The `CollapsibleContent` uses `@radix-ui/react-collapsible` which is already installed (the `src/components/ui/collapsible.tsx` exists in the project).

**Grid layout for folder cards:**
```tsx
// file-cabinet-view.tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {sources.map(source => (
    <FolderCard key={source.sourceType} source={source} />
  ))}
</div>
```

### Pattern 3: Timeline Calendar Grid

**What:** CSS Grid where each cell is a year-month. Cells span a contiguous range from earliest to latest statement date. Empty months show as gray cells.

**When to use:** Timeline view — gives a visual sense of coverage density over time.

**Data shape needed from API:**
```typescript
// /api/vault/timeline response
type TimelineResponse = {
  statements: Array<{
    id: string;
    sourceType: string;
    originalFilename: string;
    statementDate: string;   // ISO string
    transactionCount: number;
    hasPdf: boolean;
    stats: { converted: number; skipped: number; pending: number };
  }>;
  // Derived summary (also useful for stats bar)
  totalSources: number;
  totalStatements: number;
  totalPdfs: number;
};
```

**Grid construction logic (client-side):**
```typescript
// Group statements by "YYYY-MM" key
const byMonth = new Map<string, StatementSummary[]>();
for (const stmt of statements) {
  const key = format(parseISO(stmt.statementDate), "yyyy-MM");
  if (!byMonth.has(key)) byMonth.set(key, []);
  byMonth.get(key)!.push(stmt);
}

// Generate all months from earliest to latest
const allMonths = eachMonthOfInterval({ start: earliest, end: latest });
```

**CSS Grid for calendar cells:**
```tsx
// timeline-grid.tsx
<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
  {allMonths.map(month => {
    const key = format(month, "yyyy-MM");
    const cellStatements = byMonth.get(key) ?? [];
    const hasPdf = cellStatements.some(s => s.hasPdf);
    const isEmpty = cellStatements.length === 0;
    return (
      <MonthCell
        key={key}
        month={month}
        statements={cellStatements}
        hasPdf={hasPdf}
        isEmpty={isEmpty}
        isSelected={selectedMonth === key}
        onClick={() => setSelectedMonth(key)}
      />
    );
  })}
</div>

{/* Detail panel below grid — stays visible */}
{selectedMonth && (
  <MonthDetailPanel
    month={selectedMonth}
    statements={byMonth.get(selectedMonth) ?? []}
  />
)}
```

The cell visual:
- Green PDF icon + count badge → `hasPdf === true` AND statements exist
- Gray FileText icon + count badge → statements exist but no PDF
- Light gray empty cell → no statements that month

### Pattern 4: Summary Stats Bar

**What:** A horizontal stats strip showing "3 sources · 12 statements · 8 PDFs stored" visible above the tab bar when data exists.

**When to use:** Always visible when there is at least one source.

```typescript
// Can compute from sources data already fetched by useSources()
function computeSummary(sources: SourceCoverage[], statements: StatementSummary[]) {
  const totalSources = sources.length;
  const totalStatements = sources.reduce((sum, s) => sum + s.statementCount, 0);
  // PDFs count requires per-statement hasPdf — needs timeline endpoint or dedicated query
}
```

The cleanest approach: the `/api/vault/timeline` endpoint returns `totalSources`, `totalStatements`, and `totalPdfs` as top-level fields. The stats bar consumes these from `useVaultTimeline()`. This avoids a separate stats API call.

Alternatively, the stats can be derived from the sources endpoint alone for source/statement counts, but PDF count requires per-statement data. **Recommendation:** include aggregate stats in the timeline endpoint response.

### Pattern 5: Sidebar Addition

**What:** Add "Vault" entry to `mainNavItems` in `app-sidebar.tsx`, positioned after Dashboard.

**Change is minimal:**
```typescript
// In app-sidebar.tsx, mainNavItems array
const mainNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Vault",          // ADD THIS
    href: "/vault",
    icon: Archive,           // import Archive from "lucide-react"
  },
  // ... rest of existing items
];
```

The `Archive` icon is available in `lucide-react` v0.562.0.

### Anti-Patterns to Avoid
- **Fetching all statements per source on page load:** The file cabinet view should lazy-load statement rows only when a folder is expanded (same pattern as existing `StatementList` component which calls `useSourceStatements` on demand). Do not pre-fetch all statements.
- **Using `Accordion` from shadcn for file cabinet:** The existing Sources page uses `Accordion` (only one open at a time). The vault wants multiple folders open simultaneously, so use `Collapsible` per card or plain `useState` open tracking.
- **Building a custom tab system:** The project already has `src/components/ui/tabs.tsx` wrapping Radix tabs. Use it.
- **Separate `/api/vault/summary` endpoint:** Consolidate into the timeline endpoint to avoid two round-trips.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab switching UI | Custom button group with CSS | `<Tabs>` from `src/components/ui/tabs.tsx` | Handles keyboard nav, ARIA, active state styling |
| Folder expand/collapse animation | CSS transform hacks | `<Collapsible>` from `src/components/ui/collapsible.tsx` | Already in project, handles animation, a11y |
| Month range generation | Loop with date arithmetic | `eachMonthOfInterval` from `date-fns` | Handles month boundaries correctly, DST-safe |
| Month formatting | Template literals | `format(date, "MMM yyyy")` from `date-fns` | Already used throughout the codebase |
| Statement fetch/cache | Manual fetch with useEffect | `useQuery` (TanStack Query) | All hooks in `src/lib/hooks/` follow this pattern |

**Key insight:** This phase is entirely UI composition — the heavy lifting (data, PDF viewing, statement detail) already exists. The vault is a new surface for existing data, not a new data system.

---

## Common Pitfalls

### Pitfall 1: Over-fetching on Page Load
**What goes wrong:** Fetching all statements for all sources on page load creates an N+1 waterfall and loads data the user may never see.
**Why it happens:** Trying to pre-populate the file cabinet so cards "pop open" instantly.
**How to avoid:** Only fetch statements for a source when the user expands that folder card. The existing `useSourceStatements(sourceType)` hook has `enabled: !!sourceType` — replicate this lazy pattern in `FolderStatements`.
**Warning signs:** Network tab shows `N` requests to `/api/sources/[x]/statements` on page load.

### Pitfall 2: Accordion vs Collapsible Confusion
**What goes wrong:** Using `Accordion` (which enforces single-open behavior) for the file cabinet when multiple folders should be open simultaneously.
**Why it happens:** The existing Sources page uses Accordion, and it's the familiar "expand a section" pattern.
**How to avoid:** Use `Collapsible` per folder card, or track open state as a `Set<string>` of sourceTypes. Both allow multiple open simultaneously.
**Warning signs:** Opening one folder closes another — that's accordion behavior, not what the vault wants.

### Pitfall 3: Calendar Grid Month Count Explosion
**What goes wrong:** If a user has statements spanning 5 years, the grid renders 60 cells. With 3 sources that's potentially many cells with complex click state.
**Why it happens:** Generating all months from min to max date without considering display bounds.
**How to avoid:** Limit the grid to the actual date range of user's statements. Use `eachMonthOfInterval` between `earliestStatementDate` and `latestStatementDate` from the sources aggregate. Also consider showing years as section headers to organize long timelines.
**Warning signs:** Grid is overwhelmingly tall on mobile.

### Pitfall 4: PDF Count Unavailable Without Statement-Level Data
**What goes wrong:** The `/api/sources` endpoint returns source-level aggregate stats but NOT a PDF count (it returns `statementCount` and `transactionCount` but not "how many statements have pdfStoragePath non-null").
**Why it happens:** The existing sources API was built before vault requirements.
**How to avoid:** The new `/api/vault/timeline` endpoint queries the `statements` table with `pdfStoragePath IS NOT NULL` count. Use this for the stats bar PDF count. Do not try to derive it from the existing sources API.
**Warning signs:** Stats bar shows "0 PDFs stored" even when PDFs exist.

### Pitfall 5: Stale Detail Panel After Grid Navigation
**What goes wrong:** User clicks month A, sees detail panel, clicks month B — panel still shows month A's data briefly.
**Why it happens:** No loading state transition between month selections when statements are already cached.
**How to avoid:** Since all timeline statements are loaded at once (one API call), the detail panel should update synchronously — no async loading needed. Filter `statements.filter(s => format(s.statementDate, "yyyy-MM") === selectedMonth)` client-side.
**Warning signs:** Detail panel shows wrong month's statements.

---

## Code Examples

### /api/vault/timeline Route (New Endpoint)
```typescript
// src/app/api/vault/timeline/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, transactions } from "@/lib/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Fetch all statements with transaction stats
  const statementList = await db
    .select({
      id: statements.id,
      sourceType: statements.sourceType,
      originalFilename: statements.originalFilename,
      statementDate: statements.statementDate,
      transactionCount: statements.transactionCount,
      pdfStoragePath: statements.pdfStoragePath,
      createdAt: statements.createdAt,
    })
    .from(statements)
    .where(eq(statements.userId, userId))
    .orderBy(desc(statements.statementDate));

  // Get transaction stats per statement (same pattern as existing endpoints)
  const statementIds = statementList.map(s => s.id);
  // ... (same statsMap logic as /api/sources/[sourceType]/statements)

  const result = statementList.map(stmt => ({
    id: stmt.id,
    sourceType: stmt.sourceType,
    originalFilename: stmt.originalFilename,
    statementDate: stmt.statementDate?.toISOString() ?? null,
    transactionCount: stmt.transactionCount ?? 0,
    hasPdf: stmt.pdfStoragePath !== null,
    stats: statsMap.get(stmt.id) ?? { converted: 0, skipped: 0, pending: 0 },
  }));

  const distinctSources = new Set(result.map(s => s.sourceType)).size;

  return NextResponse.json({
    statements: result,
    totalSources: distinctSources,
    totalStatements: result.length,
    totalPdfs: result.filter(s => s.hasPdf).length,
  });
}
```

### useVaultTimeline Hook
```typescript
// src/lib/hooks/use-vault-timeline.ts
"use client";
import { useQuery } from "@tanstack/react-query";

export const vaultKeys = {
  timeline: () => ["vault", "timeline"] as const,
};

async function fetchVaultTimeline() {
  const res = await fetch("/api/vault/timeline");
  if (!res.ok) throw new Error("Failed to fetch vault timeline");
  return res.json();
}

export function useVaultTimeline() {
  return useQuery({
    queryKey: vaultKeys.timeline(),
    queryFn: fetchVaultTimeline,
    staleTime: 2 * 60 * 1000,
  });
}
```

### Vault Page Structure
```typescript
// src/app/(dashboard)/vault/page.tsx
import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { VaultPage } from "@/components/vault/vault-page";

export const metadata: Metadata = {
  title: "Vault",
  description: "Browse all your stored bank statements",
};

export default function VaultPageRoute() {
  return (
    <>
      <DashboardHeader
        title="Vault"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vault" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <VaultPage />
        </div>
      </main>
    </>
  );
}
```

### Archive Icon in lucide-react
```typescript
// Verified: Archive is available in lucide-react
import { Archive } from "lucide-react";
// Used in sidebar mainNavItems
{ title: "Vault", href: "/vault", icon: Archive }
```

### CSS Grid Calendar (Month Cells)
```tsx
// timeline-grid.tsx
import { eachMonthOfInterval, format, parseISO } from "date-fns";

function TimelineGrid({ statements }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Compute date range from statements
  const dates = statements.map(s => parseISO(s.statementDate)).filter(Boolean);
  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  const latest = new Date(Math.max(...dates.map(d => d.getTime())));
  const allMonths = eachMonthOfInterval({ start: earliest, end: latest });

  // Group by month key
  const byMonth = new Map<string, typeof statements>();
  for (const stmt of statements) {
    const key = format(parseISO(stmt.statementDate), "yyyy-MM");
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(stmt);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {allMonths.map(month => {
          const key = format(month, "yyyy-MM");
          const cellStmts = byMonth.get(key) ?? [];
          const hasPdf = cellStmts.some(s => s.hasPdf);
          const isSelected = selectedMonth === key;
          return (
            <button
              key={key}
              onClick={() => cellStmts.length > 0 && setSelectedMonth(isSelected ? null : key)}
              className={cn(
                "rounded-lg border p-2 text-xs flex flex-col items-center gap-1 transition-colors",
                cellStmts.length === 0 && "opacity-30 cursor-default",
                isSelected && "ring-2 ring-primary bg-primary/5",
                cellStmts.length > 0 && !isSelected && "hover:bg-muted/50"
              )}
            >
              <FileText className={cn("h-4 w-4", hasPdf ? "text-green-500" : "text-muted-foreground")} />
              <span>{format(month, "MMM")}</span>
              <span className="text-muted-foreground">{format(month, "yy")}</span>
              {cellStmts.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1">{cellStmts.length}</Badge>
              )}
            </button>
          );
        })}
      </div>
      {/* Detail panel below grid */}
      {selectedMonth && byMonth.has(selectedMonth) && (
        <MonthDetailPanel
          month={selectedMonth}
          statements={byMonth.get(selectedMonth)!}
        />
      )}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Accordion for source list | Collapsible cards (multiple open) | Phase 33 | Better UX — users can compare multiple sources side by side |
| Sources page as primary doc browser | Vault as primary, Sources as legacy | Phase 33 | Vault becomes the "home base" for financial documents |

**No deprecated libraries:** All libraries used (Radix Tabs, Collapsible, date-fns, TanStack Query) are current stable versions in the project.

---

## Open Questions

1. **Timeline view: all statements or only those with dates?**
   - What we know: `statementDate` is nullable in the schema (`timestamp("statement_date", ...) nullable`). Old imported statements may not have a date.
   - What's unclear: Should date-less statements be included in the timeline grid? If so, where? In a "No Date" bucket at the end?
   - Recommendation: Show dateless statements in a separate "Date Unknown" section below the grid. The grid only covers statements with valid dates. This keeps the grid clean and still surfaces all statements.

2. **Folder card PDF count display**
   - What we know: The `/api/sources` endpoint returns `statementCount` but not a PDF count per source.
   - What's unclear: Does the folder card need to show "X of Y PDFs stored"?
   - Recommendation: Since the vault timeline endpoint fetches per-statement `hasPdf`, derive the per-source PDF count client-side from the timeline data. Alternatively, keep folder cards simple (statement count only) and show the global PDF count only in the summary stats bar.

3. **Calendar grid responsiveness for long date ranges**
   - What we know: Some users may have 3+ years of statements = 36+ grid cells.
   - What's unclear: How should years be delineated in the grid?
   - Recommendation: Group by year — render year header labels above each year's months. Use `Object.groupBy` or manual grouping with `date-fns` `getYear()`. This avoids an endlessly tall grid and aids scanning.

---

## Existing Code to Reuse

This section is critical — the vault builds on top of existing components rather than replacing them.

### Components to Reuse
| Existing Component | Reuse In | Notes |
|-------------------|----------|-------|
| `PdfStatusIcon` (in `statement-list.tsx`) | `FolderStatements`, `MonthDetailPanel` | Currently inlined — extract to shared component OR copy pattern |
| `PdfViewerModal` (`src/components/statements/pdf-viewer-modal.tsx`) | `FolderStatements` statement rows | Use exactly as-is |
| `StatementList` (`src/components/sources/statement-list.tsx`) | Could reuse in `FolderStatements` | This component is the rich row format already; may be directly usable with minor prop additions |
| `Skeleton` from shadcn | Loading states for folder cards and grid | Use as-is |
| `Badge` from shadcn | Transaction count badge in grid cells | Use as-is |

### Hooks to Reuse
| Existing Hook | Reuse In | Notes |
|--------------|----------|-------|
| `useSources` (`src/lib/hooks/use-sources.ts`) | `FileCabinetView` | Fetch all sources with coverage stats |
| `useSourceStatements` (`src/lib/hooks/use-source-statements.ts`) | `FolderStatements` | Lazy fetch per source on expand — already has `enabled` guard |
| `usePdfUrl` (`src/lib/hooks/use-pdf-url.ts`) | Via `PdfViewerModal` | Used indirectly through PdfViewerModal |

### APIs to Reuse
| Existing API | Reuse | Notes |
|-------------|-------|-------|
| `GET /api/sources` | File Cabinet view source list | No changes needed |
| `GET /api/sources/[sourceType]/statements` | Lazy-load folder contents | No changes needed |
| `GET /api/statements/[id]/pdf-url` | Via PdfViewerModal | No changes needed |

### New API Needed
| New API | Purpose | Based On |
|---------|---------|---------|
| `GET /api/vault/timeline` | Timeline view data + global stats (totalSources, totalStatements, totalPdfs) | Modeled after `/api/sources/[sourceType]/statements` but across all sources |

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `src/app/(dashboard)/sources/page.tsx` — confirmed page layout pattern
- Codebase inspection — `src/components/sources/` — confirmed existing statement display components
- Codebase inspection — `src/components/ui/tabs.tsx` — confirmed Tabs component exists and is styled
- Codebase inspection — `src/components/ui/collapsible.tsx` — confirmed Collapsible exists
- Codebase inspection — `src/lib/hooks/use-sources.ts` + `use-source-statements.ts` — confirmed data layer
- Codebase inspection — `src/components/layout/app-sidebar.tsx` — confirmed sidebar structure and `mainNavItems` array
- Codebase inspection — `package.json` — confirmed all libraries already installed
- Codebase inspection — `src/lib/db/schema.ts` — confirmed `pdfStoragePath` is nullable (determines `hasPdf`)

### Secondary (MEDIUM confidence)
- `lucide-react` v0.562.0 — `Archive` icon confirmed available (lucide has had Archive since v0.1; this version is recent enough)
- `date-fns` v4 `eachMonthOfInterval` — confirmed used in `/api/sources/route.ts` for gap calculation (same function used for grid generation)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, inspected package.json
- Architecture: HIGH — modeled directly on existing Sources page and source components
- Pitfalls: HIGH — derived from direct code inspection of existing patterns and schema

**Research date:** 2026-02-20
**Valid until:** 2026-03-22 (30 days — stable, no fast-moving external dependencies)
