# Pitfalls Research

**Domain:** Financial Data Vault — PDF blob storage, in-app viewing, and vault UI added to existing Next.js + Supabase subscription manager
**Researched:** 2026-02-19
**Confidence:** HIGH (Vercel limits and Supabase Storage limits confirmed via official docs; PDF viewer issues confirmed via multiple GitHub issues; RLS issues corroborated by official Supabase docs and community reports)

---

## Critical Pitfalls

### Pitfall 1: Routing PDF Uploads Through the Vercel Serverless Function

**What goes wrong:**
The existing import flow receives PDFs as base64 through `POST /api/import`. When adding persistent storage, the natural instinct is to extend the same route to also forward the bytes to Supabase Storage. This hits Vercel's hard 4.5 MB request body limit and returns HTTP 413: `FUNCTION_PAYLOAD_TOO_LARGE`. The problem is invisible in development with small test files — it only surfaces with real bank statement PDFs, which commonly range from 3-15 MB.

Base64 encoding adds approximately 33% overhead, meaning a 3.3 MB PDF becomes a 4.5 MB encoded payload, hitting the limit exactly. Any statement larger than 3.3 MB will fail silently from the user's perspective.

**Why it happens:**
The existing import route already handles the file server-side. Developers naturally extend it to also persist the file. Dev test files are usually small. The 4.5 MB limit is not obvious during local development (no Vercel function wrapper locally).

**How to avoid:**
Use Supabase's signed upload URL pattern for direct client-to-storage uploads. The server creates a signed upload URL (expires in 2 hours), returns it to the browser, and the browser uploads directly to Supabase Storage — bypassing Vercel entirely. The server only processes metadata after the upload completes.

```typescript
// Server action: generate signed URL and scoped path only
const path = `${userId}/${year}-${month}/${statementId}.pdf`;
const { data } = await supabase.storage
  .from('statements')
  .createSignedUploadUrl(path);
// Return { signedUrl, token, path } to client

// Client: upload directly to Supabase Storage (bypasses Vercel)
await supabase.storage
  .from('statements')
  .uploadToSignedUrl(path, token, file);

// Client then notifies server with the storage path only
await fetch('/api/import', { method: 'POST', body: JSON.stringify({ storagePath: path }) });
```

**Warning signs:**
- Uploads work in dev with small 1-2 MB test PDFs but fail in production
- HTTP 413 errors in Vercel function logs
- Users report "upload failed" for files over 3-4 MB
- The existing `react-dropzone` 10 MB client-side limit gives false confidence that large files work

**Phase to address:** Storage Foundation phase (the first phase that wires up Supabase Storage). This architectural decision must be made before any upload code is written.

---

### Pitfall 2: react-pdf / pdfjs-dist Breaks the Next.js App Router Build

**What goes wrong:**
Installing `react-pdf` (which depends on `pdfjs-dist`) and importing it in a standard App Router component causes build failures or silent runtime crashes. Documented failure modes as of 2025:
- `TypeError: Promise.withResolvers is not a function` during `next build`
- `Can't resolve 'pdfjs-dist/build/pdf.worker.min.mjs'` webpack error
- Blank white box where the PDF should appear (worker silently failed, no error thrown)
- The `pdfjs-dist` bundle (~3 MB) inflates the server function bundle and can approach the 250 MB unzipped Vercel limit

**Why it happens:**
`react-pdf` depends on browser-only APIs (Canvas, Web Workers). The Next.js App Router server-renders components unless explicitly opted out. PDF.js ships a Web Worker that webpack does not know how to bundle without explicit configuration. Setting `pdfjs.GlobalWorkerOptions.workerSrc` in a shared utility file is unreliable — due to module execution order, the default value can overwrite the custom setting.

**How to avoid:**
Three-layer dynamic import pattern — not optional, required:

```typescript
// Layer 1: PDFViewerCore.tsx — actual react-pdf components
// THIS FILE must be "use client" and must set workerSrc locally
'use client';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set workerSrc IN THIS SAME FILE — not in a separate module
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Layer 2: PDFViewer.tsx — wrapper that disables SSR
import dynamic from 'next/dynamic';
const PDFViewerCore = dynamic(() => import('./PDFViewerCore'), { ssr: false });
export default function PDFViewer(props) { return <PDFViewerCore {...props} />; }

// Layer 3: next.config.ts — prevent canvas binary from breaking webpack
// and exclude pdfjs from server bundle
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  serverExternalPackages: ['pdfjs-dist'], // Next.js 15+
};
```

