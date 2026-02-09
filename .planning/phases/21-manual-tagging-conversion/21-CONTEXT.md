# Phase 21: Manual Tagging & Conversion - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can manually enrich statement data by tagging transactions and converting them to subscriptions. Includes bulk operations for tagging multiple items. Tags are user-managed. Conversions link transactions to subscriptions bidirectionally.

</domain>

<decisions>
## Implementation Decisions

### Tagging Interaction
- Inline icon button in each transaction row to trigger tagging
- Multiple custom tags supported (not just "potential subscription")
- Tags managed in separate settings area; tagging dropdown shows existing tags only
- Colored badge pills display next to merchant name showing applied tags

### Bulk Operations
- Checkbox column on each row for multi-select
- Header checkbox selects visible rows only (not all matching filter)
- Floating action bar appears at screen bottom when items selected
- Bar shows count of selected items + available bulk actions

### Conversion Flow
- One-click conversion with confirmation toast (no form modal)
- Auto-populates: merchant name → subscription name, amount, transaction date → next renewal
- AI-guessed category from merchant name included in auto-fill
- Transaction shows "Converted" badge after conversion, remains visible in list
- Bidirectional link: transaction shows linked subscription, subscription shows source
- Undo capability: can unlink transaction from subscription, restoring transaction to unconverted state

### Data Persistence
- Tags stored at transaction level (not merchant pattern level)
- Same merchant across different statements can have different tags
- Re-import preserves all manual tags (duplicate detection keeps existing tagged transaction)
- Deleting transaction cascades to delete its tags

### Claude's Discretion
- Specific bulk actions available (tag only vs tag + convert)
- Bidirectional linking implementation details
- Tag badge colors and visual styling
- Floating bar animation and styling

</decisions>

<specifics>
## Specific Ideas

- User expects tag management similar to category management (separate settings area)
- Conversion should feel quick — no friction for obvious subscriptions
- "Converted" status should be visually distinct from user-applied tags

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-manual-tagging-conversion*
*Context gathered: 2026-02-09*
