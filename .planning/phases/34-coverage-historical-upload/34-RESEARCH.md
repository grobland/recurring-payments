# Phase 34: Coverage & Historical Upload - Research

**Researched:** 2026-02-21
**Domain:** Coverage grid visualization, guided upload wizard, vault tab extension
**Confidence:** HIGH — all findings based on direct codebase inspection and verified existing patterns

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Coverage grid visualization**
- GitHub-style heat map grid: columns = months, rows = sources
- Show last 12 months by default
- Three cell color states: Green = PDF stored, Yellow = data only (no file), Gray = no data
- Tooltip on hover showing statement date, transaction count, PDF status — keeps grid clean
- Inline legend bar (above or below grid): ● PDF stored ● Data only ● Missing

**Gap cell interaction**
- Gray cells (no data): Click opens upload wizard directly with source+month pre-filled
- Yellow cells (data, no PDF): Show message "You have data for this month but no PDF. Want to attach one?" then open upload wizard
- Green cells (PDF stored): Click opens the existing PDF viewer modal for that statement
- All three cell states are interactive with distinct behaviors

**Upload wizard flow**
- Single step wizard: confirm source+month (pre-filled from clicked cell), drag-drop PDF, submit
- Appears as a modal dialog — consistent with existing PDF viewer modal pattern
- On success: toast notification + modal auto-closes + grid cell updates to green automatically
- On failure: error shown in modal with retry option

**Grid placement and navigation**
- New "Coverage" tab on /vault page alongside File Cabinet and Timeline tabs
- File Cabinet remains the default tab — Coverage is an explore/action tab
- Tab preference persistence extends to include Coverage (existing localStorage pattern)
- Summary header at top: gap count only (e.g., "3 months missing PDFs") — focuses attention on what needs action
- Empty state (no sources): reuse existing vault empty state ("Upload your first statement" CTA)

### Claude's Discretion
- Upload API approach: reuse existing batch upload or create dedicated endpoint — Claude picks based on codebase patterns
- Exact grid cell sizing, spacing, and responsive behavior
- Tooltip positioning and animation
- Error state handling details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VENH-01 | User can see a coverage visualization grid showing PDF stored / data only / missing per month per source | Coverage grid component pulls per-source/per-month data from a new API endpoint; existing `statements` table has all needed columns (`sourceType`, `statementDate`, `pdfStoragePath`) |
| VENH-02 | User can use a guided wizard to upload historical statements for missing months | Upload wizard reuses `react-dropzone` + `/api/batch/upload` endpoint already in the codebase; the wizard modal is a Dialog following existing PdfViewerModal pattern |
</phase_requirements>

---

## Summary

Phase 34 adds a "Coverage" tab to the existing /vault page. The tab renders a per-source heat map grid showing the last 12 months and lets users upload PDFs for gap months through a minimal single-step wizard. The phase is primarily a UI composition challenge — the underlying data, storage, and upload infrastructure already exists from Phases 31–33.

The key design challenge is the coverage grid data model: the grid must distinguish three cell states (PDF stored / data only / missing) for each source×month intersection. The existing `/api/sources` route already computes gap months, but it only flags gaps within the earliest–latest range. The new API endpoint needs to always show the last 12 calendar months regardless of statement history, and must carry per-cell `hasPdf` and transaction count data. This requires a new dedicated endpoint rather than extending the existing one.

The upload wizard reuses three already-proven building blocks: `react-dropzone` (used in `batch-uploader.tsx`), `/api/batch/upload` (the existing upload endpoint), and shadcn `Dialog` (used in `pdf-viewer-modal.tsx`). The wizard differs from the batch uploader in that source and month are pre-filled from the grid cell click — the user only needs to drop a file and confirm.

