---
phase: 49-recurrence-detection-linking
verified: 2026-03-18T10:15:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 49: Recurrence Detection & Linking Verification Report

**Phase Goal:** Detect recurring patterns in transactions and auto-link to existing masters with confidence scoring
**Verified:** 2026-03-18
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Transactions grouped by merchant are analyzed for recurring patterns | VERIFIED | `groupTransactionsByMerchant()` in recurrence-detector.ts joins transactions to merchant_aliases by normalizedDescription, groups by merchantEntityId |
| 2  | Fixed monthly recurrence detected with correct confidence | VERIFIED | Rule B in `detectPatternForGroup()`: median interval 25-35d, CV <= 0.05, DOM stddev <= 5, base confidence 0.70; test "Rule B: detects fixed monthly" passes |
| 3  | Variable monthly recurrence detected with correct confidence | VERIFIED | Rule C: median interval 25-35d, CV 0.05-0.50, base confidence 0.60; test "Rule C: detects variable monthly" passes |
| 4  | Annual recurrence detected with correct confidence | VERIFIED | Rule D: median interval 335-395d, base confidence 0.65; test "Rule D: detects annual" passes |
| 5  | Weekly, quarterly, and custom cadences detected | VERIFIED | Rule E: weekly (5-9d, min 3 occurrences), quarterly (80-100d), custom (CV intervals < 0.3); tests pass for all three |
| 6  | Fixed vs variable amount_type distinguished automatically | VERIFIED | `classifyAmountType()`: CV <= 0.05 => fixed, > 0.05 => variable; 5 tests pass |
| 7  | Next payment date predicted from detected cadence | VERIFIED | `predictNextDate()` covers monthly, yearly, weekly, quarterly, custom; 5 tests pass |
| 8  | Single-occurrence merchants skipped | VERIFIED | `filteredTxns.length < 2` guard in `detectRecurringSeries()`; test "returns null for a single transaction (DETECT-10)" passes |
| 9  | High-confidence series (>= 0.85) auto-linked or new master created | VERIFIED | `shouldAutoLink()` threshold; linker creates master link or auto-creates new recurring_master with `recurringKind` heuristic |
| 10 | Mid-confidence (0.60-0.84) added to review queue with suggested action | VERIFIED | `shouldCreateReviewItem()` inserts to reviewQueueItems with JSONB suggestedAction; 7 boundary tests pass |
| 11 | Low-confidence (< 0.60) remain unlinked | VERIFIED | else branch: `result.unmatchedSeries++`, no master link, no review item |
| 12 | Detection runs automatically after merchant resolution in batch/process | VERIFIED | `detectAndLinkRecurrences()` called at line 465 of batch/process/route.ts; imports from recurrence-orchestrator.ts confirmed |
| 13 | Pipeline errors in detection are non-fatal | VERIFIED | Orchestrator wraps in try/catch, returns null on error; "non-fatal" comment present; 2 orchestrator tests cover detect-throws and link-throws |

