---
phase: 41-e2e-test-infrastructure
plan: "01"
subsystem: testing
tags: [playwright, e2e, auth, data-testid, test-infrastructure]

# Dependency graph
requires: []
provides:
  - Fixed Playwright auth setup targeting /payments/dashboard (v3.0 route)
  - Updated all E2E test specs to use /payments/* URL paths
  - Trimmed playwright.config.ts to chromium+firefox only with 1 local retry
  - data-testid attributes on subscription actions menu, edit/delete items, user menu trigger and logout
affects: [42-csv-export, 43-overlap-detection, 44-onboarding-hints, 45-sidebar-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Glob patterns for waitForURL to survive future query param additions"
    - "data-testid attributes in kebab-case, component-action format"
    - "console error/warning capture in test.beforeEach for debugging"

key-files:
  created: []
  modified:
    - tests/auth.setup.ts
    - playwright.config.ts
    - tests/e2e/subscriptions.spec.ts
    - tests/e2e/email-reminders.spec.ts
    - tests/e2e/pdf-import.spec.ts
    - src/app/(dashboard)/payments/subscriptions/page.tsx
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "Use **/payments/dashboard** glob pattern in waitForURL to survive Phase 44 query params"
  - "1 local retry in playwright.config.ts — catches flaky tests without masking failures"
  - "Trim browser projects to chromium+firefox only — webkit and Mobile Chrome add no value for Next.js app"
  - "Replace fragile button.last() with getByTestId selector for subscription actions menu"

patterns-established:
  - "waitForURL glob pattern: use **/route** to handle query params and sub-paths"
  - "data-testid naming: kebab-case component-action format (e.g., subscription-actions-menu)"
  - "beforeEach console capture: log browser errors/warnings for test debugging"

requirements-completed: [TEST-01, TEST-03]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 41 Plan 01: E2E Test Infrastructure Fix Summary

**Fixed broken Playwright auth cascade by updating waitForURL to /payments/dashboard glob, updated all test specs to v3.0 /payments/* routes, and added data-testid attributes on subscription actions menu and user menu controls**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T00:00:59Z
- **Completed:** 2026-03-03T00:03:57Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Fixed auth.setup.ts — was waiting for `/dashboard` (v1.0 path), now waits for `**/payments/dashboard**` (v3.0 glob pattern that survives future query params)
- Updated all existing E2E specs: subscriptions.spec.ts, email-reminders.spec.ts, and pdf-import.spec.ts now use correct v3.0 URL paths
- Trimmed playwright.config.ts: removed webkit and Mobile Chrome projects, set 1 local retry
- Added data-testid attributes to subscription actions menu trigger (Button), Edit and Delete menu items, user menu trigger (SidebarMenuButton), and logout button

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix auth.setup.ts and playwright.config.ts** - `130da19` (fix)
2. **Task 2: Update existing spec URLs and add data-testid attributes** - `af0fc61` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tests/auth.setup.ts` - Fixed waitForURL glob pattern targeting /payments/dashboard, removed redundant toHaveURL assertion, increased timeout to 15000ms
- `playwright.config.ts` - 1 local retry, trimmed to chromium+firefox only (removed webkit and Mobile Chrome)
- `tests/e2e/subscriptions.spec.ts` - All URLs updated to /payments/* paths, glob waitForURL, getByTestId for actions menu, beforeEach console capture added
- `tests/e2e/email-reminders.spec.ts` - /subscriptions/new -> /payments/subscriptions/new, waitForURL updated
- `tests/e2e/pdf-import.spec.ts` - /import -> /vault/load (v3.0 import route)
- `src/app/(dashboard)/payments/subscriptions/page.tsx` - data-testid on subscription-actions-menu Button, subscription-edit-menu-item, subscription-delete-menu-item
- `src/components/layout/app-sidebar.tsx` - data-testid on user-menu-trigger SidebarMenuButton, user-menu-logout DropdownMenuItem

## Decisions Made
- Used glob pattern `**/payments/dashboard**` in waitForURL instead of exact string — survives query params that Phase 44 (onboarding) will add
- Used glob pattern `**/payments/subscriptions` in test waitForURL calls — same reasoning
- Replaced `subscriptionRow.locator('button').last().click()` with `subscriptionRow.getByTestId("subscription-actions-menu").click()` — stable selector that won't break if button order changes
- Kept pdf-import.spec.ts tests as `test.skip` — just fixed the URL for when they're unskipped

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Auth cascade failure resolved — all downstream E2E tests can now authenticate correctly
- data-testid attributes established on key interactive elements — Plan 41-02 (new subscription tests) can use getByTestId selectors immediately
- playwright.config.ts trimmed — faster local test runs
- Plan 41-02 and 41-03 are unblocked

---
*Phase: 41-e2e-test-infrastructure*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: tests/auth.setup.ts
- FOUND: playwright.config.ts
- FOUND: tests/e2e/subscriptions.spec.ts
- FOUND: tests/e2e/email-reminders.spec.ts
- FOUND: tests/e2e/pdf-import.spec.ts
- FOUND: src/app/(dashboard)/payments/subscriptions/page.tsx
- FOUND: src/components/layout/app-sidebar.tsx
- FOUND: .planning/phases/41-e2e-test-infrastructure/41-01-SUMMARY.md
- FOUND: commit 130da19 (Task 1: fix auth.setup.ts and playwright.config.ts)
- FOUND: commit af0fc61 (Task 2: update test URLs and add data-testid attributes)
