# Phase 30: Fix URLs & Admin Security - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix broken payment flow URLs, secure admin routes with role-based access control, add pricing navigation link, and clean up dead code across the codebase. This is a gap closure phase — no new features, just fixing gaps identified in the v2.1 audit.

</domain>

<decisions>
## Implementation Decisions

### Admin Role Mechanism
- Add `role` enum column to users table with values `user | admin`
- Default value `'user'` — all existing and new users default to regular user
- Extend NextAuth session to include `session.user.role` — available everywhere session is used
- First admin bootstrapped via SQL migration that reads `ADMIN_EMAIL` env variable
- No admin UI for role management — manage roles via SQL or Drizzle Studio for now
- Admin API routes use inline `session.user.role === 'admin'` checks (not a shared helper)

### Admin Access Denial
- Non-admin users navigating to admin pages are silently redirected to `/dashboard`
- Admin navigation links completely hidden from non-admins (not shown disabled)
- Admin API routes return 403 Forbidden for non-admin authenticated users
- Admin role check happens at layout level — admin layout component checks role once, protects all `/admin/*` pages automatically

### Pricing Link Placement
- Add `/pricing` link to marketing site header as main nav item (next to Features)
- Visible to all users regardless of auth state (always visible)
- Also add `/pricing` link to marketing site footer
- No pricing link in dashboard sidebar — dashboard users access via `/settings/billing`

### Dead Code Cleanup
- Full dead code sweep across entire codebase, not just the 3 listed imports
- Remove both unused imports AND unreferenced exports
- Clean up development artifacts (.bak files, temp files)
- Enable stricter ESLint no-unused-vars/imports lint rules for future prevention

### Claude's Discretion
- Exact ESLint rule configuration for unused imports
- How to structure the admin layout redirect logic
- Migration numbering and SQL syntax

</decisions>

<specifics>
## Specific Ideas

- Admin check via layout mirrors how Next.js App Router protects routes — single check at layout level, all child pages inherit
- Inline role check pattern (`session.user.role === 'admin'`) keeps admin API routes explicit and readable, similar to existing `requireFeature()` pattern but simpler

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-fix-urls-admin-security*
*Context gathered: 2026-02-18*