**Primary recommendation:** Build a new `/api/vault/coverage` endpoint returning a per-source × last-12-months grid, compose a `CoverageGrid` component with cell state coloring using CSS Grid and Tailwind classes, and build a `HistoricalUploadModal` wrapping `react-dropzone` + the existing upload API. Wire the new "Coverage" tab into `vault-page.tsx` with the same localStorage persistence that already handles "file-cabinet" and "timeline".

---

## Standard Stack

### Core (all already in package.json — no new installs required)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `react-dropzone` | already installed | Drag-drop file zone in wizard | In use in `batch-uploader.tsx` |
| `sonner` | already installed | Toast on upload success | In use throughout codebase |
| shadcn `Dialog` | already installed | Modal container for wizard | In use in `pdf-viewer-modal.tsx` |
| shadcn `Tabs` / `TabsTrigger` | already installed | Coverage tab in vault | In use in `vault-page.tsx` |
| `date-fns` | already installed | Month arithmetic, formatting | In use in `timeline-grid.tsx`, `sources/route.ts` |
| `@tanstack/react-query` | already installed | Data fetching hook for coverage | In use for all vault hooks |
| Drizzle ORM | already installed | Database queries | In use for all API routes |

### No New Dependencies Required

The entire phase can be implemented with the existing stack. No new npm installs.

---

## Architecture Patterns

### Existing Vault Page Structure

```
src/app/(dashboard)/vault/page.tsx           ← Server component shell
src/components/vault/vault-page.tsx          ← Client hub: Tabs, localStorage, data
src/components/vault/file-cabinet-view.tsx   ← Tab 1 content
src/components/vault/timeline-view.tsx       ← Tab 2 content
src/components/vault/timeline-grid.tsx       ← Grid sub-component
src/components/vault/vault-empty-state.tsx   ← Shared empty state
src/components/vault/vault-stats-bar.tsx     ← Stats strip
src/lib/hooks/use-vault-timeline.ts          ← TanStack Query hook
src/lib/hooks/use-sources.ts                 ← TanStack Query hook
```

### Phase 34 Additions

```
src/app/api/vault/coverage/route.ts          ← NEW: GET returns per-source × 12-month grid
src/components/vault/coverage-view.tsx       ← NEW: Coverage tab content
src/components/vault/coverage-grid.tsx       ← NEW: The heat map grid component
src/components/vault/historical-upload-modal.tsx ← NEW: Upload wizard modal
src/lib/hooks/use-vault-coverage.ts          ← NEW: TanStack Query hook for coverage API
```

### Pattern 1: Coverage Data Shape

The coverage API needs to return data the grid component can render directly. Each cell needs to know: source name, month label (YYYY-MM), state (green/yellow/gray), statement ID (for green cells to open PDF viewer), and transaction count (for tooltip).

```typescript
// Recommended response shape from GET /api/vault/coverage
interface CoverageCell {
  month: string;              // "2026-02", "2026-01", etc. (YYYY-MM)
  state: "pdf" | "data" | "missing";
  statementId: string | null; // set for "pdf" and "data" states
  transactionCount: number;   // 0 for "missing"
  statementDate: string | null; // ISO date for tooltip
}

interface CoverageSource {
  sourceType: string;
  cells: CoverageCell[];      // Always exactly 12 cells, index 0 = current month
}

interface CoverageResponse {
  sources: CoverageSource[];
  gapCount: number;           // Count of "missing" cells across all sources
  months: string[];           // The 12 month labels in display order (most recent last)
}
```

### Pattern 2: Coverage Grid Layout (rows = sources, columns = months)

The grid is a CSS Grid table where:
- Column headers = last 12 months (left to right = oldest to newest)
- Row headers = source names
- Cells = colored squares with hover tooltip