**Warning signs:**
- `TypeError: Promise.withResolvers is not a function` during `next build`
- `Can't resolve 'pdfjs-dist/build/pdf.worker.min.mjs'` in webpack output
- PDF component renders in dev but deployment fails
- Blank PDF area on production with no console error (worker failed silently)
- Vercel deployment logs show function bundle approaching 250 MB

**Phase to address:** PDF Viewer phase — isolate this from the storage phase to contain the webpack complexity.

---

### Pitfall 3: Supabase Storage RLS Left Open or Blocking All Access

**What goes wrong:**
Two opposite failure modes on the same bucket:

(a) **Too open:** No RLS policies on the bucket (or RLS disabled) — any authenticated user can read any other user's bank statements by constructing the storage path. Financial data exposed.

(b) **Too closed:** RLS enabled but no policies created — every upload and download returns a 403 error. No data can be written or read. Manifests as mysterious "Unauthorized" errors that look like auth bugs.

A 2025 security audit found that 83% of exposed Supabase databases involved RLS misconfigurations.

**Why it happens:**
The Supabase Dashboard SQL editor runs as the postgres superuser, which bypasses all RLS. Developers test their queries in the dashboard, see correct results, deploy, and discover real users get 403 errors or cross-user access. Storage bucket RLS policies are configured separately from database table RLS and require distinct SQL policies scoped to `storage.objects`.

**How to avoid:**
Create explicit RLS policies scoped to the user's own folder path before writing any upload code. The convention `userId/...` as the path prefix makes the policy simple:

```sql
-- Enable RLS on storage.objects (required first)
-- This is done via the Supabase Dashboard Storage settings or:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to upload only to their own folder
CREATE POLICY "users upload own statements"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'statements' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read only their own statements
CREATE POLICY "users read own statements"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'statements' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete only their own statements
CREATE POLICY "users delete own statements"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'statements' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

Test RLS by creating two separate authenticated Supabase clients with two different user sessions and attempting cross-user read — do not test from the dashboard.

**Warning signs:**
- All storage operations succeed in testing with the service role key — test switched to anon key reveals 403
- No RLS policies listed in Supabase Dashboard > Storage > Policies
- User A can construct a URL for User B's PDF and view it
- All uploads return 403 in production but not in local dev (service role vs authenticated client)

**Phase to address:** Storage Foundation phase — configure RLS before writing any upload code. This is a security-first decision.

---

### Pitfall 4: Storage File and Database Record Get Out of Sync

**What goes wrong:**
The upload flow requires two steps that must both succeed: (1) file uploaded to Supabase Storage, (2) database record created in `import_audits` (or a new `statements` table). If step 1 succeeds and step 2 fails due to a network blip, validation error, or DB timeout, you get an orphaned file in S3 with no database reference. Conversely, if the database record is written first and storage upload fails, the DB shows a record pointing to a non-existent file. Neither failure is automatically cleaned up.

**Why it happens:**
Storage and database are separate systems. Supabase does queue an internal `ObjectAdminDelete` event if the S3 upload commits but the `storage.objects` row fails (internal storage consistency), but this does not cover failures in your application code's database write. The supabase-js client does not support cross-service transactions.

**How to avoid:**
Upload-then-record protocol with explicit compensating action on DB failure:

```typescript
async function uploadAndRecord(file: File, userId: string) {
  const path = `${userId}/${generateStatementPath(file)}`;

  // Step 1: Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('statements').upload(path, file);
  if (uploadError) throw uploadError; // Safe: nothing written yet

  // Step 2: Write database record
  const { error: dbError } = await db.insert(importAudits).values({
    storagePath: path,
    userId,
    fileHash: await computeSHA256(file),
    // ...
  });

  // Step 3: Compensate if DB write failed
  if (dbError) {
    // Clean up the orphaned storage file
    await supabase.storage.from('statements').remove([path]);
    throw dbError;
  }
}
```

Additionally: build a periodic cleanup cron that queries `storage.objects` for files with no matching `import_audits.storage_path` and removes them via the Storage API. **Never delete storage files via SQL `DELETE FROM storage.objects`** — this leaves the S3 object intact (orphaned at the S3 level) while only removing the metadata row.

**Warning signs:**
- Storage bucket size grows faster than database record count
- Users see entries in the vault UI that return 404 when clicked
- DB write failure error logs with no corresponding storage cleanup log
- Orphaned file count in storage grows over time

**Phase to address:** Storage Foundation phase — design the upload protocol correctly from day one; retrofitting compensating logic is error-prone.

---

### Pitfall 5: Signed URL Expiry Breaks the Vault UI After the Tab Has Been Open

**What goes wrong:**
Private bucket files require signed URLs to serve. Signed URLs expire (the default is 1 hour, configurable). The vault UI fetches signed URLs when the page loads and stores them in React state or TanStack Query's cache with its default 1-minute stale time. A user opens the vault, browses statements, leaves the tab open for 90 minutes, comes back, and clicks a PDF — the URL is expired and the viewer shows a blank page or a 400 error. The URL string in state still looks valid; no obvious indicator.

An additional quirk: `createSignedUrl()` generates a different signature each time it is called, which means HTTP-level `If-None-Match` caching does not work — every call generates a fresh round-trip to Supabase, even for the same file.

**Why it happens:**
Signed URLs are the correct security mechanism for private bucket files. But developers fetch them eagerly for the entire vault list (to avoid delays on click) and cache them alongside other data. The expiry is invisible to application state management.

**How to avoid:**
Generate signed URLs on-demand (at the moment of user action) rather than eagerly for the entire vault list. The vault list page stores only the `storagePath` from the database. A signed URL is generated only when the user clicks "View" or "Download":

```typescript
// WRONG: pre-fetch signed URLs for all visible files
const vaultItems = useQuery(['vault'], async () => {
  const files = await fetchStatements(); // Returns storagePaths
  return Promise.all(files.map(f =>
    supabase.storage.from('statements').createSignedUrl(f.storagePath, 3600)
  ));
});

