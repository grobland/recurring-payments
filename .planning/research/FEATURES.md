# Feature Research

**Domain:** Financial Data Vault — document storage, dual-view browsing, in-app PDF viewing, historical upload
**Researched:** 2026-02-19
**Confidence:** HIGH (core vault patterns, Supabase storage), MEDIUM (PDF viewer specifics, competitor UX)

---

## Context: What Already Exists

Before mapping features, it is essential to understand existing infrastructure so the roadmap does not rebuild what is already there.

### Already Built (Do Not Re-Build)
- `statements` table with `pdfStoragePath` (nullable — the vault fills this in)
- `pdfHash` (SHA-256) for duplicate detection on upload
- `sourceType` grouping (the "file cabinet" dimension already has a data model)
- `statementDate` for chronological ordering (the "timeline" dimension already has a data model)
- `/sources` page — accordion list of sources with statement counts and coverage stats
- `/statements/[id]` page — transaction table for a given statement, re-import wizard
- `source-dashboard`, `source-list`, `source-row`, `statement-list`, `statement-detail` components
- Batch upload UI with drag-and-drop, progress, sequential processing (`import/batch/page.tsx`)
- Duplicate statement detection (hash-based) already wired in
- `coverage-gap-warning` and `incomplete-batch-banner` components (existing gap detection UI)
- `account-combobox.tsx` for source-name autocomplete

### What the Vault Adds
The vault is fundamentally four things on top of this foundation:
1. **Persist the actual PDF file** in Supabase Storage (currently `pdfStoragePath` is nullable — files were never stored)
2. **Let users view the PDF in-app** (currently there is no viewer — only extracted data is shown)
3. **Refactor or extend the sources/statements UI** into a dual-view vault interface (file cabinet + timeline)
4. **Historical upload flow** — guide users through uploading 12–24 months of backfill statements

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a "vault." Missing these means the vault does not feel like a vault.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **PDF storage — original file kept permanently** | "Vault" implies permanence. If the file disappears after extraction, it is not a vault. | LOW | Schema already has `pdfStoragePath`. Need Supabase Storage bucket, RLS policy, and upload wiring in existing import flow. |
| **In-app PDF viewer** — open original statement without downloading | Users want to verify AI extraction against source. Leaving the app to view a file feels broken. | MEDIUM | Use `react-pdf` (wojtekmaj, 2M weekly downloads, wraps PDF.js). Must use `dynamic(() => import(...), { ssr: false })` — PDF.js requires browser APIs. Open in Dialog or Sheet component. |
| **Download PDF** — save original to local disk | Users expect local backup capability. Baseline expectation for any document storage product. | LOW | Supabase signed URL with `Content-Disposition: attachment`, or `<a href={signedUrl} download>`. Signed URL expiry: 60 seconds for download, 3600 seconds for viewing. |
| **File cabinet view** — statements grouped by source | Source grouping is already the established mental model from the existing `/sources` page. The vault must preserve this navigation pattern. | MEDIUM | Accordion by `sourceType`. Each group shows statement cards sorted by `statementDate DESC`. Extends existing `source-list` component. |
| **Timeline view** — all statements in chronological order | Second navigation paradigm: "what did I upload when" vs "what source is this from." Standard in all document management tools. | MEDIUM | Flat list or month-grouped list of statement cards, sorted by `statementDate DESC`. Shared `StatementCard` component with file cabinet view. |
| **View toggle** — switch between file cabinet and timeline | Users switch mental models depending on task (finding by bank vs. finding by date). | LOW | Two-button toggle using shadcn `Tabs` or a toggle button group. Persist preference in `localStorage`. |
| **Statement metadata on card** — filename, date, source, file size, upload date | Users need to identify which statement they are looking at before opening it. | LOW | Already partially in `statement-detail.tsx`. Extend to card display in vault views. |
| **"No file stored" indicator** | Some statements exist without a stored PDF (imported before vault was built). Users must understand this gap. | LOW | Badge or icon showing "No file stored" on cards where `pdfStoragePath IS NULL`. |
| **Empty state + upload CTA** | When vault is empty, users need clear direction. | LOW | Illustration or icon plus "Upload your first statement" button linking to batch upload flow. |

### Differentiators (Competitive Advantage)

