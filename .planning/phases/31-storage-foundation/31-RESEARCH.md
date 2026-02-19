# Phase 31: Storage Foundation - Research

**Researched:** 2026-02-19
**Domain:** Supabase Storage, Next.js API routes, batch import pipeline
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### File organization
- Bucket path structure: `{user-id}/{year-month}/{source-date}.pdf` (e.g., `abc123/2026-01/chase-2026-01.pdf`)
- File naming convention: `{source}-{date}.pdf` — clean, readable, grouped by month
- Re-uploads for same source+month silently replace the existing file (latest wins)
- Bucket is fully private — all access via signed URLs with expiry only

#### Legacy statement indicator
- "No file stored" indicator appears inline on statement detail/row — visible when browsing
- Both states visible: green file icon for "PDF stored", muted/gray file icon for "No file stored"
- For now, indicator is informational only — becomes a clickable upload prompt once Phase 34 ships

#### Upload feedback
- "Storing PDF..." shown as a separate visible step in the import progress flow
- On storage failure: yellow warning in import results — "PDF could not be stored — subscriptions imported successfully"
- On success: import results include "PDF stored successfully" confirmation
- Import results include a "View PDF" link for immediate access to the stored file

#### Storage guardrails
- Maximum file size: 10 MB per PDF
- No per-user storage quota for now — revisit if costs become an issue
- MIME type validation: verify file is actually a PDF before storing (not just .pdf extension)
- Oversized files (>10 MB): import continues, storage skipped — same as storage failure pattern

#### Visual representation
- PDF icon with status badge on statement rows in the list
- Stored state: green file icon — indicates original PDF is safely stored
- Not-stored state: muted/gray file icon — same icon shape, clearly different state
- Clicking the icon does nothing in Phase 31 — Phase 32 adds the in-app viewer on click

### Claude's Discretion
- Exact icon choice and sizing within the statement row
- Prominence level of the "No file stored" indicator (subtle vs noticeable)
- Signed URL expiry duration
- Progress step animation/design during import
- Exact wording of success/warning messages in import results

### Deferred Ideas (OUT OF SCOPE)
- Per-user storage quotas tied to billing tiers — revisit if storage costs matter
- Download on click for stored PDFs — Phase 32 handles viewing/downloading
- Upload prompt on "No file" indicator — Phase 34 Coverage & Historical Upload
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STOR-01 | User's uploaded PDFs are persisted in Supabase Storage during batch import | Supabase Storage JS client upload API; service role client for server-side upload; upsert for silent replace; non-fatal error handling pattern |
| STOR-02 | Pre-vault statements display a "No file stored" indicator when PDF is unavailable | `pdfStoragePath` column already nullable in schema; `StatementRow` and `StatementDetail` components identified as touch points; icon toggle pattern from Lucide |
</phase_requirements>

---

## Summary

Phase 31 wires Supabase Storage into the existing batch import pipeline. The infrastructure is already 90% in place: the `statements` table has a nullable `pdfStoragePath` column, the `/api/batch/upload` route has a `// TODO: In future, upload PDF to Supabase Storage here` comment, and the batch import hook already holds the `File` object in memory when it reaches the upload step. This phase fills that gap.

The main engineering work is: (1) creating and configuring the private Supabase Storage bucket, (2) building a service-role client for server-side uploads that bypasses RLS, (3) modifying `/api/batch/upload` to upload the PDF buffer and write the path back to `pdfStoragePath`, and (4) surfacing the `hasPdf` boolean in the statement list/detail UI via a green/gray icon toggle. The signed URL generation for the "View PDF" link belongs to a new thin API endpoint called at import-result time, not pre-baked into list queries.

Storage failures are strictly non-fatal: the upload route catches errors, logs them, and returns the statement ID with `pdfStoragePath = NULL`. The import pipeline continues normally. This pattern is already established in the codebase for processing errors and is easy to replicate.

