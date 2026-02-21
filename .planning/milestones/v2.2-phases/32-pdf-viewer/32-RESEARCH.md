# Phase 32: PDF Viewer - Research

**Researched:** 2026-02-19
**Domain:** react-pdf (wojtekmaj), Next.js dynamic import, Supabase signed URLs, shadcn Dialog
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIEW-01 | User can view an uploaded PDF in-app via a modal viewer with page navigation | react-pdf v10 `Document` + `Page` components inside shadcn `Dialog`; `dynamic(..., { ssr: false })` two-file split; prev/next buttons with `pageNumber` state |
| VIEW-02 | User can download the original PDF file from the viewer | `<a href={signedUrl} download={filename}>` rendered inside the modal; signed URL fetched on modal open from existing `/api/statements/[id]/pdf-url` endpoint |
</phase_requirements>

---

## Summary

Phase 32 adds a modal PDF viewer that opens when the user clicks the `PdfStatusIcon` on any statement with a stored file. The icon is already rendered in `statement-list.tsx` and `statement-detail.tsx` — Phase 31 explicitly deferred `onClick` to Phase 32.

The technical core is **react-pdf v10** (wojtekmaj), which wraps PDF.js. It requires a specific two-file split in Next.js App Router: the inner component that contains `<Document>` and the worker config lives in one file; a second file exports `dynamic(import('./inner'), { ssr: false })`. The prior decisions already encode this exact requirement. The signed URL infrastructure (endpoint, helper, supabaseAdmin) is fully built in Phase 31 and ready to use.

The modal flow is: user clicks icon → component calls `GET /api/statements/[id]/pdf-url` → receives signed URL → passes URL to `<Document file={url}>` → renders pages. Page navigation uses `useState(1)` / `numPages` from `onLoadSuccess`. The "Download" button is an `<a>` tag with `download` attribute pointing at the same signed URL — browsers handle the save dialog natively. Error fallback shows a download link when `onLoadError` fires.

**Primary recommendation:** Install `react-pdf@^10.3.0`, create `PdfViewerInner` (with `Document` + worker config) and `PdfViewerModal` (with `dynamic` import + shadcn Dialog), wire the `PdfStatusIcon` onClick in both `statement-list.tsx` and `statement-detail.tsx`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-pdf` | 10.3.0 | PDF rendering via PDF.js | The canonical React PDF viewer; wojtekmaj's library, not diegomura's renderer. Supports React 19. v10 no longer requires Next.js config changes. |
| shadcn/ui Dialog | already installed (`@radix-ui/react-dialog`) | Modal container | Already used in project for all dialog/modal UX |
| next/dynamic | built into Next.js 16 | SSR-disable wrapper | Required — react-pdf uses canvas and browser APIs not available in SSR |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | already installed | ChevronLeft, ChevronRight, Download, X icons | Navigation and download controls inside viewer |
| TanStack Query | already installed | Fetch signed URL on modal open | `useQuery` with `enabled: !!open` pattern — lazy fetch |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-pdf (wojtekmaj) | native `<iframe src={signedUrl}>` | iframe is simpler but gives no page navigation, no custom UI, no error handling. react-pdf is the prior-decision requirement. |
| react-pdf (wojtekmaj) | `@pdf-viewer/react` | Commercial license; unnecessary vendor. |
| react-pdf (wojtekmaj) | pdf.js directly | Much more setup; react-pdf wraps it cleanly. |
| TanStack Query for URL fetch | fetch in useEffect | Query gives loading/error states and deduplication automatically. |

**Installation:**
```bash
npm install react-pdf@^10.3.0
```

`react-pdf` bundles its own `pdfjs-dist` (currently 5.4.296). Do **not** install `pdfjs-dist` separately — version mismatch causes "API version does not match Worker version" error.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── statements/
│       ├── pdf-viewer-inner.tsx     # "use client" — Document, Page, worker config
│       └── pdf-viewer-modal.tsx     # dynamic(pdf-viewer-inner, {ssr:false}) + Dialog shell
├── lib/
│   └── hooks/
│       └── use-pdf-url.ts           # TanStack Query for /api/statements/[id]/pdf-url
```

