# Phase 22: Source Dashboard & Re-import - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see overview of statement coverage by source (bank/credit card), drill into specific statements to see all items with their status, and re-import items they initially skipped. Batch imports that fail mid-process can be resumed from last successful file.

</domain>

<decisions>
## Implementation Decisions

### Coverage visualization
- Primary metric: Date range (e.g., "Jan 2024 - Feb 2026")
- Secondary info: Both statement/transaction counts AND last import date
- Highlight gaps in coverage (e.g., "Missing: Mar 2025, Apr 2025") to encourage complete import
- Layout: List with expandable rows (not card grid)

### Statement drill-down
- Two-level navigation: Expand source → see statement list → click statement → see transactions
- Show original PDF filename and upload date at top of statement detail
- Summary stats at top: "47 transactions • 12 converted • 8 skipped • 27 pending"
- Color-coded badges for transaction status: green=converted, yellow=skipped, gray=pending

### Re-import flow
- Individual checkboxes to select transactions for re-import
- Confirmation before starting: "Import 3 selected items?"
- Opens subscription form pre-filled with transaction data
- Multiple selections processed one at a time (wizard-style: save one, show next)

### Resume behavior
- Yellow banner at top of batch import page when incomplete batch exists
- Banner shows both progress ("5 of 12 files processed") and failure reason ("Network error on file 6")
- Show list of completed files from interrupted batch
- Discard option with confirmation: "Delete 7 unprocessed files?"

### Claude's Discretion
- Exact banner styling and placement
- Gap detection algorithm (what counts as a "gap")
- Badge color shades and styling
- Expandable row animation

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

*Phase: 22-source-dashboard-re-import*
*Context gathered: 2026-02-09*