```tsx
// CSS Grid approach (proven in timeline-grid.tsx)
// Source: direct codebase analysis
<div
  className="grid gap-1"
  style={{ gridTemplateColumns: `auto repeat(12, minmax(0, 1fr))` }}
>
  {/* Header row */}
  <div /> {/* empty corner */}
  {months.map(month => (
    <div key={month} className="text-xs text-center text-muted-foreground px-1">
      {format(parseISO(month + "-01"), "MMM")}
    </div>
  ))}
  {/* Source rows */}
  {sources.map(source => (
    <>
      <div className="text-sm font-medium pr-3 flex items-center">{source.sourceType}</div>
      {source.cells.map(cell => (
        <CoverageCell key={cell.month} cell={cell} onCellClick={handleCellClick} />
      ))}
    </>
  ))}
</div>
```

### Pattern 3: Cell Color States (Tailwind classes)

```tsx
// Source: decision from CONTEXT.md
const cellClasses = {
  pdf:     "bg-green-500/80 hover:bg-green-500 cursor-pointer",
  data:    "bg-yellow-400/80 hover:bg-yellow-400 cursor-pointer",
  missing: "bg-muted/40 hover:bg-muted/60 cursor-pointer",
};
```

### Pattern 4: Upload Wizard follows PdfViewerModal structure

```tsx
// Source: src/components/statements/pdf-viewer-modal.tsx
// The wizard is a Dialog wrapping dropzone + submit logic

export function HistoricalUploadModal({
  open,
  onClose,
  sourceType,      // pre-filled from clicked cell
  targetMonth,     // pre-filled from clicked cell (YYYY-MM)
  mode,            // "missing" | "attach" (yellow cell message differs)
  onSuccess,       // callback to update grid cell state
}: HistoricalUploadModalProps) {
  // ...Dialog + useDropzone + fetch /api/batch/upload
}
```

### Pattern 5: localStorage Persistence Extension

```tsx
// Source: src/components/vault/vault-page.tsx lines 22-27
// Existing pattern supports two values — extend to three:
useEffect(() => {
  const saved = localStorage.getItem(VAULT_VIEW_KEY);
  if (saved === "file-cabinet" || saved === "timeline" || saved === "coverage") {
    setActiveTab(saved);
  }
}, []);
```

### Pattern 6: Query Invalidation After Upload

After a successful upload in the wizard, invalidate the coverage query so the grid cell turns green without a page reload.

```tsx
// Source: src/lib/hooks/use-batch-upload.ts line 402
// Existing pattern: queryClient.invalidateQueries({ queryKey: [...] })
const queryClient = useQueryClient();
// After successful upload:
queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
```

### Anti-Patterns to Avoid

- **Don't extend `/api/sources`:** That route computes gaps only within the earliest–latest date range per source. It does not guarantee 12 fixed months. A new endpoint is needed.
- **Don't reuse `useBatchUpload` hook:** That hook manages a multi-file queue with localStorage persistence, hash checking, and processing steps. The wizard only needs a single-file direct upload. Use a simpler local state + `fetch("/api/batch/upload")` pattern.
- **Don't compute the 12-month grid on the client:** Date arithmetic for month ranges should live in the API route where it can be tested in isolation. The component should receive ready-to-render cell data.
- **Don't reuse the gap data from `SourceCoverage.gaps`:** The `gaps` array in `/api/sources` only lists months within the earliest–latest range. For the coverage grid, every month in the last 12 is a cell — including months before the earliest statement.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-drop zone in wizard | Custom HTML5 drag events | `react-dropzone` (already in codebase) | Already handles drag states, file type filtering, size limits, accessibility |
| Tooltip on cell hover | Custom tooltip div with useState | shadcn `Tooltip` from `@/components/ui/tooltip` | Already in codebase, handles positioning, keyboard accessibility |
| Toast on upload success | Custom notification component | `sonner` toast (already used throughout) | Consistent with all other success notifications in app |
| Month arithmetic | Manual date math | `date-fns` `subMonths`, `format`, `parseISO`, `startOfMonth` | Already installed, proven correct for DST edge cases |
| Modal container | Custom overlay div | shadcn `Dialog` | Already in codebase, handles focus trap, escape key, portal rendering |