// CORRECT: generate signed URL only when user acts
async function handleViewStatement(storagePath: string) {
  const { data, error } = await supabase.storage
    .from('statements')
    .createSignedUrl(storagePath, 3600); // 1-hour URL
  if (error) throw error;
  openPDFViewer(data.signedUrl);
}
```

If the PDF viewer needs to hold the URL for a session, add a refresh mechanism that detects 400 responses and re-fetches the signed URL automatically.

**Warning signs:**
- Users report "PDF won't load" intermittently — especially after leaving the app open
- 400/403 errors in browser console on Supabase storage URLs
- Errors appear only hours after page load, not on first visit
- Refreshing the page fixes the problem

**Phase to address:** PDF Viewer / Vault UI phase — this must be a design decision before the URL-fetching logic is built.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Proxy PDF bytes through Next.js API route (not signed URL) | Simpler auth check in one place | Hits 4.5 MB Vercel body limit; latency doubles; costs compute | Never |
| Public bucket instead of private + signed URLs | No URL generation code | Bank statements publicly accessible by URL, no revocation possible | Never for financial data |
| Store signed URLs in database column | Avoids generating at read time | URLs expire; stale column values; if leaked, cannot revoke | Never |
| Store signed URLs in TanStack Query with default staleTime | Fewer API calls | Expired URLs silently fail after 1 hour | Never — generate on-demand |
| Skip file hash before upload | Simpler upload flow | Users re-upload same statement, trigger duplicate AI extraction, waste storage quota | Acceptable in MVP if storage is low; add hash check when adding bulk upload |
| Use `import_audit.id` as the storage file path | Simple unique mapping | UUID paths give no human-readable debugging info | Acceptable — but `userId/YYYY-MM/statementId.pdf` is better for ops |
| Delete storage files via SQL `DELETE FROM storage.objects` | Familiar SQL pattern | S3 object persists; orphaned at S3 level; storage bill grows | Never — always use the Storage API |
| Load all PDF pages simultaneously in viewer | Simpler component | Multi-page bank statements (20-50 pages) freeze or crash browser tab | Never — paginate from page 1, load pages on demand |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Storage + existing `/api/import` route | Extend existing route to also receive and store the PDF | Client uploads directly to storage via signed URL; server route receives only the storage path post-upload |
| Supabase Storage + Drizzle schema | Store `signedUrl` in a database column | Store `storagePath` (e.g., `userId/2025-01/abc.pdf`); generate signed URLs at read time |
| react-pdf + Next.js App Router | Import `react-pdf` in a Server Component or without `ssr: false` | Always wrap in `dynamic(() => import('./...'), { ssr: false })`; set `workerSrc` in the same client component file |
| Supabase Storage + account deletion API | Delete the user from DB, leave storage files | Add storage file cleanup step to account deletion route (`/api/user/delete`) before `db.delete(users)` — this is already identified as a bug in `CONCERNS.md` |
| Supabase Storage + GDPR right-to-erasure | Delete DB record, leave PDF in S3 | Delete storage file first via Storage API, then delete DB record; compensate if DB delete fails |
| Bulk historical upload + existing `import_audits` | Re-process statements already in the database | Check SHA-256 file hash against existing `import_audits.file_hash` before triggering OpenAI extraction; skip known files |
| Supabase Storage RLS + service role key | Use `SUPABASE_SERVICE_ROLE_KEY` for all storage ops — bypasses RLS silently | Use the user's authenticated Supabase client (anon key + user session JWT) for user-scoped storage operations; reserve service role only for admin cron jobs |
| Free tier storage quota | Assume 1 GB is sufficient long-term | 1 GB fits roughly 67-333 statements (3-15 MB each) across all users; design a per-user storage quota warning and a file retention policy from the start |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Generating signed URLs for entire vault list on page load | Vault page takes 3-8s to load with 24 months of statements (24+ Supabase API calls) | Generate signed URLs only on user action (click to view/download) | ~12 files visible in vault |
| Rendering all PDF pages simultaneously in viewer | Browser tab freezes or crashes on 20+ page statements | Render one page at a time; use `pageNumber` state; provide next/prev controls | Bank statements with 20-50 pages |
| Loading PDF as base64 in React state | 5 MB PDF = 6.7 MB in memory; viewer component re-renders with full string | Pass a signed URL string to react-pdf, not the file bytes | Files over 2-3 MB |
| No pagination on vault query | Vault loads 24+ statements with full metadata on every render | Add `limit`/`offset` to vault API; default to 12-24 per page | 24+ months of statements per user |
| No index on `import_audits.storage_path` and `file_hash` | Orphan cleanup cron and duplicate-check queries do full table scans | Add indexes on `storage_path`, `user_id`, `file_hash` at schema creation | Thousands of import records |
| pdfjs-dist included in server bundle | Build size inflates; may approach 250 MB Vercel unzipped limit | Add to `serverExternalPackages` in `next.config.ts` | Always — pdfjs-dist is ~3 MB and has no server use |
| No upload progress feedback | Users submit same file multiple times believing upload froze | Show upload progress using `XMLHttpRequest.upload.onprogress`; react-dropzone supports this | Any file over 1-2 MB on slow connections |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Private bucket without user-scoped RLS | Any authenticated user reads any user's bank statements by constructing the path | `(storage.foldername(name))[1] = auth.uid()::text` RLS policy; test with two separate user sessions |
| Storing signed URLs in database | URLs expire; revocation not possible if URL is leaked before expiry | Store only `storagePath`; generate signed URLs at read time |
| Serving PDF via API route that pipes storage bytes | Exposes to 4.5 MB Vercel limit; route must be perfectly auth-gated or anyone with the URL can access any file | Use storage-generated signed URLs — Supabase enforces auth, not your route |
| No server-side file type validation | Users upload malicious files renamed as `.pdf`; stored and served to the user or other users | Validate MIME type AND check magic bytes (`%PDF` header) server-side before triggering any storage operation |
| Signed upload URL not scoped to the authenticated user's path | Theoretical: user manipulates the path in the signed URL request to write to another user's folder | Always construct the path with `${userId}/...` on the server before calling `createSignedUploadUrl`; never accept path from client |
| No file size check before generating signed URL | User submits 200 MB file; signed URL is generated; upload starts; storage quota exhausted | Check `file.size` client-side AND verify server-side when issuing the signed URL; Supabase free tier maximum is 50 MB per file |
| Bank statement files in public bucket | Statement URLs are shareable, indexable, and not revocable | Always create the bucket with `public: false`; never store financial data in a public bucket |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No upload progress indicator for large PDFs | User believes upload froze; uploads same file multiple times; duplicate records created | Show per-file progress bar using `XMLHttpRequest.upload.onprogress`; react-dropzone exposes this |
| Dual-view (file cabinet / timeline) state not persisted across navigation | User switches to timeline, navigates to a subscription, returns to file cabinet view | Persist active view in localStorage or as a URL search param (`?view=timeline`) |
| No visual status badge on vault cards | User cannot tell if a statement has been processed, is processing, or failed | Display status badge: "Stored" / "Processing" / "Extracted" / "Failed" on each vault entry |
| PDF viewer opens in-page without escape | Mobile users trapped in full-page PDF with no visible close button | Always render the viewer in a modal with a prominent close button; add keyboard `Escape` listener |
| Re-uploading same statement not caught with feedback | User uploads January 2024 statement twice; duplicate AI extraction triggered; duplicate subscriptions created | Check SHA-256 hash before upload; display "Already uploaded — [link to existing entry]" message |
| Bulk upload shows no per-file status | User uploads 12 statements; 3 fail silently; user unaware | Show per-file status in the upload queue: queued / uploading / success / failed with error message |
| File cabinet view shows files with no bank/source label | User has 24 PDFs with no indication which bank they belong to | Require bank/source label at upload time; display prominently in vault grid |
| Vault loads slowly on first visit | User sees empty state or spinner for several seconds | Implement skeleton loading (shadcn/ui Skeleton) for vault cards while metadata loads; signed URL generation happens only on click |

---

## "Looks Done But Isn't" Checklist

- [ ] **Storage upload:** Works in dev with 1 MB test PDF — verify with a real 8-15 MB multi-page bank statement in a Vercel preview deployment
- [ ] **Vercel body limit:** Upload succeeds through the current flow — verify the upload path bypasses the server function entirely (confirm via Vercel function logs showing no body received for large files)
- [ ] **RLS policies:** Storage operations work in dashboard testing — verify by creating two Supabase client instances with two different user JWTs and attempting cross-user read (should return 403)
- [ ] **PDF viewer build:** Component renders in development — run `next build` and check for webpack errors related to pdfjs before any deployment
- [ ] **PDF viewer pages:** Renders page 1 — verify with a 30-page statement; verify page navigation controls work; verify no browser crash
- [ ] **Signed URL expiry:** PDF loads on first click — generate a signed URL, wait 90 minutes (or test with a 10-second expiry URL), attempt to load; confirm graceful error message and re-fetch
- [ ] **Account deletion:** User removed from DB — check Supabase Storage dashboard after deleting a test account to confirm storage files were also removed
- [ ] **Upload failure compensation:** Upload completes normally — simulate a forced DB write failure after a successful storage upload; verify the orphaned file is deleted from storage
- [ ] **Duplicate detection:** New upload accepted — upload the exact same PDF file a second time; confirm hash check catches it and shows the correct feedback
- [ ] **Bulk upload partial failure:** All 5 test files upload successfully — upload a batch where 1 file is corrupt; verify the other 4 still succeed and per-file status reflects the failure accurately
- [ ] **Free tier capacity:** Uploads work now — calculate: 24 months x average statement size (5-10 MB) x expected user count; 1 GB free tier is roughly 100-200 statements across all users at 5-10 MB each
- [ ] **Mobile PDF viewer:** Looks correct on desktop — verify on a 375 px wide viewport; PDF.js canvas does not auto-scale to mobile width by default and requires explicit width configuration

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Orphaned storage files (file in S3, no DB record) | LOW | Query `storage.objects` LEFT JOIN `import_audits` on `storage_path`; call `supabase.storage.from('statements').remove([path])` for unmatched entries via cron or one-off script |
| Expired signed URL in viewer | LOW | Add error handler in the PDF viewer that automatically calls `createSignedUrl` again on 400/403 response and retries load |
| RLS too permissive discovered post-launch | MEDIUM | Immediately add restrictive policies; audit Supabase Storage access logs for unauthorized reads; notify affected users if cross-user access occurred |
| react-pdf build failure after Next.js upgrade | MEDIUM | Pin `react-pdf` to last-known-good version; check the `wojtekmaj/react-pdf` GitHub issues for the Next.js version combination; as a fallback, render PDF in an `<iframe>` with the signed URL (no webpack issues, but limited UI control) |
| Storage approaching 1 GB free tier limit | MEDIUM | Add per-user storage usage display; implement file retention/deletion UI so users can manage their vault; upgrade to Supabase Pro ($25/mo, 100 GB) if needed |
| Vercel 4.5 MB body limit blocking real PDF uploads | HIGH if existing flow was used | This requires an architectural change — cannot be patched with configuration. Must refactor to signed upload URL pattern. Mitigation: deploy the fix as emergency, use Supabase Storage resumable upload URL for interim period |
| Duplicate AI extractions from re-uploaded statements | MEDIUM | Add `file_hash` column to `import_audits`; backfill by hashing existing stored files via a migration script; add unique constraint on `(user_id, file_hash)` going forward |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vercel 4.5 MB body limit on uploads | Storage Foundation (Phase 1 of milestone) | Upload a real 10 MB bank statement; confirm no 413 error; confirm Vercel function logs show no large body |
| Supabase Storage RLS misconfiguration | Storage Foundation (Phase 1) | Test with two user accounts; confirm cross-user read returns 403 |
| Storage-database split-brain on failure | Storage Foundation (Phase 1) | Simulate DB write failure after storage upload; verify file is cleaned up from storage |
| react-pdf webpack/SSR build failures | PDF Viewer phase (isolated from storage phase) | Run `next build` after adding react-pdf; zero webpack errors related to pdfjs |
| pdfjs-dist inflating server function bundle | PDF Viewer phase | Check function bundle size after adding react-pdf; confirm `serverExternalPackages` is set |
| Signed URL expiry in vault UI | PDF Viewer / Vault UI phase | Generate URL, simulate expiry, attempt load; confirm graceful error handling and re-fetch |
| Orphaned files on account deletion | Storage Foundation or Account Management phase | Delete test account; check storage bucket in Supabase dashboard for remaining files |
| Duplicate re-uploads triggering redundant AI extraction | Bulk Upload / Historical Upload phase | Upload same PDF twice; confirm second upload is caught by file hash and blocked with feedback |
| No per-file status in bulk upload | Bulk Upload / Historical Upload phase | Upload 5 files where 1 is deliberately invalid; verify other 4 succeed with clear per-file status |
| GDPR right-to-erasure for bank statement PDFs | Storage Foundation (design decision: retain path for deletion) | Document deletion cascade; verify deleting a user removes their storage files |
| Free tier storage quota exhaustion | Monitoring / Vault Management phase | Build storage usage query; alert when approaching 800 MB (80% of 1 GB) |

---

## Sources

**Official documentation (HIGH confidence):**
- [Vercel Functions Limits — 4.5 MB body limit, 300s timeout, 2 GB memory confirmed](https://vercel.com/docs/functions/limitations)
- [Supabase Storage File Size Limits — 50 MB max per file on free tier, 1 GB total storage](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase Storage Access Control / RLS — official policy examples](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase create signed upload URL — API reference](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
- [Supabase Storage Bandwidth — 10 GB/month free tier egress (5 GB cached + 5 GB uncached)](https://supabase.com/docs/guides/storage/serving/bandwidth)
- [Supabase Delete Objects — must use Storage API, not SQL DELETE](https://supabase.com/docs/guides/storage/management/delete-objects)

**GitHub issues (MEDIUM-HIGH confidence — multiple corroborating reports):**
- [react-pdf + Next.js 14: Promise.withResolvers build failure (vercel/next.js #70239)](https://github.com/vercel/next.js/issues/70239)
- [react-pdf worker path resolution in App Router (wojtekmaj/react-pdf #1855)](https://github.com/wojtekmaj/react-pdf/issues/1855)
- [Supabase orphaned files — objects deleted via SQL leave S3 intact (Discussion #34254)](https://github.com/orgs/supabase/discussions/34254)
- [Supabase Storage transaction atomicity (Discussion #19895)](https://github.com/orgs/supabase/discussions/19895)
- [Signed URL different signature each call — caching implications (Discussion #7626)](https://github.com/orgs/supabase/discussions/7626)

**Community articles (MEDIUM confidence — verified against official docs):**
- [Bypass Vercel 4.5 MB limit using Supabase direct upload](https://medium.com/@jpnreddy25/how-to-bypass-vercels-4-5mb-body-size-limit-for-serverless-functions-using-supabase-09610d8ca387)
- [Signed URL uploads with Next.js and Supabase](https://medium.com/@olliedoesdev/signed-url-file-uploads-with-nextjs-and-supabase-74ba91b65fe0)
- [Next.js PDF viewer with React-PDF and Nutrient SDK — three-layer pattern](https://www.nutrient.io/blog/how-to-build-a-nextjs-pdf-viewer/)

**Security research (MEDIUM confidence):**
- [Supabase RLS — 83% of exposed databases involve RLS misconfigurations (2025)](https://designrevision.com/blog/supabase-row-level-security)
- [Supabase Storage RLS policy violation on admin upload](https://www.technetexperts.com/supabase-storage-rls-admin-upload-fix/)

---
*Pitfalls research for: Financial Data Vault (PDF blob storage + in-app viewer + vault UI added to existing Vercel-deployed Next.js + Supabase subscription manager)*
*Researched: 2026-02-19*
