# Phase 7: Smart Import UX - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Show all items detected from PDF statement with confidence scores (0-100), letting users select which ones to import. High-confidence items are pre-selected. Raw extraction data is persisted for audit/reprocessing.

</domain>

<decisions>
## Implementation Decisions

### Confidence Display
- Show numeric percentage with colored background (e.g., "85%" on green)
- Color thresholds: Green ≥70%, Yellow 40-69%, Red <40%
- Badge positioned on right side of each row
- Tooltip on hover explaining "AI confidence this is a recurring subscription"

### Selection Behavior
- Pre-select high-confidence items (≥70%) by default
- Three bulk actions: "Select all" / "Select none" / "Select high confidence"
- Import button shows dynamic count: "Import 5 subscriptions"
- No warning when selecting low-confidence items — user can select freely

### Item Layout
- Table rows (compact, scannable)
- Columns: checkbox, name, amount, cycle, category, confidence badge
- Items shown in original PDF order (not sorted by confidence)
- Inline editing enabled — click to edit name/amount/cycle/category before import

### Low-Confidence Handling
- Low-confidence items (<40%) stay in same list with red badge (not separated)
- If no high-confidence items found: show warning banner "No clear subscriptions found" with all items visible
- If zero items detected: empty state with "No items found" + link to add subscriptions manually

### Claude's Discretion
- Whether to show confidence explanation tooltip for low-confidence items (if AI can provide useful context like "unusual amount" or "one-time charge pattern")
- Exact styling of inline edit fields
- Loading states during extraction

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches that match the existing import page design.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-smart-import-ux*
*Context gathered: 2026-02-02*
