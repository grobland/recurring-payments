# Phase 36: Navigation Restructure - Research

**Researched:** 2026-02-25
**Domain:** Next.js App Router navigation, sidebar restructure, permanent redirects (308), route file relocation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**URL path changes** — Paths DO change. 308 redirects required.

- fin Vault section:
  - doc Vault: `/vault` (stays — no redirect)
  - doc Load: `/vault/load` (moves from `/import/batch` and `/import`)
  - Sources: `/sources` (stays — no redirect)
  - data Vault: `/accounts` (new placeholder page)

- payments Portal section (all require 308 redirects):
  - `/payments/dashboard` (308 from `/dashboard`)
  - `/payments/analytics` (308 from `/analytics`)
  - `/payments/forecast` (308 from `/dashboard/forecasting`)
  - `/payments/subscriptions` (308 from `/subscriptions`)
  - `/payments/transactions` (308 from `/transactions`)
  - `/payments/suggestions` (308 from `/suggestions`)
  - `/payments/reminders` (308 from `/reminders`)

- Support section (paths stay):
  - `/settings` (no redirect)
  - `/help` (Phase 40 adds this page)
  - `/schema` (Phase 40 adds this page)

**Section structure** — Full sidebar with three named sections. All nav items placed per spec.

**Section visual treatment:**
- Always expanded — not collapsible
- Section labels: subtle uppercase labels using shadcn `SidebarGroupLabel` default styling
- Labels use exact casing: `fin Vault`, `payments Portal`, `Support`
- Separation via label gap only — no dividers or horizontal rules

**Active state logic:**
- `pathname.startsWith(item.href)` for items that act as section roots
- Exact match `pathname === item.href` for flat terminal items

**Accounts placeholder:**
- Phase 36 adds `data Vault` nav item at `/accounts`
- Clicking shows basic empty state: heading "No accounts yet", brief description, disabled Create button
- Sources nav item stays alongside data Vault — both coexist in fin Vault

### Claude's Discretion

- Exact icon choices for new nav items (doc Load, data Vault)
- Whether to use Next.js `redirect()` in route handlers or `redirects` in `next.config.ts` for 308s
- Exact empty state page copy and illustration treatment
- Whether `/payments/` route segments need layout files or just redirects

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User can see reorganized sidebar with fin Vault, payments Portal, and Support sections with correct sub-items per spec | Existing `SidebarGroup` + `SidebarGroupLabel` pattern in `app-sidebar.tsx` supports this directly — restructure the three arrays into three `SidebarGroup` blocks |
| NAV-02 | User can navigate to all existing screens via new menu paths | New file-system routes needed under `/payments/*` and `/vault/load`; existing page files moved or copied; internal links updated throughout codebase |
| NAV-03 | Active nav item highlights correctly for nested section structure | `isActive` prop already on `SidebarMenuButton`; must switch from `pathname === item.href` to `pathname.startsWith(item.href)` for section-root items |
| NAV-04 | Old URL routes redirect (308) to new paths preserving bookmarks and email links | `redirects` array in `next.config.ts` with `permanent: true` is the correct approach; runs before proxy, no new files needed for the redirect mechanism itself |
</phase_requirements>

## Summary

Phase 36 is a navigation restructure that replaces a flat 11-item sidebar with three named sections and moves several URL paths. The codebase uses shadcn/ui's sidebar components (`SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuButton`) which already support multi-section layouts — `app-sidebar.tsx` already has two groups (the main "Menu" group and a "Support" group). The primary work is: (1) restructure `app-sidebar.tsx` into three groups with the correct items, (2) create new route directories under `src/app/(dashboard)/payments/` and `src/app/(dashboard)/vault/load/`, (3) move page content from old locations to new locations, (4) add 308 permanent redirects in `next.config.ts`, (5) update all internal `href` and `router.push` references throughout the codebase, (6) update the `proxy.ts` protected routes list, and (7) add the `/accounts` placeholder page.