---

## Common Pitfalls

### Pitfall 1: Month Range Off-By-One

**What goes wrong:** "Last 12 months" is ambiguous — does it include the current month or start from last month?
**Why it happens:** `subMonths(now, 12)` gives 13 cells if you include the current month.
**How to avoid:** Define the range as: months[0] = `startOfMonth(subMonths(now, 11))`, months[11] = `startOfMonth(now)`. This gives exactly 12 months inclusive of current.
**Warning signs:** Grid shows 13 columns or current month is missing.

### Pitfall 2: Multiple Statements per Source×Month

**What goes wrong:** A user may have uploaded two statements from the same source in the same month (e.g., two partial statements). The cell must handle this gracefully.
**Why it happens:** The schema has no unique constraint on (userId, sourceType, statementDate). Multiple statements can share a source and month.
**How to avoid:** When the API detects multiple statements for a cell, prefer the one with `pdfStoragePath IS NOT NULL` for the state. For the wizard, clicking a yellow cell with multiple data-only statements should still open the wizard (any one attach would satisfy the "data, no PDF" state — attach to first statement found).
**Warning signs:** Cell color logic uses the first statement found and may show "data" when one of several statements actually has a PDF.

### Pitfall 3: Stale Grid After Upload

**What goes wrong:** User uploads a PDF in the wizard, it succeeds, modal closes, but grid still shows gray/yellow cell.
**Why it happens:** TanStack Query cache is not invalidated after the upload mutation.
**How to avoid:** In the wizard's success handler, call `queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] })`. This triggers a refetch of the coverage endpoint and the grid re-renders with the new state.
**Warning signs:** Cell stays gray/yellow immediately after a successful upload.

### Pitfall 4: Cell Click Target Too Small on Mobile

**What goes wrong:** GitHub-style compact cells are hard to tap on mobile.
**Why it happens:** Cells designed for desktop mouse precision fail on touch.
**How to avoid:** Minimum touch target of 28×28px per cell, enforced by `min-w-7 min-h-7` classes. On very small screens (< sm), consider limiting to 6 months instead of 12 to keep cells adequately sized.
**Warning signs:** User reports difficulty tapping cells on phone.

### Pitfall 5: `/api/batch/upload` Requires `processingStatus: "pending"` Then Full Process Pipeline

**What goes wrong:** Calling `/api/batch/upload` in the wizard creates a statement record in "pending" status. Without calling `/api/batch/process`, the statement record exists but transactions are never extracted.
**Why it happens:** The upload endpoint only stores the file and creates the DB record; processing is a separate step.
**How to avoid:** For the historical PDF attachment wizard, the upload intent is different: the user is attaching a PDF to a *month where data already exists* (yellow cell) or adding a PDF for an entirely new month (gray cell). For gray cells, the full process pipeline makes sense. For yellow cells (attaching to existing data), the user only wants PDF storage — they don't want duplicate transaction extraction.
**Resolution:** The wizard for both cell types calls `/api/batch/upload` + `/api/batch/process` for new statements (gray cells). For yellow cells (attach mode), the wizard needs a lighter endpoint — or a flag on `/api/batch/upload` that skips processing. Research finding: **the simplest approach is a dedicated `/api/vault/attach-pdf` endpoint** that accepts `file`, `statementId`, uploads to storage, and updates `pdfStoragePath` on an existing statement, skipping all transaction extraction. This is Claude's discretion per CONTEXT.md.
**Warning signs:** Duplicate transactions appear for yellow-cell uploads.

### Pitfall 6: Coverage API Performance with Many Sources

**What goes wrong:** For a user with 10+ sources × 12 months = 120 cells, querying each cell individually creates N+1 queries.
**Why it happens:** Naively fetching statements per source per month produces many queries.
**How to avoid:** Use a single query: `WHERE userId = ? AND statementDate >= ? AND statementDate <= ?` to fetch all statements in the 12-month window for all sources, then compute the grid in application code. Follow the existing `inArray` pattern from `timeline/route.ts`.
**Warning signs:** Slow coverage tab load; many database queries logged.