Existing files that gain onClick wiring:
- `src/components/sources/statement-list.tsx` — PdfStatusIcon gets onClick → opens modal
- `src/components/sources/statement-detail.tsx` — PdfStatusIcon gets onClick → opens modal

### Pattern 1: Two-File Split (Prior Decision — Mandatory)

**What:** The component that imports from `react-pdf` and configures the worker lives in `pdf-viewer-inner.tsx`. A second file dynamically imports it with `ssr: false`. The worker config MUST be in the same file as `<Document>`.

**Why mandatory:** react-pdf uses `canvas` and PDF.js workers, which are browser-only APIs. Next.js App Router SSR would fail without this split.

**pdf-viewer-inner.tsx:**
```typescript
// Source: wojtekmaj/react-pdf README (v9.x branch) + v10 upgrade guide
"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// CRITICAL: Worker config in same file as <Document>
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfViewerInnerProps {
  url: string;
  filename: string;
  onError?: () => void;
}

export function PdfViewerInner({ url, filename, onError }: PdfViewerInnerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPageNumber(1);
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onError}
        loading={<div className="py-8 text-muted-foreground text-sm">Loading PDF...</div>}
      >
        <Page
          pageNumber={pageNumber}
          width={Math.min(typeof window !== "undefined" ? window.innerWidth * 0.8 : 600, 800)}
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </Document>

      {/* Navigation controls */}
      {numPages > 1 && (
        <div className="flex items-center gap-4">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {pageNumber} of {numPages}
          </span>
          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}

      {/* Download button */}
      <a href={url} download={filename} className="...">
        Download PDF
      </a>
    </div>
  );
}
```

**pdf-viewer-modal.tsx:**
```typescript
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePdfUrl } from "@/lib/hooks/use-pdf-url";

// Dynamic import — SSR disabled — the only way react-pdf works in Next.js App Router
const PdfViewerInner = dynamic(
  () => import("./pdf-viewer-inner").then((m) => ({ default: m.PdfViewerInner })),
  {
    ssr: false,
    loading: () => (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading viewer...
      </div>
    ),
  }
);

interface PdfViewerModalProps {
  statementId: string;
  filename: string;
  open: boolean;
  onClose: () => void;
}

export function PdfViewerModal({
  statementId,
  filename,
  open,
  onClose,
}: PdfViewerModalProps) {
  const [renderError, setRenderError] = useState(false);

  // Lazy fetch — only runs when modal is open
  const { data, isLoading, error } = usePdfUrl(statementId, open);
  const signedUrl = data?.url;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{filename}</DialogTitle>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Preparing PDF...
          </div>
        )}

        {/* Error fetching URL */}
        {(error || !signedUrl) && !isLoading && (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Could not load PDF for viewing.
            </p>
          </div>
        )}

        {/* Render error fallback — shows download link instead of blank screen */}
        {signedUrl && renderError && (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              PDF could not be rendered.
            </p>
            <a href={signedUrl} download={filename}>
              Download PDF instead
            </a>
          </div>
        )}

        {/* Main viewer */}
        {signedUrl && !renderError && (
          <PdfViewerInner
            url={signedUrl}
            filename={filename}
            onError={() => setRenderError(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 2: Lazy Signed URL Fetch with TanStack Query

**What:** Fetch the signed URL only when the modal opens. `enabled: open` prevents pre-fetching stale URLs.

**When to use:** Every time the viewer modal opens, not proactively in the list.

```typescript
// src/lib/hooks/use-pdf-url.ts
"use client";

import { useQuery } from "@tanstack/react-query";

export const pdfUrlKeys = {
  url: (id: string) => ["pdf-url", id] as const,
};

