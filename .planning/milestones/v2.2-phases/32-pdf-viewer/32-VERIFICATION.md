---
phase: 32-pdf-viewer
verified: 2026-02-19T22:30:00Z
status: passed
score: 9/9 automated must-haves verified + human UAT passed
human_verification:
  - test: "Open statement list, click the green PDF icon on a statement that has hasPdf=true"
    expected: "PdfViewerModal opens, 'Preparing PDF...' appears briefly, then the PDF renders page-by-page inside the dialog"
    why_human: "Cannot verify react-pdf canvas rendering, signed URL validity, or Supabase Storage connectivity programmatically"
  - test: "Navigate a multi-page PDF using Previous and Next buttons in the modal"
    expected: "Page number increments/decrements correctly, Previous is disabled on page 1, Next is disabled on last page, 'Page X of Y' updates"
    why_human: "Page navigation depends on onLoadSuccess callback firing with correct numPages from react-pdf — requires actual PDF render"
  - test: "Click the Download PDF button inside the viewer"
    expected: "Browser opens a save dialog (or downloads automatically) with the original filename; file is the real PDF not a corrupt/empty file"
    why_human: "Content-Disposition: attachment behavior on Supabase signed URLs requires a live network call to verify"
  - test: "Trigger render error by opening a statement whose stored PDF is corrupt or malformed"
    expected: "Modal shows 'This PDF could not be rendered in-app.' with a 'Download PDF instead' anchor link"
    why_human: "onLoadError callback from react-pdf requires a real (invalid) PDF to trigger; cannot stub react-pdf in this environment"
  - test: "Click a gray PDF icon (hasPdf=false) on a statement in the list"
    expected: "Nothing happens — no modal opens, cursor stays as default, button is visually non-interactive"
    why_human: "Requires visual confirmation that disabled state renders correctly and no click handler fires"
---

# Phase 32: PDF Viewer Verification Report

**Phase Goal:** Users can open any stored PDF in a modal dialog and view all pages in-app, or download the original file
**Verified:** 2026-02-19T22:30:00Z
**Status:** passed — all automated checks passed + human UAT confirmed PDF viewing, download, and statement listing
**Re-verification:** No — initial verification

## Goal Achievement

