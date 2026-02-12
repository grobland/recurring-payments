---
phase: 25
plan: 05
subsystem: billing-ui
tags: [pricing-page, multi-tier, marketing, public-facing]
dependencies:
  requires: [25-04]
  provides: [public-pricing-display]
  affects: []
tech-stack:
  added: []
  patterns: [client-side-data-fetch, interval-toggle-state]
decisions:
  - name: Client component for pricing page
    rationale: Needs useState for interval toggle, useEffect for data fetching
    alternatives: Server component with form actions (more complex for simple toggle)
  - name: Fetch from API instead of direct DB query
    rationale: Reuses existing /api/billing/prices endpoint, consistent with billing page
    alternatives: Server component with direct DB query (tighter coupling)
key-files:
  created: []
  modified:
    - src/app/(marketing)/pricing/page.tsx
    - src/app/api/stripe/health/route.ts
    - src/lib/stripe/tiers.ts
metrics:
  duration: 6 minutes
  completed: 2026-02-12
---

# Phase 25 Plan 05: Multi-Tier Public Pricing Page Summary

**One-liner:** Marketing pricing page displays 3 tiers with database-driven pricing and interval toggle

## What Was Done

Rewrote the public marketing pricing page (`/pricing`) to display all three subscription tiers (Primary, Enhanced, Advanced) with prices fetched from the database instead of hardcoded values.

### Key Changes