export function usePdfUrl(statementId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: pdfUrlKeys.url(statementId ?? ""),
    queryFn: async () => {
      const response = await fetch(`/api/statements/${statementId}/pdf-url`);
      if (!response.ok) throw new Error("Failed to fetch PDF URL");
      return response.json() as Promise<{ url: string }>;
    },
    enabled: !!statementId && enabled,
    staleTime: 55 * 60 * 1000, // 55 min — slightly less than 1-hour signed URL expiry
    gcTime: 60 * 60 * 1000,    // Keep for 1 hour in cache
    retry: 1,
  });
}
```

### Pattern 3: PdfStatusIcon onClick Wiring

**What:** The existing `PdfStatusIcon` component in both list and detail views gains an `onClick` handler when `hasPdf` is true. Only the "green" state is clickable.

**statement-list.tsx change:**
```typescript
// Statement row gains local state for modal
function StatementRow({ statement }: StatementRowProps) {
  const [pdfOpen, setPdfOpen] = useState(false);
  // ... existing code

  return (
    <>
      <div className="flex items-center ...">
        <div className="mt-0.5">
          <button
            onClick={() => statement.hasPdf && setPdfOpen(true)}
            disabled={!statement.hasPdf}
            aria-label={statement.hasPdf ? "View PDF" : "No PDF stored"}
            className={cn(
              "rounded focus-visible:outline-none focus-visible:ring-2",
              !statement.hasPdf && "cursor-default"
            )}
          >
            <PdfStatusIcon hasPdf={statement.hasPdf} />
          </button>
        </div>
        {/* ... rest of row */}
      </div>

      {statement.hasPdf && (
        <PdfViewerModal
          statementId={statement.id}
          filename={statement.originalFilename}
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
        />
      )}
    </>
  );
}
```

**statement-detail.tsx change:**
```typescript
// StatementDetail gains local state for modal
const [pdfOpen, setPdfOpen] = useState(false);

// In the header section — replace static PdfStatusIcon with button:
<button
  onClick={() => statement.hasPdf && setPdfOpen(true)}
  disabled={!statement.hasPdf}
  aria-label={statement.hasPdf ? "View PDF" : "No PDF stored"}
>
  <PdfStatusIcon hasPdf={statement.hasPdf ?? false} />
</button>

// Add modal at end of JSX:
{statement.hasPdf && (
  <PdfViewerModal
    statementId={statementId}
    filename={statement.originalFilename}
    open={pdfOpen}
    onClose={() => setPdfOpen(false)}
  />
)}
```

### Pattern 4: Download Button (VIEW-02)

**What:** An anchor tag with `download` attribute. When the user clicks, the browser saves the file natively using the original filename. No JS needed beyond rendering the `<a>` tag.

**When to use:** Always shown when a signed URL is available — both in the viewer and as the error fallback.

```typescript
// Inside PdfViewerInner or PdfViewerModal
<a
  href={signedUrl}
  download={filename}
  className="inline-flex items-center gap-2 text-sm font-medium ..."
>
  <Download className="h-4 w-4" />
  Download PDF
</a>
```

**Note:** The `download` attribute uses the signed URL domain (Supabase CDN). For cross-origin URLs (different domain from the app), the browser may open the file instead of downloading, depending on the `Content-Disposition` header from Supabase. Supabase Storage CDN URLs do NOT set `Content-Disposition: attachment` by default — the `download` attribute on cross-origin links may be ignored by some browsers.

**Resolution:** If browser ignores `download` attribute (cross-origin CDN), fetch the blob server-side and serve via a proxy download endpoint, or use Supabase's `download` option on the signed URL.

The safe implementation for cross-origin download:
```typescript
// Option A: Supabase signed URL with download=true query param
// This is available via the Supabase SDK download option
const { data } = await supabaseAdmin.storage
  .from("statements")
  .createSignedUrl(path, 3600, { download: filename });
// This sets Content-Disposition: attachment; filename=... in Supabase response
```

This means the `/api/statements/[id]/pdf-url` endpoint needs a `?download=true` query option OR a separate endpoint for download.

**Simpler approach (recommended for Phase 32):** Generate two signed URLs — one for viewing (no download header), one for download (with `download` option). OR expose a `download` query param on the existing endpoint.

### Pattern 5: Error Fallback (Success Criteria #4)

**What:** `onLoadError` prop on `<Document>` sets `renderError = true` state, replacing the viewer with a download link.

**Why needed:** Some PDFs fail to render (corrupted, unsupported encoding, very large). A blank screen is worse than a fallback.

```typescript
<Document
  file={url}
  onLoadSuccess={...}
  onLoadError={() => setRenderError(true)}
