---
phase: 36-navigation-restructure
plan: 02
subsystem: ui
tags: [sidebar, navigation, react, nextjs, shadcn]

# Dependency graph
requires:
  - phase: 36-navigation-restructure-01
    provides: redirect routes and placeholder pages for new URL structure
provides:
  - Three-section sidebar with fin Vault, payments Portal, Support groups
  - isNavItemActive helper preventing false positives on sibling routes
  - Correct active-state logic for /payments/subscriptions/* child routes
  - Brand logo link updated to /payments/dashboard
affects:
  - 37-account-crud
  - 40-help-schema-pages

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isNavItemActive helper: exact match by default, prefix match only for routes with genuine children"
    - "Three-array nav structure: finVaultItems, paymentsPortalItems, supportItems"

key-files:
  created: []
  modified:
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "Use exact match (pathname === href) for all routes except /payments/subscriptions and /settings which have real child routes"
  - "Remove LockedNavItem/Spending Monitor — not in Phase 36 nav spec, intentionally absent"
  - "billingStatus destructured from useUserStatus removed — unused after restructure"

patterns-established:
  - "isNavItemActive(pathname, href): whitelist-based prefix match only for known parent routes"

requirements-completed: [NAV-01, NAV-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 36 Plan 02: Sidebar Navigation Restructure Summary

**Three-section shadcn sidebar replacing flat 11-item nav — fin Vault, payments Portal, Support groups with isNavItemActive helper preventing /vault false-activate on /vault/load**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T16:57:35Z
- **Completed:** 2026-02-25T17:00:27Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced flat `mainNavItems` (11 items) + `secondaryNavItems` (2 items) with three named arrays matching the spec exactly
- Added `isNavItemActive` helper that uses exact match for all routes except `/payments/subscriptions` and `/settings` (which have real child routes), preventing `/vault` from activating when at `/vault/load`
- Updated brand logo link from `/dashboard` to `/payments/dashboard` so header click doesn't chain through a redirect
- Removed all unused imports: `FileUp`, `HelpCircle`, `Activity`, `LockedNavItem`, `FEATURES`
- Added `Database` import for the data Vault nav item

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure app-sidebar.tsx into three named sections with correct active-state logic** - `756b922` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/layout/app-sidebar.tsx` - Restructured from two flat groups to three named sections (fin Vault, payments Portal, Support); added isNavItemActive helper; updated logo link to /payments/dashboard

## Decisions Made
- Used exact match as the default for `isNavItemActive`, only applying `startsWith` for `/payments/subscriptions` and `/settings` which genuinely have child routes that should keep the parent highlighted. All other routes (including `/vault` vs `/vault/load`) are siblings and use exact match.
- Removed `LockedNavItem` / Spending Monitor item — intentionally absent per Phase 36 nav spec; the feature was behind a flag for a deferred feature.
- Removed unused `billingStatus` from the `useUserStatus` destructure — it was present in the original but never consumed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Stale `.next/lock` file from a prior dev server instance blocked the build. Removed lock file and build succeeded on retry.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sidebar now shows the correct three-section structure matching the nav spec
- All 11 nav items from old flat list are reorganized into the three sections per spec
- Phase 37 (Account CRUD) can proceed — the data Vault nav item pointing to /accounts is in place
- Phase 40 can add Help and Schema items to the supportItems array

---
*Phase: 36-navigation-restructure*
*Completed: 2026-02-25*
