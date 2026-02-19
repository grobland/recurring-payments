# Project Research Summary

**Project:** Subscription Manager — v2.2 Financial Data Vault
**Domain:** PDF blob storage, in-app viewing, dual-view vault UI layered on existing statement infrastructure
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

The v2.2 milestone transforms the existing statement tracking system into a true financial data vault by adding three capabilities: persistent PDF storage in Supabase Storage, in-app viewing via react-pdf, and a dedicated vault UI with dual-view browsing (file cabinet + timeline). The foundation is already present — the `statements` table has a `pdfStoragePath` column (currently NULL), a SHA-256 hash for deduplication, and a `// TODO: upload to Supabase Storage` comment in the upload route. This milestone fills that gap and builds the browsing UI on top. Only two new packages are required: `@supabase/supabase-js` (for Storage access) and `react-pdf` (for in-browser rendering).

The recommended approach is a server-side upload pattern: the `/api/batch/upload` route already has the PDF bytes in memory, so it uploads directly to Supabase Storage using the service role key (bypassing RLS at the app layer, where auth is already verified). PDF access for the viewer is served via short-lived signed URLs generated on-demand, never as permanent public URLs. The vault UI at `/vault` presents two views of the same data — grouped by source (file cabinet) and chronological (timeline) — backed by a single TanStack Query call. All UI components reuse existing patterns: shadcn Tabs for view toggle, existing accordion structure for file cabinet, date-fns for month grouping in timeline.

The single most critical risk is the Vercel serverless function 4.5 MB body limit. Bank statements routinely exceed this, and routing PDF bytes through a Next.js API route body will silently fail for real-world files while appearing to work with small test PDFs. The architecture research resolves this conclusively: upload happens server-side from in-memory bytes in the existing `/api/batch/upload` route — the file is never re-transmitted through the function body from storage. The second critical risk is react-pdf's incompatibility with Next.js SSR — the component must be wrapped in `dynamic(() => import(...), { ssr: false })` with the pdfjs worker configured in the same dynamically-imported file. Both risks have clear, well-documented solutions.

---

## Key Findings

### Recommended Stack

The project requires only two new packages. `@supabase/supabase-js@^2.97.0` is required because Supabase Storage has no postgres-compatible alternative — the existing Drizzle/postgres client handles the database, but storage operations require the Supabase JS SDK. `react-pdf@^10.3.0` (wojtekmaj, 2M weekly downloads) wraps Mozilla's PDF.js and supports React 19 and Next.js 16 with confirmed App Router compatibility. Everything else needed for the vault UI is already installed: `@radix-ui/react-tabs` (view toggle), `@tanstack/react-virtual` (virtualized file list), `react-dropzone` (upload), `date-fns` (month grouping).