Features that set this vault apart from generic document management tools. Not required for launch but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Coverage visualization** — month-grid showing which months have stored PDFs | Users know at a glance which months are "vaulted" vs data-only vs missing. No competitor in the personal finance space offers this for bank statements. | MEDIUM | 12-month grid per source. Green = PDF stored, Yellow = extracted-only (no file), Gray = no data. Extends existing `coverage-gap-warning` component. |
| **Historical upload wizard** — guided flow for uploading 12–24 months of backfill statements | No competitor guides users through systematic backfill. Most apps accept one file at a time. A wizard with calendar coverage visualization changes the value proposition. | HIGH | Show coverage calendar (months covered vs gaps). Drag-and-drop multiple files per source. Uses existing `batch-uploader.tsx`. Coverage gap detection reuses `coverage-gap-warning`. |
| **Dual-view with persistent preference** — vault remembers last-used view | Eliminates friction for power users who always prefer one view. Small UX polish that feels professional. | LOW | `localStorage` key `vault_view_preference`. Restore on page load. |
| **Statement-to-subscription linkage** — from vault, see which subscriptions came from each statement | Closes the loop: users can verify extraction by comparing PDF to extracted subscriptions. | MEDIUM | Statement detail already shows transactions. Add "X subscriptions extracted" count and navigation link. `subscriptions.importAuditId` already tracks provenance. |
| **Upload deduplication messaging** — if user tries to upload a statement already in vault, clear "Already uploaded" feedback | Users uploading 24 months of history will inevitably try to upload the same statement twice. Clear messaging prevents confusion. | LOW | Already implemented via `pdfHash` unique constraint. Vault UI just needs to surface the duplicate message clearly, not silently drop the upload. |
| **Signed URL PDF viewer** — PDF served via time-limited Supabase signed URL | Financial documents are sensitive. Time-limited URLs (1-hour expiry) prevent indefinite exposure of financial records. | LOW | `supabase.storage.from('statements').createSignedUrl(path, 3600)`. Regenerate on viewer open. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem natural to request but create significant problems for this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **OCR re-extraction on demand** — "re-run AI on this PDF" button in vault | Users want to improve extracted data when AI made mistakes | Triggers fresh OpenAI API calls (cost); creates duplicate transactions; conflict resolution between old and new extractions is non-trivial | The existing `reimport-wizard` in `statement-detail.tsx` already handles this. Use that. |
| **Custom folder organization** — let users create folders ("Tax 2024", "Business") | Feels natural from file-system mental model | Two navigation hierarchies (source × folder) conflict. For bank statements, source type is the correct natural grouping. Custom folders add management overhead with low payoff. | The file cabinet view (grouped by source type) IS the folder metaphor. Sufficient for this domain. |
| **PDF annotation** — highlight transactions, add notes in the PDF | Power users want to mark up statements | Requires a commercial PDF viewer SDK (PSPDFKit, Nutrient) at $400–1200/month, or complex custom canvas overlay. ROI extremely low for a subscription manager. | Store notes as a `notes` text field on the `statements` row. Covers 95% of the use case at 2% of the complexity. |
| **Automatic bank statement download** — connect to bank API | Users love automation | Bank APIs (Plaid, MX) require financial institution partnerships, OAuth flows, and $50–500/month API costs at scale. Compliance burden is substantial. | Manual PDF upload. Consider as a v3+ milestone only after vault is established. |
| **PDF editing** — redact, merge, split PDFs in-app | Redact account numbers before "vaulting" | Server-side PDF processing libraries add significant complexity. Solves a rare problem. | Show a note: "Consider redacting sensitive data before uploading." Do not build editing. |
| **Shared vault access** — share statements with accountant | Tax season use case | Multi-tenancy, access control, expiring share links, and audit logs are each non-trivial. Current auth model is single-user only. | Use the download button to share files externally. |
| **Mobile camera upload** — photograph paper statement | Some users receive paper statements | Mobile images require a different AI processing pipeline (not PDF-based), different file handling, and much lower extraction accuracy. Breaks the PDF-only assumption. | Keep PDF-only. Messaging: "Use your phone's built-in scanner app to create a PDF." |
| **Full-text search across PDF contents** | Users want to search for a merchant name across all statements | Requires indexing PDF text in a search engine (Elasticsearch, Typesense). Storage is relatively small in early months but infrastructure cost and complexity are high. | The extracted `transactions` table is already searchable. For v1, the vault is a browser, not a search engine. |