**Primary recommendation:** Upload the PDF buffer in `/api/batch/upload` using a pre-initialized service-role Supabase client with `upsert: true`; generate the signed URL in a separate lightweight endpoint called from the import-results step when the user clicks "View PDF."

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.80.0 (latest) | Supabase Storage client — upload, signed URL | Official SDK; handles auth headers, error shapes, and retry logic |
| Supabase Storage (bucket) | N/A (cloud service) | Private object store for PDFs | Already the project's database provider; no new vendor |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | already installed | `FileText`, `File` icons for PDF status indicator | Use existing icon set — no new dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Storage service-role upload | Signed upload URL from client | Client-side upload avoids Vercel body limit, but requires two-hop UX and exposes more complexity. Prior decisions locked server-side upload from existing buffer. |
| `upsert: true` for silent replace | Delete + re-upload | Delete then upload risks window where file is missing; upsert is atomic at the object level. |

**Installation:**

```bash
npm install @supabase/supabase-js
```

`@supabase/supabase-js` is not currently in `package.json`. The project uses Supabase for its Postgres database via the `postgres` driver and Drizzle ORM, **not** the Supabase JS client. Installing it is the first action required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── supabase/
│   │   └── server.ts          # Service-role client (server-only, never NEXT_PUBLIC_)
│   └── storage/
│       └── pdf-storage.ts     # uploadStatementPdf(), generatePdfSignedUrl() helpers
├── app/
│   └── api/
│       ├── batch/
│       │   └── upload/
│       │       └── route.ts   # Modified: adds storage upload + pdfStoragePath write
│       └── statements/
│           └── [id]/
│               ├── route.ts   # Existing: GET statement detail
│               └── pdf-url/
│                   └── route.ts  # New: GET signed URL on demand
```

### Pattern 1: Service-Role Supabase Client

**What:** A module-level singleton client that uses `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix). Auth session management is disabled because this runs only server-side and never handles user sessions.

**When to use:** Any server-side route that needs to upload or access storage bypassing RLS (the storage service itself enforces path-based isolation via the upload path `{user-id}/...`).

**Example:**

```typescript
// src/lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa
import { createClient } from '@supabase/supabase-js';

// Singleton — re-use across requests in the same worker
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
```

**Critical:** `SUPABASE_SERVICE_ROLE_KEY` must NOT have `NEXT_PUBLIC_` prefix — it must never reach the browser.

### Pattern 2: Buffer Upload with Upsert

**What:** Convert the `File` (from `request.formData()`) to an `ArrayBuffer` then `Buffer`, then upload to the private bucket with `upsert: true`. The path encodes `userId/yearMonth/source-date.pdf`.

**When to use:** In `/api/batch/upload/route.ts` after the statement record is created, before returning the `statementId`.

**Example:**

```typescript
// src/lib/storage/pdf-storage.ts
// Source: https://trigger.dev/docs/guides/examples/supabase-storage-upload
import { supabaseAdmin } from '@/lib/supabase/server';

const BUCKET = 'statements';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadStatementPdf(
  file: File,
  userId: string,
  sourceType: string,
  statementDate: Date
): Promise<{ path: string } | null> {
  // Guard: size check (bucket also enforces, but fail fast)
  if (file.size > MAX_SIZE_BYTES) {
    return null; // caller treats as non-fatal
  }

  // Guard: MIME type (bucket enforces allowedMimeTypes, but validate here too)
  if (file.type !== 'application/pdf') {
    return null;
  }

  // Build path: {userId}/{yyyy-MM}/{source-date}.pdf
  const yearMonth = `${statementDate.getFullYear()}-${String(statementDate.getMonth() + 1).padStart(2, '0')}`;
  const sourceSlug = sourceType.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const dateStr = `${statementDate.getFullYear()}-${String(statementDate.getMonth() + 1).padStart(2, '0')}`;
  const path = `${userId}/${yearMonth}/${sourceSlug}-${dateStr}.pdf`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true, // silent replace for same source+month re-upload
      cacheControl: '3600',
    });

  if (error) {
    console.error('PDF storage upload failed:', error);
    return null; // non-fatal
  }

  return { path };
}
```

### Pattern 3: On-Demand Signed URL

**What:** Generate a signed URL in a dedicated `GET /api/statements/[id]/pdf-url` endpoint, called only when the user clicks "View PDF." Never pre-bake URLs into list responses.

**When to use:** Import results panel "View PDF" link, and later Phase 32 viewer modal trigger.

**Example:**