The 7 pages moving to `/payments/*` means creating 7 new page files — each simply re-exporting or re-implementing the existing page component. The old route directories can either be deleted (with next.config.ts handling redirects for external links) or kept as empty redirect shells. **Use next.config.ts `redirects` array** — this is the right tool for static, known-ahead-of-time URL renames. It runs before `proxy.ts`, requires no new files per redirect, handles 308 correctly with `permanent: true`, and is cacheable by browsers and search engines.

The active-state problem is real and well-understood: the current code uses `pathname === item.href` for main nav items, which will be wrong for the `/payments/dashboard` item when the user navigates to `/payments/subscriptions`. The fix is to use `pathname.startsWith(item.href)` only for items that are prefix-roots, not for all items (to avoid `/vault` matching `/vault/load` aggressively when both are top-level links in the same section).

**Primary recommendation:** Use `next.config.ts` redirects array for all 308s; restructure `app-sidebar.tsx` in a single edit replacing both nav arrays; move route files to new locations; update ~20 internal link references.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui sidebar | Already installed | `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuButton` | Already in use; supports multi-group layout natively |
| Next.js App Router | 16.1.4 | File-system routing, `next.config.ts` redirects | Already in project |
| `next/navigation` `usePathname` | 16.1.4 | Active state detection in sidebar | Already used in `app-sidebar.tsx` |
| lucide-react | Already installed | Icons for new nav items | Already used for all existing icons |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next.config.ts` `redirects()` | Next.js built-in | 308 permanent redirects for moved URLs | For static, known-ahead-of-time URL renames — runs before proxy, no deployment required per redirect |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next.config.ts` redirects | `proxy.ts` `NextResponse.redirect` | proxy.ts runs *after* next.config.ts redirects; adding redirects there works but is the wrong layer for static route renames; next.config.ts is cleaner and correct |
| `next.config.ts` redirects | Route handler `permanentRedirect()` | Creates unnecessary server round-trips; route handler redirects require the page to render first; next.config.ts handles it at the routing layer before any rendering |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure

After Phase 36, the new route structure:

```
src/app/(dashboard)/
├── payments/                    # NEW section directory
│   ├── dashboard/               # MOVED from /dashboard
│   │   └── page.tsx
│   ├── analytics/               # MOVED from /analytics
│   │   └── page.tsx
│   ├── forecast/                # MOVED from /dashboard/forecasting
│   │   └── page.tsx
│   ├── subscriptions/           # MOVED from /subscriptions
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/
│   │           └── page.tsx
│   ├── transactions/            # MOVED from /transactions
│   │   └── page.tsx
│   ├── suggestions/             # MOVED from /suggestions
│   │   └── page.tsx
│   └── reminders/               # MOVED from /reminders
│       └── page.tsx
├── vault/
│   ├── page.tsx                 # UNCHANGED — doc Vault
│   └── load/                   # NEW — doc Load (was /import and /import/batch)
│       └── page.tsx
├── accounts/                   # NEW — data Vault placeholder
│   └── page.tsx
├── dashboard/                   # KEPT for old redirect target (next.config handles)
├── analytics/                   # KEPT for old redirect target
├── import/                      # KEPT for old redirect target
│   └── batch/
├── subscriptions/               # KEPT for old redirect target
├── transactions/                # KEPT for old redirect target
├── suggestions/                 # KEPT for old redirect target
├── reminders/                   # KEPT for old redirect target
├── sources/                     # UNCHANGED
├── settings/                    # UNCHANGED
├── statements/                  # UNCHANGED
├── admin/                       # UNCHANGED
├── onboarding/                  # UNCHANGED
└── layout.tsx                   # UNCHANGED
```

**Note on old directories:** The old route files can remain in place. `next.config.ts` redirects fire before the route is matched, so a redirect from `/dashboard` → `/payments/dashboard` means the old `(dashboard)/dashboard/page.tsx` will never be reached for external bookmarks. Keeping old files avoids breaking internal programmatic navigations that haven't been updated yet during development. Once all internal links are updated, old directories can be deleted.

