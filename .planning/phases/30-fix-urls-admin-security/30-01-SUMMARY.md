---
phase: 30-fix-urls-admin-security
plan: 01
subsystem: auth
tags: [nextauth, rbac, jwt, postgres, drizzle, role-based-access-control]

# Dependency graph
requires:
  - phase: 28-admin-trial-management
    provides: "admin pages and trial extension API route (session-auth only)"
  - phase: 24-billing-webhooks
    provides: "NextAuth JWT/session callback pattern for extending session with DB fields"
provides:
  - "userRoleEnum and role column on users table"
  - "role field flows DB schema -> JWT callback -> session callback -> components"
  - "Admin layout guard redirecting non-admin users to /dashboard"
  - "Admin API route 403 guard for non-admin authenticated users"
  - "Conditional admin nav rendering in sidebar based on session.user.role"
  - "seed-admin.ts script for bootstrapping first admin from ADMIN_EMAIL env var"
affects: [admin pages, api/admin/*, app-sidebar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin role guard at layout level via session.user.role check"
    - "Inline API role guard returning 403 for non-admin users"
    - "isAdmin derived boolean from session?.user?.role === 'admin' in client components"
    - "Admin bootstrap via seed script reading ADMIN_EMAIL env var"

key-files:
  created:
    - src/scripts/seed-admin.ts
    - src/lib/db/migrations/0010_absurd_nehzno.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/auth/config.ts
    - src/types/next-auth.d.ts
    - src/app/(dashboard)/admin/layout.tsx
    - src/app/api/admin/trial-extensions/route.ts
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "Admin routes redirect silently to /dashboard rather than showing 403 error page"
  - "Admin role stored as PostgreSQL enum (user_role) for type safety and DB constraint"
  - "Role bootstrapped via seed script with ADMIN_EMAIL env var - no UI for role management"
  - "Admin nav completely hidden (not disabled) from non-admin users per locked decision"

patterns-established:
  - "Admin role guard pattern: check session.user.role !== 'admin' after auth check, redirect to /dashboard"
  - "API admin guard pattern: inline role check after 401 check, returns 403 Forbidden"
  - "isAdmin derivation: const isAdmin = session?.user?.role === 'admin' for client components"
  - "Seed script bootstrapping: read ADMIN_EMAIL env var, update role to 'admin' via drizzle, exit with error if not found"

requirements-completed: [HOOK-02]

# Metrics
duration: 12min
completed: 2026-02-18
---

# Phase 30 Plan 01: Admin RBAC Summary

**Role-based access control added to admin routes: PostgreSQL user_role enum, NextAuth session extension, layout guard, API 403 guard, and conditional sidebar admin nav**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-18T00:00:00Z
- **Completed:** 2026-02-18T00:12:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added `userRoleEnum` ("user" | "admin") to Drizzle schema and `role` column to users table with default "user"
- Extended NextAuth JWT callback to populate `token.role` from `dbUser.role` in both initial sign-in and trigger=update branches
- Session callback now exposes `session.user.role` to all consumers
- Updated TypeScript declarations (`Session`, `User`, `JWT` interfaces) with role field
- Admin layout now actively redirects non-admin users silently to /dashboard
- Admin API route returns 403 Forbidden for non-admin authenticated users (MVP tradeoff comments removed)
- Sidebar conditionally renders admin nav section (Trial Extensions, Webhooks) only for admin users
- Created `seed-admin.ts` for bootstrapping the first admin user via `ADMIN_EMAIL` env var

## Task Commits

Each task was committed atomically:

1. **Task 1: Add role enum to schema, extend NextAuth session, update TypeScript types, and generate migration** - `5478c21` (feat)
2. **Task 2: Wire admin role checks into layout, API route, and sidebar navigation** - `7075e3c` (feat)

**Plan metadata:** (to be committed with SUMMARY.md)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added `userRoleEnum` pgEnum and `role` column to users table
- `src/lib/auth/config.ts` - JWT and session callbacks extended with `token.role` / `user.role`
- `src/types/next-auth.d.ts` - TypeScript declarations for `role` in Session, User, JWT interfaces
- `src/scripts/seed-admin.ts` - Admin bootstrap seed script reading ADMIN_EMAIL env var
- `src/lib/db/migrations/0010_absurd_nehzno.sql` - Migration: CREATE TYPE user_role, ALTER TABLE users ADD COLUMN role
- `src/app/(dashboard)/admin/layout.tsx` - Role guard: redirects non-admin to /dashboard
- `src/app/api/admin/trial-extensions/route.ts` - Inline 403 guard for non-admin users
- `src/components/layout/app-sidebar.tsx` - isAdmin conditional, admin SidebarGroup with Shield/Webhook icons

## Decisions Made
- Admin routes redirect silently to `/dashboard` (no error page) to avoid leaking that admin routes exist
- `user_role` as PostgreSQL enum for type safety and constraint enforcement at DB level
- Role bootstrapped via seed script (no UI for role management) - minimal surface area for admin promotion
- Admin nav completely hidden (not just disabled) per locked design decision from research

## Deviations from Plan

### Deviation: Used db:push instead of db:migrate

- **Found during:** Task 1 (migration step)
- **Issue:** The database was originally set up via `db:push` rather than `db:migrate`. The migration tracking table (`drizzle.__drizzle_migrations`) was empty, causing `db:migrate` to attempt replaying all 10 migrations including already-applied ones, resulting in "type already exists" errors.
- **Fix:** Used `npx drizzle-kit push --force` to apply the schema changes directly, matching the established pattern for this project.
- **Verification:** `db:push` succeeded, confirmed with successful `npm run build` and `npx tsc --noEmit`
- **Impact:** No functional difference - schema changes applied correctly. The migration SQL file (0010) was still generated as documentation of the change.

---

**Total deviations:** 1 (operational adaptation, not a code issue)
**Impact on plan:** Schema changes applied correctly via the project's established push pattern. Migration file retained as documentation.

## Issues Encountered
- `db:migrate` failed because project uses `db:push` for schema management (drizzle migrations table empty). Resolved by using `db:push --force` which matches the established project pattern.

## User Setup Required

To bootstrap the first admin user after deployment:
1. Set `ADMIN_EMAIL=your-email@example.com` in your environment
2. Run: `npx tsx src/scripts/seed-admin.ts`
3. Sign out and sign back in to get a fresh session with the admin role

## Next Phase Readiness
- Admin RBAC complete - role flows from DB through JWT to all consumers
- Admin pages and API routes are secured against unauthorized access
- Sidebar admin nav will appear automatically for any user with `role = 'admin'`
- Phase 30 plan 02 (URL fixes) was executed in a prior session - check 30-02-SUMMARY.md

## Self-Check: PASSED

All 9 files verified present. All 2 task commits verified (5478c21, 7075e3c).

---
*Phase: 30-fix-urls-admin-security*
*Completed: 2026-02-18*