All 4 success criteria can be traced directly to substantive, wired code. No gaps in implementation were found. Human verification is required only to confirm runtime behavior (react-pdf canvas rendering, Supabase signed URL delivery, browser download behavior).

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PdfViewerInner renders a PDF from a signed URL with page navigation controls | VERIFIED | `pdf-viewer-inner.tsx` — `<Document>` + `<Page>` with `onLoadSuccess` setting numPages; prev/next Buttons shown when `numPages > 1`; "Page X of Y" display present |
| 2 | PdfViewerModal wraps PdfViewerInner in a shadcn Dialog with loading, error, and render-error states | VERIFIED | `pdf-viewer-modal.tsx` — Dialog/DialogContent/DialogHeader present; `isLoading`, `error\|\|!signedUrl`, and `signedUrl && renderError` branches all implemented with correct UI |
| 3 | usePdfUrl hook fetches signed URL only when enabled (modal open) | VERIFIED | `use-pdf-url.ts` — `enabled: !!statementId && enabled` flag; `staleTime: 55 * 60 * 1000`; `gcTime: 60 * 60 * 1000`; `retry: 1` |
| 4 | Download button triggers browser save dialog via Content-Disposition header | VERIFIED | API calls `generatePdfSignedUrl(path, { download: filename })` → Supabase `createSignedUrl(path, 3600, { download: filename })`; `<a href={downloadUrl} download={filename}>` in pdf-viewer-inner.tsx |
| 5 | If PDF fails to render, modal shows fallback download link instead of blank screen | VERIFIED | `pdf-viewer-modal.tsx` lines 94-107: `{signedUrl && renderError && (<div>...Download PDF instead</a>)}`; `onError={() => setRenderError(true)}` passed to PdfViewerInner |
| 6 | User can click PDF icon in statement list row to open the modal | VERIFIED | `statement-list.tsx` — `<button onClick={() => statement.hasPdf && setPdfOpen(true)}>` wraps PdfStatusIcon; `<PdfViewerModal statementId={statement.id} ...open={pdfOpen} onClose={() => setPdfOpen(false)}>` rendered conditionally on `hasPdf` |
| 7 | User can click PDF icon in statement detail header to open the modal | VERIFIED | `statement-detail.tsx` — identical button pattern on line 183-193; `<PdfViewerModal statementId={statementId} ...>` at line 309-315 |
| 8 | Statements without stored PDFs have a non-clickable, visually distinct icon | VERIFIED | Both files: `disabled={!statement.hasPdf}`, `className={...hasPdf ? "cursor-pointer hover:opacity-80" : "cursor-default"}`, modal only mounted when `hasPdf === true` |
| 9 | Modal closes cleanly and icon remains functional for re-opening | VERIFIED | `onOpenChange={(v) => !v && onClose()}` in Dialog; `renderError` reset in `useEffect` when `open` changes to true; `pdfOpen` state is local — re-clickable after close |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/statements/pdf-viewer-inner.tsx` | PDF rendering with Document/Page, worker config, page nav, download button | VERIFIED | 135 lines; `pdfjs.GlobalWorkerOptions.workerSrc` at module level (line 12-15); `<Document>` + `<Page>`; prev/next Buttons; download `<a>` tag |
| `src/components/statements/pdf-viewer-modal.tsx` | Dialog shell with dynamic import, loading/error/render-error states | VERIFIED | 121 lines; `dynamic(() => import("./pdf-viewer-inner")..., { ssr: false })` (lines 15-26); all 3 conditional UI branches present |
| `src/lib/hooks/use-pdf-url.ts` | TanStack Query hook for lazy signed URL fetch | VERIFIED | 47 lines; `useQuery` with `enabled: !!statementId && enabled`, `staleTime: 55 * 60 * 1000` |
| `src/app/api/statements/[id]/pdf-url/route.ts` | Download-aware signed URL endpoint returning both url and downloadUrl | VERIFIED | Returns `{ url: viewUrl ?? downloadUrl, downloadUrl: downloadUrl ?? viewUrl }` via parallel `Promise.all` calls to `generatePdfSignedUrl` |
| `src/lib/storage/pdf-storage.ts` | generatePdfSignedUrl with optional download option | VERIFIED | `options?: { download?: string }` param; `createSignedUrl(path, 3600, { download: options.download })` when download option present |
| `src/components/sources/statement-list.tsx` | Clickable PdfStatusIcon with PdfViewerModal integration | VERIFIED | Imports `PdfViewerModal`, `pdfOpen` state, button wrapper, conditional modal render |
| `src/components/sources/statement-detail.tsx` | Clickable PdfStatusIcon with PdfViewerModal integration | VERIFIED | Same pattern as statement-list.tsx; modal rendered after ReimportWizard section |
| `package.json` | react-pdf@^10.3.0 | VERIFIED | `"react-pdf": "^10.3.0"` in dependencies |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pdf-viewer-modal.tsx` | `pdf-viewer-inner.tsx` | dynamic import with ssr: false | WIRED | `dynamic(() => import("./pdf-viewer-inner").then((m) => ({ default: m.PdfViewerInner })), { ssr: false, ... })` — lines 15-26 |
| `pdf-viewer-modal.tsx` | `use-pdf-url.ts` | usePdfUrl hook call | WIRED | `import { usePdfUrl }` + `const { data, isLoading, error } = usePdfUrl(statementId, open)` |
| `use-pdf-url.ts` | `/api/statements/[id]/pdf-url` | fetch call | WIRED | `fetch(\`/api/statements/${statementId}/pdf-url\`)` line 18 |
| `pdf-url/route.ts` | `pdf-storage.ts` | generatePdfSignedUrl with download option | WIRED | `generatePdfSignedUrl(path, { download: statement.originalFilename })` line 61; `createSignedUrl(path, 3600, { download: options.download })` line 95 |
| `statement-list.tsx` | `pdf-viewer-modal.tsx` | import and render PdfViewerModal | WIRED | `import { PdfViewerModal } from "@/components/statements/pdf-viewer-modal"` line 10; `<PdfViewerModal statementId={statement.id} ...>` line 154 |
| `statement-detail.tsx` | `pdf-viewer-modal.tsx` | import and render PdfViewerModal | WIRED | `import { PdfViewerModal } from "@/components/statements/pdf-viewer-modal"` line 27; `<PdfViewerModal statementId={statementId} ...>` line 310 |
| `statement-list.tsx` | PdfStatusIcon onClick | button wrapping icon sets pdfOpen state | WIRED | `onClick={() => statement.hasPdf && setPdfOpen(true)}` line 109 |
| `statement-detail.tsx` | PdfStatusIcon onClick | button wrapping icon sets pdfOpen state | WIRED | `onClick={() => statement.hasPdf && setPdfOpen(true)}` line 184 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VIEW-01 | 32-01-PLAN, 32-02-PLAN | User can view an uploaded PDF in-app via a modal viewer with page navigation | SATISFIED | PdfViewerModal opens on button click; PdfViewerInner renders Document/Page with prev/next controls; wired into both statement-list and statement-detail |
| VIEW-02 | 32-01-PLAN, 32-02-PLAN | User can download the original PDF file from the viewer | SATISFIED | API generates Content-Disposition download URL; `<a href={downloadUrl} download={filename}>Download PDF</a>` in PdfViewerInner; download fallback also present in render-error state |