### Pattern 1: next.config.ts Redirects Array (308 Permanent)

**What:** Static route renames declared in `next.config.ts` run at the routing layer before any page rendering or proxy execution.

**When to use:** Any URL you are renaming permanently where browsers/email links may have bookmarked the old path.

**Example:**
```typescript
// next.config.ts — merged into existing withSentryConfig wrapper
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  async redirects() {
    return [
      // payments Portal moves
      { source: "/dashboard", destination: "/payments/dashboard", permanent: true },
      { source: "/analytics", destination: "/payments/analytics", permanent: true },
      { source: "/dashboard/forecasting", destination: "/payments/forecast", permanent: true },
      { source: "/subscriptions", destination: "/payments/subscriptions", permanent: true },
      { source: "/subscriptions/:path*", destination: "/payments/subscriptions/:path*", permanent: true },
      { source: "/transactions", destination: "/payments/transactions", permanent: true },
      { source: "/suggestions", destination: "/payments/suggestions", permanent: true },
      { source: "/reminders", destination: "/payments/reminders", permanent: true },
      // fin Vault moves
      { source: "/import", destination: "/vault/load", permanent: true },
      { source: "/import/batch", destination: "/vault/load", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, { /* sentry options unchanged */ });
```

**Important:** The wildcard `{ source: "/subscriptions/:path*", destination: "/payments/subscriptions/:path*", permanent: true }` is needed because subscriptions has subroutes (`/subscriptions/new`, `/subscriptions/[id]`, `/subscriptions/[id]/edit`).

### Pattern 2: Sidebar Three-Group Restructure

**What:** Replace the two existing nav arrays with three typed arrays and render three `SidebarGroup` blocks.

**When to use:** When reorganizing an existing `app-sidebar.tsx` that already uses shadcn sidebar primitives.

**Example:**
```typescript
// Replaces mainNavItems and secondaryNavItems arrays in app-sidebar.tsx

const finVaultItems = [
  { title: "doc Vault", href: "/vault", icon: Archive },
  { title: "doc Load", href: "/vault/load", icon: FolderUp },
  { title: "Sources", href: "/sources", icon: FileStack },
  { title: "data Vault", href: "/accounts", icon: Database }, // icon: Claude's discretion
];

const paymentsPortalItems = [
  { title: "subs Dash", href: "/payments/dashboard", icon: LayoutDashboard },
  { title: "Analytics", href: "/payments/analytics", icon: BarChart3 },
  { title: "subs Forecast", href: "/payments/forecast", icon: TrendingUp },
  { title: "subs Master List", href: "/payments/subscriptions", icon: CreditCard },
  { title: "subs Selector", href: "/payments/transactions", icon: Receipt },
  { title: "subs Suggestions", href: "/payments/suggestions", icon: Sparkles },
  { title: "Reminders", href: "/payments/reminders", icon: Bell },
];

const supportItems = [
  { title: "Settings", href: "/settings", icon: Settings },
  // Help and Schema added by Phase 40
];
```

```tsx
// In the AppSidebar JSX — three SidebarGroup blocks:
<SidebarContent>
  <SidebarGroup>
    <SidebarGroupLabel>fin Vault</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {finVaultItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            >
              <Link href={item.href}>
                <item.icon className="size-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>

  <SidebarGroup>
    <SidebarGroupLabel>payments Portal</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {paymentsPortalItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            >
              <Link href={item.href}>
                <item.icon className="size-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>

  <SidebarGroup>
    <SidebarGroupLabel>Support</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {supportItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            >
              <Link href={item.href}>
                <item.icon className="size-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>

  {/* Admin group and trial banner unchanged */}
</SidebarContent>
```

### Pattern 3: Active State Logic for Nested Paths

**What:** The correct `isActive` predicate for sidebar items that have child routes.

**Why current code breaks:** The current sidebar uses `pathname === item.href` for main nav items. With paths like `/payments/subscriptions`, when user is at `/payments/subscriptions/new`, the exact match fails and the nav item goes inactive.

