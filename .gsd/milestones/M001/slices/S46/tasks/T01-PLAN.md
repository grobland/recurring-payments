# T01: 46-performance-audit 01

**Slice:** S46 — **Milestone:** M001

## Description

Install @next/bundle-analyzer, configure next.config.ts with bundle analyzer chaining and optimizePackageImports for lucide-react, add the npm analyze script, and generate the before-optimization treemap.

Purpose: Establish the measurement baseline before any dynamic import optimizations are applied (Plan 02). The before treemap is essential for showing optimization impact.
Output: Configured next.config.ts, package.json with analyze script, before-treemap HTML committed.

## Must-Haves

- [ ] "Bundle analyzer is configured and gated behind ANALYZE=true env var"
- [ ] "npm run analyze script exists and works"
- [ ] "optimizePackageImports includes lucide-react in next.config.ts"
- [ ] "Before-optimization treemap HTML is committed to .planning/performance/"

## Files

- `next.config.ts`
- `package.json`
- `.planning/performance/bundle-treemap-before.html`
