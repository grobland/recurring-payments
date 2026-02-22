# Phase 16: Pattern Recognition - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Detect recurring charges across multiple statement imports and suggest subscriptions based on detected patterns. Users can accept suggestions to create subscriptions or dismiss patterns. Creating subscriptions manually and duplicate detection are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Detection Thresholds
- 2 occurrences minimum to suggest a pattern (aggressive detection, catches patterns early)
- 12-month time window for pattern detection (catches annual patterns)
- 70% minimum confidence score to show suggestion (matches roadmap success criteria)
- Re-evaluate patterns on every import (new data immediately updates suggestions)

### Suggestion Presentation
- Dashboard card placement — "X patterns detected" card on main dashboard
- Inline summary for evidence — show charge dates, amounts, detected frequency directly in card
- Order by confidence score (highest first)
- Hide patterns that match existing subscriptions (use duplicate detection to filter)

### User Actions
- Accept: Create subscription immediately with pre-filled data, show success toast
- Dismiss: Hidden for now, can reappear if pattern strengthens significantly
- Pre-fill all detected fields including AI-guessed category based on merchant name
- Toast with undo (10-second) after accepting — matches existing merge undo pattern

### Pattern Matching Rules
- 5% amount variance tolerance (handles minor price changes, FX fluctuations)
- Fuzzy merchant name matching using Jaro-Winkler (0.8 threshold) — "NETFLIX" matches "Netflix Inc"
- ±7 days interval tolerance for frequency detection (handles billing delays, weekends, holidays)
- Same currency only — don't match charges across different currencies

### Claude's Discretion
- Confidence score algorithm weighting
- Pattern storage schema design
- Dashboard card visual design
- Category guessing algorithm

</decisions>

<specifics>
## Specific Ideas

- Reuse existing Jaro-Winkler implementation from duplicate detection (Phase 14)
- 5% amount tolerance matches existing duplicate detection pattern
- Undo toast matches merge undo pattern from Phase 14

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-pattern-recognition*
*Context gathered: 2026-02-06*
