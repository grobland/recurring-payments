---
status: complete
phase: 33-vault-ui
source: [33-01-SUMMARY.md, 33-02-SUMMARY.md]
started: 2026-02-20T19:00:00Z
updated: 2026-02-20T19:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Vault sidebar navigation
expected: Sidebar shows "Vault" entry with Archive icon, positioned after Dashboard and before Subscriptions. Clicking it navigates to /vault with "Vault" header and breadcrumbs (Dashboard > Vault).
result: pass

### 2. File Cabinet view with folder cards
expected: /vault shows File Cabinet tab active by default. Each statement source appears as a folder card tile in a responsive grid (1 column on mobile, 2 on tablet, 3 on desktop). Cards show folder icon, source name, statement count, and transaction count.
result: pass

### 3. Expand folder card to see statements
expected: Clicking a folder card expands it inline (not a new page). Statement rows appear showing: PDF icon (green if PDF stored, gray if not), filename, date (e.g. "Jan 2026"), transaction count, status breakdown (converted/skipped/pending), and a "View details" link.
result: pass

### 4. Multiple folders open simultaneously
expected: With two or more sources, expand folder A then expand folder B. Both remain open at the same time — opening B does not close A.
result: pass

### 5. Empty state for new users
expected: A user with no imported statements sees an empty state: large Archive icon, "Your Statement Vault" heading, explanatory text about uploading bank statements, and an "Upload Statements" button that links to /import/batch. No tab bar or folder cards visible.
result: pass (unable to fully test — single user account, but code path verified)

### 6. Tab switching (File Cabinet / Timeline)
expected: Tab bar at top shows "File Cabinet" and "Timeline" tabs with icons. Clicking Timeline switches view. Clicking File Cabinet switches back. Both tabs load their respective content.
result: pass

### 7. View preference persists across navigation
expected: Switch to Timeline tab, navigate away (e.g. to Dashboard), then navigate back to /vault. The Timeline tab should still be selected — not reset to File Cabinet.
result: pass

### 8. Stats bar above tabs
expected: Above the tab bar, a stats strip shows "N sources · N statements · N PDFs stored" with actual counts matching your data. Not visible if you have zero statements.
result: pass

### 9. Timeline calendar grid
expected: Timeline tab shows a calendar grid grouped by year. Each year has a header. Months with statements show a file icon (green if any PDF, gray if data-only) and a count badge. Empty months between your earliest and latest statement appear faded.
result: issue
reported: "No dated statements to display in timeline. Date Unknown section shows instead. All statements lack statementDate because batch import pipeline never populates it."
severity: major

### 10. Timeline month detail panel
expected: Clicking a filled month cell in the timeline grid opens a detail panel below the grid showing that month's statements. Each row has: PDF icon, filename, source label, transaction count, status breakdown, and View details link. Clicking the same cell again closes the panel.
result: skipped
reason: No dated statements exist — no filled month cells to click

### 11. View PDF from vault
expected: In either File Cabinet (expanded folder) or Timeline (detail panel), clicking the PDF icon or "View PDF" on a statement with a stored PDF opens the PDF viewer modal. The modal shows the PDF with page navigation and download button.
result: pass (after fix — dialog widened from sm:max-w-lg to sm:max-w-5xl, PDF uses container-measured width)

### 12. Dateless statements in timeline
expected: If you have any statements without dates, they appear in a "Date Unknown" section below the calendar grid in the Timeline tab. (If all your statements have dates, this section won't appear — type "skip" if not applicable.)
result: skipped
reason: All statements are dateless — Date Unknown section visible but can't verify calendar grid interaction alongside it

## Summary

total: 12
passed: 9
issues: 1
pending: 0
skipped: 2

## Gaps

- truth: "Timeline tab shows a calendar grid grouped by year with months containing statements"
  status: failed
  reason: "User reported: No dated statements to display in timeline. Date Unknown section shows instead. All statements lack statementDate because batch import pipeline (src/app/api/batch/process/route.ts) never populates it."
  severity: major
  test: 9
  root_cause: "src/app/api/batch/process/route.ts lines 167-174 — statement update on completion only sets processingStatus, transactionCount, processedAt. statementDate is never set. The AI parser returns transactionDate per item but no overall statement period date is extracted."
  artifacts:
    - path: "src/app/api/batch/process/route.ts"
      issue: "statementDate never set during processing — needs extraction from AI parser or filename"
  missing:
    - "Extract statement period date from AI parser output or filename pattern (e.g. 'January 2026')"
    - "Set statementDate during statement processing completion"
  debug_session: ""