**Correct approach:** Use `pathname === item.href || pathname.startsWith(`${item.href}/`)` for all items. The slash-terminated `startsWith` prevents false positives — `/vault` won't activate when at `/vault/load` if `/vault` and `/vault/load` are separate items (since `/vault/load`.startsWith(`/vault/`) = true, but that's correct: when at `/vault/load`, BOTH `/vault` section label and `/vault/load` item could be considered — but since these are sibling items not parent-child, this approach correctly only activates the exact item or its children).

**The subtlety:** `/vault`.startsWith(`/vault/`) = FALSE (the slash suffix prevents the prefix match from firing on `/vault` when at `/vault`). But `/vault/load`.startsWith(`/vault/`) = TRUE. This means if a user is at `/vault/load`, the `/vault` item (doc Vault) would NOT be incorrectly highlighted, but `/vault/load` would be correctly highlighted.

**Wait — recheck:** if item.href is `/vault` and pathname is `/vault/load`:
- `pathname === item.href` → `/vault/load` === `/vault` → FALSE
- `pathname.startsWith(`/vault/`)` → `/vault/load`.startsWith(`/vault/`) → TRUE

This WOULD activate the doc Vault item when at `/vault/load`. Since doc Vault and doc Load are sibling items (not parent-child), this is a false positive.

**Correct fix for sibling items:** Use exact match only: `pathname === item.href`. For items that genuinely have child routes (like `/payments/subscriptions` which has `/payments/subscriptions/new` and `/payments/subscriptions/[id]`), use the startsWith approach.

**Recommended approach per item type:**
```typescript
// Helper function
function isNavItemActive(pathname: string, href: string, hasChildren: boolean): boolean {
  if (hasChildren) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}
```

Or more simply, hard-code which items have children:
- `/payments/subscriptions` → `startsWith` (has /new, /[id], /[id]/edit)
- `/settings` → `startsWith` (has /billing, /privacy)
- All other items → exact match

### Pattern 4: proxy.ts Protected Routes Update

