# Project Research Summary

**Project:** Subscription Manager v3.1 — UX & Quality Milestone
**Domain:** SaaS UX polish, data portability, test coverage, and performance optimization on a mature Next.js 16 codebase
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

This milestone (v3.1) is a polish and quality pass on a mature ~47,800-line Next.js 16 + Supabase codebase that shipped v3.0 with full core functionality. The work divides cleanly into six areas: sidebar redesign (visual warmth + IA label clarity), contextual onboarding hints on empty states, CSV export for both subscriptions and transactions, overlap detection for redundant subscriptions, E2E test expansion from 3 to ~30 spec files, and a performance audit with targeted optimizations. All six can be delivered without new database migrations, new route groups, or new auth patterns — they layer on top of what v3.0 already ships.

The recommended approach is a minimal-dependency strategy: only two new packages are needed (`papaparse` for RFC 4180-compliant CSV serialization, `@next/bundle-analyzer` for bundle visualization), with one minor version bump on Playwright. Everything else — sidebar theming, overlap detection math, onboarding hint persistence, test infrastructure — is satisfied by libraries already installed in the codebase. The architecture research confirms that the most intuitive implementations for several features are wrong: overlap detection belongs in client-side `useMemo` over already-cached data (not a new API endpoint), CSV download belongs in a plain anchor tag (not a TanStack Query hook), and onboarding hints belong in an extended optional prop on `EmptyState` (not a tour library). These patterns eliminate unnecessary network round-trips and bundle weight.

The primary risks are in two areas. First, the existing three E2E spec files and `auth.setup.ts` reference v1.0/v2.0 URL paths (`/subscriptions/new`, `/dashboard`, `/import`) that now 308-redirect; the setup file's `waitForURL("/dashboard")` silently times out, breaking all downstream tests before new ones even run. This must be fixed before any new test is authored. Second, the existing subscriptions CSV export and the planned transactions export both contain a CSV formula injection vulnerability (OWASP CWE-1236) — user-controlled fields including AI-extracted merchant names must be sanitized before any export endpoint ships publicly. Both risks are straightforward to address but must come first within their respective phases.

## Key Findings

### Recommended Stack

The v3.0 stack (Next.js 16 App Router, React 19, Supabase + Drizzle ORM, TanStack Query, shadcn/ui, Tailwind CSS v4, date-fns v4, Playwright) requires only minimal additions for v3.1. All core functionality is already installed and battle-tested through three milestones. The two new additions (`papaparse` and `@next/bundle-analyzer`) are both narrow, dev-friendly packages with zero runtime overlap with existing tools.

See `.planning/research/STACK.md` for full version details, alternatives considered, and feature-by-feature justifications.

**Core technologies (new additions only):**
- `papaparse@^5.5.3`: Server-side CSV serialization — handles RFC 4180 edge cases (commas in names, quotes, UTF-8 BOM) that break naive `array.join(",")` approaches; runs in Node.js API routes without browser dependency
- `@next/bundle-analyzer@^16.1.6`: Dev-only bundle visualization matched to installed Next.js version; zero runtime cost; activated via `ANALYZE=true npm run build`
- `@playwright/test@^1.58.2`: Minor upgrade from installed ^1.57.0; backward-compatible with all existing spec files; current stable release

**Already installed, newly leveraged:**
- `date-fns` `areIntervalsOverlapping` — overlap detection math with no new package
- shadcn/ui `Tooltip` + `Popover` — onboarding hint UI primitives, both already installed
- Tailwind v4 `@theme` CSS custom properties — sidebar visual redesign via token overrides in `globals.css`

### Expected Features

See `.planning/research/FEATURES.md` for full prioritization matrix, competitor analysis, and dependency graph.

**Must have — table stakes (v3.1 launch required):**
- Sidebar labels in plain English — current labels ("subs Dash", "doc Vault", "subs Selector") are internal shorthand that creates hesitation at every click
- Sidebar active item visual accent — every SaaS navigation communicates current location; the shadcn default grey fails at this
- Empty-state guidance on 3-5 zero-data screens — bare empty tables with no direction trigger abandonment
- Export subscriptions CSV — API endpoint fully exists; only a trigger button is missing
- Export transactions CSV — new API endpoint + trigger button; reuses existing `objectsToCSV` + `createCSVResponse` utilities
- Overlap detection banner — core "save money" value prop; two or more active subscriptions in same category with similar amounts and nearby renewal dates

**Should have — differentiators:**
- Contextual inline onboarding hints with localStorage-persisted dismissal — more effective than modal tours (under 20% completion rate for full tours)
- E2E test suite covering all major user flows (25-30 Playwright tests) — billing-adjacent app needs regression protection
- Performance audit with bundle treemap + Lighthouse baseline — establishes optimization baseline before milestones accumulate more weight

**Defer to v3.2+:**
- Overlap detection cost breakdown per category ("$47/mo across 3 services") — worthwhile but not MVP
- E2E tests in CI via GitHub Actions — valuable infrastructure; outside v3.1 scope
- Lighthouse regression gating on PR — requires stable baseline from v3.1 audit first
- Cross-device hint dismissal via DB — only warranted if analytics show meaningful cross-device usage

### Architecture Approach

All six v3.1 features integrate as targeted additions to the existing App Router structure with no new route groups, no DB migrations, and no auth changes. The codebase already provides the right integration points: `app-sidebar.tsx` (single file for sidebar changes), `empty-state.tsx` (extend with optional `hint` prop), existing `objectsToCSV`/`createCSVResponse` utilities (reuse for transactions export), `useSubscriptions()` TanStack Query cache (derive overlap groups via `useMemo`), and `playwright.config.ts` + `auth.setup.ts` (extend with new spec files, no boilerplate needed).

See `.planning/research/ARCHITECTURE.md` for detailed integration maps, data flows, and file-by-file change lists.

**Major components and their v3.1 responsibilities:**

1. `app-sidebar.tsx` — visual warm redesign (CSS token overrides) + IA rename (11 label strings); feature-gate logic must be preserved as typed data on nav item objects before JSX changes begin
2. `empty-state.tsx` — extend with optional additive `hint` prop (backward-compatible; all existing call sites unchanged); apply to 3-5 target pages
3. `overlap-warning.tsx` (new) — amber warning banner derived from `useMemo` groupBy on already-cached subscription data; zero additional API calls
4. `/api/transactions/export/route.ts` (new) — mirrors existing subscriptions export pattern exactly; reuses `objectsToCSV` + `createCSVResponse`; includes `LIMIT 10000` guard
5. `tests/e2e/*.spec.ts` (8-9 new files) — add to existing `tests/e2e/` directory; auth state inherited from existing `auth.setup.ts` with no per-test login code
6. `next.config.ts` — wrap with `withBundleAnalyzer`; chain correctly: `analyzer(sentry(config))`

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for full pitfall catalog, recovery strategies, and the "looks done but isn't" verification checklist.

1. **Existing E2E specs reference v1.0 URL paths** — `auth.setup.ts` `waitForURL("/dashboard")` silently times out on v3.0 (which routes to `/payments/dashboard`); cascades into every new test as auth errors rather than clear failures. Fix: audit and update all `goto()`/`waitForURL()`/`toHaveURL()` calls in existing specs before writing new tests.

2. **CSV formula injection (OWASP CWE-1236)** — subscription names, notes, and AI-extracted merchant names containing `=`, `+`, `-`, `@` execute as formulas in Excel. The existing subscriptions export and planned transactions export are both vulnerable. Fix: add a `sanitizeCsvCell()` function to `objectsToCSV` that prefixes those leading characters with a tab before writing.

3. **Sidebar redesign accidentally drops feature-gate wrappers** — the 339-line `app-sidebar.tsx` mixes feature-gate logic (trial badge, `LockedNavItem` wrappers, admin section) inline with JSX. Visual changes can silently remove gates. Fix: refactor nav item arrays to typed data structures with an optional `featureRequired` field; render all items through a single `NavItem` component before any visual changes.

4. **Overlap detection false positives overwhelm users** — flagging any category with 2+ subscriptions produces noise (Netflix + Disney+ + Hulu = 3 alerts). Fix: require same category AND amount within 30% AND renewal dates within 7 days; add explicit unit tests for known false-positive scenarios before building any UI.

5. **Onboarding hints flash during loading or reappear after dismissal** — storing dismiss state in React `useState` loses it on remount; checking data presence before the query resolves shows hints to users who have data. Fix: gate on `!isLoading && data.length === 0 && !isDismissed`; store dismissal in `localStorage` with versioned key (`onboarding_hint_{section}_v1`).

## Implications for Roadmap

Based on combined research, the six features break into six natural phases ordered by dependency and risk. The architecture research explicitly recommends this sequence; the pitfalls research provides the "why" for each ordering decision.

### Phase 1: E2E Test Infrastructure Baseline

**Rationale:** The existing `auth.setup.ts` is broken for v3.0 URL paths — all subsequent E2E work fails if this isn't fixed first. Additionally, tests for sidebar navigation, subscriptions list, and CSV export should exist before those features are modified, creating a regression safety net for the remaining phases.
**Delivers:** Fixed auth setup; updated URL paths in all existing specs; verified baseline run (zero failures on clean auth state); Page Object Model directory structure established for new spec files
**Addresses:** Regression coverage baseline for v3.0 features before v3.1 modifications touch them
**Avoids:** Cascading auth failures from stale URL paths (Pitfall 1), stale storageState in parallel runs (Pitfall 4)
**Research flag:** Standard Playwright patterns — no additional research needed; all patterns documented in ARCHITECTURE.md

### Phase 2: CSV Export (Subscriptions Button + Transactions Endpoint)

**Rationale:** The subscriptions export API is fully implemented; it only needs a UI button. The transactions export follows an identical pattern with an existing utility. This is the highest value-to-effort ratio item in v3.1. The security fix (formula injection) must land in this phase before either endpoint is exposed in the UI.
**Delivers:** `ExportButton` on subscriptions page wired to existing API; new `/api/transactions/export/route.ts`; `ExportButton` on transactions page; `sanitizeCsvCell()` added to `objectsToCSV`; UTF-8 BOM prepended for Excel compatibility
**Addresses:** Data portability table stakes; Excel compatibility for international subscription names
**Avoids:** CSV formula injection vulnerability (Pitfall 2); missing UTF-8 BOM for non-ASCII characters; TanStack Query hook anti-pattern for file downloads (use plain anchor tag instead)
**Research flag:** No additional research needed — pattern is fully specified in ARCHITECTURE.md with working code examples

### Phase 3: Overlap Detection

**Rationale:** Pure client-side derived state from the already-cached subscription list. No API work, no schema changes. The algorithm design (amount proximity + renewal date proximity, not just category) must be locked before any UI is built to avoid shipping a noise-generating feature. Unit tests for known false-positive scenarios (Netflix + Disney+) come before the banner component.
**Delivers:** `detectOverlaps()` utility with unit tests (including false-positive scenarios); `OverlapWarning` component with amber styling; integration into subscriptions page via `useMemo`; localStorage-based dismissal keyed to subscription ID hash
**Addresses:** Core "save money" value proposition; category-based spend signal
**Avoids:** False positive flood (Pitfall 4); new API endpoint anti-pattern for data derivable from cache (architecture anti-pattern 1)
**Research flag:** No additional research needed; algorithm and component fully specified in ARCHITECTURE.md and PITFALLS.md

### Phase 4: Contextual Onboarding Hints

**Rationale:** Extends the existing `EmptyState` component with an optional `hint` prop — backward-compatible with all current call sites. Persistence strategy (localStorage) must be decided and implemented before any hint component is built. Apply to the 5 priority screens in order: subscriptions list, vault, transactions, dashboard, suggestions.
**Delivers:** Extended `EmptyState` with optional `hint` prop; `useOnboardingHint()` hook with localStorage persistence; hints applied to 3-5 screens with gate on `!isLoading && data.length === 0 && !isDismissed`; dismissal persists across page refresh
**Addresses:** New-user abandonment reduction; contextual education at moment of need
**Avoids:** Hints shown to returning users (Pitfall 5); hints reappearing after dismissal (Pitfall 5); loading state flash (Pitfall 5); product tour library bundle weight (anti-pattern 3)
**Research flag:** No additional research needed; component API and persistence strategy fully specified in STACK.md and ARCHITECTURE.md

### Phase 5: Sidebar Redesign

**Rationale:** Visual changes to a component that appears on every dashboard page carry the highest regression risk. Tests from Phase 1 create the safety net. Feature-gate logic must be extracted to typed data before JSX restructuring (Pitfall 3 prevention). CSS custom property approach (not utility class overrides) must be established before any visual iteration begins. The IA rename and visual warmth changes land together in one commit since they touch the same files.
**Delivers:** Plain English labels for all 11 nav items (specific mappings in FEATURES.md); warm CSS token overrides in `globals.css` for both `:root` and `.dark`; active item accent color; hover state polish; feature-gate logic preserved via typed `NavItem` data structure with optional `featureRequired` field; dark mode screenshot verified
**Addresses:** Navigation clarity (table stakes); perceived quality signal
**Avoids:** Feature-gate wrapper loss (Pitfall 3); dark mode CSS variable scope conflicts (Pitfall 5, architectural); Tailwind utility class direct override anti-pattern (architecture anti-pattern 4)
**Research flag:** No additional research needed; exact CSS variable values, label mappings, and anti-patterns documented in STACK.md and ARCHITECTURE.md

### Phase 6: Performance Audit + Targeted Optimization

**Rationale:** Last, because it requires a working production build to produce meaningful results. Running the audit before all v3.1 features are in place means the baseline is incomplete. Optimizations must follow audit findings — no speculative dynamic imports before seeing the bundle treemap. Known candidates (react-pdf, lucide-react `optimizePackageImports`, recharts dynamic import) are pre-identified but not pre-applied.
**Delivers:** `@next/bundle-analyzer` installed and configured; bundle treemap baseline committed; Lighthouse baseline run against production build (not dev server); `optimizePackageImports: ['lucide-react']` in `next.config.ts`; targeted `dynamic()` imports for react-pdf viewer and any other top offenders identified by analyzer
**Addresses:** JS bundle weight accumulated across 8 milestones; Core Web Vitals baseline; Vercel cold-start latency from heavy initial bundles
**Avoids:** Optimizing before analyzing (architecture anti-pattern 5); Lighthouse in dev mode giving meaningless scores (performance trap); Sentry wrapper chain order error; speculative dynamic imports on above-fold components
**Research flag:** No additional research needed; expected optimization candidates and measurement methodology fully specified in FEATURES.md and ARCHITECTURE.md

### Phase Ordering Rationale

- **Tests first** (Phase 1) because the broken auth setup makes all test work impossible until fixed, and tests for sidebar nav, subscriptions list, and CSV export should precede modifications to those areas
- **CSV export second** (Phase 2) because it is highest value-to-effort, the security fix must land before any other export-adjacent work proceeds, and it is completely independent of the remaining four features
- **Overlap detection third** (Phase 3) because the algorithm must be validated before the banner ships; it piggybacks on subscription data already in cache from the existing subscriptions page query
- **Onboarding hints fourth** (Phase 4) because the `EmptyState` extension is additive with no risk, and hints are more useful once subscriptions, overlap warnings, and export buttons are already in place as the things the hints guide users toward
- **Sidebar redesign fifth** (Phase 5) because it touches every dashboard page and E2E regression coverage from Phase 1 makes it safer; doing it earlier would mean visual regressions go undetected
- **Performance last** (Phase 6) because the audit requires a complete, stable production build; running it with incomplete features produces an inaccurate baseline

### Research Flags

Phases with standard patterns — no additional research needed for any phase in v3.1:
- **Phase 1 (E2E baseline):** Playwright docs fully cover auth state and `storageState` patterns; fix is mechanical URL path updates
- **Phase 2 (CSV export):** Endpoint pattern fully exists in codebase; papaparse API is straightforward; security fix is a 4-line helper function
- **Phase 3 (Overlap detection):** Algorithm specified with unit test requirements; `useMemo` + groupBy is standard React pattern
- **Phase 4 (Onboarding hints):** localStorage persistence pattern is standard; `EmptyState` extension is additive prop addition
- **Phase 5 (Sidebar redesign):** CSS custom property approach and exact variable names documented; 11 label mappings provided in FEATURES.md
- **Phase 6 (Performance audit):** Bundle analyzer setup and expected candidates pre-identified; `optimizePackageImports` is a single config flag

No phase in v3.1 requires `/gsd:research-phase` — all implementation decisions are resolved in the research files.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified via `npm show` on 2026-03-02; two additions are official well-documented packages; all existing packages confirmed via direct `package.json` inspection |
| Features | HIGH (codebase) / MEDIUM (UX patterns) | Existing infrastructure confirmed by direct codebase read; UX patterns (onboarding hint effectiveness, overlap detection signal quality) drawn from multiple industry sources with convergent conclusions |
| Architecture | HIGH | All findings from direct codebase inspection of v3.0 production code; all file paths, component interfaces, and utility signatures confirmed as written |
| Pitfalls | HIGH | Seven pitfalls confirmed against codebase realities; OWASP and Playwright sources are authoritative; false-positive overlap scenario is grounded in confirmed category taxonomy |

**Overall confidence:** HIGH

### Gaps to Address

- **Overlap algorithm tuning:** The algorithm (same category + amount within 30% + renewal within 7 days) is a reasonable starting point but the thresholds are empirical. Unit tests with known true-positive and false-positive scenarios should be the acceptance criterion, not the threshold values themselves. If tests reveal the thresholds produce too many false positives in practice, tighten before shipping.

- **Lighthouse targets:** Realistic targets are Performance 80+, Accessibility 95+, Best Practices 95+. The exact baseline cannot be known until the audit runs on the production build. If react-pdf or recharts pull Performance below 70, dynamic import for those components becomes mandatory rather than optional.

- **E2E test data isolation:** Existing tests appear to create data without cleanup. With 25-30 tests sharing a test user, cumulative data may cause later tests to see unexpected state. This is acceptable in Phase 1 if a cleanup step is added to test teardown, but should be validated during Phase 1 before all new specs are authored.

- **`next.config.ts` wrapper chain order:** Wrapping `withBundleAnalyzer(withSentryConfig(config))` must be verified to produce correct output — Sentry's wrapper may emit source maps that inflate the analyzer report. If this occurs, run the analyzer with Sentry source maps disabled for the baseline measurement.

## Sources

### Primary (HIGH confidence — official docs and direct codebase)
- Direct codebase inspection: `src/components/layout/app-sidebar.tsx`, `src/components/shared/empty-state.tsx`, `src/app/api/subscriptions/export/route.ts`, `src/lib/utils/csv.ts`, `tests/auth.setup.ts`, `tests/e2e/subscriptions.spec.ts`, `playwright.config.ts`, `next.config.ts`, `package.json`
- Next.js official bundle analyzer docs — https://nextjs.org/docs/app/guides/package-bundling
- PapaParse official docs — https://www.papaparse.com/ — `unparse()` API, RFC 4180 compliance, Node.js support
- Playwright authentication state guide — https://playwright.dev/docs/auth
- date-fns `areIntervalsOverlapping` — https://date-fns.org/v2.22.1/docs/areIntervalsOverlapping
- OWASP CSV Injection — https://owasp.org/www-community/attacks/CSV_Injection
- CWE-1236 Formula Injection — https://cwe.mitre.org/data/definitions/1236.html
- shadcn/ui Tailwind v4 theming — https://ui.shadcn.com/docs/tailwind-v4
- `npm show` version verification for all four new/updated packages (2026-03-02)

### Secondary (MEDIUM confidence — community sources, multiple agreement)
- Playwright best practices and POM pattern — playwright.dev/docs/best-practices and browserstack.com guide
- Empty state UX patterns — userpilot.com/blog/empty-state-saas/ and smashingmagazine.com
- Progressive onboarding (inline hints vs modal tours) — userpilot.com/blog/progressive-onboarding/
- Next.js performance optimization patterns — pagepro.co and debugbear.com (convergent with official Next.js checklist)
- SaaS sidebar design patterns — navbar.gallery/blog (LOW-MEDIUM; validated against observed linear.app, notion.so, vercel.com behavior)

### Tertiary (LOW confidence — requires validation during implementation)
- Overlap algorithm thresholds (30% amount tolerance, 7-day renewal window) — empirically derived; requires unit test validation with real subscription data patterns

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*

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

# Stack Research

**Domain:** UX & Quality milestone additions — sidebar redesign, onboarding hints, CSV export, overlap detection, E2E coverage, performance audit
**Researched:** 2026-03-02
**Confidence:** HIGH

---

## Context: What Exists vs. What Is New

This milestone (v3.1) adds to a mature ~47,800-line Next.js 16 + Supabase + Drizzle codebase. The full stack
(React 19, TanStack Query, shadcn/ui, Zod, React Hook Form, Recharts, Tailwind CSS v4, Lucide React, date-fns v4,
Playwright, nuqs) is already installed and validated through v3.0.

**Existing stack that requires NO additions for v3.1 features:**
- shadcn/ui Tooltip, Popover, Card, Badge, Separator — already in `src/components/ui/`; covers onboarding hint UI
- Tailwind CSS v4 `@theme` block — warm color tokens added directly to `globals.css`; no new styling library needed
- `date-fns` v4.1.0 — `areIntervalsOverlapping` built-in; covers overlap detection math entirely
- `@playwright/test` v1.57.0 already configured with auth setup, fixtures, 3 browsers — upgrade to extend coverage
- `lucide-react` ^0.562.0 — all icons for sidebar redesign come from here

**What the v3.1 features actually need beyond existing stack:**

| Feature | New Dependency? | Rationale |
|---------|----------------|-----------|
| Sidebar redesign (visual + IA) | None | Pure CSS token changes in `globals.css` + component refactor |
| Onboarding hints (contextual) | None | shadcn/ui Tooltip + Popover already installed; `localStorage` for dismiss state |
| CSV export | **papaparse@^5.5.3** | Server-side CSV serialization; native string joining is error-prone with escaping |
| Overlap detection | None | `date-fns` `areIntervalsOverlapping` already in codebase |
| E2E test expansion | Playwright upgrade to **^1.58.2** | Current is 1.57.0; 1.58.x adds stability fixes; POM pattern needs no new packages |
| Performance audit | **@next/bundle-analyzer@^16.1.6** | Bundle visualization; zero runtime impact (dev-only) |

---

## Recommended Stack (New Additions Only)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `papaparse` | ^5.5.3 | Server-side CSV serialization for subscription and transaction export API routes | PapaParse handles all CSV escaping edge cases (commas in names, quotes, special chars, UTF-8 BOM for Excel). Native string joining fails on data like subscription name "Netflix, HD" — the comma breaks the CSV column boundary. PapaParse's `unparse()` function handles this correctly. The `papaparse` package (not `react-papaparse`) runs in Node.js server routes with no browser requirement. Current version 5.5.3, last published 9 months ago, stable. |
| `@next/bundle-analyzer` | ^16.1.6 | Dev-only bundle visualization — identifies which dependencies are bloating client JS | The Next.js official bundle analyzer wraps webpack-bundle-analyzer and is version-locked to Next.js releases. Version 16.1.6 matches the installed `next@16.1.4`. Set `ANALYZE=true` env var to activate; zero runtime cost otherwise. Outputs three interactive HTML treemaps: client bundle, edge bundle, node bundle. Identifies candidates for `next/dynamic` lazy imports. |

### Supporting Libraries (Already Installed — v3.1 Usage Patterns)

| Library | Installed Version | v3.1 Usage | Notes |
|---------|------------------|-----------|-------|
| `date-fns` | ^4.1.0 | `areIntervalsOverlapping` for subscription overlap detection | Already imported in `src/app/(dashboard)/analytics/page.tsx` and `src/lib/utils/dates.ts`. No new import needed — extend `dates.ts` with overlap helpers. |
| shadcn/ui `Tooltip` | (installed) | Onboarding hints on hover — "What's this?" callouts near empty states | `src/components/ui/tooltip.tsx` exists. Use `Tooltip` + `TooltipContent` wrapping an info icon next to empty state headings. |
| shadcn/ui `Popover` | (installed) | Richer onboarding popovers with multi-line content and dismiss button | `src/components/ui/popover.tsx` exists. Use for first-visit contextual tips that need a close button and persist dismissal via `localStorage`. |
| `tailwindcss` v4 `@theme` | (installed) | Warm sidebar color tokens via CSS custom properties | Add `--sidebar-warm`, `--sidebar-warm-accent` OKLCH values in `globals.css` `:root` block. No package change — pure CSS token additions. |
| `@playwright/test` | current: ^1.57.0 → update to **^1.58.2** | Expand from 3 test files to ~25-30 covering all major user flows | Version 1.58.2 is the current npm release (verified 2026-03-02). Update is minor — all existing tests remain compatible. POM pattern (page objects in `tests/pages/`) requires no new packages. |
| `lucide-react` | ^0.562.0 | New sidebar icons for warm redesign (Home, Wallet, PiggyBank, etc.) | All icons sourced from here. No icon library addition needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@next/bundle-analyzer` | Visualize JS bundle composition; find over-weight dependencies | Run with `ANALYZE=true npm run build`. Outputs `/.next/analyze/client.html` — open in browser to inspect treemap. Add `"analyze": "ANALYZE=true next build"` to package.json scripts. |
| `@lhci/cli` (optional, CI-only) | Lighthouse CI for automated perf regression detection in CI | Version 0.15.1 (current). Install globally or as devDependency. Not required for local audit — Chrome DevTools Lighthouse panel + PageSpeed Insights cover the manual audit. Only add if setting up GitHub Actions perf gates. |

---

## Installation

```bash
# New runtime dependency (CSV export)
npm install papaparse@^5.5.3
npm install -D @types/papaparse@^5.5.2

# New dev dependency (bundle analysis)
npm install -D @next/bundle-analyzer@^16.1.6

# Update Playwright to current version
npm install -D @playwright/test@^1.58.2

