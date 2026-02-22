---
phase: 23
plan: 01
subsystem: suggestions
tags: [api, bulk-operations, ui-components, recharts, patterns]
requires: [phase-18-pattern-detection]
provides:
  - Bulk patterns API endpoint
  - ConfidenceBadge component
  - EvidenceList component
  - SuggestionTimeline component
affects: [phase-23-02, phase-23-03]
tech-stack:
  added: []
  patterns:
    - Bulk transaction with FOR UPDATE locking
    - Color-coded tier badges with tooltips
    - Transaction links with search params
key-files:
  created:
    - src/app/api/patterns/bulk/route.ts
    - src/components/suggestions/confidence-badge.tsx
    - src/components/suggestions/evidence-list.tsx
    - src/components/suggestions/suggestion-timeline.tsx
  modified: []
decisions:
  - choice: "FOR UPDATE locking"
    why: "Prevent race conditions during bulk operations"
  - choice: "10% variance threshold"
    why: "Flag significant price changes without false positives"
  - choice: "Scatter chart for timeline"
    why: "Visual pattern representation in compact space"
metrics:
  duration: ~2.4 min
  completed: 2026-02-09
---

# Phase 23 Plan 01: Bulk API & Suggestion Components Summary

**One-liner:** POST /api/patterns/bulk for atomic bulk accept/dismiss with ConfidenceBadge, EvidenceList, and SuggestionTimeline components

## What Was Built

### Task 1: Bulk Patterns API Endpoint

Created `POST /api/patterns/bulk` endpoint that handles both accept and dismiss operations atomically:

**Endpoint behavior:**
- Validates session (401 if unauthorized)
- Validates request body with Zod schema
- Uses `db.transaction()` with `.for("update")` to prevent race conditions
- For "accept" action:
  - Fetches patterns not already processed, owned by user
  - Creates subscriptions with guessed categories
  - Calculates nextRenewalDate from most recent charge
  - Returns `{ success, acceptedCount, subscriptionIds }`
- For "dismiss" action:
  - Bulk updates dismissedAt timestamp
  - Returns `{ success, dismissedCount }`

**Error handling:**
- 400 for invalid body or empty array
- 404 if no valid patterns found
- 500 for transaction failure

### Task 2: Suggestion UI Components

Created three reusable components in `src/components/suggestions/`:

**ConfidenceBadge:**
- Uses `getConfidenceTier()` from pattern-detection.ts
- Color mapping: high=green, medium=yellow, low=red
- Shows "{score}% match" text
- Optional tooltip with tier explanation

**EvidenceList:**
- Calculates amount variance (flags if >10% from average)
- Shows yellow warning banner for price variation
- Lists charge dates with formatted amounts
- Each row links to `/transactions?search={merchant}&dateFrom={date}`
- ExternalLink icon appears on hover

**SuggestionTimeline:**
- Uses Recharts ScatterChart in ResponsiveContainer
- X-axis shows dates with "MMM yyyy" format
- Scatter points represent charge occurrences
- Custom tooltip showing date and formatted amount
- Compact 80px height

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Locking strategy | FOR UPDATE | Prevents race conditions on concurrent bulk operations |
| Variance threshold | 10% | Balances sensitivity with false positive avoidance |
| Chart type | Scatter | Best for showing temporal distribution of charges |

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/app/api/patterns/bulk/route.ts` | Created | 195 |
| `src/components/suggestions/confidence-badge.tsx` | Created | 56 |
| `src/components/suggestions/evidence-list.tsx` | Created | 70 |
| `src/components/suggestions/suggestion-timeline.tsx` | Created | 109 |

**Total:** 4 files created, ~430 lines

## Verification

- [x] TypeScript compilation passes with no errors
- [x] Bulk API endpoint handles both accept and dismiss actions
- [x] Bulk accept uses database transaction for atomicity
- [x] UI components follow existing shadcn/ui patterns
- [x] EvidenceList links to transaction browser with correct query params
- [x] key_links patterns verified (db.transaction, href.*transactions)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 7cbf683 | feat(23-01): create bulk patterns API endpoint |
| 28f6d69 | feat(23-01): add suggestion UI components |

## Next Phase Readiness

Phase 23-02 can now:
- Use bulk API for multi-select operations
- Import ConfidenceBadge, EvidenceList, SuggestionTimeline components
- Build suggestions panel/page with these foundation pieces
