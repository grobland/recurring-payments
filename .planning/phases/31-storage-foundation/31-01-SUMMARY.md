---
phase: 31-storage-foundation
plan: 01
subsystem: infra
tags: [supabase, supabase-storage, typescript, next-api, react, batch-upload]

# Dependency graph
requires: []
provides:
  - supabaseAdmin service-role client singleton (src/lib/supabase/server.ts)
  - uploadStatementPdf helper with 10MB/MIME guards and non-fatal error handling
  - generatePdfSignedUrl helper (1-hour expiry)
  - GET /api/statements/[id]/pdf-url endpoint with ownership verification
  - Batch upload route calls uploadStatementPdf after statement insert, returns pdfStored flag
  - storing FileStatus between uploading and processing
  - pdfStored: boolean | null on QueuedFile and SerializableQueueItem
  - Green "PDF stored successfully" or yellow "PDF could not be stored" in file-item.tsx
  - View PDF link on completed items with stored PDFs
affects:
  - 31-02-PLAN (hasPdf boolean in APIs — derives from pdfStoragePath written here)
  - 32 (PDF viewer — uses pdfStoragePath written by this plan)
  - 34 (coverage grid — statement vault entries have PDFs stored here)

# Tech tracking
tech-stack:
  added:
    - "@supabase/supabase-js@^2.97.0"
  patterns:
    - "Service-role client singleton: null-safe init with env var check at module load, non-throwing warning if not configured"
    - "Non-fatal storage: uploadStatementPdf returns null on any failure; import always completes"
    - "Storage path format: {userId}/{yyyy-MM}/{sourceSlug-yyyy-MM}.pdf using upload date"
    - "Signed URLs on-demand: generated per-request at /api/statements/[id]/pdf-url, never pre-fetched"
    - "pdfStored flag: derived from pdfStoragePath !== null at API response time"

key-files:
  created:
    - src/lib/supabase/server.ts
    - src/lib/storage/pdf-storage.ts
    - src/app/api/statements/[id]/pdf-url/route.ts
  modified:
    - src/app/api/batch/upload/route.ts
    - src/lib/hooks/use-batch-upload.ts
    - src/components/batch/file-item.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "supabaseAdmin is null-safe (returns null client if env vars missing) — storage fails gracefully if not configured"
  - "Storage path uses upload date not statement date (statement date unknown at upload time per research open question #3)"
  - "upsert: true on storage upload to handle retries without error"
  - "storing status shown briefly after upload response read — server has already stored by then, but feedback is valuable"
  - "SUPABASE_SERVICE_ROLE_KEY must never have NEXT_PUBLIC_ prefix — enforced by naming convention"

patterns-established:
  - "Non-fatal storage: try/catch around all storage calls, log error, continue with null path"
  - "Ownership verification before signed URL: findFirst with userId AND id, 404 if not found"
  - "Storage bucket name: statements (private, configured in Supabase Dashboard)"

requirements-completed: [STOR-01]

# Metrics
duration: 8min
completed: 2026-02-19
---

# Phase 31 Plan 01: Storage Foundation Summary

