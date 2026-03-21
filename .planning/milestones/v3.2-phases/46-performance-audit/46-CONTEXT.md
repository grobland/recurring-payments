# Phase 46: Performance Audit - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Measure the current bundle composition, document Lighthouse baseline scores, and apply targeted import optimizations (lucide-react optimizePackageImports, recharts dynamic imports). This is an audit phase — document current state and apply the 4 scoped optimizations, not a general performance overhaul.

</domain>

<decisions>
## Implementation Decisions

### Bundle Analysis Tooling
- Use @next/bundle-analyzer (official Next.js plugin) to generate interactive HTML treemap
- Commit treemap report to `.planning/performance/`
- Keep @next/bundle-analyzer as a permanent dev dependency for future audits
- Add `npm run analyze` script to package.json for easy re-runs
- Generate before and after treemaps to show optimization impact

### Lighthouse Baseline
- Manual Lighthouse run (CLI or Chrome DevTools), document results in planning files
- Test 3 key pages: Landing page (public), Dashboard (authenticated), Vault (heaviest data page)
- Document scores in `.planning/performance/` alongside the treemap
- If scores are below targets (Performance 80+, Accessibility 95+, Best Practices 95+), document gaps only — fixes become future phases if needed

### Recharts Dynamic Imports
- Dynamically import ALL 10 chart components that use recharts (not just dashboard ones)
- Files: category-chart, spending-trend-chart, category-pie-chart, category-trends-chart, year-over-year-chart, monthly-forecast-chart, annual-forecast-fan-chart, suggestion-timeline, account-spending-chart (and any others found)
- Loading state: Claude's discretion based on existing skeleton loader patterns from Phase 11

### react-pdf Verification
- Verify existing dynamic import in pdf-viewer-modal.tsx is sufficient (already uses next/dynamic with ssr:false)
- Confirm react-pdf/pdfjs-dist is not leaking into other bundles via the treemap

### lucide-react Optimization
- Add `optimizePackageImports: ['lucide-react']` to next.config.ts
- 164 import occurrences across 140 files — this should reduce tree-shaking overhead significantly

### Optimization Scope
- Strict: only the 4 requirements (PERF-01 through PERF-04)
- Document any additional findings from the treemap as recommendations for future phases, but don't act on them in this phase

### Claude's Discretion
- Chart loading skeleton design (use existing patterns from Phase 11)
- Exact treemap report format/naming
- Lighthouse CLI vs DevTools choice
- How to structure the performance documentation

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The success criteria are well-defined by the 4 PERF requirements.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Skeleton loaders from Phase 11 (loading-empty-states) — reuse for chart dynamic import loading states
- `pdf-viewer-modal.tsx` — existing pattern for next/dynamic with ssr:false and loading placeholder
- All 10 recharts-importing components identified and located

### Established Patterns
- next.config.ts wraps config with `withSentryConfig` — bundle analyzer needs to chain with this
- `serverExternalPackages` already used for pino — similar config pattern for `optimizePackageImports`
- Dynamic imports with named exports pattern: `import("./file").then((m) => ({ default: m.Component }))`

### Integration Points
- `next.config.ts` — add optimizePackageImports and bundle analyzer config
- `package.json` — add @next/bundle-analyzer dev dependency and analyze script
- 10 chart component files — wrap with next/dynamic
- `.planning/performance/` — new directory for audit artifacts

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 46-performance-audit*
*Context gathered: 2026-03-04*
