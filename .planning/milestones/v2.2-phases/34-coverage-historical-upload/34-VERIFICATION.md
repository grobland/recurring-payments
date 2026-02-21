---
phase: 34-coverage-historical-upload
verified: 2026-02-21T12:30:00Z
status: human_needed
score: 3/3 success criteria verified
re_verification: true
  previous_status: passed
  previous_score: 3/3
  gaps_closed:
    - "statementDate pipeline now populated so coverage grid cells render green/yellow (not all-gray)"
    - "historical-upload-modal sends targetMonth as statementDate for missing-cell uploads"
    - "batch/process derives statementDate from earliest transaction date after AI extraction"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Upload via coverage wizard and verify cell turns green"
    expected: "After dropping a PDF on a gray cell's wizard and clicking Upload, the cell turns green without page reload"
    why_human: "Requires running dev server, Supabase Storage, and a real PDF file to verify statementDate is persisted and coverage API returns pdf state"
  - test: "Yellow cell opens attach wizard"
    expected: "A yellow (data-only) cell exists and clicking it opens the Attach PDF modal. After attaching a PDF, the cell turns green."
    why_human: "Requires user data with statements that have transactions but no pdfStoragePath"
  - test: "Green cell opens PDF viewer"
    expected: "A green cell exists and clicking it opens the PdfViewerModal showing the stored PDF"
    why_human: "Requires user data with statements that have pdfStoragePath set"
  - test: "Normal batch import now populates statementDate"
    expected: "After processing a statement through the standard batch import flow, the statement appears in the coverage grid in the correct month column"
    why_human: "Requires uploading and processing a real PDF via the normal import flow to verify batch/process sets statementDate from transaction dates"
---

# Phase 34: Coverage & Historical Upload Verification Report

**Phase Goal:** Users can see which months have stored PDFs versus data-only versus missing, and use a guided wizard to upload historical statements for gap months
**Verified:** 2026-02-21T12:30:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (Plan 03 executed following UAT failures in tests 3 and 11)

---

## Re-verification Context

The previous VERIFICATION.md (status: passed) was written before UAT was conducted. UAT revealed two major failures:

- **Test 3 failed:** All coverage grid cells showed gray — green and yellow were never displayed
- **Test 11 failed:** After uploading, the cell did not turn green

Root cause diagnosed in 34-UAT.md: `statementDate` was never populated in the `statements` table. The coverage API correctly skips null-dated statements (`if (!stmt.statementDate) continue`), so every cell returned as "missing". This is a data-pipeline bug, not a UI bug.

Plan 03 was executed to fix the root cause. This re-verification confirms the fix is in place.

---

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see a grid for each source showing the last 12-24 months with distinct visual states for "PDF stored," "data only — no file," and "no data" | VERIFIED | `coverage-grid.tsx` (185 lines) renders CSS Grid heat map with `bg-green-500/80` / `bg-yellow-400/80` / `bg-muted/40` based on `cell.state`. `coverage/route.ts` derives state server-side from `pdfStoragePath` (never exposed to client). statementDate now populated by Plan 03 so cells are classified correctly for new uploads. |
| 2 | User can click into a gap month on the coverage grid and open a wizard that guides them through uploading a statement for that specific source and month | VERIFIED | `coverage-view.tsx` `handleCellClick` dispatches to `HistoricalUploadModal` with `mode: "missing"` for gray cells and `mode: "attach"` for yellow cells, pre-filling `sourceType` and `targetMonth`. Modal uses react-dropzone with 50MB limit and calls the correct endpoint per mode. |
| 3 | After completing the wizard upload, the coverage grid updates to reflect the newly stored PDF | VERIFIED | `historical-upload-modal.tsx` line 113: `queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] })` on success. `batch/upload/route.ts` now accepts `statementDate` from FormData (line 31, parsed lines 70-73, persisted line 102) so the newly created statement maps to the correct month cell and the refetched coverage API returns `state: "pdf"`. |

**Score:** 3/3 success criteria verified

---

## Required Artifacts

### Plan 01 Artifacts (Regression Check)

| Artifact | Lines | Status | Details |
|----------|-------|--------|---------|
| `src/app/api/vault/coverage/route.ts` | 158 | VERIFIED | Exports `GET`. 12-month window via `subMonths(now, 11)`. Double query (window statements + distinct sources). Cell state derived from `pdfStoragePath`. Returns `{ sources, gapCount, months }`. |
| `src/app/api/vault/attach-pdf/route.ts` | 122 | VERIFIED | Exports `POST`. Auth + billing gate + FormData parse + ownership check via `db.query.statements.findFirst` + `uploadStatementPdf` call + `pdfStoragePath` UPDATE. Returns `{ success: true, pdfStored: true }`. |
| `src/lib/hooks/use-vault-coverage.ts` | 66 | VERIFIED | Exports `useVaultCoverage`, `vaultCoverageKeys`, `CoverageCell`, `CoverageSource`, `CoverageResponse`. `staleTime: 2 * 60 * 1000`. `queryKey: vaultCoverageKeys.all()` = `["vault", "coverage"]`. |

### Plan 02 Artifacts (Regression Check)

