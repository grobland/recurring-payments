# Project Research Summary

**Project:** Subscription Manager - Billing & Monetization (v2.1)
**Domain:** SaaS Subscription Billing
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

This milestone adds tiered billing infrastructure to an existing subscription tracking application that already has a solid Stripe foundation. The codebase already includes Stripe SDK integration (v20.2.0), checkout sessions, webhook handling, customer portal, and trial management. The core work is **architectural expansion, not technology addition** — no new libraries are required.

The recommended approach is to extend the existing single-tier setup to three tiers (Primary/Enhanced/Advanced) by: (1) creating tier-aware product configuration, (2) building feature gating utilities for both server and client, (3) applying gates across existing features, and (4) leveraging Stripe's built-in promotion code system for vouchers. The existing `stripePriceId` field on the users table already captures which tier a user is on — we map price IDs to tiers rather than adding redundant tier columns.

Key risks center on webhook reliability and feature gating race conditions. The existing webhook handler lacks idempotency tracking, which could cause duplicate processing during retries. Feature gating must include server-side verification — client-side checks alone can be bypassed. Additionally, the `allow_promotion_codes: true` flag is already enabled in checkout, so promo codes are live from day one and need proper redemption limits to prevent abuse.

## Key Findings

### Recommended Stack

**No new packages required.** The existing stack is sufficient for all billing requirements.

**Core technologies (already installed):**
- **stripe@20.2.0**: Server-side Stripe API — already handling checkout, webhooks, portal
- **@stripe/stripe-js@8.6.3**: Client-side Stripe redirect — no embedded elements needed
- **Drizzle ORM**: Database operations — schema already has billing fields (billingStatus, stripeCustomerId, stripePriceId, etc.)
- **NextAuth.js v5**: Session management — user context available for tier checks
- **TanStack Query**: State management — useUserStatus hook already provides billing state

**What NOT to add:**
- @stripe/react-stripe-js — Using Checkout redirect, not embedded elements
- Feature flag services (LaunchDarkly) — Simple tier-based gating is sufficient
- Custom coupon database — Stripe handles redemption limits, expiration, fraud

### Expected Features

**Must have (table stakes):**
- Stripe Checkout flow (already implemented)
- Monthly and annual billing (already implemented)
- Email receipts/invoices (Stripe automatic)
- Subscription cancellation (Customer portal)
- Plan upgrade/downgrade with proration (Customer portal)
- Payment method update (Customer portal)
- Failed payment retry (Stripe Smart Retries)

**Should have (differentiators):**
- Three-tier product structure (Primary $4.99, Enhanced $9.99, Advanced $19.99)
- Feature gating with contextual upgrade prompts
- Voucher/coupon codes for free months (Stripe promotion codes)
- Annual discount incentive (33% savings)

**Defer (v2.2+):**
- Referral program (requires tracking infrastructure)
- Team/family plans (multi-user access model)
- Retention coupon on cancel attempt
- Trial extension for high-engagement users

### Architecture Approach

The architecture extends the existing billing layer by adding tier awareness. The `stripePriceId` field already on the users table serves as the source of truth for tier determination — a lookup function maps price IDs to tiers. Feature access is controlled by a configuration constant (TIER_LIMITS/TIER_FEATURES) that defines which features belong to which tier. Gating happens at two levels: client-side for UI (FeatureGate component) and server-side for API routes (requireFeature utility). Trial users get Enhanced tier access to experience premium features before conversion.

**Major components:**
1. **lib/stripe/products.ts (extended)** — Tier definitions, price ID mappings, feature lists per tier
2. **lib/billing/feature-gate.ts (new)** — Server-side hasFeature(), requireFeature(), getUserTier() utilities
3. **components/billing/feature-gate.tsx (new)** — Client-side FeatureGate component with upgrade prompts
4. **lib/hooks/use-user.ts (extended)** — Add tier and hasFeature to existing useUserStatus hook
5. **webhooks/stripe (updated)** — Add idempotency tracking, extract tier from price ID on subscription events

### Critical Pitfalls

1. **Non-Idempotent Webhooks** — Stripe retries webhooks for up to 3 days. Without tracking processed event IDs, duplicate charges and data corruption occur. Create a `stripe_events` table and check `event.id` before processing.

2. **Feature Gating Race Conditions** — User upgrades but webhook hasn't processed yet. Client-side cache shows old tier. Always verify tier server-side for premium actions, invalidate cache on checkout success redirect.

3. **Voucher Code Exploitation** — Promo codes shared publicly with no limits. Always set `max_redemptions`, use `first_time_transaction` restriction, monitor usage in Stripe dashboard.

4. **Trial-to-Paid Conversion Gaps** — Trial expires during checkout flow. Extend trial by 24 hours when checkout initiated, resolve state conflicts in webhook handler.

5. **Client-Side Only Feature Gating** — Users can bypass React component checks by calling API directly. Always validate tier in API routes for premium features.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Webhook Infrastructure Hardening
**Rationale:** Foundation that all billing depends on. Current handler lacks idempotency — must fix before adding complexity.
**Delivers:** Reliable webhook processing with idempotency tracking, complete event coverage
**Addresses:** Subscription lifecycle sync, trial-to-paid transitions
**Avoids:** Duplicate processing (Pitfall 1), webhook timeouts (Pitfall 2), missing event coverage (Pitfall 8)
**Estimated effort:** Medium