>
  <Page pageNumber={pageNumber} />
</Document>
```

```typescript
// Fallback UI when renderError is true
{renderError && (
  <div className="flex flex-col items-center gap-4 py-8">
    <p className="text-sm text-muted-foreground">
      This PDF could not be rendered in-app.
    </p>
    <a href={signedUrl} download={filename}>
      Download PDF
    </a>
  </div>
)}
```

### Anti-Patterns to Avoid

- **Worker config in a separate file:** The worker config line `pdfjs.GlobalWorkerOptions.workerSrc = ...` MUST be in the same file as `<Document>`. A separate `pdf-worker.ts` file will be overwritten by module initialization order. This is the #1 source of "Setting up fake worker" warnings.
- **No SSR: false:** Importing react-pdf in a server component or without `dynamic(_, { ssr: false })` crashes with canvas/window errors at build time.
- **Installing pdfjs-dist separately:** Installing `pdfjs-dist` as a direct dependency risks version mismatch with what react-pdf bundles. Causes "API version does not match Worker version."
- **Pre-fetching signed URL in list query:** Signed URLs expire after 1 hour; list queries cache. A stale URL in cache causes 403 on viewer open. Use `enabled: open` to fetch only when modal is open.
- **Opening modal without hasPdf check:** Avoid even rendering the modal trigger when `hasPdf` is false — prevents unnecessary API calls to the pdf-url endpoint for statements with no PDF.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF rendering | Custom canvas + PDF.js integration | `react-pdf` Document/Page | PDF.js has 200+ edge cases: text layer, annotation layer, CJK characters, font embedding. react-pdf handles all of this. |
| Modal container | Custom overlay/portal | shadcn Dialog | Already installed, accessible, consistent with project UI |
| Download trigger | JS Blob + createObjectURL | `<a download>` or Supabase signed URL with download option | Browser-native; no JS needed for standard downloads |
| Page navigation | Custom scroll virtualization | Simple state counter with prev/next buttons | PDFs are not long-scroll — page-by-page is the standard UX |
| Signed URL generation | New URL logic | Existing `/api/statements/[id]/pdf-url` endpoint | Already built in Phase 31; just call it |

**Key insight:** react-pdf is a well-maintained wrapper around PDF.js that handles worker lifecycle, canvas sizing, text layer, and annotation layer. The project only needs to handle the modal shell and URL fetching.

---

## Common Pitfalls

### Pitfall 1: "Setting up fake worker" / PDF renders blank
**What goes wrong:** PDF loads without errors but renders as blank white page. Console shows "Setting up fake worker" warning.
**Why it happens:** Worker config is not in the same module as `<Document>`. Either it's in a separate file (wrong) or the module import order causes the default worker to win over the custom one.
**How to avoid:** Keep `pdfjs.GlobalWorkerOptions.workerSrc = new URL(...)` as a module-level top-level statement in `pdf-viewer-inner.tsx`, in the same file as `<Document>`. Never move it elsewhere.
**Warning signs:** Console warns "Setting up fake worker." PDF thumbnail may appear in loading state indefinitely.

### Pitfall 2: SSR Build Failure
**What goes wrong:** `TypeError: Cannot read properties of undefined (reading 'canvas')` or `ReferenceError: window is not defined` during `next build`.
**Why it happens:** react-pdf (or pdfjs-dist) imports code that references browser globals. When Next.js SSR processes the module tree, it encounters these references.
**How to avoid:** The outer wrapper file must use `dynamic(import('./pdf-viewer-inner'), { ssr: false })`. Never import from `react-pdf` directly in a Server Component or a file that is not wrapped in `dynamic`.
**Warning signs:** Build fails with canvas or window reference errors; or the app crashes on first load with hydration mismatch.

### Pitfall 3: Cross-Origin Download Attribute Ignored
**What goes wrong:** User clicks "Download PDF" button. Browser opens PDF in new tab instead of downloading.
**Why it happens:** The `download` attribute on `<a>` is ignored by browsers for cross-origin URLs (Supabase CDN is a different domain). This is a browser security restriction, not a code bug.
**How to avoid:** Use the Supabase Storage `download` option when creating the signed URL, which adds `Content-Disposition: attachment` response header. Alternatively, extend the `GET /api/statements/[id]/pdf-url` endpoint to accept `?download=1` query and call `createSignedUrl(path, 3600, { download: filename })`.
**Warning signs:** Download button opens PDF in new tab; user must use browser "Save As" manually.

### Pitfall 4: Page Width Causes Horizontal Overflow
**What goes wrong:** PDF renders at full A4/Letter width (595pt), overflowing the modal on narrow screens.
**Why it happens:** react-pdf's `<Page>` renders at the PDF's native width by default (typically 595px for A4 at 72dpi).
**How to avoid:** Pass an explicit `width` prop to `<Page>`. Compute it from the dialog container width or use a responsive cap like `Math.min(window.innerWidth * 0.8, 800)`. The outer Dialog's `max-w-4xl` provides the upper constraint.
**Warning signs:** PDF clips or causes horizontal scroll in the modal.

### Pitfall 5: Dialog Content Height on Long PDFs
**What goes wrong:** Modal does not scroll; page content is cut off at the bottom of the viewport.
**Why it happens:** shadcn `DialogContent` defaults use `fixed top-[50%] translate-y-[-50%]` positioning. Without explicit overflow and height constraints, the content clips.
**How to avoid:** Add `overflow-y-auto` and `max-h-[90vh]` to `DialogContent`. Ensure the inner scroll area wraps the `<Document>` + navigation + download controls.
**Warning signs:** Only partial page visible; no scrollbar in modal.

### Pitfall 6: Signed URL Stale in TanStack Query Cache
**What goes wrong:** User opens modal for statement A, closes it, opens it 2 hours later — gets 403 from expired URL.
**Why it happens:** TanStack Query caches the previous response. If `staleTime` is too long or the cache is not invalidated, the old signed URL is used.
**How to avoid:** Set `staleTime: 55 * 60 * 1000` (55 minutes — just under the 1-hour signed URL expiry). Also set `gcTime: 60 * 60 * 1000`. This means re-opens within 55 minutes use the cache; re-opens after 55 minutes refetch. Alternatively, invalidate the specific query key on modal close.
**Warning signs:** 403 errors in console when viewer attempts to load PDF; blank viewer with no error message.

### Pitfall 7: `import.meta.url` Not Available
**What goes wrong:** `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` throws at runtime.
**Why it happens:** Some bundler or older Next.js configurations don't support `import.meta.url` in client code. With react-pdf v9.2+ (which eliminates Next.js config changes), this should work without Turbopack issues.
**How to avoid:** If `import.meta.url` is unavailable, fall back to CDN worker URL:
```typescript
pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```
**Warning signs:** Build-time error about `import.meta.url` not being a function; or runtime URL parsing error.

---

## Code Examples

Verified patterns from official sources:

### Worker Configuration (source: wojtekmaj/react-pdf v9.x README)
```typescript
// Must be in same file as <Document>
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
```

### Document and Page Basic Usage (source: wojtekmaj/react-pdf README)
```typescript
import { useState } from "react";
import { Document, Page } from "react-pdf";