# Optional: Lighthouse CI (only if adding CI perf gates)
npm install -D @lhci/cli@^0.15.1
```

Add to `package.json` scripts:
```json
{
  "analyze": "ANALYZE=true next build"
}
```

---

## Feature-by-Feature Stack Decisions

### 1. Sidebar Redesign (Warm/Friendly Visual + IA Reorganization)

**Approach:** CSS token changes in `globals.css` + component-level Tailwind class updates. Zero new packages.

The current sidebar uses `--sidebar: oklch(0.985 0 0)` (near-white, neutral). A warm redesign overrides
the sidebar-specific CSS custom properties in `globals.css`:

```css
/* globals.css — override sidebar tokens for warm palette */
:root {
  /* Warm amber sidebar — replace current near-white */
  --sidebar: oklch(0.97 0.015 60);           /* warm off-white with amber tint */
  --sidebar-foreground: oklch(0.2 0.02 60);  /* warm dark text */
  --sidebar-accent: oklch(0.92 0.03 60);     /* warm hover background */
  --sidebar-accent-foreground: oklch(0.15 0.02 60);
  --sidebar-primary: oklch(0.55 0.14 55);    /* amber active item indicator */
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-border: oklch(0.88 0.02 60);     /* warm divider */
}
.dark {
  --sidebar: oklch(0.18 0.02 60);            /* warm dark sidebar */
  --sidebar-foreground: oklch(0.88 0.01 60);
  --sidebar-accent: oklch(0.25 0.03 60);
  --sidebar-primary: oklch(0.65 0.14 55);
}
```

The shadcn/ui sidebar primitives already consume these tokens via `bg-sidebar`, `text-sidebar-foreground`,
`bg-sidebar-accent` etc. Only token values change — no className changes in sidebar.tsx needed for color.
IA reorganization (renaming nav items to friendlier labels, icon swaps) is pure JSX edits in `app-sidebar.tsx`.

**Why no third-party theming library:** The codebase already uses Tailwind v4 `@theme` + CSS custom properties
as the design token system. Adding a library like `styled-components` or `@emotion/react` for one sidebar
redesign would contradict the established pattern and add significant bundle weight.

---

### 2. Contextual Onboarding Hints

**Approach:** Compose existing shadcn/ui Tooltip + Popover + a thin `useOnboardingHints` hook using
`localStorage`. No tour library needed.

**Why no tour library (react-joyride, Onborda, Intro.js):**
The v3.1 requirement is "contextual onboarding hints on empty states" — not a full guided tour with step
sequencing. Onborda and react-joyride are designed for step-by-step product tours that highlight elements
in sequence. For static hints attached to empty states (e.g., "Upload your first bank statement here"),
composing existing primitives is simpler, smaller, and more maintainable:

```typescript
// src/lib/hooks/use-onboarding-hint.ts
export function useOnboardingHint(key: string) {
  const [dismissed, setDismissed] = React.useState(() => {
    if (typeof window === "undefined") return true; // SSR safe
    return localStorage.getItem(`hint:${key}`) === "dismissed";
  });

  const dismiss = React.useCallback(() => {
    localStorage.setItem(`hint:${key}`, "dismissed");
    setDismissed(true);
  }, [key]);

  return { dismissed, dismiss };
}
```

Then in empty-state components:
```tsx
// Extend existing EmptyState with optional onboarding hint
<EmptyState
  icon={Upload}
  title="No statements yet"
  description="Import a bank PDF to get started"
  hint={{
    key: "vault-first-upload",
    content: "Tip: Import PDFs from any bank. We'll extract all transactions automatically."
  }}
/>
```

A `HintBadge` component wraps `Tooltip` for hover hints and `Popover` for richer dismissable hints.
Both primitives are already installed and tested in the codebase.

**If a full tour is needed in a future milestone:** Add `onborda` (shadcn-compatible, Framer Motion-based,
Next.js-first) — not react-joyride which requires Tailwind class override conflicts.

---

### 3. CSV Export (Subscriptions + Transactions)

**Approach:** Server-side API routes + `papaparse` for serialization. No client-side CSV library.

Two new API routes:
- `GET /api/export/subscriptions` → `subscriptions.csv`
- `GET /api/export/transactions` → `transactions.csv`

Both return `Response` with `Content-Type: text/csv` and `Content-Disposition: attachment; filename="..."`.
The client triggers download via `<a href="/api/export/subscriptions" download>` or `window.location.href`.

**Why papaparse over native string join:**
CSV escaping is deceptively tricky. Subscription names like `Netflix, Premium` (comma), `Hulu "Live"` (quotes),
or international descriptions with diacritics all break naive `array.join(",")` approaches. PapaParse's
`unparse()` handles all RFC 4180 edge cases:

```typescript
// src/app/api/export/subscriptions/route.ts
import Papa from "papaparse";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const rows = await db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, session.user.id),
    columns: {
      name: true, amount: true, currency: true, billingCycle: true,
      nextRenewalDate: true, status: true, notes: true,
    },
    with: { category: { columns: { name: true } } },
  });

  const csv = Papa.unparse(
    rows.map((r) => ({
      Name: r.name,
      Amount: r.amount,
      Currency: r.currency,
      "Billing Cycle": r.billingCycle,
      "Next Renewal": r.nextRenewalDate,
      Status: r.status,
      Category: r.category?.name ?? "",
      Notes: r.notes ?? "",
    })),
    { header: true, newline: "\r\n" }  // RFC 4180 line endings for Excel
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="subscriptions.csv"',
    },
  });
}
```

**Why not `react-papaparse`:** That package is browser-only and adds unnecessary React wrappers. The plain
`papaparse` package works in both Node.js (API routes) and browser without extra setup.

**Why server-side over client-side generation:** The subscriptions and transactions data lives on the server
(Supabase). Fetching it client-side to re-serialize it into CSV adds a round trip. Server-side generation
also enforces auth at the API boundary and keeps data access patterns consistent.

---

### 4. Subscription Overlap Detection

**Approach:** Pure computation using `date-fns` `areIntervalsOverlapping` — already installed and imported
in the codebase. No new package needed.

Overlap means: two active subscriptions in the same category whose billing windows overlap within a rolling
30-day window. The detection runs as a background Drizzle query + interval computation:

```typescript
// src/lib/utils/overlap-detection.ts
import { areIntervalsOverlapping, addDays } from "date-fns";

export interface OverlapCandidate {
  subscriptionA: { id: string; name: string; nextRenewalDate: Date };
  subscriptionB: { id: string; name: string; nextRenewalDate: Date };
  categoryName: string;
}

export function detectOverlaps(
  subscriptions: Array<{
    id: string;
    name: string;
    nextRenewalDate: Date;
    billingCycle: "monthly" | "annual" | "weekly";
    categoryId: string;
    categoryName: string;
  }>
): OverlapCandidate[] {
  const overlaps: OverlapCandidate[] = [];
  const activeByCategory = Map.groupBy(subscriptions, (s) => s.categoryId);

  for (const [, group] of activeByCategory) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        const windowDays = 30;
        const intervalA = { start: a.nextRenewalDate, end: addDays(a.nextRenewalDate, windowDays) };
        const intervalB = { start: b.nextRenewalDate, end: addDays(b.nextRenewalDate, windowDays) };
        if (areIntervalsOverlapping(intervalA, intervalB)) {
          overlaps.push({ subscriptionA: a, subscriptionB: b, categoryName: a.categoryName });
        }
      }
    }
  }
  return overlaps;
}
```

The UI surface is a dismissible alert card on the subscriptions list page — uses existing shadcn/ui `Alert`
(if added) or `Card` + `Badge` (already installed). No new UI library component needed.

**Why not a separate overlap library:** `date-fns` `areIntervalsOverlapping` is purpose-built for this
calculation. The algorithm above is O(n²) within each category, which is acceptable since users typically
have 2-10 subscriptions per category. The library overhead of adding a dedicated scheduling/overlap package
is not justified.

---

### 5. E2E Test Coverage Expansion (~25-30 Playwright Tests)

**Approach:** Upgrade Playwright to v1.58.2, adopt Page Object Model (POM) pattern for new tests.
No new packages beyond the version update.

**Current state:** 3 spec files (`subscriptions.spec.ts`, `pdf-import.spec.ts`, `email-reminders.spec.ts`),
auth setup via `tests/auth.setup.ts`, fixture file at `tests/fixtures/`.

**Expansion approach:**

```
tests/
├── auth.setup.ts          (existing — unchanged)
├── fixtures/
│   └── index.ts           (existing — extend with page objects)
├── pages/                 (NEW — Page Object Model classes)
│   ├── dashboard.page.ts
│   ├── subscriptions.page.ts
│   ├── vault.page.ts
│   ├── transactions.page.ts
│   └── settings.page.ts
└── e2e/
    ├── subscriptions.spec.ts   (existing)
    ├── pdf-import.spec.ts      (existing)
    ├── email-reminders.spec.ts (existing)
    ├── dashboard.spec.ts       (NEW)
    ├── analytics.spec.ts       (NEW)
    ├── vault.spec.ts           (NEW)
    ├── accounts.spec.ts        (NEW)
    ├── transactions.spec.ts    (NEW)
    ├── export.spec.ts          (NEW)
    ├── overlap.spec.ts         (NEW)
    ├── billing.spec.ts         (NEW)
    └── settings.spec.ts        (NEW)
```

Page Object Model pattern (no new package — built into Playwright fixtures):

```typescript
// tests/pages/subscriptions.page.ts
import { type Page } from "@playwright/test";

export class SubscriptionsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/payments/subscriptions");
  }

  async createSubscription(data: { name: string; amount: string }) {
    await this.page.goto("/payments/subscriptions/new");
    await this.page.getByLabel("Name").fill(data.name);
    await this.page.getByLabel("Amount").fill(data.amount);
    await this.page.getByRole("button", { name: "Create Subscription" }).click();
  }
}

// tests/fixtures/index.ts — extend with page objects
import { test as base } from "@playwright/test";
import { SubscriptionsPage } from "../pages/subscriptions.page";

export const test = base.extend<{
  subscriptionsPage: SubscriptionsPage;
}>({
  subscriptionsPage: async ({ page }, use) => {
    await use(new SubscriptionsPage(page));
  },
});
```

**Why upgrade to v1.58.2:** Current installed is v1.57.0. Version 1.58.2 is the latest stable (verified
2026-03-02 via `npm show @playwright/test version`). The upgrade is minor and backward-compatible. Staying
on 1.57.0 is also fine — this is a quality-of-life update, not a blocker.

**Why not `playwright-test-coverage`:** Code coverage for Playwright requires Istanbul instrumentation of
the Next.js build, which significantly slows test runs and adds setup complexity. Coverage metrics are not
required by the v3.1 scope — the goal is coverage of user flows, not line coverage percentages.

---

### 6. Performance Audit + Optimization

**Approach:** `@next/bundle-analyzer` for bundle visualization. Lighthouse (browser-native or PageSpeed
Insights) for runtime perf. `next/dynamic` for identified heavy imports. No runtime library additions.

**Audit workflow:**

```bash
# Step 1: Bundle analysis
ANALYZE=true npm run build
# Opens /.next/analyze/client.html — treemap of all client JS

# Step 2: Lighthouse (browser)
# Open Chrome DevTools → Lighthouse tab → run on deployed or local build

# Step 3: Targeted optimization based on findings
```

**Expected optimization candidates (based on current dependencies):**

| Suspect | Size Estimate | Optimization |
|---------|--------------|--------------|
| `recharts` | ~250 kB | Already used on multiple pages; dynamic import on analytics pages if not already code-split by route |
| `react-pdf` | ~400 kB | Already has two-file worker split; verify `next/dynamic({ ssr: false })` is applied |
| `openai` SDK | ~100 kB | Server-only import; verify it doesn't leak to client bundle |
| PDF import flow | varies | `next/dynamic` for `BatchImportWizard` component — only needed on `/vault/load` |

**`next/dynamic` pattern (no new package — built into Next.js):**

```typescript
// For heavy components only loaded on specific routes
import dynamic from "next/dynamic";

const BatchImportWizard = dynamic(
  () => import("@/components/vault/batch-import-wizard"),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);
```

**Why `@next/bundle-analyzer` over `webpack-bundle-analyzer` directly:** The `@next/bundle-analyzer`
wrapper handles Next.js's multi-bundle output (client + edge + node) and is version-matched to the installed
Next.js version. It generates all three treemaps with one command vs manual webpack configuration.

**Why not `@lhci/cli` for this milestone:** Lighthouse CI is valuable for preventing performance regressions
in CI pipelines. However, setting up CI perf gates is infrastructure work outside the v3.1 scope. The
manual audit (bundle analyzer + browser Lighthouse) provides the same diagnostic information for a one-time
audit. Recommend adding `@lhci/cli` in a future DevOps milestone.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `papaparse` (Node.js) | Native `array.map().join(",")` | Breaks on subscription names with commas, quotes, or special characters — RFC 4180 compliance requires quoting logic |
| `papaparse` (Node.js) | `react-papaparse` | Browser-only wrapper; API routes run in Node.js; unnecessary React dependency for server code |
| `papaparse` (Node.js) | `fast-csv` | Streaming-focused; adds complexity for simple batch export of <10k rows; papaparse simpler API |
| CSS token changes for sidebar | External theming library | Tailwind v4 `@theme` CSS custom properties IS the design token system; no new library needed |
| shadcn Tooltip + Popover for hints | `react-joyride` | Tour library overkill for static empty-state hints; adds ~50 kB for step sequencing we don't need |
| shadcn Tooltip + Popover for hints | `onborda` | Same overkill concern; onborda is for guided product tours, not contextual empty-state tips |
| `date-fns` `areIntervalsOverlapping` | Custom interval logic | `date-fns` v4 already installed and used in codebase; reimplementing overlap detection adds risk |
| POM pattern via Playwright fixtures | `playwright-bdd` (BDD cucumber) | BDD syntax adds overhead; team is TypeScript-native; Playwright fixtures + TypeScript POM is cleaner |
| `@next/bundle-analyzer` | `source-map-explorer` | `@next/bundle-analyzer` is Next.js-aware (handles multi-bundle output); `source-map-explorer` requires manual source map setup |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-joyride` or `onborda` | Product tour libraries for step-sequenced guided tours — scope is contextual hints on empty states only | shadcn/ui `Tooltip` + `Popover` + `useOnboardingHint` hook |
| `react-papaparse` | Browser-only wrapper around papaparse; CSV export is server-side | Plain `papaparse` package runs in both Node.js and browser |
| `styled-components` or CSS-in-JS | Adds second styling system conflicting with established Tailwind v4 token approach | Tailwind CSS custom properties in `globals.css` |
| `lighthouse` npm package | Heavy CLI tool (13MB+); better to use browser DevTools panel for manual audit | `@lhci/cli` only if CI gates are needed; browser Lighthouse for one-time audit |
| `@playwright/test` v2.x | Does not exist yet as of 2026-03-02; verify before upgrading | Stay on ^1.58.2 |
| `playwright-test-coverage` | Requires Istanbul instrumentation; slows builds; line coverage not required by v3.1 scope | Focus on user-flow coverage, not line coverage |
| Any chart library additions | Recharts ^3.7.0 already installed | Reuse existing `BarChart`, `AreaChart` components |
| `date-fns-tz` | Timezone handling not required for overlap detection (comparing renewal dates, not UTC times) | Plain `date-fns` v4 |

---

## Stack Patterns by Variant

**If CSV export needs streaming (large transaction history > 50k rows):**
- Use `papaparse` streaming mode: `Papa.unparse(stream, { chunk: ... })`
- Or switch to `fast-csv` with Node.js `Readable` streams and `StreamingResponse`
- Not needed for typical user data volumes (< 5k transactions)

**If onboarding hints need user-level persistence (not just device-level):**
- Store dismissed hint keys in `users.preferences` JSONB column (already in schema)
- Change `localStorage` to a PATCH to `/api/user/preferences` — same pattern as existing theme preference
- Default to `localStorage` first; add server persistence only if reset-on-device is reported as an issue

**If bundle analysis reveals `recharts` is the top offender:**
- Apply `next/dynamic({ ssr: false })` to analytics and forecast pages
- Recharts renders client-side anyway (SVG requires DOM); disabling SSR has no SEO impact on dashboard pages

**If performance audit reveals LCP issues with the sidebar:**
- Move `AppSidebar` to a Server Component layout (partially possible — the user menu needs `useSession`)
- Split into `SidebarShell` (RSC) + `UserMenu` (client component) — reduces client JS for sidebar

**If Playwright tests need database seeding for consistent test data:**
- Use existing `npm run db:seed` script extended with test fixtures
- Or add a `beforeAll` in test fixtures that calls API routes to create predictable data
- Avoid direct DB access from tests (bypasses auth logic being tested)

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `papaparse` | ^5.5.3 | Node.js 18+, Next.js 16 API routes | Pure JS, no native dependencies; works identically in Node.js and browser |
| `@types/papaparse` | ^5.5.2 | TypeScript ^5 | Community types; verified version on npm 2026-03-02 |
| `@next/bundle-analyzer` | ^16.1.6 | `next@16.1.4` | Version-locked to Next.js; 16.1.6 matches 16.1.4 minor (safe range) |
| `@playwright/test` | ^1.58.2 | Next.js 16, Node.js 18+ | All existing 3 spec files and auth setup are compatible with 1.58.x |
| `date-fns` | ^4.1.0 (existing) | React 19, TypeScript 5 | `areIntervalsOverlapping` confirmed in v4 API; already used in analytics page |

---

## Sources

- `npm show papaparse version` → 5.5.3, verified 2026-03-02 (HIGH confidence)
- `npm show @types/papaparse version` → 5.5.2, verified 2026-03-02 (HIGH confidence)
- `npm show @next/bundle-analyzer version` → 16.1.6, verified 2026-03-02 (HIGH confidence)
- `npm show @playwright/test version` → 1.58.2, verified 2026-03-02 (HIGH confidence)
- `npm show date-fns version` → 4.1.0, verified 2026-03-02 (HIGH confidence)
- Next.js official bundle analyzer docs — https://nextjs.org/docs/app/guides/package-bundling — ANALYZE env var pattern (HIGH confidence — official docs)
- PapaParse official site — https://www.papaparse.com/ — `unparse()` API, RFC 4180 compliance, Node.js support (HIGH confidence — official docs)
- date-fns `areIntervalsOverlapping` — https://date-fns.org/v2.22.1/docs/areIntervalsOverlapping — overlap detection API (HIGH confidence — official docs + codebase usage confirmed)
- Playwright fixtures/POM docs — https://playwright.dev/docs/test-fixtures — fixture extension pattern (HIGH confidence — official docs)
- Playwright BrowserStack best practices — https://www.browserstack.com/guide/playwright-best-practices — POM pattern guidance (MEDIUM confidence — verified against official docs)
- Codebase: `src/components/ui/tooltip.tsx`, `src/components/ui/popover.tsx` — both shadcn components confirmed installed (HIGH confidence)
- Codebase: `src/app/globals.css` — `--sidebar-*` CSS custom properties confirmed; OKLCH color system in use (HIGH confidence)
- Codebase: `src/lib/utils/dates.ts` — `isWithinInterval` from date-fns already in use; `areIntervalsOverlapping` is same family of functions (HIGH confidence)
- Codebase: `package.json` — all installed versions confirmed exact (HIGH confidence)

---

*Stack research for: v3.1 UX & Quality — subscription manager*
*Researched: 2026-03-02*

# Feature Research

**Domain:** Subscription Manager v3.1 — UX & Quality (sidebar redesign, onboarding hints, CSV export, overlap detection, E2E testing, performance audit)
**Researched:** 2026-03-02
**Confidence:** HIGH (codebase-verified for existing infra) / MEDIUM (UX patterns from multi-source research)

---

## Context: What Is Already Built

This milestone adds to a mature v3.0 app (~47,800 lines TypeScript). The six feature areas target UX polish,
data portability, smart flagging, test coverage, and performance. All six are either net-new or significant
extensions of thin stubs. Existing infrastructure that can be reused is noted inline.

| Already exists | Relevant to |
|----------------|-------------|
| `app-sidebar.tsx` — 3-section sidebar, shadcn/ui `Sidebar` primitives, 11 nav items | Sidebar redesign |
| `/onboarding/page.tsx` — 4-step full-page wizard, `onboardingCompleted` flag on `users` | Onboarding hints |
| `/api/subscriptions/export/route.ts` — full CSV via `objectsToCSV` + `createCSVResponse` | CSV export (subscriptions) |
| `src/lib/utils/csv.ts` — `objectsToCSV` + `createCSVResponse` helpers | CSV export (transactions) |
| `/api/user/export/route.ts` — full JSON data portability dump | CSV export reference |
| `/api/subscriptions/duplicates/route.ts` — pairwise similarity scan (score ≥ 70) | Overlap detection (different signal) |
| `tests/e2e/subscriptions.spec.ts` — 6 CRUD tests with `auth.setup.ts` auth state | E2E expansion |
| `playwright.config.ts` — multi-browser, parallel, auth setup pattern in place | E2E expansion |
| `next.config.ts` — Sentry configured, `serverExternalPackages` set, no bundle analyzer | Performance audit |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these makes v3.1 feel unpolished or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sidebar labels in plain English | Navigation labels like "subs Dash", "doc Vault", "subs Selector" are internal shorthand; users expect "Dashboard", "Upload", "Transactions" — cryptic labels create hesitation at every click | LOW | Pure text change in `app-sidebar.tsx`; 11 strings to update; zero routing impact |
| Sidebar visual accent on active item | Every SaaS sidebar (Linear, Notion, Vercel) uses color or weight to show which page is current; the current sidebar uses the shadcn default grey which fails to communicate location | LOW | Override `--sidebar-accent` / `--sidebar-accent-foreground` CSS tokens in `globals.css`; no component code changes |
| Friendly hover and active states | Users expect micro-feedback on hover; flat clickable items without feedback feel broken | LOW | Same CSS token approach; `--sidebar-primary` token controls hover intent |
| Empty-state guidance on zero-data screens | Every mainstream SaaS (Airtable, Linear, Notion) shows contextual "get started" prompts when a list is empty; a bare empty table with no direction is a dead end that triggers abandonment | MEDIUM | Identify 3-5 screens with generic empty states (subscriptions list, vault, transactions); replace with `<EmptyState>` components containing icon + description + primary CTA |
| Export subscriptions to CSV | Users who pay for a financial tool expect to own their data; CSV is the universal format for spreadsheet portability | LOW | API route already exists at `/api/subscriptions/export`; only missing a trigger button in the subscriptions list toolbar or Settings page |
| Export transactions to CSV | Same data-ownership expectation for statement line items the user uploaded | MEDIUM | No transactions export API route exists; needs new `/api/transactions/export/route.ts`; the keyset-paginated query in `transactions/route.ts` needs a full-fetch variant for export; reuse `objectsToCSV` + `createCSVResponse` |
| Overlap/redundancy flag for subscriptions | Users paying for multiple services in the same spend category (3 streaming, 2 cloud storage) want a nudge to review; this is the core "save money" value prop of subscription trackers | MEDIUM | Distinct from duplicate detection; overlap = same category, different service, both active; new `/api/subscriptions/overlaps` endpoint + dismissable banner on subscriptions page |

### Differentiators (Competitive Advantage)

Features that set the product apart from generic subscription trackers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contextual inline onboarding hints | Most trackers show a one-time modal tour that users skip; inline hints that appear on first visit to each section and dismiss individually feel less intrusive, are more likely to be read, and teach users at the moment of need | MEDIUM | localStorage-based dismiss state (no migration needed); shadcn `Alert` component with icon + message + X button; 3-5 screens targeted |
| Overlap detection with combined cost | Showing "3 streaming services totalling $47/mo — review?" is more actionable than a generic warning; connects directly to the app's value proposition of revealing hidden spending | MEDIUM | Category-group query: count active subscriptions per category, sum `normalizedMonthlyAmount`, surface only categories with count ≥ 2; dismissable banner persists dismiss via localStorage keyed to subscription ID hash |
| E2E test suite covering all major flows | A billing and financial data app needs regression protection; 25-30 Playwright tests covering auth, subscriptions, vault, analytics, billing, reminders, export, and accounts gives production confidence that regressions in critical flows get caught before users do | HIGH | 25-30 tests is ambitious but achievable across ~10 spec files; each spec is independent, creates its own data; existing auth setup (`auth.setup.ts`) reused throughout |
| Performance audit with actionable report | Next.js apps accumulate client component weight without noticing; react-pdf + recharts + shadcn + lucide-react add measurable JS weight; an audit with concrete findings (bundle treemap + Lighthouse baseline) produces a prioritized fix list | MEDIUM | `@next/bundle-analyzer` gives treemap; Lighthouse CLI gives Core Web Vitals baseline; primary wins expected: dynamic import for react-pdf, `optimizePackageImports` for lucide-react, potential dynamic import for recharts |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems or add complexity without proportionate value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full product tour with overlay | "Show me everything" is a common new-user ask | Tour libraries (Shepherd.js, Intro.js) add 30-60KB JS, go stale when UI changes, and research shows <20% completion rate; forces users through content they don't need yet | Contextual inline hints on empty states: appear when the user actually encounters a blank screen, use existing shadcn Alert, zero new dependency |
| Auto-dismiss overlap warnings after N days | "Don't nag me" is a valid user concern | Suppressing money-saving warnings on a timer undermines the core value prop; users forget they dismissed it after subscriptions change | Allow manual dismiss per warning; re-surface automatically when the set of flagged subscriptions changes (localStorage key includes a hash of IDs) |
| Overlap detection based on provider name matching | "Netflix and Netflix Premium are the same" | Provider name matching is fragile (names change, abbreviate, vary by bank statement format) and requires a taxonomy that doesn't exist | Category-based grouping is durable: same category slug + active status = potential overlap; user assigned the category, so they understand why it flagged |
| Bulk CSV import to add subscriptions | Users want to populate from spreadsheet | Breaks the PDF-centric mental model; creates data quality problems (wrong frequencies, missing dates, normalization edge cases); high support burden for a low-frequency task | Keep PDF import as primary path; manual add for one-offs; this is explicitly out of scope in PROJECT.md |
| PDF export of subscription report | "I want a printable report" | Server-side PDF generation requires puppeteer or react-pdf/renderer; adds meaningful complexity and cold-start latency for a low-frequency use case | CSV is sufficient for portability; browsers can print HTML pages natively |
| E2E tests for every API endpoint | "100% test coverage" instinct | API-level testing belongs in unit/integration tests (Vitest already in place); Playwright E2E at API granularity produces slow, fragile tests that don't validate the actual user experience | Playwright covers user-visible flows; Vitest covers business logic; keep concerns separate |
| Lighthouse score target of 100 | Aspirational metric | react-pdf, recharts, and shadcn make 100 unrealistic without removing features; premature optimization risk | Target 85+ Performance, 95+ Accessibility, 95+ Best Practices; track regressions per PR, not absolute score |
| Persistent sidebar collapse state synced to server | User preference feature | Requires DB column or API call on every toggle; localStorage accomplishes the same thing with zero overhead for a single-user app | Use shadcn sidebar's built-in `useSidebar()` hook which already persists collapse state via cookies |

---

## Feature Dependencies

