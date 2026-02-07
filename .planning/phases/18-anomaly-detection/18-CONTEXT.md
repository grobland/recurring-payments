# Phase 18: Anomaly Detection & Alerts - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Alert users to unusual subscription changes (price increases >5% or >$2, missed renewals) via notification center and weekly email digest. Users can view, acknowledge, or dismiss alerts. Alerts are batched weekly to prevent alert fatigue.

</domain>

<decisions>
## Implementation Decisions

### Notification Center
- Location: Header bell icon with dropdown (like most SaaS apps)
- Badge indicator: Red dot only, no count number
- Sorting: Newest alerts first (chronological)
- Dropdown limit: 5 alerts shown, then "View all" link

### Alert Presentation
- Color coding: Red for price increases, yellow for missed renewals
- Price increase format: "Old → New" (e.g., "Netflix: $12 → $14")
- Missed renewal format: Expected date only (e.g., "Spotify renewal expected Jan 15")
- Subscription name is clickable link to view/edit the subscription

### Weekly Digest Email
- Delivery: Monday morning
- Content: Alerts + weekly spending summary (total spent, renewals processed)
- No alerts week: Still send summary only (no alerts section)
- Primary CTA: "View alerts" button linking to notification center

### Alert Lifecycle
- Dismiss: Permanently deletes the alert
- Acknowledge: Marks as "reviewed" but keeps the alert
- Expiry: Acknowledged alerts never auto-expire (kept forever until dismissed)
- Bulk action: "Dismiss all" button available
- Cascade on subscription delete: Claude's discretion

### Claude's Discretion
- Exact cascade behavior when subscription is deleted
- Time of day for Monday digest (e.g., 8am UTC)
- Email template styling
- "View all" page layout if needed

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-anomaly-detection*
*Context gathered: 2026-02-07*
