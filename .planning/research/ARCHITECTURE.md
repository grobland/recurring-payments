# Architecture Research

**Domain:** Subscription Manager v3.1 UX & Quality — integration architecture for sidebar redesign, onboarding hints, CSV export, overlap detection, E2E testing, and performance optimization
**Researched:** 2026-03-02
**Confidence:** HIGH (all findings from direct codebase inspection of v3.0 production code)

---

## Milestone Scope

Six feature areas integrating into the existing v3.0 codebase. All integrate without new DB migrations or new route groups.

| Feature | Type | Risk |
|---------|------|------|
| Sidebar redesign | Visual + IA change | Low (single file) |
| Onboarding hints | UI extension | Low (prop addition) |
| CSV export — transactions | New API endpoint | Low (pattern exists) |
| CSV export — subscriptions UI | UI addition | Low (endpoint exists) |
| Overlap detection | Client-side derived state | Low (no API needed) |
| E2E test expansion | New test files | Medium (coverage gaps) |
| Performance audit + optimization | Config + targeted code | Medium (analysis first) |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                               │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  AppSidebar  │  │  Page (RSC)  │  │  Client Comp │  │  EmptyState │ │
│  │  (modified)  │  │              │  │  (TanStack Q)│  │  + Hints    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                  │                 │        │
├─────────┴─────────────────┴──────────────────┴─────────────────┴────────┤
│                          Next.js API Routes                               │
│                                                                          │
│  ┌───────────────────┐  ┌────────────────────┐  ┌────────────────────┐  │
│  │ /api/subscriptions│  │ /api/subscriptions │  │ /api/transactions  │  │
│  │ /export (EXISTS)  │  │ /duplicates (EXISTS│  │ /export (NEW)      │  │
│  │                   │  │ — overlap pattern) │  │                    │  │
│  └─────────┬─────────┘  └─────────┬──────────┘  └──────────┬─────────┘  │
├────────────┴─────────────────────┴───────────────────────────┴──────────┤
│                       Drizzle ORM + Supabase                              │
│                                                                          │
│  subscriptions · categories · transactions · statements · users          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feature-by-Feature Integration Analysis

### 1. Sidebar Redesign

**What it touches:** `src/components/layout/app-sidebar.tsx` only.

