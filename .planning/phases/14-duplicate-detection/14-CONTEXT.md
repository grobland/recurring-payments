# Phase 14: Duplicate Detection - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Warn users about potential duplicate subscriptions during import and provide tools to find/merge duplicates in existing subscriptions. Users can view similarity scores, see matching fields, and choose to keep, skip, or merge duplicates.

</domain>

<decisions>
## Implementation Decisions

### Similarity Display
- Show percentage with color coding (green/yellow/red based on confidence)
- Display ALL matching fields as evidence (name, amount, frequency, category, source)
- Use side-by-side comparison layout showing existing vs new subscription
- Explicitly highlight differences between duplicates using color/icons

### Merge Behavior
- Newer record wins by default for field values
- Always show field-by-field picker during merge (user selects each field)
- Soft delete the "losing" subscription (mark as merged, keep in database for audit)
- Allow undo within time limit (24-48 hours), then permanent

### Scan Experience
- Explicit "Find Duplicates" button on subscriptions page
- Inline spinner next to button while scanning, results appear when done
- Results shown in expandable inline section on subscriptions page (not separate page)
- "No duplicates found" success message with checkmark, disappears after few seconds

### Import Warnings
- Inline warning badge/icon per potentially duplicate item in import list
- Three explicit action buttons per flagged item: Keep / Skip / Merge
- Clicking Merge applies immediately (item removed from import list)
- Two-tier threshold: 85%+ gets prominent warning, 70-84% gets subtle indicator

### Claude's Discretion
- Exact similarity algorithm and field weighting
- Specific color palette for confidence levels (follow existing green/yellow/red pattern)
- Undo time limit (24 or 48 hours)
- Animation/transition details for inline sections

</decisions>

<specifics>
## Specific Ideas

- Follow existing confidence score pattern from Smart Import UX (green/yellow/red at 80+/50-79/0-49 thresholds, adjust to 85+/70-84/<70 for duplicates)
- Side-by-side comparison should feel like a diff view - clearly show what's the same vs different
- Merge field picker should pre-select "newer wins" values but let user click to switch

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-duplicate-detection*
*Context gathered: 2026-02-05*
