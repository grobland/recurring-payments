# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Users can see all their subscriptions in one place and never get surprised by a renewal again
**Current focus:** v2.1 Billing & Monetization - Phase 25 Multi-Tier Setup

## Current Position

Phase: 25 of 28 (Multi-Tier Product Setup)
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-02-12 - Completed 25-03-PLAN.md (Stripe Products and Price Seeding)

Progress: [========================] v2.0 complete | v2.1 [████-] 40%

## Milestone Summary

### v2.1 Billing & Monetization (IN PROGRESS)

**Phases:** 24-28 (5 phases)
**Requirements:** 14 total
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

**Total:** 76 plans completed, 98 requirements validated

## Performance Metrics

**Velocity:**
- Total plans completed: 76
- Average duration: ~6 min
- Total execution time: ~473 min (~7.88 hours)

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

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 25-03-PLAN.md (Phase 25 complete)
Resume file: None
