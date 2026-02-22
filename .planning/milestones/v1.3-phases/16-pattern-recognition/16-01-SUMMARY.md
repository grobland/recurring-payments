---
phase: 16-pattern-recognition
plan: 01
subsystem: pattern-detection
tags: [database, algorithms, scoring, pattern-matching]
requires:
  - phase-15-spending-analytics
provides:
  - recurring_patterns table
  - confidence scoring algorithm
  - category guessing utility
affects:
  - phase-16-plan-02 (will use this table and algorithms)
  - phase-16-plan-03 (UI will display patterns with confidence scores)
tech-stack:
  added: []
  patterns:
    - Multi-factor confidence scoring (occurrence, interval, amount)
    - Coefficient of variation for consistency measurement
    - Keyword-based category matching
key-files:
  created:
    - src/lib/db/schema.ts (added recurringPatterns table)
    - src/lib/db/migrations/0003_old_azazel.sql
    - src/lib/utils/pattern-detection.ts
    - src/lib/utils/category-guesser.ts
    - tests/unit/pattern-detection.test.ts
  modified:
    - src/lib/db/schema.ts (added table, relations, type exports)
    - src/lib/db/migrations/meta/_journal.json
    - src/lib/db/migrations/meta/0003_snapshot.json
decisions:
  - title: "Confidence scoring uses 3-factor weighted system"
    rationale: "Balances occurrence count (30pts), interval consistency (40pts), and amount consistency (30pts) to provide robust pattern strength measurement"
    alternatives: ["Simple occurrence count", "Machine learning model"]
    date: 2026-02-06
  - title: "Pattern dismissal is soft (timestamp-based)"
    rationale: "Users can change their mind - dismissed patterns can be shown again if needed"
    alternatives: ["Hard delete", "Permanent hidden flag"]
    date: 2026-02-06
  - title: "Category guessing uses keyword matching"
    rationale: "Simple, fast, and transparent approach. Good enough for initial suggestion without ML complexity"
    alternatives: ["OpenAI API for classification", "Rule-based merchant database", "No guessing"]
    date: 2026-02-06
metrics:
  duration: 11 minutes
  completed: 2026-02-06
  tasks: 3
  commits: 2
  files-changed: 9
---

# Phase 16 Plan 01: Pattern Recognition Foundation Summary

Multi-factor confidence scoring (occurrence, interval, amount) for recurring charge pattern detection with automated category guessing

Created the foundational database schema and algorithms for detecting recurring charge patterns. Implements confidence scoring based on occurrence count, interval consistency, and amount variance, with automated category guessing for detected patterns.

## What Was Built

### 1. Database Schema: recurring_patterns Table

**Location:** `src/lib/db/schema.ts`

**Schema:**
- Pattern identification: merchantName, currency
- Detection statistics: occurrenceCount, avgAmount, amountStddev, avgIntervalDays, intervalStddev, detectedFrequency
- Evidence arrays (JSON): chargeDates, amounts
- Confidence: confidenceScore (0-100)
- User actions: dismissedAt, acceptedAt, createdSubscriptionId
- Indexes on: userId, merchantName+currency, confidenceScore

**Migration:** `0003_old_azazel.sql` generated successfully

### 2. Confidence Scoring Algorithm

**Location:** `src/lib/utils/pattern-detection.ts`

**Exports:**
- `calculatePatternConfidence(pattern)` - Main scoring function
- `isDisplayableConfidence(score)` - Checks if score >= 70 (minimum display threshold)
- `getConfidenceTier(score)` - Returns "high" (>=80), "medium" (>=50), or "low"
- `CONFIDENCE_THRESHOLDS` constants

**Scoring Breakdown:**
- **Occurrence Score (0-30 points):** 10 + (count * 5), capped at 30
  - 2 occurrences = 20pts, 5+ = 30pts
- **Interval Score (0-40 points):** 40 - (CV * 100), where CV = stddev/mean
  - Consistent intervals (low stddev) score higher
- **Amount Score (0-30 points):** 30 - (CV * 100)
  - Identical amounts score 30pts, varying amounts score lower

**Frequency Detection:**
- Monthly: avgIntervalDays within 30 ± 7 days
- Yearly: avgIntervalDays within 365 ± 7 days
- Null: Other intervals (e.g., quarterly, weekly)

### 3. Category Guessing Utility

**Location:** `src/lib/utils/category-guesser.ts`

**Functions:**
- `guessCategory(merchantName, categories)` - Returns category ID or null
- `guessCategorySlug(merchantName)` - Returns category slug for testing

**Keyword Mapping:**
14 category types with keyword lists:
- streaming: netflix, hulu, disney, hbo, etc.
- software: adobe, microsoft, github, figma, etc.
- gaming: xbox, playstation, steam, etc.
- music: spotify, apple music, etc.
- news, health, cloud, finance, utilities, productivity, communication, education, security, shopping

**Matching:** Case-insensitive substring search through keyword lists

## Testing

**Tests:** `tests/unit/pattern-detection.test.ts` (21 tests, all passing)

**Coverage:**
- Occurrence scoring at various counts (2, 5, 10+)
- Interval consistency with low/high stddev
- Amount consistency with zero/varying stddev
- Frequency detection (monthly, yearly, quarterly)
- Total score calculation and capping
- Helper function behavior (isDisplayableConfidence, getConfidenceTier)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Confidence thresholds:** MIN_DISPLAY = 70, MEDIUM = 50, HIGH = 80
   - Ensures only patterns with decent confidence are surfaced to users
   
2. **Table design includes evidence arrays (chargeDates, amounts)**
   - Allows UI to show "proof" of pattern to users
   - Enables pattern recalculation if detection algorithm improves
   
3. **Category guessing returns null if no match**
   - Users can manually select category, no forcing of incorrect guesses

## Integration Points

**Connects to:**
- `users` table (userId foreign key)
- `subscriptions` table (createdSubscriptionId for tracking accepted patterns)
- `categories` table (via guessCategory function)

**Used by (future):**
- Plan 16-02: Pattern detection query (will populate this table)
- Plan 16-03: Pattern suggestion UI (will read and display)

## Next Phase Readiness

**Ready for:**
- Phase 16 Plan 02: Pattern detection SQL query
- Can start implementing detection logic that populates recurringPatterns table

**Blocks:**
- None - all dependencies met

**Concerns:**
- None - schema and algorithms are well-tested and ready

## Files Modified

### Created
- `src/lib/db/migrations/0003_old_azazel.sql` - Database migration
- `src/lib/db/migrations/meta/0003_snapshot.json` - Migration snapshot
- `src/lib/utils/pattern-detection.ts` - Confidence scoring algorithm (128 lines)
- `src/lib/utils/category-guesser.ts` - Category keyword matching (223 lines)
- `tests/unit/pattern-detection.test.ts` - Comprehensive tests (309 lines)

### Modified
- `src/lib/db/schema.ts` - Added recurringPatterns table, relations, type exports
- `src/lib/db/migrations/meta/_journal.json` - Migration journal update

## Performance Notes

- Confidence calculation is pure JavaScript, no DB queries
- Category guessing uses simple string matching (O(n) where n = number of keywords)
- Both operations are fast enough for real-time UI (< 1ms)

## Commit Summary

| Commit | Task | Files | Description |
|--------|------|-------|-------------|
| 0c1b011 | 1 & 3 | 5 | Add recurring_patterns table + category guesser |
| d0afe44 | 2 | 2 | Add pattern confidence scoring + tests |

**Total changes:** 9 files, ~1,900 lines added
