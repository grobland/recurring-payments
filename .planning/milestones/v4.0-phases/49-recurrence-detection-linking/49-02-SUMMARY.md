---
phase: 49-recurrence-detection-linking
plan: "02"
subsystem: recurrence-linking
tags: [auto-linking, confidence-thresholds, review-queue, audit-trail, tdd, services]
dependency_graph:
  requires: [Phase 47 schema, Phase 49 plan 01 recurrence-detector]
  provides: [linkDetectedSeries, LinkingResult, inferRecurringKind, shouldAutoLink, shouldCreateReviewItem, detectAmountChange, isLargeAmountChange]
  affects: [recurring_series, recurring_masters, recurring_master_series_links, review_queue_items, recurring_events]
tech_stack:
  added: []
  patterns: [db-injection for testability, single db.transaction() per merchant group, pure helper functions, onConflictDoNothing idempotency]
key_files:
  created:
    - src/lib/services/recurrence-linker.ts
    - tests/unit/recurrence-linker.test.ts
  modified: []
decisions:
  - "All writes per merchant group wrapped in single db.transaction() per DB pool constraint (3-connection Supabase free tier)"
  - "detectAmountChange returns absolute percentChange — caller handles directionality"
  - "inferRecurringKind receives null merchant category for auto-created masters (DetectedSeries lacks category field)"
  - "shouldAutoLink threshold is strictly >= 0.85; shouldCreateReviewItem is 0.60 <= x < 0.85 (non-overlapping)"
  - "isLargeAmountChange boundary is strictly > 50% (not >= 50%) per plan spec"
metrics:
  duration_seconds: 117
  completed_date: "2026-03-18"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
  test_count: 45
---

# Phase 49 Plan 02: Auto-Linking Engine Summary

**One-liner:** Confidence-threshold auto-linking engine connecting detected series to recurring masters, with review queue for ambiguous matches and full audit trail in recurring_events — 45 tests passing.

## What Was Built

`src/lib/services/recurrence-linker.ts` — the connection layer that turns DetectedSeries output from Plan 49-01 into actionable recurring payment records.

### Exported Functions

| Function | Purpose |
|---|---|
| `linkDetectedSeries(db, userId, detectedSeries)` | Main pipeline: upserts series, links masters, queues reviews, writes events |
| `inferRecurringKind(frequency, amountType, category)` | Heuristic classification: subscription/utility/insurance/loan/rent_mortgage/membership/installment/other_recurring |
| `shouldAutoLink(confidence)` | Returns true for confidence >= 0.85 |
| `shouldCreateReviewItem(confidence)` | Returns true for 0.60 <= confidence < 0.85 |
| `detectAmountChange(newAvg, masterExpected)` | Detects > 10% change; returns absolute percentChange |
| `isLargeAmountChange(percentChange)` | Returns true for > 50% change |
| `linkDetectedSeriesForUser(userId, detectedSeries)` | Convenience wrapper using default db instance |
| `LinkingResult` (type) | Result counters: seriesCreated, mastersCreated, mastersLinked, reviewItemsCreated, eventsLogged, unmatchedSeries |

### Confidence Thresholds Applied

| Range | Action |
|---|---|
| >= 0.85 | Auto-link to existing master or auto-create new master |
| 0.60–0.84 | Add to review_queue_items with suggestedAction JSONB |
| < 0.60 | Series recorded in DB, no master link, no review item |

### DB Write Sequence Per Merchant Group (single transaction)

1. Select-then-upsert recurring_series record (update stats if exists, insert if new)
2. Insert recurring_series_transactions junction rows (`onConflictDoNothing`)
3. Check existing recurringMasterSeriesLinks — if present: check amount changes, update master dates, return early (LINK-06 idempotency)
4. Query recurringMasters for same merchantEntityId + compatible frequency
5. Apply confidence threshold:
   - HIGH: create link + update/create master + log `master_auto_linked` or `master_created`
   - MID: insert reviewQueueItems + log `review_item_created`
   - LOW: log `series_created` only
6. All writes inside `db.transaction()` per DB pool constraint

### Audit Events Written

| Event type | When |
|---|---|
| `series_created` | New series record inserted |
| `master_created` | New master auto-created (high confidence, no existing master) |
| `master_auto_linked` | Series linked to existing master (high confidence) |
| `amount_changed` | New avgAmount differs from master expectedAmount by > 10% |
| `review_item_created` | Mid-confidence series added to review queue |

### Amount Change Detection (LINK-08)

- > 10% change: creates `amount_changed` recurring_event with `{ oldAmount, newAmount, percentChange }`
- > 50% change: additionally creates `amount_change` reviewQueueItem for user confirmation

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

```
Test Files: 1 passed
Tests:      45 passed
Duration:   2.90s
```

Test suites: `inferRecurringKind` (19), `shouldAutoLink` (7), `shouldCreateReviewItem` (7), `detectAmountChange` (7), `isLargeAmountChange` (5)

## Self-Check

Files exist check:
- `src/lib/services/recurrence-linker.ts` — created
- `tests/unit/recurrence-linker.test.ts` — created

Commits verified:
- `143d6b8` — RED phase tests
- `8cda712` — GREEN implementation

## Self-Check: PASSED