```
Sidebar redesign (IA rename)
    └──no deps──> standalone text change in app-sidebar.tsx

Sidebar redesign (visual warmth)
    └──no deps──> CSS variable overrides in globals.css
    └──enhances──> IA rename (both in same file, do together)

Onboarding hints (contextual inline)
    └──decision required──> localStorage vs DB dismiss state
                       └──localStorage (recommended)──> no schema change, zero migration
                       └──DB (alternative)──> new dismissedHints jsonb column on users + migration
    └──requires──> identifying which screens have inadequate empty states

CSV export: subscriptions (button)
    └──API already exists──> /api/subscriptions/export (GET)
    └──needs only──> ExportButton UI component wired to that route

CSV export: transactions
    └──requires──> new /api/transactions/export/route.ts
    └──leverages patterns from──> /api/transactions/route.ts (query structure)
    └──reuses──> src/lib/utils/csv.ts (objectsToCSV, createCSVResponse)
    └──needs──> ExportButton in transactions page header

Overlap detection
    └──distinct from──> /api/subscriptions/duplicates (similarity score ≥70)
    └──requires──> new /api/subscriptions/overlaps endpoint (category-group query)
    └──needs──> dismissable banner UI on /payments/subscriptions page
    └──dismiss state stored in──> localStorage (consistent with hints approach)

E2E tests (25-30)
    └──requires stable selectors──> data-testid attributes on interactive elements where ARIA roles ambiguous
    └──reuses──> tests/auth.setup.ts (existing auth state setup)
    └──each spec is independent──> no cross-spec data dependencies
    └──PDF import spec stays skipped──> AI cost in CI is prohibitive

Performance audit
    └──requires install──> @next/bundle-analyzer (dev dependency)
    └──findings drive──> dynamic import splits, optimizePackageImports config
    └──no blocking dep on other v3.1 features──> can run in parallel with any phase
    └──audit first──> then implement findings as a follow-on sub-phase
```

### Dependency Notes

- **Sidebar redesign is two independent changes that happen to touch the same file.** IA rename is pure text; visual warmth is pure CSS. Both can land in one commit. Neither depends on any other v3.1 feature.
- **Onboarding hints should use localStorage.** Cross-device sync for a hint banner is low value. DB-persisted dismiss state adds a migration and an API call per dismiss action. localStorage keyed to `gsd:hints:v1:{sectionSlug}` is adequate.
- **Transactions CSV export is the only net-new API route in v3.1.** The subscriptions export API already exists. Transactions export needs a full-fetch variant of the keyset-paginated query — safe for up to ~10k rows (~5MB in memory); no streaming needed for v3.1.
- **Overlap detection must not modify the existing duplicate detection.** The duplicate scan (`/api/subscriptions/duplicates`) uses similarity scoring and is exposed via the Duplicates page. Overlap detection is a separate, simpler query (group by categoryId, count ≥ 2) that surfaces in the subscriptions list. Keep them separate.
- **E2E test authoring is the highest-effort item in v3.1.** 25-30 tests is ~3-5x the current coverage. Recommend writing tests feature-by-feature as each feature ships, not as a standalone "write all tests" phase at the end.
- **Performance audit produces two artifacts:** (1) bundle treemap image from `@next/bundle-analyzer`, (2) Lighthouse report JSON. The fix list is derived from these, not predetermined.

---

## MVP Definition for v3.1

### Launch With (v3.1 complete)

Minimum set for the milestone to be considered shipped. Every item is required.

- [ ] Sidebar IA rename — plain English labels for all 11 nav items
- [ ] Sidebar visual warmth — accent color on active item, hover state polish, app logo color
- [ ] Onboarding hints on 3+ screens — subscriptions empty state, vault empty state, transactions empty state (inline dismissable `Alert`)
- [ ] Export subscriptions CSV — `ExportButton` wired to existing `/api/subscriptions/export`
- [ ] Export transactions CSV — new `/api/transactions/export` route + `ExportButton` in transactions page
- [ ] Overlap detection — `/api/subscriptions/overlaps` endpoint + dismissable banner on subscriptions page
- [ ] E2E coverage — 25-30 tests covering all major flows (see spec file breakdown below)
- [ ] Performance audit report — bundle treemap + Lighthouse baseline + prioritized findings list
- [ ] Performance fixes implemented — at minimum: `optimizePackageImports` for lucide-react, dynamic import for react-pdf viewer

### Add After Validation (v3.2+)

Add once v3.1 is stable and in use.

- [ ] Overlap detection with combined cost breakdown per category ("$47/mo across 3 services")
- [ ] E2E tests in CI via GitHub Actions workflow
- [ ] Lighthouse regression gating on PR (requires stable baseline)
- [ ] Onboarding hint for billing/upgrade path (contextual prompt when user hits a feature gate)

### Future Consideration (v4+)

- [ ] Full onboarding checklist with progress tracking — requires more infra, higher activation potential
- [ ] WCAG 2.1 AA accessibility audit pass
- [ ] Cross-device hint dismissal via DB — only if analytics show meaningful cross-device usage

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Sidebar IA rename (labels) | HIGH — navigation clarity is table stakes | LOW — text-only change | P1 |
| Sidebar visual warmth | MEDIUM — perceived quality signal | LOW — CSS variables | P1 |
| Onboarding hints (3 screens) | HIGH — reduces new-user abandonment | MEDIUM — per-screen components + dismiss logic | P1 |
| Export subscriptions CSV (button) | HIGH — data ownership expectation | LOW — API exists, wire UI only | P1 |
| Export transactions CSV | MEDIUM — power users; most care about subscriptions first | MEDIUM — new API route | P1 |
| Overlap detection banner | HIGH — core save-money value prop | MEDIUM — new API + UI component | P1 |
| E2E test suite (25-30 tests) | HIGH — billing app regression protection | HIGH — substantial authoring | P1 |
| Performance audit (report) | MEDIUM — technical health | LOW — install tool, run reports | P1 |
| Dynamic import for react-pdf | MEDIUM — JS bundle reduction | LOW — 3-line code change | P1 |
| `optimizePackageImports` for lucide-react | LOW-MEDIUM — icon tree-shaking | LOW — 1 line in next.config.ts | P1 |
| Overlap cost breakdown per category | MEDIUM — actionability improvement | LOW — add sum to existing query | P2 |
| Sidebar collapse persistence | LOW — already works via shadcn cookie | N/A — already implemented | P3 |
| Hint re-surface after N days | LOW — edge case | LOW | P3 |

---

## Competitor Feature Analysis

| Feature | Rocket Money | Copilot Money | Our Approach |
|---------|-------------|---------------|--------------|
| Sidebar / navigation labels | Mobile tab bar; no sidebar | Clean icon + label sidebar | Rename to match Copilot-level clarity; context-appropriate labels not jargon |
| Onboarding | Multi-step forced modal tour | Contextual in-app hints + progress bar | Inline contextual hints on empty states — no tour library, no forced progression |
| CSV export | Subscriptions only (paid tier) | Transactions + subscriptions (paid) | Both in v3.1; no tier-gate added |
| Overlap detection | "Recurring" category view; no explicit overlap alert | No explicit overlap flag | Category-group banner: unique because we own the category taxonomy |
| E2E / test coverage | Not externally visible | Not externally visible | 25-30 Playwright tests as internal quality gate |
| Performance | React Native app (no web bundle concern) | Native iOS/Android | Next.js App Router + Server Components gives structural advantage; audit to confirm and address gaps |

---

## Phase-Specific Notes for Roadmap

### Sidebar Redesign

**Two sub-tasks, one atomic commit.** The IA rename (11 label strings) and visual warmth (CSS token overrides) both touch `app-sidebar.tsx` and `globals.css`. Do them together.

Specific label rename recommendations based on existing routes:

| Current label | Recommended label | Route |
|---------------|------------------|-------|
| doc Vault | Statement Vault | /vault |
| doc Load | Upload Statements | /vault/load |
| Sources | Statement Sources | /sources |
| data Vault | Account Vault | /accounts |
| subs Dash | Dashboard | /payments/dashboard |
| Analytics | Spending Analytics | /payments/analytics |
| subs Forecast | Forecast | /payments/forecast |
| subs Master List | Subscriptions | /payments/subscriptions |
| subs Selector | Transactions | /payments/transactions |
| subs Suggestions | Suggestions | /payments/suggestions |
| Reminders | Reminders | /payments/reminders |

CSS tokens to override: `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-border`. Add a warm tint (amber-adjacent or indigo) to the primary/accent tokens for the active state. The `SidebarMenuButton[isActive=true]` uses `bg-sidebar-accent text-sidebar-accent-foreground` via shadcn internals.

### Onboarding Hints

**localStorage dismiss pattern:**
```typescript
const HINT_KEY = (section: string) => `gsd:hints:v1:${section}`;
const isDismissed = (section: string) =>
  typeof window !== 'undefined' && localStorage.getItem(HINT_KEY(section)) === 'true';
const dismiss = (section: string) =>
  localStorage.setItem(HINT_KEY(section), 'true');
```

**Target screens** (in priority order):
1. Subscriptions list when `subscriptions.length === 0` — "Add your first subscription manually or import from a bank statement PDF."
2. Vault when no statements exist — "Upload a bank statement PDF to start building your vault."
3. Transactions when no transactions exist — "Import a bank statement to see transactions here."
4. Dashboard when no subscriptions — "Your dashboard will show analytics once you've added subscriptions."
5. Suggestions when no suggestions — "Suggestions appear when AI detects recurring patterns in your imported statements."

Each hint uses a shadcn `Alert` with icon, two-line description, a primary action CTA button, and a dismiss `X` in the top-right corner.

### CSV Export

**Subscriptions (LOW effort):** Add a single `ExportButton` component to the subscriptions list page toolbar. `onClick` calls `fetch('/api/subscriptions/export')` and triggers a browser download via `URL.createObjectURL`. The API route is complete.

**Transactions (MEDIUM effort):** Create `/api/transactions/export/route.ts` that:
- Fetches ALL transactions for the user (no pagination — full fetch)
- Columns: date, description, amount, currency, sourceType, accountId, tagStatus, subscriptionName (if converted)
- Reuses `objectsToCSV` + `createCSVResponse` from `src/lib/utils/csv.ts`
- Returns `text/csv` with `Content-Disposition: attachment; filename="transactions-YYYY-MM-DD.csv"`
- Add `ExportButton` to transactions page header, consistent with subscriptions approach

### Overlap Detection

**New API endpoint:** `GET /api/subscriptions/overlaps`

Query logic:
```sql
SELECT category_id, category_name, COUNT(*) as count,
       SUM(normalized_monthly_amount) as total_monthly
FROM subscriptions
JOIN categories ON subscriptions.category_id = categories.id
WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL AND merged_at IS NULL
GROUP BY category_id, category_name
HAVING COUNT(*) >= 2
ORDER BY total_monthly DESC
```

**UI pattern:** Dismissable `Alert` banner at top of `/payments/subscriptions` page (above the subscription table). Shows "You have N services in [Category] totalling $X/mo — review?" with a "View" button (scrolls to or filters by that category) and a dismiss button. Dismiss stored as `localStorage.setItem('gsd:overlaps:v1:dismissed', JSON.stringify({hash, dismissedAt}))` where hash is derived from the sorted overlap subscription IDs — auto-re-surfaces when subscriptions change.

### E2E Test Expansion

**Current state:** 3 spec files, ~8 effective tests (6 CRUD, email reminder shell, PDF import skipped).

**Target structure for 25-30 tests:**

| Spec file | Suggested tests | Focus |
|-----------|-----------------|-------|
| `subscriptions.spec.ts` | 6 (existing) | CRUD, validation, special chars, nav |
| `auth.spec.ts` | 3 (new) | Login, logout, register validation |
| `vault.spec.ts` | 4 (new) | Vault page renders, view toggle, empty state |
| `analytics.spec.ts` | 3 (new) | Analytics, forecast, trends page render and data visibility |
| `billing.spec.ts` | 3 (new) | Pricing page, billing status display, portal link |
| `reminders.spec.ts` | 2 (new) | Reminders page renders, cron endpoint accessible |
| `export.spec.ts` | 2 (new) | Subscriptions CSV download triggers, transactions CSV download triggers |
| `overlap.spec.ts` | 2 (new) | Overlap banner appears, dismiss works |
| `onboarding.spec.ts` | 2 (new) | Hint appears on empty state, dismiss persists |
| `accounts.spec.ts` | 3 (new) | Account CRUD, detail page tabs render |

Total: ~30 tests. PDF import spec remains skipped (OpenAI API cost in CI).

**Key selectors principle:** Add `data-testid` attributes to interactive elements that don't have unambiguous ARIA roles (action menus, export buttons, dismiss buttons). Avoid positional selectors like `locator('button').last()` which are fragile.

### Performance Audit

**Install:** `npm install --save-dev @next/bundle-analyzer`

**Add to `package.json`:**
```json
"analyze": "ANALYZE=true npm run build"
```

**Add to `next.config.ts`:**
```typescript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
```

**Expected findings (HIGH confidence from codebase inspection):**

1. `react-pdf` loads eagerly — the PDF viewer component in vault should use `next/dynamic` with `ssr: false`. The current two-file split (noted in PROJECT.md key decisions) is correct architecturally but may still include `react-pdf` in the initial bundle if the outer component isn't dynamically imported.
2. `lucide-react` imports all icons by default — add `optimizePackageImports: ['lucide-react']` to `next.config.ts` experimental options. One line, measurable reduction.
3. `recharts` on analytics/forecast pages — candidate for dynamic import; only needed on pages that render charts.
4. Sentry browser bundle size — check if `@sentry/nextjs` is contributing meaningfully to client bundle; the `tunnelRoute` is already configured which is good practice.

**Realistic Lighthouse targets for this app:**
- Performance: 80+ (react-pdf and recharts make 95+ unrealistic without removing features)
- Accessibility: 95+
- Best Practices: 95+
- SEO: 85+ (auth-gated pages score lower on SEO by design)

---

## Sources

