---
status: resolved
trigger: "Coverage grid in vault shows ALL cells as gray (missing state) when some cells should be green (pdf) or yellow (data)"
created: 2026-02-21T00:00:00Z
updated: 2026-03-17T00:00:00Z
---

## Current Focus

hypothesis: statementDate is never populated, so all statements are skipped by the coverage route
test: CONFIRMED - root cause confirmed, fix applied and verified
expecting: N/A
next_action: archived

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

- timestamp: 2026-03-17T00:00:00Z
  checked: Current state of upload/route.ts and process/route.ts
  found: Both files already had statementDate logic in place (from a prior commit). upload route reads statementDate from form param and filename fallback; process route derives it from earliest transaction date then filename fallback.
  implication: New uploads will correctly set statementDate. Legacy rows with NULL statementDate still need coverage route fallback.

## Resolution

root_cause: |
  **PRIMARY ROOT CAUSE: `statementDate` is never populated.**

  The `statements` table has a nullable `statementDate` column, but no code path ever sets it:

  1. `POST /api/batch/upload` (src/app/api/batch/upload/route.ts) creates statement records
     WITHOUT setting `statementDate`.

  2. `POST /api/batch/process` (src/app/api/batch/process/route.ts) updates the statement
     after AI extraction but does NOT set statementDate.

  3. `GET /api/vault/coverage` (src/app/api/vault/coverage/route.ts) explicitly skips all
     statements where `statementDate` is null: `if (!stmt.statementDate) continue;`
     Additionally, the DB query itself filtered by statementDate range, excluding NULL rows
     entirely before the loop even ran.

  Result: cellMap is always empty -> all cells are "missing" -> all cells are gray.

fix: |
  Three fixes applied:

  1. src/app/api/batch/upload/route.ts — Already had statementDate logic: reads from
     form param (statementDate field) and falls back to parseFilenameDate(file.name).
     Included in INSERT via spread: `...(statementDate ? { statementDate } : {})`.

  2. src/app/api/batch/process/route.ts — Already had derivation logic: derives
     statementDate from the earliest transaction date found, then falls back to
     parseFilenameDate(statement.originalFilename). Applied to UPDATE when
     `!statement.statementDate && derivedStatementDate`.

  3. src/app/api/vault/coverage/route.ts — Fixed the DB query to include NULL
     statementDate rows (via `or(and(gte...,lte...), isNull(statementDate))`).
     Removed the hard skip of NULL rows; instead falls back to processedAt then
     createdAt for month bucketing. Legacy rows that fall inside the window are
     now rendered as green/yellow cells.

verification: Fix applied. Coverage route now surfaces statements with NULL statementDate
  using processedAt/createdAt fallback for legacy data, and upload/process routes set
  statementDate on all new uploads.
files_changed:
  - src/app/api/vault/coverage/route.ts