No orphaned requirements — only VIEW-01 and VIEW-02 are assigned to Phase 32 in REQUIREMENTS.md. Both are claimed in both plans. No gaps.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| — | None found | — | — |

No TODO, FIXME, placeholder, or empty return stubs found in any Phase 32 file.

### Human Verification Required

All 5 items below require a running development environment with Supabase Storage configured and at least one statement with a stored PDF (`hasPdf = true` and `pdfStoragePath` set).

#### 1. PDF Renders in Modal

**Test:** Navigate to Sources page, expand a source with a stored statement, click the green PDF icon
**Expected:** Dialog opens with filename in title; "Preparing PDF..." shows briefly; PDF pages render via react-pdf canvas inside the dialog
**Why human:** react-pdf rendering depends on pdfjs worker loading via `import.meta.url`, canvas API availability, and a valid Supabase signed URL — none verifiable without a live browser

#### 2. Page Navigation Works on Multi-Page PDF

**Test:** Open a PDF with more than one page; click Next and Previous buttons
**Expected:** "Page 1 of N" increments to "Page 2 of N" on Next; Previous is disabled on page 1; Next is disabled on the last page
**Why human:** numPages is set by `onLoadSuccess` callback from react-pdf — requires a real PDF to load

#### 3. Download Saves the File

**Test:** Click "Download PDF" button inside the viewer
**Expected:** Browser triggers a save dialog (or auto-downloads) with the original filename; downloaded file opens correctly as a PDF
**Why human:** Content-Disposition: attachment behavior requires a live Supabase signed URL with the download parameter; `download` attribute on cross-origin URLs is ignored by browsers without the server header

#### 4. Render Error Fallback Appears for Corrupt PDF

**Test:** If a stored PDF is corrupt or unrenderable, open it in the modal
**Expected:** "This PDF could not be rendered in-app." message appears with "Download PDF instead" link
**Why human:** `onLoadError` callback from react-pdf only fires on an actual failure; cannot synthetically trigger without a real broken PDF

#### 5. Gray Icon Is Non-Interactive

**Test:** Hover over and click a gray PDF icon on a statement with `hasPdf = false`
**Expected:** Cursor remains as default (not pointer); clicking does nothing; no modal appears; no network request fires
**Why human:** Requires visual confirmation of cursor and disabled state rendering in a real browser

### Summary

Phase 32 is fully implemented. All 9 observable truths are supported by substantive, wired code. All 8 required artifacts exist with real implementation (no stubs). All 8 key links are verified. Both requirements VIEW-01 and VIEW-02 are satisfied. No anti-patterns were found.

The only items requiring human validation are live-environment runtime behaviors: PDF rendering via react-pdf, Supabase signed URL delivery, browser download behavior, error fallback triggering, and disabled-state visual presentation. These cannot be verified without a running browser and configured Supabase Storage instance.

---

_Verified: 2026-02-19T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