- Codebase analysis: `src/components/layout/app-sidebar.tsx`, `src/app/(dashboard)/onboarding/page.tsx`, `src/app/api/subscriptions/export/route.ts`, `src/app/api/subscriptions/duplicates/route.ts`, `src/lib/utils/csv.ts`, `tests/e2e/subscriptions.spec.ts`, `playwright.config.ts`, `next.config.ts`, `.planning/PROJECT.md`
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) — official docs; selector strategy and test isolation (HIGH confidence)
- [Improving Playwright Test Coverage](https://www.alphabin.co/blog/playwright-test-coverage) — strategic focus over 100% coverage (MEDIUM confidence)
- [End-to-End Testing Your SaaS with Playwright](https://makerkit.dev/blog/tutorials/playwright-testing) — SaaS flow patterns (MEDIUM confidence)
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) — official Next.js performance guidance (HIGH confidence)
- [Next.js Performance Optimization 2025](https://pagepro.co/blog/nextjs-performance-optimization-in-9-steps/) — bundle analysis and Core Web Vitals (MEDIUM confidence)
- [Empty State UX in SaaS Applications](https://userpilot.com/blog/empty-state-saas/) — contextual onboarding from empty states (MEDIUM confidence)
- [Progressive Onboarding: Contextual Help](https://userpilot.com/blog/progressive-onboarding/) — inline hints vs. modal tours (MEDIUM confidence)
- [SaaS Data Portability Best Practices](https://www.binadox.com/blog/saas-data-portability-planning-your-exit-strategy-before-you-need-it/) — CSV/JSON export standards (MEDIUM confidence)
- [Best Sidebar Menu Design Examples 2025](https://www.navbar.gallery/blog/best-side-bar-navigation-menu-design-examples) — sidebar IA and visual patterns (LOW-MEDIUM confidence)

---

*Feature research for: Subscription Manager v3.1 UX & Quality milestone*
*Researched: 2026-03-02*

# Pitfalls Research

**Domain:** v3.1 UX & Quality — adding sidebar redesign, onboarding hints, CSV export, overlap detection, E2E tests, and performance optimization to a 47k-line Next.js SaaS app
**Researched:** 2026-03-02
**Confidence:** HIGH (codebase read directly; confirmed against official docs and community sources)

---

## Critical Pitfalls

### Pitfall 1: E2E Tests Reference v1.0 URL Paths That Were Moved in v3.0

**What goes wrong:**
The three existing E2E spec files (`subscriptions.spec.ts`, `email-reminders.spec.ts`, `pdf-import.spec.ts`) and `auth.setup.ts` navigate to old paths like `/subscriptions/new`, `/subscriptions`, `/dashboard`, and `/import`. These paths return 308 redirects in v3.0 to `/payments/subscriptions/new`, `/payments/subscriptions`, `/payments/dashboard`, and `/vault/load`. Playwright follows redirects transparently, but `waitForURL()` assertions and `toHaveURL()` checks referencing the old path fail because the resolved URL is the new canonical path. More critically, `auth.setup.ts` calls `waitForURL("/dashboard", { timeout: 10000 })` — the login flow now redirects to `/payments/dashboard`. This times out silently, leaving the auth state file empty and crashing all downstream tests with auth errors rather than clear assertion failures.

**Why it happens:**
The existing test files were written for v1.0 and were never updated through the v2.0–v3.0 navigation restructures. When writing 25-30 new tests that depend on the same `setup` project, the broken auth setup cascades into every new test before they even run.

**How to avoid:**
Audit every `goto()`, `waitForURL()`, and `toHaveURL()` call in all existing spec files and `auth.setup.ts` before writing new tests. Update to current canonical v3.0 paths. Treat this as the first task in the E2E phase — "fix existing before adding new."

**Warning signs:**
- `auth.setup.ts` `waitForURL("/dashboard")` times out
- New tests fail with "locator not found" rather than assertion failures
- Tests pass locally with cached `playwright/.auth/user.json` but fail on fresh CI runs

**Phase to address:** E2E test phase — first task, before writing a single new spec

---

### Pitfall 2: Sidebar Redesign Accidentally Strips Feature-Gate Wrappers

**What goes wrong:**
The current `AppSidebar` has feature-gating logic interspersed with JSX — trial badge, conditional admin section, and `LockedNavItem` wrappers are embedded inline within the nav item rendering loops. A visual redesign that restructures the JSX (changing group labels, reordering items, adding icons) can accidentally drop a `LockedNavItem` wrapper. Trial users would then see and click routes that should show an upgrade modal, accessing features that are gated by billing tier.

**Why it happens:**
The 339-line component mixes concerns: nav item definitions, feature-gate checks, trial badge rendering, user dropdown, and theme controls. There is no separation between the data layer (what items exist, what features they require) and the rendering layer. A designer-driven visual change should not need to understand billing tier logic, but in the current structure, it does.

**How to avoid:**
Before any visual changes, refactor the nav item arrays to be typed data structures with an optional `featureRequired` property. Render all items through a single `NavItem` component that wraps with `LockedNavItem` when the field is present. The redesign then only modifies color, icon, and spacing — not the gate logic.

```typescript
interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  featureRequired?: Feature;
}
```

**Warning signs:**
- Trial users can navigate to analytics, forecasting, or import pages without seeing an upgrade prompt
- `LockedNavItem` upgrade modal no longer appears when expected
- Feature-gated sections render without the lock icon overlay

**Phase to address:** Sidebar redesign phase — refactor data/render separation before visual changes

---

### Pitfall 3: CSV Export Vulnerable to Formula Injection

**What goes wrong:**
The existing `/api/subscriptions/export/route.ts` writes user-controlled fields — `name`, `description`, `notes`, `url` — directly to CSV via `objectsToCSV`. If a subscription name contains `=SUM(1+1)*cmd|'/C calc'!A0` or `=HYPERLINK("http://attacker.com","click")`, the exported file will execute that formula when opened in Excel or LibreOffice. This is OWASP CWE-1236 (Formula Injection). The v3.1 transaction CSV export adds merchant names extracted by AI from bank statements — these are entirely unvalidated and could contain arbitrary characters from PDF content.

**Why it happens:**
The `objectsToCSV` utility wraps strings in quotes but almost certainly does not inspect the first character of each value. Quoting prevents field boundary injection but does not prevent formula execution — Excel evaluates `"=HYPERLINK(...)"` as a formula regardless of surrounding quotes.

**How to avoid:**
In the `objectsToCSV` utility, prefix any cell value that starts with `=`, `+`, `-`, or `@` with a tab character before writing:

```typescript
function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `\t${value}`;
  }
  return value;
}
```

Apply to every export endpoint: subscriptions, transactions, and any future export. The tab prefix preserves the original data for human reading while preventing formula execution.

**Warning signs:**
- No sanitization step in `src/lib/utils/csv.ts`
- Subscription names beginning with `=` appear unsanitized in exported files
- Transaction merchant names from PDF imports used verbatim in CSV output

**Phase to address:** CSV export phase — apply sanitization before any export endpoint ships, not as a follow-up

---

### Pitfall 4: Playwright `storageState` Stale Session Breaks All Tests Silently

**What goes wrong:**
`auth.setup.ts` saves a single `playwright/.auth/user.json` state that all four browser projects reuse (chromium, firefox, webkit, mobile chrome). If the NextAuth JWT expires between the setup run and the test run, or if any test navigates to logout or triggers `signOut()`, the dashboard layout redirects every subsequent test to `/login`. This produces misleading "locator not found" errors for dashboard elements rather than clear "not authenticated" errors. With 25-30 new tests running in parallel across four workers, a single test that mutates auth state silently invalidates all subsequent tests in the run.

**Why it happens:**
Shared mutable auth state + parallel test execution = race condition. The current setup authenticates once via the UI and shares the session file. The test user's `trialEndDate` and `billingStatus` are embedded in the JWT at login time — if any test changes billing state, the session no longer reflects reality.

**How to avoid:**
Add a `beforeEach` in each spec file that asserts the sidebar is visible as a proxy for auth state. Add `data-testid="app-sidebar"` to `AppSidebar` for stable selection. Set `workers: 1` for auth-sensitive test suites. For tests that mutate billing or user state, use a separate test user and a separate `storageState` file.

**Warning signs:**
- Tests fail with "locator not found" on dashboard elements
- Tests pass individually but fail in parallel runs
- `page.waitForURL("/payments/dashboard")` times out with no error logged

**Phase to address:** E2E test phase — configure test isolation before writing new specs

---

### Pitfall 5: Sidebar CSS Variable Scope Conflicts with Tailwind v4 Theme

**What goes wrong:**
The shadcn sidebar component (`src/components/ui/sidebar.tsx`) scopes its colors via CSS variables (`--sidebar-background`, `--sidebar-foreground`, `--sidebar-accent`) defined under `[data-sidebar=sidebar]`. The codebase uses Tailwind CSS v4, which defines all theme colors in the `@theme` directive using OKLCH. When adding warm/friendly colors to the sidebar, developers commonly add Tailwind utility classes directly (e.g., `bg-orange-100`, `text-amber-700`) to sidebar JSX. These utility colors are global — they do not adapt to the sidebar's CSS variable scope and will not respect dark mode unless matching `.dark` variables are also defined. The result is a sidebar that looks warm in light mode but shows unrelated colors in dark mode.

**Why it happens:**
Tailwind v4 removed `tailwind.config.js` color extension. Developers accustomed to v3 reach for utility classes directly. The sidebar's CSS variable namespace is separate from the global `@theme` and is easy to miss.

**How to avoid:**
Define all sidebar warm colors as named CSS variables in `globals.css` under both `:root` and `.dark` selectors, following the existing `--sidebar-*` variable convention:

```css
:root {
  --sidebar-accent-warm: oklch(0.95 0.03 55);
}
.dark {
  --sidebar-accent-warm: oklch(0.25 0.02 55);
}
```

Reference via `bg-[var(--sidebar-accent-warm)]` in JSX, not via one-off utility classes.

**Warning signs:**
- Sidebar looks warm/colored in light mode but switches to default gray/slate in dark mode
- Hard-coded OKLCH or hex values appear directly in JSX (not in CSS variables)
- System dark mode screenshot test shows different sidebar appearance than design

**Phase to address:** Sidebar redesign phase — theme variable setup before visual changes

---

### Pitfall 6: Onboarding Hints Shown to Returning Users and Re-appear After Dismissal

**What goes wrong:**
Empty-state onboarding hints are easy to get right for new users but two failure modes emerge: (1) hints appear for users who already have data (the "empty state" check is accidentally per-session, not per-data); (2) hints re-appear on every page refresh because dismissal state is stored only in React component state, not persisted anywhere. A user who dismisses "Import your first bank statement" sees it again the next time they visit the page.

**Why it happens:**
The first implementation stores hint visibility in `useState` — this is volatile per render. Developers often check "does data exist" at component mount but forget that a user who has data from a previous session still gets the hint if the data check query is loading. The flash of hint-before-data is the most common form of this bug.

**How to avoid:**
- Store hint dismissal in `localStorage` with a versioned key (e.g., `onboarding_hint_import_v1`). This persists across sessions without requiring a DB column.
- Alternatively, use the existing `users.onboardingCompleted` boolean for a global "finished onboarding" gate, with per-hint local storage for individual dismissals.
- Always show hints conditionally: `!isLoading && data.length === 0 && !isDismissed`. Never show during loading state.

**Warning signs:**
- Hint appears for a split second even when user has existing data (data was loading)
- Refreshing the page after dismissing a hint shows it again
- Users who have 10 subscriptions see "Add your first subscription" hint

**Phase to address:** Onboarding hints phase — persistence strategy decided before any hint component is built

---

### Pitfall 7: Overlap Detection Flags All Subscriptions in the Same Category as Overlapping

**What goes wrong:**
The intuitive implementation of "overlap detection" groups subscriptions by category and flags any category with more than one subscription as an overlap. This produces overwhelming false positives: a user with Netflix, Disney+, and Hulu in "Streaming" gets three overlap flags even though this is a legitimate multi-service setup. The feature becomes noise rather than signal, and users dismiss all flags without acting.

**Why it happens:**
Category-only matching is the simplest query. Developers implement the most obvious JOIN and call it done. The business logic assumption ("same category = overlap") is correct in some cases (e.g., two password managers) but wrong in others (streaming, cloud storage at different tiers).

**How to avoid:**
Define overlap as: same category AND similar amount (within 20-30%) AND renewal dates within 7 days of each other. This targets true duplicates (same service billed twice, same category/amount accidentally created twice) while leaving legitimate multi-service combos unflagged. Add a unit test battery with known false-positive scenarios before shipping.

Overlap detection algorithm:
```typescript
// Flag as overlap if: same category + amount within 30% + renewal within 7 days
function isOverlap(a: Subscription, b: Subscription): boolean {
  if (a.categoryId !== b.categoryId) return false;
  const amountRatio = Math.min(a.amount, b.amount) / Math.max(a.amount, b.amount);
  if (amountRatio < 0.7) return false; // > 30% price difference = different tiers
  const daysDiff = Math.abs(differenceInDays(a.nextRenewalDate, b.nextRenewalDate));
  return daysDiff <= 7;
}
```

**Warning signs:**
- Every user with more than one subscription in any category sees overlap flags
- Overlap badge count equals the total subscription count minus number of unique categories
- Users report all overlap flags as false positives

**Phase to address:** Overlap detection phase — algorithm design and unit tests before any UI is built

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse single shared test user for all E2E tests | Simpler setup, faster auth | Test isolation breaks when one test mutates user state (trial, billing) | Only for read-only smoke tests; create isolated test users for state-mutating tests |
| Add onboarding hints as inline JSX in existing page components | Fast to ship | Hints become coupled to page internals; grow unmaintainable across 10+ pages | Never — use a dedicated hook + persistence strategy |
| CSV export without formula sanitization | Zero implementation cost | CSV injection vulnerability in every export endpoint | Never — shipping this is a security defect |
| Overlap detection with category-only matching | One-line query | Overwhelming false positives; feature ignored by users | Never ship; algorithm must include amount + date proximity |
| E2E tests that create data but never clean up | Fast authoring | DB accumulates test subscriptions; later tests see stale records | Acceptable in dev-only if a cleanup step is added to test teardown |
| Run `@next/bundle-analyzer` once then forget | Baseline established | Bundle grows across milestones undetected | Only if a CI bundle size check is added separately |
| Run Lighthouse in dev mode to "check performance" | Faster iteration | Dev mode bundle is 3-5x larger; HMR inflates metrics; scores are meaningless | Never — always audit against production build |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Playwright + NextAuth `storageState` | Assuming saved auth state is always valid | Add sidebar visibility assertion in `beforeEach`; regenerate auth state in CI rather than caching it |
| Playwright + 308 redirects | Using old URL paths in `goto()` and `waitForURL()` assertions | Always use canonical post-redirect path in assertions; 308 redirects are followed but assertions check the final URL |
| Tailwind v4 + shadcn sidebar CSS vars | Adding `bg-orange-*` utility classes directly to sidebar elements | Define `--sidebar-accent-warm` in CSS file; reference via `bg-[var(--sidebar-accent-warm)]` |
| CSV export + user-generated data | Using field values verbatim in `objectsToCSV` | Sanitize every string cell against formula injection before writing |
| TanStack Query + onboarding state | Storing hint dismissal in query cache | Use `localStorage` with versioned key; cache is volatile on remount |
| `@next/bundle-analyzer` + Sentry build wrapper | Sentry's `withSentryConfig` inflates bundle report with source maps | Run analyzer in a separate build without `withSentryConfig` wrapper, or with `sourcemaps: { disable: true }` |
| `react-pdf` + sidebar redesign | Importing any PDF viewer component into the sidebar | The react-pdf two-file split pattern must be preserved — PDF worker loads only in the PDF viewer component, never in shared layout |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Lighthouse run against dev server | Performance scores 40-60 points lower than production; misleading optimization targets | Always run `npm run build && npm run start` before Lighthouse measurement | Any dev-mode audit |
| `lucide-react` full barrel import | Icon library ships to every page even if only 3 icons used on that page | Named imports from `lucide-react` are already tree-shaken — verify no `import * as Icons` was added during sidebar redesign | When a `import * as` pattern appears |
| `recharts` in layout component | Recharts bundle loaded on every page, including non-analytics routes | Keep recharts imports only inside analytics/forecast page components; do not import in sidebar or shared layout | When charts are added to sidebar widgets or dashboard summary |
| `react-pdf` worker loaded globally | PDF Web Worker loaded on non-vault pages | The two-file split pattern (noted in KEY DECISIONS) must be preserved; verify sidebar changes did not import the PDF viewer | Any time the PDF viewer or worker config appears in a layout file |
| `useUserStatus` hook with no stale time | Hook re-fetches user status on every sidebar mount (every navigation) | Verify `staleTime` is set to at least 5 minutes in the user status query; the sidebar mounts on every page | Every navigation in a session |
| `@next/bundle-analyzer` output read incorrectly | Seeing small chunk sizes but ignoring duplicated modules | Check "Parsed" size column AND look for the same module appearing in multiple chunks | When adding dynamic imports that share dependencies with main bundle |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| CSV export without formula sanitization | User with `=SUM()` in subscription name can inject formulas into admin-downloaded exports | Prefix `=`, `+`, `-`, `@` cell values with tab character in `objectsToCSV` before writing |
| Transaction CSV including raw AI-extracted merchant names | PDF-extracted merchant names are unvalidated and could contain injection payloads | Apply same CSV sanitization to all `createCSVResponse` calls; AI extraction output is untrusted user-adjacent data |
| Onboarding state read from stale session cookie | `users.onboardingCompleted` set at login; if changed during session, stale hint state persists | Read onboarding state from API on mount; use `localStorage` for per-hint dismissal (not session-level) |
| Export endpoints without rate limiting | Unlimited `/api/subscriptions/export` calls enable data scraping or DoS via large CSV generation | Add per-user minimum interval between exports (e.g., once per minute) or use TanStack Query's disabled refetch window |
| Overlap detection results cached without user scope | If overlap API response cached by subscription IDs alone, navigating between user sessions could show wrong data | Overlap API must include `WHERE userId = session.user.id`; never cache by subscription IDs only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Onboarding hints shown to users who already have data | Experienced users are patronized and distracted | Gate hints on both `!isLoading && data.length === 0` AND `!isDismissed` — never show during loading |
| Overlap detection flags every subscription in a same-category stack (Netflix + Disney+ + Hulu) | Feature generates noise; users ignore all flags | Use amount proximity + renewal date proximity alongside category as overlap signals |
| CSV export filename uses UTC date when user is in UTC+14 | `subscriptions-2026-03-02.csv` shows yesterday's date for user in Auckland | Use ISO 8601 UTC suffix: `subscriptions-2026-03-02Z.csv` or append time |
| Sidebar redesign changes nav label text without updating E2E selectors | Tests using `getByRole("link", { name: "subs Master List" })` break on label change | Add `data-testid` attributes to nav items during redesign; use IDs in tests, not text labels |
| Onboarding hints injected as overlay tooltips cover the UI they describe | Hint blocks the action it is prompting | Use inline contextual hints below empty-state headings, not popovers or modals |
| Sidebar item active state breaks for edit/detail sub-routes | User is at `/payments/subscriptions/[id]/edit` but no sidebar item highlights | `prefixMatchItems` in `isNavItemActive` must include `/payments/subscriptions` to highlight the parent on all child routes |
| CSV missing UTF-8 BOM | Excel on Windows shows garbled characters for non-ASCII subscription names | Prepend `\uFEFF` BOM to CSV string before returning from `createCSVResponse` |

---

## "Looks Done But Isn't" Checklist

- [ ] **Sidebar redesign:** Nav item active state tested for nested routes — navigate to `/payments/subscriptions/[id]/edit`; verify "subs Master List" is highlighted
- [ ] **Sidebar redesign:** Trial badge still renders after JSX restructure — verify with a user whose `billingStatus` is `"trial"` and `trialEndDate` is in the future
- [ ] **Sidebar redesign:** Admin section renders for admin role, hidden for non-admin — verify with both `role: "admin"` and regular user sessions
- [ ] **Sidebar redesign:** Dark mode renders correctly — screenshot in `.dark` mode; verify all warm colors have CSS variable counterparts
- [ ] **Onboarding hints:** Dismissal persists across page refresh — dismiss a hint, reload the page, verify hint is gone
- [ ] **Onboarding hints:** Hints absent for users who already have data — create subscriptions, navigate back to empty-state page; hint must not appear
- [ ] **Onboarding hints:** Hints do not flash during loading — add a network throttle; verify hint does not appear then disappear
- [ ] **CSV export:** Formula injection sanitization in place — export a subscription named `=SUM(1+1)`; verify exported cell is `\t=SUM(1+1)` not `=SUM(1+1)`
- [ ] **CSV export:** File opens without garbled characters in Excel on Windows — verify UTF-8 BOM present if non-ASCII names exist
- [ ] **CSV export:** Transaction export includes same sanitization as subscription export
- [ ] **Overlap detection:** Netflix + Disney+ + Hulu in "Streaming" does NOT flag as overlap — unit test this scenario explicitly
- [ ] **Overlap detection:** Same subscription created twice with same amount does flag as overlap — unit test this scenario
- [ ] **Overlap detection:** Only active (non-deleted) subscriptions are considered — verify `isNull(deletedAt)` filter is applied
- [ ] **E2E tests:** `auth.setup.ts` `waitForURL` uses `/payments/dashboard` — verify before first test run on fresh auth state
- [ ] **E2E tests:** All `goto()` calls in existing specs use v3.0 canonical paths — grep for `/subscriptions/new`, `/dashboard`, `/import` in `tests/`
- [ ] **Performance audit:** Lighthouse run against production build (`npm run build && npm start`), not dev server
- [ ] **Performance audit:** `@next/bundle-analyzer` baseline committed before any optimization changes

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| E2E tests use old URL paths | LOW | Grep `tests/` for old paths; replace with v3.0 canonical paths; delete `playwright/.auth/user.json` and re-run setup |
| CSV injection vulnerability shipped | MEDIUM | Add sanitization to `objectsToCSV`; add unit test; notify users to re-download if admins opened affected exports |
| Sidebar feature gates accidentally removed | MEDIUM | Restore from git diff; add regression test for locked item upgrade modal; deploy as hotfix |
| Stale Playwright auth state breaks CI | LOW | Delete `playwright/.auth/user.json`; re-run setup project; verify `.gitignore` includes auth state file |
| Dark mode sidebar broken by redesign | LOW | Add missing `.dark` CSS variable definitions in `globals.css`; verify against system dark mode |
| Overlap detection flags everything | LOW | Tighten algorithm to require amount proximity + renewal date proximity; add unit tests for false positive scenarios |
| Bundle regression introduced by new feature | MEDIUM | Run `@next/bundle-analyzer`; identify offending import; add `dynamic(() => import(...), { ssr: false })` wrapper; verify chunk removed from initial load |
| Onboarding hints reappear after dismissal | LOW | Add `localStorage` persistence for dismissal state; clear React-only state management |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| E2E tests reference old v1.0/v3.0 URL paths | E2E test phase — first task: audit existing specs | Run `npm run test:e2e` on fresh auth state; zero failures before any new tests added |
| Sidebar redesign breaks feature gates | Sidebar redesign phase — refactor before visual changes | Test with trial user: locked items show upgrade modal; admin section absent for non-admin |
| CSV formula injection | CSV export phase — sanitize before shipping | Unit test: `objectsToCSV` with `=SUM(1+1)` input produces `\t=SUM(1+1)` output |
| Playwright storageState staleness | E2E test phase — isolation setup first | `beforeEach` sidebar assertion; tests pass in parallel with multiple workers |
| Sidebar CSS variable dark mode conflict | Sidebar redesign phase — CSS variables before JSX changes | Screenshot comparison of sidebar in both light and dark modes vs design |
| Onboarding hints shown to returning users | Onboarding hints phase — persistence strategy before component | Dismiss hint, reload; hint absent. User with data; hint absent. Loading state; hint absent |
| Overlap detection false positives | Overlap detection phase — algorithm + unit tests before UI | Netflix + Disney+ + Hulu = 0 flags; same subscription twice = 1 flag |
| Lighthouse in dev mode | Performance phase — specify production build in process | `NODE_ENV=production npm run build && npm start` before measurement |
| Bundle size ungated after 8 milestones | Performance phase — baseline first | `@next/bundle-analyzer` committed baseline; optimization runs after baseline established |
| CSV missing UTF-8 BOM | CSV export phase | Open export in Excel on Windows; verify no garbled characters for names with accents/symbols |

---

## Sources

- OWASP CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection
- CWE-1236 Formula Injection: https://cwe.mitre.org/data/definitions/1236.html
- CSV injection prevention — Node.js patterns: https://www.cyberchief.ai/2024/09/csv-formula-injection-attacks.html
- Playwright authentication state guide: https://playwright.dev/docs/auth
- Playwright storageState stale session scenarios: https://www.browserstack.com/guide/playwright-storage-state
- Playwright E2E test flakiness patterns: https://dev.to/bugslayer/building-a-comprehensive-e2e-test-suite-with-playwright-lessons-from-100-test-cases-171k
- shadcn/ui Tailwind v4 theming: https://ui.shadcn.com/docs/tailwind-v4
- Tailwind v4 CSS variable theming: https://www.shadcnblocks.com/blog/tailwind4-shadcn-themeing/
- Next.js bundle optimization guide: https://www.coteries.com/en/articles/reduce-size-nextjs-bundle
- Next.js package bundling official guide: https://nextjs.org/docs/app/guides/package-bundling
- Next.js Lighthouse performance guide: https://www.debugbear.com/blog/nextjs-performance
- Empty states and onboarding UX: https://www.smashingmagazine.com/2017/02/user-onboarding-empty-states-mobile-apps/
- Codebase direct analysis: `src/components/layout/app-sidebar.tsx`, `tests/e2e/subscriptions.spec.ts`, `tests/auth.setup.ts`, `tests/e2e/email-reminders.spec.ts`, `src/app/api/subscriptions/export/route.ts`, `src/app/api/user/export/route.ts`, `next.config.ts`, `playwright.config.ts`, `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`

---
*Pitfalls research for: v3.1 UX & Quality — sidebar redesign, onboarding, CSV export, overlap detection, E2E tests, performance optimization*
*Researched: 2026-03-02*

# Architecture Research: Billing & Monetization Integration

**Domain:** SaaS Billing with Tiered Plans
**Researched:** 2025-02-11
**Confidence:** HIGH

## Executive Summary

This document describes how to integrate tiered billing features (Primary/Enhanced/Advanced tiers, voucher codes, feature gating) into the existing Next.js + Supabase + Stripe architecture. The existing codebase already has a solid foundation for billing with Stripe webhooks, checkout sessions, and customer portal integration. The key additions needed are:

1. **Schema changes** - Add tier tracking and voucher tables
2. **Stripe configuration** - Create Products (tiers) and Prices in Stripe
3. **Feature gating** - Hooks and helpers to check tier access
4. **Voucher system** - Leverage Stripe promotion codes (already enabled)

## Existing Architecture Analysis

### Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ BillingPage  │  │ TrialBanner  │  │ useUserStatus│          │
│  │ /settings/   │  │              │  │ (hook)       │          │
│  │ billing      │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
├─────────┴─────────────────┴─────────────────┴───────────────────┤
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ /api/billing/  │  │ /api/billing/  │  │ /api/webhooks/ │    │
│  │ create-checkout│  │ portal         │  │ stripe         │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
│          │                   │                   │              │
├──────────┴───────────────────┴───────────────────┴──────────────┤
│                         Service Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ lib/stripe/client.ts   │  │ lib/stripe/products.ts │        │
│  │ - getStripeClient()    │  │ - STRIPE_PRICES        │        │
│  │ - Singleton pattern    │  │ - PRICING config       │        │
│  └────────────────────────┘  └────────────────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                         Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  users table:                                                    │
│  - billingStatus: trial | active | cancelled | past_due        │
│  - stripeCustomerId, stripeSubscriptionId, stripePriceId       │
│  - trialStartDate, trialEndDate, currentPeriodEnd              │
└─────────────────────────────────────────────────────────────────┘
```

### Current Capabilities

| Capability | Status | Location |
|------------|--------|----------|
| Stripe customer creation | Implemented | `/api/billing/create-checkout` |
| Checkout session | Implemented | `/api/billing/create-checkout` |
| Customer portal | Implemented | `/api/billing/portal` |
| Webhook handling | Implemented | `/api/webhooks/stripe` |
| Trial management | Implemented | `lib/auth/config.ts` (14-day trial) |
| Billing status sync | Implemented | Webhooks update `billingStatus` |
| Promotion codes | Enabled | `allow_promotion_codes: true` in checkout |
| Session/JWT billing data | Implemented | `billingStatus`, `trialEndDate` in token |

### Current Limitations

| Gap | Current State | Needed |
|-----|---------------|--------|
| Tier tracking | Single "active" status | Track which tier (Primary/Enhanced/Advanced) |
| Feature limits | No limits enforced | Subscription limits, PDF imports, etc. |
| Tier-based pricing | Single monthly/annual price | Multiple products with tier prices |
| Voucher redemption | Only Stripe promotion codes | Track which voucher was used |
| Feature gating | Binary active/inactive | Tier-based feature access |

## Recommended Architecture

### Target State

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ BillingPage  │  │ TierBadge    │  │ FeatureGate  │          │
│  │ (upgraded)   │  │ (new)        │  │ (new)        │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴───────┐          │
│  │              useUserTier() hook (new)             │          │
│  │  - tier: 'free' | 'primary' | 'enhanced' | 'advanced'       │
│  │  - limits: { subscriptions, pdfImports, ... }    │          │
│  │  - hasFeature(featureName): boolean              │          │
│  └──────────────────────────────────────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ /api/billing/  │  │ /api/billing/  │  │ /api/webhooks/ │    │
│  │ create-checkout│  │ redeem-voucher │  │ stripe         │    │
│  │ (updated)      │  │ (new)          │  │ (updated)      │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
│          │                   │                   │              │
├──────────┴───────────────────┴───────────────────┴──────────────┤
│                         Service Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐  ┌────────────────────────────┐│
│  │ lib/stripe/products.ts     │  │ lib/billing/tiers.ts (new) ││
│  │ (updated)                  │  │ - TIER_LIMITS              ││
│  │ - TIER_PRODUCTS            │  │ - TIER_FEATURES            ││
│  │ - TIER_PRICES              │  │ - canAccessFeature()       ││
│  └────────────────────────────┘  └────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                         Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  users table (updated):                                          │
│  - tier: 'free' | 'primary' | 'enhanced' | 'advanced' (new)    │
│  - tierActivatedAt (new)                                         │
│  - voucherCode (new) - tracks which voucher was redeemed        │
│                                                                  │
│  vouchers table (new):                                           │
│  - code, tier, type, expiresAt, maxRedemptions, usedCount       │
│  - stripeCouponId (links to Stripe promotion code)              │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Integration Points |
|-----------|----------------|-------------------|
| `useUserTier()` hook | Return current tier, limits, feature access | Reads from session, caches in TanStack Query |
| `<FeatureGate>` | Conditionally render based on tier | Uses `useUserTier()` |
| `/api/billing/create-checkout` | Create tier-specific checkout | Maps tier to Stripe Price ID |
| `/api/billing/redeem-voucher` | Validate & apply voucher | DB voucher lookup, Stripe coupon apply |
| `/api/webhooks/stripe` | Sync tier on subscription change | Parse price ID to tier |
| `lib/billing/tiers.ts` | Tier definitions, limits, features | Used by hooks and API routes |
| `lib/stripe/products.ts` | Stripe product/price mapping | Environment variables for IDs |

## Schema Changes

### Option 1: Tier on Users Table (Recommended)

Add tier tracking directly to users table. Simple and matches existing pattern.

```typescript
// Addition to src/lib/db/schema.ts

export const tierEnum = pgEnum("tier", [
  "free",      // Trial expired, no subscription
  "primary",   // Basic paid tier
  "enhanced",  // Mid tier with more features
  "advanced",  // Top tier with all features
]);

// Update users table - add these columns:
// tier: tierEnum("tier").default("free").notNull(),
// tierActivatedAt: timestamp("tier_activated_at", { withTimezone: true }),
// voucherCode: varchar("voucher_code", { length: 50 }),
```

### Option 2: Separate Subscriptions Table

For complex multi-product scenarios. Overkill for current needs.

```typescript
// NOT RECOMMENDED for this use case - too complex
export const billingSubscriptions = pgTable("billing_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tier: tierEnum("tier").notNull(),
  // ... more fields
});
```

**Recommendation:** Option 1. The users table already tracks Stripe subscription state. Adding a `tier` column is the simplest approach and matches the existing pattern.

### Voucher Table

```typescript
export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull(),

    // What the voucher gives
    tier: tierEnum("tier").notNull(),
    durationMonths: integer("duration_months"), // null = lifetime
    discountPercent: integer("discount_percent"), // For percentage discounts

    // Stripe integration
    stripeCouponId: varchar("stripe_coupon_id", { length: 255 }),
    stripePromotionCodeId: varchar("stripe_promotion_code_id", { length: 255 }),

    // Limits
    maxRedemptions: integer("max_redemptions"), // null = unlimited
    usedCount: integer("used_count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Metadata
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vouchers_code_idx").on(table.code),
  ]
);

export const voucherRedemptions = pgTable(
  "voucher_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voucherId: uuid("voucher_id").notNull().references(() => vouchers.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One redemption per user per voucher
    uniqueIndex("voucher_redemptions_user_voucher_idx").on(table.userId, table.voucherId),
  ]
);
```

## Stripe Configuration

### Products and Prices Strategy

Stripe recommends treating Products as tiers and Prices as billing intervals. This matches the existing pattern.

```typescript
// lib/stripe/products.ts (updated)

export const TIERS = {
  primary: {
    name: "Primary",
    description: "Essential subscription tracking",
    features: ["50 subscriptions", "5 PDF imports/month", "Email reminders"],
  },
  enhanced: {
    name: "Enhanced",
    description: "Advanced analytics and unlimited imports",
    features: ["Unlimited subscriptions", "20 PDF imports/month", "Analytics dashboard", "Priority support"],
  },
  advanced: {
    name: "Advanced",
    description: "Everything plus team features",
    features: ["Everything in Enhanced", "Unlimited PDF imports", "API access", "Team collaboration"],
  },
} as const;

export const TIER_PRICES = {
  primary: {
    monthly: process.env.STRIPE_PRIMARY_MONTHLY_PRICE_ID ?? "",
    annual: process.env.STRIPE_PRIMARY_ANNUAL_PRICE_ID ?? "",
  },
  enhanced: {
    monthly: process.env.STRIPE_ENHANCED_MONTHLY_PRICE_ID ?? "",
    annual: process.env.STRIPE_ENHANCED_ANNUAL_PRICE_ID ?? "",
  },
  advanced: {
    monthly: process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID ?? "",
    annual: process.env.STRIPE_ADVANCED_ANNUAL_PRICE_ID ?? "",
  },
} as const;

export type Tier = keyof typeof TIERS;
export type BillingInterval = "monthly" | "annual";

export function getTierFromPriceId(priceId: string): Tier | null {
  for (const [tier, prices] of Object.entries(TIER_PRICES)) {
    if (prices.monthly === priceId || prices.annual === priceId) {
      return tier as Tier;
    }
  }
  return null;
}
```

### Environment Variables (New)

```bash
# Stripe Tier Products (6 new price IDs)
STRIPE_PRIMARY_MONTHLY_PRICE_ID=""
STRIPE_PRIMARY_ANNUAL_PRICE_ID=""
STRIPE_ENHANCED_MONTHLY_PRICE_ID=""
STRIPE_ENHANCED_ANNUAL_PRICE_ID=""
STRIPE_ADVANCED_MONTHLY_PRICE_ID=""
STRIPE_ADVANCED_ANNUAL_PRICE_ID=""
```

## Feature Gating Implementation

### Tier Limits Configuration

```typescript
// lib/billing/tiers.ts (new file)

export const TIER_LIMITS = {
  free: {
    maxSubscriptions: 5,
    monthlyPdfImports: 0,
    emailReminders: false,
    analytics: false,
    apiAccess: false,
  },
  primary: {
    maxSubscriptions: 50,
    monthlyPdfImports: 5,
    emailReminders: true,
    analytics: false,
    apiAccess: false,
  },
  enhanced: {
    maxSubscriptions: Infinity,
    monthlyPdfImports: 20,
    emailReminders: true,
    analytics: true,
    apiAccess: false,
  },
  advanced: {
    maxSubscriptions: Infinity,
    monthlyPdfImports: Infinity,
    emailReminders: true,
    analytics: true,
    apiAccess: true,
  },
} as const;

export type TierLimits = typeof TIER_LIMITS[keyof typeof TIER_LIMITS];

export function canAccessFeature(
  tier: keyof typeof TIER_LIMITS,
  feature: keyof TierLimits
): boolean {
  const limits = TIER_LIMITS[tier];
  const value = limits[feature];

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}
```

### Client-Side Hook

```typescript
// lib/hooks/use-user-tier.ts (new file)

import { useSession } from "next-auth/react";
import { useUser } from "./use-user";
import { TIER_LIMITS, type TierLimits } from "@/lib/billing/tiers";

export type UserTier = keyof typeof TIER_LIMITS;

export function useUserTier() {
  const { data: session } = useSession();
  const { data: userData, isLoading } = useUser();

  // Derive tier from billing status and tier field
  const user = userData?.user;
  const billingStatus = user?.billingStatus;

  // Determine effective tier
  let tier: UserTier = "free";

  if (billingStatus === "trial") {
    // Trial users get enhanced tier access
    const trialEnd = user?.trialEndDate ? new Date(user.trialEndDate) : null;
    if (trialEnd && trialEnd > new Date()) {
      tier = "enhanced"; // Trial = Enhanced tier access
    }
  } else if (billingStatus === "active" && user?.tier) {
    tier = user.tier as UserTier;
  }

  const limits = TIER_LIMITS[tier];

  return {
    tier,
    limits,
    isLoading,
    hasFeature: (feature: keyof TierLimits) => {
      const value = limits[feature];
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value > 0;
      return false;
    },
    getLimit: (feature: keyof TierLimits) => limits[feature],
    isPaid: billingStatus === "active",
    isTrial: billingStatus === "trial",
  };
}
```

### FeatureGate Component

```typescript
// components/billing/feature-gate.tsx (new file)

"use client";

import { useUserTier, type UserTier } from "@/lib/hooks/use-user-tier";
import { TIER_LIMITS } from "@/lib/billing/tiers";

interface FeatureGateProps {
  feature: keyof typeof TIER_LIMITS["free"];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading } = useUserTier();

  if (isLoading) {
    return null; // Or loading skeleton
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

interface TierGateProps {
  minTier: UserTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const TIER_ORDER: UserTier[] = ["free", "primary", "enhanced", "advanced"];

export function TierGate({ minTier, children, fallback }: TierGateProps) {
  const { tier, isLoading } = useUserTier();

  if (isLoading) {
    return null;
  }

  const currentTierIndex = TIER_ORDER.indexOf(tier);
  const requiredTierIndex = TIER_ORDER.indexOf(minTier);

  if (currentTierIndex >= requiredTierIndex) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
```

### Server-Side Gating

```typescript
// lib/billing/server.ts (new file)

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TIER_LIMITS } from "./tiers";

export async function getUserTier(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      billingStatus: true,
      tier: true,
      trialEndDate: true,
    },
  });

  if (!user) return "free";

  if (user.billingStatus === "trial" && user.trialEndDate) {
    const trialEnd = new Date(user.trialEndDate);
    if (trialEnd > new Date()) {
      return "enhanced";
    }
  }

  if (user.billingStatus === "active" && user.tier) {
    return user.tier;
  }

  return "free";
}

export async function checkFeatureAccess(
  userId: string,
  feature: keyof typeof TIER_LIMITS["free"]
): Promise<boolean> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
  const value = limits[feature];

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

export async function checkSubscriptionLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
}> {
  const tier = await getUserTier(userId);
  const limit = TIER_LIMITS[tier as keyof typeof TIER_LIMITS].maxSubscriptions;

  // Count current active subscriptions
  const result = await db.query.subscriptions.findMany({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.userId, userId), isNull(s.deletedAt)),
    columns: { id: true },
  });

  const current = result.length;

  return {
    allowed: current < limit,
    current,
    limit: limit === Infinity ? -1 : limit, // -1 = unlimited
  };
}
```

## Data Flow

### Checkout Flow (Updated)

```
User clicks "Subscribe to Enhanced"
    ↓
