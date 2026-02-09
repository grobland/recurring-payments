# Phase 23: AI Suggestions & Pattern Detection - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

System proactively suggests subscriptions based on recurring patterns detected in statement transaction data. Users can view suggestions with evidence, accept to create subscriptions, or dismiss permanently. High-confidence items are auto-tagged during import.

</domain>

<decisions>
## Implementation Decisions

### Suggestion Presentation
- Card per merchant: each suggested merchant gets its own card with all occurrences grouped
- Dedicated /suggestions page for full review and management
- Compact (high density): merchant name, amount, occurrence count at a glance - details on expand
- Confidence scores always visible on each suggestion card

### Evidence Display
- Expand shows both: transaction list with mini timeline visualization above it
- Amount display: list all amounts with variance flag (highlight if amounts vary significantly - potential price change)
- Simple frequency label: just "Monthly", "Yearly", "Weekly" (no interval math shown)
- Clickable links: each transaction in evidence links to transaction browser filtered to that item

### Accept/Dismiss Flow
- One-click accept: creates subscription immediately with detected values (no form review)
- Permanent dismiss: dismissed suggestions never appear again for this merchant
- Bulk actions: multi-select with checkboxes, bulk accept and bulk dismiss available
- Auto-link on accept: all matched transactions get linked to the new subscription

### Auto-tagging Visibility
- During import: tag high-confidence items in real-time as they're processed
- Toast notification: "X potential subscriptions detected" after import completes
- Special tag badge: distinct "AI Suggested" or similar tag visible in transaction browser
- User control: settings toggle to disable auto-tagging

### Claude's Discretion
- Exact confidence threshold for auto-tagging (requirement says >80%)
- Pattern detection algorithm implementation details
- Timeline visualization design
- Badge and toast styling

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned - open to standard approaches that follow existing codebase patterns (shadcn/ui components, TanStack Query hooks, existing tag infrastructure).

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 23-ai-suggestions-pattern-detection*
*Context gathered: 2026-02-09*