### Phase 2: Multi-Tier Product Setup
**Rationale:** Products must exist in Stripe before checkout can reference them. Configuration-only phase.
**Delivers:** Three products in Stripe, six prices (monthly/annual each), extended products.ts with tier configuration
**Uses:** Stripe Dashboard, environment variables for price IDs
**Implements:** TIERS configuration, getTierFromPriceId() lookup
**Estimated effort:** Low

### Phase 3: Feature Gating Infrastructure
**Rationale:** Gating utilities must exist before applying gates to features. Server and client components.
**Delivers:** hasFeature/requireFeature utilities, FeatureGate component, extended useUserStatus hook
**Addresses:** Tier-based access control (table stakes for multi-tier)
**Avoids:** Client-only gating bypass (Pitfall 5), multi-tier confusion (Pitfall 9)
**Estimated effort:** Medium

### Phase 4: Feature Gate Rollout
**Rationale:** Apply gates to existing features now that infrastructure is ready.
**Delivers:** PDF import gated by tier, pattern detection gated, statement browser gated (Advanced only), upgrade prompts at gate points
**Implements:** Usage limits per tier, contextual upgrade CTAs
**Estimated effort:** Medium (many touchpoints across app)

### Phase 5: Pricing & Billing UI
**Rationale:** UI updates after backend is complete. Pricing page, billing settings, tier comparison.
**Delivers:** Three-tier pricing page, updated billing settings with current tier display, plan switching with proration preview
**Avoids:** Plan switching proration confusion (Pitfall 10)
**Estimated effort:** Low

### Phase 6: Voucher System
**Rationale:** Independent feature, can run parallel with Phase 4-5. Leverages existing allow_promotion_codes.
**Delivers:** Stripe coupons and promotion codes created, documented redemption flows, admin guide for creating codes
**Addresses:** Acquisition tool requirement, free months promotional capability
**Avoids:** Voucher exploitation (Pitfall 4), portal promo exposure (Pitfall 6)
**Estimated effort:** Low (mostly Stripe Dashboard configuration)

### Phase Ordering Rationale

- **Phase 1 is non-negotiable first** — All subsequent phases depend on reliable webhooks for tier sync
- **Phase 2 before Phase 3** — Feature gating needs to know tier; tier comes from Stripe price IDs
- **Phase 3 before Phase 4** — Must have gating utilities before applying gates
- **Phase 4 before Phase 5** — Gates must work before showing tier-specific UI
- **Phase 6 is independent** — Can run in parallel with 4-5, only needs Stripe products from Phase 2

### Research Flags

**Phases with well-documented patterns (skip phase research):**
- **Phase 1 (Webhooks):** Stripe documentation is comprehensive, existing codebase has foundation
- **Phase 2 (Products):** Stripe Dashboard configuration, no code research needed
- **Phase 3 (Feature Gating):** Standard SaaS pattern, multiple reference implementations available
- **Phase 6 (Vouchers):** Stripe handles everything, allow_promotion_codes already enabled

**Phases that may need implementation validation:**
- **Phase 4 (Gate Rollout):** Needs per-feature decisions on which tier gets what — review during planning
- **Phase 5 (Pricing UI):** May need proration preview API testing — verify Stripe invoice preview behavior

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new packages needed; all technologies already installed and working |
| Features | HIGH | Stripe documentation verified; existing codebase analyzed; feature gaps are clear |
| Architecture | HIGH | Extends existing patterns; no new paradigms; users table already has billing fields |
| Pitfalls | HIGH | Official Stripe docs on webhooks/coupons; codebase analysis confirms current gaps |

**Overall confidence:** HIGH

This is an architectural expansion of existing, working code. The Stripe foundation is solid. Risk is execution, not technology.

### Gaps to Address

- **Proration behavior testing:** Need to verify Stripe invoice preview API for plan switching before Phase 5 implementation
- **Tier feature allocation:** Research did not prescribe exactly which features belong to which tier — this needs product decision during Phase 4 planning
- **Webhook queue pattern:** Current recommendation is idempotency table; queue-based async processing is optional optimization if timeout issues occur

## Sources

### Primary (HIGH confidence)
- Stripe SDK: package.json (stripe@20.2.0, @stripe/stripe-js@8.6.3)
- Stripe Subscriptions Build Guide: https://docs.stripe.com/billing/subscriptions/build-subscriptions
- Stripe Coupons & Promotion Codes: https://docs.stripe.com/billing/subscriptions/coupons
- Stripe Webhooks Best Practices: https://docs.stripe.com/webhooks/best-practices
- Stripe Customer Portal Configuration: https://docs.stripe.com/customer-management/configure-portal
- Codebase: src/lib/stripe/client.ts, src/app/api/webhooks/stripe/route.ts, src/lib/db/schema.ts

### Secondary (MEDIUM confidence)
- T3's Stripe Recommendations: https://github.com/t3dotgg/stripe-recommendations
- Vercel nextjs-subscription-payments: https://github.com/vercel/nextjs-subscription-payments
- Pedro Alonso Stripe + Next.js 15 Guide: https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/
- Clerk use-stripe-subscription: https://github.com/clerk/use-stripe-subscription

### Tertiary (for reference)
- SaaS Tiered Billing Guide - Maxio
- SaaS Pricing Strategy Guide 2026 - Momentum Nexus
- BigBinary Database Design for Subscriptions

---
*Research completed: 2026-02-11*
*Ready for roadmap: yes*
