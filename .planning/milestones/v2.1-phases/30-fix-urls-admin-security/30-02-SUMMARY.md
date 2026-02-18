---
phase: 30-fix-urls-admin-security
plan: 02
subsystem: payments
tags: [stripe, eslint, typescript, navigation, dead-code]

# Dependency graph
requires:
  - phase: 24-stripe-webhooks
    provides: Stripe webhook handler with payment failed email flow
  - phase: 27-pricing-page
    provides: Marketing pricing page at /pricing
provides:
  - Corrected payment failed email return URL pointing to /settings/billing
  - Pricing nav links in marketing site header and footer
  - Dead code removed (unused imports, unreferenced exports)
  - ESLint configured with @typescript-eslint/no-unused-vars warn rule
affects: [future-marketing-pages, stripe-billing-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Marketing layout nav pattern: nav element between logo and auth buttons for top-level links"
    - "ESLint no-unused-vars: warn level with argsIgnorePattern/varsIgnorePattern ^_ and ignoreRestSiblings"

key-files:
  created: []
  modified:
    - src/app/api/webhooks/stripe/route.ts
    - src/app/(marketing)/layout.tsx
    - src/components/pricing/feature-comparison-table.tsx
    - src/lib/stripe/products.ts
    - eslint.config.mjs

key-decisions:
  - "Pricing link visible to all users (always in header nav) per locked decision from research"
  - "ESLint no-unused-vars at warn not error to avoid breaking build on pre-existing warnings"

patterns-established:
  - "Marketing header nav: logo | nav links | auth buttons layout"
  - "ESLint flat config rules block after globalIgnores for project-wide overrides"

requirements-completed: [HOOK-02]

# Metrics
duration: 15min
completed: 2026-02-18
---

# Phase 30 Plan 02: Fix URLs, Pricing Nav, Dead Code, and ESLint Summary

**Corrected Stripe payment failed email return URL from /dashboard/billing to /settings/billing, added Pricing nav links to marketing header and footer, removed unused imports/exports, and configured ESLint no-unused-vars warn rule**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-18T00:00:00Z
- **Completed:** 2026-02-18T00:15:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- HOOK-02 gap closed: payment failed email now directs users to the correct /settings/billing route (not the non-existent /dashboard/billing)
- Pricing page made discoverable: header nav link between logo and auth buttons, footer link before Privacy and Terms
- Dead code eliminated: TIER_LEVELS and cn imports removed from feature-comparison-table.tsx, getTierDisplayName and getTierFeatures functions deleted from products.ts
- ESLint configured to prevent future dead code accumulation via @typescript-eslint/no-unused-vars at warn level
- Build passes with zero errors after all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix payment failed return URL and add pricing navigation links** - `3be286b` (fix)
2. **Task 2: Remove dead code, delete artifact files, and configure stricter ESLint rules** - `ab89ae2` (chore)

## Files Created/Modified

- `src/app/api/webhooks/stripe/route.ts` - Changed /dashboard/billing to /settings/billing in Stripe portal return_url
- `src/app/(marketing)/layout.tsx` - Added Pricing nav link in header and footer
- `src/components/pricing/feature-comparison-table.tsx` - Removed unused TIER_LEVELS and cn imports
- `src/lib/stripe/products.ts` - Deleted getTierDisplayName and getTierFeatures unreferenced exports
- `eslint.config.mjs` - Added @typescript-eslint/no-unused-vars warn rule with underscore patterns

## Decisions Made

- Pricing link is always visible (not conditional on auth state) - matches plan's locked decision, pricing is public marketing content
- ESLint rule set to "warn" not "error" - project may have pre-existing warnings; error level would break CI unnecessarily

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all changes applied cleanly and build succeeded on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 30 complete. All v2.1 gap closure work done (Phases 29-30).
- HOOK-02 requirement satisfied: payment failed flow now routes users to the correct billing settings page.
- Pricing page is fully discoverable from marketing site navigation.
- ESLint rule in place to catch future unused imports before they accumulate.

## Self-Check: PASSED

- FOUND: .planning/phases/30-fix-urls-admin-security/30-02-SUMMARY.md
- FOUND: commit 3be286b (fix: payment failed URL and pricing nav)
- FOUND: commit ab89ae2 (chore: dead code and ESLint)
- FOUND: commit 08eac30 (docs: metadata)
- Build verified: npm run build succeeds with zero errors

---
*Phase: 30-fix-urls-admin-security*
*Completed: 2026-02-18*
