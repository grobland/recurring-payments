# Phase 15: Spending Analytics & Trends - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Visualize spending trends over time with month-over-month changes, year-over-year comparisons, and per-category trend lines. Users understand how their subscription spending evolves. Forecasting and anomaly detection are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Trend Indicators
- Display format: Absolute + percentage (e.g., +$24 (+12%))
- Color scheme: Red for increases (bad), green for decreases (good) — spending context
- Placement: Dashboard stat cards only, not in category breakdown
- Zero change: Show 0% explicitly with neutral styling

### Chart Types
- Year-over-year: Dual line chart (current year vs previous year, same x-axis by month)
- Category trends: Multi-line chart with one line per category
- Show all categories on chart (not limited to top N)
- Interactivity: Hover tooltips only, no click-to-filter

### Time Range Selection
- Available periods: 1M / 3M / 6M / 1Y / All
- Default period: 3 months
- Limited history handling: Show available data with "More data needed for trends" message
- Period selector: Shared with existing dashboard analytics (same dropdown controls cards and charts)

### Multi-Currency Display
- Converted amounts: Show in user's default currency with indicator badge when conversion occurred
- Tooltip detail: Show both original and converted amounts on hover
- Exchange rate timing: Use transaction-time rates for accuracy
- Currency view: Default currency only, no toggle to switch views

### Claude's Discretion
- Chart styling and colors for category lines
- Tooltip formatting and positioning
- Indicator icon/badge design for currency conversion
- "More data needed" message wording and placement

</decisions>

<specifics>
## Specific Ideas

No specific product references — open to standard charting approaches using Recharts library already in stack.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-spending-analytics-trends*
*Context gathered: 2026-02-06*
