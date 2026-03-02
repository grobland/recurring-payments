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
