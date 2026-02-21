---
status: diagnosed
trigger: "Coverage grid in vault shows ALL cells as gray (missing state) when some cells should be green (pdf) or yellow (data)"
created: 2026-02-21T00:00:00Z
updated: 2026-02-21T00:00:00Z
---

## Current Focus

hypothesis: statementDate is never populated, so all statements are skipped by the coverage route
test: CONFIRMED - traced all insert/update paths for statements table
expecting: N/A - root cause confirmed
next_action: report diagnosis

## Symptoms

expected: Grid cells colored green (PDF stored), yellow (data only), gray (missing) based on statement data
actual: ALL cells show gray (missing state); gap count doesn't update after upload
errors: None (no runtime errors)
reproduction: Upload a PDF via the coverage grid; cell stays gray
started: Likely since feature was built

## Eliminated

(none needed - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-21T00:01:00Z
  checked: POST /api/batch/upload (the only INSERT into statements table)
  found: statementDate is NEVER set in the insert - only userId, sourceType, pdfHash, originalFilename, fileSizeBytes, processingStatus are provided
  implication: All statements have statementDate = NULL

- timestamp: 2026-02-21T00:02:00Z
  checked: POST /api/batch/process (the processing step after upload)
  found: After AI extraction, the update only sets processingStatus, transactionCount, and processedAt. statementDate is NEVER updated.
  implication: statementDate remains NULL even after processing

- timestamp: 2026-02-21T00:03:00Z
  checked: GET /api/vault/coverage route.ts line 77
  found: `if (!stmt.statementDate) continue;` - statements with null statementDate are explicitly skipped
  implication: ALL statements are skipped, so cellMap is always empty, so ALL cells are "missing"

- timestamp: 2026-02-21T00:04:00Z
  checked: Schema definition for statements.statementDate
  found: `statementDate: timestamp("statement_date", { withTimezone: true })` - nullable, no default
  implication: Without explicit assignment, it stays NULL forever

- timestamp: 2026-02-21T00:05:00Z
  checked: POST /api/vault/attach-pdf
  found: Only updates pdfStoragePath, does NOT set statementDate either
  implication: Even the "attach PDF" flow doesn't fix the underlying problem

- timestamp: 2026-02-21T00:06:00Z
  checked: Cache invalidation in historical-upload-modal.tsx lines 112-114
  found: invalidateQueries calls are correctly wired for ["vault", "coverage"], ["vault", "timeline"], ["sources"]
  implication: Cache invalidation is NOT the issue - the refetch happens but returns the same wrong data

## Resolution

root_cause: |
  **PRIMARY ROOT CAUSE: `statementDate` is never populated.**

  The `statements` table has a nullable `statementDate` column, but no code path ever sets it:

  1. `POST /api/batch/upload` (src/app/api/batch/upload/route.ts:86-96) creates statement records
     WITHOUT setting `statementDate`. It only sets: userId, sourceType, pdfHash, originalFilename,
     fileSizeBytes, processingStatus.

  2. `POST /api/batch/process` (src/app/api/batch/process/route.ts:167-174) updates the statement
     after AI extraction but only sets: processingStatus, transactionCount, processedAt.
     It does NOT set statementDate, even though it has transaction dates available from the AI parse.

  3. `GET /api/vault/coverage` (src/app/api/vault/coverage/route.ts:77) explicitly skips all
     statements where `statementDate` is null: `if (!stmt.statementDate) continue;`

  Result: cellMap is always empty -> all cells are "missing" -> all cells are gray.

  **SECONDARY ISSUE: Upload from coverage grid doesn't pass month context.**

  When the user clicks a gray cell (e.g., "Chase Sapphire :: 2025-10"), the HistoricalUploadModal
  knows the targetMonth ("2025-10"), but the upload call to `/api/batch/upload` does NOT pass
  this month as the statementDate. The API endpoint doesn't even accept a statementDate parameter.
  So even if the insert were fixed to set statementDate, the historical upload flow has no way
  to communicate which month the PDF belongs to.

fix: (not applied - diagnosis only)
verification: (not applied)
files_changed: []
