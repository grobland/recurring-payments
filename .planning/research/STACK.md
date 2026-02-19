# Stack Research

**Domain:** Financial Document Vault — PDF blob storage, in-app viewing, dual-view vault UI
**Researched:** 2026-02-19
**Confidence:** HIGH (core additions verified), MEDIUM (worker config patterns, community-sourced)

---

## Context: What Already Exists

The project uses `postgres` directly for database queries (Drizzle ORM) and has **no
`@supabase/supabase-js` client installed**. The `statements` table already has a
`pdf_storage_path` column (nullable `text`) ready to receive Supabase Storage paths.
PDFs are currently processed in-memory and discarded — v2.2 adds permanent storage.

**Critical infrastructure constraint:** Vercel serverless functions have a **4.5 MB
hard body size limit**. Bank statement PDFs regularly exceed this. The upload flow must
bypass the Next.js API layer and write directly from the browser to Supabase Storage
using a signed upload URL pattern.

---

## Recommended Stack Additions

### Core Technologies (New)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@supabase/supabase-js` | `^2.97.0` | Supabase Storage: upload, signed URLs, download | The only official SDK for Supabase Storage. The project uses `postgres` directly for DB (no supabase-js needed there), but Storage has no postgres-compatible alternative — supabase-js is required. Bundles storage-js internally. |
| `react-pdf` | `^10.3.0` | In-app PDF rendering (canvas-based, no iframe) | Most-maintained open source PDF renderer for React. v10 supports React 19, pdfjs-dist 5.x, and confirmed Next.js App Router compatibility (requires Next.js >=14.1.1; project is on 16.1.4). Renders in `<canvas>` — no iframe, no browser chrome, no CORS issues with signed blob URLs. |

### Supporting Libraries (None New)

The vault UI requires no additional libraries beyond the two above. Everything else is
already installed:

| Capability | Already Available | Package |
|------------|------------------|---------|
| Dual-view tabs (file cabinet / timeline) | `@radix-ui/react-tabs` | Installed via `radix-ui ^1.4.3` |
| Virtualized file list | `@tanstack/react-virtual` | `^3.13.18` already installed |
| Drag-and-drop upload | `react-dropzone` | `^14.3.8` already installed |
| PDF download button | Native `URL.createObjectURL + <a download>` | No library needed; file-saver is a legacy polyfill |
| Date grouping for timeline view | `date-fns` | `^4.1.0` already installed |
| File hash for deduplication | Custom SHA-256 util | Already in `/lib/utils/file-hash.ts` |

---

## Installation

```bash
# Exactly two new packages
npm install @supabase/supabase-js react-pdf
```

