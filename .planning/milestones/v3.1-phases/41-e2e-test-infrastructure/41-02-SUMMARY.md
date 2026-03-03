---
phase: 41-e2e-test-infrastructure
plan: "02"
subsystem: testing
tags: [playwright, e2e, auth, vault, analytics, billing, accounts, smoke-tests]

# Dependency graph
requires:
  - phase: 41-e2e-test-infrastructure/41-01
    provides: Fixed auth setup targeting /payments/dashboard, data-testid attributes
provides:
  - 14 E2E smoke tests across auth, vault, analytics, billing, and accounts flows
  - tests/e2e/auth.spec.ts (4 tests: login success, invalid creds, register page, logout)
  - tests/e2e/vault.spec.ts (3 tests: page load, upload UI, navigation)
  - tests/e2e/analytics.spec.ts (2 tests: page load, stats cards visible)
  - tests/e2e/billing.spec.ts (2 tests: page load, tier display)
  - tests/e2e/accounts.spec.ts (3 tests: page load, add button, form fields)
affects: [42-csv-export, 43-overlap-detection, 44-onboarding-hints, 45-sidebar-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth spec overrides storageState to empty for unauthenticated tests"
    - "Heading-based page-load assertion instead of strict-mode-violating main locator"
    - "Regex patterns for plan-tier text matching (handles Free Trial/Free Plan/Pro)"
    - "beforeEach console capture in every describe block for debugging"

key-files:
  created:
    - tests/e2e/auth.spec.ts
    - tests/e2e/vault.spec.ts
    - tests/e2e/analytics.spec.ts
    - tests/e2e/billing.spec.ts
    - tests/e2e/accounts.spec.ts
  modified:
    - playwright.config.ts

key-decisions:
  - "Update playwright.config.ts baseURL/webServer to port 3002 — ports 3000 and 3001 were occupied by a different app (document-vault) on this machine"
  - "Use getByRole('heading') not locator('main') for page-load assertions — Playwright strict mode fails on 2 main elements in dashboard layout"
  - "Auth tests use test.use({ storageState: { cookies:[], origins:[] } }) to override default authenticated state"
  - "Logout test logs in via UI first since it starts from empty auth state"

patterns-established:
  - "Page-load assertion: use getByRole('heading', { name: ... }) — avoids strict mode violation from multiple main elements"
  - "Unauthenticated test context: test.use({ storageState: { cookies:[], origins:[] } }) at describe level"
  - "Billing tier regex: /Free Trial|Free Plan|Pro Plan|Primary|Enhanced|Advanced/i handles all states"

requirements-completed: [TEST-02, TEST-03]

# Metrics
duration: 21min
completed: 2026-03-03
---

# Phase 41 Plan 02: E2E Test Specs (Auth, Vault, Analytics, Billing, Accounts) Summary

**14 Playwright E2E smoke tests across 5 spec files covering auth login/logout flows, vault page navigation, analytics stats rendering, billing plan display, and accounts CRUD entry point**

## Performance

- **Duration:** 21 min
- **Started:** 2026-03-03T00:08:42Z
- **Completed:** 2026-03-03T00:29:42Z
- **Tasks:** 2
- **Files modified:** 6 (5 created + 1 modified)

## Accomplishments
- Created 5 spec files with 14 tests covering auth, vault, analytics, billing, and accounts flows
- Resolved port conflict: updated Playwright config from port 3000 (occupied by document-vault app) to port 3002
- Created missing test user `groblerandre922@gmail.com` via the registration API endpoint
- Fixed strict mode violation in accounts tests: replaced `locator("main")` with `getByRole("heading")` — dashboard layout has 2 `main` elements

## Task Commits

Each task was committed atomically:

1. **Task 1: Write auth, vault, and analytics spec files** - `49c9024` (feat)
2. **Task 2: Write billing and accounts spec files** - `4251c86` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tests/e2e/auth.spec.ts` - 4 tests: login success (redirects to /payments/dashboard), invalid creds (error shown, stays on /login), register page (form fields visible), logout (via user-menu-trigger/user-menu-logout data-testid)
- `tests/e2e/vault.spec.ts` - 3 tests: vault page loads (heading visible), load page shows upload UI (drag/drop text), navigation from vault to /vault/load
- `tests/e2e/analytics.spec.ts` - 2 tests: analytics page loads (h2 heading), stats cards visible ("Total Monthly", "Total Yearly")
- `tests/e2e/billing.spec.ts` - 2 tests: billing page loads ("Current Plan" card), tier display (Free Trial/Free Plan/Pro Plan regex)
- `tests/e2e/accounts.spec.ts` - 3 tests: page loads (heading "data Vault"), add account button visible, account form opens with name field
- `playwright.config.ts` - Updated baseURL and webServer.url/command to port 3002 (deviation fix)

## Decisions Made
- Updated playwright.config.ts to port 3002: ports 3000 and 3001 are occupied by a different project (document-vault at `D:\VIBE CODE PROJECTS\Last30\document-vault`) on this machine. Both ports respond with the wrong app.
- Created test user via registration API: `groblerandre922@gmail.com` did not exist in the database. Used `/api/auth/register` endpoint to create the user without needing DB credentials.
- Used `getByRole("heading")` for page-load assertion: `locator("main")` fails in strict mode because the dashboard layout renders two `<main>` elements (outer layout wrapper + inner content main).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated playwright.config.ts port from 3000 to 3002**
- **Found during:** Task 1 verification run
- **Issue:** Port 3000 had a different app ("Document Vault" at D:\VIBE CODE PROJECTS\Last30\document-vault). Port 3001 also occupied by same project. Playwright was testing the wrong application.
- **Fix:** Updated `baseURL` and `webServer.url/command` in playwright.config.ts to use port 3002. Also updated `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` in `.env.local` (not committed — gitignored).
- **Files modified:** playwright.config.ts
- **Verification:** Auth setup test passed; correct login page served at localhost:3002
- **Committed in:** 49c9024 (Task 1 commit)

**2. [Rule 3 - Blocking] Created missing test user via registration API**
- **Found during:** Task 1 verification run (auth setup failing with "Invalid email or password")
- **Issue:** Test user `groblerandre922@gmail.com` configured in `.env.local` did not exist in the database. Only `andre@my-it.co.uk` existed. The saved session token (from a different port) had also expired.
- **Fix:** Called `POST /api/auth/register` with the configured credentials to create the user.
- **Files modified:** None (database operation)
- **Verification:** Auth setup test passed (1 passed, 4.7s)
- **Committed in:** N/A (runtime operation, no code change)

**3. [Rule 1 - Bug] Fixed strict mode violation in accounts.spec.ts**
- **Found during:** Task 2 verification run
- **Issue:** `page.locator("main")` resolved to 2 elements in the dashboard layout (outer `<main>` wrapping sidebar+content, inner `<main>` for page content). Playwright strict mode throws on multi-element locators.
- **Fix:** Replaced `locator("main")` with `getByRole("heading", { name: /data vault/i })` — matches the DashboardHeader title unique to the accounts page.
- **Files modified:** tests/e2e/accounts.spec.ts
- **Verification:** All 3 accounts tests passed (4 total including setup)
- **Committed in:** 4251c86 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All deviations were environment-specific issues (port conflict, missing test user, strict mode bug). No functional scope creep.

## Issues Encountered
- The `playwright/.auth/user.json` auth file was from a previous session on port 3001. It had an expired session token (expired ~30h prior). The new auth setup regenerated it correctly on port 3002.

## User Setup Required
None — no external service configuration required beyond what's already in `.env.local`.

**Note for future runs:** If running on a machine where port 3001 is free, update `playwright.config.ts` `baseURL` and `webServer` back to port 3001 and update `NEXTAUTH_URL` in `.env.local` accordingly.

## Next Phase Readiness
- 14 E2E smoke tests established — regression baseline for auth, vault, analytics, billing, and accounts flows
- All tests resilient to empty data states (test user was just created with no subscriptions)
- Plan 41-03 is unblocked
- Phase 42 (CSV Export) has E2E regression coverage for analytics page

---
*Phase: 41-e2e-test-infrastructure*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: tests/e2e/auth.spec.ts (80 lines, min 40)
- FOUND: tests/e2e/vault.spec.ts (58 lines, min 30)
- FOUND: tests/e2e/analytics.spec.ts (37 lines, min 20)
- FOUND: tests/e2e/billing.spec.ts (38 lines, min 20)
- FOUND: tests/e2e/accounts.spec.ts (63 lines, min 25)
- FOUND: .planning/phases/41-e2e-test-infrastructure/41-02-SUMMARY.md
- FOUND: commit 49c9024 (Task 1: auth, vault, analytics specs)
- FOUND: commit 4251c86 (Task 2: billing and accounts specs)