**What:** The `proxy.ts` file (Next.js 16's middleware equivalent) has a `protectedRoutes` array that determines auth-gated paths. After moving routes, this array must be updated.

**Current protectedRoutes in proxy.ts:**
```typescript
const protectedRoutes = [
  "/dashboard",
  "/subscriptions",
  "/import",
  "/analytics",
  "/reminders",
  "/settings",
  "/onboarding",
];
```

**Required update:** Add new paths, keep old ones or remove them (since 308 redirects in next.config.ts fire before proxy.ts, old paths will be redirected before reaching the proxy auth check — but to be safe, add new paths):
```typescript
const protectedRoutes = [
  "/dashboard",        // kept — redirect fires before proxy anyway
  "/payments",        // NEW — covers all /payments/* routes
  "/vault",           // NEW — covers /vault and /vault/load
  "/accounts",        // NEW — placeholder page
  "/subscriptions",   // kept for safety
  "/import",          // kept for safety
  "/analytics",       // kept for safety
  "/reminders",       // kept for safety
  "/settings",
  "/sources",         // already protected by auth but not in list — add for completeness
  "/onboarding",
];
```

**Note:** Since redirects fire before proxy, old paths in protectedRoutes are harmless to keep. The primary action is adding `/payments`, `/vault`, and `/accounts`.

### Pattern 5: Accounts Placeholder Page

**What:** A minimal Server Component page at `src/app/(dashboard)/accounts/page.tsx`.

**Example:**
```typescript
// src/app/(dashboard)/accounts/page.tsx
import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react"; // or Landmark, Wallet2

export const metadata: Metadata = {
  title: "Accounts",
  description: "Manage your financial accounts",
};

export default function AccountsPage() {
  return (
    <>
      <DashboardHeader title="data Vault" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <Database className="size-16 text-muted-foreground/30" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">No accounts yet</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Financial accounts let you organize your bank statements and
                track where your money moves.
              </p>
            </div>
            <Button disabled>
              Create Account
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
```

### Anti-Patterns to Avoid

- **Collapsible sections:** Decision is locked — always-expanded. Do not add collapse toggle state.
- **Using `pathname.startsWith(item.href)` without trailing slash guard:** Will cause false positives for sibling items sharing a common prefix (e.g., `/vault` and `/vault/load`).
- **Creating a `/payments/layout.tsx` unnecessarily:** The dashboard `layout.tsx` already wraps everything. No additional layout file is needed for the `/payments/` directory unless there is a payments-specific layout concern (there isn't).
- **Moving subscriptions' deep subroutes but not their breadcrumbs:** Breadcrumbs in subscriptions pages reference `{ label: "Dashboard", href: "/dashboard" }` — these need updating to `{ label: "subs Dash", href: "/payments/dashboard" }`.
- **Missing the `subscriptions/:path*` wildcard in redirects:** The subscriptions redirect must cover child routes `/subscriptions/new`, `/subscriptions/[id]`, `/subscriptions/[id]/edit`. A plain `source: "/subscriptions"` only matches the exact path.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permanent 308 redirects | Custom redirect route handlers at each old path | `next.config.ts` `redirects()` array | Built-in, runs before proxy, handles 308 with `permanent: true`, browser-cacheable |
| Sidebar section styling | Custom CSS for section labels | `SidebarGroupLabel` default shadcn styling | Already installed, applies correct muted uppercase styling |
| Active state tracking | Custom state management | `usePathname()` with `pathname.startsWith()` | Already used in existing sidebar code |

**Key insight:** The redirect mechanism is fully handled by Next.js built-ins. No new library, route handler, or proxy logic is needed for the 308 redirects.

## Common Pitfalls

### Pitfall 1: Subscriptions Subroutes Not Redirected

**What goes wrong:** Adding `{ source: "/subscriptions", destination: "/payments/subscriptions", permanent: true }` without a wildcard entry. Users who click `/subscriptions/new` from a bookmark get a 404.

**Why it happens:** `source: "/subscriptions"` only matches the exact path, not child paths.

**How to avoid:** Add the wildcard entry: `{ source: "/subscriptions/:path*", destination: "/payments/subscriptions/:path*", permanent: true }`.

**Warning signs:** Any subscription detail page returning 404 during testing.

### Pitfall 2: Internal Links Pointing to Old Paths After Redirects

**What goes wrong:** Users experience unnecessary redirect chains: app link → old URL → 308 → new URL. Slow and semantically wrong for a deployed app.

**Why it happens:** Updating next.config.ts handles external bookmarks, but internal `<Link href="/subscriptions">` components still point to old paths. The redirect fires on every navigation.

**How to avoid:** After adding redirects, grep for all old path references in `src/` and update them. The key files are:
- `src/components/layout/app-sidebar.tsx` (already updated as part of this phase)
- `src/app/(dashboard)/dashboard/page.tsx` — has href="/subscriptions", href="/analytics", href="/import"
- `src/app/(dashboard)/subscriptions/page.tsx` — has href="/subscriptions/new", href="/import"
- `src/app/(dashboard)/subscriptions/[id]/page.tsx` — has href="/subscriptions", router.push("/subscriptions")
- `src/app/(dashboard)/subscriptions/new/page.tsx` — has router.push("/subscriptions")
- `src/app/(dashboard)/subscriptions/[id]/edit/page.tsx` — has router.push("/subscriptions/[id]")
- `src/app/(dashboard)/import/batch/page.tsx` — has router.push("/subscriptions")
- `src/app/(dashboard)/import/page.tsx` — has router.push("/subscriptions/new"), router.push("/subscriptions")
- `src/app/(dashboard)/onboarding/page.tsx` — has router.push("/dashboard"), router.push("/subscriptions/new"), router.push("/import")
- `src/app/(dashboard)/analytics/page.tsx` — has breadcrumb href="/dashboard"
- `src/app/(dashboard)/reminders/page.tsx` — has breadcrumb href="/dashboard"
- `src/app/(dashboard)/settings/layout.tsx` — has href="/reminders" in settings nav, breadcrumb href="/dashboard"
- `src/components/suggestions/evidence-list.tsx` — has href="/transactions?search=..."
- `src/components/sources/incomplete-batch-banner.tsx` — has href="/import/batch"
- `src/components/vault/vault-empty-state.tsx` — has href="/import/batch"
- `src/lib/hooks/use-batch-upload.ts` — has window.location.href = "/suggestions"
- `src/lib/hooks/use-bulk-patterns.ts` — has window.location.href = "/subscriptions"
- `src/app/(auth)/login/login-form.tsx` — has callbackUrl default "/dashboard"
- `src/app/(dashboard)/admin/layout.tsx` — has redirect("/dashboard")
- `src/app/page.tsx` — has redirect("/dashboard")
- `src/app/proxy.ts` — has redirect("/dashboard"), protectedRoutes list
- Multiple files with breadcrumb `{ label: "Dashboard", href: "/dashboard" }`

**Warning signs:** Redirect chains in browser network tab, old paths still showing in browser history.

### Pitfall 3: Header Link Still Points to /dashboard

**What goes wrong:** The sidebar header brand logo (`<Link href="/dashboard">`) is not updated. Users are redirected on every app load.

**Where it is:** `app-sidebar.tsx` line 155 — `<Link href="/dashboard">` in `SidebarHeader`.

**How to avoid:** Change this to `/payments/dashboard` when restructuring the sidebar.

### Pitfall 4: proxy.ts Auth Check Doesn't Cover New Paths

**What goes wrong:** `/payments/dashboard` is not in the `protectedRoutes` array, so unauthenticated users can access it without being redirected to `/login`.

**Why it happens:** The proxy.ts `protectedRoutes` was written for the old paths.

**How to avoid:** Add `/payments` and `/accounts` and `/vault` to the protected routes list. Since `protectedRoutes.some((route) => pathname.startsWith(route + "/"))` is the check pattern, adding `/payments` covers all `/payments/*` children.

### Pitfall 5: Breadcrumbs Still Reference "Dashboard" → /dashboard

**What goes wrong:** Breadcrumb "Dashboard" link in every page header redirects instead of navigating directly to the new path.

**How to avoid:** Update all `{ label: "Dashboard", href: "/dashboard" }` breadcrumb entries to `{ label: "subs Dash", href: "/payments/dashboard" }` — there are ~15 instances across 9 files.

### Pitfall 6: The /dashboard/forecasting → /payments/forecast Redirect Misses the Old Dashboard Parent

**What goes wrong:** Adding a redirect for `/dashboard/forecasting` but the parent `/dashboard` redirect gets processed first (or the path is matched ambiguously).

**Why it happens:** next.config.ts processes redirects in order — if `/dashboard` matches before `/dashboard/forecasting`, the forecasting path never gets its own redirect target.

**How to avoid:** Confirm redirect order. A wildcard `/dashboard/:path*` catches all subroutes including forecasting, but the explicit `/dashboard/forecasting` entry can be added before the wildcard. Alternatively, use only specific entries (no wildcard for dashboard) and list forecasting explicitly. Since we're NOT using `/dashboard/:path*` (only specific routes), this is not an issue — just list both:
```typescript
{ source: "/dashboard", destination: "/payments/dashboard", permanent: true },
{ source: "/dashboard/forecasting", destination: "/payments/forecast", permanent: true },
```

### Pitfall 7: next.config.ts Sentry Wrapper Must Include redirects

**What goes wrong:** Adding the `redirects()` function to the inner `nextConfig` object but the Sentry wrapper (`withSentryConfig`) strips or replaces the config.

**Why it happens:** `withSentryConfig(nextConfig, sentryOptions)` wraps the config — but it should pass through the `redirects` function. This is standard behavior.

**How to avoid:** Add `redirects()` to the `nextConfig` object (inside `const nextConfig = { ... }`), not after the Sentry wrapper. The existing pattern is correct:
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  async redirects() { return [...]; },
};
export default withSentryConfig(nextConfig, sentryOptions);
```

## Code Examples

### Verified: next.config.ts redirects with permanent: true

```typescript
// Source: https://nextjs.org/docs/app/guides/redirecting (version 16.1.6, updated 2026-02-24)
// permanent: true → 308 Permanent Redirect
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/about',
        destination: '/',
        permanent: true,  // produces 308
      },
      {
        source: '/blog/:slug',    // wildcard capture
        destination: '/news/:slug',
        permanent: true,
      },
    ]
  },
}
```

### Verified: SidebarGroupLabel default styling

```tsx
// Source: existing app-sidebar.tsx — already using this pattern
<SidebarGroup>
  <SidebarGroupLabel>Support</SidebarGroupLabel>
  <SidebarGroupContent>
    <SidebarMenu>
      {/* items */}
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