---

## Code Examples

### Coverage API: Single Query + Grid Assembly

```typescript
// Source: pattern from src/app/api/vault/timeline/route.ts
// GET /api/vault/coverage

import { startOfMonth, subMonths, format } from "date-fns";
import { gte, and, eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  // Last 12 months: from 11 months ago (start of month) through current month (end)
  const windowStart = startOfMonth(subMonths(now, 11));

  // Single query: all statements in the 12-month window
  const windowStatements = await db
    .select({
      id: statements.id,
      sourceType: statements.sourceType,
      statementDate: statements.statementDate,
      transactionCount: statements.transactionCount,
      pdfStoragePath: statements.pdfStoragePath,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        gte(statements.statementDate, windowStart)
      )
    );

  // Also get all distinct sources (may have sources outside the window)
  const allSources = await db
    .selectDistinct({ sourceType: statements.sourceType })
    .from(statements)
    .where(eq(statements.userId, userId));

  // Build 12-month array
  const months = Array.from({ length: 12 }, (_, i) =>
    format(startOfMonth(subMonths(now, 11 - i)), "yyyy-MM")
  );

  // Group windowStatements by sourceType+month
  const cellMap = new Map<string, typeof windowStatements[number][]>();
  for (const stmt of windowStatements) {
    if (!stmt.statementDate) continue;
    const key = `${stmt.sourceType}::${format(stmt.statementDate, "yyyy-MM")}`;
    const existing = cellMap.get(key) ?? [];
    existing.push(stmt);
    cellMap.set(key, existing);
  }

  // Assemble grid
  const sources = allSources.map(({ sourceType }) => {
    const cells = months.map(month => {
      const stmts = cellMap.get(`${sourceType}::${month}`) ?? [];
      if (stmts.length === 0) {
        return { month, state: "missing" as const, statementId: null, transactionCount: 0, statementDate: null };
      }
      // Prefer statement with PDF
      const withPdf = stmts.find(s => s.pdfStoragePath !== null);
      const chosen = withPdf ?? stmts[0];
      return {
        month,
        state: withPdf ? "pdf" as const : "data" as const,
        statementId: chosen.id,
        transactionCount: chosen.transactionCount ?? 0,
        statementDate: chosen.statementDate instanceof Date ? chosen.statementDate.toISOString() : chosen.statementDate ?? null,
      };
    });
    return { sourceType, cells };
  });

  const gapCount = sources.reduce(
    (sum, src) => sum + src.cells.filter(c => c.state === "missing").length,
    0
  );

  return NextResponse.json({ sources, gapCount, months });
}
```

### Attach PDF Endpoint (Yellow Cell Upload)

```typescript
// Source: pattern from src/app/api/batch/upload/route.ts
// POST /api/vault/attach-pdf
// Body: FormData { file, statementId }
// Purpose: Upload PDF and update pdfStoragePath on an existing statement record
// Does NOT run transaction extraction

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const statementId = formData.get("statementId") as string | null;

  // Verify statement ownership
  const statement = await db.query.statements.findFirst({
    where: and(eq(statements.id, statementId!), eq(statements.userId, session.user.id)),
    columns: { id: true, pdfStoragePath: true, sourceType: true },
  });
  if (!statement) return NextResponse.json({ error: "Statement not found" }, { status: 404 });

  // Upload to Supabase Storage (reuse existing function)
  const storageResult = await uploadStatementPdf(file!, session.user.id, statement.sourceType);
  if (!storageResult) return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });

  // Update the existing statement record
  await db.update(statements).set({ pdfStoragePath: storageResult.path }).where(eq(statements.id, statement.id));

  return NextResponse.json({ success: true, pdfStored: true });
}
```