**Current structure (v3.0):**
- Three `SidebarGroup` sections with `SidebarGroupLabel`: "fin Vault", "payments Portal", "Support"
- Items are module-level arrays: `finVaultItems`, `paymentsPortalItems`, `supportItems`
- Uses shadcn `Sidebar`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuButton`
- `isNavItemActive()` helper for route matching
- Footer: user avatar dropdown (profile, billing, settings, theme, sign-out)
- Trial badge rendered inline when `isTrialActive` is true
- Admin section conditionally rendered when `session.user.role === "admin"`

**What changes for visual overhaul:**

shadcn sidebar uses CSS custom properties for theming. The correct way to override colors is via CSS custom properties in `globals.css`, not via class name overrides:

```css
/* globals.css — warm/friendly color override */
:root {
  --sidebar-background: oklch(0.98 0.02 60);    /* warm off-white */
  --sidebar-foreground: oklch(0.25 0.05 30);
  --sidebar-border: oklch(0.90 0.02 60);
  --sidebar-accent: oklch(0.94 0.03 60);        /* hover state */
  --sidebar-accent-foreground: oklch(0.20 0.05 30);
}
.dark {
  --sidebar-background: oklch(0.18 0.03 30);
  --sidebar-foreground: oklch(0.90 0.02 60);
}
```

Within `app-sidebar.tsx`, changes include:
- Update `SidebarGroupLabel` text (e.g., "fin Vault" → "Vault" / "Payments" / "Support")
- Adjust icon set if labels change (swap existing Lucide icons for better semantic matches)
- Update app logo in `SidebarHeader` — replace `CreditCard` icon or add a colored mark
- No new shadcn primitives required; all primitives already imported

**What changes for IA reorganization:**
- Rename section labels to plain English (removing the "fin/payments" compound style if the design direction changes)
- Reorder items within sections if desired
- If CSV export gets a dedicated page, add it to the appropriate section here
- `isNavItemActive()` helper is already correct for exact-match defaults — no changes needed unless new prefix-match routes are added

**Integration boundary:** The sidebar renders once in `src/app/(dashboard)/layout.tsx` as `<AppSidebar />`. The layout is a Server Component; the sidebar is `"use client"`. No layout.tsx changes required for visual redesign or item renaming.

**New vs modified:**
- MODIFIED — `src/components/layout/app-sidebar.tsx`
- MODIFIED — `src/app/globals.css` (CSS custom property overrides for sidebar tokens)

---

### 2. Contextual Onboarding Hints

**What it touches:** `src/components/shared/empty-state.tsx` and the specific page files that render empty states.

**Current `EmptyState` component API:**
```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string; icon?: LucideIcon };
  secondaryAction?: { label: string; href: string };
}
```

**Approach — extend with optional `hint` prop:**

```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string; icon?: LucideIcon };
  secondaryAction?: { label: string; href: string };
  hint?: {
    steps?: string[];    // numbered how-to list rendered below the actions
    tip?: string;        // single-line callout tip
  };
}
```

The `hint` prop is purely additive — all existing callers are unaffected (optional prop, defaults to `undefined`). No refactoring of existing usage.

**Where hints apply:**

| Page | Condition for hint | Hint content |
|------|-------------------|--------------|
| Dashboard (`/payments/dashboard`) | `subscriptions.length === 0` | Steps: add manually, or import PDF |
| Subscriptions list | `subscriptions.length === 0` | Steps: add manually, import, use suggestions |
| Vault (`/vault`) | no PDFs uploaded | Tip: "Upload a bank statement to start building your financial history" |
| Accounts (`/accounts`) | no accounts | Steps: create an account, link to a source |
| Transactions | no transactions | Tip: "Import a bank statement to populate your transaction history" |

**`onboardingCompleted` flag:** The `users` table has `onboardingCompleted` boolean. The `useUserStatus()` hook exposes user data. However, for v3.1, showing hints on empty states regardless of the flag is simpler and more robust — hints disappear naturally once data exists, no flag management needed.

**Integration boundary:** Pure UI change. No new API routes. No DB schema changes. No new hooks.

**New vs modified:**
- MODIFIED — `src/components/shared/empty-state.tsx` (add optional `hint` prop + render hint block)
- MODIFIED — up to 5 page files that pass the new `hint` prop

---

### 3. CSV Export

**Subscriptions CSV — endpoint ALREADY EXISTS:**

`GET /api/subscriptions/export` is fully implemented in `src/app/api/subscriptions/export/route.ts`:
- Authenticated, queries all active subscriptions with category join
- Uses `objectsToCSV()` and `createCSVResponse()` from `src/lib/utils/csv.ts`
- Returns `Content-Disposition: attachment; filename="subscriptions-YYYY-MM-DD.csv"`
- 13 columns: name, description, category, amount, currency, frequency, monthlyEquivalent, nextRenewalDate, startDate, status, url, notes, createdAt

**What is missing for subscriptions CSV:** A download button in the UI. No page currently calls this endpoint.

**Transaction history CSV — NEW ENDPOINT:**

`GET /api/transactions/export/route.ts` mirrors the subscriptions export pattern exactly:

```typescript
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  // Optional filters matching existing transactions API
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sourceType = searchParams.get("sourceType");

  const rows = await db.query.transactions.findMany({
    where: (t) => and(
      eq(t.userId, session.user!.id),
      dateFrom ? gte(t.transactionDate, new Date(dateFrom)) : undefined,
      dateTo ? lte(t.transactionDate, new Date(dateTo)) : undefined,
    ),
    with: { statement: { columns: { sourceType: true } } },
    orderBy: (t, { desc }) => [desc(t.transactionDate)],
    limit: 10000, // guard against huge exports
  });

  const exportData = rows.map(row => ({ ... }));
  const csv = objectsToCSV(exportData, columns);
  return createCSVResponse(csv, `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`);
}
```

All utilities (`objectsToCSV`, `createCSVResponse`) already exist in `src/lib/utils/csv.ts`. No new utilities needed.

**UI integration — download buttons:**

CSV download is a direct browser GET navigation, not a JSON API call. No TanStack Query hook needed:

```typescript
// Option A: plain anchor (simplest)
<a href="/api/subscriptions/export" download>
  <Button variant="outline">Export CSV</Button>
</a>

