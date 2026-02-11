# Phase 24: Webhook Infrastructure Hardening - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Ensure Stripe webhook events are processed exactly once and reliably. Includes idempotency tracking, failure notifications, health monitoring, and admin visibility. This is backend infrastructure for payment reliability.

</domain>

<decisions>
## Implementation Decisions

### Failure Notification Emails
- Include direct link to Stripe billing portal for payment update
- Claude's discretion: tone (friendly vs professional), retry info inclusion, email frequency

### Idempotency Approach
- Retain processed webhook event IDs for 30 days
- Automatic cleanup via scheduled task removes old records
- Duplicate events: log the duplicate, then return 200 to Stripe
- Claude's discretion: storage schema (event ID only vs ID + type vs full payload)

### Timeout & Retry Behavior
- Add health check endpoint at GET /api/stripe/health
- Health endpoint checks: DB connection + last processed event time
- Claude's discretion: sync vs async processing, error response status to Stripe

### Error Logging & Visibility
- Log all webhook events (received, processed, skipped, failed)
- Email alerts to admin when webhook processing fails
- Add admin webhook log page to view event history, failures, timing
- Claude's discretion: specific alert trigger criteria (threshold vs all failures)

### Claude's Discretion
- Email tone and retry information
- Webhook email frequency (per-failure vs per-cycle)
- Storage schema for processed events
- Sync vs background job architecture
- Error status code returned to Stripe on failure
- Alert threshold criteria

</decisions>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches for webhook infrastructure.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 24-webhook-hardening*
*Context gathered: 2026-02-11*