### Historical Upload Modal (Simplified vs BatchUploader)

```tsx
// Source: pattern from src/components/batch/batch-uploader.tsx + pdf-viewer-modal.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoricalUploadModalProps {
  open: boolean;
  onClose: () => void;
  sourceType: string;
  targetMonth: string; // "2026-02"
  mode: "missing" | "attach"; // missing = new statement, attach = add PDF to existing
  statementId?: string; // present when mode === "attach"
}

export function HistoricalUploadModal({
  open, onClose, sourceType, targetMonth, mode, statementId,
}: HistoricalUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const onDrop = useCallback((accepted: File[]) => {
    setFile(accepted[0] ?? null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceType", sourceType);

      if (mode === "attach" && statementId) {
        formData.append("statementId", statementId);
        const res = await fetch("/api/vault/attach-pdf", { method: "POST", body: formData });
        if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      } else {
        // Full import pipeline for new statements
        const { hashFile } = await import("@/lib/utils/file-hash");
        const hash = await hashFile(file);
        formData.append("hash", hash);
        const res = await fetch("/api/batch/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
        // Note: /api/batch/process would run separately if transaction extraction desired
      }

      // Invalidate coverage so grid updates
      queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
      toast.success("PDF stored successfully");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "attach" ? "Attach PDF" : "Upload Statement"} — {sourceType}
          </DialogTitle>
        </DialogHeader>
        {/* ... dropzone, submit button, error display */}
      </DialogContent>
    </Dialog>
  );
}
```

### Coverage Tab Integration in vault-page.tsx

```tsx
// Source: src/components/vault/vault-page.tsx
// Extend the tab guard to include "coverage"

useEffect(() => {
  const saved = localStorage.getItem(VAULT_VIEW_KEY);
  if (saved === "file-cabinet" || saved === "timeline" || saved === "coverage") {
    setActiveTab(saved);
  }
}, []);

// Add third tab trigger + content
<TabsTrigger value="coverage">
  <BarChart3 className="size-4 mr-1.5" />
  Coverage
</TabsTrigger>
<TabsContent value="coverage">
  <CoverageView />
</TabsContent>
```

### Coverage Summary Header

