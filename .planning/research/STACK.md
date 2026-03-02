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