// Option B: with filter params
const handleExport = () => {
  const url = new URL('/api/transactions/export', window.location.origin);
  if (dateFrom) url.searchParams.set('dateFrom', dateFrom);
  window.location.href = url.toString();
};
```

Placement options:
- Subscriptions export button → subscriptions list page header (data is already loaded there)
- Transactions export button → transactions browser page header
- Alternatively, both buttons on a Settings > Data page alongside the existing JSON export (`GET /api/user/export`)

**Data flow:**
```
User clicks "Export CSV"
  → Browser navigates to /api/subscriptions/export (GET)
  → auth() → db query → objectsToCSV() → Response with Content-Disposition: attachment
  → Browser saves file automatically (no JS handling needed)
```

**New vs modified:**
- NEW — `src/app/api/transactions/export/route.ts`
- MODIFIED — subscriptions list page + transactions page (add export buttons)
- No new hooks, no DB schema changes

---

### 4. Subscription Overlap Detection

**Distinguishing overlap from duplicate:**

| Concept | Definition | Existing? |
|---------|-----------|-----------|
| Duplicate | Same service, possibly billed twice (high name similarity score) | YES — `POST /api/subscriptions/duplicates` using `calculateSimilarity()` |
| Overlap | Multiple active subscriptions in the same category (intentional redundancy worth flagging) | NO |

**Approach — client-side derived state (no new API endpoint):**

The subscriptions list page already calls `useSubscriptions({ status: 'active' })` and has the full subscription array in cache. Overlap detection is O(n) grouping over a small dataset (typically 5-50 subscriptions per user):

```typescript
// In subscriptions page or a shared hook
const overlaps = React.useMemo(() => {
  const byCategory: Record<string, typeof subscriptions> = {};
  for (const sub of subscriptions) {
    if (!sub.categoryId || !sub.category) continue;
    byCategory[sub.categoryId] ??= [];
    byCategory[sub.categoryId].push(sub);
  }
  return Object.values(byCategory).filter(group => group.length >= 2);
}, [subscriptions]);
```

**UI — new `OverlapWarning` component:**

```typescript
// src/components/subscriptions/overlap-warning.tsx
interface OverlapGroup {
  categoryName: string;
  subscriptions: { id: string; name: string; amount: string; currency: string }[];
}

