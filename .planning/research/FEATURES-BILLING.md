# Feature Research: SaaS Billing & Monetization

**Domain:** SaaS subscription billing for personal finance app
**Researched:** 2026-02-11
**Confidence:** HIGH (Stripe documentation verified, existing codebase analyzed)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any paid SaaS. Missing these = product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stripe Checkout flow | Industry standard payment UX | LOW | Already partially implemented - `allow_promotion_codes: true` already enabled |
| Monthly and annual billing | Standard SaaS offering, annual saves money | LOW | Already implemented in products.ts |
| Secure payment processing | Users expect PCI compliance | LOW | Stripe handles this automatically |
| Email receipt/invoice | Proof of payment for expense tracking | LOW | Stripe sends automatically |
| Subscription cancellation | Legal requirement, user expectation | LOW | Customer portal handles this |
| Plan upgrade/downgrade | Natural user need as requirements change | MEDIUM | Customer portal with proration |
| Payment method update | Cards expire, users need to update | LOW | Customer portal handles this |
| Subscription renewal notification | Users don't want surprise charges | LOW | Stripe handles automatically |
| Failed payment retry | Cards fail, retry recovers revenue | LOW | Stripe Smart Retries enabled by default |
| Grace period for failed payments | Give users time to fix payment issues | LOW | Stripe handles via dunning settings |
| Invoice history | Users need records for tax/expense | LOW | Customer portal shows this |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable for user experience and business.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tiered feature access (Primary/Enhanced/Advanced) | Clear upgrade path, monetize future features | MEDIUM | Requires feature gating infrastructure |
| Voucher/coupon codes | Acquisition tool, promotional flexibility | LOW | Stripe has native support, already enabled |
| Contextual upgrade prompts | Convert users at point of need | MEDIUM | Requires identifying gated features and prompt timing |
| Annual discount incentive (33%) | Improves cash flow, reduces churn | LOW | Already implemented |
| Branded customer portal | Consistent brand experience | LOW | Stripe allows logo/colors customization |
| Prorated upgrades | Fair billing increases upgrade willingness | LOW | Stripe handles automatically |
| Trial extension vouchers | Retention tool for engaged trial users | LOW | Create time-limited coupons |
| Referral credits | Acquisition through word-of-mouth | MEDIUM | Requires referral tracking system |
| Grandfathered pricing | Reward early adopters, build loyalty | LOW | Use Stripe metadata to track |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Complex tier matrix | More options = more revenue | Too many tiers confuse buyers, 3.5 is optimal average | 3 tiers max (Primary/Enhanced/Advanced) |
| Free tier forever | Lower barrier to entry | Creates support burden, no conversion pressure | 14-day trial with feature access |
| Usage-based billing | Fair pricing based on usage | Revenue unpredictability, confusing invoices for consumer app | Flat monthly/annual pricing |
| Pause subscription | Users want to temporarily stop | Complicates billing logic, rarely resumes | Just cancel/resubscribe |
| Multiple payment methods saved | User convenience | UI complexity, rarely needed for consumer SaaS | Single default payment method |
| Crypto payments | Tech-forward appearance | Volatile pricing, regulatory complexity, less than 1% of users | Credit/debit cards only |
| Lifetime deals | Revenue spike, acquisition | Destroys LTV math, attracts wrong customers | Annual with discount |
| Manual invoicing | Enterprise wants it | Admin overhead, payment delays | Stripe auto-invoicing |
| Complex cancellation flows | Reduce churn | FTC enforcement risk ($2.5B Amazon settlement), dark pattern | Simple one-click cancel |
| Hidden renewal terms | Reduce cancellations | Regulatory risk, user trust damage | Clear disclosure before checkout |

## Feature Dependencies

```
[Stripe Products/Prices Setup]
    |
    +--requires--> [Checkout Flow] (existing)
    |                   |
    |                   +--enables--> [Customer Portal]
    |                   +--enables--> [Webhook Handling] (existing)
    |
    +--requires--> [Coupon/Promo Code System]
                        |
                        +--enables--> [Voucher Codes for Free Months]

[Tier Definition]
    |
    +--requires--> [Feature Gating Utility]
    |                   |
    |                   +--enables--> [Contextual Upgrade Prompts]
    |                   +--enables--> [Feature Access Checks]
    |
    +--requires--> [User Tier Storage] (existing: users.stripePriceId)

[Billing Infrastructure] (existing)
    |
    +--enhances--> [Payment Failure Emails] (TODO in webhook)
    +--enhances--> [Subscription Status Display] (existing)
```

