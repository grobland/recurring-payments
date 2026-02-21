# Phase 31: Storage Foundation - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire Supabase Storage into the batch import flow so uploaded PDFs are persisted and retrievable. Every new statement gets its original PDF stored. Legacy statements (pre-v2.2) show a clear "no file" state. Storage failures are non-fatal — import always succeeds.

</domain>

<decisions>
## Implementation Decisions

### File organization
- Bucket path structure: `{user-id}/{year-month}/{source-date}.pdf` (e.g., `abc123/2026-01/chase-2026-01.pdf`)
- File naming convention: `{source}-{date}.pdf` — clean, readable, grouped by month
- Re-uploads for same source+month silently replace the existing file (latest wins)
- Bucket is fully private — all access via signed URLs with expiry only

### Legacy statement indicator
- "No file stored" indicator appears inline on statement detail/row — visible when browsing
- Both states visible: green file icon for "PDF stored", muted/gray file icon for "No file stored"
- For now, indicator is informational only — becomes a clickable upload prompt once Phase 34 ships

### Upload feedback
- "Storing PDF..." shown as a separate visible step in the import progress flow
- On storage failure: yellow warning in import results — "PDF could not be stored — subscriptions imported successfully"
- On success: import results include "PDF stored successfully" confirmation
- Import results include a "View PDF" link for immediate access to the stored file

### Storage guardrails
- Maximum file size: 10 MB per PDF
- No per-user storage quota for now — revisit if costs become an issue
- MIME type validation: verify file is actually a PDF before storing (not just .pdf extension)
- Oversized files (>10 MB): import continues, storage skipped — same as storage failure pattern

### Visual representation
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

</decisions>

<specifics>
## Specific Ideas

- "View PDF" link in import results should give immediate access to the just-stored file
- Gray/green icon pairing creates a visual language that carries through to Vault UI (Phase 33) and Coverage Grid (Phase 34)
- Legacy indicator should be designed as a foundation for the Phase 34 upload prompt — starts informational, evolves to actionable

</specifics>

<deferred>
## Deferred Ideas

- Per-user storage quotas tied to billing tiers — revisit if storage costs matter
- Download on click for stored PDFs — Phase 32 handles viewing/downloading
- Upload prompt on "No file" indicator — Phase 34 Coverage & Historical Upload

</deferred>

---

*Phase: 31-storage-foundation*
*Context gathered: 2026-02-19*