Client sends POST /api/billing/create-checkout
  { tier: "enhanced", interval: "monthly" }
    ↓
API route:
  1. Get/create Stripe customer
  2. Look up TIER_PRICES["enhanced"]["monthly"]
  3. Create checkout session with price ID
  4. Return checkout URL
    ↓
User completes checkout on Stripe
    ↓
Stripe sends webhook: checkout.session.completed
    ↓
Webhook handler:
  1. Get subscription from Stripe
  2. Get price ID from subscription
  3. Map price ID to tier using getTierFromPriceId()
  4. Update user: { billingStatus: "active", tier: "enhanced" }
```

### Feature Gate Flow

```
Component renders <FeatureGate feature="analytics">
    ↓
useUserTier() hook:
  1. Get tier from session/user data
  2. Look up TIER_LIMITS[tier]
  3. Return hasFeature("analytics")
    ↓
If true: render children
If false: render fallback (upgrade prompt)
```

### Voucher Redemption Flow

```
User enters voucher code "LAUNCH2025"
    ↓
Client sends POST /api/billing/redeem-voucher
  { code: "LAUNCH2025" }
    ↓
API route:
  1. Validate voucher in database
     - Check isActive, expiresAt, usedCount < maxRedemptions
  2. Check user hasn't already redeemed this voucher
  3. If voucher has stripeCouponId:
     - Apply to Stripe customer for checkout discount
  4. If voucher grants tier directly:
     - Update user.tier, user.voucherCode
  5. Increment voucher.usedCount
  6. Record in voucher_redemptions
    ↓
Return { success: true, tier: "enhanced" }
```

## Integration Points

### Existing Components to Update

| Component | Current | Update Needed |
|-----------|---------|---------------|
| `useUserStatus()` | Returns `isActive`, `isPaid` | Add `tier`, `limits`, `hasFeature()` |
| `TrialBanner` | Shows trial days | Add tier-aware messaging |
| `BillingPage` | Single tier pricing | Multi-tier pricing cards |
| `/api/billing/create-checkout` | Fixed price IDs | Tier + interval price lookup |
| `/api/webhooks/stripe` | Updates `billingStatus` | Also updates `tier` from price ID |
| `lib/auth/config.ts` JWT callback | Adds `billingStatus` | Add `tier` to token |
| `types/next-auth.d.ts` | Session types | Add `tier` field |

### New Components

| Component | Purpose |
|-----------|---------|
| `lib/billing/tiers.ts` | Tier limits and features config |
| `lib/billing/server.ts` | Server-side tier checking |
| `lib/hooks/use-user-tier.ts` | Client-side tier hook |
| `components/billing/feature-gate.tsx` | Feature gating components |
| `components/billing/tier-badge.tsx` | Display current tier |
| `components/billing/upgrade-prompt.tsx` | Feature locked prompt |
| `/api/billing/redeem-voucher/route.ts` | Voucher redemption endpoint |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | Existing client, add Products | Create Products/Prices in Stripe Dashboard |
| Supabase | Add columns + tables via migration | Drizzle migrations |
| NextAuth | JWT callback adds tier | Already patterns for billingStatus |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Only Gating

**What people do:** Only check feature access in React components
**Why it's wrong:** Users can bypass by calling API directly
**Instead:** Always validate tier/limits in API routes AND client components

### Anti-Pattern 2: Hardcoded Price IDs

**What people do:** Hardcode Stripe price IDs in checkout logic
**Why it's wrong:** Can't change prices without code deployment
**Instead:** Use environment variables for all price IDs, validate against known set

### Anti-Pattern 3: Trusting Session Tier Without Validation

**What people do:** Trust the tier from session for write operations
**Why it's wrong:** Session data could be stale; user could have cancelled
**Instead:** For write operations (add subscription, import PDF), verify tier from database

### Anti-Pattern 4: Separate Billing Databases

**What people do:** Store subscription data in separate table from users
**Why it's wrong:** Extra JOINs, sync issues, complexity without benefit
**Instead:** Add tier column to existing users table (this project's pattern)

## Build Order Recommendation

Based on dependencies and existing code structure:

### Phase 1: Database & Configuration (Foundation)

1. Add `tier` column to users table (migration)
2. Create vouchers and voucher_redemptions tables (migration)
3. Update `lib/stripe/products.ts` with tier configuration
4. Create `lib/billing/tiers.ts` with limits config
5. Add new Stripe env vars to `.env.example`

**Depends on:** Nothing
**Blocks:** Everything else

### Phase 2: Stripe Product Setup

1. Create 3 Products in Stripe (Primary, Enhanced, Advanced)
2. Create 6 Prices (monthly + annual for each tier)
3. Configure env vars with price IDs
4. Optionally create promotion codes in Stripe for vouchers

**Depends on:** Nothing (parallel with Phase 1)
**Blocks:** Checkout updates

### Phase 3: Backend Tier Sync

1. Update webhook handler to extract tier from price ID
2. Add `tier` to JWT callback and session types
3. Create `lib/billing/server.ts` for server-side checks
4. Update `/api/billing/create-checkout` for tier selection

**Depends on:** Phase 1, Phase 2
**Blocks:** Client-side tier access

### Phase 4: Client-Side Gating

1. Create `useUserTier()` hook
2. Create `<FeatureGate>` and `<TierGate>` components
3. Update `useUserStatus()` or migrate to `useUserTier()`
4. Update billing page with tier selection UI

**Depends on:** Phase 3
**Blocks:** Feature gating in UI

### Phase 5: Voucher System

1. Create `/api/billing/redeem-voucher` endpoint
2. Create voucher redemption UI
3. Integrate with checkout flow (apply Stripe promotion code)

**Depends on:** Phase 1 (voucher tables), Phase 3 (checkout)
**Blocks:** Nothing (can be deferred)

### Phase 6: Feature Gating Rollout

1. Add feature gates to subscription creation (limit check)
2. Add feature gates to PDF import (monthly limit)
3. Add upgrade prompts where features are gated
4. Add tier badge to sidebar/header

**Depends on:** Phase 4
**Blocks:** Nothing

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-10k users | Current architecture is fine. Single users table with tier. |
| 10k-100k users | Consider caching tier limits in Redis. Add usage tracking table. |
| 100k+ users | Separate billing service. Event-driven tier changes. Usage metering. |

### Current Scale Priorities

1. **Simple tier column** - No need for separate subscriptions table
2. **In-memory limits** - TIER_LIMITS constant is fine
3. **Session-based tier** - JWT contains tier, refreshed on subscription change
4. **Database checks for writes** - Verify tier from DB for important operations

## Sources

- [Stripe Subscriptions Documentation](https://docs.stripe.com/billing/subscriptions/build-subscriptions) - Official build guide
- [Stripe Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons) - Voucher implementation
- [Vercel nextjs-subscription-payments](https://github.com/vercel/nextjs-subscription-payments) - Reference implementation
- [Stripe + Next.js 15 Complete Guide 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) - Modern patterns
- [BigBinary Database Design for Subscriptions](https://www.bigbinary.com/books/handling-stripe-subscriptions/designing-database-for-subscription) - Schema patterns
- [Clerk use-stripe-subscription](https://github.com/clerk/use-stripe-subscription) - Feature gating patterns with metadata

---
*Architecture research for: Billing & Monetization Integration*
*Researched: 2025-02-11*

# Feature Research: SaaS Billing & Monetization

**Domain:** SaaS subscription billing for personal finance app
**Researched:** 2026-02-11
**Confidence:** HIGH (Stripe documentation verified, existing codebase analyzed)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any paid SaaS. Missing these = product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stripe Checkout flow | Industry standard payment UX | LOW | Already partially implemented - `allow_promotion_codes: true` already enabled |
| Monthly and annual billing | Standard SaaS offering, annual saves money | LOW | Already implemented in products.ts |
| Secure payment processing | Users expect PCI compliance | LOW | Stripe handles this automatically |
| Email receipt/invoice | Proof of payment for expense tracking | LOW | Stripe sends automatically |
| Subscription cancellation | Legal requirement, user expectation | LOW | Customer portal handles this |
| Plan upgrade/downgrade | Natural user need as requirements change | MEDIUM | Customer portal with proration |
| Payment method update | Cards expire, users need to update | LOW | Customer portal handles this |
| Subscription renewal notification | Users don't want surprise charges | LOW | Stripe handles automatically |
| Failed payment retry | Cards fail, retry recovers revenue | LOW | Stripe Smart Retries enabled by default |
| Grace period for failed payments | Give users time to fix payment issues | LOW | Stripe handles via dunning settings |
| Invoice history | Users need records for tax/expense | LOW | Customer portal shows this |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable for user experience and business.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tiered feature access (Primary/Enhanced/Advanced) | Clear upgrade path, monetize future features | MEDIUM | Requires feature gating infrastructure |
| Voucher/coupon codes | Acquisition tool, promotional flexibility | LOW | Stripe has native support, already enabled |
| Contextual upgrade prompts | Convert users at point of need | MEDIUM | Requires identifying gated features and prompt timing |
| Annual discount incentive (33%) | Improves cash flow, reduces churn | LOW | Already implemented |
| Branded customer portal | Consistent brand experience | LOW | Stripe allows logo/colors customization |
| Prorated upgrades | Fair billing increases upgrade willingness | LOW | Stripe handles automatically |
| Trial extension vouchers | Retention tool for engaged trial users | LOW | Create time-limited coupons |
| Referral credits | Acquisition through word-of-mouth | MEDIUM | Requires referral tracking system |
| Grandfathered pricing | Reward early adopters, build loyalty | LOW | Use Stripe metadata to track |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Complex tier matrix | More options = more revenue | Too many tiers confuse buyers, 3.5 is optimal average | 3 tiers max (Primary/Enhanced/Advanced) |
| Free tier forever | Lower barrier to entry | Creates support burden, no conversion pressure | 14-day trial with feature access |
| Usage-based billing | Fair pricing based on usage | Revenue unpredictability, confusing invoices for consumer app | Flat monthly/annual pricing |
| Pause subscription | Users want to temporarily stop | Complicates billing logic, rarely resumes | Just cancel/resubscribe |
| Multiple payment methods saved | User convenience | UI complexity, rarely needed for consumer SaaS | Single default payment method |
| Crypto payments | Tech-forward appearance | Volatile pricing, regulatory complexity, less than 1% of users | Credit/debit cards only |
| Lifetime deals | Revenue spike, acquisition | Destroys LTV math, attracts wrong customers | Annual with discount |
| Manual invoicing | Enterprise wants it | Admin overhead, payment delays | Stripe auto-invoicing |
| Complex cancellation flows | Reduce churn | FTC enforcement risk ($2.5B Amazon settlement), dark pattern | Simple one-click cancel |
| Hidden renewal terms | Reduce cancellations | Regulatory risk, user trust damage | Clear disclosure before checkout |

## Feature Dependencies

```
[Stripe Products/Prices Setup]
    |
    +--requires--> [Checkout Flow] (existing)
    |                   |
    |                   +--enables--> [Customer Portal]
    |                   +--enables--> [Webhook Handling] (existing)
    |
    +--requires--> [Coupon/Promo Code System]
                        |
                        +--enables--> [Voucher Codes for Free Months]

[Tier Definition]
    |
    +--requires--> [Feature Gating Utility]
    |                   |
    |                   +--enables--> [Contextual Upgrade Prompts]
    |                   +--enables--> [Feature Access Checks]
    |
    +--requires--> [User Tier Storage] (existing: users.stripePriceId)

[Billing Infrastructure] (existing)
    |
    +--enhances--> [Payment Failure Emails] (TODO in webhook)
    +--enhances--> [Subscription Status Display] (existing)
```

### Dependency Notes

- **Stripe Products/Prices requires Checkout Flow:** Products must exist before checkout can reference them. Checkout already implemented.
- **Feature Gating requires Tier Definition:** Must know which features belong to which tier before gating.
- **Upgrade Prompts require Feature Gating:** Can only prompt for upgrade when user hits a gated feature.
- **Customer Portal requires Webhook Handling:** Portal changes trigger webhooks that must update local state.
- **Voucher System enhances Checkout:** Promo codes already enabled in checkout, just need to create coupons in Stripe.

## MVP Definition

### Launch With (v2.1)

Minimum viable billing - what's needed for monetization.

- [x] **Stripe Checkout integration** - Already implemented
- [x] **Monthly/annual pricing** - Already implemented ($4.99/mo, $39.99/yr)
- [x] **Webhook handling** - Already handles subscription lifecycle
- [ ] **Three-tier product structure** - Primary (current), Enhanced (placeholder), Advanced (placeholder)
- [ ] **Voucher code system** - Create Stripe coupons for "X months free"
- [ ] **Customer portal link** - Already have /api/billing/portal, need UI integration
- [ ] **Feature gating utility** - `canAccessFeature(user, feature)` pattern
- [ ] **Upgrade prompts** - Show when user hits tier limit

### Add After Validation (v2.1.x)

Features to add once core billing is working.

- [ ] **Payment failure email notification** - TODO exists in webhook code
- [ ] **Retention coupon on cancel** - Offer discount before cancel completes
- [ ] **Trial extension for engaged users** - Identify high-engagement trial users

### Future Consideration (v2.2+)

Features to defer until product-market fit is established.

- [ ] **Enhanced tier features** - Actual banking integration when built
- [ ] **Advanced tier features** - Actual investing integration when built
- [ ] **Referral program** - Requires user tracking infrastructure
- [ ] **Team/family plans** - Multi-user access model

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Customer portal integration | HIGH | LOW | P1 |
| Voucher code system | HIGH | LOW | P1 |
| Feature gating utility | HIGH | MEDIUM | P1 |
| Tier product structure | MEDIUM | LOW | P1 |
| Contextual upgrade prompts | HIGH | MEDIUM | P1 |
| Payment failure emails | MEDIUM | LOW | P2 |
| Retention coupons | MEDIUM | LOW | P2 |
| Branded portal | LOW | LOW | P3 |
| Referral program | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.1 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Existing Infrastructure Analysis

### Already Implemented (from codebase review)

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Stripe client | Done | `src/lib/stripe/client.ts` | Lazy initialization pattern |
| Product/price config | Done | `src/lib/stripe/products.ts` | Monthly/annual with formatPrice util |
| Checkout session creation | Done | `src/app/api/billing/create-checkout/route.ts` | Promo codes already enabled |
| Customer portal session | Done | `src/app/api/billing/portal/route.ts` | Redirects to Stripe |
| Webhook handler | Done | `src/app/api/webhooks/stripe/route.ts` | Handles 6 event types |
| User billing fields | Done | `src/lib/db/schema.ts` | stripeCustomerId, stripePriceId, billingStatus, etc. |
| Trial banner UI | Done | `src/components/billing/trial-banner.tsx` | Shows trial countdown |
| Billing settings page | Done | `src/app/(dashboard)/settings/billing/page.tsx` | Checkout + portal links |
| Pricing page | Done | `src/app/(marketing)/pricing/page.tsx` | Marketing page with FAQ |
| User status hook | Done | `src/lib/hooks/use-user.ts` | isTrialActive, isPaid, isActive |

### Gaps to Fill

| Component | Gap | Effort |
|-----------|-----|--------|
| Tier system | No tier concept, just "paid" vs "not paid" | MEDIUM |
| Feature gating | No `canAccessFeature()` utility | MEDIUM |
| Upgrade prompts | No UI components for gated feature prompts | MEDIUM |
| Voucher management | No admin UI to create/manage vouchers | LOW (use Stripe Dashboard) |
| Portal customization | No branding configured | LOW |
| Payment failure email | TODO in webhook, not implemented | LOW |

## Stripe Coupon/Voucher Implementation Details

Based on official Stripe documentation:

### Coupon Types
- **Percent off**: 50% discount
- **Amount off**: $10 discount (supports multi-currency)

### Duration Options
- **Once**: First invoice only (good for "first month free")
- **Repeating**: N months (good for "3 months free")
- **Forever**: Removed in 2025 API for amount-off coupons

### Promotion Codes
- Customer-facing codes mapped to coupons
- Multiple codes can reference same coupon (LAUNCH50, FRIEND50)
- Case-insensitive, must be unique across active codes
- Can restrict: first-time orders, minimum amounts, expiration dates, redemption limits

### Implementation Path
1. Create coupons in Stripe Dashboard or via API
2. Checkout already has `allow_promotion_codes: true`
3. Customer portal can show active promos if enabled
4. No additional code needed for basic voucher support

## Feature Gating Implementation Pattern

Recommended pattern from research:

```typescript
// src/lib/features.ts
type Tier = 'primary' | 'enhanced' | 'advanced';
type Feature = 'pdf_import' | 'patterns' | 'analytics' | 'banking' | 'investing';

const TIER_FEATURES: Record<Tier, Feature[]> = {
  primary: ['pdf_import', 'patterns', 'analytics'],
  enhanced: ['pdf_import', 'patterns', 'analytics', 'banking'],
  advanced: ['pdf_import', 'patterns', 'analytics', 'banking', 'investing'],
};

export function getUserTier(user: User): Tier {
  // Map stripePriceId to tier
  // Return 'primary' for trial users
}

export function canAccessFeature(user: User, feature: Feature): boolean {
  const tier = getUserTier(user);
  return TIER_FEATURES[tier].includes(feature);
}

export function getUpgradeTier(feature: Feature): Tier | null {
  // Return the minimum tier that includes this feature
}
```

### Upgrade Prompt Pattern

```typescript
// Before showing feature
if (!canAccessFeature(user, 'banking')) {
  return <UpgradePrompt
    feature="banking"
    requiredTier={getUpgradeTier('banking')}
  />;
}
// Else show feature
```

## Competitor Feature Analysis

| Feature | Mint | YNAB | Copilot | Our Approach |
|---------|------|------|---------|--------------|
| Free tier | Yes (ad-supported) | No | No | 14-day trial |
| Pricing | Free | $14.99/mo | $10.99/mo | $4.99/mo |
| Annual discount | N/A | ~17% | ~27% | 33% |
| Bank connection | Yes | Yes | Yes | Placeholder (Enhanced) |
| PDF import | No | No | Limited | Core differentiator |
| Promo codes | No | Yes | Limited | Yes (Stripe native) |
| Family plan | No | Yes ($99/yr) | No | Future consideration |

## Regulatory Considerations

### FTC Enforcement (2025-2026)

Recent enforcement actions highlight risks:
- Amazon $2.5B settlement for Prime subscription dark patterns
- Epic $520M settlement included dark pattern allegations
- California requires "symmetric cancellation experience"

### Requirements
1. Clear disclosure of subscription terms before payment
2. Easy cancellation (one-click, no retention obstacle course)
3. No hiding renewal terms in fine print
4. Confirm charge amount before processing

### Our Compliance
- Stripe Checkout shows clear terms
- Customer portal provides easy cancellation
- Pricing page has transparent FAQ
- No dark patterns in implementation

## Sources

### Official Documentation (HIGH confidence)
- [Stripe Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons)
- [Stripe Customer Portal Configuration](https://docs.stripe.com/customer-management/configure-portal)
- [Stripe Build Subscriptions Integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions)

### Industry Analysis (MEDIUM confidence)
- [SaaS Tiered Billing Guide - Maxio](https://www.maxio.com/blog/tiered-pricing-examples-for-saas-businesses)
- [SaaS Pricing Strategy Guide 2026 - Momentum Nexus](https://www.momentumnexus.com/blog/saas-pricing-strategy-guide-2026/)
- [SaaS Billing Best Practices - Orb](https://www.withorb.com/blog/saas-billing-tips)

### UX Patterns (MEDIUM confidence)
- [SaaS Upgrade Prompt UI Examples - SaaSFrame](https://www.saasframe.io/patterns/upgrade-prompt)
- [Best Freemium Upgrade Prompts - Appcues](https://www.appcues.com/blog/best-freemium-upgrade-prompts)

### Regulatory/Legal (HIGH confidence)
- [Dark Patterns Legal Analysis - Terms.Law](https://www.terms.law/2025/12/05/dark-patterns-subscriptions-and-ai-designed-flows-where-the-law-draws-the-line-now/)

---
*Feature research for: SaaS Billing & Monetization (v2.1)*
*Researched: 2026-02-11*

# Feature Research: Navigation Restructure & Account Vault

**Domain:** Financial app navigation, account management, payment type filtering, schema introspection, help documentation
**Milestone:** v3.0 Navigation & Account Vault
**Researched:** 2026-02-22
**Confidence:** HIGH (nav restructure, account detail pages), MEDIUM (payment type selector UX, schema viewer), HIGH (help page patterns)

---

## Context: What Already Exists

This is a subsequent milestone. Understanding existing infrastructure prevents rebuilding what is already there.

### Already Built (Do Not Re-Build)

**Navigation infrastructure:**
- `AppSidebar` with shadcn/ui Sidebar primitives (SidebarGroup, SidebarGroupLabel, SidebarMenu, etc.)
- Two-group layout already: "Menu" group (main nav) + "Support" group (Settings, Help)
- `LockedNavItem` feature-gating component for sidebar items
- Admin section already conditionally rendered by role
- Trial banner in sidebar already implemented

**Sources / data model:**
- `importAudits` table with `statementSource` (varchar, the human-readable account name)
- `statements` table with `sourceType` and `sourceName` for grouping
- `/sources` page — source dashboard with accordion list, coverage stats
- `source-dashboard`, `source-list`, `source-row` components
- Coverage grid component already built (used in vault)
- `account-combobox.tsx` for source-name autocomplete

**Transaction browser:**
- `/transactions` page — `TransactionBrowser` component with virtualized scrolling
- Keyset pagination for 10k+ items at 60fps
- Inline tagging (combobox), bulk operations, one-click subscription conversion

**Vault:**
- `/vault` page — dual-view (file cabinet + timeline) with coverage heat map
- Historical upload wizard for coverage gaps
- View preference persistence

**Supporting infrastructure:**
- `DashboardHeader` with breadcrumb support
- TanStack Query for all data fetching
- React Hook Form + Zod for all forms
- Drizzle ORM with 10 migrations applied

### What This Milestone Adds

1. **Sidebar restructure** — flatten the flat nav into three labeled sections (fin Vault, payments Portal, Support) with logical sub-groupings
2. **data Vault (account management)** — promote sources from import-time strings to named, typed, editable account entities (Bank/Debit, Credit Card, Loan)
3. **Account detail pages** — per-account pages: edit form, coverage grid, transaction list, spending summary
4. **Data Schema viewer** — read-only page showing the app's data model (tables, fields, relationships)
5. **Payment Type Selector** — transaction browser extended with type toggles (recurring vs one-time) and additional filters
6. **Help page** — static FAQ/documentation page

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a mature financial app. Missing these = product feels unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Labeled navigation sections | Standard in any SaaS with 8+ nav items. Flat lists become overwhelming. | LOW | shadcn Sidebar already supports SidebarGroupLabel. Purely organizational. |
| Account list with type differentiation | Every banking app (Chase, Mint, YNAB) shows accounts grouped by type. Users expect "Checking", "Credit Card" as distinct categories. | LOW | Requires new `accounts` table or extend sources model |
| Account detail page | Any entity in a financial app must have a detail page. Sources currently have `/sources` aggregate view only — no per-source drilldown beyond the accordion. | MEDIUM | Page already has components to compose: coverage grid, statement list |
| Edit account name/type | Users make typos. Names evolve ("Chase Freedom" vs "Chase Visa"). Must be editable. | LOW | Standard form. Name + type fields only. |
| Transaction browser filter bar | Users with 10k+ transactions need filters. Source filter already has groundwork; type toggle is the gap. | LOW | Toggle UI is one-week add on existing TransactionBrowser |
| Help page with FAQ | Every SaaS has a Help page. Users expect answers to "how do I X" without contacting support. | LOW | Static content, no backend needed |

### Differentiators (Competitive Advantage)

Features that go beyond expectations and create unique value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Account-level coverage grid | No consumer financial tool shows per-account statement coverage as a visual calendar grid. The coverage pattern already exists for the vault; applying it per-account creates a unique "data health" view. | LOW | Reuse CoverageGrid component, scope to single account. High reuse, high impact. |
| Account-level spending summary | Seeing "how much did I spend from this credit card this year" is genuinely useful and not available in most subscription managers. | MEDIUM | Reuse existing analytics patterns; scope to account's transactions only |
| Source-to-account migration with type tagging | Automatic promotion of existing source strings to typed account entities, preserving all statement history. Users get organized without re-importing. | MEDIUM | Requires migration strategy: one-time script or lazy promotion on first account page visit |
| Data Schema viewer | Transparency about how the system stores data builds power-user trust. Rare in consumer apps — common in developer tools. Appropriate here because users are "financial nerds" who imported raw PDFs. | LOW | Read-only static-ish page. No backend needed beyond reading the schema definition. |
| Payment type toggle (recurring vs subscription) | Most transaction browsers are undifferentiated. Surfacing "these are subscription charges" vs "these are one-time recurring" vs "unclassified" is genuinely novel and actionable. | MEDIUM | Requires tagging model to be extended with payment-type field or derived from tag status |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem right but should be explicitly avoided.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Collapsible/expandable sidebar sections | Large nav looks cleaner collapsed | Collapse breaks findability — users forget where items live. shadcn sidebar already handles icon-only collapsed mode at the sidebar level. Section-level collapse adds a second layer of hiding. | Use section labels and visual grouping instead. The sidebar already collapses at the rail level. |
| Nested sub-menus (3+ levels deep) | "More organization" | Cognitive overload. Research (Toptal multilevel menu study) shows 3+ levels causes users to lose orientation. Two levels (section label + item) is the maximum before users get lost. | Cap at two visual levels: section label + flat item list |
| Account merging / deduplication UI | Users may import from same bank with slightly different names ("Chase" vs "Chase Visa") | Merging financial data sources is destructive and complex. Users have low trust for automated merges in financial context. | Provide rename ability so users fix names manually. Offer a "same account?" hint if names are similar, but never auto-merge. |
| Real-time account balance sync | Users will ask "can I see my live balance?" | Requires Plaid/MX ($500+/month, compliance burden, out-of-scope per PROJECT.md). | Show "based on imported statements" with last-import-date clearly visible |
| Per-account notification settings | Power users will request "notify me only when this credit card has anomalies" | Adds combinatorial complexity to the alerts system. Current weekly digest is already account-aware in data — display is the gap. | Surface account name in alert notifications rather than per-account opt-in |
| Full-text search in Help page | Seems useful | Static FAQ doesn't need search infra. Adds complexity for little gain at low content volume. | Use anchor links and clear section headings. Browser Ctrl+F covers 95% of use cases. |
| Interactive schema editor | Users who see the schema viewer might want to "customize" field names | This is a personal finance app, not a no-code platform. Schema edits break the application. | Read-only with copy-to-clipboard. Add tooltip: "This shows how your data is organized internally." |

---

## Feature Dependencies

```
[Nav Restructure]
    └──requires──> [Sidebar group labels already exist in shadcn/ui]
    └──enables──> [data Vault section] (logical grouping makes it findable)
    └──enables──> [payments Portal section] (logical grouping makes it findable)