export function OverlapWarning({ groups }: { groups: OverlapGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
        {groups.length === 1
          ? `You have ${groups[0].subscriptions.length} subscriptions in "${groups[0].categoryName}"`
          : `You have multiple subscriptions in ${groups.length} categories`}
      </p>
      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
        Review them to check for services you may no longer need.
      </p>
    </div>
  );
}
```

Rendered at the top of the subscriptions list page when `overlaps.length > 0`.

**Integration boundary:** The overlap check piggybacks on the existing `useSubscriptions()` query — zero additional API calls. The warning component is a new file. The subscriptions list page receives a small addition.

**New vs modified:**
- NEW — `src/components/subscriptions/overlap-warning.tsx`
- MODIFIED — `src/app/(dashboard)/payments/subscriptions/page.tsx` (add `useMemo` overlap calc + render `<OverlapWarning>`)
- No new API routes, no DB schema changes

---

### 5. E2E Test Expansion

**Current state (from direct inspection):**
- `tests/auth.setup.ts` — logs in once, saves session to `playwright/.auth/user.json`
- `tests/e2e/subscriptions.spec.ts` — 6 tests (CRUD + validation + navigation)
- `tests/e2e/email-reminders.spec.ts` — 1 test (cron trigger, skipped without `CRON_SECRET`)
- `tests/e2e/pdf-import.spec.ts` — exists (count unknown)
- `playwright.config.ts` — 4 browser projects (Chromium, Firefox, WebKit, Mobile Chrome), all inherit auth state

**Key infrastructure facts:**
- `auth.setup.ts` runs before all `*.spec.ts` files — new spec files need zero auth boilerplate
- All spec files run in `tests/e2e/` directory — just add new files
- Existing `subscriptions.spec.ts` tests use old URL `/subscriptions/new` (pre-v3.0 redirect) — tests still pass due to 308 redirects in `next.config.ts`
- Playwright config starts `npm run dev` automatically — no server setup needed

**Proposed new test files:**

```
tests/e2e/
├── auth.spec.ts                # NEW: login failure, logout flow
├── dashboard.spec.ts           # NEW: stats cards, upcoming renewals, empty state
├── analytics.spec.ts           # NEW: chart renders, period selector
├── vault.spec.ts               # NEW: view mode switching, empty state
├── accounts.spec.ts            # NEW: create account, view detail tabs
├── transactions.spec.ts        # NEW: filter by payment type, search
├── export.spec.ts              # NEW: CSV download triggers (check response headers)
├── overlap-detection.spec.ts   # NEW: warning appears when same-category subs exist
├── sidebar.spec.ts             # NEW: active nav state, section visibility
├── subscriptions.spec.ts       # EXISTING (6 tests — keep, add 2 more)
├── email-reminders.spec.ts     # EXISTING (keep)
└── pdf-import.spec.ts          # EXISTING (keep)
```

**Test count estimate:**

| File | New Tests | Notes |
|------|-----------|-------|
| auth.spec.ts | 3 | login fail, logout, session persistence |
| dashboard.spec.ts | 3 | stats visible, no crash with 0 subs, period selector works |
| analytics.spec.ts | 2 | chart renders, no error with empty data |
| vault.spec.ts | 3 | file cabinet view, timeline view, coverage grid |
| accounts.spec.ts | 3 | create account, view detail, account tabs accessible |
| transactions.spec.ts | 3 | filter recurring, search text, tag a transaction |
| export.spec.ts | 2 | subscriptions CSV triggers download, transactions CSV triggers download |
| overlap-detection.spec.ts | 1 | warning renders with 2 same-category subs |
| sidebar.spec.ts | 2 | active item highlights, trial badge shows/hides |
| subscriptions.spec.ts (extend) | 2 | export button visible, overlap warning visible |
| **Total new** | **24** | Combined ~30+ with existing |

**Testing CSV downloads in Playwright:**
```typescript
// export.spec.ts
test('subscriptions CSV download triggers', async ({ page }) => {
  // Listen for the download event
  const downloadPromise = page.waitForEvent('download');
  await page.goto('/payments/subscriptions');
  await page.getByRole('button', { name: /export/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^subscriptions-\d{4}-\d{2}-\d{2}\.csv$/);
});
```

**Shared test helpers (optional but recommended at 25+ tests):**

```typescript
// tests/helpers/navigation.ts
export async function navigateViaSidebar(page: Page, linkName: string) {
  await page.getByRole('navigation').getByRole('link', { name: linkName }).click();
}

// tests/helpers/subscriptions.ts
export async function createTestSubscription(page: Page, name: string) {
  await page.goto('/payments/subscriptions/new');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Amount').fill('9.99');
  const responsePromise = page.waitForResponse(r =>
    r.url().includes('/api/subscriptions') && r.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Create Subscription' }).click();
  await responsePromise;
}
```

**Integration boundary:** Tests live entirely in `tests/`. No production code changes required for test infrastructure. The existing `playwright.config.ts` applies automatically to all new spec files.

**New vs modified:**
- NEW — `tests/e2e/*.spec.ts` (8-9 new files)
- NEW — optional `tests/helpers/` directory
- No production code changes

---

### 6. Performance Audit and Optimization

**Bundle analysis — `@next/bundle-analyzer` not currently installed:**

```bash
npm install -D @next/bundle-analyzer
```

```typescript
// next.config.ts modification
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryOptions));
```

Run: `ANALYZE=true npm run build` — generates `.next/analyze/client.html` and `.next/analyze/server.html`.

**Known heavy areas (from CONCERNS.md):**

| File | Lines | Issue |
|------|-------|-------|
| `src/components/ui/sidebar.tsx` | 726 | shadcn primitive, do not split |
| `src/app/(dashboard)/import/page.tsx` | 522 | monolith page, modal content inline |
| `src/app/(dashboard)/subscriptions/page.tsx` | 457 | monolith page |

**Optimization patterns applicable to this app:**

1. **Dynamic imports for modal/dialog content:**
```typescript
// In page files with large inline dialogs
import dynamic from 'next/dynamic';
const SubscriptionFormDialog = dynamic(
  () => import('@/components/subscriptions/subscription-form'),
  { loading: () => <Skeleton className="h-96 w-full" /> }
);
```

2. **react-pdf is the largest third-party bundle:**
`react-pdf` bundles `pdfjs-dist` (~1.5MB uncompressed). The existing two-file split pattern (`react-pdf` worker in a separate file) keeps the worker out of the main bundle. Verify the split is working correctly with bundle analyzer output.

3. **Recharts named imports (already likely correct):**
```typescript
// Verify all chart imports use named imports, not namespace imports
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
// Not: import * as Recharts from 'recharts';
```

4. **`react-virtual` already in use** for transaction list — this is the correct pattern. Do not change.

**Lighthouse targets for Vercel deployment:**
- Performance: >80
- First Contentful Paint: <2s on dashboard (subscriptions data loads async, skeleton shows immediately)
- Largest Contentful Paint: <3s
- Cumulative Layout Shift: <0.1 (sidebar collapse causes CLS — evaluate `will-change: transform` on sidebar panel)

**What performance work actually changes:**
- `package.json` — add `@next/bundle-analyzer` dev dependency
- `next.config.ts` — wrap with bundle analyzer
- Select page files — add `dynamic()` for heavy modals discovered via analyzer
- `src/app/globals.css` — `will-change: transform` for sidebar if CLS is an issue

**New vs modified:**
- MODIFIED — `next.config.ts` (wrap with bundle analyzer)
- MODIFIED — `package.json` (add dev dep)
- MODIFIED — select page files after analysis (targeted, not speculative)

---

## Recommended File Changes Summary

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── payments/subscriptions/page.tsx     # MODIFIED: overlap useMemo + <OverlapWarning>
│   └── api/
│       └── transactions/
│           └── export/
│               └── route.ts                    # NEW: transaction CSV export
├── components/
│   ├── layout/
│   │   └── app-sidebar.tsx                     # MODIFIED: visual redesign + IA rename
│   ├── shared/
│   │   └── empty-state.tsx                     # MODIFIED: add optional hint prop
│   └── subscriptions/
│       └── overlap-warning.tsx                 # NEW: category overlap banner
└── app/
    └── globals.css                             # MODIFIED: sidebar CSS custom properties

tests/
└── e2e/
    ├── auth.spec.ts                            # NEW
    ├── dashboard.spec.ts                       # NEW
    ├── analytics.spec.ts                       # NEW
    ├── vault.spec.ts                           # NEW
    ├── accounts.spec.ts                        # NEW
    ├── transactions.spec.ts                    # NEW
    ├── export.spec.ts                          # NEW
    ├── overlap-detection.spec.ts               # NEW
    └── sidebar.spec.ts                         # NEW
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `app-sidebar.tsx` | Navigation chrome, section labels, active state, warm visual theme | MODIFIED |
| `globals.css` | Sidebar CSS custom property overrides | MODIFIED |
| `empty-state.tsx` | Empty state with optional onboarding hint steps | MODIFIED |
| `overlap-warning.tsx` | Amber warning banner when 2+ subs share a category | NEW |
| `/api/transactions/export/route.ts` | Authenticated CSV download for transaction history | NEW |
| `tests/e2e/*.spec.ts` | Playwright E2E coverage for all major features | NEW (8-9 files) |

---

## Data Flow

### Sidebar Redesign Flow
```
Any (dashboard) route request
  → DashboardLayout (server) → renders <AppSidebar />
  → AppSidebar (client): usePathname(), useSession(), useUserStatus()
  → Renders updated labels and warm visual tokens
  → CSS custom properties from globals.css apply sidebar colors
  → No API calls, no data flow changes
```

### Onboarding Hint Flow
```
Dashboard page loads
  → useSubscriptions({ status: 'active' }) → { subscriptions: [] }
  → subscriptions.length === 0 → render <EmptyState hint={{ steps: [...] }} />
  → Hint block renders inline below action buttons
  → No API calls, no new state
  → When user adds first subscription, EmptyState unmounts naturally
```

### CSV Export Flow
```
User clicks "Export CSV" button (anchor tag)
  → Browser GET /api/subscriptions/export (no JS interception)
  → auth() validates session
  → db.query.subscriptions.findMany() with category join
  → objectsToCSV(data, columns) → csv string
  → new Response(csv, { headers: { 'Content-Disposition': 'attachment; ...' } })
  → Browser triggers native file save dialog / auto-download
  (No TanStack Query, no React state, no loading spinner needed)
```

### Overlap Detection Flow
```
Subscriptions page renders
  → useSubscriptions({ status: 'active' }) — already cached from page load
  → useMemo: groupBy categoryId, filter groups with length >= 2
  → overlaps.length > 0 → render <OverlapWarning groups={overlaps} />
  → Piggybacks on existing query — zero additional network requests
  → When user deletes a subscription, TanStack Query invalidates cache
    → subscriptions re-fetch → useMemo recomputes → warning updates
```

### E2E Test Flow
```
npm run test:e2e
  → playwright.config.ts starts npm run dev (reuses existing server)
  → "setup" project: auth.setup.ts logs in, saves playwright/.auth/user.json
  → All *.spec.ts projects load auth state (no login needed in tests)
  → Tests: page.goto() → interactions → expect() assertions
  → On failure: screenshot saved, trace recorded (existing config)
```

---

## Architectural Patterns

### Pattern 1: CSS Custom Properties for Sidebar Theming

**What:** shadcn sidebar uses CSS custom properties (`--sidebar-background`, etc.) not hardcoded Tailwind classes. Override these in `globals.css` for the warm visual theme.

**When to use:** Any visual change to shadcn components. Never target shadcn-generated class names directly.

**Trade-offs:** Changes affect the entire app's sidebar consistently including dark mode. Requires knowing which CSS vars the component uses (visible in `src/components/ui/sidebar.tsx`).

**Example:**
```css
/* globals.css */
:root {
  --sidebar-background: oklch(0.98 0.02 60);
  --sidebar-accent: oklch(0.94 0.03 60);
}
.dark {
  --sidebar-background: oklch(0.18 0.03 30);
}
```

---

### Pattern 2: Direct GET for File Downloads

**What:** CSV export uses a plain `GET` route returning `Response` with `Content-Disposition: attachment`. The browser handles the download natively — no React state, no fetch interception, no Blob URL management.

**When to use:** Any file download (CSV, PDF) where the download can be initiated by navigating to a URL. For downloads requiring POST body (rare), a Blob URL approach is needed instead.

**Trade-offs:** Simple and reliable. Cannot show download progress. Acceptable for exports under ~50MB.

**Example:**
```typescript
// Client — plain anchor, no hook
<a href="/api/subscriptions/export" download>
  <Button variant="outline">
    <Download className="mr-2 h-4 w-4" />
    Export CSV
  </Button>
</a>

// For filtered export with params:
const handleExport = () => {
  const url = new URL('/api/transactions/export', window.location.origin);
  if (filters.dateFrom) url.searchParams.set('dateFrom', filters.dateFrom);
  window.location.href = url.toString();
};
```

---

### Pattern 3: Client-Side Derived State for Overlap Detection

**What:** Compute overlap groups with `useMemo` from already-fetched subscription data. Avoids a round-trip for information that can be derived from cached data.

**When to use:** When derived computation is O(n) or O(n log n) over data already in the TanStack Query cache. Not suitable for cross-user analytics or when n > 1000.

**Trade-offs:** Correct for this use case (5-50 subscriptions per user). Slightly more client computation vs zero additional network latency.

**Example:**
```typescript
const overlaps = React.useMemo(() => {
  const byCategory: Record<string, typeof subscriptions> = {};
  for (const sub of subscriptions) {
    if (!sub.categoryId || !sub.category) continue;
    byCategory[sub.categoryId] ??= [];
    byCategory[sub.categoryId].push(sub);
  }
  return Object.values(byCategory).filter(group => group.length >= 2);
}, [subscriptions]);
```

---

### Pattern 4: Additive Optional Props on Shared Components

**What:** Extend shared components like `EmptyState` with optional props rather than creating parallel components. All existing call sites remain unaffected.

**When to use:** When new behavior is purely additive, appears in a subset of use cases, and the component is already well-placed in the component tree.

**Trade-offs:** Keeps logic co-located with the empty state (correct for v3.1). If hints later need to appear independently of empty states, extract to a standalone component at that point.

**Example:**
```typescript
// Existing callers — no changes needed
<EmptyState
  icon={CreditCard}
  title="No subscriptions yet"
  description="Add your first subscription to get started."
  primaryAction={{ label: "Add Subscription", href: "/payments/subscriptions/new" }}
/>

// New caller with hint
<EmptyState
  icon={CreditCard}
  title="No subscriptions yet"
  description="Add your first subscription to get started."
  primaryAction={{ label: "Add Subscription", href: "/payments/subscriptions/new" }}
  hint={{
    steps: [
      "Click Add Subscription to enter details manually",
      "Or upload a bank statement PDF to auto-detect your subscriptions",
      "Accept suggestions on the Suggestions page to add detected services",
    ]
  }}
/>
```

---

### Pattern 5: Shared Auth in Playwright Without Per-Test Login

**What:** `auth.setup.ts` runs once before all spec files, saves browser storage state. All spec files inherit the logged-in session automatically via `storageState: authFile` in `playwright.config.ts`.

**When to use:** All tests requiring authentication. New spec files get this for free — just write `test('...', async ({ page }) => { ... })` and the session is already active.

**Trade-offs:** Tests needing a specific user state (admin role, trial expired, specific subscription setup) must set up that state within the test or use a different setup project.

**Example:**
```typescript
// tests/e2e/dashboard.spec.ts — no login code needed
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('shows spending summary', async ({ page }) => {
    await page.goto('/payments/dashboard');
    await expect(page.getByText('Monthly Spending')).toBeVisible();
  });
});
```

---

## Integration Points

### External Services

| Service | Integration Pattern | v3.1 Impact |
|---------|---------------------|-------------|
| Supabase (PostgreSQL) | Drizzle ORM queries | New: transactions export query |
| Vercel (hosting) | Static build + serverless functions | Bundle size affects cold start — audit targets this |
| Sentry | `withSentryConfig` wraps Next.js config | Bundle analyzer wraps same config — chain correctly |

### Internal Boundaries

| Boundary | Communication | v3.1 Notes |
|----------|---------------|------------|
| `app-sidebar.tsx` ↔ `DashboardLayout` | Server renders layout; sidebar is `"use client"` | No boundary change |
| `EmptyState` ↔ page components | Props only | Add optional `hint` prop — backward compatible |
| Overlap detection ↔ subscriptions data | `useSubscriptions()` cache → `useMemo` | No API boundary change |
| CSV export ↔ API routes | Browser GET navigation (no fetch) | New transactions export route only |
| E2E tests ↔ app | Playwright browser automation | Auth setup already works; just add spec files |
| Bundle analyzer ↔ Next.js config | `withBundleAnalyzer()` wraps `withSentryConfig()` | Chain order: `analyzer(sentry(config))` |

---

## Build Order Recommendation

Features are mostly independent. Order by risk and dependency:

**Phase 1 — E2E Tests (write first, creates regression baseline):**
Tests for flows that will be touched (sidebar nav, subscriptions list, CSV export) should exist before modifying those areas. Writing tests first also documents expected behavior.

**Phase 2 — CSV Export (transactions endpoint + UI buttons):**
Subscriptions export endpoint exists. New transactions endpoint is isolated server code. UI buttons are small additions. Low risk, high value, done in 1-2 hours.

**Phase 3 — Overlap Detection:**
Pure client-side derived state in one component. New `OverlapWarning` component plus a `useMemo` call in the subscriptions page. Zero API changes.

**Phase 4 — Onboarding Hints:**
Extend `EmptyState` with `hint` prop (backward-compatible). Apply to 3-5 pages. Can be done incrementally.

**Phase 5 — Sidebar Redesign:**
Visual changes to a single file plus CSS custom properties. Because the sidebar appears on every dashboard page, do this after tests are in place to catch regressions. Takes longer than it looks due to iteration on visual design.

**Phase 6 — Performance Audit:**
Last, because it requires a working build. Install bundle analyzer, run audit, identify actual heavy modules, apply targeted `dynamic()` wrapping. Do not optimize speculatively before seeing the analysis.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: New API Endpoint for Overlap Detection

**What people do:** Create `GET /api/subscriptions/overlaps` that groups subscriptions server-side.

**Why it's wrong:** The subscriptions list page already fetches all active subscriptions. A second round-trip for data that can be derived from the cached response adds latency and complexity with no benefit. The user's subscription count is small (5-50).

**Do this instead:** `useMemo` groupBy in the subscriptions page component, derived from the existing `useSubscriptions()` query.

---

### Anti-Pattern 2: TanStack Query Hook for CSV Download

**What people do:** Create a `useExportCSV()` hook that `fetch()`es the export endpoint and converts the response.

**Why it's wrong:** The browser cannot trigger a native file save from a `fetch()` response without manual Blob URL creation, object URL lifecycle management, and a simulated anchor click. This is 20 lines of error-prone code for functionality that a plain `<a href>` provides natively.

**Do this instead:** `<a href="/api/subscriptions/export" download>` or `window.location.href = url`. Zero client-side state required.

---

### Anti-Pattern 3: Full Product Tour Library for Onboarding Hints

**What people do:** Install a product tour library (Intro.js, Shepherd.js, react-joyride) to add contextual hints.

**Why it's wrong:** v3.1 specifies "contextual hints on empty states" — not a step-by-step overlay tour. Tour libraries add significant bundle weight (30-100KB), require complex state management for completion tracking, and create accessibility challenges. The existing `EmptyState` component already renders in the correct location.

**Do this instead:** Extend `EmptyState` with an optional `hint` prop. Static text, no library, no state.

---

### Anti-Pattern 4: Overriding shadcn Class Names in globals.css

**What people do:** Target shadcn component class names directly in `globals.css`:
```css
/* Wrong — fragile, breaks on shadcn updates */
.sidebar-menu-button:hover { background: wheat; }
```

**Why it's wrong:** shadcn generates class names that can change between versions. Specificity battles are hard to debug. The component is designed for customization via CSS custom properties.

**Do this instead:** Override the CSS custom properties that shadcn uses:
```css
:root { --sidebar-accent: oklch(0.94 0.03 60); }
```

---

### Anti-Pattern 5: Performance Optimizations Before Bundle Analysis

**What people do:** Add `dynamic()` imports to every large component speculatively.

**Why it's wrong:** Dynamic imports add waterfall latency for components that need to render on the initial paint (they defer loading until JavaScript runs). Adding `dynamic()` to components that are below the fold is correct; adding it to primary content components makes the page slower.

**Do this instead:** Run `ANALYZE=true npm run build` first. Look at the actual bundle output. Apply `dynamic()` only to components that are heavy AND not needed for initial paint (dialogs, modals, off-screen panels).

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (<100 users) | All v3.1 changes appropriate. Client-side overlap detection is O(n) over a small n. |
| 1k-10k users | Transactions CSV export may need streaming for users with 5k+ transactions. Add `LIMIT 10000` guard (already in example above). |
| 10k+ users | Overlap detection should move server-side. CSV exports need async job pattern (generate in background, notify when ready). |

### Scaling Priorities for v3.1

**First bottleneck:** Transactions CSV export for power users with large imports (1000+ transactions). Mitigation already in the design: `LIMIT 10000` with a row-count note in the export.

**Not a concern at current scale:** Overlap detection, onboarding hints, sidebar changes — all are trivially scalable.

---

## Sources

All findings are from direct codebase inspection (HIGH confidence):

- `src/components/layout/app-sidebar.tsx` — v3.0 sidebar structure, sections, nav items
- `src/components/shared/empty-state.tsx` — current `EmptyState` interface
- `src/app/api/subscriptions/export/route.ts` — existing subscriptions CSV export (complete)
- `src/app/api/subscriptions/duplicates/route.ts` — similarity-based duplicate detection pattern
- `src/lib/utils/csv.ts` — `objectsToCSV`, `createCSVResponse` utilities
- `src/app/(dashboard)/layout.tsx` — dashboard layout, sidebar integration point
- `src/app/(dashboard)/payments/subscriptions/page.tsx` — subscriptions list page structure
- `tests/auth.setup.ts` — Playwright auth setup, session storage pattern
- `tests/e2e/subscriptions.spec.ts` — existing test structure and patterns
- `playwright.config.ts` — test runner configuration, browser projects
- `package.json` — installed dependencies, dev dependencies
- `next.config.ts` — existing `withSentryConfig` wrapper pattern
- `.planning/codebase/ARCHITECTURE.md` — layered architecture analysis
- `.planning/codebase/TESTING.md` — test infrastructure documentation
- `.planning/codebase/CONCERNS.md` — known performance bottlenecks and tech debt
- `.planning/PROJECT.md` — v3.1 milestone requirements and existing feature inventory

---

*Architecture research for: Subscription Manager v3.1 UX & Quality milestone*
*Researched: 2026-03-02*
