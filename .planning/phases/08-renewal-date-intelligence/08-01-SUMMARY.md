---
phase: 08-renewal-date-intelligence
plan: 01
subsystem: ai-extraction
requires:
  - 07-03 # Smart Import UX with confidence badges
provides:
  - Transaction date extraction via AI
  - Date parsing utilities
  - Renewal date calculation logic
affects:
  - 08-02 # Import Review UI (will use transaction dates)
  - 08-03 # Inline Date Editing (will use parseDateFromAI and calculateRenewalFromTransaction)
tech-stack:
  added: []
  patterns:
    - ISO 8601 date format for AI extraction
    - Binary date confidence (found/not found)
    - Multi-format date parsing with fallbacks
key-files:
  created: []
  modified:
    - src/lib/openai/pdf-parser.ts
    - src/lib/validations/import.ts
    - src/lib/utils/dates.ts
decisions:
  - decision: Use ISO 8601 format for AI-extracted dates
    rationale: Unambiguous parsing, standard format
    impact: Reduced date parsing errors
  - decision: Binary date confidence (dateFound boolean)
    rationale: Per CONTEXT.md - simpler than percentage scores for dates
    impact: Clear indication of whether date was found
  - decision: Multi-format date parsing with fallbacks
    rationale: AI may not always return exact ISO format despite prompt
    impact: More robust date extraction handling
metrics:
  tasks: 2
  commits: 2
  duration: 3.6 minutes
  completed: 2026-02-02
tags:
  - ai-extraction
  - date-parsing
  - renewal-calculation
  - openai
  - gpt-4o
  - date-fns
---

# Phase 8 Plan 01: Transaction Date Extraction Summary

**One-liner:** AI extraction extended to extract transaction dates from bank statements in ISO 8601 format with binary confidence and robust multi-format date parsing utilities.

## What Was Built

Extended the existing AI extraction pipeline to capture transaction dates from bank statements and added date calculation utilities for renewal date inference.

### Task 1: AI Extraction Extension
- Extended `DetectedSubscription` interface with `transactionDate` (string, ISO 8601) and `dateFound` (boolean)
- Updated OpenAI system prompt to request transaction date extraction in ISO 8601 format
- Added validation in both `parseDocumentForSubscriptions` and `parseTextForSubscriptions` to handle date fields
- Updated `detectedSubscriptionSchema` in validation layer to accept new fields

### Task 2: Date Calculation Utilities
- Created `calculateRenewalFromTransaction()` function to advance transaction dates to next future renewal based on billing cycle
- Created `parseDateFromAI()` helper to parse dates from AI responses with multiple fallback formats (ISO, MM/dd/yyyy, MMM d, yyyy, etc.)
- Added required date-fns imports: `parseISO`, `parse`, `isValid`

## Implementation Details

### AI Prompt Enhancement
The system prompt now explicitly requests:
- Transaction date extraction when visible in bank statement
- ISO 8601 format (YYYY-MM-DD) for consistency
- `dateFound: true/false` binary flag instead of confidence percentage
- Graceful handling when dates aren't visible (set dateFound to false)

### Date Parsing Strategy
Implements a fallback chain:
1. Try ISO 8601 format first (primary format requested in prompt)
2. Fall back to common US formats (MM/dd/yyyy, M/d/yyyy)
3. Fall back to written formats (MMM d, yyyy, MMMM d, yyyy)
4. Return null if all parsing attempts fail

This approach handles AI format inconsistencies gracefully.

### Renewal Calculation
`calculateRenewalFromTransaction()` takes a transaction date and billing cycle, then advances the date by one cycle at a time until it's in the future. This ensures the renewal date is always the next upcoming occurrence.

## Decisions Made

1. **ISO 8601 Date Format**
   - Decision: Request ISO 8601 (YYYY-MM-DD) format from AI
   - Rationale: Unambiguous, international standard, no timezone issues
   - Impact: Consistent date parsing, reduced errors

2. **Binary Date Confidence**
   - Decision: Use boolean `dateFound` instead of percentage confidence
   - Rationale: Per CONTEXT.md decision - dates are either found or not, no gray area
   - Impact: Simpler logic, clearer UI indicators

3. **Multi-Format Fallback Parsing**
   - Decision: Parse multiple date formats despite requesting ISO
   - Rationale: AI outputs aren't 100% deterministic, need graceful degradation
   - Impact: More robust extraction, handles AI format variations

4. **Validation Preserves Original Values**
   - Decision: Don't auto-correct or transform dates during validation
   - Rationale: Keep AI output intact for debugging and audit trail
   - Impact: Easier to troubleshoot extraction issues

## Technical Notes

### Type Safety
- `transactionDate` is optional (may be missing from older extractions)
- `dateFound` defaults to false for backward compatibility
- Validation allows both `null` and `undefined` for `transactionDate`

### Backward Compatibility
- Existing extractions without date fields continue to work
- Schema accepts missing fields with appropriate defaults
- No database migration required (dates stored in extraction metadata only at this stage)

## Next Phase Readiness

**Ready for 08-02 (Import Review UI):**
- ✅ Transaction dates available in DetectedSubscription interface
- ✅ Binary confidence flag for UI indicators
- ✅ Date parsing utilities ready for UI formatting

**Ready for 08-03 (Inline Date Editing):**
- ✅ `parseDateFromAI()` available for validating user edits
- ✅ `calculateRenewalFromTransaction()` available for auto-recalculation
- ✅ Multi-format support for flexible user input

## Testing Recommendations

For next plan:
1. Test with actual bank statement PDFs to verify date extraction accuracy
2. Test with statements that have NO visible dates (should return dateFound: false)
3. Test with international date formats (DD/MM/YYYY) to ensure parsing works
4. Verify renewal calculation handles month boundaries correctly (e.g., Jan 31 → Feb 28)

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

### src/lib/openai/pdf-parser.ts
- Extended `DetectedSubscription` interface with date fields
- Updated `SYSTEM_PROMPT` to request transaction date extraction
- Added date field validation in both parsing functions

### src/lib/validations/import.ts
- Added `transactionDate` and `dateFound` to `detectedSubscriptionSchema`

### src/lib/utils/dates.ts
- Added `calculateRenewalFromTransaction()` function
- Added `parseDateFromAI()` helper function
- Imported `parseISO`, `parse`, `isValid` from date-fns

## Commits

- `5db82ff` - feat(08-01): extend AI extraction for transaction dates
- `46a8cdb` - feat(08-01): add renewal date calculation from transaction date

---

**Duration:** 3.6 minutes
**Status:** Complete ✓
**Next:** 08-02 (Import Review UI - display transaction and renewal dates)
