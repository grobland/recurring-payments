---
phase: 36-navigation-restructure
plan: 01
subsystem: ui
tags: [nextjs, routing, middleware, redirects, auth]

# Dependency graph
requires:
  - phase: 35-database-foundation
    provides: financial_accounts table live, migration applied
provides:
  - 308 permanent redirects for all moved URLs (10 entries in next.config.ts)
  - Auth protection for /payments, /vault, /accounts routes via proxy.ts
  - /accounts placeholder page with empty state UI
affects: [37-account-crud, any phase adding new route paths]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js redirects() function in nextConfig for permanent URL moves (permanent: true = 308)"
    - "More-specific paths listed before less-specific in redirects array (e.g., /dashboard/forecasting before /dashboard)"
    - "protectedRoutes prefix-based auth protection using startsWith in proxy.ts"

key-files:
  created:
    - src/app/(dashboard)/accounts/page.tsx
  modified:
    - next.config.ts
    - src/app/proxy.ts

key-decisions:
  - "List /dashboard/forecasting before /dashboard in redirects array — more specific match prevents wrong routing even though both are exact matches (not wildcards)"
  - "List /subscriptions/:path* before /subscriptions — wildcard match must precede exact match to catch sub-paths"
  - "Keep old routes (/dashboard, /subscriptions, /import, /analytics, /reminders) in protectedRoutes during transition — redirect fires first so these are harmless but provide safety net"
  - "Add /sources to protectedRoutes — was previously unprotected, added for completeness"
  - "Replace all hardcoded /dashboard redirect destinations in proxy.ts with /payments/dashboard to avoid redirect chain"

patterns-established:
  - "URL migration pattern: next.config.ts redirects() for permanent moves, proxy.ts for auth protection of new paths"

requirements-completed: [NAV-04]

# Metrics
duration: 3min
completed: 2026-02-25
---

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
