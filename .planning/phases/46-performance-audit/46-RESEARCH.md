# Phase 46: Performance Audit - Research

**Researched:** 2026-03-05
**Domain:** Next.js bundle analysis, Lighthouse auditing, dynamic imports, optimizePackageImports
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use @next/bundle-analyzer (official Next.js plugin) to generate interactive HTML treemap
- Commit treemap report to `.planning/performance/`
- Keep @next/bundle-analyzer as permanent dev dependency
- Add `npm run analyze` script to package.json
- Generate before and after treemaps to show optimization impact
- Manual Lighthouse run (CLI or Chrome DevTools), document results in planning files
- Test 3 key pages: Landing page (public), Dashboard (authenticated), Vault (heaviest data page)
- Document scores in `.planning/performance/` alongside treemap
- If scores below targets, document gaps only — fixes become future phases if needed
- Dynamically import ALL 10 chart components that use recharts
- Loading state: Claude's discretion based on existing skeleton loader patterns from Phase 11
- Verify existing dynamic import in pdf-viewer-modal.tsx is sufficient
- Confirm react-pdf/pdfjs-dist is not leaking into other bundles via treemap
- Add `optimizePackageImports: ['lucide-react']` to next.config.ts
- Strict scope: only the 4 requirements (PERF-01 through PERF-04)
- Document additional treemap findings as recommendations for future phases only

### Claude's Discretion
- Chart loading skeleton design (use existing patterns from Phase 11)
- Exact treemap report format/naming
- Lighthouse CLI vs DevTools choice
- How to structure the performance documentation

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Bundle treemap report generated and committed | @next/bundle-analyzer config + ANALYZE=true npm run build |
| PERF-02 | Lighthouse baseline scores documented (Performance 80+, Accessibility 95+, Best Practices 95+) | Manual Lighthouse CLI run against 3 pages |
| PERF-03 | optimizePackageImports configured for lucide-react in next.config.ts | Critical finding: lucide-react is auto-optimized by default in Next.js 16; explicit config is belt-and-suspenders, still recommended per CONTEXT.md decision |
| PERF-04 | Heavy components (react-pdf, recharts) dynamically imported | next/dynamic with ssr:false for react-pdf (already done); next/dynamic pattern for 10 recharts components |
</phase_requirements>

---

## Summary

Phase 46 is an audit-and-targeted-optimization phase with four well-scoped deliverables: a committed bundle treemap, a documented Lighthouse baseline, an `optimizePackageImports` config entry for lucide-react, and dynamic imports applied to all 10 recharts chart components.

The most important research finding is that both `lucide-react` AND `recharts` are already in Next.js 16's default auto-optimized package list (confirmed via official docs dated 2026-02-27). PERF-03 still calls for an explicit `optimizePackageImports` entry per the locked CONTEXT.md decision — this remains valuable as an explicit declaration of intent and ensures the optimization is visible in the config file even if it was already implicit. The planner should document this finding clearly so the team understands they are adding an explicit declaration, not enabling a new optimization.

The react-pdf dynamic import pattern is already correctly implemented in `pdf-viewer-modal.tsx` using `next/dynamic` with `ssr: false`. The 10 recharts components all use bare named exports and static imports in their parent page/tab files — they need to be wrapped with `next/dynamic` at the call site or converted to re-export a dynamic wrapper. The existing `Skeleton` component from shadcn/ui is the correct loading placeholder to use, consistent with chart-height skeleton patterns already used in `category-chart.tsx` and `dashboard/loading.tsx`.