**1. Removed non-existent imports**
- Deleted import of `PRICING` from products.ts (which didn't exist)
- Caused TypeScript compilation errors in original implementation

**2. Changed from 2-card to 3-tier layout**
- Previous: Monthly vs Annual cards (single tier, two intervals)
- New: Three tier cards (Primary, Enhanced, Advanced) with interval toggle
- Grid layout adjusts responsively (stacks on mobile, 3 columns on desktop)

**3. Database-driven pricing**
- Fetches prices from `/api/billing/prices` endpoint
- Displays real Stripe price amounts, not hardcoded values
- Shows loading state while fetching
- Handles missing prices gracefully

**4. Interval toggle with savings indicator**
- Toggle buttons: Monthly | Annual
- When Annual selected, shows "Save up to X%" badge
- Calculates savings percentage using `calculateAnnualSavings` helper
- Annual prices show monthly equivalent: "That's $X/month"

**5. Visual hierarchy for tier recommendations**
- **Primary:** Standard border, outline button (basic option)
- **Enhanced:** Border-2 primary color, "Most Popular" badge, filled button, shadow-md (recommended)
- **Advanced:** Gradient background (from-background to-muted), filled button (premium)

**6. Preserved existing content**
- FAQ section with updated tier-related questions
- "Ready to take control?" CTA section
- All "Start free trial" buttons link to `/register`

## Deviations from Plan

### Auto-fixed Issues

**[Rule 1 - Bug] Fixed database health check in stripe/health route**
- **Found during:** Initial build attempt
- **Issue:** TypeScript error - `dbCheck.rows` doesn't exist on Drizzle execute() return type
- **Fix:** Changed `dbCheck.rows?.[0]` to `dbCheck?.[0]` (Drizzle returns array directly)
- **Files modified:** src/app/api/stripe/health/route.ts
- **Commit:** e23dc6f (included in main task commit)

**[Rule 1 - Bug] Fixed type export in server action file**
- **Found during:** Build attempt after initial pricing page rewrite
- **Issue:** Runtime error "Tier is not defined" - can't export types from "use server" files
- **Fix:** Removed `export type { Tier }` line from tiers.ts (type still imported internally)
- **Files modified:** src/lib/stripe/tiers.ts
- **Commit:** e23dc6f (included in main task commit)

**[Task consolidation] Tasks 1 and 2 completed together**
- Task 2 requested visual tier differentiation
- Implementation of Task 1 already included all Task 2 requirements:
  - "Most Popular" badge on Enhanced
  - Gradient styling on Advanced
  - Clear visual hierarchy across all tiers
- No separate commit needed for Task 2

## Verification Results

**Build passes:** ✅ `npm run build` completes without TypeScript errors

**Three tiers displayed:** ✅ Primary, Enhanced, Advanced shown in grid layout

**Prices from database:** ✅ Fetched from /api/billing/prices, amounts match stripe_prices table

**Interval toggle works:** ✅ Switching between Monthly/Annual updates all prices and shows savings badge

**Visual hierarchy:** ✅ Enhanced highlighted with badge, Advanced has gradient, clear progression

**Navigation works:** ✅ All CTAs link to /register for free trial signup

## Technical Implementation

### Component Architecture

```
PricingPage (client component)
├── State: selectedInterval, pricingData, isLoading
├── Effect: Fetches /api/billing/prices on mount
├── Interval Toggle Section (buttons with conditional styling)
├── Three Tier Cards (map over tiers array)
│   ├── Conditional badges (Most Popular for Enhanced)
│   ├── Dynamic pricing display (getPrice helper)
│   ├── Monthly equivalent for annual plans
│   ├── Feature lists from TIER_CONFIG
│   └── CTA buttons (variant based on recommendation)
├── FAQ Section (Accordion)
└── Final CTA Section
```

### Data Flow

1. Component mounts → useEffect triggers
2. Fetch `/api/billing/prices` → Returns tier config + all prices
3. setPricingData stores response
4. User toggles interval → setSelectedInterval updates state
5. getPrice() helper returns correct price for tier/interval combination
6. Prices re-render with new interval's amounts

### Pricing Display Logic

```typescript
const getPrice = (tier: Tier, interval: BillingInterval) => {
  if (!pricingData) return null;
  return pricingData.tiers[tier].prices[interval].usd;
};

// Monthly equivalent for annual plans
const monthlyEquivalent = selectedInterval === "year" && price
  ? Math.round(price.amountCents / 12)
  : null;
```

### Visual Styling Pattern

```typescript
className={cn(
  "relative rounded-xl border p-8 transition-shadow hover:shadow-lg",
  recommended && "border-2 border-primary shadow-md",
  key === "advanced" && "bg-gradient-to-br from-background to-muted"
)}
```

## Database Schema Alignment

No schema changes required. Pricing page consumes existing structure:

- `stripePrices` table: tier, interval, currency, amountCents, isActive
- `/api/billing/prices` endpoint: Groups active prices by tier/interval/currency
- `TIER_CONFIG` constant: Provides tier names, taglines, features

## User Experience

**Before (broken):**
- TypeScript errors prevented build
- Only showed 2 cards (monthly vs annual of same tier)
- Prices hardcoded from non-existent PRICING constant

**After:**
- Builds successfully
- Shows 3 distinct tiers side-by-side
- Prices loaded dynamically from database
- Clear visual guidance toward Enhanced tier (Most Popular)
- Interval toggle updates all prices simultaneously
- Annual savings prominently displayed

## Risks & Limitations

**Loading state dependency**
- If API fails, shows "Price unavailable" text
- No retry mechanism (acceptable for marketing page)
- Could add Suspense boundary for better UX in future

**Currency hardcoded to USD**
- Only displays USD prices currently
- Multi-currency selector could be added later (low priority for US-focused launch)

**No server-side rendering of prices**
- Client-side fetch causes slight delay before prices appear
- Acceptable tradeoff for state management simplicity
- Could migrate to Server Component + form actions if SEO becomes priority

## Next Phase Readiness

**Blockers:** None

**Follow-up opportunities:**
- Add currency selector (USD/EUR/GBP toggle)
- A/B test tier ordering (some research suggests showing expensive first)
- Add feature comparison table below cards
- Track click analytics on tier selection

**Dependencies satisfied:**
- Public pricing page now matches billing page structure
- Both use same /api/billing/prices endpoint
- Consistent tier naming and feature presentation
- Grandfathering display is billing-page-only (intentional)

## Alignment with Project Goals

**Core value delivered:**
Users can see transparent pricing for all subscription tiers before signing up, with clear feature differentiation and annual savings incentives.

**Billing & Monetization (v2.1) progress:**
- ✅ Stripe product/price infrastructure (Phase 25-01 to 25-03)
- ✅ Multi-tier billing UI (Phase 25-04)
- ✅ Public pricing page (Phase 25-05) ← **This phase**
- Next: Webhook handling for subscription updates
- Next: Trial expiry logic

**Quality metrics:**
- Zero TypeScript errors
- Clean component structure (under 260 lines including comments)
- Reuses existing API endpoints (DRY principle)
- Responsive design (mobile-first grid)
