# Phase 13: Analytics Infrastructure - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Analytics foundation with pre-computed aggregates for all intelligence features. Users can view total monthly/yearly spending, spending breakdown by category with visual chart. Analytics refresh every 15 minutes via background job and load in under 100ms.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- Analytics section at top of dashboard, above subscription list — spending totals are first thing users see
- 4-5 stat cards: Monthly total, Yearly total, Subscription count, Upcoming renewals count, (optionally category count)
- Category chart appears below stat cards row as full-width element — chart gets more space
- Mobile: 2x2 grid for stat cards — all visible without scrolling, maintains 44px touch targets

### Chart Visualization
- Donut chart for category spending breakdown — can show total in center, categories around edge
- Category-specific colors — each category has a fixed color (Entertainment=purple, etc.) consistent across views
- Hover tooltips only — show amount and percentage, no click navigation
- Legend with amounts beside chart — category name + color swatch + dollar amount

### Currency Handling
- User's preferred currency set in profile settings — user explicitly chooses their display currency
- Always show currency breakdown — converted total + list of original currency amounts below
- Rate timestamp displayed — show "Rates as of [date]" near totals for transparency
- Prompt to set currency if not configured — show banner asking user to set preferred currency before analytics display correctly

### Time Period Controls
- Preset period selectors — dropdown: This month, Last month, This quarter, This year, Last year
- Default view: Current month — show this month's spending when dashboard loads
- Period selector affects all cards — yearly card follows selector (e.g., "Last year" shows last year's total)
- Selector placement: Above stat cards — clear visual hierarchy, affects everything below

### Claude's Discretion
- Exact stat card order and sizing
- Loading skeleton design for analytics section
- Chart animation on load
- Empty state for users with no subscriptions
- How to handle categories with very small percentages in donut chart

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned — open to standard approaches following existing app patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-analytics-infrastructure*
*Context gathered: 2026-02-05*