[data Vault / Account Management]
    └──requires──> [accounts table or extend import_audits/statements]
    └──requires──> [source-to-account migration]
    └──enables──> [Account Detail Pages]

[Account Detail Pages]
    └──requires──> [Account Management entity exists]
    └──reuses──> [CoverageGrid component] (already built for vault)
    └──reuses──> [TransactionBrowser component] (already built, needs account filter)
    └──reuses──> [DashboardHeader with breadcrumbs] (already built)
    └──requires──> [Account-scoped API endpoints]

[Payment Type Selector]
    └──requires──> [TransactionBrowser] (existing, needs extension)
    └──requires──> [transaction tag_status field] (existing: unreviewed/potential_subscription/not_subscription/converted)
    └──enhances──> [Account Detail Pages] (transaction tab can reuse same filter UI)

[Data Schema Viewer]
    └──independent──> no data dependencies, no backend needed
    └──enhances──> [Help page] (link from help to schema for power users)

[Help Page]
    └──independent──> static content only
    └──enhances──> [nav restructure] (occupies Support section slot alongside Settings)
```

### Dependency Notes

- **Nav Restructure is Phase 1:** Everything else becomes findable after nav is reorganized. Build this first — it is the frame for all other features.
- **Account management before account detail pages:** The entity must exist before the detail page can render anything meaningful.
- **Source-to-account migration is a dependency, not optional:** Existing users have 10+ sources. If migration doesn't run, their data Vault would be empty and confusing.
- **Payment Type Selector extends TransactionBrowser, not replaces it:** The existing virtualized browser with keyset pagination is complex infrastructure. Extend with a filter bar; do not rewrite.
- **Coverage Grid is already built:** Zero new development needed for the account detail coverage tab — it's a parameter change to scope by account.
- **Help page and Schema viewer are independent:** Can be built in any order, no blockers.

---

## Feature Details by Area

### 1. Navigation Restructure

**Current state:** Flat "Menu" section with 11 items + "Support" section with 2 items. 13 items in total is too many for undifferentiated listing.

**Target structure:**
```
fin Vault
  ├── doc Vault      (/vault)
  ├── doc Load       (/import/batch)  [was "Batch Import"]
  └── data Vault     (/accounts)     [NEW — account management]

payments Portal
  ├── Payments       (/transactions) [was "Transactions"]
  └── Subscriptions  (/subscriptions)

[unlabeled or Dashboard section]
  ├── Dashboard      (/dashboard)
  ├── Analytics      (/analytics)
  ├── Forecast       (/dashboard/forecasting)
  └── Suggestions    (/suggestions)

Support
  ├── Settings       (/settings)
  └── Help           (/help)         [NEW]
