---
phase: 14-duplicate-detection
plan: 03
subsystem: ui
tags: [duplicate-detection, merge, subscriptions, tanstack-query, dialog, undo]

requires:
  - phase: 14-01
    provides: calculateSimilarity algorithm for duplicate scoring
provides:
  - Background duplicate scanning endpoint
  - Merge and undo API endpoints
  - DuplicateScanSection UI component
  - MergeFieldPicker dialog for field selection
  - useDuplicateScan and useMergeSubscription hooks
affects: [14-04, subscription-management]

tech-stack:
  added: []
  patterns:
    - Merge tracking via soft delete (mergedAt, mergedIntoId)
    - Undo window pattern (24-hour time limit)
    - Optimistic updates with toast undo action
    - Field picker with "newer wins" defaults

key-files:
  created:
    - src/app/api/subscriptions/duplicates/route.ts
    - src/app/api/subscriptions/merge/route.ts
    - src/lib/hooks/use-duplicate-scan.ts
    - src/lib/hooks/use-merge-subscription.ts
    - src/components/subscriptions/duplicate-scan-results.tsx
    - src/components/subscriptions/merge-field-picker.tsx
    - src/lib/db/migrations/0002_gorgeous_surge.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/hooks/index.ts
    - src/app/(dashboard)/subscriptions/page.tsx
    - src/app/api/subscriptions/route.ts

key-decisions:
  - "Self-referential FK for mergedIntoId handled via Drizzle relations, not column reference"
  - "70% similarity threshold for duplicate detection"
  - "24-hour undo window for merged subscriptions"
  - "Merged subscriptions excluded from main list via mergedAt filter"
  - "Newer subscription values pre-selected as defaults in merge picker"

patterns-established:
  - "Merge tracking: mergedAt + mergedIntoId for soft delete with undo"
  - "Undo toast pattern: 10-second display with clickable undo action"
  - "Field picker: Radio groups for each field, identical values shown as single option"

duration: 18min
completed: 2026-02-06
---

# Phase 14 Plan 03: Background Scan and Merge Summary

**Find Duplicates button with inline results, field-by-field merge picker, and 24-hour undo capability for subscription deduplication**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-06T10:47:00Z
- **Completed:** 2026-02-06T11:05:00Z
- **Tasks:** 4
- **Files modified:** 12

## Accomplishments

- Schema extended with mergedAt and mergedIntoId for merge tracking
- Duplicate scan API performs O(n^2) pairwise comparison with 70% threshold
- Merge API updates target, soft-deletes source, supports 24hr undo
- DuplicateScanSection integrated into subscriptions page with expandable results
- MergeFieldPicker dialog with "newer wins" defaults and identical value detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Add merge tracking fields to schema** - `c32c5d7` (feat)
2. **Task 2: Create duplicate scan and merge API endpoints** - `6803856` (feat)
3. **Task 3: Create hooks and UI components for scan and merge** - `fb28b2e` (feat)
4. **Task 4: Integrate scan UI into subscriptions page** - `21fe652` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added mergedAt, mergedIntoId fields and self-referential relations
- `src/lib/db/migrations/0002_gorgeous_surge.sql` - Migration for new columns
- `src/app/api/subscriptions/duplicates/route.ts` - POST endpoint for duplicate scanning
- `src/app/api/subscriptions/merge/route.ts` - POST/DELETE for merge and undo
- `src/lib/hooks/use-duplicate-scan.ts` - TanStack Query mutation for scanning
- `src/lib/hooks/use-merge-subscription.ts` - Mutation with optimistic updates and undo toast
- `src/components/subscriptions/duplicate-scan-results.tsx` - DuplicateScanSection and card components
- `src/components/subscriptions/merge-field-picker.tsx` - Field-by-field selection dialog
- `src/app/(dashboard)/subscriptions/page.tsx` - Integrated DuplicateScanSection
- `src/app/api/subscriptions/route.ts` - Added mergedAt exclusion filter

## Decisions Made

- **Self-reference pattern:** Used Drizzle relations with relationName instead of column-level FK reference to avoid TypeScript circular type issues
- **Similarity threshold:** 70% chosen as balance between catching duplicates and avoiding false positives (plan specified 70%)
- **Undo window:** 24 hours gives users time to notice mistakes while keeping merged data eventually consistent
- **Field defaults:** Pre-selecting newer values as defaults aligns with expectation that recent data is more accurate

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript self-reference error when using `references(() => subscriptions.id)` in column definition - resolved by moving to relations definition with relationName
- Pre-existing TypeScript errors in import page from Phase 14-02 (isDuplicate property) - not addressed as outside scope of this plan

## User Setup Required

**Database migration must be applied:**
```bash
npm run db:push
# OR run SQL directly in Supabase SQL Editor:
# ALTER TABLE "subscriptions" ADD COLUMN "merged_at" timestamp with time zone;
# ALTER TABLE "subscriptions" ADD COLUMN "merged_into_id" uuid;
```

## Next Phase Readiness

- Duplicate scan and merge fully functional
- Ready for Phase 14-04 (Statistics Dashboard) which will use this data
- All similarity scoring, detection, and merge infrastructure in place

---
*Phase: 14-duplicate-detection*
*Completed: 2026-02-06*
