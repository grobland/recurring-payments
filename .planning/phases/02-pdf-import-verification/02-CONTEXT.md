# Phase 2: PDF Import Verification - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify the existing PDF import feature works end-to-end: user uploads a real bank statement, AI extracts subscriptions using GPT-4 Vision, user reviews and corrects results, and imported subscriptions appear in the dashboard. This is verification of existing code, not feature building.

</domain>

<decisions>
## Implementation Decisions

### Test PDF Strategy
- Use a real bank statement (user has one ready with 9+ subscriptions)
- User knows specific subscriptions to check for in results
- Import review flow should allow checking/validating each entry

### Extraction Expectations
- Extract full details: name, amount, frequency, date, category if possible
- Must find all subscriptions on the statement (high accuracy expected)
- Auto-detect currency from the statement (GBP, USD, EUR, etc.)
- Manual correction during review step for any extraction errors

### Verification Criteria
- End-to-end success required: Upload → extraction → review → save → appears in subscriptions list
- Verify saved subscription data is correct (amounts, names, dates match)
- Manual verification first, then add automated tests

### Error Handling
- Extraction failures: show error with retry option
- Zero subscriptions found: show raw extracted data so user can manually select subscriptions
- Timeout on long processing: timeout error with retry option

### Claude's Discretion
- Import review UI approach (one-by-one vs bulk approve with exceptions)
- Loading state design during processing
- Timeout duration for API calls
- Technical implementation of raw data display on zero results

</decisions>

<specifics>
## Specific Ideas

- User wants to see extracted transactions even if AI doesn't categorize them as subscriptions
- Manual correction is acceptable — extraction doesn't need to be perfect, just reviewable
- Real bank statement with 9+ known subscriptions provides good test coverage

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-pdf-import-verification*
*Context gathered: 2026-01-28*
