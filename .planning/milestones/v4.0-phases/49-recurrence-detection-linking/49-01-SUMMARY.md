---
phase: 49-recurrence-detection-linking
plan: "01"
subsystem: recurrence-detection
tags: [detection-engine, tdd, pure-functions, services]
dependency_graph:
  requires: [Phase 47 schema, Phase 48 merchant resolution]
  provides: [detectRecurringSeries, detectPatternForGroup, classifyAmountType, predictNextDate, computeConfidence]
  affects: [batch/process pipeline, recurring_series table]
tech_stack:
  added: []
  patterns: [db-injection for testability, pure helper functions, sequential rule evaluation]
key_files:
  created:
    - src/lib/services/recurrence-detector.ts
    - tests/unit/recurrence-detector.test.ts
  modified: []
decisions:
  - "detectPatternForGroup extracted as pure function so all rules testable without DB"
  - "Rule B requires dom stddev <= 5 AND amount CV <= 0.05 (both conditions)"
  - "Test for CV=0.049 (values [94,100,106]) corrected to [90,100,110] — actual math produces fixed not variable"
  - "computeConfidence Rule E base set to 0.65; weekly/quarterly caller adjusts via initial value"
metrics:
  duration_seconds: 247
  completed_date: "2026-03-18"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
  test_count: 29
---

# Phase 49 Plan 01: Recurrence Detection Engine Summary

**One-liner:** Rule-based recurrence detection engine (rules A-E) with pure helper functions, CV-based amount classification, and next-date prediction — all 29 tests passing.

## What Was Built

`src/lib/services/recurrence-detector.ts` — the intelligence layer that transforms normalized transactions grouped by merchant into detected recurring series.

### Exported Functions

| Function | Purpose |
|---|---|
| `detectRecurringSeries(db, userId)` | Main pipeline: groups transactions, loads labels/masters, runs detection per merchant |
| `detectPatternForGroup(txns, hasExistingMaster, userBoost)` | Pure detection applying rules A-E sequentially |
| `classifyAmountType(amounts)` | CV <= 0.05 => fixed, > 0.05 => variable |
| `predictNextDate(lastDate, frequency, dayOfMonth, intervalDays?)` | Predicts next occurrence for all cadences |
| `computeConfidence(rule, occurrences, intervalStddev, amountCV, hasUserBoost)` | Rule-specific base + bonuses + user boost |
| `groupTransactionsByMerchant(db, userId)` | Groups transactions via alias lookup |

### Detection Rules

| Rule | Trigger | Confidence |
|---|---|---|
| A | merchantEntityId already linked to recurring_master | 0.95 |
| B | Monthly interval (25-35d), CV amounts <= 0.05, DOM stddev <= 5 | 0.70 base + bonuses |
| C | Monthly interval (25-35d), CV amounts 0.05-0.50 | 0.60 base + bonuses |
| D | Annual interval (335-395d) | 0.65 base |
| E | Weekly (5-9d, min 3), Quarterly (80-100d), or Custom (CV intervals < 0.3) | 0.55-0.65 |

### User Label Handling

- `not_recurring` / `ignore` — transaction excluded from detection group
- `recurring` — +0.10 confidence boost applied to the series

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion for CV boundary was mathematically incorrect**
- **Found during:** GREEN phase (test failure)
- **Issue:** Test `classifyAmountType([94, 100, 106])` expected "variable" but actual CV = 4.899/100 = 0.049 which is below the 0.05 threshold — correctly "fixed"
- **Fix:** Changed test values to `[90, 100, 110]` (CV = 8.165/100 = 0.0816 > 0.05, correctly "variable")
- **Files modified:** tests/unit/recurrence-detector.test.ts
- **Commit:** c34eb53

## Test Results

```
Test Files: 1 passed
Tests:      29 passed
Duration:   2.71s
```

Test suites: `classifyAmountType` (5), `predictNextDate` (5), `computeConfidence` (6), `detectPatternForGroup` (13)

## Self-Check

Files exist check:
- `src/lib/services/recurrence-detector.ts` — created
- `tests/unit/recurrence-detector.test.ts` — created

Commits verified:
- `3fca20f` — RED phase tests
- `c34eb53` — GREEN implementation

## Self-Check: PASSED
