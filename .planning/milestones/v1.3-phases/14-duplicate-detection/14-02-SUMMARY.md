---
phase: 14-duplicate-detection
plan: 02
subsystem: import
tags: [duplicate-detection, import-flow, similarity-scoring, ui-components]

# Dependency graph
requires:
  - phase: 14-01
    provides: calculateSimilarity function
provides:
  - Enhanced duplicate detection during import
  - DuplicateWarning component with two-tier display
  - DuplicateComparison side-by-side view
  - Keep/Skip/Merge action handling in import flow
affects: [14-03, import-confirm-api]

# Tech tracking
tech-stack:
  added: []
  patterns: [expandable-comparison-panel, action-buttons, threshold-based-defaults]

key-files:
  created:
    - src/components/subscriptions/duplicate-warning.tsx
    - src/components/subscriptions/duplicate-comparison.tsx
  modified:
    - src/app/api/import/route.ts
    - src/app/(dashboard)/import/page.tsx

key-decisions:
  - "Use 70% threshold for duplicate detection (matches 14-01 algorithm)"
  - "85%+ similarity defaults to Skip action (conservative)"
  - "70-84% similarity defaults to Keep Both action"
  - "Merge button disabled until 14-03 implements merge API"
  - "Yellow background highlight for 85%+ similarity items"
  - "Click warning badge to expand comparison view"

patterns-established:
  - "DuplicateMatch interface standardizes duplicate info between API and UI"
  - "detectDuplicatesEnhanced uses calculateSimilarity for weighted scoring"
  - "Action buttons pattern: Keep Both / Skip / Merge"
  - "Expandable comparison panel with showComparison state"

# Metrics
duration: 8min
completed: 2026-02-06
---

# Phase 14 Plan 02: Import-Time Detection Summary

**Enhanced import flow with weighted duplicate detection showing two-tier warnings, side-by-side comparison, and Keep/Skip/Merge actions using 70% similarity threshold**

## Files Created/Modified

### Created

- `src/components/subscriptions/duplicate-warning.tsx` (68 lines)
  - Exports: DuplicateWarning, DuplicateWarningProps
  - Two-tier display: 85%+ red with AlertTriangle, 70-84% yellow
  - Tooltip shows matching fields breakdown

- `src/components/subscriptions/duplicate-comparison.tsx` (145 lines)
  - Exports: DuplicateComparison, ExistingSubscription, ImportingSubscription, DuplicateComparisonProps
  - Side-by-side grid comparing Name, Amount, Frequency
  - Highlighted differences with colored backgrounds (blue=existing, amber=new)
  - Legend explaining color coding

### Modified

- `src/app/api/import/route.ts` (+85/-10 lines)
  - Added detectDuplicatesEnhanced using calculateSimilarity from 14-01
  - Returns DuplicateMatch with existingId, score, and matches breakdown
  - Queries only active subscriptions for comparison
  - 70% threshold for duplicate detection

- `src/app/(dashboard)/import/page.tsx` (+198/-16 lines)
  - Added DuplicateMatch interface
  - ImportItem extended with mergeWithId and showComparison
  - Default actions based on similarity: 85%+ Skip, 70-84% Keep Both
  - Expandable comparison panel on badge click
  - Keep Both / Skip / Merge action buttons
  - Yellow background for high similarity items
  - Checkbox disabled when merge action selected

## Decisions Made

1. **Threshold alignment**: Used 70% to match the similarity algorithm from 14-01
2. **Conservative defaults**: 85%+ defaults to Skip to prevent accidental duplicates
3. **Merge disabled**: Button present but disabled until 14-03 implements merge API
4. **Click-to-expand**: Badge click toggles comparison view (not automatic)
5. **Action state management**: setDuplicateAction handles all three actions consistently

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASSED
- Unit tests (30 similarity tests): PASSED
- Code review: Components follow existing patterns

## Next Phase Readiness

Phase 14-03 (Merge API) can proceed:
- DuplicateMatch.existingId available for merge target
- ImportItem.mergeWithId tracks merge selection
- Merge button UI ready (just needs to be enabled)
- Action state properly tracks "merge" action
