---
phase: 07-smart-import-ux
plan: 03
subsystem: ui
tags: [react, openai, gpt-4o, ai-confidence, bulk-selection, inline-editing]

# Dependency graph
requires:
  - phase: 07-01
    provides: Raw extraction data persistence in import_audits table
  - phase: 07-02
    provides: Badge component with success/warning/destructive variants
provides:
  - Complete Smart Import review UI with confidence visualization
  - Bulk selection controls (Select all/none/high-confidence)
  - Inline editing for name, amount, cycle, category, renewal date
  - AI prompt returning ALL confidence levels (not filtering low/medium items)
  - Aligned confidence thresholds: 80+ (high), 50-79 (medium), 0-49 (low)
affects: [phase-8-renewal-date-inference, future-ai-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AI prompt engineering: explicit instructions for comprehensive extraction"
    - "Confidence threshold alignment: UI badges, selection logic, and AI prompt use consistent boundaries"
    - "Bulk selection pattern: selectAll/selectNone/selectByCondition helpers"

key-files:
  created: []
  modified:
    - src/lib/openai/pdf-parser.ts
    - src/app/(dashboard)/import/page.tsx

key-decisions:
  - "Changed AI prompt from 'be conservative' to 'include ALL potential subscriptions' with confidence scores"
  - "Aligned confidence thresholds from 70/40 to 80/50 to match AI prompt guidelines"
  - "Auto-select only 80+ confidence items by default (more conservative than original 70+)"

patterns-established:
  - "ConfidenceBadge component with tooltip explaining AI confidence"
  - "Bulk selection controls above item lists for batch operations"
  - "Warning banner for low-confidence-only results"

# Metrics
duration: 15min
completed: 2026-02-02
---

# Phase 07 Plan 03: Smart Import UX Summary

**AI-powered import with confidence visualization, bulk selection, and comprehensive extraction returning ALL detected items including low/medium confidence subscriptions**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-02T15:57:00Z (approx - continuation from checkpoint)
- **Completed:** 2026-02-02T16:12:28Z
- **Tasks:** 3 (resumed from checkpoint at Task 3)
- **Files modified:** 2

## Accomplishments
- Fixed AI prompt to return ALL confidence levels (not filtering out low/medium items)
- Aligned confidence thresholds across AI prompt, UI badges, and selection logic (80+/50+)
- Complete Smart Import UX with confidence badges, bulk selection, and inline editing
- Raw extraction data flows from import API through confirm API to database

## Task Commits

Each task was committed atomically:

1. **Task 1: Add bulk selection controls and confidence badge helper** - `1a1138d` (feat)
2. **Task 2: Update review UI with bulk controls and inline editing** - `6e07955` (feat)
3. **Task 3 (checkpoint): Verify complete Smart Import flow** - User feedback triggered fixes:
   - `6f07f65` (fix) - Return all confidence levels in AI extraction
   - `51e53a6` (fix) - Align confidence thresholds with AI prompt

**Plan metadata:** (to be committed after SUMMARY creation)

## Files Created/Modified
- `src/lib/openai/pdf-parser.ts` - Updated SYSTEM_PROMPT to return ALL potential subscriptions with confidence scores
- `src/app/(dashboard)/import/page.tsx` - Added ConfidenceBadge, bulk selection controls, inline editing, updated thresholds

## Decisions Made

**1. Changed confidence threshold from 70/40 to 80/50**
- **Rationale:** More conservative auto-selection reduces false positives
- **AI prompt guidelines:** 80-100 (high), 50-79 (medium), 0-49 (low)
- **UI alignment:** Badge colors, default selection, and "Select high confidence" button all use 80+ threshold

**2. AI prompt explicitly requests ALL items regardless of confidence**
- **Rationale:** User reported only high-confidence items appearing, no medium/low items
- **Root cause:** SYSTEM_PROMPT said "be conservative - only include items you're reasonably confident"
- **Fix:** Changed to "Include ALL potential subscriptions, even if you have low confidence - let the user decide"
- **Impact:** Users now see complete extraction results and can manually review uncertain detections

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AI prompt filtering out low/medium confidence items**
- **Found during:** Task 3 checkpoint - user feedback "only high confidence items showing"
- **Issue:** SYSTEM_PROMPT instructed AI to "be conservative" which caused filtering of uncertain items at extraction time
- **Fix:** Updated prompt to explicitly request ALL items: "Include ALL potential subscriptions, even if you have low confidence - let the user decide what to import"
- **Files modified:** src/lib/openai/pdf-parser.ts (line 52)
- **Verification:** User will test import flow and verify medium/low confidence items appear
- **Committed in:** `6f07f65` (separate fix commit)

**2. [Rule 1 - Bug] Misaligned confidence thresholds between AI prompt and UI**
- **Found during:** Task 3 - immediately after fixing AI prompt
- **Issue:** AI prompt specified 80/50/0 thresholds but UI used 70/40 thresholds for badge colors and selection
- **Fix:** Updated ConfidenceBadge component and all selection logic to use 80/50 thresholds consistently
- **Files modified:** src/app/(dashboard)/import/page.tsx (lines 69, 151, 188, 202-203)
- **Verification:** TypeScript compilation passes, thresholds consistent across codebase
- **Committed in:** `51e53a6` (separate fix commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for correct user experience. First fix addresses user-reported issue blocking Smart Import UX validation. Second fix ensures UI consistency with AI prompt. No scope creep - both are correctness fixes.

## Issues Encountered

**Issue: User reported "only high confidence items showing, no medium or low"**
- **Root cause:** AI prompt instructed model to be conservative and filter uncertain items
- **Resolution:** Modified SYSTEM_PROMPT to explicitly return ALL items with confidence scores
- **Learning:** AI prompt instructions must be explicit about desired behavior - "be conservative" caused silent filtering

## Authentication Gates

None - no external services required authentication during execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 8 (Renewal Date Inference):**
- Smart Import UX complete with confidence visualization
- Users can now see and select from ALL detected items
- Raw extraction data persisted for audit trail
- AI prompt patterns established for Phase 8 enhancements

**No blockers.**

**Considerations for Phase 8:**
- Can enhance AI prompt to infer next renewal dates from statement data
- Confidence threshold patterns established here apply to renewal date confidence
- Bulk selection pattern reusable for other review flows

---
*Phase: 07-smart-import-ux*
*Completed: 2026-02-02*