The `SidebarGroupLabel` component from shadcn/ui applies muted, uppercase, smaller-text styling by default — matching the "subtle uppercase label" requirement without any additional className.

### Verified: Active state pattern (already in codebase for secondary items)

```tsx
// Source: existing app-sidebar.tsx line 208 — already uses startsWith for settings
<SidebarMenuButton
  asChild
  isActive={pathname.startsWith(item.href)}  // existing pattern for Support group
>
```

The main nav items use `pathname === item.href` (exact). The Support group already uses `startsWith`. The fix is to apply the correct logic to each item consistently.

### Complete internal link audit result

Files requiring updates to internal hrefs/router.push calls (confirmed by grep):

| File | Old Reference | New Reference |
|------|---------------|---------------|
| `src/components/layout/app-sidebar.tsx` | All nav hrefs | Updated in sidebar restructure |
| `src/app/(dashboard)/dashboard/page.tsx` | `/subscriptions`, `/analytics`, `/import` | `/payments/subscriptions`, `/payments/analytics`, `/vault/load` |
| `src/app/(dashboard)/subscriptions/page.tsx` | `/subscriptions/new`, `/import` | `/payments/subscriptions/new`, `/vault/load` |
| `src/app/(dashboard)/subscriptions/[id]/page.tsx` | `/subscriptions`, router.push | `/payments/subscriptions` |
| `src/app/(dashboard)/subscriptions/new/page.tsx` | router.push `/subscriptions` | `/payments/subscriptions` |
| `src/app/(dashboard)/subscriptions/[id]/edit/page.tsx` | router.push `/subscriptions/[id]` | `/payments/subscriptions/[id]` |
| `src/app/(dashboard)/import/batch/page.tsx` | router.push `/subscriptions` | `/payments/subscriptions` |
| `src/app/(dashboard)/import/page.tsx` | router.push `/subscriptions`, `/subscriptions/new` | `/payments/subscriptions`, `/payments/subscriptions/new` |
| `src/app/(dashboard)/onboarding/page.tsx` | router.push `/dashboard`, `/subscriptions/new`, `/import` | `/payments/dashboard`, `/payments/subscriptions/new`, `/vault/load` |
| `src/app/(dashboard)/analytics/page.tsx` | breadcrumb `/dashboard` | `/payments/dashboard` |
| `src/app/(dashboard)/reminders/page.tsx` | breadcrumb `/dashboard` | `/payments/dashboard` |
| `src/app/(dashboard)/settings/layout.tsx` | href `/reminders`, breadcrumb `/dashboard` | `/payments/reminders`, `/payments/dashboard` |
| `src/components/suggestions/evidence-list.tsx` | href `/transactions?search=...` | `/payments/transactions?search=...` |
| `src/components/sources/incomplete-batch-banner.tsx` | href `/import/batch` | `/vault/load` |
| `src/components/vault/vault-empty-state.tsx` | href `/import/batch` | `/vault/load` |
| `src/lib/hooks/use-batch-upload.ts` | window.location.href `/suggestions` | `/payments/suggestions` |
| `src/lib/hooks/use-bulk-patterns.ts` | window.location.href `/subscriptions` | `/payments/subscriptions` |
| `src/app/(auth)/login/login-form.tsx` | callbackUrl default `/dashboard` | `/payments/dashboard` |
| `src/app/(dashboard)/admin/layout.tsx` | redirect `/dashboard` | `/payments/dashboard` |
| `src/app/page.tsx` | redirect `/dashboard` | `/payments/dashboard` |
| `src/app/proxy.ts` | redirect `/dashboard`, protectedRoutes | `/payments/dashboard`, add `/payments`, `/vault`, `/accounts` |
| Multiple files (~15) | breadcrumb `{ label: "Dashboard", href: "/dashboard" }` | `{ label: "subs Dash", href: "/payments/dashboard" }` |

