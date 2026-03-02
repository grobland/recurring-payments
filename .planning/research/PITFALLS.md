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