Three new environment variables are needed: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for browser-side storage operations, and `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) for server-side operations. The existing `DATABASE_URL` continues to serve Drizzle unchanged.

**Core technologies:**
- `@supabase/supabase-js@2.97.0`: Supabase Storage SDK — the only supported way to interact with storage buckets; manages signed URL generation, upload, and delete operations
- `react-pdf@10.3.0`: Canvas-based PDF renderer — wraps PDF.js with a React API; avoids iframe CORS issues and browser chrome; compatible with React 19 and Next.js 16
- `pdfjs-dist@5.4.624`: Installed automatically as a react-pdf dependency — do not install separately; version is pinned by react-pdf for compatibility

**What NOT to add:**
- `@supabase/storage-js` separately (already bundled in supabase-js)
- `pdfjs-dist` separately (react-pdf pins a compatible version; separate install risks version mismatch)
- `@supabase/auth-helpers-nextjs` (deprecated; project uses NextAuth, not Supabase Auth)
- `file-saver` (native `URL.createObjectURL + <a download>` is sufficient on React 19 / Next.js 16)

### Expected Features

PDF storage is the keystone feature — every vault capability depends on it. The existing `pdfStoragePath` nullable column in the `statements` table is the integration point. Once storage is wired in, the remaining features are UI layers on top of existing infrastructure.

**Must have (table stakes for vault launch):**
- PDF storage in Supabase Storage private bucket — without this, "vault" is meaningless
- In-app PDF viewer via react-pdf modal — users need to verify AI extraction against source documents
- Download PDF — baseline expectation for any document storage product
- File cabinet view — source-grouped accordion extending existing `source-list.tsx`
- Timeline view — chronological list of all statements with month separators
- View toggle — shadcn Tabs switching between the two views; persist preference in localStorage
- "No file stored" badge — statements imported before the vault was built have `pdfStoragePath = NULL`; must be indicated clearly
- Empty state with upload CTA — required for new users who navigate to vault before uploading

**Should have (add after core vault is live):**
- Coverage visualization — 12-month grid per source showing "PDF stored" / "data only" / "missing" states; extends existing `coverage-gap-warning` component
- Historical upload wizard — guided backfill flow using existing batch uploader infrastructure; select source, view coverage calendar, upload missing months
- Delete PDF — remove stored file while preserving extracted transaction data; requires confirmation dialog with clear messaging
- Statement notes — plain text annotation field on `statements` row; far simpler than PDF annotation and covers 95% of the use case

**Defer (v2+):**
- Statement-to-subscription deep linkage — provenance tracking already exists via `importAuditId`; useful but not blocking vault launch
- Batch date auto-detection — AI cost and complexity not justified for v1; manual date assignment is acceptable
- Full-text search across PDF contents — extracted transactions are already searchable; vault is a browser, not a search engine at this stage
- Bank API integration (Plaid/MX) — compliance burden and cost prohibitive for this stage

**Anti-features (do not build for this milestone):**
- PDF annotation — PSPDFKit costs $400-1200/month; notes field covers the use case at a fraction of complexity
- Custom folder organization — conflicts with source-type mental model; the file cabinet view IS the folder metaphor
- Automatic bank statement download — requires financial institution partnerships, OAuth flows, compliance
- Mobile camera upload — breaks the PDF-only processing pipeline; tell users to use their phone's scanner app

### Architecture Approach

The vault extends the existing system at two primary integration points: the `/api/batch/upload` route is modified to upload file bytes to Supabase Storage immediately after creating the statement row, and a new `/api/statements/[id]/pdf` route generates short-lived signed URLs on demand. The vault UI lives at `/app/(dashboard)/vault/page.tsx` within the existing dashboard route group, inheriting the auth guard and sidebar layout automatically. No new database tables are required.

The dual-view architecture uses a single `useVault` TanStack Query hook fetching from a new `/api/vault` endpoint. Both views (`VaultGrid` for file cabinet, `VaultTimeline` for timeline) consume the same data — tab switching is pure UI state with no additional data fetching. The `PdfViewerModal` is a shadcn Dialog wrapping a dynamically-imported `PDFDocumentInner` component; the dynamic import boundary is mandatory for SSR bypass. The pdfjs worker configuration must live in the same file as the `<Document>` component — setting it in a shared utility file is unreliable.

**Major components:**
1. `src/lib/supabase/admin.ts` (new) — service role Supabase client for all server-side storage operations
2. `src/app/api/batch/upload/route.ts` (modified) — adds storage upload after statement row creation; non-fatal on storage failure
3. `src/app/api/statements/[id]/pdf/route.ts` (new) — auth + ownership check, generates 5-minute signed URL
4. `src/app/api/vault/route.ts` (new) — filtered statement list with `hasPdf` boolean, supports source/date filters
5. `src/app/(dashboard)/vault/page.tsx` (new) — dual-view page with Tabs, filters, and PDF viewer modal
6. `src/components/vault/pdf-document-inner.tsx` (new) — react-pdf Document/Page with worker config (dynamic import target)
7. `src/components/vault/pdf-viewer-modal.tsx` (new) — Dialog wrapper with page navigation and zoom controls
8. `src/components/vault/vault-grid.tsx` + `vault-timeline.tsx` (new) — two layout components consuming shared data
9. `src/lib/hooks/use-vault.ts` + `use-pdf-url.ts` (new) — TanStack Query hooks for vault list and on-demand signed URL

**Build order (each step independently deployable and verifiable):**
1. Supabase Storage infrastructure — create bucket, configure RLS policies, add env vars, create admin client
2. Modify upload route — wire storage upload into existing flow; verify `pdfStoragePath` is set in DB with a real PDF
3. Signed URL API route — new endpoint; test with curl before building UI
4. PDF viewer components — install react-pdf, build modal in isolation; run `next build` to catch webpack issues early
5. Vault list API — new `/api/vault` endpoint with filters and `hasPdf` field
6. Vault UI — page, grid, timeline, filters, sidebar link; wire `PdfViewerModal` into page

### Critical Pitfalls

1. **Vercel 4.5 MB body limit on PDF uploads** — routing PDF bytes through a Next.js API route body will return HTTP 413 for any bank statement over ~3.3 MB (base64 encoding adds 33% overhead). Invisible in development with small test files. Resolution: upload happens from the file buffer already in memory in `/api/batch/upload` — the bytes go directly from the serverless function's memory to Supabase Storage, never re-entering an API route body. The function already has the bytes via FormData.

2. **react-pdf / pdfjs-dist SSR crash** — importing react-pdf in any component that Next.js attempts to server-render throws `TypeError: Promise.withResolvers is not a function` at build time, or silently renders a blank canvas at runtime. Resolution: mandatory two-file split: `PDFDocumentInner` (actual react-pdf code + worker config in same file) loaded exclusively via `dynamic(() => import('./pdf-document-inner'), { ssr: false })`. Also add `config.resolve.alias.canvas = false` to webpack config and `pdfjs-dist` to `serverExternalPackages` in `next.config.ts`.

3. **Supabase Storage RLS misconfiguration** — two opposite failure modes with the same root cause (policies not configured correctly): no policies leaves financial documents accessible to any authenticated user by path; RLS enabled but no policies blocks all access with 403 errors. Resolution: configure three explicit RLS policies (INSERT, SELECT, DELETE) using `(storage.foldername(name))[1] = auth.uid()::text` before writing any upload code. Test with two separate authenticated Supabase clients — not the Supabase dashboard, which bypasses RLS.

4. **Storage-database split-brain** — if the storage upload succeeds but the `pdfStoragePath` DB update fails, an orphaned file exists in Supabase Storage with no database reference. Resolution: non-fatal design — log the storage error, continue processing (text extraction still works from in-memory bytes), set `pdfStoragePath = NULL`. The statement remains fully functional without a stored PDF. Add a periodic orphan cleanup cron for safety.

5. **Signed URL expiry breaking the viewer** — signed URLs expire (5-minute design). Pre-fetching URLs for the entire vault list means they will be stale when users click. Resolution: generate signed URLs on-demand only when the modal opens; the vault list stores only `hasPdf: boolean`. TanStack Query caches the URL for 4 minutes (`staleTime: 4 * 60 * 1000`) and garbage-collects at 5 minutes, which aligns with the URL lifetime.

---

## Implications for Roadmap

Research reveals a clear dependency chain: storage must exist before the viewer can function, the viewer must be proven before vault UI delivers value, and the core vault must be stable before enhancement features (coverage visualization, historical upload wizard) are layered on top. This drives a 4-phase structure.

### Phase 1: Storage Foundation

**Rationale:** PDF storage is the keystone dependency — every other vault feature requires `pdfStoragePath` to be non-null on at least some statements. This phase also contains the two highest-risk architectural decisions (upload flow design, RLS configuration) that cannot be changed without significant rework later. Must be built and verified in isolation before any UI work begins.

**Delivers:** PDFs uploaded through the existing batch import flow are now persisted in Supabase Storage. The `pdfStoragePath` column is populated on new uploads. Historical statements retain `pdfStoragePath = NULL` (expected — those files are gone and unrecoverable).

**Addresses features:** PDF storage in Supabase private bucket (P1 table stakes)

**Avoids pitfalls:**
- Vercel 4.5 MB body limit (resolved by uploading from in-memory bytes, not a second request body)
- RLS misconfiguration (configure before writing upload code; test with two user accounts)
- Storage-database split-brain (non-fatal design from day one)
- Account deletion leaving orphaned files (design the deletion cascade in this phase)

**Needs research-phase:** No — Supabase Storage upload from a Node.js buffer is standard, well-tested, and fully documented. RLS policy SQL is provided verbatim in ARCHITECTURE.md.

---

### Phase 2: PDF Viewer

**Rationale:** The viewer is the feature that makes "vault" meaningful over "import history." It must be built and verified in isolation before being integrated into the vault page — the react-pdf + Next.js webpack configuration is the most technically complex part of this milestone and deserves its own phase to contain the risk. A broken viewer would block all vault UI work.

**Delivers:** Users can click "View PDF" on any statement with `pdfStoragePath` set and see it rendered in a modal dialog. Page navigation (prev/next) and zoom controls work. Signed URL is fetched on modal open (not pre-fetched for the list). PDF fails gracefully with a "Download original file" fallback link.

**Addresses features:** In-app PDF viewer (P1), download PDF (P1 — signed URL pattern reused for download button)

**Avoids pitfalls:**
- react-pdf SSR crash (mandatory dynamic import + worker config in same dynamically-imported file)
- pdfjs-dist inflating server bundle (add to `serverExternalPackages` in `next.config.ts`)
- Signed URL expiry in open viewer (generate on-demand; TanStack Query cache timed to URL lifetime)
- Multi-page browser freeze (render one page at a time; prev/next controls)

**Needs research-phase:** No — the two-file dynamic import pattern is documented in ARCHITECTURE.md with working TypeScript code. Verify with `next build` after installing react-pdf before proceeding.

---

### Phase 3: Vault UI

**Rationale:** With storage working and the PDF viewer proven, building the vault page is a UI composition task with no novel technical risk. The dual-view interface reuses existing patterns throughout: shadcn Tabs for view toggle, the existing source-list accordion structure extended for file cabinet, date-fns month grouping for timeline. The `StatementCard` component is built once and shared across both views — no duplicate implementations.

**Delivers:** A new `/vault` page accessible from the sidebar. File cabinet view: statements grouped by source in an accordion, each with a StatementCard showing filename, date, file size, "View PDF" button, "Download" button, and "No file stored" badge where applicable. Timeline view: same cards sorted chronologically with month-group separators. Empty state with upload CTA for new users. View preference saved to localStorage.

**Addresses features:** File cabinet view (P1), timeline view (P1), view toggle (P1), empty state (P1), "No file stored" indicator (P1)

**Avoids pitfalls:**
- Pre-fetching signed URLs for vault list (vault list returns `hasPdf: boolean` only; signed URLs fetched on click)
- Slow vault page load (skeleton loading while metadata fetches; URL generation only on user action)
- No pagination on vault query (limit/offset on `/api/vault`; default 100 per load)

**Needs research-phase:** No — standard TanStack Query + shadcn Tabs + existing component extension. No novel patterns.

---

### Phase 4: Coverage Visualization and Historical Upload Wizard

**Rationale:** These two differentiator features are tightly coupled — the wizard's value proposition is "fill the gaps shown in coverage view." Both reuse existing infrastructure (`coverage-gap-warning` component, `batch-uploader.tsx`). They are deferred until core vault is live so implementation is validated against real uploaded statements rather than assumed data shapes and real usage patterns.

**Delivers:** A 12-month coverage grid per source showing "PDF stored" (green), "data only — no file" (yellow), and "no data" (gray) per month. A multi-step guided wizard: select source → view coverage calendar → drag-and-drop batch upload for missing months using existing `batch-uploader.tsx` → confirm updated coverage.

**Addresses features:** Coverage visualization (P2 differentiator), historical upload wizard (P2 differentiator)

**Avoids pitfalls:**
- Duplicate re-uploads during bulk backfill (hash check already wired in batch uploader; surface "Already uploaded" message clearly)
- Bulk upload partial failure being invisible (per-file status in upload queue for all 5+ file batches)
- Rebuilding the upload engine (wizard is UX scaffolding only; `batch-uploader.tsx` is the engine)

**Needs research-phase:** Yes, lightly — the month-grid visualization has no established component in this codebase. The data model is clear (`statementDate` + `pdfStoragePath IS NOT NULL` per month per source), but the grid rendering approach (CSS Grid, Recharts cell chart, or shadcn-compatible calendar component) should be scoped during planning before committing to implementation.

---

### Phase Ordering Rationale

- Storage before viewer: react-pdf needs a real signed URL pointing to a real stored file — cannot meaningfully test or prove the viewer without Phase 1 complete
- Viewer before vault UI: `PdfViewerModal` is a core component of the vault page; isolating it in Phase 2 lets webpack and worker issues surface before vault UI development begins, avoiding rework
- Vault UI before enhancements: Coverage visualization is meaningless without a population of real statements with mixed `pdfStoragePath` states; the wizard's UX cannot be validated without seeing the vault with real data
- Phase 4 grouped as one: Coverage visualization and historical wizard are tightly coupled — the wizard fills the gaps shown in the coverage grid; building them separately would require connecting them afterward

### Research Flags

Needs deeper research during planning:
- **Phase 4:** Coverage grid rendering approach — evaluate CSS Grid (lightweight, manual), shadcn calendar-like component (consistent with existing UI), or Recharts cell/calendar chart before planning this phase. Data model is clear; rendering approach is not.

Standard patterns (skip research-phase):
- **Phase 1:** Supabase Storage upload from Node.js buffer is standard. RLS policy SQL is provided verbatim in ARCHITECTURE.md. Bucket creation is a one-time dashboard action.
- **Phase 2:** react-pdf + Next.js dynamic import pattern is fully documented in ARCHITECTURE.md with working code. Worker configuration is established. Verify with `next build` immediately after installing the package.
- **Phase 3:** TanStack Query + shadcn Tabs + extension of existing components. No novel patterns; well-established across the existing codebase.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Both packages verified via npm on 2026-02-19. Version compatibility with React 19 and Next.js 16 confirmed. Existing package inventory verified against `package.json`. |
| Features | HIGH | Feature list derived primarily from codebase analysis (existing components, schema fields, TODO comment in upload route). Anti-features validated against cost and complexity data from official sources. |
| Architecture | HIGH | Integration points verified against actual codebase files: `src/app/api/batch/upload/route.ts` (TODO at line 97), `src/lib/db/schema.ts` (`pdfStoragePath` nullable text column). Data flow patterns are fully specified with working TypeScript code examples. |
| Pitfalls | HIGH | Vercel 4.5 MB limit confirmed via official Vercel docs. react-pdf SSR failure modes confirmed via tracked GitHub issues with multiple corroborating reports. RLS misconfiguration patterns confirmed via Supabase official docs and a 2025 security study. Signed URL expiry behavior confirmed via Supabase community discussion. |

**Overall confidence:** HIGH

### Gaps to Address

- **Coverage grid component approach (Phase 4):** The month-grid visualization has a clear data model but no established rendering approach in this codebase. Scope this during Phase 4 planning — evaluate CSS Grid, a shadcn-compatible calendar, or Recharts before committing to implementation.

- **Supabase free tier storage quota:** The 1 GB free tier fits roughly 100-200 statements at 5-10 MB each across all users. At scale, this becomes a billing consideration. Design a per-user storage usage query from Phase 1 so the monitoring data is available before the quota becomes urgent.

- **Worker path: legacy vs. standard:** ARCHITECTURE.md uses `pdfjs-dist/legacy/build/pdf.worker.min.mjs` while STACK.md uses `pdfjs-dist/build/pdf.worker.min.mjs`. After installing `react-pdf@10.3.0`, validate which path resolves correctly in the Next.js 16 bundler — the non-legacy path is preferred for modern targets.

- **Vercel function timeout for large uploads:** The 4.5 MB body limit is the primary concern, but Vercel also has a 10-second default function timeout. A 10-15 MB PDF upload on a slow connection could time out during the storage upload step. Monitor after Phase 1 launch; if failures occur, evaluate Supabase resumable uploads (TUS protocol via `tus-js-client`).

---

## Sources

### Primary (HIGH confidence)
- `src/lib/db/schema.ts` — `statements` table schema, `pdfStoragePath` nullable text column confirmed
- `src/app/api/batch/upload/route.ts` — upload flow, TODO comment at line 97, `MAX_FILE_SIZE = 50MB` constant
- `npm view react-pdf version` → `10.3.0` — verified 2026-02-19
- `npm view @supabase/supabase-js version` → `2.97.0` — verified 2026-02-19
- `npm view pdfjs-dist version` → `5.4.624` — verified 2026-02-19
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) — 4.5 MB body limit confirmed
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — RLS policy SQL with `storage.foldername()`
- [Supabase createSignedUrl API](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) — signed URL generation and expiry
- [Supabase Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) — 50 MB per file max, 1 GB free tier total storage
- [Supabase Delete Objects](https://supabase.com/docs/guides/storage/management/delete-objects) — must use Storage API, not SQL DELETE

### Secondary (MEDIUM confidence)
- [react-pdf GitHub (wojtekmaj/react-pdf)](https://github.com/wojtekmaj/react-pdf) — Next.js App Router compatibility, worker config requirement, React 19 peer dep
- [vercel/next.js #70239](https://github.com/vercel/next.js/issues/70239) — `Promise.withResolvers` build failure with pdfjs-dist in Next.js
- [wojtekmaj/react-pdf #1855](https://github.com/wojtekmaj/react-pdf/issues/1855) — worker path resolution issues in App Router
- [Supabase Discussion #34254](https://github.com/orgs/supabase/discussions/34254) — orphaned files when deleting via SQL (S3 object persists)
- [Supabase Discussion #7626](https://github.com/orgs/supabase/discussions/7626) — signed URL generates different signature each call (no HTTP-level caching)
- [Supabase RLS security research 2025](https://designrevision.com/blog/supabase-row-level-security) — 83% of exposed Supabase databases involve RLS misconfigurations
- [Bypass Vercel 4.5 MB limit with Supabase direct upload](https://medium.com/@jpnreddy25/how-to-bypass-vercels-4-5mb-body-size-limit-for-serverless-functions-using-supabase-09610d8ca387)

### Tertiary (LOW confidence)
- Competitor analysis: Dext Vault, FutureVault, SmartVault — feature comparison used to validate table stakes and identify differentiators; not directly applicable to implementation decisions. Key insight: all competitors default to custom folder hierarchies; source-type grouping is simpler and more appropriate for bank statements.

---

*Research completed: 2026-02-19*
*Ready for roadmap: yes*