```typescript
// src/app/api/statements/[id]/pdf-url/route.ts
// Source: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  // Fetch pdfStoragePath from DB, verify ownership
  const statement = await db.query.statements.findFirst({
    where: and(eq(statements.id, id), eq(statements.userId, session.user.id)),
    columns: { pdfStoragePath: true },
  });

  if (!statement?.pdfStoragePath) {
    return NextResponse.json({ error: 'No PDF stored' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('statements')
    .createSignedUrl(statement.pdfStoragePath, 3600); // 1-hour expiry

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
```

### Pattern 4: Non-Fatal Storage Step in Upload Route

**What:** Wrap the upload in try/catch; on failure, log and continue with `pdfStoragePath = null`. Import succeeds regardless.

**When to use:** Everywhere storage is called in the import pipeline.

**Example:**

```typescript
// In /api/batch/upload/route.ts — after DB insert:
let pdfStoragePath: string | null = null;
try {
  const storageResult = await uploadStatementPdf(file, session.user.id, sourceType, new Date());
  if (storageResult) {
    pdfStoragePath = storageResult.path;
    // Write path back to the statement row
    await db.update(statements)
      .set({ pdfStoragePath })
      .where(eq(statements.id, newStatement.id));
  }
} catch (storageErr) {
  console.error('Storage upload failed (non-fatal):', storageErr);
  // pdfStoragePath remains null — import continues
}

return NextResponse.json({
  statementId: newStatement.id,
  status: 'pending',
  pdfStored: pdfStoragePath !== null,
  message: 'Statement created, ready for processing',
});
```

### Pattern 5: hasPdf Boolean in Statement Queries

**What:** Statement list/detail API endpoints select `pdfStoragePath IS NOT NULL as hasPdf` (or expose the raw column). Components render green or gray icon accordingly.

**When to use:** `GET /api/sources/[sourceType]/statements` and `GET /api/statements/[id]`.

**Example:**

```typescript
// In statement query select:
hasPdf: sql<boolean>`(${statements.pdfStoragePath} IS NOT NULL)`.as('has_pdf'),
```

### Anti-Patterns to Avoid

- **Pre-generating signed URLs in list queries:** URLs expire, and list queries cache. Generate on-demand only. The `hasPdf` boolean is the safe stable value to cache.
- **Using NEXT_PUBLIC_ prefix for service role key:** Immediately exposes admin credentials to the browser. Always use `SUPABASE_SERVICE_ROLE_KEY` (server-only).
- **Blocking import on storage failure:** Storage must be non-fatal. Never `throw` from the storage step; always catch and continue.
- **Parsing the `File` body twice:** The existing `upload` route already calls `request.formData()`. Pass the `File` directly — do not re-read the stream.
- **Upsert without SELECT+UPDATE RLS policies:** If RLS is configured on the storage bucket, upsert requires SELECT and UPDATE in addition to INSERT. Service role bypasses this, but if you later add RLS, remember to grant all three.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signed URL with expiry | Custom HMAC token system | `supabaseAdmin.storage.from(bucket).createSignedUrl(path, seconds)` | Supabase handles token signing, key rotation, and validation |
| MIME type validation | Manual byte-level PDF magic number check | Bucket `allowedMimeTypes: ['application/pdf']` + `file.type` guard | Bucket rejects non-PDF at server level; JS guard is a fast fail, not the real defense |
| File size limit | Manual `file.size` check only | Bucket `fileSizeLimit: '10MB'` + JS guard | Bucket enforces the limit even if the JS check is bypassed |
| Retry logic on upload failure | Custom exponential backoff | Treat as non-fatal and skip — no retry needed | Import succeeds without storage; retry would add latency and complexity with no user benefit |
| Path collision prevention | UUID in filename | `upsert: true` at same deterministic path | The path is deterministic by design (same source+month = same path = silent replace is intentional) |

**Key insight:** Supabase Storage handles auth, CDN, MIME validation, and size enforcement at the bucket level. The app's job is to call the right API with the right credentials — not to reimplement storage primitives.

---

## Common Pitfalls

### Pitfall 1: Missing `@supabase/supabase-js` Dependency

**What goes wrong:** `@supabase/supabase-js` is not in the project's `package.json`. The import will fail at runtime.

**Why it happens:** The project uses Supabase for PostgreSQL but accesses it via `postgres` driver + Drizzle ORM, not the Supabase JS client. The Storage API requires the JS client.

**How to avoid:** `npm install @supabase/supabase-js` is step 1 — before any storage code is written.

**Warning signs:** `Cannot find module '@supabase/supabase-js'` at build time.