`pdfjs-dist` (react-pdf's rendering engine) installs automatically as a dependency of
react-pdf at version 5.4.x. Do NOT install it separately — react-pdf pins a compatible
version.

---

## Environment Variables to Add

```bash
# Add to .env.local and .env.example
# Supabase Storage client (separate from DATABASE_URL which stays as-is for Drizzle)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon key — safe to expose in browser]"
SUPABASE_SERVICE_ROLE_KEY="[service role key — server-side ONLY, never NEXT_PUBLIC_]"
```

`DATABASE_URL` continues to serve Drizzle. The Supabase JS client only touches Storage,
not the Postgres database directly.

---

## Integration Patterns

### Pattern 1: Two Supabase Clients

Create separate clients for server vs. client contexts. Never use the service role key
in browser code.

```typescript
// src/lib/supabase/server.ts  (server components, API routes)
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Bypasses RLS — trusted server ops only
  );
}

// src/lib/supabase/client.ts  (browser — upload only)
import { createClient } from "@supabase/supabase-js";

export const supabaseBrowserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // RLS-governed, safe for browser
);
```

### Pattern 2: Upload Flow (Bypassing the 4.5 MB Vercel Limit)

Direct-to-storage upload via signed URL. File never passes through the Next.js
serverless function body.

```
Browser
  1. Hash PDF client-side → POST /api/batch/check-hash  (existing)
  2. POST /api/statements/create-upload-url  (NEW)
     → Server: auth check, create statement record (pending)
     → Server: supabase.storage.createSignedUploadUrl(path, 7200)
     → Returns { signedUrl, token, storagePath }
  3. Browser: supabaseBrowserClient.storage.uploadToSignedUrl(
       "statements", storagePath, token, file
     )
     → Writes directly from browser to Supabase Storage bucket
     → Zero serverless function body involvement
  4. Browser: POST /api/batch/process  (existing — receives PDF from Storage)
     → Server reads file: supabase.storage.download(storagePath)
     → Processes with pdf2json + OpenAI
     → Updates statements.pdf_storage_path via Drizzle
```

### Pattern 3: PDF Viewer Setup (react-pdf + Next.js)

The PDF viewer component must be a client component loaded with `ssr: false`. The
worker must be configured in the same module that renders `<Document>` / `<Page>`.

```typescript
// src/components/vault/PdfViewer.tsx
"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker must be configured HERE, not in a separate file
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  return (
    <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
      {Array.from({ length: numPages }, (_, i) => (
        <Page key={i + 1} pageNumber={i + 1} width={600} />
      ))}
    </Document>
  );
}
```

```typescript
// Consume with dynamic import — prevents SSR crash
// src/components/vault/PdfViewerLazy.tsx
import dynamic from "next/dynamic";

export const PdfViewerLazy = dynamic(
  () => import("./PdfViewer").then((m) => m.PdfViewer),
  { ssr: false, loading: () => <PdfViewerSkeleton /> }
);
```

No `next.config.ts` webpack changes needed — the ES module `import.meta.url` worker
reference is resolved correctly by Next.js 16's bundler.

Add `canvas` to `serverExternalPackages` if server-side PDF operations fail (typically
only needed if server-side rendering of PDF pages is attempted):

```typescript
// next.config.ts — only if needed
serverExternalPackages: ["pino", "pino-pretty"],  // canvas omitted unless needed
```

### Pattern 4: Serving PDFs (Signed URL for Viewer)

PDFs live in a private bucket. Never expose storage paths directly. Generate 5-minute
signed URLs server-side after auth + ownership checks.

```typescript
// src/app/api/statements/[id]/pdf-url/route.ts  (NEW)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership via Drizzle (not Supabase)
  const statement = await db.query.statements.findFirst({
    where: and(eq(statements.id, params.id), eq(statements.userId, session.user.id)),
    columns: { pdfStoragePath: true },
  });

  if (!statement?.pdfStoragePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("statements")
    .createSignedUrl(statement.pdfStoragePath, 300);  // 5-minute expiry

  if (error) return NextResponse.json({ error: "Storage error" }, { status: 500 });

  return NextResponse.json({ signedUrl: data.signedUrl });
}
```

---

## Supabase Storage Bucket Configuration

**Bucket name:** `statements`
**Access mode:** Private (not public — never expose files without auth)
**Max file size:** 50 MB (matches existing `MAX_FILE_SIZE` constant in batch/upload)
**Allowed MIME types:** `application/pdf` only

**Storage path convention:** `{userId}/{statementId}.pdf`
Maps directly into `statements.pdf_storage_path` (already in schema as nullable text).

**RLS policies (SQL — run in Supabase Dashboard SQL editor):**

```sql
-- Users can upload only to their own userId folder
create policy "Users upload own statements"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'statements'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

-- Users can read only their own files
create policy "Users read own statements"
on storage.objects for select
to authenticated
using (
  bucket_id = 'statements'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

-- Users can delete their own files
create policy "Users delete own statements"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'statements'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);
```

Note: The server client uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS.
The browser client uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` and is governed by these
policies. The path-based approach (`foldername(name)[1] = auth.uid()`) is the
canonical Supabase pattern for per-user file isolation.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Routing PDF uploads through Next.js API route body | Vercel 4.5 MB hard limit on serverless function bodies; bank statements exceed this regularly | Signed upload URL → direct browser-to-Supabase upload |
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | Exposes service role to browser, bypassing all RLS and granting any user full storage access | `SUPABASE_SERVICE_ROLE_KEY` (no NEXT_PUBLIC_ prefix) — server only |
| `pdfjs-dist` installed separately | react-pdf pins a compatible version; installing separately risks version mismatch causing silent render failures or CORS errors with the worker | Let react-pdf manage pdfjs-dist as a transitive dependency |
| `@supabase/storage-js` installed separately | Already bundled inside `@supabase/supabase-js` — installing separately adds nothing | `@supabase/supabase-js` only |
| `@supabase/auth-helpers-nextjs` | Deprecated; project uses NextAuth (not Supabase Auth) — auth helpers are irrelevant | NextAuth session + custom Supabase admin client |
| `<iframe src={signedUrl}>` for PDF viewing | Browser adds its own PDF toolbar/chrome breaking vault UI; CORS headers on signed URLs can block iframes | `react-pdf` canvas-based rendering |
| Storing PDF blobs in Postgres `bytea` | Column size limits, backup bloat, no CDN delivery, no streaming support | Supabase Storage (S3-backed with global CDN) |
| `file-saver` for download | Legacy polyfill for old browsers; modern targets (React 19 / Next.js 16) support native `URL.createObjectURL + <a download>` pattern natively | Native blob URL download |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `react-pdf` (wojtekmaj) | `@pdf-viewer/react` | Commercial/paid for production use; react-pdf is fully open source and sufficient for read-only vault display |
| `react-pdf` (wojtekmaj) | Raw `pdfjs-dist` directly | react-pdf is a maintained React wrapper — using pdfjs-dist directly adds significant boilerplate with no benefit |
| Supabase Storage | Vercel Blob | Project is already on Supabase infrastructure; Vercel Blob adds a second vendor for the same capability with no advantage |
| Supabase Storage | AWS S3 direct | S3 requires additional SDK, IAM setup, credential rotation — Supabase Storage is already provisioned with the project |
| Signed URL (5 min expiry) | Public bucket URLs | Public URLs expose all user financial documents without authentication; signed URLs enforce auth per-request |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `react-pdf@10.3.0` | React `^19.2.3`, Next.js `16.1.4` | v10 explicitly supports React 19 peer dep; Next.js compatibility confirmed >=14.1.1 |
| `react-pdf@10.3.0` | `pdfjs-dist@5.4.624` | Pinned automatically as dependency |
| `react-pdf@10.3.0` | `pdf2json@4.0.2` (existing) | No conflict — react-pdf handles client rendering, pdf2json handles server text extraction |
| `react-pdf@10.3.0` | `@tanstack/react-virtual@3.13.18` | No conflict; virtual scrolling applies to file list, not the PDF canvas renderer |
| `@supabase/supabase-js@2.97.0` | Node.js 18+, browser ESM | Works in both API routes and browser; no SSR gotchas for storage-only usage |
| `@supabase/supabase-js@2.97.0` | `postgres@3.4.8` (existing Drizzle) | No conflict — supabase-js is storage-only; postgres client remains the DB transport |

---

## Stack Patterns by Variant

**If PDF files regularly exceed 6 MB:**
- Use Supabase resumable uploads (TUS protocol via `tus-js-client`) instead of `uploadToSignedUrl`
- Because the standard signed upload URL approach may time out on slow connections for large files
- Note: Most bank statements are under 6 MB; start with standard signed URL and add resumable if monitoring shows failures

**If the vault file list grows beyond ~500 items per user:**
- Already handled — `@tanstack/react-virtual` is installed and virtualizes any list
- No additional setup needed

**If multi-page PDFs need in-vault scrolling:**
- Use react-pdf's `<Page>` in a `@tanstack/react-virtual` container
- Lazy-load pages only as they enter the viewport (react-pdf supports this natively via `<Document onLoadSuccess>` + per-page rendering)
- Do NOT pre-render all pages on mount — a 200-page statement would allocate hundreds of canvas elements

**If the Supabase project uses Supabase Auth (it does not — uses NextAuth):**
- The signed URL approach would integrate with `supabase.auth.getSession()` instead
- This project keeps NextAuth for auth and uses Supabase service role server-side; the browser upload uses anon key with path-based RLS

---

## Sources

- `npm view react-pdf version` → `10.3.0` — verified 2026-02-19 (HIGH confidence)
- `npm view @supabase/supabase-js version` → `2.97.0` — verified 2026-02-19 (HIGH confidence)
- `npm view pdfjs-dist version` → `5.4.624` — verified 2026-02-19 (HIGH confidence)
- [react-pdf GitHub (wojtekmaj/react-pdf)](https://github.com/wojtekmaj/react-pdf) — Next.js App Router worker setup, React 19 peer dep confirmation (HIGH confidence)
- [Supabase Docs: createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) — signed upload URL pattern (HIGH confidence)
- [Supabase Docs: Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — RLS path-based policy SQL with `storage.foldername()` (HIGH confidence)
- [Supabase Docs: File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) — 50 MB free tier limit, 500 GB Pro (HIGH confidence)
- [Vercel KB: Bypass 4.5 MB body limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — confirmed hard limit for serverless functions (HIGH confidence)
- Codebase: `src/app/api/batch/upload/route.ts` — existing `MAX_FILE_SIZE = 50MB` constant, confirms 50MB intended limit (HIGH confidence)
- Codebase: `src/lib/db/schema.ts` — `statements.pdf_storage_path` already exists as nullable text (HIGH confidence)
- WebSearch: react-pdf v10 Next.js worker config patterns, multiple community sources — confirmed consistent with official docs (MEDIUM confidence)

---

*Stack research for: Financial Data Vault — PDF Blob Storage + In-App Viewer + Vault UI*
*Researched: 2026-02-19*
