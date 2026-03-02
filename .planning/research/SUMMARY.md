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