**Note on breadcrumb label:** The user-facing breadcrumb label for what was "Dashboard" is now "subs Dash" per the spec. Update both href and label.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 | This project uses `proxy.ts` not `middleware.ts` — any middleware-level redirects must go in `proxy.ts` or `next.config.ts` |
| 301 permanent redirects | 308 permanent redirects | After HTTP methods became important | 308 preserves request method (POST stays POST); 301 historically converted POST → GET |
| Flat sidebar navigation | Multi-section sidebar with `SidebarGroup` labels | shadcn/ui sidebar v1 | shadcn sidebar already supports this — no new components needed |

## Open Questions

1. **Icon choices for doc Load and data Vault items**
   - What we know: Claude's discretion
   - What's unclear: Best semantic icon choices from lucide-react
   - Recommendation: `FolderUp` for doc Load (already imported, used in old Batch Import entry), `Landmark` or `Wallet2` or `Database` for data Vault. `Database` is most explicit for a data vault concept.

2. **What happens to the old `/dashboard/forecasting` directory after redirects?**
   - What we know: next.config.ts redirect handles external links; internal link in sidebar removed
   - What's unclear: Should the old `dashboard/forecasting/page.tsx` be deleted or left?
   - Recommendation: Move the forecasting page content to `/payments/forecast/page.tsx`. Leave the old directory — it becomes dead code but causes no harm. Old directory can be cleaned up in a future housekeeping pass.