| Artifact | Lines | Min | Status | Details |
|----------|-------|-----|--------|---------|
| `src/components/vault/coverage-grid.tsx` | 185 | 80 | VERIFIED | Single `TooltipPrimitive.Provider delayDuration={300}`, per-cell coloring via `cellColorClass()`, legend bar, `role="grid"/"row"/"gridcell"`, `aria-label` on every cell button. |
| `src/components/vault/historical-upload-modal.tsx` | 242 | 60 | VERIFIED | `useDropzone` accept pdf, maxFiles=1, maxSize=50MB. Dual-mode POST (attach-pdf vs batch/upload). `statementDate` appended in missing branch (line 98). Error + Retry. `useEffect` resets on close. |
| `src/components/vault/coverage-view.tsx` | 118 | 40 | VERIFIED | `useVaultCoverage()`, gap count amber banner when `gapCount > 0`, `handleCellClick` dispatches by state, `Skeleton` loading state, `HistoricalUploadModal` + `PdfViewerModal` wired. |
| `src/components/vault/vault-page.tsx` | ~86 | — | VERIFIED | Imports `CoverageView` (line 13) and `BarChart3` (line 4). localStorage guard includes `"coverage"` (line 25). Third `TabsTrigger value="coverage"` (line 69). Third `TabsContent value="coverage"` (line 80). |

### Plan 03 Artifacts (Gap Closure — Full Verification)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/app/api/batch/upload/route.ts` | VERIFIED | Line 31: parses `statementDate` from FormData. Lines 70-73: converts `yyyy-MM` string to first-of-month UTC Date. Line 102: `...(statementDate ? { statementDate } : {})` in INSERT values. |
| `src/app/api/batch/process/route.ts` | VERIFIED | Line 94: `statementDate: true` added to columns selection. Lines 163-166: `derivedStatementDate = new Date(Math.min(...dates))` from transaction timestamps. Lines 181-183: conditional spread `...(!statement.statementDate && derivedStatementDate ? { statementDate: derivedStatementDate } : {})` in UPDATE. |
| `src/components/vault/historical-upload-modal.tsx` | VERIFIED | Line 98: `formData.append("statementDate", targetMonth)` in the `else` (missing mode) branch — sends `yyyy-MM` string to batch/upload which persists it as first-of-month Date. |

---

## Key Link Verification

### Plan 01 Key Links (Regression Check)

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `coverage/route.ts` | `schema.ts statements` | drizzle query with `eq(statements.userId)` + `gte(statements.statementDate, windowStart)` | WIRED | Lines 38-52: `db.select({...}).from(statements).where(and(eq(statements.userId, userId), gte(statements.statementDate, windowStart)))` |
| `attach-pdf/route.ts` | `pdf-storage.ts` | `uploadStatementPdf` | WIRED | Line 7: `import { uploadStatementPdf }`. Line 95-99: called with `(file, session.user.id, statement.sourceType)`. |
| `use-vault-coverage.ts` | `/api/vault/coverage` | `fetch` in queryFn | WIRED | Line 48: `const response = await fetch("/api/vault/coverage")`. Return value passed through as `CoverageResponse`. |

### Plan 02 Key Links (Regression Check)

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `coverage-view.tsx` | `use-vault-coverage.ts` | `useVaultCoverage()` | WIRED | Line 4: `import { useVaultCoverage }`. Line 37: `const { data, isLoading } = useVaultCoverage()`. |
| `coverage-grid.tsx` | `historical-upload-modal.tsx` | `onCellClick` callback | WIRED | `CoverageGrid` accepts `onCellClick` prop; `coverage-view.tsx` `handleCellClick` opens `HistoricalUploadModal` or `PdfViewerModal` based on `info.state`. |
| `historical-upload-modal.tsx` | `/api/vault/attach-pdf` | `fetch POST` when `mode === "attach"` | WIRED | Lines 88-91: `await fetch("/api/vault/attach-pdf", { method: "POST", body: formData })` in attach branch. |
| `historical-upload-modal.tsx` | `/api/batch/upload` | `fetch POST` when `mode === "missing"` | WIRED | Lines 102-105: `await fetch("/api/batch/upload", { method: "POST", body: formData })` in missing branch. |
| `historical-upload-modal.tsx` | `vaultCoverageKeys` | `queryClient.invalidateQueries` | WIRED | Lines 113-115: invalidates `["vault", "coverage"]`, `["vault", "timeline"]`, `["sources"]`. |
| `vault-page.tsx` | `coverage-view.tsx` | `TabsContent` rendering `CoverageView` | WIRED | Line 13: `import { CoverageView }`. Line 80-82: `<TabsContent value="coverage"><CoverageView /></TabsContent>`. |

