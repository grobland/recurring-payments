---
id: S36
parent: M001
milestone: M001
provides:
  - 308 permanent redirects for all moved URLs (10 entries in next.config.ts)
  - Auth protection for /payments, /vault, /accounts routes via proxy.ts
  - /accounts placeholder page with empty state UI
  - Three-section sidebar with fin Vault, payments Portal, Support groups
  - isNavItemActive helper preventing false positives on sibling routes
  - Correct active-state logic for /payments/subscriptions/* child routes
  - Brand logo link updated to /payments/dashboard
requires: []
affects: []
key_files: []
key_decisions:
  - "List /dashboard/forecasting before /dashboard in redirects array — more specific match prevents wrong routing even though both are exact matches (not wildcards)"
  - "List /subscriptions/:path* before /subscriptions — wildcard match must precede exact match to catch sub-paths"
  - "Keep old routes (/dashboard, /subscriptions, /import, /analytics, /reminders) in protectedRoutes during transition — redirect fires first so these are harmless but provide safety net"
  - "Add /sources to protectedRoutes — was previously unprotected, added for completeness"
  - "Replace all hardcoded /dashboard redirect destinations in proxy.ts with /payments/dashboard to avoid redirect chain"
  - "Use exact match (pathname === href) for all routes except /payments/subscriptions and /settings which have real child routes"
  - "Remove LockedNavItem/Spending Monitor — not in Phase 36 nav spec, intentionally absent"
  - "billingStatus destructured from useUserStatus removed — unused after restructure"
patterns_established:
  - "URL migration pattern: next.config.ts redirects() for permanent moves, proxy.ts for auth protection of new paths"
  - "isNavItemActive(pathname, href): whitelist-based prefix match only for known parent routes"
observability_surfaces: []
drill_down_paths: []
duration: 2min
verification_result: passed
completed_at: 2026-02-25
blocker_discovered: false
---
# S36: Navigation Restructure

**# Phase 36 Plan 01: URL Redirects and Accounts Placeholder Summary**

## What Happened

# Phase 36 Plan 01: URL Redirects and Accounts Placeholder Summary

**308 permanent redirects for 10 moved URLs via next.config.ts, updated proxy.ts auth protection for /payments and /vault routes, and /accounts placeholder page with empty state**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T16:57:33Z
- **Completed:** 2026-02-25T17:00:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `async redirects()` to next.config.ts with 10 permanent:true entries covering all moved URL paths
- Updated proxy.ts protectedRoutes to include /payments, /vault, /accounts, /sources and replaced all hardcoded /dashboard redirect destinations with /payments/dashboard
- Created /accounts placeholder page (Server Component) with Database icon, "No accounts yet" heading, description text, and disabled Create Account button

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 308 redirects to next.config.ts and update proxy.ts protected routes** - `ca2ff4f` (feat)
2. **Task 2: Create /accounts placeholder page** - `0bec9dd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `next.config.ts` - Added async redirects() function with 10 permanent redirect entries
- `src/app/proxy.ts` - Updated protectedRoutes array, fixed hardcoded /dashboard redirect destinations to /payments/dashboard
- `src/app/(dashboard)/accounts/page.tsx` - New placeholder page for data Vault nav destination

## Decisions Made
- More specific redirect paths listed before less specific (e.g., `/dashboard/forecasting` before `/dashboard`, `/subscriptions/:path*` before `/subscriptions`) as best practice even though all entries are exact-match or non-overlapping
- Added `/sources` to protectedRoutes as it was previously unprotected — correctness improvement
- Both hardcoded `/dashboard` redirect destinations in proxy.ts function body updated to `/payments/dashboard` to eliminate redirect chaining

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Stale `.next/lock` file from prior build caused build failure on second attempt — removed lock file and rebuild succeeded immediately.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All old bookmarks/email links preserved via 308 redirects — zero broken links for existing users
- New /payments and /vault paths are auth-protected
- /accounts route renders placeholder, ready for Phase 37 to replace with real Account CRUD UI
- No blockers

---
*Phase: 36-navigation-restructure*
*Completed: 2026-02-25*

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

## Self-Check: PASSED

- FOUND: src/components/layout/app-sidebar.tsx
- FOUND: commit 756b922 (feat — sidebar restructure)
- FOUND: commit c0fd652 (docs — plan metadata)

---
*Phase: 36-navigation-restructure*
*Completed: 2026-02-25*

# Phase 36 Plan 03: Create New Route Files Summary

11 new page.tsx files created under /payments/* and /vault/load/ by copying source content from old locations with internal links updated to new URL paths, plus 15 shared files updated to use new navigation paths.

## What Was Built

### Task 1: Create /payments/* route files

Created 10 new page files under `/payments/*` and 2 loading.tsx files, copying content verbatim from old locations then updating all internal links within those files to new paths:

| New Route | Source |
|-----------|--------|
| /payments/dashboard | /dashboard |
| /payments/analytics | /analytics |
| /payments/forecast | /dashboard/forecasting |
| /payments/subscriptions | /subscriptions |
| /payments/subscriptions/new | /subscriptions/new |
| /payments/subscriptions/[id] | /subscriptions/[id] |
| /payments/subscriptions/[id]/edit | /subscriptions/[id]/edit |
| /payments/transactions | /transactions |
| /payments/suggestions | /suggestions |
| /payments/reminders | /reminders |

Also copied loading.tsx for dashboard and subscriptions routes.

### Task 2: Create /vault/load and update shared links

Created `/vault/load/page.tsx` copying from `/import/batch/page.tsx` with updated breadcrumb and router.push.

Updated 15 shared/existing files to point to new URL paths. Key changes:
- `login-form.tsx`: callbackUrl default `/dashboard` → `/payments/dashboard`
- `page.tsx` (root): authenticated redirect → `/payments/dashboard`
- `admin/layout.tsx`: non-admin redirect → `/payments/dashboard`
- `onboarding/page.tsx`: all router.push calls → new paths
- `settings/layout.tsx`: `/reminders` → `/payments/reminders`
- `incomplete-batch-banner.tsx`: `/import/batch` → `/vault/load`
- `vault-empty-state.tsx`: `/import/batch` → `/vault/load`
- `evidence-list.tsx`: `/transactions` → `/payments/transactions`
- `use-batch-upload.ts`: `window.location.href` → `/payments/suggestions`
- `use-bulk-patterns.ts`: `window.location.href` → `/payments/subscriptions`

## Verification Results

- `npm run build` passed with no TypeScript errors
- All 11 new routes visible in build output
- No old `window.location.href` references to `/suggestions` or `/subscriptions`
- Old route files remain as dead code (untouched), handled by next.config.ts redirects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Updates] Updated additional files with /dashboard hrefs not in plan file list**
- **Found during:** Task 2 — grep verification revealed additional files
- **Issue:** sources/page.tsx, statements/[id]/page.tsx, vault/page.tsx, error.tsx, not-found.tsx all had `href="/dashboard"` breadcrumbs/links that would navigate to old URL
- **Fix:** Updated all 5 files to use `/payments/dashboard`
- **Files modified:** as listed above
- **Commit:** 8053e9d

## Self-Check: PASSED

Files created verified:
- src/app/(dashboard)/payments/dashboard/page.tsx — EXISTS
- src/app/(dashboard)/payments/subscriptions/page.tsx — EXISTS
- src/app/(dashboard)/vault/load/page.tsx — EXISTS

Commits verified:
- 96ce535 — feat(36-03): create /payments/* and /vault/load route files
- 8053e9d — feat(36-03): update internal link references to new URL paths
