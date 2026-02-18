# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Users can see all their subscriptions in one place and never get surprised by a renewal again
**Current focus:** v2.1 Billing & Monetization - Gap Closure (Phases 29-30)

## Current Position

Phase: 29 of 30 (Apply Feature Gating - Gap Closure)
Plan: 1 of 1 in current phase
Status: Phase 29 complete - feature gating wired into application
Last activity: 2026-02-18 - Completed 29-01-PLAN.md (feature gating applied)

Progress: [========================] v2.0 complete | v2.1 [██████████████░░] 88% (gap closure)

## Milestone Summary

### v2.1 Billing & Monetization (GAP CLOSURE)

**Phases:** 24-30 (7 phases, 2 gap closure)
**Requirements:** 14 total (12 satisfied, 2 gaps)
**Goal:** Enable paid subscriptions with tiered feature access

**Roadmap:** .planning/milestones/v2.1-ROADMAP.md

### v2.0 Statement Hub (SHIPPED 2026-02-10)

**Phases:** 19-23 (5 phases, 21 plans)
**Requirements:** 27/27 complete
**Files modified:** 82 (10,886 insertions)
**LOC:** ~36,050 TypeScript

## Archived Milestones

| Version | Name | Shipped | Phases | Plans | Requirements |
|---------|------|---------|--------|-------|--------------|
| v2.0 | Statement Hub | 2026-02-10 | 19-23 | 21 | 27/27 |
| v1.3 | Data & Intelligence | 2026-02-08 | 13-18 | 21 | 23/23 |
| v1.2 | Production Polish | 2026-02-05 | 9-12 | 10 | 19/19 |
| v1.1 | Import Improvements | 2026-02-02 | 5-8 | 11 | 18/18 |
| v1.0 | Get It Running | 2026-01-30 | 1-4 | 7 | 9/9 |

**Total:** 85 plans completed, 101 requirements validated

## Performance Metrics

**Velocity:**
- Total plans completed: 85
- Average duration: ~6 min
- Total execution time: ~515 min (~8.58 hours)

## Accumulated Context

### Key Patterns (Billing-Relevant)

| Pattern | Description |
|---------|-------------|
| Webhook handler | Verify signature, parse event, switch on type |
| Webhook idempotency | Insert-on-conflict pattern with unique constraint (24-01) |
| Email templates | Consistent layout with base emailLayout wrapper |
| Cron auth | CRON_SECRET bearer token pattern |
| Stripe Customer ID | Stored on users.stripeCustomerId |
| Trial system | 14-day trial with billingStatus enum |
| Checkout flow | Create session, redirect, handle webhook |
| Portal redirect | Create portal session, redirect to Stripe |
| Billing portal flow | Payment method update via Stripe-hosted portal (24-02) |
| Price-to-tier mapping | stripePrices lookup table for grandfathering (25-01) |
| Tier derivation | getUserTier() derives from stripePriceId, not stored column (25-02) |
| Grandfathering check | getGrandfatheringInfo() compares user price to current active price (25-02) |
| Multi-tier checkout | Accepts tier/interval/currency, looks up price from DB (25-02) |
| Seed script connection | Dedicated postgres connection with max:1, connect_timeout:30 for reliability (25-03) |
| Price seeding | onConflictDoUpdate pattern for idempotent seed operations (25-03) |
| Public pricing API | GET /api/billing/prices returns active prices, no auth required (25-04) |
| Server actions for billing | getGrandfatheringInfoAction() callable from client components (25-04) |
| Database-driven pricing UI | Billing page fetches prices from API, not hardcoded (25-04) |
| Marketing pricing display | Three-tier cards with interval toggle, dynamic pricing from database (25-05) |
| Client-side data fetch pattern | useEffect + fetch for public data in client components (25-05) |
| Feature-to-tier mapping | FEATURES constant with FEATURE_TIERS Record<Feature, Tier> (26-01) |
| Feature access checking | hasFeature(), requireFeature(), getUserFeatureAccess() server actions (26-01) |
| Tier hierarchy levels | TIER_LEVELS numeric comparison for tier access (primary=1, enhanced=2, advanced=3) (26-01) |
| Trial user feature access | Null tier treated as primary tier via userTier ?? "primary" pattern (26-01) |
| FeatureGate component | Client component with useEffect to fetch getUserFeatureAccess, renders modal for locked features (26-02) |
| LockedNavItem styling | opacity-50 + pointer-events-none for disabled navigation items (26-02) |
| Upgrade modal pattern | Dialog with tier features from TIER_CONFIG, CTAs to /pricing and /settings/billing (26-02) |
| Current tier highlighting | isCurrentTier = isPaid && userTier === tier for visual tier indication (27-02) |
| Feature comparison table | Static FEATURE_MATRIX with responsive hidden md:table / md:hidden cards pattern (27-01) |
| Portal tier switching | Self-service tier switching via Stripe-hosted Customer Portal (27-03) |
| Portal branding | Logo and colors configured in Stripe Dashboard Branding settings (27-03) |
| Nullable FK for set null | appliedByAdminId without .notNull() enables onDelete: "set null" (28-01) |
| Admin endpoint auth | Session auth only, admin role gating deferred for MVP (28-01) |
| Cumulative trial extension | Extend from max(trialEndDate, now) ensures forward extension (28-01) |
| API route feature gating | requireFeature() after auth check, 403 handler catches feature errors by string prefix (29-01) |
| Page content gating | FeatureGate wraps main content, header stays outside gate for visibility (29-01) |
| Nav item locking | LockedNavItem inside SidebarMenuItem, renders opacity-50 + pointer-events-none for locked features (29-01) |


