---
status: diagnosed
phase: 34-coverage-historical-upload
source: 34-01-SUMMARY.md, 34-02-SUMMARY.md
started: 2026-02-21T09:00:00Z
updated: 2026-02-21T09:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Coverage tab visible on /vault
expected: Navigate to /vault. Three tabs visible: File Cabinet, Timeline, Coverage (with bar chart icon). Coverage is the third tab.
result: pass

### 2. Heat map grid renders on Coverage tab
expected: Click the Coverage tab. A grid appears with source names on the left (one row per statement source) and 12 month columns spanning the last 12 months. Month headers show abbreviated names (e.g., Mar, Apr, May).
result: pass

### 3. Cell colors match data states
expected: Grid cells are colored: green for months with a stored PDF, yellow for months with data but no PDF, and gray for months with no data at all.
result: issue
reported: "green and yellow are not being displayed - all cells are gray"
severity: major

### 4. Legend bar below grid
expected: Below the heat map grid, a legend bar shows three items: a green square labeled "PDF stored", a yellow square labeled "Data only", and a gray square labeled "Missing".
result: pass

### 5. Tooltip on cell hover
expected: Hover over any green or yellow cell. A tooltip appears showing the statement date (e.g., "Feb 15, 2026"), transaction count, and PDF status (e.g., "PDF stored" or "Data only - no PDF"). Hover a gray cell and tooltip says "No data - click to upload".
result: skipped
reason: All cells gray due to test 3 issue - can't test green/yellow tooltips

### 6. Gap count header
expected: If any gray (missing) cells exist in the grid, an amber/yellow banner appears above the grid showing the count, e.g., "8 months are missing PDFs". If no gaps exist, the banner is hidden.
result: pass

### 7. Gray cell opens upload wizard
expected: Click a gray (missing) cell. An upload wizard modal opens titled "Upload Statement - {source name}" showing the target month (e.g., "February 2026"). A dropzone area says "Drop PDF here or click to upload".
result: pass

### 8. Yellow cell opens attach wizard
expected: Click a yellow (data only) cell. An upload wizard modal opens titled "Attach PDF - {source name}" with an info message: "You have data for this month but no PDF. Drop a file below to attach the original statement." A dropzone area is shown below.
result: skipped
reason: All cells gray due to test 3 issue - no yellow cells to test

### 9. Green cell opens PDF viewer
expected: Click a green (PDF stored) cell. The PDF viewer modal opens showing the stored PDF document with page navigation controls and a download button.
result: skipped
reason: All cells gray due to test 3 issue - no green cells to test

### 10. Tab preference persists across reload
expected: Select the Coverage tab, then reload the page. After reload, the Coverage tab should still be active (not reset to File Cabinet).
result: pass

### 11. Upload flow and grid refresh
expected: Click a gray or yellow cell, drop/select a PDF file in the wizard, click Upload. After success, a toast says "PDF stored successfully", the modal closes, and the cell turns green without a full page reload.
result: issue
reported: "it seemed to load but the cell did not turn green and the yellow message still says all the months are missing pdfs"
severity: major

## Summary

total: 11
passed: 5
issues: 2
pending: 0
skipped: 3

## Gaps

- truth: "Grid cells are colored: green for months with a stored PDF, yellow for months with data but no PDF, and gray for months with no data at all"
  status: failed
  reason: "User reported: green and yellow are not being displayed - all cells are gray"
  severity: major
  test: 3
  root_cause: "statementDate is never populated in the statements table. The batch upload INSERT (src/app/api/batch/upload/route.ts) and processing UPDATE (src/app/api/batch/process/route.ts) never set statementDate. The coverage API (src/app/api/vault/coverage/route.ts line 77) skips null-dated statements with 'if (!stmt.statementDate) continue', so cellMap is always empty and every cell gets state 'missing'."
  artifacts:
    - path: "src/app/api/batch/upload/route.ts"
      issue: "INSERT never sets statementDate"
    - path: "src/app/api/batch/process/route.ts"
      issue: "UPDATE after AI extraction never sets statementDate from transaction dates"
    - path: "src/app/api/vault/coverage/route.ts"
      issue: "Skips all null-dated statements (line 77)"
  missing:
    - "batch/process must derive statementDate from earliest transaction date after AI extraction"
    - "batch/upload should accept optional statementDate from historical upload wizard"
    - "historical-upload-modal must send targetMonth as statementDate in FormData"
    - "Existing statements need statementDate backfilled from their transaction dates"
  debug_session: ".planning/debug/coverage-grid-all-gray.md"

- truth: "After upload, the cell turns green and the gap count banner updates without page reload"
  status: failed
  reason: "User reported: it seemed to load but the cell did not turn green and the yellow message still says all the months are missing pdfs"
  severity: major
  test: 11
  root_cause: "Same root cause as test 3: uploaded statement has statementDate = NULL, so the coverage API still returns it as 'missing'. Cache invalidation works correctly (historical-upload-modal.tsx lines 112-114 invalidate ['vault','coverage']), but refetched data has the same problem."
  artifacts:
    - path: "src/components/vault/historical-upload-modal.tsx"
      issue: "Has targetMonth prop but never sends it to the upload API as statementDate"
    - path: "src/app/api/batch/upload/route.ts"
      issue: "Does not accept or set statementDate from FormData"
  missing:
    - "historical-upload-modal must include targetMonth as statementDate in FormData"
    - "batch/upload must parse and set statementDate from FormData"
  debug_session: ".planning/debug/coverage-grid-all-gray.md"