---

## Feature Dependencies

```
[PDF Storage in Supabase]
    └──required for──> [In-App PDF Viewer]
    └──required for──> [Download PDF]
    └──required for──> [Coverage Visualization] (differentiates "PDF stored" from "data only")
    └──required for──> [Delete PDF]

[Statement Card Component]
    └──shared by──> [File Cabinet View]
    └──shared by──> [Timeline View]

[File Cabinet View]
    └──extends──> [Existing /sources page accordion (source-list.tsx)]
    └──requires──> [Statement Card Component]

[Timeline View]
    └──requires──> [Statement Card Component]
    └──parallel with──> [File Cabinet View]

[View Toggle]
    └──requires──> [File Cabinet View] + [Timeline View]

[Historical Upload Wizard]
    └──requires──> [PDF Storage in Supabase]
    └──enhances──> [Coverage Visualization] (wizard fills gaps shown in coverage view)
    └──uses existing──> [Batch upload infrastructure (batch-uploader.tsx)]
    └──uses existing──> [Duplicate detection via pdfHash]
    └──uses existing──> [account-combobox.tsx for source selection]

[Coverage Visualization]
    └──extends existing──> [coverage-gap-warning component]
    └──uses existing──> [statementDate on statements table]
    └──depends on──> [PDF Storage] (to distinguish "PDF stored" from "data only")

[Statement-to-Subscription Linkage]
    └──uses existing──> [importAuditId on subscriptions table]
    └──uses existing──> [statement-detail.tsx transaction table]

[Delete PDF]
    └──requires──> [PDF Storage in Supabase]
    └──must NOT delete──> [statements row, transactions] (extracted data persists after file deletion)
```

### Dependency Notes

- **PDF Storage is the keystone feature.** Every vault-specific feature depends on it. It must be the first task of the vault milestone.
- **File Cabinet and Timeline share a `StatementCard` component.** Build one card, use it in both layouts. Do not build two separate implementations.
- **Historical upload wizard uses existing batch infrastructure.** The `batch-uploader.tsx`, `file-queue.tsx`, and `file-item.tsx` components are already built. The wizard adds navigation scaffolding and coverage visualization, not a new upload engine.
- **Coverage visualization extends existing gap detection.** `coverage-gap-warning` and `incomplete-batch-banner` already exist. The vault adds a positive visualization (what IS covered) to complement the existing negative (what is MISSING).

---

## MVP Definition

### Launch With (v1 — Vault Core)

Minimum viable vault — what makes it a vault instead of just an import history list.

- [ ] **PDF storage** — upload PDF to Supabase Storage private bucket, store path in `pdfStoragePath` — *without this, nothing else works*
- [ ] **In-app PDF viewer** — Dialog or Sheet with `react-pdf` (dynamic import, no SSR) — *without this, "vault" is meaningless*
- [ ] **Download PDF** — signed URL download link on each statement card — *baseline user expectation*
- [ ] **File cabinet view** — existing `/sources` accordion extended with statement cards showing "View PDF" and "Download" actions — *natural extension of what already exists*
- [ ] **Timeline view** — chronological list of all statements across all sources — *the second navigation mode that makes dual-view meaningful*
- [ ] **View toggle** — switch between file cabinet and timeline, preference saved to `localStorage` — *low effort, high UX polish*
- [ ] **"No file stored" indicator** — badge on cards where `pdfStoragePath IS NULL` — *data integrity: existing imports did not store files*
- [ ] **Empty state + upload CTA** — shown when vault has no statements — *required for new users who land on vault before uploading*

### Add After Validation (v1.x)

Features to add once core vault is live and users are uploading statements:

- [ ] **Coverage visualization** — month-grid heatmap per source showing PDF stored / data only / missing — *trigger: users ask "which months am I missing?"*
- [ ] **Historical upload wizard** — guided backfill flow with coverage calendar — *trigger: vault is live and users want to fill gaps systematically*
- [ ] **Delete PDF** — remove stored file while keeping extracted data — *trigger: GDPR requests, storage cost awareness; add before significant storage accumulates*
- [ ] **Statement notes** — text field on statement for user annotations — *trigger: users ask for annotation capability; far simpler than PDF annotation*

