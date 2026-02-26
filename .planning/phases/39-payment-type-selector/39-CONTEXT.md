# Phase 39: Payment Type Selector - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a payment type filter to the Payments page transaction browser. Users can filter by All, Recurring, Subscriptions, and One-time. The filter persists in the URL via nuqs and combines with existing filters (tag status, date range, search). Includes the classification mechanism: pattern detection for recurring payments, auto-suggestion of subscriptions for known merchants, and an inline checkbox to confirm/mark subscriptions.

</domain>

<decisions>
## Implementation Decisions

### Toggle Placement & Style
- Segmented control (connected pill group, iOS-style) — active segment has filled background, others ghost/outline
- Positioned above all existing filters (search, date range, tag status)
- No transaction counts on segments — clean labels only
- Width at Claude's discretion based on layout

### Label Wording & Order
- Four segments: All → Recurring → Subscriptions → One-time
- Full words, no abbreviations
- Order follows broadest-to-narrowest: All (everything) > Recurring (all repeating, includes subscriptions) > Subscriptions (confirmed recurring marked as subscription) > One-time (single payments)

### Classification Logic
- **Recurring detection:** Pattern detection — analyze transaction history for repeating amounts/merchants at regular intervals, automatically flag as recurring
- **Subscription identification:** Auto-suggest + confirm — system detects likely subscriptions (known merchants like Netflix, Spotify, etc.) and suggests them; user confirms via checkbox
- **Combined flow:** Pattern detection and subscription suggestion happen together — when a recurring payment is detected AND the merchant matches a known service, the subscription checkbox is pre-checked with a "suggested" indicator
- **Inline checkbox:** Subscription toggle is visible directly on each recurring transaction row in the list, not hidden in a detail view

### Default & Empty States
- Default selection: "All" on first page load (no URL param = All)
- Empty filter type: Show contextual empty state message (e.g., "No one-time payments found")
- Segments are never disabled — all four are always clickable
- No onboarding tooltip — UI should be self-explanatory

### Suggested Subscription Indicator
- Auto-suggested but unconfirmed subscriptions have a subtle visual indicator (badge, dot, or different checkbox style)
- Confirmed subscriptions look different from suggested ones so users can review

### Claude's Discretion
- Segmented control width (fit-content vs full-width)
- Exact pattern detection algorithm/thresholds for recurring identification
- Known merchant list for subscription auto-suggestion
- Loading/transition states when switching segments
- Suggested indicator exact visual treatment (dot, badge, outline style)
- Error state handling

</decisions>

<specifics>
## Specific Ideas

- Recurring is the superset: a subscription is always recurring, but a recurring payment is not necessarily a subscription
- The distinction matters — users want to see all repeating charges (recurring) and separately drill into just their subscriptions
- Subscription checkbox should be quick to toggle without expanding the transaction

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-payment-type-selector*
*Context gathered: 2026-02-26*