```tsx
// Source: pattern from src/components/vault/vault-stats-bar.tsx
// Shown at top of CoverageView when gapCount > 0

{gapCount > 0 && (
  <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 px-4 py-2 mb-4">
    <p className="text-sm text-amber-800 dark:text-amber-200">
      <span className="font-medium">{gapCount}</span>{" "}
      {gapCount === 1 ? "month is" : "months are"} missing PDFs
    </p>
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `/api/sources` gaps array (within date range only) | New `/api/vault/coverage` endpoint (fixed 12-month window) | Consistent grid: always shows 12 months even for sources with no recent statements |
| BatchUploader (multi-file queue, full process pipeline) | HistoricalUploadModal (single file, direct attach or new import) | Lower friction for targeted gap fill |
| Timeline grid (all sources merged, month columns clickable) | Coverage grid (per-source rows, month columns, 3 cell states) | Actionable: user sees exactly which source×month has a gap |

**Existing `SourceCoverage.gaps` field note:** The `gaps` array on the `/api/sources` response is already populated but only covers gaps within the earliest–latest statement range. It is not suitable for the 12-month fixed-window grid. Do not repurpose it for Phase 34 — use the new `/api/vault/coverage` endpoint instead.

---

## Open Questions

1. **Gray cell upload: process transactions or storage only?**
   - What we know: Gray cell = no data at all. User is uploading a new statement for a month where no record exists. The batch upload flow normally does: upload → process (extract transactions).
   - What's unclear: Should a historical gap fill also trigger transaction extraction (creating new rows to review), or is the vault intent purely archival storage?
   - Recommendation: Run the full pipeline (upload + process) for gray cells — consistent with how all statement imports work, and users get the transactions for review. The wizard should call `/api/batch/upload` then `/api/batch/process` for gray cells. For yellow cells (attach mode), call `/api/vault/attach-pdf` only.

2. **Yellow cell: which statement gets the PDF attached?**
   - What we know: A source+month may have multiple statements (rare but possible). Yellow cell means at least one statement exists but none has a PDF.
   - What's unclear: If multiple data-only statements exist for a cell, which one gets the PDF attached?
   - Recommendation: Attach to the most recent statement for that source+month (order by `createdAt DESC LIMIT 1`). Surface this choice to the user only if the count is > 1 (edge case: show a note "attaching to statement from [date]").

3. **Tooltip implementation: shadcn Tooltip or custom hover div?**
   - What we know: shadcn `Tooltip` is in the codebase (confirmed via shadcn component list). It handles keyboard accessibility and positioning automatically.
   - What's unclear: At Claude's discretion per CONTEXT.md.
   - Recommendation: Use shadcn `TooltipProvider` + `Tooltip` + `TooltipContent`. Wrap the entire `CoverageGrid` in a single `TooltipProvider` (not one per cell — that's expensive).

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

| File | What Was Verified |
|------|------------------|
| `src/components/vault/vault-page.tsx` | Tab structure, localStorage pattern, existing tab values |
| `src/components/vault/timeline-grid.tsx` | CSS Grid approach for month cells, date-fns usage |
| `src/components/vault/timeline-view.tsx` | PdfViewerModal integration pattern |
| `src/components/vault/vault-stats-bar.tsx` | Summary header pattern |
| `src/components/vault/vault-empty-state.tsx` | Empty state to reuse when no sources |
| `src/components/batch/batch-uploader.tsx` | react-dropzone usage, single-step upload approach |
| `src/lib/hooks/use-batch-upload.ts` | Full upload pipeline (hash → check → upload → process) |
| `src/lib/hooks/use-vault-timeline.ts` | TanStack Query hook pattern for vault |
| `src/lib/hooks/use-sources.ts` | Query key pattern, staleTime convention |
| `src/lib/storage/pdf-storage.ts` | `uploadStatementPdf`, `generatePdfSignedUrl` functions |
| `src/app/api/vault/timeline/route.ts` | inArray tx stats pattern, hasPdf derivation |
| `src/app/api/sources/route.ts` | Gap calculation, sourceType grouping, date-fns usage |
| `src/app/api/batch/upload/route.ts` | Upload endpoint contract: file, hash, sourceType fields |
| `src/app/api/statements/[id]/pdf-url/route.ts` | Signed URL generation, ownership check pattern |
| `src/lib/db/schema.ts` | `statements` table columns: sourceType, statementDate, pdfStoragePath, transactionCount |
| `src/types/source.ts` | Existing type definitions |
| `.planning/phases/33-vault-ui/33-VERIFICATION.md` | Confirmed Phase 33 deliverables, localStorage fix |

### No External Sources Required

All findings come from direct inspection of the existing codebase. No library documentation lookups were needed because all libraries are already in use and their APIs are visible in existing code.

---

## Metadata

**Confidence breakdown:**
- Coverage API endpoint design: HIGH — schema columns confirmed, query pattern directly lifted from timeline route
- Grid component structure: HIGH — CSS Grid pattern already proven in `timeline-grid.tsx`
- Upload wizard: HIGH — `react-dropzone` usage pattern confirmed in `batch-uploader.tsx`; Dialog pattern confirmed in `pdf-viewer-modal.tsx`
- Attach-PDF endpoint need: HIGH — confirmed by tracing yellow-cell flow to understand that running full processing pipeline would duplicate transactions
- Month arithmetic: HIGH — `date-fns` functions already in use in codebase
- Query invalidation: HIGH — pattern used in `use-batch-upload.ts`

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable stack, no external dependencies)