### Pitfall 2: Service Role Key Exposed as NEXT_PUBLIC_

**What goes wrong:** Adding `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` makes the key visible in the browser bundle, allowing anyone to bypass RLS and read/write all storage objects.

**Why it happens:** Developers confuse the public anon key (which can have `NEXT_PUBLIC_`) with the service role key (which must not).

**How to avoid:** Use `SUPABASE_SERVICE_ROLE_KEY` (no prefix). Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose.

**Warning signs:** Next.js compiler warning about "sensitive env var in client bundle"; or the key appearing in `window.__NEXT_DATA__`.

### Pitfall 3: Upsert RLS Failure for Authenticated Uploads

**What goes wrong:** If bucket RLS is configured for authenticated users (not service role), `upsert: true` fails with `new row violates row-level security policy` because upsert requires SELECT + INSERT + UPDATE permissions — not just INSERT.

**Why it happens:** The Supabase docs note this specific quirk. Most developers configure INSERT-only policies.

**How to avoid:** This phase uses the service role client which bypasses RLS entirely, so it's not an issue here. However, if someone later adds user-scoped RLS policies for Phase 34's upload-from-browser feature, they must add SELECT and UPDATE alongside INSERT.

**Warning signs:** 403 or RLS violation error on upload when `upsert: true`, but not when `upsert: false`.

### Pitfall 4: `pdfStoragePath` Written Before Statement Row Created

**What goes wrong:** The storage upload runs before `db.insert(statements)`, so there's no row to update with the path.

**Why it happens:** Temptation to upload early to avoid holding the PDF bytes in memory during DB operations.

**How to avoid:** Always: (1) insert statement row, (2) upload PDF to storage, (3) update statement row with `pdfStoragePath`. The path can be pre-computed before upload using deterministic naming logic, so it can also be included in the initial insert.

**Warning signs:** `pdfStoragePath` update failing because statement ID doesn't exist yet.

### Pitfall 5: Signed URL Cached in List Queries Expires

**What goes wrong:** If signed URLs are generated in the statement list API and cached by TanStack Query, the URL expires (e.g., after 1 hour) while the cached response is still valid. User clicks "View PDF" and gets a 403.

**Why it happens:** Generated too early, stored in query cache.

**How to avoid:** The `hasPdf: boolean` field goes in the list query. The signed URL is only generated in a dedicated `GET /api/statements/[id]/pdf-url` endpoint, called on demand, never cached beyond the response lifetime.

**Warning signs:** PDF links work initially, then break hours later without re-upload.

### Pitfall 6: Oversized File Blocks Import

**What goes wrong:** The 10 MB check throws an error that propagates up and causes the import to fail.

**Why it happens:** Error not caught; treated as fatal.

**How to avoid:** The size check returns `null` from `uploadStatementPdf()`; the upload route treats `null` as "storage skipped" and continues with `pdfStoragePath = null`. Same pattern as any other storage failure.

**Warning signs:** Files > 10 MB cause `500 Failed to upload file` responses instead of completing import with a warning.

### Pitfall 7: `file.arrayBuffer()` Called After Stream Already Consumed

**What goes wrong:** The `/api/batch/upload` route reads `request.formData()` to get the `File`. If `file.arrayBuffer()` is called after the request body has been processed, it may fail or return empty.

**Why it happens:** The `File` object from `formData.get('file')` in Next.js App Router is a native Web API `File` backed by the request body. In most cases it buffers fine, but this is worth being explicit about.

**How to avoid:** Call `file.arrayBuffer()` before any other async operations that might affect the request lifecycle. In practice: (1) parse formData, (2) immediately call `file.arrayBuffer()`, (3) proceed with DB and storage operations using the buffer.

---

## Code Examples

Verified patterns from official sources:

### Bucket Creation (run once, in a migration or setup script)

```typescript
// Source: https://supabase.com/docs/guides/storage/buckets/creating-buckets
const { data, error } = await supabaseAdmin.storage.createBucket('statements', {
  public: false,
  allowedMimeTypes: ['application/pdf'],
  fileSizeLimit: '10MB',
});
```

### Standard Upload from Buffer

