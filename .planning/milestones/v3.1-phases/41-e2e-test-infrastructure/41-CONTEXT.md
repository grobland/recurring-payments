# Phase 41: E2E Test Infrastructure - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken v3.0 Playwright auth setup and build a reliable 25-30 test suite covering all major user flows (auth, subscriptions, vault, analytics, billing, accounts, export, overlap, onboarding). Add data-testid attributes to interactive elements for stable selectors. This is the regression baseline for v3.1.

</domain>

<decisions>
## Implementation Decisions

### Test data strategy
- Each test creates its own data fresh — no pre-seeded database
- Tests clean up after themselves (delete subscriptions/data created during the test)
- Dedicated test account (e.g., e2e-test@example.com) separate from development data
- Claude's discretion on whether to use API calls or UI for data setup per test — pick the approach that best fits what each test is verifying

### Failure debugging
- Screenshots on failure (already configured, keep it)
- Playwright trace files captured on first retry for step-by-step debugging
- Retry failed tests once before marking as failed — catches flaky tests without hiding real bugs
- HTML reporter in playwright-report/ — open with `npx playwright show-report`
- Capture browser console errors/warnings during test runs to diagnose issues where UI looks fine but errors fire underneath

### Claude's Discretion
- Browser scope (which browser projects to keep/remove from config)
- Flow coverage depth per area (how to distribute 25-30 tests across 9 flow areas)
- Whether to use API calls or UI forms for test data setup, per test
- Auth setup implementation approach (how to fix the broken auth.setup.ts)
- data-testid naming conventions and placement strategy

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 41-e2e-test-infrastructure*
*Context gathered: 2026-03-02*
