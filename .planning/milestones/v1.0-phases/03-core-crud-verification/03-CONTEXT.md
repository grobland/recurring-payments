# Phase 3: Core CRUD Verification - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify that users can manually manage subscriptions: add new subscriptions, edit existing ones, and delete (soft delete/archive) them. Dashboard should update after each operation. This is verification of existing functionality, not new feature development.

</domain>

<decisions>
## Implementation Decisions

### Manual Test Flow
- Use real subscriptions the user has (Netflix, Spotify, etc.) for testing data
- Test both monthly and yearly billing cycles
- Verify soft delete (archive) behavior — subscriptions should be hidden but recoverable
- Check dashboard updates after each operation (add/edit/delete)

### Edge Cases to Verify
- Test special characters in subscription names: emojis, quotes, long names, unicode
- Verify GBP, USD, and EUR currencies work correctly
- Test form validation: empty name, zero amount, missing required fields
- Verify validation errors display with clear messages
- Test category assignment, changes, and display

### E2E Test Coverage
- Create full Playwright E2E tests (not just scaffold)
- Cover happy path + validation error scenarios
- Run tests against local dev server (npm run dev)
- Set up auth.setup.ts to enable authenticated E2E tests (addresses Phase 2 pending todo)

### Claude's Discretion
- Specific validation error message wording
- Test data values (exact amounts, names)
- Test execution order

</decisions>

<specifics>
## Specific Ideas

- Auth setup should work for both Phase 2 and Phase 3 E2E tests
- Dashboard totals should update in real-time after operations
- Archived subscriptions should not appear in main list

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-core-crud-verification*
*Context gathered: 2026-01-30*