### Blockers/Concerns

**Production deployment (carried forward):**
- RESEND_FROM_EMAIL needs verified domain for email delivery
- NEXT_PUBLIC_SENTRY_DSN needed for Sentry error tracking

**Billing-specific:**
- Payment failure emails require RESEND_API_KEY configuration
- Health check needs actual webhook traffic for meaningful metrics
- Cron jobs require CRON_SECRET environment variable in production

**Admin UI:**
- Admin access currently open to all authenticated users (future: role-based access control)
- Webhook logs require manual refresh (no real-time updates)

## Decisions Log

| Phase | Decision | Rationale | Impact |
|-------|----------|-----------|--------|
| 24-01 | Insert-on-conflict idempotency pattern | Atomic check-and-insert via PostgreSQL unique constraint | Eliminates race conditions, no external dependencies |
| 24-01 | Return 200 for failed events | Prevents Stripe retry storms for non-retriable errors | Only database connection errors return 500 |
| 24-01 | 30-day webhook event TTL | Matches Stripe event retention window | Bounded storage, requires cleanup cron |
| 24-02 | Payment email on first attempt only | Avoid email spam during Stripe's automatic retry cycle | Users get one notification per payment issue |
| 24-02 | Stripe billing portal for payment updates | Secure, Stripe-hosted flow eliminates custom UI | No PCI compliance burden, better UX |
| 24-02 | Public health check endpoint | For use by load balancers and monitoring tools | Exposes basic metrics but no sensitive data |
| 24-02 | Daily webhook cleanup at 4 AM UTC | Low-traffic time, 1 hour after general cleanup | Automated data retention management |
| 24-03 | Server components for admin pages | No client state needed, leverages server-side data fetching | Simpler architecture, better performance |
| 24-03 | Filter via URL searchParams | Shareable URLs, no client state management | Users can bookmark filtered views |
| 24-03 | date-fns format for timestamps | Prevents hydration mismatch between server and client | Consistent rendering, no console warnings |
| 24-03 | 50 events per page pagination | Balance between performance and UX | Good experience for typical webhook volumes |
| 25-01 | Store tier as enum | Type safety and database constraint enforcement | Prevents invalid tier values, better IDE autocomplete |
| 25-01 | Unique index on stripePriceId | Fast O(1) lookup when determining user tier | Critical for performance on every authenticated request |
| 25-01 | isActive boolean flag | Distinguish current prices from grandfathered prices | Enables price changes without breaking existing subscribers |
| 25-02 | Derive tier from price ID | Query stripe_prices table instead of storing tier column | Prevents sync issues, tier always accurate based on current subscription |
| 25-02 | Grandfathering via price comparison | Compare user's price to current active price for same tier/interval/currency | Shows users their savings when on old prices |
| 25-02 | Monthly savings normalization | Annualize yearly prices for consistent comparison | Enables fair comparison between monthly and yearly billing |
| 25-02 | Database price lookup in checkout | getPriceIdForCheckout() queries stripe_prices table | Enables adding grandfathered prices without code deployment |
| 25-03 | Dedicated postgres connection for seed scripts | Create connection with custom timeouts instead of using shared db instance | Resolves connection timeouts in network-constrained environments |
| 25-03 | SQL migration for seed data | Create 0009_seed_stripe_prices.sql as backup seeding method | Provides alternative execution path if TypeScript script fails |
| 25-04 | Public prices API endpoint | Pricing information is public, no need for authentication | Simpler frontend code, can be cached by CDN |
| 25-04 | Server action for grandfathering info | Enables client components to fetch user-specific billing data | Cleaner than separate API route, co-located with tier logic |
| 25-04 | Tier selection via click on card | Visual selection before checkout provides better UX | Users can review tier details before subscribing |
| 25-04 | Default to USD currency | Multi-currency UI can be added later | Users currently only see USD pricing |
| 25-05 | Client component for pricing page | Needs useState for interval toggle, useEffect for data fetching | Simpler than server component with form actions for toggle state |
| 25-05 | Fetch from API instead of direct DB query | Reuses existing /api/billing/prices endpoint | Consistent with billing page, avoids database coupling in marketing page |
| 26-01 | Features as const object with string values | Better JSON serialization and debugging than enums | Type-safe via Feature type union |
| 26-01 | Numeric tier levels for hierarchy | Simple comparison via TIER_LEVELS[tier] enables future tier additions | Extensible tier system |
| 26-01 | Null tier = primary | Trial users get primary tier access via coalescing | Consistent trial experience |
| 26-01 | Server actions for feature checks | Consistent with tiers.ts pattern | Use from both client and server components |
| 26-02 | Locked placeholder with Lock icon | Visual indication of locked feature, clickable to trigger upgrade modal | Clear UX for locked features |
| 26-02 | Modal CTAs to /pricing and /settings/billing | Two paths: compare tiers or upgrade directly | Flexibility for different user intents |
| 26-02 | LockedNavItem uses pointer-events-none | Prevents interaction entirely rather than showing error | Cleaner disabled state for navigation |
| 27-02 | Show pricing cards to all users | Paid users can compare tiers and consider upgrades | Better UX for plan management |
| 27-02 | Current Plan badge replaces Recommended | Clear visual indication of active subscription | No confusion about which tier user owns |
| 27-01 | Static FEATURE_MATRIX array | Custom display names without coupling to FEATURES config | Simpler, more flexible feature naming |
| 27-01 | Mobile cards show only available features | No X icons on mobile - cleaner UX | Focus on what tier provides, not what's missing |
| 27-03 | Proration: Credit remaining time | Fair billing on tier switches | Users not charged twice for same period |
| 27-03 | All tiers in portal catalog | Users can upgrade or downgrade self-service | Reduces support burden |
| 28-01 | appliedByAdminId nullable | Enables onDelete: "set null" - preserves extension records when admin deleted | Audit trail maintained even if admin user removed |
| 28-01 | Session auth only for admin endpoint | Admin role gating deferred for MVP | Simpler implementation, can add roles later |
| 28-01 | Cumulative extension from max(trialEndDate, now) | Ensures extensions always extend forward, never backward | Prevents accidental trial shortening |
| 28-02 | Client form for interactivity | Server component page with client form child enables useState/fetch | Clean separation of server queries and client interactions |
| 28-02 | Pass trialUsers via props | Server queries trial users, passes to client form | Avoids duplicate DB queries in client |
| 29-01 | requireFeature after auth check | 401 takes priority over 403 for unauthenticated requests | Correct HTTP semantics for auth vs authorization |
| 29-01 | Feature error string prefix check | requireFeature throws plain Error, not custom class | Catch block identifies feature errors via message.startsWith() |
| 29-01 | DashboardHeader outside FeatureGate | Users see page title even when content is locked | Better UX - header gives context before upgrade modal |

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 29-01-PLAN.md (Apply Feature Gating)
Resume file: .planning/phases/30-e2e-billing-flow/
