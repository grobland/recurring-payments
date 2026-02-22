# Phase 10: Error Handling - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see helpful, actionable error messages instead of technical failures. This phase improves API error display, form validation, retry logic, and import error messaging. Error tracking infrastructure already exists (Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Error Message Tone & Content
- Professional & clear tone (e.g., "Unable to save subscription. Please try again.")
- Never show technical details to users — keep messages simple and actionable
- Always include a suggested action (retry, contact support, etc.)
- Error toasts require manual dismiss — no auto-dismiss

### Inline Validation Behavior
- Validate on blur (when user leaves field)
- Error text appears below the field
- Red border + error text styling (no icon needed)
- Errors clear immediately when input becomes valid

### Retry UX Patterns
- Automatic retry (2-3 attempts) before showing error to user
- Subtle indicator during retries (spinner or "Retrying..." text)
- No delay between retry attempts — fail fast
- After all retries fail: show "Try again" button + "Contact support" link

### Import Error Granularity
- Specific failure reasons (not generic "something went wrong")
  - "File too large (max 10MB)"
  - "Invalid PDF format"
  - "No transactions found"
- Always include fix suggestions in error messages
- Partial success: show extracted items with "Some transactions may be missing" warning
- Import errors appear as toast notifications (consistent with other errors)

### Claude's Discretion
- Exact error message wording within tone guidelines
- Technical implementation of retry logic
- Which errors are retryable vs fatal
- Specific validation rules per field

</decisions>

<specifics>
## Specific Ideas

- Keep consistency with existing sonner toast usage throughout the app
- Error messages should feel like they come from a helpful assistant, not a machine

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-error-handling*
*Context gathered: 2026-02-04*