### Plan 03 Key Links (Gap Closure — Full Verification)

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `historical-upload-modal.tsx` | `/api/batch/upload` | `formData.append("statementDate", targetMonth)` | WIRED | Line 98: `formData.append("statementDate", targetMonth)` in missing branch before `fetch("/api/batch/upload", ...)` at line 102. |
| `batch/upload/route.ts` | `statements` table | `statementDate` field in INSERT | WIRED | Lines 70-73 parse `statementDateStr`; line 102: `...(statementDate ? { statementDate } : {})` in `.values({...})`. |
| `batch/process/route.ts` | `statements` table | `statementDate` in UPDATE from `Math.min` of transaction dates | WIRED | Lines 163-166: `derivedStatementDate = new Date(Math.min(...dates))`; lines 181-183: conditional spread in `.set({...})`. |

All 12 key links across Plans 01-03: WIRED.

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| VENH-01 | 34-01, 34-02, 34-03 | User can see a coverage visualization grid showing PDF stored / data only / missing per month per source | SATISFIED | `coverage/route.ts` computes cell states server-side; `coverage-grid.tsx` renders green/yellow/gray heat map; statementDate now populated so cells classify correctly |
| VENH-02 | 34-01, 34-02, 34-03 | User can use a guided wizard to upload historical statements for missing months | SATISFIED | `historical-upload-modal.tsx` provides dual-mode wizard; sends `statementDate` for new uploads so the cell state updates correctly after cache invalidation |

No orphaned requirements — VENH-01 and VENH-02 are claimed in all three plans and all have implementation evidence.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/batch/process/route.ts` | 120 | `// TODO: Update parseTextForSubscriptions to return ALL line items, not just subscriptions` | Info | Pre-existing from before Phase 34. Does not affect coverage grid — `statementDate` is derived from whichever transactions are extracted. No blocker to phase goal. |

No blockers. No new anti-patterns introduced by Phase 34 plans.

---

## Human Verification Required

The following behaviors cannot be verified by static analysis and require manual testing with a running dev server and real or mocked Supabase Storage.

### 1. Coverage Grid Shows Non-Gray Cells After New Upload

**Test:** Upload a PDF via the coverage wizard for a gray (missing) cell. Verify the cell turns green after upload.
**Expected:** The cell for the uploaded source + month changes from gray to green without page reload. The gap count banner decreases by 1 (or disappears if that was the last gap).
**Why human:** The end-to-end flow requires a real PDF file, a running Supabase Storage connection, and verification that `statementDate` is persisted and the coverage API returns `state: "pdf"` on refetch. Static analysis confirms the wiring is present but cannot execute the data flow.

### 2. Yellow Cell Exists and Opens Attach Wizard Correctly

**Test:** If a statement with transactions but no `pdfStoragePath` exists, click that cell.
**Expected:** Cell is yellow (not gray). Clicking opens the modal titled "Attach PDF — {sourceType}" with the info message "You have data for this month but no PDF...". After attaching a PDF, the cell turns green.
**Why human:** Requires user data where `statementDate` is set (so the coverage API maps it to a month cell) but `pdfStoragePath` is null.

### 3. Green Cell Opens PDF Viewer

**Test:** Click a green (PDF stored) cell.
**Expected:** `PdfViewerModal` opens and displays the stored PDF document.
**Why human:** Requires a statement with `pdfStoragePath` set and the signed URL generation from Supabase Storage.

### 4. Normal Batch Import Populates Coverage Grid

**Test:** Upload a PDF via the standard batch import flow (not the coverage wizard). Process it. Navigate to the Coverage tab.
**Expected:** The statement appears in the correct month column based on the earliest transaction date extracted by the AI parser.
**Why human:** Requires a real AI extraction run to produce `transactionRecords` with dates, which `batch/process` then uses to derive `statementDate`.

### 5. Coverage Grid Visual Rendering

**Test:** Navigate to `/vault` and click the Coverage tab.
**Expected:** Heat map grid appears with source rows, 12 month columns, month header labels (abbreviated month names), color-coded cells, and a legend bar below showing green/yellow/gray with labels "PDF stored", "Data only", "Missing".
**Why human:** CSS class application and visual rendering require a running browser.

### 6. Tab Preference Persistence

**Test:** Select the Coverage tab, reload the page.
**Expected:** Coverage tab is still active after reload.
**Why human:** localStorage behavior requires a real browser environment.

---

## Summary

Phase 34 goal is verified in code after the Plan 03 gap closure. The original VERIFICATION.md was premature — it was written before UAT revealed that all cells showed gray due to `statementDate` never being populated in the statements table.

Plan 03 fixes are confirmed present in all three target files:

1. `historical-upload-modal.tsx` now sends `formData.append("statementDate", targetMonth)` in the missing-cell upload branch
2. `batch/upload/route.ts` now parses and persists `statementDate` from FormData on INSERT
3. `batch/process/route.ts` now derives `statementDate` from the earliest transaction date and sets it conditionally on UPDATE

All 10 artifacts across Plans 01-03 exist with substantive implementations. All 12 key links are wired. VENH-01 and VENH-02 are both satisfied. The pre-existing TODO in `batch/process/route.ts` (line 120) about `parseTextForSubscriptions` is informational — it does not block the phase goal.

Six human verification items cover the end-to-end upload flow, yellow/green cell behavior, PDF viewer, and localStorage persistence — all behaviors that require a running application with real data.

---

_Verified: 2026-02-21T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification after: Plan 03 gap closure (statementDate pipeline fix)_
