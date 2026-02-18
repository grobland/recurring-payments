---
phase: 25-multi-tier-product-setup
plan: 02
subsystem: payments
tags: [stripe, subscription, tiers, checkout, pricing, drizzle, postgres]

# Dependency graph
requires:
  - phase: 25-01
    provides: stripe_prices table with tier mapping and grandfathering support
provides:
  - Tier derivation logic that determines user tier from stripePriceId
  - Grandfathering detection showing savings for users on old prices
  - Multi-tier checkout accepting tier/interval/currency parameters
  - Price lookup from database instead of environment variables
affects: [25-03-tier-gating, pricing-page, billing-portal]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Derive tier from price ID via database lookup", "Grandfathering via price comparison", "Database-driven price configuration"]

key-files:
  created:
    - src/lib/stripe/tiers.ts
  modified:
    - src/lib/stripe/products.ts
    - src/app/api/billing/create-checkout/route.ts

key-decisions:
  - "Tier derived from stripePriceId lookup, not stored in user table"
  - "Grandfathering detected by comparing user price to current active price"
  - "Monthly savings calculated by annualizing yearly prices for consistent comparison"
  - "Checkout looks up prices from database, enabling grandfathering without code changes"

patterns-established:
  - "getUserTier(userId): Derive tier from active subscription's price ID"
  - "getGrandfatheringInfo(userId): Compare user's price to current active price for same tier/interval/currency"
  - "getPriceIdForCheckout(tier, interval, currency): Look up active price from database"
  - "Checkout accepts tier parameter instead of hardcoded plan"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 25 Plan 02: Tier Derivation and Multi-Tier Checkout Summary

**Tier derivation from stripePriceId with grandfathering support and database-driven price lookups for multi-tier checkout**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T20:26:41Z
- **Completed:** 2026-02-12T20:28:59Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 updated)

## Accomplishments
- Created tier derivation module with getUserTier() and getGrandfatheringInfo() functions
- Replaced hardcoded price IDs with tier configuration and database lookups
- Updated checkout to accept tier/interval/currency parameters instead of monthly/annual plan
- Enabled grandfathering support through price-to-tier database mapping

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tier derivation module** - `39c5b2b` (feat)
2. **Task 2: Update products configuration for multi-tier** - `4fd6536` (refactor)
3. **Task 3: Update checkout route for multi-tier** - `3f05f66` (feat)

## Files Created/Modified

### Created
- `src/lib/stripe/tiers.ts` - Tier derivation and grandfathering logic with database lookups

### Modified
- `src/lib/stripe/products.ts` - Tier configuration with features, replaced hardcoded prices with TIER_CONFIG
- `src/app/api/billing/create-checkout/route.ts` - Multi-tier checkout accepting tier/interval/currency

## Decisions Made

**1. Tier derived from price ID, not stored as column**
- Rationale: Prevents sync issues when user changes subscriptions, tier is always accurate based on current price
- Implementation: getUserTier() queries stripe_prices table to map stripePriceId to tier

**2. Grandfathering via price comparison**
- Rationale: Shows users their savings when on old prices compared to current rates
- Implementation: getGrandfatheringInfo() looks up current active price for same tier/interval/currency and calculates difference

**3. Monthly savings normalization for yearly prices**
- Rationale: Consistent comparison between monthly and yearly billing intervals
- Implementation: Annual amounts divided by 12 for monthly equivalents when calculating savings

**4. Database price lookup in checkout**
- Rationale: Enables adding new grandfathered prices without code deployment
- Implementation: getPriceIdForCheckout() queries stripe_prices table with tier/interval/currency/isActive filters

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all functions implemented as specified, database queries use existing stripe_prices table from plan 25-01.

## User Setup Required

None - no external service configuration required. Prices will be added to stripe_prices table in next plan (25-03 or separate setup script).

## Next Phase Readiness

**Ready for:**
- Tier gating (25-03): getUserTier() provides current user tier for feature access control
- Pricing page: TIER_CONFIG provides tier names, descriptions, and features for display
- Billing portal: getGrandfatheringInfo() shows savings for grandfathered users

**Blockers:**
- stripe_prices table must be populated with actual Stripe price IDs before checkout works
- Products must be created in Stripe dashboard with prices for each tier/interval/currency combination

**Next steps:**
- Create Stripe products and prices (Primary, Enhanced, Advanced)
- Populate stripe_prices table with price IDs and tier mappings
- Build pricing page UI to display tiers and accept checkout parameters

---
*Phase: 25-multi-tier-product-setup*
*Completed: 2026-02-12*