**Primary recommendation:** Use the existing `pdf-viewer-modal.tsx` pattern as the blueprint for recharts dynamic imports. Chain `withBundleAnalyzer` inside `withSentryConfig` in `next.config.ts`. Run `ANALYZE=true npm run build` before and after optimizations to capture both treemaps.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @next/bundle-analyzer | latest | Generates interactive Webpack treemap HTML | Official Next.js plugin, gated by ANALYZE env var |
| next/dynamic | built-in (Next 16) | Dynamic/lazy imports with SSR control | Official Next.js lazy loading primitive |
| Lighthouse CLI | latest | Measure Performance, Accessibility, Best Practices scores | Official Google tool, runs against any URL |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Skeleton (shadcn/ui) | project-local | Loading placeholder for chart dynamic imports | Already used in category-chart.tsx and loading.tsx files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @next/bundle-analyzer | `npx next experimental-analyze` (Turbopack) | Turbopack analyzer is experimental in Next.js 16, no --output flag yet; CONTEXT.md locked @next/bundle-analyzer |
| Manual Lighthouse | Playwright Lighthouse plugin | Adds complexity; CONTEXT.md locked manual approach |
| next/dynamic at call site | React.lazy + Suspense | next/dynamic is the project pattern (pdf-viewer-modal.tsx); more features (ssr:false) |

**Installation:**
```bash
npm install --save-dev @next/bundle-analyzer
# Lighthouse CLI (run once, may already be installed globally)
npm install -g lighthouse
```

## Architecture Patterns

### Recommended Project Structure (new files)
```
.planning/
└── performance/
    ├── LIGHTHOUSE.md           # Documented baseline scores
    ├── bundle-treemap-before.html  # Before optimizations
    └── bundle-treemap-after.html   # After optimizations
```

### Pattern 1: @next/bundle-analyzer with withSentryConfig Chain

**What:** @next/bundle-analyzer wraps the Next.js config; withSentryConfig wraps last (outermost).
**When to use:** Whenever you need both Sentry and bundle analysis active.

**Current next.config.ts pattern (existing):**
```typescript
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  // ... redirects
};

export default withSentryConfig(nextConfig, { /* sentry opts */ });
```

**Updated pattern with bundle analyzer:**
```typescript
// Source: https://nextjs.org/docs/app/guides/package-bundling
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // ... redirects unchanged
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // sentry opts unchanged
});
```

**Key ordering principle:** `withBundleAnalyzer(nextConfig)` is the inner wrap, `withSentryConfig(...)` is the outer wrap. This matches the pattern where Sentry must see the final config.

### Pattern 2: optimizePackageImports Placement

**What:** Tells Next.js to tree-shake named exports more aggressively for specific packages.
**Critical finding:** `lucide-react` and `recharts` are ALREADY in Next.js 16's default auto-optimized list. Adding them explicitly to `experimental.optimizePackageImports` is belt-and-suspenders — it makes the intent visible in config and is the CONTEXT.md decision.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
// Note: lucide-react is auto-optimized by default in Next.js 16.
// This explicit entry documents intent and ensures future-proofing.
experimental: {
  optimizePackageImports: ["lucide-react"],
},
```

### Pattern 3: next/dynamic for Named Exports (recharts components)

**What:** Convert static imports of recharts components to dynamic imports, deferring recharts bundle to lazy load.
**When to use:** Chart components consumed only inside client components; not needed in SSR paths.

The project uses two approaches for chart consumption:

1. **Direct import in page files** (most charts): `YearOverYearChart`, `CategoryTrendsChart`, `MonthlyForecastChart`, `AnnualForecastFanChart`, `CategoryChart`, `CategoryPieChart`, `SpendingTrendChart`
2. **Import via barrel index** (`src/components/charts/index.ts`): `CategoryPieChart`, `SpendingTrendChart`
3. **Import inside another component** (nested): `SuggestionTimeline` (inside `suggestion-card.tsx`), `AccountSpendingChart` (inside `account-spending-tab.tsx`)

**Recommended approach — convert each chart file to default-export a dynamic wrapper:**

```typescript
// Source: existing pattern in src/components/statements/pdf-viewer-modal.tsx
// Applied to: src/components/charts/spending-trend-chart.tsx (example)

"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dynamic import — defers recharts bundle to lazy load
const SpendingTrendChartInner = dynamic(
  () =>
    import("./spending-trend-chart-inner").then((m) => ({
      default: m.SpendingTrendChart,
    })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    ),
  }
);