```

**Implementation complexity: LOW**
- shadcn/ui already has `SidebarGroup` and `SidebarGroupLabel` primitives
- It is a reorganization of existing items + adding 2 new items
- The sidebar already collapses to icon-only at the rail level (handled by Sidebar primitive)
- Single-file change: `app-sidebar.tsx`

**UX pattern:** Two levels maximum (section label + flat list). Research shows three levels causes orientation loss (Toptal multilevel menu study, MEDIUM confidence via WebSearch). The proposed structure stays at two levels.

**Active state logic:** The current `pathname === item.href` check works for exact matches. The new structure introduces section grouping, so the `SidebarMenuButton isActive` check may need `pathname.startsWith(item.href)` for sections with child routes (e.g., `/accounts/[id]` should keep "data Vault" highlighted).

---

### 2. data Vault (Account Management)

**What it is:** A named, typed entity representing a real-world financial account (Chase Visa, Wells Fargo Checking, etc.). Currently sources are strings stored on `importAudits.statementSource` — there is no first-class account entity.

**Account types:** Bank/Debit, Credit Card, Loan. These map to how users mentally model their finances and how statements differ (debit transactions vs credit card billing cycles vs loan amortization schedules).

**Migration strategy for existing data:**
- Option A: Create `accounts` table, add `accountId` FK to `statements`/`importAudits`. Write a migration script that creates one account per distinct `statementSource` value, then back-fills the FK. This is the cleanest long-term model.
- Option B: Leave `statementSource` as-is and derive "account" from distinct source strings. No migration, but no type field.
- **Recommendation: Option A.** The type field (Bank/Debit vs Credit Card vs Loan) is the core value add of this milestone. It requires a proper entity. The migration is a one-time SQL operation, not user-facing work.

**Account CRUD operations:**
- Create: New account form with name + type. (Will be used when importing a statement from a new source that has no existing account.)
- Read: Account list page (`/accounts`) showing all accounts grouped by type with coverage summary
- Update: Edit form for name, type, notes
- Delete: Soft-delete or hard-delete with warning. Statements must remain — cascade delete of statements is an anti-feature (users lose their financial history). On delete: orphan statements gracefully (accountId becomes NULL, data stays accessible via vault timeline view).

**UI pattern — Account list page:**
Standard financial app pattern: card or table per account, grouped by type (Bank/Debit | Credit Cards | Loans). Each card shows: account name, type badge, number of statements, coverage status (% months with data), last import date. Clicking navigates to account detail page.

**Complexity: MEDIUM** — Requires new table, migration, API endpoints (CRUD), new page with account list, account form component.

---

### 3. Account Detail Pages

**URL pattern:** `/accounts/[id]` — matches existing convention (`/subscriptions/[id]`, `/statements/[id]`)

**Four-tab structure (industry standard for financial account detail):**

| Tab | Content | Reuse |
|-----|---------|-------|
| Overview | Account name, type, notes, edit button, stats (total statements, date range, total transactions) | New component, low complexity |
| Coverage | Coverage grid scoped to this account | CoverageGrid component already built — add `accountId` filter |
| Transactions | Transaction list scoped to this account | TransactionBrowser with `accountId` filter |
| Spending | Spending summary scoped to this account | New component, reuses analytics query patterns |

**Tab implementation:** shadcn/ui `Tabs` component. Already in the component library. Low complexity.

**Coverage tab:** The existing coverage grid is parameterized by source. Changing the parameter to account ID is a one-line change to the data query. HIGH reuse.

**Transactions tab:** TransactionBrowser already accepts filter props. Adding an `accountId` filter is an extension to the existing keyset pagination query. MEDIUM complexity (query change + prop threading).

**Spending tab:** Month-over-month total for this account's transactions. Sum by month, show a bar chart (Recharts already installed). No novel infrastructure needed.

**Breadcrumbs:** `Dashboard > data Vault > [Account Name]` — DashboardHeader already supports breadcrumb arrays.

**Complexity: MEDIUM** — High component reuse means this is mostly composition + new API endpoint for account-scoped data.

---

### 4. Data Schema Viewer

**What it is:** A read-only page showing how the app organizes data: tables, key fields, relationships between tables. Targeted at power users who want to understand what they're importing into.

**Why it matters:** Users who import raw PDF data and manually tag transactions are sophisticated. Showing them the data model builds trust ("I understand how my data is stored"). This is a differentiator because no consumer subscription manager does this.

**Content (what to show):**
- Tables: users, subscriptions, statements, accounts, import_audits, tags, categories
- Key fields per table: name, type, description
- Relationships: accounts → statements, statements → transactions, subscriptions → import_audits
- NOT shown: internal fields (IDs, foreign keys), admin tables (stripe_prices, webhook_events), auth tables (accounts, sessions from NextAuth)

**Implementation approach:** Static page component with hardcoded schema description. Do not query the live database schema (information_schema). Rationale:
1. Security: information_schema exposes table structure, indexes, constraints — sensitive to leak
2. Maintenance: hardcoded description stays curated and user-friendly; live schema would show internal implementation details (created_at, updated_at, admin columns, etc.)
3. Simplicity: zero backend needed, ships faster, no API endpoint required

**UI pattern:** Card grid or accordion per table. Each table card shows: table name (human-friendly), purpose description, key fields list. Relationship lines or arrows optional (adds complexity, limited value for the audience).

**Complexity: LOW** — Static content component. No API, no database query. One new page + one new component.

---

### 5. Payment Type Selector

**What it is:** An extension to the existing TransactionBrowser (`/transactions`) that adds toggles for filtering by payment type: Recurring Payments (identified subscriptions + high-confidence patterns) vs Subscriptions (confirmed subscription conversions only) vs All Transactions.

**Industry context:** Most transaction browsers are undifferentiated lists. The key insight from research is that "recurring" and "subscription" are distinct categories:
- Subscription: confirmed recurring payment for service access (Netflix, Spotify)
- Recurring: automated transaction on a schedule (rent, loan payment, utility)
- One-time: single occurrence

The existing `transactionTagStatus` enum already captures useful signal:
- `converted` = confirmed subscription
- `potential_subscription` = high-confidence recurring pattern
- `not_subscription` = user-dismissed
- `unreviewed` = unknown

**Toggle design:** Segmented control (button group) or tab strip at top of transaction browser. Options:
1. "All" — current behavior
2. "Subscriptions" — filter to `tag_status = 'converted'`
3. "Recurring" — filter to `tag_status IN ('converted', 'potential_subscription')`
4. "Unreviewed" — filter to `tag_status = 'unreviewed'` (power user view)

**Additional filters to include:**
- Account filter (which account/source)
- Date range filter
- Amount range filter (already partially in codebase)

**Implementation:** Add filter state to TransactionBrowser. The keyset pagination query already accepts filter parameters — extend the query to accept `tagStatus` filter. shadcn/ui `ToggleGroup` or `Tabs` for the selector UI. Both are already available.

**Complexity: MEDIUM** — Extending existing infrastructure. The hard part (virtualized scrolling, keyset pagination, bulk operations) is already built. Adding filters is straightforward query extension.

---

### 6. Help Page

**What it is:** Static FAQ and documentation page at `/help`. Answers common questions without requiring support contact.

**Content structure (industry standard):**
- Getting Started (what is this app, how to import first statement)
- Managing Accounts (creating accounts, editing, coverage)
- Subscriptions (what counts as a subscription, how to add manually, how conversion works)
- Transactions (browsing, tagging, bulk operations)
- Billing & Plans (what each tier includes, how to upgrade, cancel)
- Data & Privacy (what data is stored, how to export, deletion)

**Implementation approach:** Next.js static page with hardcoded content. No CMS, no search, no backend. Rationale:
- Content volume is low (6 sections, ~20 FAQ entries) — doesn't justify CMS setup
- No real-time updates needed — content changes with feature releases
- Static rendering = zero server cost, instant load

**UX pattern:** Accordion (`shadcn/ui Accordion`) per section. Each section expands to show Q&A pairs. This is the industry standard pattern (used by Stripe, Linear, Vercel help pages). Accordion allows page scan before reading, reduces scroll depth.

**Anchor links:** Each section and question should have an ID anchor so users can be linked directly to relevant content from other parts of the app (e.g., trial banner links to billing FAQ).

**Complexity: LOW** — Static content, accordion component already in library, no backend needed.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Nav restructure | HIGH — unlocks orientation for all other features | LOW — sidebar reorganization only | P1 |
| Account list page | HIGH — table stakes for "managing" accounts | MEDIUM — new table + migration + API | P1 |
| Source-to-account migration | HIGH — existing users must not lose data | MEDIUM — SQL migration + backfill | P1 |
| Account detail: Overview tab | HIGH — entry point to account detail | LOW — form + stats, composed from primitives | P1 |
| Account detail: Coverage tab | HIGH — reuses existing component, instant value | LOW — component reuse, filter param change | P1 |
| Account detail: Transactions tab | HIGH — primary utility of account page | MEDIUM — TransactionBrowser with account filter | P1 |
| Payment Type Selector | MEDIUM — useful filter, power-user oriented | MEDIUM — query extension + toggle UI | P2 |
| Account detail: Spending tab | MEDIUM — nice summary, not blocking | MEDIUM — new query + chart | P2 |
| Help page | MEDIUM — reduces support burden | LOW — static content | P2 |
| Data Schema viewer | LOW — power-user niche | LOW — static content page | P3 |

**Priority key:**
- P1: Essential to milestone — ship together as coherent feature set
- P2: High value, add in same milestone but can be deferred if scope is tight
- P3: Low cost, low urgency, nice to have

---

## Competitor Feature Analysis

| Feature | Mint/Intuit | YNAB | Monarch Money | Our Approach |
|---------|-------------|------|---------------|--------------|
| Multi-account grouping | By type (Checking, Savings, Credit) | Manual account creation with type | Same as Mint | Accounts table with enum type field |
| Account detail page | Full page per account with balance history, transactions | Full account detail with activity | Rich account pages | Tabs: overview, coverage, transactions, spending |
| Transaction filtering | Category, date, amount filters | Category + payee filters | Advanced filters including recurring | Type toggle (our differentiation) + account + date |
| Navigation structure | Top-level nav by function | Left sidebar with labeled sections | Collapsible sidebar sections | Section labels (fin Vault, payments Portal, Support) |
| Help/docs | Separate help center (Zendesk) | Extensive docs at help.ynab.com | In-app help center | Static in-app page — simpler, no Zendesk cost |
| Data transparency | None | None | None | Schema viewer (differentiator for power users) |

---

## MVP Definition for This Milestone

### Ship Together (v3.0 core)

- [x] Nav restructure — unlocks everything else being findable
- [x] Accounts table + migration + source backfill — entity must exist
- [x] Account list page (`/accounts`) — entry point to data Vault
- [x] Account detail page — Overview + Coverage + Transactions tabs
- [x] Payment Type Selector on `/transactions` — extends existing browser

### Add in v3.0 if scope allows

- [x] Account Spending tab — reuses analytics patterns, high value
- [x] Help page — low cost, reduces support questions post-launch

### Defer to v3.1

- [ ] Data Schema viewer — power-user feature, no blockers, just low urgency
- [ ] Per-account notification preferences — requires alerts system extension

---

## Sources

- Codebase analysis: `src/components/layout/app-sidebar.tsx`, `src/app/(dashboard)/transactions/page.tsx`, `src/app/(dashboard)/vault/page.tsx`, `src/lib/db/schema.ts`
- Previous research: `.planning/research/FEATURES.md` (v2.2 vault), `.planning/research/FEATURES-STATEMENT-HUB.md` (v2.0 statement hub)
- Phase 6 research: `.planning/phases/06-statement-source-tracking/06-RESEARCH.md`
- [Banking App UI Best Practices 2026](https://procreator.design/blog/banking-app-ui-top-best-practices/) — MEDIUM confidence (WebSearch)
- [Multi-level Menu Design Best Practices](https://www.toptal.com/designers/ux/multilevel-menu-design) — MEDIUM confidence (WebSearch)
- [Best UX Practices for Sidebar Menu 2025](https://uiuxdesigntrends.com/best-ux-practices-for-sidebar-menu-in-2025/) — MEDIUM confidence (WebSearch)
- [Personal Finance Apps: What Users Expect in 2025](https://www.wildnetedge.com/blogs/personal-finance-apps-what-users-expect-in-2025) — MEDIUM confidence (WebSearch)
- [Recurring Payments in Digital Banking](https://www.tapix.io/resources/post/recurring-payments-in-digital-banking) — MEDIUM confidence (WebSearch)
- [Fintech UX Best Practices 2026](https://www.eleken.co/blog-posts/fintech-ux-best-practices) — MEDIUM confidence (WebSearch)

---

*Feature research for: Navigation restructure, Account Vault, Payment Type Selector, Schema Viewer, Help Page*
*Researched: 2026-02-22*

# Feature Landscape: Statement Hub

**Domain:** Statement management and transaction browsing for personal finance
**Milestone:** v2.0 Statement Hub (batch import, data retention, statement browser)
**Researched:** 2026-02-08
**Overall Confidence:** HIGH

## Executive Summary

Statement management in financial apps has evolved from simple import tools to comprehensive data hubs that enable historical analysis and manual enrichment. Research reveals three critical insights for the Statement Hub milestone:

1. **Batch import is table stakes, not a differentiator** - Users expect to upload 12+ months of statements at once. Single-file upload in 2026 feels antiquated. Drag-and-drop with progress indicators is the expected baseline UX.

2. **Statement data retention enables the real differentiator: manual enrichment** - Keeping ALL line items (not just extracted subscriptions) allows users to browse historical data, manually tag potential subscriptions, and strengthen pattern detection. This transforms import from a one-time extraction to an ongoing enrichment workflow.

3. **The anti-feature trap: don't build automatic reconciliation** - Enterprise software tries to auto-match transactions across sources. For personal finance, this adds complexity users don't need. Users want to browse their statements and manually tag items they care about, not debug matching rules.

Based on analysis of leading fintech apps (MoneyWiz, PocketGuard, Expensify, YNAB), enterprise reconciliation tools (Reiterate, M2P Recon360), and UX best practices for file upload and transaction browsing, this research categorizes Statement Hub features into table stakes (expected baseline), differentiators (competitive advantage), and anti-features (deliberately avoid).

## Table Stakes Features

Features users EXPECT in statement management. Missing these makes the product feel incomplete or outdated.

### 1. Batch PDF Upload (Multiple Files at Once)

**Why Expected:** In 2026, users have 12+ months of statements saved. Forcing them to upload one at a time is tedious and dated. Every modern fintech app supports batch uploads.

**Complexity:** Medium
- File upload UI with drag-and-drop zone
- Multiple file selection from system dialog
- Client-side file validation (PDF only, size limits)
- Queue management for sequential processing
- Progress tracking per file and overall batch

**User Expectations:**
- Drag multiple PDFs onto upload zone OR click to select multiple files
- See list of queued files before starting import
- Progress indicators per file (extracting, processing, complete)
- Ability to cancel individual files or entire batch
- Clear error messages if a file fails (with option to retry)

**Existing Foundation:**
- Single PDF import with OpenAI extraction already works (v1.1)
- Confidence scoring system already implemented
- Statement source tracking already in place

**Dependencies:**
- Extends existing PDF import flow (not a rewrite)
- Requires queue management for sequential OpenAI API calls (avoid rate limits)
- Needs batch progress UI component

**References:**
- [Uploadcare: File Uploader UX Best Practices](https://uploadcare.com/blog/file-uploader-ux-best-practices/)
- [Smart Interface Design: Drag-and-Drop Guidelines](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)
- [NetSuite: Bank Data Import Best Practices](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N1550803.html)

---

### 2. Statement Data Retention (All Line Items Stored)

**Why Expected:** Users want to reference historical transactions, not just imported subscriptions. "What was that $45 charge in July?" should be answerable by browsing statements, not re-opening PDFs.

**Complexity:** Medium
- New database table: `statement_items` (all extracted line items)
- Relationship to `statements` table (source tracking)
- Storage considerations (estimate 50-200 items per statement)
- Migration path for existing imports (no retroactive data)

**User Expectations:**
- All transactions from uploaded statements are browsable
- Data persists indefinitely (or until user deletes source)
- Historical data is searchable and filterable
- Items show merchant name, amount, date, source statement

**Database Schema Design:**

```typescript
statement_items {
  id: uuid (primary key)
  statement_id: uuid (foreign key → statements table)
  user_id: uuid (foreign key → users table)

  // Extracted data from PDF
  merchant_name: text
  amount: decimal
  currency: text
  transaction_date: date
  description: text (raw statement description)

  // Enrichment
  category_id: uuid (nullable, user can categorize)
  is_potential_subscription: boolean (AI/user tagged)
  converted_to_subscription_id: uuid (nullable, if imported)
  manually_tagged_at: timestamp (nullable)

  // Metadata
  confidence_score: decimal (0-1, from AI extraction)
  created_at: timestamp
}
```

**Dependencies:**
- Extends existing OpenAI extraction to store ALL items, not just high-confidence
- Requires database migration to add `statement_items` table
- Impacts import flow: now saves to two tables (subscriptions + statement_items)

**Storage Implications:**
- 12 months × 1 statement/month × 100 items/statement = 1,200 items/user/year
- Text fields are small (merchant names ~50 chars, description ~200 chars)
- Estimate ~500 bytes/item → 600KB/user/year (negligible)

**References:**
- [CFPB Personal Financial Data Rights Rule](https://www.venable.com/insights/publications/2024/10/navigating-cfpb-personal-financial-data-rights) - Mandates 24 months of transaction data retention for covered entities
- [Financial Data Retention Policies](https://atlan.com/know/data-governance/data-retention-policies-in-finance/) - Industry standards for transaction retention

---

### 3. Transaction Browsing UI (Filter, Search, Sort)

**Why Expected:** If you retain statement data, users MUST be able to browse it. A list of 1,200 transactions with no filtering is unusable.

**Complexity:** Medium
- Transaction list component with pagination/virtualization
- Filter controls (date range, merchant, category, source)
- Search bar (merchant name, description)
- Sort options (date, amount, merchant)
- Empty state when no transactions match filters

**User Expectations:**
- See all transactions from all statements in one list
- Filter by date range (custom range picker)
- Filter by merchant name (dropdown or autocomplete)
- Filter by category (if user has categorized items)
- Filter by statement source (which bank/card)
- Search by merchant name or description text
- Sort by date (newest first is default), amount, merchant name
- Click transaction to see details or take actions

**UI/UX Patterns (from research):**

**MoneyWiz 2026:**
- Transactions grouped by date for easier browsing
- Button group to filter by status (cleared, pending, upcoming)
- Icons show both account and category
- Custom date range picker

**PocketGuard:**
- All transactions from all institutions in one list
- Filter by type, merchant, category
- 70+ custom categories for granular filtering

**Daily Ledger:**
- Transactions grouped by date
- Category-based filtering
- Analytics for custom date ranges

**Expensify:**
- SmartScan pulls merchant names and amounts
- Categorizes expenses automatically
- Flags duplicates

**Dependencies:**
- Requires `statement_items` table (Feature #2)
- Needs index on `user_id + transaction_date` for fast queries
- Consider using TanStack Virtual for large lists (>1,000 items)

**Performance Considerations:**
- Paginate results (50-100 items per page)
- Use database indexes on filter columns
- Consider virtualized scrolling for infinite scroll UX

**References:**
- [MoneyWiz 2026](https://apps.apple.com/us/app/moneywiz-2026-personal-finance/id1511185140)
- [PocketGuard Features](https://pocketguard.com/)
- [Financial Panther: Personal Finance App Features 2026](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/)

---

### 4. Duplicate Detection During Import

**Why Expected:** Users don't want to import the same subscription twice. This was already implemented in v1.3, but must extend to statement-level duplicates (same statement uploaded twice).

**Complexity:** Low (already exists for subscriptions, extend to statements)

**Current State:**
- ✅ Duplicate detection for subscriptions (v1.3)
- ✅ Levenshtein distance similarity (70% threshold)
- ❌ No duplicate detection for statements (can upload same PDF twice)

**Extension Needed:**
- Check if statement from same source + date range already exists
- Warn user before processing duplicate statement
- Option to skip duplicate or re-import (updates existing data)

**User Expectations:**
- Warning dialog: "You already imported a Chase statement for December 2025. Import again?"
- Options: "Skip" or "Re-import (replaces existing data)"
- No silent duplicates (always prompt user)

**Implementation Approach:**
- Hash PDF file contents OR check source + date range overlap
- Query existing statements for user + source + overlapping dates
- Show warning UI if match found
- User chooses action: skip, replace, or keep both

**Dependencies:**
- Requires statement source and date range metadata (already captured in v1.1)

**References:**
- [AI Accountant: Duplicate Transaction Detection](https://www.aiaccountant.com/blog/detect-duplicate-bank-transactions)
- [Reiterate Fintech: Duplicate Detection](https://www.reiterate.com/industries/fintech)

---

### 5. Drag-and-Drop File Upload UX

**Why Expected:** Drag-and-drop is the standard for file uploads in 2026. Users expect to drag PDFs from their desktop directly onto the upload zone.

**Complexity:** Low (well-supported by libraries)

**User Expectations:**
- Large drop zone with clear visual indication (dashed border, icon)
- Hover state when dragging files over zone (highlight, "Drop files here")
- Visual feedback when files are dropped (success animation)
- Alternative: click to open file dialog (for users who prefer browsing)
- Support for both drag-and-drop AND click-to-browse

**Accessibility Considerations:**
- Keyboard navigation support (tab to button, Enter to open dialog)
- Screen reader announces "Drop files here or click to browse"
- Alternative upload method for keyboard-only users

**UX Best Practices (from research):**

**Visual Design:**
- Prominent dashed border indicating drop zone
- Icon (file or upload arrow) with helper text
- Clear "or click to browse" button
- Distinct hover state when dragging (blue border, elevated shadow)

**Interaction States:**
- Default: Neutral, inviting
- Hover (during drag): Highlighted, magnetic effect
- Dropped: Brief success animation (fade-in list of files)
- Error: Red border, error message (e.g., "PDF files only")

**Progress Indicators:**
- Per-file progress bars with percentage
- Overall batch progress (e.g., "Processing 5 of 12 files")
- Estimated time remaining (optional, if predictable)

**File Validation:**
- Client-side: Check file type (PDF only), size limit (e.g., 10MB)
- Show errors immediately (before upload starts)
- Allow removing invalid files from queue

**Libraries:**
- react-dropzone (popular, accessible, well-documented)
- Native HTML5 drag-and-drop API (more control, more complexity)

**Dependencies:**
- None (standalone UI component)

**References:**
- [Uploadcare: File Uploader UX Best Practices](https://uploadcare.com/blog/file-uploader-ux-best-practices/)
- [LogRocket: Drag-and-Drop UI Design](https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/)
- [Mobbin: File Uploader UI Design](https://mobbin.com/glossary/drop-zone-file-uploader)

---

### 6. Progress Indicators for Batch Processing

**Why Expected:** When processing 12 PDFs with OpenAI API calls, users need feedback. Silent processing feels broken.

**Complexity:** Medium

**User Expectations:**
- Per-file status: Queued → Extracting → Processing → Complete
- Overall batch progress: "Processing 3 of 12 files (25%)"
- Ability to cancel in-progress batch (stop queued files, let current finish)
- Errors don't stop entire batch (failed file shown, others continue)

**UI Patterns:**
- List of files with status badges (Queued, Processing, Complete, Failed)
- Progress bar per file (indeterminate spinner during extraction)
- Overall progress bar at top (e.g., "8 of 12 complete")
- Success summary: "Imported 127 transactions from 12 statements"

**Technical Implementation:**
- Client polls API for batch job status (every 2s)
- Server stores batch state in database or Redis (job ID → status)
- WebSocket alternative (real-time updates, no polling)

**Error Handling:**
- Failed file shown with error message ("OpenAI API error: rate limit exceeded")
- Option to retry failed file individually
- Successful files remain imported (partial success is OK)

**Dependencies:**
- Batch job queue (process PDFs sequentially to respect OpenAI rate limits)
- Status polling API endpoint
- Client-side state management for tracking progress

**References:**
- [File Upload UX Best Practices](https://megainterview.com/file-upload-ux-best-practices/)
- [Microsoft Dynamics: Automatic Bank Statement Import](https://learn.microsoft.com/en-us/dynamics365/release-plan/2023wave2/finance-supply-chain/dynamics365-finance/automatic-bank-statement-importing)

---

## Differentiators

Features that set Statement Hub apart from basic import tools. These provide competitive advantage.

### 7. Manual Transaction Tagging (Mark as Potential Subscription)

**Why Differentiating:** Most apps only show automatically detected subscriptions. Letting users manually tag items as "potential subscriptions" enables collaborative intelligence—user's domain knowledge + AI's pattern recognition.

**Complexity:** Low
- Add `is_potential_subscription` flag to statement_items
- UI: "Tag as subscription" button on transaction row
- Filter option: "Show only potential subscriptions"

**User Value:**
- User sees $15 charge from "ACME Digital Services" but AI didn't flag it
- User clicks "Tag as potential subscription"
- Item appears in "Review potential subscriptions" section
- User can convert tagged items to subscriptions with one click

**UX Pattern:**
- Transaction list row has action menu (three dots)
- Options: "Tag as subscription", "Categorize", "Hide"
- Tagged items get visual badge (e.g., yellow star icon)
- Bulk actions: Select multiple items → "Tag all as potential subscriptions"

**Intelligence Feedback Loop:**
- Tagged items improve AI pattern detection (user is teaching the system)
- Future imports from same merchant auto-tagged with higher confidence

**Dependencies:**
- Requires transaction browsing UI (Feature #3)
- Requires `statement_items` table with tagging column (Feature #2)

**References:**
- [Modern Treasury: Transaction Tagging](https://www.moderntreasury.com/journal/transaction-tagging-transforming-raw-bank-data-into-real-insights)
- [Financial Panther: Personal Finance App Features 2026](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/)

---

### 8. Manual Conversion (Any Statement Item → Subscription)

**Why Differentiating:** AI misses things. Users should be able to convert ANY transaction into a subscription, even if AI scored it low confidence.

**Complexity:** Medium
- UI: "Convert to subscription" action on transaction row
- Pre-fill subscription form with transaction data (merchant, amount, date)
- Link statement_item to created subscription (track conversion)

**User Flow:**
1. User browses statements
2. Sees $9.99 charge from "Digital News Co" (AI scored 30% confidence)
3. Clicks "Convert to subscription"
4. Form opens with fields pre-filled:
   - Name: "Digital News Co"
   - Amount: $9.99
   - Currency: USD
   - Renewal date: [calculated from transaction date]
   - Frequency: Monthly (default, user can change)
   - Category: News & Media (suggested, user can change)
5. User edits if needed, clicks Save
6. Subscription created, transaction marked as converted

**Data Model:**
- `statement_items.converted_to_subscription_id` → tracks conversion
- Converted items hidden from "potential subscriptions" filter
- Conversion is reversible (delete subscription, item reappears)

**Benefits:**
- Fixes AI false negatives (user can override low confidence scores)
- Reduces friction (no need to manually enter subscription from scratch)
- Creates audit trail (which subscriptions came from which statements)

**Dependencies:**
- Requires transaction browsing UI (Feature #3)
- Requires subscription creation API (already exists)
- Requires linking statement_item to subscription (database column)

**References:**
- [Koody: Personal Finance App CSV Import](https://koody.com/blog/personal-finance-app-csv-import) - Describes bulk editing and categorization workflows
- [Financial Panther: Personal Finance App Features](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/)

---

### 9. Source Dashboard (Overview Cards per Statement Source)

**Why Differentiating:** Users upload statements from multiple banks and cards. A dashboard showing "Chase Visa: 8 statements, Jan 2024 - Dec 2024" provides quick overview of data coverage.

**Complexity:** Low
- Aggregate statements by source
- Show count, date range, total transactions per source
- Click to filter transactions by source

**UI Design:**
- Grid of cards, one per statement source
- Each card shows:
  - Source name (e.g., "Chase Sapphire")
  - Statement count (e.g., "12 statements")
  - Coverage dates (e.g., "Jan 2024 - Dec 2024")
  - Total line items (e.g., "1,247 transactions")
  - Last imported (e.g., "2 days ago")
- Click card → filters transaction browser to that source

**User Value:**
- Quick assessment: "Do I have 12 months of data for all my accounts?"
- Identify gaps: "I'm missing June 2024 for Amex"
- Compare sources: "Chase has 1,200 transactions, Amex has 200" (shows spending patterns)

**Dependencies:**
- Requires statement source tracking (already exists in v1.1)
- Requires aggregation query (GROUP BY source)

**References:**
- [Financial Apps: Dashboard Design Best Practices](https://thecfoclub.com/tools/best-financial-statement-software/)
- [Fintech UX Best Practices 2026](https://www.eleken.co/blog-posts/fintech-ux-best-practices)

---

### 10. AI Suggestions (Highlight Likely Subscriptions Not Yet Added)

**Why Differentiating:** Pattern detection already exists (v1.3), but Statement Hub extends it: scan ALL statement items (not just imports) and suggest subscriptions user might have missed.

**Complexity:** Medium
- Query statement_items for recurring patterns (same merchant, similar amount, monthly frequency)
- Exclude items already converted to subscriptions
- Surface suggestions in dedicated UI section
- User can accept (converts to subscription) or dismiss (hides suggestion)

**Pattern Detection Logic:**
- Same merchant appears 3+ times with consistent frequency (e.g., monthly)
- Amount is stable (within ±20%)
- Not already tagged or converted
- Confidence score based on:
  - Frequency consistency (80% weight)
  - Amount consistency (10% weight)
  - Merchant name quality (10% weight)

**UI Design:**
- "Suggested Subscriptions" section on dashboard
- List of suggestions with confidence scores
- Each suggestion shows:
  - Merchant name
  - Average amount
  - Frequency (e.g., "Monthly, last 6 months")
  - Action buttons: "Add as Subscription" or "Dismiss"

**User Value:**
- Discovers subscriptions user forgot to import manually
- Proactive (surfaces insights without user searching)
- Low friction (one-click to add)

**Risk Mitigation:**
- Show evidence (list of matching transactions)
- Let user edit before adding (pre-filled form, not auto-added)
- Dismissals are permanent (don't re-suggest)

**Dependencies:**
- Requires pattern detection algorithm (already exists in v1.3)
- Extends pattern detection to scan statement_items, not just imported subscriptions
- Requires UI section for displaying suggestions

**References:**
- [Transaction Data Enrichment & Categorization](https://zafin.com/transaction-enrichment/)
- [AI-Powered Transaction Analysis](https://chrisbateson80.medium.com/fintech-app-development-emerging-trends-that-will-shape-2026-c7f30480471b)

---

### 11. Re-Import Capability (Import Skipped Items from Previous Statements)

**Why Differentiating:** During initial import, user might skip low-confidence items. Later, they realize "that was actually a subscription." Re-import lets them go back to any previous statement and import skipped items.

**Complexity:** Medium
- Statement detail view: shows all items from that statement
- Visual indicator: which items are imported, which are not
- Action: "Import this item" button on unimported items
- Opens subscription form pre-filled with item data

**User Flow:**
1. User goes to "Statements" page (list of uploaded PDFs)
2. Clicks on "Chase Visa - December 2024"
3. Sees all line items from that statement:
   - ✅ Imported items (green checkmark, linked to subscription)
   - ⭕ Skipped items (gray, with "Import" button)
4. User clicks "Import" on skipped $12 charge from "Streaming Co"
5. Subscription form opens with pre-filled data
6. User confirms, saves
7. Item now shows as imported (✅ checkmark)

**Technical Implementation:**
- Query statement_items WHERE statement_id = X
- JOIN with subscriptions to determine imported vs skipped
- "Import" button triggers same conversion flow as Feature #8

**User Value:**
- No data loss (all statement data is preserved)
- Second chance (user can fix initial import mistakes)
- Reduces pressure during initial import (user knows they can go back)

**Dependencies:**
- Requires statement detail view (new page/modal)
- Requires statement_items table with conversion tracking
- Reuses manual conversion flow (Feature #8)

**References:**
- [NetSuite: Bank Statement Import](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N1550803.html)
- [Microsoft Dynamics: Bank Statement Import Troubleshooting](https://learn.microsoft.com/en-us/dynamics365/finance/cash-bank-management/import-bank-statement-file-failed-incorrect-results)

---

### 12. Historical Data Strengthens Pattern Detection

**Why Differentiating:** More data = better patterns. With 12 months of statement data, pattern detection becomes significantly more accurate.

**Complexity:** Low (leverages existing pattern detection from v1.3)

**How It Works:**
- Pattern detection (v1.3) scans imported subscriptions for recurring charges
- Statement Hub extends this: scan statement_items table (ALL transactions, not just subscriptions)
- With 12 months of data, can detect:
  - True monthly subscriptions (12 occurrences)
  - Quarterly subscriptions (4 occurrences)
  - Annual subscriptions (1 occurrence, but high confidence if amount is large)
  - Variable subscriptions (amount changes, but frequency is consistent)

**Example:**
- User imports 12 months of Chase statements (1,200 transactions)
- Pattern detection finds "Spotify" appears 12 times, $9.99, always around 15th of month
- Confidence score: 95% (high frequency, consistent amount, regular timing)
- Suggestion: "Spotify - $9.99/month" appears in AI suggestions section

**User Value:**
- More accurate suggestions (12 data points vs 1-2)
- Finds subscriptions user forgot about (e.g., annual subscriptions that renewed once last year)
- Reduces false positives (one-time charges don't appear as patterns)

**Technical Notes:**
- Reuses existing pattern detection algorithm (v1.3)
- Query change: scan statement_items instead of just subscriptions
- Performance: index on statement_items.merchant_name for fast grouping

**Dependencies:**
- Requires statement_items table (Feature #2)
- Extends existing pattern detection (v1.3 feature)

**References:**
- [AI Reconciliation Use Cases](https://www.ledge.co/content/ai-reconciliation)
- [Transaction Monitoring: Data Quality](https://www.abrigo.com/blog/transaction-monitoring-data-quality-in-banking-makes-the-difference)

---

## Anti-Features

Features to DELIBERATELY NOT BUILD. Common in enterprise software, but add complexity without value for personal finance use case.

### ❌ Automatic Reconciliation Across Multiple Sources

**What It Is:** Automatically match transactions from multiple bank accounts to find duplicates (e.g., transfer from checking to savings appears in both statements).

**Why Avoid:**
- **Complexity explosion:** Matching rules are complex and error-prone
- **Low value for personal finance:** Users don't need to reconcile accounts (they just want to track subscriptions)
- **High maintenance burden:** Banks change transaction formats, breaking matching rules
- **User confusion:** False positives create "why did this match?" questions

**What to Do Instead:**
- Let users import statements from multiple sources WITHOUT attempting to reconcile
- If duplicate subscriptions exist, duplicate detection (Feature #4) handles it
- Manual tagging (Feature #7) lets users decide what matters

**References:**
- [12 Best Reconciliation Tools 2026](https://www.solvexia.com/blog/5-best-reconciliation-tools-complete-guide) - Describes enterprise complexity
- [AI Bank Reconciliation](https://www.ccmonet.ai/blog/how-ai-bank-reconciliation-works-matching-rules-exceptions-and-accuracy) - Shows matching rule complexity

---

### ❌ Automated Cash Application

**What It Is:** Automatically generate payments and apply them to open invoices (common in B2B accounts receivable).

**Why Avoid:**
- **Wrong domain:** This is for B2B, not personal subscription tracking
- **No invoices to match:** Users don't have "open invoices" for subscriptions
- **Over-engineering:** Subscriptions are simple (recurring charge), no need for payment application logic

**What to Do Instead:**
- Keep subscription tracking simple: recurring amount + frequency + renewal date
- Don't try to match statement transactions to individual subscription charges (unnecessary complexity)

**References:**
- [NetSuite: Automated Cash Application](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N1550803.html) - Enterprise feature, not relevant for consumer apps

---

### ❌ Multi-Currency Reconciliation

**What It Is:** Convert all transactions to a base currency with real-time exchange rates for accurate reconciliation across currencies.

**Why Avoid:**
- **Scope creep:** Statement Hub is for US-focused subscription tracking (most subscriptions are USD)
- **Added complexity:** Exchange rate APIs, caching, historical rates
- **Low user demand:** Most users have subscriptions in one currency

**What to Do Instead:**
- Store transaction currency as-is (already implemented in v1.1)
- Display amounts in original currency (no conversion needed for browsing)
- If multi-currency analytics needed later, use materialized view with static monthly FX rates (don't overcomplicate)

**References:**
- [M2P Fintech: Digital Reconciliation](https://m2pfintech.com/blog/how-digital-reconciliation-is-redefining-financial-operations/) - Enterprise complexity

---

### ❌ Transaction-Level Commenting/Notes

**What It Is:** Let users add notes to individual statement line items (e.g., "This was a gift" or "Split with roommate").

**Why Avoid:**
- **Low usage:** Research shows <5% of transactions get commented in personal finance apps
- **UI clutter:** Adds complexity to transaction rows (comment icon, modal, state management)
- **Maintenance burden:** Need to handle comment CRUD, display, search
- **Alternative exists:** Users can add notes to subscriptions (more valuable than per-transaction notes)

**What to Do Instead:**
- Allow notes on subscriptions (already exists)
- Use tagging (Feature #7) for marking potential subscriptions (specific action, not freeform notes)
- If user needs to remember something about a transaction, they can convert it to a subscription with notes

**References:**
- [Personal Finance App Features 2026](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/) - Notes are rarely mentioned as core features

---

### ❌ Automatic Category Learning (ML-Based)

**What It Is:** Train ML model on user's categorization behavior to automatically categorize future transactions.

**Why Avoid:**
- **Premature optimization:** Subscription tracking doesn't need transaction categorization (categories apply to subscriptions, not line items)
- **Cold start problem:** Need 100+ categorizations to train model
- **Black box:** Users don't understand why transaction got categorized
- **Maintenance:** Model retraining, versioning, explainability

**What to Do Instead:**
- Categories apply to subscriptions, not statement items
- Use AI confidence scoring for suggesting subscriptions (Feature #10), not categorization
- Let users manually categorize statement items if needed (optional, lightweight)

**References:**
- [Transaction Categorization: How it Works](https://www.getfocal.ai/knowledgebase/what-is-transaction-categorization) - Describes ML complexity
- [Financial Panther: Personal Finance App Features](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/) - Emphasizes simple, understandable categorization

---

### ❌ Real-Time Import (Bank Connection/Plaid Integration)

**What It Is:** Connect directly to user's bank account via Plaid/Finicity to automatically import transactions in real-time.

**Why Avoid:**
- **Massive scope increase:** Plaid integration, OAuth flows, account linking, credential management, error handling
- **Security/privacy concerns:** Storing bank credentials (even via Plaid) increases liability
- **Ongoing maintenance:** Bank connections break, require re-authentication
- **Out of scope for MVP:** Statement Hub focuses on PDF import (user controls data sharing)

**What to Do Instead:**
- Stick with PDF import (user uploads statements manually)
- Batch import (Feature #1) makes manual upload less tedious
- Future milestone consideration (if user demand is high)

**References:**
- [Fintech Trends 2026: Embedded Finance](https://innowise.com/blog/fintech-trends/) - Describes Plaid complexity
- [CFPB Personal Financial Data Rights Rule](https://www.venable.com/insights/publications/2024/10/navigating-cfpb-personal-financial-data-rights) - Regulatory implications

---

### ❌ Transaction Splitting

**What It Is:** Split a single transaction into multiple categories or accounts (e.g., $100 dinner split as $60 Food + $40 Entertainment).

**Why Avoid:**
- **Wrong use case:** Subscriptions are discrete charges, not split expenses
- **UI complexity:** Split UI is complex (multiple amount inputs, validation)
- **Low value:** Users tracking subscriptions don't need to split charges (they want full subscription amounts)

**What to Do Instead:**
- If a charge covers multiple subscriptions (rare), import as separate subscriptions
- Don't try to split statement line items (adds complexity without value)

**References:**
- [AI Reconciliation: Exception Handling](https://www.ledge.co/content/ai-reconciliation) - Describes split transaction complexity in enterprise tools

---

### ❌ Budget Tracking (Spending Limits per Category)

**What It Is:** Set spending limits per category, alert when user exceeds budget.

**Why Avoid:**
- **Feature creep:** Statement Hub is about RETAINING and BROWSING data, not budgeting
- **Overlaps with existing features:** Spending forecasting (v1.3) already shows projected spending
- **Different product direction:** Budgeting apps (YNAB, Mint) are separate category; Subscription Manager focuses on subscription tracking

**What to Do Instead:**
- Keep focus on subscription tracking and statement data retention
- Forecasting (v1.3) provides forward-looking spending insights without rigid budgets
- If budgeting needed, consider future milestone (separate scope)

**References:**
- [YNAB vs PocketGuard](https://www.nerdwallet.com/finance/learn/best-budget-apps) - Shows budgeting is distinct feature set
- [Financial Panther: App Features](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/)

---

## Feature Dependencies

Visual representation of how Statement Hub features build on each other:

```
Foundation (Must Build First):
├─ Batch PDF Upload (#1)
│  └─ Progress Indicators (#6)
│     └─ Drag-and-Drop UX (#5)
│
└─ Statement Data Retention (#2)
   └─ Database: statement_items table
      ├─ Transaction Browsing UI (#3)
      │  ├─ Duplicate Detection (extended) (#4)
      │  ├─ Manual Tagging (#7)
      │  ├─ Manual Conversion (#8)
      │  └─ Re-Import Capability (#11)
      │
      ├─ Source Dashboard (#9)
      │  └─ Aggregation queries on statements table
      │
      └─ AI Suggestions (#10)
         └─ Historical Pattern Detection (#12)
            └─ Extends v1.3 pattern detection to statement_items
```

**Build Order:**

**Phase 1: Foundation (Week 1-2)**
- Feature #2: Statement Data Retention (database schema)
- Feature #1: Batch PDF Upload (extend existing import)
- Feature #5: Drag-and-Drop UX (upload UI)
- Feature #6: Progress Indicators (batch processing feedback)

**Phase 2: Browsing & Enrichment (Week 3-4)**
- Feature #3: Transaction Browsing UI (list, filters, search)
- Feature #4: Duplicate Detection (extend to statements)
- Feature #7: Manual Tagging (flag potential subscriptions)
- Feature #8: Manual Conversion (any item → subscription)

**Phase 3: Intelligence & Re-Import (Week 5-6)**
- Feature #9: Source Dashboard (overview cards)
- Feature #11: Re-Import Capability (statement detail view)
- Feature #12: Historical Pattern Detection (extend v1.3)
- Feature #10: AI Suggestions (recurring pattern suggestions)

---

## MVP Recommendations

For Statement Hub MVP, prioritize features that deliver immediate user value with minimal complexity.

### Must Have for MVP (Ship Week 4):

1. **Batch PDF Upload (#1)** - Core feature, user expectation
2. **Statement Data Retention (#2)** - Foundation for all other features
3. **Transaction Browsing UI (#3)** - Must be able to see retained data
4. **Drag-and-Drop UX (#5)** - Standard UX expectation
5. **Progress Indicators (#6)** - Required for batch processing feedback
6. **Duplicate Detection (#4)** - Prevent data quality issues

**Rationale:** These 6 features transform import from single-file to batch-with-retention. Users can upload 12 statements, browse all transactions, and avoid duplicates. This is a complete, valuable feature set.

### Should Have for MVP (Ship Week 6):

7. **Manual Tagging (#7)** - Enables user to enrich data
8. **Manual Conversion (#8)** - Fixes AI false negatives
9. **Source Dashboard (#9)** - Quick overview of data coverage

**Rationale:** These 3 features add manual enrichment capabilities, making Statement Hub collaborative (user + AI). Not strictly necessary for MVP, but high value/complexity ratio.

### Defer to Post-MVP:

10. **AI Suggestions (#10)** - Valuable but requires pattern detection refinement
11. **Re-Import Capability (#11)** - Nice-to-have, not critical (users can convert items from browser)
12. **Historical Pattern Detection (#12)** - Extends existing feature, not new value

**Rationale:** These features provide incremental value but can ship later. AI suggestions require testing to avoid false positives. Re-import is covered by manual conversion (user can convert any item, with or without re-import flow). Historical pattern detection is an enhancement to existing v1.3 feature.

---

## Complexity Assessment

| Feature | Complexity | Why | Estimated Effort |
|---------|------------|-----|------------------|
| #1 Batch PDF Upload | Medium | Queue management, sequential API calls, error handling | 3-4 days |
| #2 Statement Data Retention | Medium | Database schema, migration, storage implications | 2-3 days |
| #3 Transaction Browsing UI | Medium | Filters, search, sort, pagination, virtualization | 4-5 days |
| #4 Duplicate Detection | Low | Extend existing algorithm to statements | 1-2 days |
| #5 Drag-and-Drop UX | Low | react-dropzone library, standard pattern | 1-2 days |
| #6 Progress Indicators | Medium | Status polling, UI state management, error handling | 2-3 days |
| #7 Manual Tagging | Low | Database flag, UI button, filter | 1-2 days |
| #8 Manual Conversion | Medium | Pre-fill form, link statement_item to subscription | 2-3 days |
| #9 Source Dashboard | Low | Aggregation query, card grid UI | 1-2 days |
| #10 AI Suggestions | Medium | Pattern detection extension, suggestion UI, dismiss logic | 3-4 days |
| #11 Re-Import Capability | Medium | Statement detail view, import status tracking | 2-3 days |
| #12 Historical Pattern Detection | Low | Query change (scan statement_items), reuse v1.3 algorithm | 1-2 days |

**Total Effort Estimate:**
- Must Have (MVP Week 4): 13-19 days → ~3-4 weeks with testing/polish
- Should Have (MVP Week 6): 4-7 days → +1 week
- Defer to Post-MVP: 6-9 days → future milestone

---

## Common Pitfalls to Avoid

Based on research into statement import and transaction browsing features, these are common mistakes teams make:

### 1. Debit/Credit Confusion

**Problem:** Banks represent debits and credits differently. Importing without normalization causes amounts to appear with wrong sign (expense shows as income).

**Prevention:**
- Normalize during extraction: expenses are always negative, income always positive
- Test with multiple bank statement formats
- Add validation: "Does this look right?" step after extraction

**References:**
- [Microsoft Dynamics: Statement Import Troubleshooting](https://learn.microsoft.com/en-us/dynamics365/finance/cash-bank-management/import-bank-statement-file-failed-incorrect-results)

---

### 2. Transaction Volume Underestimation

**Problem:** Team assumes 50-100 transactions per statement, builds UI that breaks with 500+ transactions.

**Prevention:**
- Test with realistic data volumes (100-500 transactions per statement)
- Use pagination or virtualization (TanStack Virtual) from day one
- Add database indexes on filter columns before launch

**References:**
- [NetSuite: Bank Statement Import Volume Limits](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N1550803.html) - "Do not exceed 10,000 transactions per import"

---

### 3. No Validation During Import

**Problem:** Import pipeline accepts malformed data, causes errors downstream (null amounts, invalid dates, missing merchant names).

**Prevention:**
- Validate during extraction (OpenAI response schema)
- Add database constraints (NOT NULL on critical columns)
- Show validation errors to user during import (don't fail silently)

**References:**
- [Financial Data Quality Issues](https://atlan.com/data-quality-issues/)
- [Bank Reconciliation: Data Quality](https://www.abrigo.com/blog/transaction-monitoring-data-quality-in-banking-makes-the-difference)

---

### 4. Overwhelming Users with Too Much Data

**Problem:** User uploads 12 statements (1,200 transactions) and sees an overwhelming list with no guidance.

**Prevention:**
- Default to filtered view (e.g., "Potential subscriptions only")
- Progressive disclosure (show summary stats first, details on demand)
- Onboarding flow guides user: "Here are 15 suggested subscriptions. Review them first, then browse all transactions."

**References:**
- [NerdWallet: Budget Apps 2026](https://www.nerdwallet.com/finance/learn/best-budget-apps) - "Beginners might feel overwhelmed by lots of features"
- [Netguru: Financial App Mistakes](https://www.netguru.com/blog/mistakes-in-creating-finance-app) - "Show only relevant information"

---

### 5. Duplicate Imports Without Warning

**Problem:** User uploads same statement twice, creates duplicate transactions, causes confusion ("Why do I see two $9.99 Netflix charges?").

**Prevention:**
- Hash PDF contents OR check source + date range before processing
- Show warning: "You already imported this statement. Import again or skip?"
- Log import history (statement source + upload date + file hash)

**References:**
- [AI Accountant: Duplicate Detection](https://www.aiaccountant.com/blog/detect-duplicate-bank-transactions)

---

### 6. Missing Daily Reconciliation

**Problem:** Import failures go unnoticed for days, causing data gaps.

**Prevention:**
- Log all imports with status (success, failed, partial)
- Add "Import History" page showing last 30 days of imports
- Email admin if import fails (or show in-app notification)

**References:**
- [Bank Reconciliation: Common Problems](https://www.kolleno.com/5-bank-reconciliation-statement-problems-and-how-to-solve-them/)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table Stakes Features | HIGH | Drag-and-drop batch upload, transaction browsing, and duplicate detection are universally expected based on research of 10+ fintech apps |
| Differentiators | MEDIUM | Manual enrichment (tagging, conversion) is validated by research (Koody, Modern Treasury), but AI suggestions require testing to avoid false positives |
| Anti-Features | HIGH | Automatic reconciliation, transaction splitting, and budgeting are confirmed as out-of-scope based on domain analysis and project focus |
| Complexity Estimates | MEDIUM | Based on existing v1.3 codebase analysis, but batch upload queue management may surface unexpected edge cases |
| UX Best Practices | HIGH | Drag-and-drop, progress indicators, and filtering patterns are well-documented with multiple authoritative sources |

---

## Sources

### Fintech App Features & Best Practices
- [Key Features Every Personal Finance App Needs in 2026 - Financial Panther](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/)
- [Fintech UX Best Practices 2026: Build Trust & Simplicity](https://www.eleken.co/blog-posts/fintech-ux-best-practices)
- [18 Best Financial Statement Software Reviewed in 2026](https://thecfoclub.com/tools/best-financial-statement-software/)
- [Top Fintech Apps for 2026: Compare Features & Ratings](https://www.nimbleappgenie.com/blogs/top-fintech-apps/)

### Transaction Browsing & Filtering
- [MoneyWiz 2026 Personal Finance App](https://apps.apple.com/us/app/moneywiz-2026-personal-finance/id1511185140)
- [PocketGuard: Budgeting App & Finance Planner](https://pocketguard.com/)
- [Daily Ledger: Just Expenses App](https://apps.apple.com/il/app/daily-ledger-just-expenses/id1373021367)
- [Personal Finance App With CSV Import | Koody](https://koody.com/blog/personal-finance-app-csv-import)

### File Upload & Drag-and-Drop UX
- [UX Best Practices for Designing a File Uploader | Uploadcare](https://uploadcare.com/blog/file-uploader-ux-best-practices/)
- [Drag and Drop UI Examples and UX Tips](https://www.eleken.co/blog-posts/drag-and-drop-ui)
- [Drag-and-Drop UX: Guidelines and Best Practices](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)
- [File Upload UX Best Practices - Top 10](https://megainterview.com/file-upload-ux-best-practices/)
- [File Uploader UI Design: Best Practices & Examples | Mobbin](https://mobbin.com/glossary/drop-zone-file-uploader)

### Statement Import & Batch Processing
- [Import Bank Statement Automatically | Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/release-plan/2023wave2/finance-supply-chain/dynamics365-finance/automatic-bank-statement-importing)
- [Bank Statement File Import Troubleshooting | Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/finance/cash-bank-management/import-bank-statement-file-failed-incorrect-results)
- [NetSuite Applications Suite - Bank Data Import](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N1550803.html)
- [Best Bank Statement Converters in 2026](https://www.bankstatement.to/best-bank-statement-converters)

### Transaction Categorization & Tagging
- [Transaction Data Enrichment & Categorization API - Zafin](https://zafin.com/transaction-enrichment/)
- [Transaction Tagging: Transforming Raw Bank Data Into Real Insights](https://www.moderntreasury.com/journal/transaction-tagging-transforming-raw-bank-data-into-real-insights)
- [What is Transaction Categorization, and How Does it Work?](https://www.getfocal.ai/knowledgebase/what-is-transaction-categorization)
- [Free Bank Transaction Categorizer | Skwad](https://skwad.app/free-bank-transaction-categorizer)

### Duplicate Detection & Reconciliation
- [12 Best Reconciliation Tools: Ultimate Guide 2026](https://www.solvexia.com/blog/5-best-reconciliation-tools-complete-guide)
- [Fintech Reconciliation | Reiterate](https://www.reiterate.com/industries/fintech)
- [How AI Bank Reconciliation Works](https://www.ccmonet.ai/blog/how-ai-bank-reconciliation-works-matching-rules-exceptions-and-accuracy)
- [AI Reconciliation: 8 Real-World Use Cases](https://www.ledge.co/content/ai-reconciliation)
- [Eliminate Duplicate Transactions for Accurate Financials](https://www.aiaccountant.com/blog/detect-duplicate-bank-transactions)

### Data Retention & Compliance
- [Data Retention Policies in Finance: Scale Compliance in 2025](https://atlan.com/know/data-governance/data-retention-policies-in-finance/)
- [Navigating the CFPB's Personal Financial Data Rights Rule](https://www.venable.com/insights/publications/2024/10/navigating-cfpb-personal-financial-data-rights)
- [FFIEC BSA/AML Appendices - BSA Record Retention Requirements](https://bsaaml.ffiec.gov/manual/Appendices/17)

### Common Problems & Solutions
- [Bank Reconciliation Statement Problems (and How to Solve Them)](https://www.kolleno.com/5-bank-reconciliation-statement-problems-and-how-to-solve-them/)
- [Transaction Monitoring: Data Quality in Banking](https://www.abrigo.com/blog/transaction-monitoring-data-quality-in-banking-makes-the-difference)
- [9 Common Data Quality Issues to Fix in 2025](https://atlan.com/data-quality-issues/)
- [Financial Data Quality: Modern Problems and Possibilities](https://www.gable.ai/blog/financial-data-quality-management)

### UX & User Experience
- [The Best Budget Apps for 2026: Pros, Cons and What Users Say - NerdWallet](https://www.nerdwallet.com/finance/learn/best-budget-apps)
- [Why do Financial App Users Churn? 10 Mistakes to Avoid](https://www.netguru.com/blog/mistakes-in-creating-finance-app)
- [Best Personal Expense Tracker Apps in 2026 | Expensify](https://use.expensify.com/blog/personal-expense-tracker-apps)

# Pitfalls Research: Billing & Monetization

**Domain:** Adding billing infrastructure to existing subscription tracking app
**Researched:** 2026-02-11
**Confidence:** HIGH (verified with Stripe official documentation and existing codebase analysis)

## Critical Pitfalls

Mistakes that cause rewrites, revenue loss, or major security issues.

### Pitfall 1: Non-Idempotent Webhook Handlers

**What goes wrong:**
Stripe retries webhooks for up to 3 days when your handler fails or times out. Without idempotency, the same event processes multiple times: users get charged twice, receive duplicate emails, or get credits applied multiple times.

**Why it happens:**
Developers assume webhooks are delivered exactly once. They process events directly without checking if they've been handled before. The current implementation in `src/app/api/webhooks/stripe/route.ts` lacks idempotency tracking.

**How to avoid:**
1. Create a `stripe_events` table to track processed event IDs
2. Check if `event.id` exists before any business logic
3. Use database transactions to ensure atomicity
4. For composite operations, use `event.id + event.type` as the idempotency key

```typescript
// Example: Add to webhook handler
const existingEvent = await db.query.stripeEvents.findFirst({
  where: eq(stripeEvents.eventId, event.id)
});
if (existingEvent) {
  return NextResponse.json({ received: true }); // Already processed
}
// Process event, then save event ID
await db.insert(stripeEvents).values({ eventId: event.id, processedAt: new Date() });
```

**Warning signs:**
- Duplicate entries in reminder_logs or other audit tables
- Users reporting double charges
- Multiple "subscription activated" logs for same user

**Phase to address:**
Phase 1: Webhook Infrastructure - Must implement idempotency table and checks before going live

---

### Pitfall 2: Webhook Timeout Causing Lost Events

**What goes wrong:**
Stripe expects a 2xx response within 20 seconds. Complex operations (database writes, external API calls, email sending) exceed this limit. Stripe marks delivery as failed and retries, but if your handler eventually succeeded, you now have duplicate processing without idempotency.

**Why it happens:**
Developers perform all business logic synchronously before responding. The current webhook handler does database queries and writes synchronously.

**How to avoid:**
1. Return 200 immediately after signature verification
2. Queue the event for async processing (use a job queue or database queue)
3. Process the queued event in a background worker or cron job

```typescript
// Quick acknowledgment pattern
export async function POST(request: Request) {
  // Verify signature (fast)
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  // Queue for async processing (fast)
  await db.insert(webhookQueue).values({
    eventId: event.id,
    eventType: event.type,
    payload: event.data.object,
    status: 'pending'
  });

  // Return immediately
  return NextResponse.json({ received: true });
}

// Separate cron job or worker processes the queue
```

**Warning signs:**
- Stripe dashboard shows webhook failures/retries
- `[504]` or timeout errors in logs
- Inconsistent subscription states

**Phase to address:**
Phase 1: Webhook Infrastructure - Implement queue-based processing pattern

---

### Pitfall 3: Feature Gating Race Conditions

**What goes wrong:**
User upgrades, but webhook hasn't processed yet. They access a premium feature, and the check passes because their old tier is cached. Or worse: they downgrade, webhook processes, but cached tier still shows premium.

**Why it happens:**
Client-side tier checks use stale data from TanStack Query cache. The existing `useUserStatus()` hook in `src/lib/hooks/use-user.ts` caches for 5 minutes. Webhook updates the database, but the client doesn't know.

**How to avoid:**
1. Invalidate user query cache on checkout success redirect
2. Add a `revalidate` parameter to success URL
3. For critical actions, always verify tier server-side
4. Consider real-time sync via Supabase subscriptions for billing status

```typescript
// On checkout success page:
useEffect(() => {
  if (searchParams.get("success") === "true") {
    queryClient.invalidateQueries({ queryKey: userKeys.profile() });
  }
}, [searchParams]);

// Server-side verification for premium actions:
async function handlePremiumAction() {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (user.billingStatus !== 'active') {
    throw new Error('Premium subscription required');
  }
}
```

**Warning signs:**
- Users reporting they can't access features after upgrade
- Users accessing premium features after downgrade
- Support tickets about "feature not working" that resolve on page refresh

**Phase to address:**
Phase 2: Feature Gating - Implement server-side verification and cache invalidation strategy

---

### Pitfall 4: Voucher Code Exploitation

**What goes wrong:**
Users share promo codes publicly. Codes intended for one-time use get used thousands of times. Percentage-off codes stack unexpectedly with other discounts. Revenue loss from uncontrolled discount application.

**Why it happens:**
Developers create coupons without usage limits. Stripe's `allow_promotion_codes: true` in checkout enables all active promo codes by default. The current checkout implementation at `src/app/api/billing/create-checkout/route.ts` uses this flag without restrictions.

**How to avoid:**
1. Always set `max_redemptions` on promotion codes
2. Use `first_time_order: true` restriction for acquisition offers
3. Use `customer` restriction for targeted offers
4. Monitor promo code usage in Stripe dashboard
5. Consider validating codes server-side before checkout

```typescript
// Create restricted promo code
const promoCode = await stripe.promotionCodes.create({
  coupon: couponId,
  code: 'LAUNCH25',
  max_redemptions: 100,
  restrictions: {
    first_time_transaction: true,
  },
  expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
});
```

**Warning signs:**
- Sudden spike in promo code usage
- Promo codes appearing on coupon aggregator sites
- Revenue significantly below projections during promotional period

**Phase to address:**
Phase 3: Voucher System - Implement code restrictions and monitoring from day one

---

### Pitfall 5: Trial-to-Paid Conversion Gaps

**What goes wrong:**
User's trial expires while they're in the checkout flow. Trial end date passes between clicking "upgrade" and completing payment. User ends up in expired state with active subscription, or active state with no subscription.

**Why it happens:**
Race condition between trial expiration and payment completion. The current implementation treats trial expiration and subscription activation as independent events.

**How to avoid:**
1. Keep trial active during checkout (grace period)
2. Use Stripe's trial features instead of custom trial tracking
3. In webhook handler, always check for and resolve state conflicts
4. Consider extending trial by 24 hours when checkout is initiated

```typescript
// Before creating checkout, extend trial if needed
if (user.billingStatus === 'trial' && user.trialEndDate) {
  const hoursLeft = (new Date(user.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft < 24) {
    // Extend trial to give them time to complete checkout
    await db.update(users).set({
      trialEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }).where(eq(users.id, user.id));
  }
}
```

**Warning signs:**
- Users with `billingStatus: 'cancelled'` but `stripeSubscriptionId` set
- Support tickets: "I upgraded but it says my trial expired"
- Churned users who actually tried to pay

**Phase to address:**
Phase 1: Webhook Infrastructure - Implement grace period and conflict resolution

---

### Pitfall 6: Customer Portal Exposing Promo Codes

**What goes wrong:**
Stripe's customer portal displays applied promotion codes. Customers screenshot codes and share them. "Private" or high-value codes become public.

**Why it happens:**
Portal default behavior shows subscription details including applied discounts. Current implementation at `src/app/api/billing/portal/route.ts` uses default portal configuration without customization.

**How to avoid:**
1. For sensitive codes, apply coupons directly (not promo codes) - they don't display the code string
2. Set strict `max_redemptions` on all promo codes
3. Configure portal to hide certain sections if needed
4. Use customer-specific codes that can only be used by one customer

```typescript
// Apply coupon directly instead of promo code for sensitive offers
await stripe.subscriptions.update(subscriptionId, {
  coupon: 'partner_discount', // Coupon ID, not promo code
});

// Or create customer-specific promo codes
const promoCode = await stripe.promotionCodes.create({
  coupon: couponId,
  customer: customerId, // Only this customer can use it
});
```

**Warning signs:**
- Same promo code appearing in multiple unrelated signups
- Promo codes posted on social media or forums

**Phase to address:**
Phase 4: Customer Portal - Configure portal and use coupons for sensitive discounts

---

### Pitfall 7: Webhook Signature Verification Timing Attack

**What goes wrong:**
Persisted webhooks fail signature verification because Stripe limits verification to 5 minutes after event creation. You can't queue raw webhooks for later processing if you need to verify signature.

**Why it happens:**
Developers try to persist the full webhook payload for async processing, then verify when processing. Stripe's timestamp tolerance prevents replay attacks but breaks this pattern.

**How to avoid:**
1. Verify signature immediately on receipt
2. Only persist verified events (trust your queue, not the raw payload)
3. Store event data, not the raw request

```typescript
// CORRECT: Verify first, then queue
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
// Now safe to queue the verified event data
await queueEvent(event);

// WRONG: Queue raw, verify later
await queueRawWebhook(body, signature); // Will fail verification later
```

**Warning signs:**
- Signature verification errors in logs for queued webhooks
- Events stuck in processing queue with verification failures

**Phase to address:**
Phase 1: Webhook Infrastructure - Verify before queueing

---

### Pitfall 8: Missing Billing Status Sync on Subscription Events

**What goes wrong:**
User's payment fails, but their `billingStatus` stays "active" because you only handle `checkout.session.completed`. They continue accessing premium features without paying.

**Why it happens:**
Incomplete webhook event coverage. The current implementation handles key events but may miss edge cases like `invoice.payment_failed` -> `past_due` -> `cancelled` flow.

**How to avoid:**
Handle the complete subscription lifecycle:

```typescript
// Events to handle:
const criticalEvents = [
  'checkout.session.completed',     // Initial subscription
  'customer.subscription.created',  // Backup for new subs
  'customer.subscription.updated',  // Plan changes, renewals
  'customer.subscription.deleted',  // Cancellations
  'invoice.payment_succeeded',      // Renewal payments
  'invoice.payment_failed',         // Failed payments -> past_due
  'customer.subscription.paused',   // If using pause feature
  'customer.subscription.resumed',  // Resume from pause
];
```

**Warning signs:**
- Users with Stripe status "past_due" but local status "active"
- Revenue leakage: users accessing features without active subscription
- Stripe dashboard shows failed payments but no local record

**Phase to address:**
Phase 1: Webhook Infrastructure - Audit and complete event coverage

---

### Pitfall 9: Multi-Tier Pricing Without Tier Tracking

**What goes wrong:**
You add three tiers (Primary, Enhanced, Advanced) but store only `billingStatus: 'active'`. Can't differentiate tier-specific features. User on Primary tier can access Advanced features.

**Why it happens:**
Original schema has single `billingStatus` enum without tier granularity. Current `stripePriceId` field stores price but you need logic to map prices to feature sets.

**How to avoid:**
1. Add `tier` column to users table (or derive from `stripePriceId`)
2. Create a tier-to-features mapping configuration
3. Check tier, not just "active" status, for feature access

```typescript
// Add tier tracking
export const tierEnum = pgEnum("tier", ["free", "primary", "enhanced", "advanced"]);

// In users table
tier: tierEnum("tier").default("free").notNull(),

// Tier-to-features mapping
const TIER_FEATURES = {
  free: { maxSubscriptions: 5, aiImport: false, reminders: false },
  primary: { maxSubscriptions: 50, aiImport: true, reminders: true },
  enhanced: { maxSubscriptions: -1, aiImport: true, reminders: true, analytics: true },
  advanced: { maxSubscriptions: -1, aiImport: true, reminders: true, analytics: true, api: true },
};

// Feature check
function canAccessFeature(user: User, feature: string): boolean {
  return TIER_FEATURES[user.tier][feature] === true;
}
```

**Warning signs:**
- All paying users have same features regardless of price paid
- No way to upsell from lower to higher tier
- Feature access logs don't differentiate by tier

**Phase to address:**
Phase 2: Feature Gating - Must implement tier tracking before multi-tier launch

---

### Pitfall 10: Plan Switching Proration Confusion

**What goes wrong:**
User upgrades from Primary ($4.99/mo) to Advanced ($14.99/mo) mid-cycle. They're charged $14.99 immediately instead of prorated amount. Or they're charged nothing and get free access until renewal. Either way, users complain.

**Why it happens:**
Stripe's default proration behavior may not match user expectations. Switching between monthly and annual plans adds complexity. Proration explanation not shown to user before they confirm.

**How to avoid:**
1. Use Stripe's `proration_behavior` parameter explicitly
2. Show proration preview before confirming upgrade
3. For downgrades, use `cancel_at_period_end` instead of immediate switch
4. Test all plan-to-plan transitions thoroughly

```typescript
// Preview proration before switching
const preview = await stripe.invoices.retrieveUpcoming({
  customer: user.stripeCustomerId,
  subscription: user.stripeSubscriptionId,
  subscription_items: [{
    id: subscriptionItemId,
    price: newPriceId,
  }],
  subscription_proration_behavior: 'create_prorations',
});

// Show preview to user
const prorationAmount = preview.lines.data
  .filter(line => line.proration)
  .reduce((sum, line) => sum + line.amount, 0);

// User confirms, then apply
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: itemId, price: newPriceId }],
  proration_behavior: 'create_prorations',
});
```

**Warning signs:**
- Chargebacks/disputes after plan changes
- Support tickets about unexpected charges
- Users confused by invoice amounts

**Phase to address:**
Phase 2: Feature Gating - Plan switching with proration preview

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single-tier pricing | Simpler implementation | Can't differentiate value, no upsell path | MVP only, plan migration needed later |
| Client-side tier checks only | Faster development | Security bypass, feature access exploits | Never for premium features |
| Storing Stripe IDs only | Less data duplication | Can't audit, can't debug, can't migrate | Never - always store billing state locally |
| Skipping idempotency | Faster initial build | Duplicate charges, data corruption | Never |
| Hardcoded price IDs | Quick setup | Deploy required for price changes | Staging/dev only |
| No webhook retry handling | Fewer edge cases | Lost events, inconsistent state | Never for billing |

## Integration Gotchas

Common mistakes when connecting to Stripe.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Checkout Sessions | Not setting `metadata.userId` | Always include user ID for webhook correlation |
| Customer Portal | Using default configuration | Configure allowed actions, hide sensitive info |
| Webhook Endpoint | Using localhost or HTTP | Use HTTPS with valid cert, use Stripe CLI for local dev |
| Price IDs | Mixing test/live mode IDs | Separate env vars: `STRIPE_MONTHLY_PRICE_ID_TEST`, `STRIPE_MONTHLY_PRICE_ID_LIVE` |
| Subscription Updates | Calling Stripe API without webhook sync | Update local state via webhooks, not API response |
| Error Handling | Generic error messages | Parse Stripe error codes, show actionable messages |
| Customer Creation | Creating customer on checkout only | Create customer on signup for cleaner flow |
| API Version | Not pinning API version | Pin version in code, upgrade deliberately |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous webhook processing | Timeouts, retries, duplicates | Queue-based async processing | 100+ concurrent webhooks |
| N+1 queries in tier checks | Slow page loads, high DB load | Cache user tier, batch queries | 1000+ active users |
| No billing status index | Slow queries for "all active users" | Add index on `billingStatus` | 10K+ users |
| Polling for subscription status | Unnecessary API calls | Use webhooks, cache aggressively | 100+ active users |
| Real-time Stripe API calls | Slow page loads, rate limits | Cache subscription data locally | 500+ daily checkouts |

## Security Mistakes

Billing-specific security issues.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Stripe secret key client-side | Complete account takeover | Server-side only, use publishable key for client |
| Trusting client-side tier claim | Feature access bypass | Always verify tier server-side for premium features |
| Not validating webhook signatures | Spoofed events, fake payments | Use `stripe.webhooks.constructEvent()` |
| Logging full credit card errors | PCI compliance violation | Only log Stripe error codes, not card details |
| Storing raw webhook payloads with card data | PCI scope expansion | Extract only needed fields |
| Not rate limiting checkout creation | Abuse, testing fraud | Rate limit by user, require auth |

## UX Pitfalls

Common user experience mistakes in billing flows.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Blocking UI during checkout creation | User thinks it's broken, double-clicks | Immediate loading state, disable button |
| No feedback on upgrade success | User unsure if it worked | Show success message, update UI immediately |
| Hiding current plan details | User can't find billing info | Clear billing section in settings (already done) |
| Confusing proration explanation | Surprise charges cause disputes | Show clear breakdown before confirming |
| No way to cancel | GDPR/consumer law violations | Customer portal access (already implemented) |
| Email receipt not matching plan name | Confusion, dispute potential | Use consistent naming across app and Stripe |
| Upgrade prompts too aggressive | User feels nagged, churns | Contextual, helpful prompts at point of need |
| No trial expiration warning | User surprised by sudden block | Banner warning (already implemented with `TrialBanner`) |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Checkout flow:** Often missing loading states, error handling, and duplicate-click prevention - verify all edge cases
- [ ] **Webhook handler:** Often missing idempotency, timeout handling, and complete event coverage - verify with Stripe webhook testing
- [ ] **Feature gating:** Often missing server-side verification - verify premium features check on server
- [ ] **Trial expiration:** Often missing grace period and conflict resolution - verify trial-to-paid transition
- [ ] **Cancellation flow:** Often missing local status update - verify user state after Stripe portal cancellation
- [ ] **Past-due handling:** Often missing downgrade/restrict logic - verify what happens when payment fails
- [ ] **Customer portal:** Often missing configuration - verify portal shows correct options, hides sensitive codes
- [ ] **Promo codes:** Often missing usage limits and expiration - verify codes can't be over-used
- [ ] **Plan switching:** Often missing proration preview - verify upgrade/downgrade calculates correctly
- [ ] **Webhook security:** Often missing signature verification - verify handler rejects invalid signatures
- [ ] **Multi-tier access:** Often missing tier-specific feature checks - verify each tier can only access their features
- [ ] **Dunning emails:** Often missing failed payment notifications - verify user is notified of payment issues

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate charges | MEDIUM | Issue refunds via Stripe, email affected users, implement idempotency |
| Feature access post-cancellation | LOW | Force sync from Stripe, invalidate caches, audit access logs |
| Trial/paid state mismatch | LOW | Query Stripe subscription status, update local DB, reconcile |
| Promo code abuse | MEDIUM | Deactivate codes, assess revenue impact, update code restrictions |
| Missing webhook events | HIGH | Sync all subscriptions from Stripe API, implement missing handlers |
| Customer data mismatch | MEDIUM | Reconciliation script to compare Stripe and local state |
| Wrong tier access | LOW | Add tier column, backfill from Stripe price IDs, add access checks |
| Unexpected proration charges | MEDIUM | Review chargebacks, add proration preview, consider goodwill credits |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Non-idempotent webhooks | Phase 1: Webhook Infrastructure | Test: Send same event twice, verify single processing |
| Webhook timeout | Phase 1: Webhook Infrastructure | Test: Webhook with 30s+ processing, verify no timeout |
| Signature timing attack | Phase 1: Webhook Infrastructure | Test: Delayed queue processing, verify no signature errors |
| Missing event coverage | Phase 1: Webhook Infrastructure | Audit: All Stripe subscription events have handlers |
| Trial conversion gaps | Phase 1: Webhook Infrastructure | Test: Checkout during final trial hours, verify smooth transition |
| Feature gating race conditions | Phase 2: Feature Gating | Test: Upgrade during active session, verify immediate access |
| Client-only tier checks | Phase 2: Feature Gating | Audit: All premium endpoints have server-side checks |
| Multi-tier confusion | Phase 2: Feature Gating | Test: Each tier can only access their specific features |
| Plan switching proration | Phase 2: Feature Gating | Test: All plan-to-plan transitions with proration preview |
| Voucher exploitation | Phase 3: Voucher System | Audit: All codes have limits, expiration, or restrictions |
| Portal promo exposure | Phase 4: Customer Portal | Review: Portal configuration hides sensitive discounts |

## Sources

### Official Documentation (HIGH confidence)
- [Stripe Webhooks Best Practices](https://docs.stripe.com/webhooks/best-practices) - Timeout, idempotency, signature verification
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests) - API idempotency patterns
- [Stripe Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons) - Coupon vs promo code, restrictions
- [Stripe Customer Portal Configuration](https://docs.stripe.com/customer-management/configure-portal) - Portal limitations and settings
- [Stripe Upgrade/Downgrade Subscriptions](https://docs.stripe.com/billing/subscriptions/upgrade-downgrade) - Proration handling

### Community Resources (MEDIUM confidence)
- [Stigg: Best Practices for Stripe Webhooks](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) - Queue pattern, signature timing
- [Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) - Idempotency implementation
- [SaaS Billing Best Practices](https://www.withorb.com/blog/saas-billing-tips) - Feature gating, transparency
- [Feature Gating Guide](https://www.withorb.com/blog/feature-gating) - When to gate, communication strategies
- [Stripe Webhooks Guide](https://www.magicbell.com/blog/stripe-webhooks-guide) - Event examples and patterns
- [Moldstud: Common Stripe Mistakes](https://moldstud.com/articles/p-common-mistakes-developers-make-when-using-stripe-payment-processing-avoid-these-pitfalls) - Integration issues
- [SaaS Subscription Tier Design](https://www.hubifi.com/blog/saas-subscription-tiers-design) - Multi-tier pitfalls

### Existing Codebase Analysis (HIGH confidence)
- `src/app/api/webhooks/stripe/route.ts` - Current webhook implementation (lacks idempotency)
- `src/app/api/billing/create-checkout/route.ts` - Current checkout flow (uses allow_promotion_codes)
- `src/app/api/billing/portal/route.ts` - Current portal implementation (default config)
- `src/lib/hooks/use-user.ts` - Current tier checking (5-min cache, client-side only)
- `src/lib/db/schema.ts` - Current billing fields (billingStatus enum, no tier column)
- `src/components/billing/trial-banner.tsx` - Trial warning UI (already implemented)
- `src/lib/stripe/products.ts` - Current pricing config (single tier structure)

---

**Confidence Assessment:**

| Pitfall Category | Confidence | Rationale |
|------------------|------------|-----------|
| Webhook Handling | HIGH | Stripe official docs + multiple implementation guides |
| Feature Gating | HIGH | Codebase analysis + common SaaS patterns |
| Voucher Codes | HIGH | Stripe documentation + 2025 API changes |
| Customer Portal | HIGH | Official Stripe docs on configuration |
| Multi-tier Pricing | MEDIUM | Pattern-based, needs validation with actual pricing tiers |
| Plan Switching | MEDIUM | Stripe docs, but specific proration behavior needs testing |

---

*Pitfalls research for: Billing & Monetization on Subscription Manager*
*Researched: 2026-02-11*