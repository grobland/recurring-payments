---
phase: 30-fix-urls-admin-security
verified: 2026-02-18T00:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Sign in as non-admin user, navigate to /admin/trial-extensions in browser"
    expected: "Silently redirected to /dashboard with no error page shown"
    why_human: "Server redirect behavior requires a live session to observe"
  - test: "Sign in as admin user (after running seed-admin.ts), observe sidebar"
    expected: "Admin section with Trial Extensions and Webhooks links appears in sidebar"
    why_human: "Client component role-conditional rendering requires authenticated session"
  - test: "Trigger a failed payment in Stripe test mode, check the email received"
    expected: "Email contains a link to /settings/billing (not /dashboard/billing)"
    why_human: "Email delivery requires Stripe test webhook and live Resend integration"
---

# Phase 30: Fix URLs and Admin Security Verification Report

**Phase Goal:** Payment failed flow works end-to-end and admin routes are secured
**Verified:** 2026-02-18
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Payment failed email return URL points to /settings/billing (not /dashboard/billing) | VERIFIED | `route.ts` line 308: `` return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing` `` -- no `/dashboard/billing` occurrences remain |
| 2 | Admin routes check for admin role before allowing access | VERIFIED | `admin/layout.tsx` lines 15-17: `if (session.user.role !== "admin") { redirect("/dashboard"); }` -- active, not commented |
| 3 | Admin navigation links visible to admin users only | VERIFIED | `app-sidebar.tsx` line 131: `const isAdmin = session?.user?.role === "admin";` wrapping entire Admin `SidebarGroup` at lines 215-245 |
| 4 | Dead imports removed (TIER_LEVELS, getTierDisplayName, getTierFeatures) | VERIFIED | No TIER_LEVELS/cn import in feature-comparison-table.tsx; getTierDisplayName and getTierFeatures absent from entire `src/` tree |
| 5 | Navigation link to /pricing exists from marketing header or dashboard | VERIFIED | `marketing/layout.tsx` line 20: `<Link href="/pricing">` in header nav; line 43: `<Link href="/pricing">` in footer |
| 6 | Admin API routes return 403 for non-admin authenticated users | VERIFIED | `api/admin/trial-extensions/route.ts` lines 21-23: `if (session.user.role !== "admin") { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }` |
| 7 | Role field flows: schema -> JWT callback -> session -> components | VERIFIED | Schema: `userRoleEnum` + `role` column; JWT callback: `token.role = dbUser.role` (both branches); session callback: `user.role = token.role`; sidebar: `session?.user?.role` |
| 8 | ESLint no-unused-vars warn rule configured | VERIFIED | `eslint.config.mjs` lines 18-26: `@typescript-eslint/no-unused-vars` at "warn" level with underscore patterns |
| 9 | Seed script exists to bootstrap first admin from ADMIN_EMAIL | VERIFIED | `src/scripts/seed-admin.ts` exists, reads `process.env.ADMIN_EMAIL`, exits with error if unset, updates role via drizzle |
| 10 | TypeScript declarations include role in Session, User, JWT | VERIFIED | `next-auth.d.ts`: Session.user.role, User.role?, JWT.role all declared as `"user" \| "admin"` |
| 11 | Development artifact files deleted | VERIFIED | `schema.ts.bak`, `_ul`, `_ul-CORSAIRONEPRO`, `_ul-CORSAIRONEPRO-2` not present in filesystem or git status |
| 12 | No stale placeholder or MVP tradeoff comments remain | VERIFIED | No "TODO", "FIXME", "MVP tradeoff", "No admin role check", or "Future: Add admin" comments in modified files |

**Score:** 12/12 truths verified

### Required Artifacts

**Plan 01 Artifacts:**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | userRoleEnum and role column on users table | VERIFIED | Line 63: `export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);` Line 103: `role: userRoleEnum("role").default("user").notNull()` |
| `src/lib/auth/config.ts` | role field in JWT and session callbacks | VERIFIED | Line 91: `token.role = dbUser.role` (sign-in branch); Line 106: `token.role = dbUser.role` (trigger=update branch); Line 121: `user.role = token.role` (session callback) |
| `src/types/next-auth.d.ts` | TypeScript type declarations for role field | VERIFIED | Session, User, JWT interfaces all declare `role: "user" \| "admin"` |
| `src/scripts/seed-admin.ts` | Admin bootstrap seed script | VERIFIED | 65-line script, reads ADMIN_EMAIL, updates role to "admin" via drizzle, exits on failure |
| `src/app/(dashboard)/admin/layout.tsx` | Admin role guard at layout level | VERIFIED | Lines 15-17: active `if (session.user.role !== "admin") { redirect("/dashboard"); }` |
| `src/app/api/admin/trial-extensions/route.ts` | Inline admin role check returning 403 | VERIFIED | Lines 21-23: `if (session.user.role !== "admin") { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }` |
| `src/components/layout/app-sidebar.tsx` | Conditional admin nav rendering | VERIFIED | Line 131: `const isAdmin = session?.user?.role === "admin";` wraps Admin SidebarGroup at lines 215-245 |

**Plan 02 Artifacts:**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/webhooks/stripe/route.ts` | Corrected return_url for payment failed email | VERIFIED | Line 308: `/settings/billing` -- zero occurrences of `/dashboard/billing` in file |
| `src/app/(marketing)/layout.tsx` | Pricing nav links in header and footer | VERIFIED | Header: `<Link href="/pricing">Pricing</Link>` in nav element (line 20); Footer: `<Link href="/pricing">Pricing</Link>` (line 43) |
| `eslint.config.mjs` | Stricter unused-vars ESLint rule | VERIFIED | `@typescript-eslint/no-unused-vars` at "warn" with `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`, `ignoreRestSiblings: true` |
| `src/components/pricing/feature-comparison-table.tsx` | Dead imports removed | VERIFIED | No TIER_LEVELS import, no cn import. File imports only Check, X, Table components, TIER_CONFIG, and Tier type |
| `src/lib/stripe/products.ts` | getTierDisplayName, getTierFeatures deleted | VERIFIED | Neither function exists in file or anywhere in `src/` tree |