### Dependency Notes

- **Stripe Products/Prices requires Checkout Flow:** Products must exist before checkout can reference them. Checkout already implemented.
- **Feature Gating requires Tier Definition:** Must know which features belong to which tier before gating.
- **Upgrade Prompts require Feature Gating:** Can only prompt for upgrade when user hits a gated feature.
- **Customer Portal requires Webhook Handling:** Portal changes trigger webhooks that must update local state.
- **Voucher System enhances Checkout:** Promo codes already enabled in checkout, just need to create coupons in Stripe.

## MVP Definition

### Launch With (v2.1)

Minimum viable billing - what's needed for monetization.

- [x] **Stripe Checkout integration** - Already implemented
- [x] **Monthly/annual pricing** - Already implemented ($4.99/mo, $39.99/yr)
- [x] **Webhook handling** - Already handles subscription lifecycle
- [ ] **Three-tier product structure** - Primary (current), Enhanced (placeholder), Advanced (placeholder)
- [ ] **Voucher code system** - Create Stripe coupons for "X months free"
- [ ] **Customer portal link** - Already have /api/billing/portal, need UI integration
- [ ] **Feature gating utility** - `canAccessFeature(user, feature)` pattern
- [ ] **Upgrade prompts** - Show when user hits tier limit

### Add After Validation (v2.1.x)

Features to add once core billing is working.

- [ ] **Payment failure email notification** - TODO exists in webhook code
- [ ] **Retention coupon on cancel** - Offer discount before cancel completes
- [ ] **Trial extension for engaged users** - Identify high-engagement trial users

### Future Consideration (v2.2+)

Features to defer until product-market fit is established.

- [ ] **Enhanced tier features** - Actual banking integration when built
- [ ] **Advanced tier features** - Actual investing integration when built
- [ ] **Referral program** - Requires user tracking infrastructure
- [ ] **Team/family plans** - Multi-user access model

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Customer portal integration | HIGH | LOW | P1 |
| Voucher code system | HIGH | LOW | P1 |
| Feature gating utility | HIGH | MEDIUM | P1 |
| Tier product structure | MEDIUM | LOW | P1 |
| Contextual upgrade prompts | HIGH | MEDIUM | P1 |
| Payment failure emails | MEDIUM | LOW | P2 |
| Retention coupons | MEDIUM | LOW | P2 |
| Branded portal | LOW | LOW | P3 |
| Referral program | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.1 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Existing Infrastructure Analysis

### Already Implemented (from codebase review)

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Stripe client | Done | `src/lib/stripe/client.ts` | Lazy initialization pattern |
| Product/price config | Done | `src/lib/stripe/products.ts` | Monthly/annual with formatPrice util |
| Checkout session creation | Done | `src/app/api/billing/create-checkout/route.ts` | Promo codes already enabled |
| Customer portal session | Done | `src/app/api/billing/portal/route.ts` | Redirects to Stripe |
| Webhook handler | Done | `src/app/api/webhooks/stripe/route.ts` | Handles 6 event types |
| User billing fields | Done | `src/lib/db/schema.ts` | stripeCustomerId, stripePriceId, billingStatus, etc. |
| Trial banner UI | Done | `src/components/billing/trial-banner.tsx` | Shows trial countdown |
| Billing settings page | Done | `src/app/(dashboard)/settings/billing/page.tsx` | Checkout + portal links |
| Pricing page | Done | `src/app/(marketing)/pricing/page.tsx` | Marketing page with FAQ |
| User status hook | Done | `src/lib/hooks/use-user.ts` | isTrialActive, isPaid, isActive |

### Gaps to Fill

| Component | Gap | Effort |
|-----------|-----|--------|
| Tier system | No tier concept, just "paid" vs "not paid" | MEDIUM |
| Feature gating | No `canAccessFeature()` utility | MEDIUM |
| Upgrade prompts | No UI components for gated feature prompts | MEDIUM |
| Voucher management | No admin UI to create/manage vouchers | LOW (use Stripe Dashboard) |
| Portal customization | No branding configured | LOW |
| Payment failure email | TODO in webhook, not implemented | LOW |

## Stripe Coupon/Voucher Implementation Details

Based on official Stripe documentation:

### Coupon Types
- **Percent off**: 50% discount
- **Amount off**: $10 discount (supports multi-currency)

### Duration Options
- **Once**: First invoice only (good for "first month free")
- **Repeating**: N months (good for "3 months free")
- **Forever**: Removed in 2025 API for amount-off coupons