```typescript
// Source: https://trigger.dev/docs/guides/examples/supabase-storage-upload
//         https://supabase.com/docs/guides/storage/uploads/standard-uploads
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

const { data, error } = await supabaseAdmin.storage
  .from('statements')
  .upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
    cacheControl: '3600',
  });

if (error) {
  // Non-fatal: log and continue
  console.error('Storage upload failed:', error.message);
}
```

### Signed URL Generation

```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
const { data, error } = await supabaseAdmin.storage
  .from('statements')
  .createSignedUrl(pdfStoragePath, 3600); // 3600 seconds = 1 hour

if (data?.signedUrl) {
  // Return to client
}
```

### RLS Policies (SQL — applied in Supabase Dashboard or migration)

```sql
-- Source: https://supabase.com/docs/guides/storage/security/access-control
-- Source: https://supabase.com/docs/guides/storage/schema/helper-functions

-- Allow authenticated users to view their own files (for future user-side reads)
CREATE POLICY "Users can select own PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'statements'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to insert their own files (for future user-side upload)
-- Phase 31 uses service role which bypasses this entirely
CREATE POLICY "Users can insert own PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'statements'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE + DELETE for completeness (needed for upsert from user context in Phase 34)
CREATE POLICY "Users can update own PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'statements'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### PDF Status Icon in StatementRow

```tsx
// Lucide icon toggle pattern (Claude's discretion for exact sizing/prominence)
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

function PdfStatusIcon({ hasPdf }: { hasPdf: boolean }) {
  return (
    <FileText
      className={cn(
        'h-4 w-4 shrink-0',
        hasPdf ? 'text-green-500' : 'text-muted-foreground/40'
      )}
      aria-label={hasPdf ? 'PDF stored' : 'No file stored'}
    />
  );
}
```

### File Status Extension in `use-batch-upload.ts`

The `FileStatus` type needs a new `'storing'` status to show "Storing PDF..." as a visible step:

```typescript
export type FileStatus =
  | 'pending'
  | 'hashing'
  | 'checking'
  | 'uploading'
  | 'storing'      // NEW: PDF being persisted to storage
  | 'processing'
  | 'complete'
  | 'error'
  | 'duplicate';
```

And a new config entry in `statusConfig` in `file-item.tsx`:

```typescript
storing: { icon: Loader2, label: 'Storing PDF...', color: 'text-blue-500', animate: true },
```

The upload route response changes: the hook reads `pdfStored: boolean` from the upload response. If `pdfStored === false`, the file item shows a yellow warning after completing.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual S3 integration | Supabase Storage (built-in) | Supabase launched Storage (2021) | Single SDK for DB + Storage; no separate S3 credentials |
| Signed URL in list query | `hasPdf: boolean` in list + on-demand URL | Supabase community best practice (ongoing) | Avoids stale URL problem; list responses remain cacheable |
| Client-side upload via signed upload URL | Server-side upload from buffer | Prior decision (v2.2 research) | Avoids re-POST body issue; keeps file bytes server-side |

**Deprecated/outdated:**
- `@supabase/storage-js` direct: The storage client is now bundled in `@supabase/supabase-js`; no need to install separately.

---

## Current Codebase Touchpoints

Based on codebase inspection:

### Files Modified
| File | What Changes |
|------|-------------|
| `src/app/api/batch/upload/route.ts` | Fill the `// TODO` comment: upload PDF buffer to storage, update `pdfStoragePath`, return `pdfStored` flag |
| `src/lib/hooks/use-batch-upload.ts` | Add `'storing'` to `FileStatus`; read `pdfStored` from upload response; handle `pdfStored === false` warning |
| `src/components/batch/file-item.tsx` | Add `storing` entry to `statusConfig`; show yellow "PDF storage warning" state |
| `src/app/api/statements/[id]/route.ts` | Add `hasPdf` (derived from `pdfStoragePath IS NOT NULL`) to response |
| `src/app/api/sources/[sourceType]/statements/route.ts` | Add `hasPdf` to the statement list items |
| `src/components/sources/statement-list.tsx` | Add `PdfStatusIcon` to each `StatementRow` |
| `src/components/sources/statement-detail.tsx` | Add `PdfStatusIcon` + optional "View PDF" link in header |

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/supabase/server.ts` | Service-role Supabase client singleton |
| `src/lib/storage/pdf-storage.ts` | `uploadStatementPdf()` and `generatePdfSignedUrl()` helpers |
| `src/app/api/statements/[id]/pdf-url/route.ts` | On-demand signed URL endpoint |

### Schema Already Correct
The `statements` table already has `pdfStoragePath: text("pdf_storage_path")` (nullable). No migration needed for the column itself.

### Environment Variables Needed
```env
# Already present (for browser Supabase auth if used):
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# New — server only, never NEXT_PUBLIC_:
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Open Questions