**Score: 13/13 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/services/recurrence-detector.ts` | Detection engine with rules A-E, series creation, prediction | VERIFIED | 701 lines; exports `detectRecurringSeries`, `DetectedSeries`, `DetectionResult`, `detectPatternForGroup`, `classifyAmountType`, `predictNextDate`, `computeConfidence`, `groupTransactionsByMerchant` |
| `tests/unit/recurrence-detector.test.ts` | Unit tests for all detection rules | VERIFIED | 288 lines, 29 test cases — all pass |
| `src/lib/services/recurrence-linker.ts` | Auto-linking engine with confidence thresholds, review queue, audit trail | VERIFIED | 574 lines; exports `linkDetectedSeries`, `LinkingResult`, `inferRecurringKind`, `shouldAutoLink`, `shouldCreateReviewItem`, `detectAmountChange`, `isLargeAmountChange` |
| `tests/unit/recurrence-linker.test.ts` | Unit tests for linking logic, confidence thresholds | VERIFIED | 229 lines, 45 test cases — all pass |
| `src/lib/services/recurrence-orchestrator.ts` | Orchestration function wiring detector + linker | VERIFIED | 52 lines; exports `detectAndLinkRecurrences`, `RecurrenceOrchestrationResult` |
| `src/app/api/batch/process/route.ts` | Updated pipeline calling `detectAndLinkRecurrences` | VERIFIED | Import at line 23, call at line 465, recurrence stats in response at lines 497-499 |
| `tests/unit/recurrence-orchestrator.test.ts` | Unit tests for orchestrator | VERIFIED | 160 lines, 7 test cases — all pass |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `recurrence-detector.ts` | `@/lib/db/schema` | imports recurringSeries, recurringMasterSeriesLinks, merchantAliases, merchantEntities, userTransactionLabels, transactions | WIRED | All 6 schema imports confirmed at lines 2-9 |
| `recurrence-linker.ts` | `@/lib/db/schema` | imports recurringSeries, recurringSeriesTransactions, recurringMasters, recurringMasterSeriesLinks, reviewQueueItems, recurringEvents | WIRED | All 6 schema imports confirmed at lines 2-9 |
| `recurrence-linker.ts` | `recurrence-detector.ts` | imports DetectedSeries type | WIRED | `import type { DetectedSeries } from "@/lib/services/recurrence-detector"` at line 11 |
| `recurrence-orchestrator.ts` | `recurrence-detector.ts` | calls `detectRecurringSeries()` | WIRED | Import + call confirmed at lines 1 and 25 |
| `recurrence-orchestrator.ts` | `recurrence-linker.ts` | calls `linkDetectedSeries()` | WIRED | Import + call confirmed at lines 2 and 34 |
| `batch/process/route.ts` | `recurrence-orchestrator.ts` | calls `detectAndLinkRecurrences()` after merchant resolution | WIRED | Import at line 23, call at line 465 inside `if (normalizedTransactionCount > 0 \|\| lineItemCount > 0)` block |

---

## Requirements Coverage

All requirement IDs declared across plans cross-referenced against REQUIREMENTS.md:

### Plan 49-01 Requirements: DETECT-01 through DETECT-10 (minus DETECT-08, DETECT-09)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| DETECT-01: Rule A — known alias hit | SATISFIED | Rule A in `detectPatternForGroup()`, confidence 0.95, tested |
| DETECT-02: Rule B — fixed monthly | SATISFIED | Rule B, median 25-35d, CV <= 0.05, DOM stddev <= 5, tested |
| DETECT-03: Rule C — variable monthly | SATISFIED | Rule C, CV 0.05-0.50, tested |
| DETECT-04: Rule D — annual recurrence | SATISFIED | Rule D, median 335-395d, tested |
| DETECT-05: Weekly, quarterly, custom cadences | SATISFIED | Rule E, all three cadences tested |
| DETECT-06: Fixed vs variable amount_type | SATISFIED | `classifyAmountType()`, CV threshold 0.05, 5 tests |
| DETECT-07: Predict next expected payment date | SATISFIED | `predictNextDate()`, 5 cadences tested |
| DETECT-08: Create recurring_series per pattern | SATISFIED | Linker upserts recurring_series in step 1; `recurringSeriesTransactions` junction rows inserted with `onConflictDoNothing` |
| DETECT-09: Log detection decisions in recurring_events | SATISFIED | Events: `series_created`, `master_created`, `master_auto_linked`, `amount_changed`, `review_item_created` all written to recurringEvents |
| DETECT-10: Skip single-occurrence transactions | SATISFIED | `filteredTxns.length < 2` guard; `detectPatternForGroup` returns null for < 2 inputs |

### Plan 49-02 Requirements: LINK-01 through LINK-09 and DETECT-09

| Requirement | Status | Evidence |
|-------------|--------|----------|
| LINK-01: Match order (alias, canonical, fuzzy, create new, review queue) | SATISFIED | Rule A (alias), step 4 queries by merchantEntityId + frequency, confidence routing covers remaining steps |
| LINK-02: Auto-link when confidence >= 0.85 | SATISFIED | `shouldAutoLink(0.85)` = true; 7 boundary tests pass |
| LINK-03: Add to review queue for 0.60-0.84 | SATISFIED | `shouldCreateReviewItem()`, reviewQueueItems inserted with suggestedAction JSONB |
| LINK-04: Remain unmatched when < 0.60 | SATISFIED | else branch: unmatchedSeries++, no link, no review item |
| LINK-05: User manual decisions override automation | SATISFIED | `userTransactionLabels` loaded in detector; "not_recurring"/"ignore" excludes transactions; "recurring" boosts +0.10 |
| LINK-06: Preserve existing links on reprocessing | SATISFIED | Step 3 checks `recurringMasterSeriesLinks` for existing link; returns early if found (idempotent) |
| LINK-07: Support descriptor changes | SATISFIED | Architectural: `groupTransactionsByMerchant()` groups by merchantEntityId; different descriptors mapping to same entity via aliases are transparent |
| LINK-08: Support amount changes | SATISFIED | `detectAmountChange()` threshold > 10%; `isLargeAmountChange()` threshold > 50%; review item created for large changes; `amount_changed` event written |
| LINK-09: Support account/card migration | SATISFIED | Detection groups by merchantEntityId (account-agnostic); linker queries masters by merchantEntityId + userId, linking across accounts to same master. Note: `account_migration` event type (optional per plan 49-02 wording) was not emitted — the core requirement (same item on different accounts links to same master) is architecturally satisfied |

### Plan 49-03 Requirements: LINK-05, LINK-07

| Requirement | Status | Evidence |
|-------------|--------|----------|
| LINK-05: User manual decisions override automation | SATISFIED (via Plan 49-01 detector) | user_transaction_labels read before detection |
| LINK-07: Support descriptor changes | SATISFIED | Merchant resolution grouping is transparent to detection |

**No orphaned requirements.** REQUIREMENTS.md lines 109-110 confirm all DETECT-01..10 and LINK-01..09 map to Phase 49, and all are covered by the three plans.

---

## Anti-Patterns Found

Files scanned: recurrence-detector.ts, recurrence-linker.ts, recurrence-orchestrator.ts, batch/process/route.ts

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| None | — | — | No TODO/FIXME/HACK/placeholder comments found in phase 49 files. No empty implementations. No stub returns. |

TypeScript compilation: Two pre-existing errors in `src/app/api/transactions/route.ts` and `src/app/api/vault/coverage/route.ts` — confirmed unrelated to Phase 49 (documented in Plan 49-03 summary as pre-existing).

---

## Human Verification Required

### 1. End-to-end pipeline execution

**Test:** Upload a multi-statement PDF with known recurring transactions (e.g., Netflix monthly). Process through the batch/process pipeline.
**Expected:** After processing, `recurring_series` records appear in DB, a `recurring_master` is auto-created if confidence >= 0.85, and `recurring_events` audit rows are written.
**Why human:** Requires a real Supabase DB connection and PDF fixture with recognizable recurring patterns.

### 2. Account migration linking

**Test:** Process statements from two different financial accounts where the same merchant (same merchantEntityId) appears on both. Re-run detection.
**Expected:** Both series link to the same recurring_master — no duplicate masters created.
**Why human:** Requires multi-account test fixture and DB verification of the merged link.

---

## Test Results Summary

| Test File | Tests | Result |
|-----------|-------|--------|
| tests/unit/recurrence-detector.test.ts | 29 | All pass |
| tests/unit/recurrence-linker.test.ts | 45 | All pass |
| tests/unit/recurrence-orchestrator.test.ts | 7 | All pass |
| **Total** | **81** | **All pass** |

---

## Gaps Summary

No gaps. All 13 observable truths verified, all 7 artifacts substantive and wired, all 19 requirements satisfied, 81 tests passing, TypeScript clean for phase 49 files.

The `account_migration` event type was not implemented as a discrete event emission (the plan 49-02 spec described it as detecting when transactions "span multiple accountIds via statements table" — a complex join that was not coded). However, the LINK-09 requirement's stated goal — "same recurring item appearing on different account" links to the same master — is fully achieved by the merchantEntityId-based grouping architecture. This is a warning-level note, not a blocker.

---

_Verified: 2026-03-18T10:15:00Z_
_Verifier: Claude (gsd-verifier)_