### Key Link Verification

**Plan 01 Key Links:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/db/schema.ts` | `src/lib/auth/config.ts` | `token.role = dbUser.role` in JWT callback | WIRED | Pattern confirmed at config.ts lines 91 and 106 |
| `src/lib/auth/config.ts` | `src/app/(dashboard)/admin/layout.tsx` | `session.user.role` available from session callback | WIRED | admin/layout.tsx line 15: `if (session.user.role !== "admin")` |
| `src/lib/auth/config.ts` | `src/components/layout/app-sidebar.tsx` | `useSession` provides role to client component | WIRED | app-sidebar.tsx line 131: `const isAdmin = session?.user?.role === "admin"` |

**Plan 02 Key Links:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/webhooks/stripe/route.ts` | `src/app/(dashboard)/settings/billing/page.tsx` | return_url in payment failed email | WIRED | Pattern `/settings/billing` confirmed at webhook route line 308; zero occurrences of old `/dashboard/billing` |
| `src/app/(marketing)/layout.tsx` | `src/app/(marketing)/pricing/page.tsx` | nav link href | WIRED | `href="/pricing"` present in both header (line 20) and footer (line 43) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| HOOK-02 | 30-01-PLAN, 30-02-PLAN | User receives email when payment fails | SATISFIED | Webhook route sends email on first payment failure attempt; return_url fixed to `/settings/billing` so email link works end-to-end |

**REQUIREMENTS.md traceability note:** The traceability table in REQUIREMENTS.md maps HOOK-02 to Phase 24 (webhook infrastructure), and HOOK-02 is marked `[x]` (complete). The webhook was built in Phase 24, but the return URL was broken (`/dashboard/billing` does not exist). Phase 30 corrected the URL, completing the end-to-end flow. The requirement is satisfied in substance. The traceability table omits Phase 30 as a contributor but this is a documentation gap, not a code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | - |

No anti-patterns detected. All previously commented-out role checks are now active. All MVP tradeoff comments removed. No placeholder implementations.

### Human Verification Required

#### 1. Non-admin redirect behavior

**Test:** Sign in as a regular user, then navigate directly to `/admin/trial-extensions` in the browser address bar.
**Expected:** Instantly redirected to `/dashboard` with no error page or hint that admin routes exist.
**Why human:** Server-side redirect requires a live authenticated session to observe.

#### 2. Admin sidebar conditional rendering

**Test:** After running `npx tsx src/scripts/seed-admin.ts` with `ADMIN_EMAIL` set, sign in as that user and inspect the sidebar.
**Expected:** An "Admin" section appears in the sidebar containing "Trial Extensions" (Shield icon) and "Webhooks" (Webhook icon) links. These links are completely absent when signed in as a non-admin user.
**Why human:** Client component role-conditional rendering requires an authenticated session with admin role.

#### 3. Payment failed email return URL

**Test:** In Stripe test mode, trigger a payment failure event via the Stripe CLI (`stripe trigger invoice.payment_failed`), then check the email received.
**Expected:** The email contains a "Update Payment Method" button or link that routes to `/settings/billing` (not `/dashboard/billing`). The billing portal opens and the return URL after exiting is `/settings/billing`.
**Why human:** Full email delivery requires a live Stripe test environment and Resend integration.

### Gaps Summary

No gaps found. All 12 must-have truths are verified against actual code. The phase goal -- payment failed flow works end-to-end and admin routes are secured -- is achieved:

- The broken `/dashboard/billing` URL in the Stripe payment failed email is corrected to `/settings/billing`.
- Admin layout redirects non-admin users silently to `/dashboard`.
- Admin API route returns 403 for non-admin authenticated users.
- Admin nav section is completely hidden from non-admin users in the sidebar.
- Role flows from PostgreSQL enum through JWT callback through session callback to all consumers.
- Dead imports and exports eliminated; ESLint configured to prevent future accumulation.

Three items are flagged for human verification as they require live authentication flows or external service integration, but all automated code checks pass.

---

_Verified: 2026-02-18_
_Verifier: Claude (gsd-verifier)_
