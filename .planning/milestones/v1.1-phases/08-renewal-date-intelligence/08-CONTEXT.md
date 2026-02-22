# Phase 8: Renewal Date Intelligence - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Calculate renewal dates from actual transaction dates extracted from bank statements, not from import date. Users can review extracted dates, edit them, and see calculated renewal dates before importing.

</domain>

<decisions>
## Implementation Decisions

### Date display
- Show BOTH dates: extracted transaction date AND calculated renewal date (full transparency)
- Format: Relative + full — "in 5 days (Feb 15, 2026)"
- Location: Inline per item in the import review list
- Prominence: Equal weight for both dates (same size/visibility)

### Fallback behavior
- When AI can't extract date: Leave empty, show "Date not found"
- Visual indicator: Warning indicator (yellow/orange badge or icon) for missing dates
- Import allowed: Yes, users can import items without dates
- If imported without date: Renewal date stays null until user manually sets one

### Override interaction
- Edit trigger: Click to edit (date appears as text, click to reveal input)
- Input type: Inline text input with date format hint (not calendar picker)
- After editing: Show visual diff — original AI date struck through, new date next to it
- Bulk editing: None — per-item editing only
- Editable fields: BOTH transaction date and renewal date are editable
- Validation: Sensible validation — block obviously wrong dates (far past, invalid years)
- Revert option: Yes — show "restore original" action after user edits a date
- Auto-recalculate: When transaction date is edited, renewal date auto-recalculates from billing cycle

### Date confidence
- Model: Binary only — "date found" or "date not found" (no percentage scores)
- Visual: Color coding — green for found dates, yellow/warning for missing
- Selection impact: None — high-confidence items still auto-selected even with missing dates
- Indicator placement: Separate from item confidence badge
- Tooltips: Yes — hover shows "Date not found in statement" or similar explanation

### Claude's Discretion
- Exact date input validation rules
- Loading states during date calculation
- Keyboard accessibility for date editing
- Exact tooltip text and placement

</decisions>

<specifics>
## Specific Ideas

- Visual diff after editing: struck-through original + new value (similar to track changes)
- Transaction date edits should cascade to renewal date via billing cycle calculation
- Warning indicator pattern should match the confidence badges from Phase 7

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-renewal-date-intelligence*
*Context gathered: 2026-02-02*