export { SpendingTrendChartInner as SpendingTrendChart };
```

**Simpler alternative — dynamic import at the call site in page files:**

```typescript
// In the page file, replace static import with dynamic:
// BEFORE:
import { CategoryTrendsChart } from "@/components/charts/category-trends-chart";

// AFTER:
import dynamic from "next/dynamic";
const CategoryTrendsChart = dynamic(
  () =>
    import("@/components/charts/category-trends-chart").then((m) => ({
      default: m.CategoryTrendsChart,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  }
);
```

**Recommended approach for this project:** Use dynamic imports AT THE CALL SITE (page files and parent components). This avoids creating inner/outer file splits and keeps the chart component files clean. The pages/components are already "use client" so `ssr: false` is valid.

### Pattern 4: Generating and Storing the Bundle Report

```bash
# Run before optimizations
ANALYZE=true npm run build
# Browser opens 3 tabs: client.html, server.html, edge.html
# Save the client.html to .planning/performance/bundle-treemap-before.html

# Apply optimizations (PERF-03, PERF-04)

# Run after optimizations
ANALYZE=true npm run build
# Save client.html to .planning/performance/bundle-treemap-after.html
```

**package.json script to add:**
```json
"analyze": "cross-env ANALYZE=true next build"
```

On Windows/cross-platform, use `cross-env` or set the env inline:
```json
"analyze": "ANALYZE=true next build"
```
Since the project runs on Windows (bash shell), the Unix syntax `ANALYZE=true` should work in the npm script via bash.

### Pattern 5: Lighthouse Baseline Documentation

```bash
# Install Lighthouse CLI if not present
npm install -g lighthouse

# Run against dev server (npm run dev first), or production build
lighthouse http://localhost:3000 --output html --output-path ./.planning/performance/lighthouse-landing.html
lighthouse http://localhost:3000/payments/dashboard --output html --output-path ./.planning/performance/lighthouse-dashboard.html
lighthouse http://localhost:3000/vault --output html --output-path ./.planning/performance/lighthouse-vault.html
```

Document scores in `.planning/performance/LIGHTHOUSE.md`:
```markdown
# Lighthouse Baseline — Phase 46

**Date:** 2026-03-05
**Targets:** Performance 80+, Accessibility 95+, Best Practices 95+

| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| Landing (/) | XX | XX | XX | XX |
| Dashboard (/payments/dashboard) | XX | XX | XX | XX |
| Vault (/vault) | XX | XX | XX | XX |

## Gap Analysis
[Fill in gaps vs targets]

## Notes
[Any context on scores]
```

### Anti-Patterns to Avoid

- **Wrapping order inversion:** Do NOT `withBundleAnalyzer(withSentryConfig(nextConfig))`. Sentry should be outermost.
- **Dynamic import with named export directly:** `dynamic(() => import('./file'))` only works if the file has a default export. Use `.then((m) => ({ default: m.NamedExport }))` for named exports.
- **Removing ssr: false from recharts imports:** Recharts uses browser-only APIs (ResizeObserver); always use `ssr: false`.
- **Committing .next/ build artifacts:** Only commit the HTML report files, not the full .next directory.
- **Dynamic importing SuggestionTimeline inside SuggestionCard:** SuggestionCard is already "use client" and SuggestionTimeline only renders when the card is expanded — this is already lazy-ish. The dynamic import should still be applied to reduce the recharts chunk from the initial load.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle visualization | Custom webpack stats parser | @next/bundle-analyzer | Handles client/server/edge bundles correctly; generates proper treemap |
| Performance scores | Manual page inspection | Lighthouse CLI | Standardized Core Web Vitals measurement |
| Lazy chart loading | Custom React.lazy + error boundary | next/dynamic | Built-in SSR:false, loading fallback, error handling |
| Cross-platform env vars | Shell-specific syntax | cross-env (if needed) | Already works with bash-based npm scripts |

**Key insight:** The recharts dynamic import pattern is already proven in the codebase — `pdf-viewer-modal.tsx` uses the exact `import("./file").then((m) => ({ default: m.Component }))` pattern needed for named exports.

## Common Pitfalls

### Pitfall 1: Named Export Dynamic Import Syntax
**What goes wrong:** `dynamic(() => import('./chart'))` throws because there is no default export.
**Why it happens:** Recharts components use named exports (`export function SpendingTrendChart`).
**How to avoid:** Always use `.then((m) => ({ default: m.SpendingTrendChart }))` to map named to default.
**Warning signs:** TypeScript error "Property 'default' does not exist" or runtime "Element type is invalid".

### Pitfall 2: @next/bundle-analyzer ESM Import
**What goes wrong:** `import withBundleAnalyzer from '@next/bundle-analyzer'` may fail in next.config.ts.
**Why it happens:** Package may use CJS internally; TypeScript interop varies.
**How to avoid:** Use `import bundleAnalyzer from '@next/bundle-analyzer'` then call `bundleAnalyzer({ enabled: ... })`. If that fails, try `const { default: bundleAnalyzer } = await import(...)` pattern or use `createRequire`.
**Warning signs:** "Cannot find module" or "Not a function" error at build start.

**Proven working pattern for TypeScript:**
```typescript
import bundleAnalyzer from "@next/bundle-analyzer";
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
```

### Pitfall 3: lucide-react Already Auto-Optimized
**What goes wrong:** Adding `optimizePackageImports: ['lucide-react']` and expecting to see a measurable bundle difference.
**Why it happens:** Next.js 16 includes `lucide-react` in its default auto-optimized list — the optimization was already active.
**How to avoid:** Understand this is an explicit declaration for visibility, not enabling a new optimization. Document this in the PERF-03 task notes.
**Warning signs:** No bundle size change after adding the config entry — expected, not a bug.

### Pitfall 4: Lighthouse Requires Running Server
**What goes wrong:** Lighthouse fails with "Unable to connect to Chrome" or connection refused.
**Why it happens:** Lighthouse needs a running HTTP server, not just the built files.
**How to avoid:** Run `npm run dev` or `npm run build && npm run start` first, then run Lighthouse against localhost.
**Warning signs:** ECONNREFUSED in Lighthouse output.

### Pitfall 5: Before Treemap Not Captured
**What goes wrong:** Only the "after" treemap exists, losing the comparison value.
**Why it happens:** Team runs analyze only after optimizations.
**How to avoid:** PERF-01 must capture the "before" treemap in Wave 1 (before PERF-04 dynamic imports in Wave 2).

### Pitfall 6: react-pdf Leakage via pdf-viewer-inner.tsx
**What goes wrong:** `react-pdf` appears in client bundle despite `pdf-viewer-modal.tsx` using `next/dynamic`.
**Why it happens:** `pdf-viewer-inner.tsx` is the component that imports react-pdf; it must only ever be loaded via the dynamic import in the modal, never imported statically elsewhere.
**How to avoid:** Verify via treemap that `react-pdf` and `pdfjs-dist` appear only in lazy/async chunks.
**Warning signs:** Large `pdfjs-dist` chunk visible in the synchronous/initial client bundle treemap.

## Code Examples

Verified patterns from official sources and codebase:

### @next/bundle-analyzer Config (TypeScript + Sentry chain)
```typescript
// Source: https://nextjs.org/docs/app/guides/package-bundling + existing next.config.ts
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      // ... existing redirects unchanged
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: false },
});
```

### Dynamic Import of Named-Export Recharts Component (at call site)
```typescript
// Source: existing pattern in pdf-viewer-modal.tsx + Next.js docs
// Applied in page files that currently static-import chart components

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const YearOverYearChart = dynamic(
  () =>
    import("@/components/charts/year-over-year-chart").then((m) => ({
      default: m.YearOverYearChart,
    })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Year over Year</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    ),
  }
);
```

### Chart Skeleton Loading State (matches existing patterns)
```typescript
// Source: existing pattern in src/components/dashboard/category-chart.tsx
// and src/app/(dashboard)/payments/dashboard/loading.tsx
// Use Skeleton from "@/components/ui/skeleton" with h-[300px] or h-[260px] w-full
// Match the height of the chart container for the specific component

