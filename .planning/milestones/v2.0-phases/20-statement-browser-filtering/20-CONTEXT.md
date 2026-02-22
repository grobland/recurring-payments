# Phase 20: Statement Browser & Filtering - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Browse and filter all stored transactions with fast, responsive UI. Users can view the transaction list, filter by source/date/tag status, and search by merchant name. Virtualized scrolling handles 10k+ items. Tagging and conversion are separate phases.

</domain>

<decisions>
## Implementation Decisions

### List layout & density
- Dense table layout for desktop — compact rows, many visible at once
- Full info per row: date, merchant, amount, source, category, tag status, and inline actions
- Mobile adapts to stacked cards — touch-friendly, no horizontal scroll
- Clickable column headers toggle sort direction (default: date descending)

### Filter UI design
- Top bar (horizontal) — filters in a row above the list, always visible
- Active filters indicated by filled inputs — standard form behavior
- Filter bar is sticky when scrolling — always accessible
- "Clear all filters" button always shown

### Search behavior
- Instant search (as you type) — results update with each keystroke
- Search matches merchant and category fields
- Case-insensitive matching (no fuzzy/typo tolerance)
- Empty results show simple message: "No transactions match your search"

### Tag status display
- Colored badges for status: Blue = potential, Green = converted, Gray = dismissed
- Untagged transactions show no indicator — clean, less visual noise
- Tag status filter is a single-select dropdown (one status or "All")

### Claude's Discretion
- Exact virtualization implementation details
- Keyset pagination cursor structure
- Loading skeleton design during fetch
- Column widths and responsive breakpoints
- Exact badge styling (pill vs rounded rectangle)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-statement-browser-filtering*
*Context gathered: 2026-02-09*