### Future Consideration (v2+)

Features to defer until vault is established and usage patterns emerge:

- [ ] **Statement-to-subscription deep linkage** — "X subscriptions from this statement" with navigation — *defer: useful but not blocking vault experience*
- [ ] **Batch date auto-detection** — parse statement dates from filenames and PDF content — *defer: adds AI API cost and complexity; manual date assignment acceptable for v1*
- [ ] **Statement search** — search by filename, source, date range across vault — *defer: small vault size makes this unnecessary early; extracted transactions are already searchable*

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| PDF storage in Supabase | HIGH | LOW | P1 |
| In-app PDF viewer | HIGH | MEDIUM | P1 |
| Download PDF | HIGH | LOW | P1 |
| File cabinet view (extends existing) | HIGH | LOW | P1 |
| Timeline view | HIGH | MEDIUM | P1 |
| View toggle | MEDIUM | LOW | P1 |
| "No file stored" indicator | HIGH | LOW | P1 |
| Empty state + upload CTA | MEDIUM | LOW | P1 |
| Coverage visualization | HIGH | MEDIUM | P2 |
| Historical upload wizard | HIGH | HIGH | P2 |
| Delete PDF | MEDIUM | MEDIUM | P2 |
| Statement notes | LOW | LOW | P2 |
| Statement-to-subscription linkage | MEDIUM | LOW | P3 |
| Batch date auto-detection | MEDIUM | HIGH | P3 |
| Statement search | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for vault launch (all table stakes)
- P2: Should have — add in first iteration after vault is live
- P3: Nice to have — future milestone

---

## Competitor Feature Analysis

No direct competitors combine a subscription manager with a statement vault. References from adjacent markets:

| Feature | Dext Vault | FutureVault | SmartVault | Our Approach |
|---------|------------|-------------|------------|--------------|
| PDF storage | Yes | Yes | Yes | Supabase Storage private bucket, user-scoped RLS |
| In-app viewer | Yes (embedded) | Yes | Yes (iframe) | `react-pdf` modal — no external iframe dependency |
| File organization | Folder hierarchy | Smart folders + AI | Folder hierarchy | Dual-view: source-grouped (file cabinet) + chronological (timeline). Simpler than folders, appropriate for bank statements. |
| Coverage visualization | No | No | No | Differentiator: 12-month grid per source |
| Historical upload wizard | No | No | No | Differentiator: guided backfill with coverage view |
| Search | Full-text | AI semantic | Keyword | v1: none; transactions already searchable in existing UI |
| Download | Yes | Yes | Yes | Signed URL with `Content-Disposition: attachment` |
| Annotation | Yes | Yes | Yes (iframe) | Out of scope — notes field only |
| Sharing | Yes | Yes | Yes | Out of scope — no multi-tenancy |

**Key insight from competitor research:** All competitors default to a folder hierarchy. This app's source-type grouping (by bank/card name) is simpler and more appropriate for bank statements, where users think "my Chase account" not "my Q1 2024 folder." The timeline view is additive and does not conflict with the source-based mental model.

---

## Implementation Notes by Feature

### PDF Storage (Supabase Storage)

- **Bucket name:** `statements` — private bucket (NOT public)
- **Path convention:** `{userId}/{statementId}.pdf` — user-scoped, no collision risk
- **File size:** Supabase Free tier caps at 50MB per file. Bank statements are typically 100KB–5MB. Non-issue.
- **Upload method:** Client-side direct upload using signed upload URL from Supabase JS client. Avoids Next.js 1MB server action body size limit. Generate signed upload URL on server, execute upload from browser.
- **RLS policy:** User can only read/write objects where path starts with their `userId`. Standard pattern from Supabase docs.
- **Upload trigger:** Wired into existing batch import flow. When PDF is processed, immediately upload to storage and update `pdfStoragePath`.

### In-App PDF Viewer

- **Library:** `react-pdf` by wojtekmaj — **not** `@react-pdf/renderer` (that generates PDFs, not displays them)
  - Weekly downloads: 2M (react-pdf) vs 1.4M (@react-pdf/renderer)
  - Wraps Mozilla's PDF.js
  - Next.js App Router compatible via `dynamic(() => import('./PdfViewerInner'), { ssr: false })`