<Card>
  <CardHeader>
    <Skeleton className="h-5 w-40" />  {/* Title */}
  </CardHeader>
  <CardContent>
    <Skeleton className="h-[300px] w-full" />  {/* Chart area */}
  </CardContent>
</Card>
```

### SuggestionTimeline — Dynamic Import in suggestion-card.tsx
```typescript
// Source: existing pattern in suggestion-card.tsx (currently static import)
// SuggestionTimeline only renders when Collapsible is expanded — low priority but included

import dynamic from "next/dynamic";

const SuggestionTimeline = dynamic(
  () =>
    import("./suggestion-timeline").then((m) => ({
      default: m.SuggestionTimeline,
    })),
  {
    ssr: false,
    loading: () => <div className="h-20 w-full animate-pulse bg-accent rounded-md" />,
  }
);
```

## Complete Inventory of recharts Components to Wrap

All 10 files importing recharts (confirmed via codebase grep):

| File | Export Name | Currently Imported By | Action |
|------|-------------|----------------------|--------|
| `src/components/charts/spending-trend-chart.tsx` | `SpendingTrendChart` | `src/app/(dashboard)/payments/analytics/page.tsx` via barrel + analytics page | Dynamic import at analytics page |
| `src/components/charts/category-pie-chart.tsx` | `CategoryPieChart` | `src/app/(dashboard)/payments/analytics/page.tsx` via barrel + analytics page | Dynamic import at analytics page |
| `src/components/charts/category-trends-chart.tsx` | `CategoryTrendsChart` | `payments/dashboard/page.tsx`, `dashboard/page.tsx` | Dynamic import at both pages |
| `src/components/charts/year-over-year-chart.tsx` | `YearOverYearChart` | `payments/dashboard/page.tsx`, `dashboard/page.tsx` | Dynamic import at both pages |
| `src/components/dashboard/category-chart.tsx` | `CategoryChart` | `payments/dashboard/page.tsx`, `dashboard/page.tsx` | Dynamic import at both pages |
| `src/components/forecast/monthly-forecast-chart.tsx` | `MonthlyForecastChart` | `payments/forecast/page.tsx`, `dashboard/forecasting/page.tsx` | Dynamic import at both pages |
| `src/components/forecast/annual-forecast-fan-chart.tsx` | `AnnualForecastFanChart` | `payments/forecast/page.tsx`, `dashboard/forecasting/page.tsx` | Dynamic import at both pages |
| `src/components/suggestions/suggestion-timeline.tsx` | `SuggestionTimeline` | `suggestion-card.tsx` (nested component) | Dynamic import in suggestion-card.tsx |
| `src/components/accounts/account-spending-chart.tsx` | `AccountSpendingChart` | `account-spending-tab.tsx` (nested component) | Dynamic import in account-spending-tab.tsx |
| `src/components/charts/category-trends-chart.tsx` | — | Also imported via `charts/index.ts` barrel | Update barrel index if needed |

**Note on barrel index (`src/components/charts/index.ts`):** Currently exports `CategoryPieChart` and `SpendingTrendChart`. If analytics pages import via the barrel, the barrel should re-export the dynamic-wrapped versions OR the page files should import directly with `next/dynamic`. The simpler approach is to do dynamic imports in the page files and leave the barrel for non-dynamic usage.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual webpack-bundle-analyzer | @next/bundle-analyzer (official) | Next.js 13+ | Handles Next.js-specific chunks correctly |
| require() in next.config.js | import in next.config.ts | Next.js 15+ | Type-safe config with ESM imports |
| `experimental.optimizePackageImports` | Now top-level `experimental.optimizePackageImports` (still experimental) | Next.js 14.0 | Feature graduated from deep experimental to documented experimental |
| Custom lazy loading with React.lazy | `next/dynamic` | Next.js 13+ | Integrated with Next.js bundle splitting |
| npx next experimental-analyze (Turbopack) | — | Next.js 16 (NEW) | Alternative to @next/bundle-analyzer; requires Turbopack; experimental, no stable --output yet |

**Deprecated/outdated:**
- `next/dynamic` with `modules` option: removed; use single dynamic import with `.then()` pattern
- `require('@next/bundle-analyzer')` in CJS config: still works but project uses ESM-style `next.config.ts`

## Open Questions

1. **@next/bundle-analyzer ESM Import in next.config.ts**
   - What we know: Official docs show CJS require() pattern; the project uses next.config.ts (TypeScript ESM)
   - What's unclear: Whether `import bundleAnalyzer from "@next/bundle-analyzer"` works cleanly with the current version
   - Recommendation: Try the ESM import first; if TypeScript complains, add `@types/` or use `createRequire(import.meta.url)` fallback

2. **Lighthouse Test Environment**
   - What we know: Scores vary significantly between dev and prod builds
   - What's unclear: Whether the planner intends a dev-server baseline or production build baseline
   - Recommendation: Run against production build (`npm run build && npm run start`) for meaningful scores; note in LIGHTHOUSE.md

3. **Barrel Index Update for charts/index.ts**
   - What we know: `index.ts` exports `CategoryPieChart` and `SpendingTrendChart` statically
   - What's unclear: Whether to update the barrel to re-export dynamic versions or just import directly in pages
   - Recommendation: Import directly with `next/dynamic` in page files; leave barrel as-is (or remove barrel if no other usage)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.17 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | Bundle treemap HTML file exists in .planning/performance/ | manual-only | N/A — file artifact check | ❌ manual verification |
| PERF-02 | LIGHTHOUSE.md exists with 3 page scores documented | manual-only | N/A — documentation artifact | ❌ manual verification |
| PERF-03 | next.config.ts contains optimizePackageImports with lucide-react | manual-only | `grep -r "optimizePackageImports" next.config.ts` | ❌ Wave 0 |
| PERF-04 | Chart components use next/dynamic with ssr:false | manual-only | `grep -r "next/dynamic" src/components` | ❌ Wave 0 |

**Note:** PERF-01 and PERF-02 are inherently manual — they require running a build/Lighthouse and reviewing outputs. PERF-03 and PERF-04 are code changes verifiable by inspection. No new Vitest unit tests are required for this phase.

### Sampling Rate
- **Per task commit:** `npm run build` (verifies no TypeScript/build errors introduced)
- **Per wave merge:** Full build + manual inspect that dynamic imports appear as async chunks
- **Phase gate:** Treemap and LIGHTHOUSE.md committed; next.config.ts updated; all 10 charts wrapped

### Wave 0 Gaps
- None — no new test files required. This phase is configuration and documentation work. Verify via build success and file inspection.

## Sources

### Primary (HIGH confidence)
- [nextjs.org/docs/app/guides/package-bundling](https://nextjs.org/docs/app/guides/package-bundling) — @next/bundle-analyzer setup, optimizePackageImports overview (fetched 2026-03-05, last updated 2026-02-27)
- [nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) — default auto-optimized packages list including lucide-react and recharts (fetched 2026-03-05, last updated 2026-02-27)
- Project codebase — `pdf-viewer-modal.tsx` (existing next/dynamic pattern), `category-chart.tsx` (existing Skeleton pattern), `next.config.ts` (existing Sentry chain)

### Secondary (MEDIUM confidence)
- WebSearch results confirming lucide-react + recharts in default Next.js auto-optimized list
- [github.com/vercel/next.js/discussions/65758](https://github.com/vercel/next.js/discussions/65758) — bundle analyzer TypeScript config patterns

### Tertiary (LOW confidence)
- CJS/ESM interop behavior for `@next/bundle-analyzer` in next.config.ts — needs validation at implementation time

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are official Next.js ecosystem
- Architecture: HIGH — patterns verified against existing codebase code and official docs
- Pitfalls: HIGH for named export dynamic import syntax; MEDIUM for @next/bundle-analyzer ESM interop
- Critical finding (lucide-react auto-optimized): HIGH — confirmed in official Next.js 16 docs

**Research date:** 2026-03-05
**Valid until:** 2026-06-05 (stable APIs; optimizePackageImports list may change with Next.js minor releases)
