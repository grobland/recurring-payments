# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Users can see all their subscriptions in one place and never get surprised by a renewal again
**Current focus:** v2.2 Financial Data Vault — Phase 32: PDF Viewer

## Current Position

Phase: 32 of 34 (PDF Viewer)
Plan: 1 completed in current phase (01 done)
Status: Phase 32 in progress — Plan 01 complete
Last activity: 2026-02-19 — Completed 32-01: PDF viewer component stack and dual signed URL endpoint

Progress: [██░░░░░░░░] 25% (v2.2 — 1/4 phases complete)

## Archived Milestones

| Version | Name | Shipped | Phases | Plans | Requirements |
|---------|------|---------|--------|-------|--------------|
| v2.1 | Billing & Monetization | 2026-02-18 | 24-30 | 19 | 14/14 |
| v2.0 | Statement Hub | 2026-02-10 | 19-23 | 21 | 27/27 |
| v1.3 | Data & Intelligence | 2026-02-08 | 13-18 | 21 | 23/23 |
| v1.2 | Production Polish | 2026-02-05 | 9-12 | 10 | 19/19 |
| v1.1 | Import Improvements | 2026-02-02 | 5-8 | 11 | 18/18 |
| v1.0 | Get It Running | 2026-01-30 | 1-4 | 7 | 9/9 |

**Total:** 90 plans completed, 118 requirements validated across 6 milestones

## Performance Metrics

**Velocity:**
- Total plans completed: 89
- Total phases: 30 (+ 4 planned for v2.2)
- Total milestones: 6
- Development span: 2026-01-26 → 2026-02-18 (24 days)

## Accumulated Context

### Decisions

Recent decisions affecting v2.2 work:

- [v2.2 research]: Upload PDF bytes from in-memory buffer in `/api/batch/upload` — never re-POST to a second route body (avoids Vercel 4.5 MB limit)
- [v2.2 research]: react-pdf must be in a two-file split — `PDFDocumentInner` (Document + worker config) loaded via `dynamic(..., { ssr: false })`; worker config in same file as `<Document>`
- [v2.2 research]: Supabase Storage RLS policies use `(storage.foldername(name))[1] = auth.uid()::text`; configure INSERT/SELECT/DELETE before writing upload code
- [v2.2 research]: Storage failures are non-fatal — log error, continue import, set `pdfStoragePath = NULL`
- [v2.2 research]: Signed URLs generated on-demand when modal opens; vault list returns `hasPdf: boolean` only (avoids stale URL problem)
- [31-02]: hasPdf boolean derived from pdfStoragePath IS NOT NULL at API boundary — raw storage path never exposed to client
- [31-02]: PdfStatusIcon duplicated locally in statement-list and statement-detail (6-line component, avoids premature abstraction)
- [31-02]: PdfStatusIcon informational only in Phase 31 — no onClick; Phase 32 adds viewer on click
- [31-01]: supabaseAdmin is null-safe — storage fails gracefully if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing
- [31-01]: Storage path uses upload date not statement date (statement date unknown at upload time)
- [31-01]: upsert: true on storage upload to handle retries without StorageError
- [31-01]: View PDF link uses lazy fetch to avoid pre-generating stale signed URLs
- [v2.2 research]: Phase 34 coverage grid rendering approach not yet decided — evaluate CSS Grid vs shadcn calendar vs Recharts during planning
- [Phase 32-pdf-viewer]: react-pdf worker config in same file as Document (pdf-viewer-inner.tsx) — mandatory to prevent fake worker blank renders
- [Phase 32-pdf-viewer]: generatePdfSignedUrl extended with download option — uses Supabase { download: filename } to set Content-Disposition: attachment, required for cross-origin download (browser ignores download attribute for cross-origin)
- [Phase 32-pdf-viewer]: Single API call returns both { url, downloadUrl } — avoids double-fetch on client for PDF viewing + download

### Blockers/Concerns

**Production deployment (carried forward):**
- RESEND_FROM_EMAIL needs verified domain for email delivery
- NEXT_PUBLIC_SENTRY_DSN needed for Sentry error tracking

**v2.2 new env vars needed:**
- NEXT_PUBLIC_SUPABASE_URL (browser-side storage)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (browser-side storage)
- SUPABASE_SERVICE_ROLE_KEY (server-side uploads — no NEXT_PUBLIC_ prefix)

**Phase 34 open question:**
- Coverage grid component approach undecided — scope during Phase 34 planning (CSS Grid, shadcn calendar, or Recharts cell chart)

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 32-01-PLAN.md (PDF viewer component stack and dual signed URL endpoint)
Resume file: .planning/phases/32-pdf-viewer/32-01-SUMMARY.md
Resume with: Phase 32 Plan 02 — wire PdfViewerModal into PdfStatusIcon onClick handlers in statement-list.tsx and statement-detail.tsx