- **Worker configuration:**
  ```
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'npm:pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  ```
- **UX pattern:** Open in a shadcn `Dialog` or `Sheet` (slide-over). Do not navigate away — users want to compare PDF to the transaction list on the same page.
- **Signed URL:** Generate on viewer open via `createSignedUrl(path, 3600)` (1-hour expiry). Regenerate if user keeps viewer open longer.
- **Fallback:** If PDF fails to load, show a "Download original file" link so users are never blocked.

### File Cabinet View

- Extends the existing `source-list.tsx` accordion component
- Each accordion item (source) expands to show `StatementCard` components
- `StatementCard` shows: filename, statement date (or "Date unknown"), file size, upload date, "View PDF" button, "Download" button, "No file" badge if `pdfStoragePath IS NULL`
- Sort: Newest statement first within each source group
- "Upload more statements" link within each accordion item (routes to batch upload pre-filtered to that source)

### Timeline View

- Flat list or month-grouped list of statement cards
- Same `StatementCard` component as file cabinet view
- Month separators: "January 2024", "February 2024", etc.
- Sources differentiated by a label/badge on the card (not accordion grouping)
- Sort: Newest statement at top

### Historical Upload Wizard

The wizard is UX scaffolding around existing infrastructure — not a new upload engine.

- **Step 1:** Select source using existing `account-combobox.tsx`
- **Step 2:** Show coverage calendar for that source (which months have PDF stored, which are data-only, which have no data)
- **Step 3:** Drag-and-drop batch upload for missing months using existing `batch-uploader.tsx`
- **Step 4:** Confirm processing and see updated coverage
- All processing goes through the existing batch import pipeline

### Delete PDF

- Sets `pdfStoragePath = null` in the `statements` table
- Deletes the object from Supabase Storage via `supabase.storage.from('statements').remove([path])`
- Does NOT delete the `statements` row or any `transactions` rows — extracted data persists
- Requires a confirmation dialog with clear messaging: "This deletes the original PDF. Your extracted transaction data will be preserved."

---

## Sources

- Codebase analysis: `src/lib/db/schema.ts` (statements table, pdfStoragePath), `src/components/sources/` (existing source/statement UI), `src/components/batch/` (existing upload infrastructure)
- [Supabase Storage — Serving assets / signed URLs](https://supabase.com/docs/guides/storage/serving/downloads) — HIGH confidence
- [Supabase Storage — Resumable uploads and file size limits](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) — HIGH confidence
- [Supabase Storage — Access control and RLS](https://supabase.com/docs/guides/storage/security/access-control) — HIGH confidence
- [react-pdf npm package](https://www.npmjs.com/package/react-pdf) — 2M weekly downloads, wojtekmaj — HIGH confidence
- [react-pdf Next.js App Router starter](https://github.com/react-pdf-dev/starter-rp-nextjs-app-router-js) — MEDIUM confidence (official starter repo, SSR:false pattern confirmed)
- [Best React PDF Viewer Libraries 2025](https://blog.react-pdf.dev/top-6-pdf-viewers-for-reactjs-developers-in-2025) — MEDIUM confidence
- [FutureVault — AI-Powered Digital Vaults for Financial Services](https://www.futurevault.com/) — MEDIUM confidence (competitor reference)
- [SmartVault — Document Management](https://www.smartvault.com/) — MEDIUM confidence (competitor reference)
- [Dext Vault — Secure Electronic Document Management](https://dext.com/en/business/product/dext-vault) — MEDIUM confidence (competitor reference)
- [Fintech UX in 2026: what users expect](https://www.stan.vision/journal/fintech-ux-in-2026-what-users-expect-from-modern-financial-products) — MEDIUM confidence
- [Bulk Import UX — Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/bulk-ux/) — MEDIUM confidence
- [Accordion UI Design Best Practices 2025](https://lollypop.design/blog/2025/december/accordion-ui-design/) — LOW confidence (general UX pattern, not domain-specific)

---

*Feature research for: Financial Data Vault (bank statement document storage and browsing)*
*Researched: 2026-02-19*