### Promotion Codes
- Customer-facing codes mapped to coupons
- Multiple codes can reference same coupon (LAUNCH50, FRIEND50)
- Case-insensitive, must be unique across active codes
- Can restrict: first-time orders, minimum amounts, expiration dates, redemption limits

### Implementation Path
1. Create coupons in Stripe Dashboard or via API
2. Checkout already has `allow_promotion_codes: true`
3. Customer portal can show active promos if enabled
4. No additional code needed for basic voucher support

## Feature Gating Implementation Pattern

Recommended pattern from research:

```typescript
// src/lib/features.ts
type Tier = 'primary' | 'enhanced' | 'advanced';
type Feature = 'pdf_import' | 'patterns' | 'analytics' | 'banking' | 'investing';

const TIER_FEATURES: Record<Tier, Feature[]> = {
  primary: ['pdf_import', 'patterns', 'analytics'],
  enhanced: ['pdf_import', 'patterns', 'analytics', 'banking'],
  advanced: ['pdf_import', 'patterns', 'analytics', 'banking', 'investing'],
};

export function getUserTier(user: User): Tier {
  // Map stripePriceId to tier
  // Return 'primary' for trial users
}

export function canAccessFeature(user: User, feature: Feature): boolean {
  const tier = getUserTier(user);
  return TIER_FEATURES[tier].includes(feature);
}

export function getUpgradeTier(feature: Feature): Tier | null {
  // Return the minimum tier that includes this feature
}
```

### Upgrade Prompt Pattern

```typescript
// Before showing feature
if (!canAccessFeature(user, 'banking')) {
  return <UpgradePrompt
    feature="banking"
    requiredTier={getUpgradeTier('banking')}
  />;
}
// Else show feature
```

## Competitor Feature Analysis

| Feature | Mint | YNAB | Copilot | Our Approach |
|---------|------|------|---------|--------------|
| Free tier | Yes (ad-supported) | No | No | 14-day trial |
| Pricing | Free | $14.99/mo | $10.99/mo | $4.99/mo |
| Annual discount | N/A | ~17% | ~27% | 33% |
| Bank connection | Yes | Yes | Yes | Placeholder (Enhanced) |
| PDF import | No | No | Limited | Core differentiator |
| Promo codes | No | Yes | Limited | Yes (Stripe native) |
| Family plan | No | Yes ($99/yr) | No | Future consideration |

## Regulatory Considerations

### FTC Enforcement (2025-2026)

Recent enforcement actions highlight risks:
- Amazon $2.5B settlement for Prime subscription dark patterns
- Epic $520M settlement included dark pattern allegations
- California requires "symmetric cancellation experience"

### Requirements
1. Clear disclosure of subscription terms before payment
2. Easy cancellation (one-click, no retention obstacle course)
3. No hiding renewal terms in fine print
4. Confirm charge amount before processing

### Our Compliance
- Stripe Checkout shows clear terms
- Customer portal provides easy cancellation
- Pricing page has transparent FAQ
- No dark patterns in implementation

## Sources

### Official Documentation (HIGH confidence)
- [Stripe Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons)
- [Stripe Customer Portal Configuration](https://docs.stripe.com/customer-management/configure-portal)
- [Stripe Build Subscriptions Integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions)

### Industry Analysis (MEDIUM confidence)
- [SaaS Tiered Billing Guide - Maxio](https://www.maxio.com/blog/tiered-pricing-examples-for-saas-businesses)
- [SaaS Pricing Strategy Guide 2026 - Momentum Nexus](https://www.momentumnexus.com/blog/saas-pricing-strategy-guide-2026/)
- [SaaS Billing Best Practices - Orb](https://www.withorb.com/blog/saas-billing-tips)

### UX Patterns (MEDIUM confidence)
- [SaaS Upgrade Prompt UI Examples - SaaSFrame](https://www.saasframe.io/patterns/upgrade-prompt)
- [Best Freemium Upgrade Prompts - Appcues](https://www.appcues.com/blog/best-freemium-upgrade-prompts)

### Regulatory/Legal (HIGH confidence)
- [Dark Patterns Legal Analysis - Terms.Law](https://www.terms.law/2025/12/05/dark-patterns-subscriptions-and-ai-designed-flows-where-the-law-draws-the-line-now/)

---
*Feature research for: SaaS Billing & Monetization (v2.1)*
*Researched: 2026-02-11*