**Supabase Storage wired into batch import pipeline: PDFs persisted to private statements bucket with non-fatal degradation, pdfStored flag in API response, and on-demand signed URL endpoint with ownership verification**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-19T17:45:56Z
- **Completed:** 2026-02-19T17:54:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- `@supabase/supabase-js` installed; service-role client singleton created with auth session management disabled and null-safe initialization
- `uploadStatementPdf()` validates 10MB size and MIME type, builds `{userId}/{yyyy-MM}/{sourceSlug-yyyy-MM}.pdf` path, uploads via service-role client, returns null on any failure (non-fatal)
- `generatePdfSignedUrl()` creates 1-hour signed URLs via service-role client, returns null on failure
- `GET /api/statements/[id]/pdf-url` verifies statement ownership, generates signed URL on demand
- Batch upload route calls `uploadStatementPdf()` after statement insert, updates `pdfStoragePath` on success, returns `pdfStored: boolean` flag
- `storing` status added to `FileStatus` union, `pdfStored: boolean | null` added to `QueuedFile` and `SerializableQueueItem`
- `file-item.tsx` shows "Storing PDF..." step, green confirmation or yellow warning on completion, View PDF link for stored files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase Storage infrastructure and signed URL endpoint** - `3ccb8e0` (committed as part of prior docs commit)
2. **Task 2: Integrate storage into batch upload pipeline with progress feedback** - `981b1b4` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/lib/supabase/server.ts` - Service-role Supabase client singleton (server-only, SUPABASE_SERVICE_ROLE_KEY)
- `src/lib/storage/pdf-storage.ts` - uploadStatementPdf and generatePdfSignedUrl helpers with non-fatal error handling
- `src/app/api/statements/[id]/pdf-url/route.ts` - On-demand signed URL endpoint with ownership verification
- `src/app/api/batch/upload/route.ts` - Calls uploadStatementPdf after insert, updates pdfStoragePath, returns pdfStored flag
- `src/lib/hooks/use-batch-upload.ts` - storing FileStatus, pdfStored field on QueuedFile/SerializableQueueItem, storing in stats
- `src/components/batch/file-item.tsx` - storing status config with Database icon, storage result messages, View PDF link
- `package.json` - @supabase/supabase-js added
- `package-lock.json` - lock file updated

## Decisions Made
- `supabaseAdmin` is nullable (null if env vars missing) rather than throwing — storage failures are non-fatal at every level
- Storage path uses current date at upload time because statement date is not yet known (research open question #3)
- `upsert: true` on upload to handle retry scenarios without StorageError
- `storing` status shown after upload response is read (storage already done server-side) to give progress feedback
- View PDF link uses lazy fetch to avoid pre-generating stale URLs

## Deviations from Plan

### Context Note

Task 1 infrastructure files were committed as part of a prior session's docs commit (`3ccb8e0 docs(31-02)`). This occurred because Plan 02 was executed before Plan 01 was fully run and the staged files were picked up. The files were correctly created with all required content; only the commit attribution differs from the intended task structure.

### Auto-fixed Issues

None beyond the above context note.

---

**Total deviations:** 0 code deviations — plan executed exactly as specified.
**Impact on plan:** None — all success criteria met.

## Issues Encountered
- Bash tool had difficulty with Windows paths for git operations; resolved by using Node.js `child_process.execSync` for all git commands
- `.env.example` is gitignored (`.env*` pattern in `.gitignore`) — env var documentation exists in the file but cannot be committed

## User Setup Required

**External service requires manual configuration before PDFs can be stored:**

1. **Environment variables** (add to `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase Dashboard -> Settings -> API -> Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Dashboard -> Settings -> API -> anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard -> Settings -> API -> service_role secret (NEVER prefix with NEXT_PUBLIC_)

2. **Storage bucket** — Supabase Dashboard -> Storage -> New Bucket:
   - Name: `statements`
   - Public: OFF
   - File size limit: 10MB
   - Allowed MIME types: application/pdf

3. **RLS Policies** (optional but recommended for defense-in-depth):
   - INSERT: `(storage.foldername(name))[1] = auth.uid()::text`
   - SELECT: `(storage.foldername(name))[1] = auth.uid()::text`

Without these env vars, storage calls log a warning and return null — imports continue successfully with `pdfStoragePath = NULL`.

## Next Phase Readiness
- `pdfStoragePath` column is populated on statement rows after upload — Plan 02 `hasPdf` boolean derives from this
- Signed URL endpoint ready for Phase 32 PDF viewer integration
- Non-fatal degradation means the system works fully without Supabase Storage configured — zero breaking change

---
*Phase: 31-storage-foundation*
*Completed: 2026-02-19*