1. **Bucket creation: Dashboard vs. migration?**
   - What we know: Supabase Storage buckets can be created via Dashboard UI or via the JS client in a setup script.
   - What's unclear: The project has no existing `supabase` folder or migration for storage. Creating the bucket manually in the Dashboard is a one-time operation outside the codebase.
   - Recommendation: Create the bucket manually in the Supabase Dashboard with the correct settings (`public: false`, `allowedMimeTypes: ['application/pdf']`, `fileSizeLimit: '10MB'`). Document this in phase notes. Add a `scripts/create-storage-buckets.ts` helper if the team wants it automated.

2. **Signed URL expiry duration (Claude's discretion)**
   - What we know: `expiresIn` is in seconds; for sensitive PDFs, shorter is more secure but more inconvenient.
   - Recommendation: 3600 seconds (1 hour). Long enough for viewing a PDF in the same session; short enough to limit exposure. Phase 32 can regenerate on modal open.

3. **`statementDate` availability in upload route**
   - What we know: The upload route receives `sourceType` from formData. `statementDate` is parsed later in the processing step. The path includes `{year-month}` from the statement date.
   - What's unclear: At upload time, the statement date isn't known yet (it comes from the PDF's content extraction in `/api/batch/process`). Options: (a) use the current date as a proxy, (b) require `statementDate` in the upload formData from the client, (c) use a different path structure like `{userId}/{upload-date}/{hash}.pdf`.
   - Recommendation: Use the **current month** (`new Date()`) at upload time for the path. The path is for retrieval, not audit — close enough. Alternatively, the user-provided source date (if available from the file name) could be used. Keep this simple: current date is fine.

4. **Import results panel "View PDF" link implementation**
   - What we know: The `BatchUploadResult` type returned by `useBatchUpload` currently has no per-file URL data. The "View PDF" link needs to call the signed URL endpoint.
   - Recommendation: After a successful file completes, the file item already has `statementId`. The "View PDF" link should be a button that calls `GET /api/statements/[statementId]/pdf-url` on click (lazy, not pre-fetched). This fits the on-demand pattern.

---

## Sources

### Primary (HIGH confidence)
- [Supabase Storage Upload Reference](https://supabase.com/docs/reference/javascript/storage-from-upload) — upload method, upsert option, contentType
- [Supabase Standard Uploads Guide](https://supabase.com/docs/guides/storage/uploads/standard-uploads) — recommended for files under 6MB; upsert pattern
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — RLS policies for storage objects
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) — `storage.foldername()`, `storage.filename()`, `storage.extension()`
- [Supabase Service Role Server-Side Guide](https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa) — service client setup with auth disabled
- [Supabase createSignedUrl Reference](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) — signed URL generation with `expiresIn`
- [Supabase Bucket Creation Guide](https://supabase.com/docs/guides/storage/buckets/creating-buckets) — `allowedMimeTypes`, `fileSizeLimit` options
- [Trigger.dev Supabase Storage Example](https://trigger.dev/docs/guides/examples/supabase-storage-upload) — verified Buffer→upload pattern

### Secondary (MEDIUM confidence)
- [GitHub Discussion: upsert requires SELECT+UPDATE](https://github.com/orgs/supabase/discussions/4030) — community-verified, matches official docs
- [GitHub Discussion: service role in Next.js](https://github.com/orgs/supabase/discussions/30739) — consistent with official troubleshooting guide

### Tertiary (LOW confidence)
- NPM package version `@supabase/supabase-js@2.80.0` — from npm search result, not verified against official release notes directly; treat as approximate.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official docs confirm `@supabase/supabase-js` is the right SDK; version approximate
- Architecture: HIGH — codebase inspection confirms all touchpoints; service-role pattern from official docs
- Pitfalls: HIGH — upsert/RLS/env-var pitfalls confirmed via official docs and GitHub discussions
- Open questions: MEDIUM — statementDate timing is an implementation detail that needs resolution during planning

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days — Supabase Storage API is stable)