3. **Subscriptions sub-pages: copy content or move files?**
   - What we know: `/payments/subscriptions/` needs the same content as old `/subscriptions/`
   - What's unclear: Whether to copy page.tsx content or create thin wrapper that imports old component
   - Recommendation: Move the files (rename directories). Simpler, less duplication. Since next.config.ts handles 308 redirects for external links, the old directories don't need to exist anymore (unless there's a concern about in-flight navigation during deployment).

## Sources

### Primary (HIGH confidence)

- Next.js 16 official redirecting guide (https://nextjs.org/docs/app/guides/redirecting) — confirmed `redirects()` in next.config.ts produces 308 with `permanent: true`; confirmed proxy.ts runs after next.config.ts redirects; confirmed `permanentRedirect()` function produces 308
- Codebase `src/components/layout/app-sidebar.tsx` — direct inspection of existing sidebar structure, current nav items, active state logic, shadcn components already imported
- Codebase `src/app/proxy.ts` — direct inspection of protectedRoutes array and auth logic
- Codebase `src/app/(dashboard)/` directory scan — confirmed all existing route locations
- Codebase grep results — confirmed all internal href references requiring updates

### Secondary (MEDIUM confidence)

- Next.js redirects page (https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) — confirmed wildcard `:path*` syntax for matching subroutes

### Tertiary (LOW confidence)

None — all critical findings verified against codebase and official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components already in project; no new packages
- Architecture: HIGH — approach verified against Next.js 16 official docs and existing codebase patterns
- Pitfalls: HIGH — identified via direct code inspection; every referenced file confirmed to exist

**Research date:** 2026-02-25
**Valid until:** 2026-04-25 (stable framework features; redirects API unchanged for years)