function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  return (
    <div>
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={console.error}
      >
        <Page pageNumber={pageNumber} />
      </Document>
      <p>Page {pageNumber} of {numPages}</p>
      <button onClick={() => setPageNumber(p => p - 1)} disabled={pageNumber <= 1}>
        Previous
      </button>
      <button onClick={() => setPageNumber(p => p + 1)} disabled={pageNumber >= numPages}>
        Next
      </button>
    </div>
  );
}
```

### SSR-Safe Dynamic Import (source: wojtekmaj/react-pdf Next.js docs)
```typescript
// Outer wrapper — this file can be imported by Server Components safely
import dynamic from "next/dynamic";

const PdfViewerInner = dynamic(
  () => import("./pdf-viewer-inner").then((m) => ({ default: m.PdfViewerInner })),
  { ssr: false }
);
```

### Stylesheet Imports (source: wojtekmaj/react-pdf v10 upgrade guide)
```typescript
// v10 import paths — no longer /dist/esm/ or /dist/cjs/
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
```

### usePdfUrl Hook (TanStack Query, lazy)
```typescript
import { useQuery } from "@tanstack/react-query";

export function usePdfUrl(statementId: string | undefined, open: boolean) {
  return useQuery({
    queryKey: ["pdf-url", statementId ?? ""],
    queryFn: async () => {
      const res = await fetch(`/api/statements/${statementId}/pdf-url`);
      if (!res.ok) throw new Error("Failed to get PDF URL");
      return res.json() as Promise<{ url: string }>;
    },
    enabled: !!statementId && open,
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Needed `canvas: false` webpack alias in `next.config.js` | No Next.js config changes needed | react-pdf v9.2.0 | Cleaner setup; no custom webpack config required |
| Worker in separate file | Worker config must be in same file as `<Document>` | Ongoing (enforced since v8) | Prevents "fake worker" blank renders |
| `/dist/esm/` and `/dist/cjs/` import paths | `/dist/` only | react-pdf v10.0.0 (ESM-only) | Simpler imports; Jest must migrate to Vitest (already done in this project) |
| `pdfjs-dist` as separate dependency | Bundled in react-pdf | Since v9 | Do not install `pdfjs-dist` separately |
| `swcMinify: false` in next.config | No longer needed | Next.js v15.0.0-canary.53 | This project uses Next.js 16 — no swcMinify config needed |

**Deprecated/outdated:**
- **`next.config.js` canvas alias:** `config.resolve.alias.canvas = false` — no longer needed as of react-pdf v9.2.0. Do NOT add this.
- **`swcMinify: false`:** Not needed in Next.js 15+ (project is on 16).
- **Separate pdfjs-dist install:** Always rely on the version bundled with react-pdf to avoid version mismatch errors.

---

## Current Codebase Touchpoints

Based on Phase 31 implementation inspection:

### Files Created (New)
| File | Purpose |
|------|---------|
| `src/components/statements/pdf-viewer-inner.tsx` | Inner viewer: Document + Page + worker config + navigation + download |
| `src/components/statements/pdf-viewer-modal.tsx` | Outer modal: dynamic import wrapper + Dialog shell + error handling |
| `src/lib/hooks/use-pdf-url.ts` | TanStack Query hook for lazy signed URL fetch |

### Files Modified (Existing)
| File | What Changes |
|------|-------------|
| `src/components/sources/statement-list.tsx` | `StatementRow`: wrap `PdfStatusIcon` in `<button>`, add `PdfViewerModal` render, add `pdfOpen` state |
| `src/components/sources/statement-detail.tsx` | Wrap `PdfStatusIcon` in `<button>`, add `PdfViewerModal` render, add `pdfOpen` state |

### Files Unchanged (Phase 31 infrastructure — already complete)
| File | Status |
|------|--------|
| `src/app/api/statements/[id]/pdf-url/route.ts` | Complete — returns `{ url: signedUrl }` |
| `src/lib/storage/pdf-storage.ts` | Complete — `generatePdfSignedUrl()` helper |
| `src/lib/supabase/server.ts` | Complete — `supabaseAdmin` client |
| `src/types/source.ts` | Complete — `hasPdf: boolean` on `StatementSummary` |
| `src/lib/hooks/use-statement.ts` | Complete — `hasPdf: boolean` on statement info |

### No Schema Changes Needed
Phase 31 already stores `pdfStoragePath` and the API already exposes `hasPdf`. Phase 32 is purely frontend.

### No next.config.ts Changes Needed
As of react-pdf v9.2.0, no webpack canvas alias or swcMinify changes are required. The existing `next.config.ts` works as-is.

---

## Open Questions

1. **Download: simple `<a download>` vs Supabase `{ download: filename }` option**
   - What we know: Cross-origin `<a download>` is ignored by browsers (Supabase CDN is `*.supabase.co`, app is on a different domain). The `download` attribute only works same-origin.
   - What's unclear: Does Supabase Storage sign URLs with `Content-Disposition: attachment` by default? Likely not.
   - Recommendation: Extend `/api/statements/[id]/pdf-url` to accept `?download=true` query param. When present, call `createSignedUrl(path, 3600, { download: filename })` which Supabase sets as `Content-Disposition: attachment; filename=...`. This guarantees browser downloads without a proxy. The hook (`usePdfUrl`) can take a `forDownload` flag.
   - Confidence: MEDIUM — needs verification against Supabase docs on `{ download }` option behavior.

2. **Page width responsiveness**
   - What we know: `<Page width={N}>` is the API. The dialog is `max-w-4xl` (896px).
   - What's unclear: Should width be dynamically measured from container (ResizeObserver) or statically set?
   - Recommendation: Start with `width={760}` (within 4xl container with padding). If a ResizeObserver solution is needed, add in a follow-up. Static width is simpler and sufficient for v1.

3. **cMaps (non-Latin character support)**
   - What we know: react-pdf supports cMaps for CJK/Arabic/etc. via `<Document options={{ cMapUrl: ... }}>`. PDF.js CDN approach: `\`https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/\``.
   - What's unclear: Do any of the target users' bank statements contain non-Latin characters?
   - Recommendation: Skip cMaps for Phase 32. If PDFs with CJK characters fail to render, they will hit the error fallback (download link). cMaps add complexity (CDN dependency or copying files to `/public`). Defer.

---

## Sources

### Primary (HIGH confidence)
- [wojtekmaj/react-pdf README (v9.x branch)](https://github.com/wojtekmaj/react-pdf/blob/v9.x/packages/react-pdf/README.md) — worker setup, Next.js integration, Document/Page API, cMaps
- [react-pdf v10 Upgrade Guide](https://github.com/wojtekmaj/react-pdf/wiki/Upgrade-guide-from-version-9.x-to-10.x) — ESM-only, import path changes, SSR recommendation
- [react-pdf v9.2.0 Release Notes](https://github.com/wojtekmaj/react-pdf/releases/tag/v9.2.0) — "You no longer need to do any changes to Next.js config!"
- [react-pdf package.json (main branch)](https://github.com/wojtekmaj/react-pdf/blob/main/packages/react-pdf/package.json) — peerDependencies: React `^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0`; bundled pdfjs-dist 5.4.296
- Codebase inspection:
  - `src/app/api/statements/[id]/pdf-url/route.ts` — complete signed URL endpoint
  - `src/lib/storage/pdf-storage.ts` — `generatePdfSignedUrl()` helper
  - `src/components/sources/statement-list.tsx` — PdfStatusIcon location, StatementRow structure
  - `src/components/sources/statement-detail.tsx` — PdfStatusIcon location, header structure
  - `src/types/source.ts` — `StatementSummary.hasPdf: boolean`
  - `src/components/ui/dialog.tsx` — available Dialog primitives
  - `package.json` — react-pdf NOT installed; @radix-ui/react-dialog v1.1.15 installed

### Secondary (MEDIUM confidence)
- [wojtekmaj/react-pdf Issue #1855](https://github.com/wojtekmaj/react-pdf/issues/1855) — Next.js 14 App Router solutions; CDN worker fallback
- [npm search result: react-pdf v10.3.0](https://www.npmjs.com/package/react-pdf) — latest version confirmed

### Tertiary (LOW confidence)
- Cross-origin `download` attribute browser behavior — web standard knowledge; Supabase `{ download }` option behavior not directly verified against current Supabase docs. Mark as needing verification during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack (react-pdf v10, shadcn Dialog): HIGH — official sources confirm version and React 19 compat
- Architecture (two-file split, worker config): HIGH — official README explicitly requires same-file worker config; dynamic SSR pattern from official docs
- No Next.js config changes needed: HIGH — verified via v9.2.0 release notes
- Download cross-origin behavior: MEDIUM — standard browser behavior, but Supabase `{ download }` option needs implementation verification
- cMaps recommendation (skip): MEDIUM — reasonable assumption for English bank statements

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days — react-pdf is stable; Supabase API is stable)
