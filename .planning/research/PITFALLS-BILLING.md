# Pitfalls Research: Billing & Monetization

**Domain:** Adding billing infrastructure to existing subscription tracking app
**Researched:** 2026-02-11
**Confidence:** HIGH (verified with Stripe official documentation and existing codebase analysis)

## Critical Pitfalls

Mistakes that cause rewrites, revenue loss, or major security issues.

### Pitfall 1: Non-Idempotent Webhook Handlers

**What goes wrong:**
Stripe retries webhooks for up to 3 days when your handler fails or times out. Without idempotency, the same event processes multiple times: users get charged twice, receive duplicate emails, or get credits applied multiple times.

**Why it happens:**
Developers assume webhooks are delivered exactly once. They process events directly without checking if they've been handled before. The current implementation in `src/app/api/webhooks/stripe/route.ts` lacks idempotency tracking.

**How to avoid:**
1. Create a `stripe_events` table to track processed event IDs
2. Check if `event.id` exists before any business logic
3. Use database transactions to ensure atomicity
4. For composite operations, use `event.id + event.type` as the idempotency key

```typescript
// Example: Add to webhook handler
const existingEvent = await db.query.stripeEvents.findFirst({
  where: eq(stripeEvents.eventId, event.id)
});
if (existingEvent) {
  return NextResponse.json({ received: true }); // Already processed
}
// Process event, then save event ID
await db.insert(stripeEvents).values({ eventId: event.id, processedAt: new Date() });
```

**Warning signs:**
- Duplicate entries in reminder_logs or other audit tables
- Users reporting double charges
- Multiple "subscription activated" logs for same user

**Phase to address:**
Phase 1: Webhook Infrastructure - Must implement idempotency table and checks before going live

---

### Pitfall 2: Webhook Timeout Causing Lost Events

**What goes wrong:**
Stripe expects a 2xx response within 20 seconds. Complex operations (database writes, external API calls, email sending) exceed this limit. Stripe marks delivery as failed and retries, but if your handler eventually succeeded, you now have duplicate processing without idempotency.

**Why it happens:**
Developers perform all business logic synchronously before responding. The current webhook handler does database queries and writes synchronously.

**How to avoid:**
1. Return 200 immediately after signature verification
2. Queue the event for async processing (use a job queue or database queue)
3. Process the queued event in a background worker or cron job

```typescript
// Quick acknowledgment pattern
export async function POST(request: Request) {
  // Verify signature (fast)
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  // Queue for async processing (fast)
  await db.insert(webhookQueue).values({
    eventId: event.id,
    eventType: event.type,
    payload: event.data.object,
    status: 'pending'
  });

  // Return immediately
  return NextResponse.json({ received: true });
}

// Separate cron job or worker processes the queue
```

**Warning signs:**
- Stripe dashboard shows webhook failures/retries
- `[504]` or timeout errors in logs
- Inconsistent subscription states

**Phase to address:**
Phase 1: Webhook Infrastructure - Implement queue-based processing pattern

---

### Pitfall 3: Feature Gating Race Conditions

**What goes wrong:**
User upgrades, but webhook hasn't processed yet. They access a premium feature, and the check passes because their old tier is cached. Or worse: they downgrade, webhook processes, but cached tier still shows premium.

**Why it happens:**
Client-side tier checks use stale data from TanStack Query cache. The existing `useUserStatus()` hook in `src/lib/hooks/use-user.ts` caches for 5 minutes. Webhook updates the database, but the client doesn't know.

**How to avoid:**
1. Invalidate user query cache on checkout success redirect
2. Add a `revalidate` parameter to success URL
3. For critical actions, always verify tier server-side
4. Consider real-time sync via Supabase subscriptions for billing status

```typescript
// On checkout success page:
useEffect(() => {
  if (searchParams.get("success") === "true") {
    queryClient.invalidateQueries({ queryKey: userKeys.profile() });
  }
}, [searchParams]);

// Server-side verification for premium actions:
async function handlePremiumAction() {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (user.billingStatus !== 'active') {
    throw new Error('Premium subscription required');
  }
}
```

**Warning signs:**
- Users reporting they can't access features after upgrade
- Users accessing premium features after downgrade
- Support tickets about "feature not working" that resolve on page refresh

**Phase to address:**
Phase 2: Feature Gating - Implement server-side verification and cache invalidation strategy

---

### Pitfall 4: Voucher Code Exploitation

**What goes wrong:**
Users share promo codes publicly. Codes intended for one-time use get used thousands of times. Percentage-off codes stack unexpectedly with other discounts. Revenue loss from uncontrolled discount application.

**Why it happens:**
Developers create coupons without usage limits. Stripe's `allow_promotion_codes: true` in checkout enables all active promo codes by default. The current checkout implementation at `src/app/api/billing/create-checkout/route.ts` uses this flag without restrictions.

**How to avoid:**
1. Always set `max_redemptions` on promotion codes
2. Use `first_time_order: true` restriction for acquisition offers
3. Use `customer` restriction for targeted offers
4. Monitor promo code usage in Stripe dashboard
5. Consider validating codes server-side before checkout

```typescript
// Create restricted promo code
const promoCode = await stripe.promotionCodes.create({
  coupon: couponId,
  code: 'LAUNCH25',
  max_redemptions: 100,
  restrictions: {
    first_time_transaction: true,
  },
  expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
});
```

**Warning signs:**
- Sudden spike in promo code usage
- Promo codes appearing on coupon aggregator sites
- Revenue significantly below projections during promotional period

**Phase to address:**
Phase 3: Voucher System - Implement code restrictions and monitoring from day one

---

### Pitfall 5: Trial-to-Paid Conversion Gaps

**What goes wrong:**
User's trial expires while they're in the checkout flow. Trial end date passes between clicking "upgrade" and completing payment. User ends up in expired state with active subscription, or active state with no subscription.

**Why it happens:**
Race condition between trial expiration and payment completion. The current implementation treats trial expiration and subscription activation as independent events.

**How to avoid:**
1. Keep trial active during checkout (grace period)
2. Use Stripe's trial features instead of custom trial tracking
3. In webhook handler, always check for and resolve state conflicts
4. Consider extending trial by 24 hours when checkout is initiated

```typescript
// Before creating checkout, extend trial if needed
if (user.billingStatus === 'trial' && user.trialEndDate) {
  const hoursLeft = (new Date(user.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft < 24) {
    // Extend trial to give them time to complete checkout
    await db.update(users).set({
      trialEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }).where(eq(users.id, user.id));
  }
}
```

**Warning signs:**
- Users with `billingStatus: 'cancelled'` but `stripeSubscriptionId` set
- Support tickets: "I upgraded but it says my trial expired"
- Churned users who actually tried to pay

**Phase to address:**
Phase 1: Webhook Infrastructure - Implement grace period and conflict resolution

---

### Pitfall 6: Customer Portal Exposing Promo Codes

**What goes wrong:**
Stripe's customer portal displays applied promotion codes. Customers screenshot codes and share them. "Private" or high-value codes become public.

**Why it happens:**
Portal default behavior shows subscription details including applied discounts. Current implementation at `src/app/api/billing/portal/route.ts` uses default portal configuration without customization.

**How to avoid:**
1. For sensitive codes, apply coupons directly (not promo codes) - they don't display the code string
2. Set strict `max_redemptions` on all promo codes
3. Configure portal to hide certain sections if needed
4. Use customer-specific codes that can only be used by one customer

```typescript
// Apply coupon directly instead of promo code for sensitive offers
await stripe.subscriptions.update(subscriptionId, {
  coupon: 'partner_discount', // Coupon ID, not promo code
});

// Or create customer-specific promo codes
const promoCode = await stripe.promotionCodes.create({
  coupon: couponId,
  customer: customerId, // Only this customer can use it
});
```

**Warning signs:**
- Same promo code appearing in multiple unrelated signups
- Promo codes posted on social media or forums

**Phase to address:**
Phase 4: Customer Portal - Configure portal and use coupons for sensitive discounts

---

### Pitfall 7: Webhook Signature Verification Timing Attack

**What goes wrong:**
Persisted webhooks fail signature verification because Stripe limits verification to 5 minutes after event creation. You can't queue raw webhooks for later processing if you need to verify signature.

**Why it happens:**
Developers try to persist the full webhook payload for async processing, then verify when processing. Stripe's timestamp tolerance prevents replay attacks but breaks this pattern.

**How to avoid:**
1. Verify signature immediately on receipt
2. Only persist verified events (trust your queue, not the raw payload)
3. Store event data, not the raw request

```typescript
// CORRECT: Verify first, then queue
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
// Now safe to queue the verified event data
await queueEvent(event);

// WRONG: Queue raw, verify later
await queueRawWebhook(body, signature); // Will fail verification later
```

**Warning signs:**
- Signature verification errors in logs for queued webhooks
- Events stuck in processing queue with verification failures

**Phase to address:**
Phase 1: Webhook Infrastructure - Verify before queueing

---

### Pitfall 8: Missing Billing Status Sync on Subscription Events

**What goes wrong:**
User's payment fails, but their `billingStatus` stays "active" because you only handle `checkout.session.completed`. They continue accessing premium features without paying.

**Why it happens:**
Incomplete webhook event coverage. The current implementation handles key events but may miss edge cases like `invoice.payment_failed` -> `past_due` -> `cancelled` flow.

**How to avoid:**
Handle the complete subscription lifecycle:

```typescript
// Events to handle:
const criticalEvents = [
  'checkout.session.completed',     // Initial subscription
  'customer.subscription.created',  // Backup for new subs
  'customer.subscription.updated',  // Plan changes, renewals
  'customer.subscription.deleted',  // Cancellations
  'invoice.payment_succeeded',      // Renewal payments
  'invoice.payment_failed',         // Failed payments -> past_due
  'customer.subscription.paused',   // If using pause feature
  'customer.subscription.resumed',  // Resume from pause
];
```

**Warning signs:**
- Users with Stripe status "past_due" but local status "active"
- Revenue leakage: users accessing features without active subscription
- Stripe dashboard shows failed payments but no local record

**Phase to address:**
Phase 1: Webhook Infrastructure - Audit and complete event coverage

---

### Pitfall 9: Multi-Tier Pricing Without Tier Tracking

**What goes wrong:**
You add three tiers (Primary, Enhanced, Advanced) but store only `billingStatus: 'active'`. Can't differentiate tier-specific features. User on Primary tier can access Advanced features.

**Why it happens:**
Original schema has single `billingStatus` enum without tier granularity. Current `stripePriceId` field stores price but you need logic to map prices to feature sets.

**How to avoid:**
1. Add `tier` column to users table (or derive from `stripePriceId`)
2. Create a tier-to-features mapping configuration
3. Check tier, not just "active" status, for feature access

```typescript
// Add tier tracking
export const tierEnum = pgEnum("tier", ["free", "primary", "enhanced", "advanced"]);

// In users table
tier: tierEnum("tier").default("free").notNull(),

// Tier-to-features mapping
const TIER_FEATURES = {
  free: { maxSubscriptions: 5, aiImport: false, reminders: false },
  primary: { maxSubscriptions: 50, aiImport: true, reminders: true },
  enhanced: { maxSubscriptions: -1, aiImport: true, reminders: true, analytics: true },
  advanced: { maxSubscriptions: -1, aiImport: true, reminders: true, analytics: true, api: true },
};

// Feature check
function canAccessFeature(user: User, feature: string): boolean {
  return TIER_FEATURES[user.tier][feature] === true;
}
```

**Warning signs:**
- All paying users have same features regardless of price paid
- No way to upsell from lower to higher tier
- Feature access logs don't differentiate by tier

**Phase to address:**
Phase 2: Feature Gating - Must implement tier tracking before multi-tier launch

---

### Pitfall 10: Plan Switching Proration Confusion

**What goes wrong:**
User upgrades from Primary ($4.99/mo) to Advanced ($14.99/mo) mid-cycle. They're charged $14.99 immediately instead of prorated amount. Or they're charged nothing and get free access until renewal. Either way, users complain.

**Why it happens:**
Stripe's default proration behavior may not match user expectations. Switching between monthly and annual plans adds complexity. Proration explanation not shown to user before they confirm.

**How to avoid:**
1. Use Stripe's `proration_behavior` parameter explicitly
2. Show proration preview before confirming upgrade
3. For downgrades, use `cancel_at_period_end` instead of immediate switch
4. Test all plan-to-plan transitions thoroughly

```typescript
// Preview proration before switching
const preview = await stripe.invoices.retrieveUpcoming({
  customer: user.stripeCustomerId,
  subscription: user.stripeSubscriptionId,
  subscription_items: [{
    id: subscriptionItemId,
    price: newPriceId,
  }],
  subscription_proration_behavior: 'create_prorations',
});

// Show preview to user
const prorationAmount = preview.lines.data
  .filter(line => line.proration)
  .reduce((sum, line) => sum + line.amount, 0);

// User confirms, then apply
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: itemId, price: newPriceId }],
  proration_behavior: 'create_prorations',
});
```

**Warning signs:**
- Chargebacks/disputes after plan changes
- Support tickets about unexpected charges
- Users confused by invoice amounts

**Phase to address:**
Phase 2: Feature Gating - Plan switching with proration preview

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single-tier pricing | Simpler implementation | Can't differentiate value, no upsell path | MVP only, plan migration needed later |
| Client-side tier checks only | Faster development | Security bypass, feature access exploits | Never for premium features |
| Storing Stripe IDs only | Less data duplication | Can't audit, can't debug, can't migrate | Never - always store billing state locally |
| Skipping idempotency | Faster initial build | Duplicate charges, data corruption | Never |
| Hardcoded price IDs | Quick setup | Deploy required for price changes | Staging/dev only |
| No webhook retry handling | Fewer edge cases | Lost events, inconsistent state | Never for billing |

## Integration Gotchas

Common mistakes when connecting to Stripe.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Checkout Sessions | Not setting `metadata.userId` | Always include user ID for webhook correlation |
| Customer Portal | Using default configuration | Configure allowed actions, hide sensitive info |
| Webhook Endpoint | Using localhost or HTTP | Use HTTPS with valid cert, use Stripe CLI for local dev |
| Price IDs | Mixing test/live mode IDs | Separate env vars: `STRIPE_MONTHLY_PRICE_ID_TEST`, `STRIPE_MONTHLY_PRICE_ID_LIVE` |
| Subscription Updates | Calling Stripe API without webhook sync | Update local state via webhooks, not API response |
| Error Handling | Generic error messages | Parse Stripe error codes, show actionable messages |
| Customer Creation | Creating customer on checkout only | Create customer on signup for cleaner flow |
| API Version | Not pinning API version | Pin version in code, upgrade deliberately |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous webhook processing | Timeouts, retries, duplicates | Queue-based async processing | 100+ concurrent webhooks |
| N+1 queries in tier checks | Slow page loads, high DB load | Cache user tier, batch queries | 1000+ active users |
| No billing status index | Slow queries for "all active users" | Add index on `billingStatus` | 10K+ users |
| Polling for subscription status | Unnecessary API calls | Use webhooks, cache aggressively | 100+ active users |
| Real-time Stripe API calls | Slow page loads, rate limits | Cache subscription data locally | 500+ daily checkouts |

## Security Mistakes

Billing-specific security issues.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Stripe secret key client-side | Complete account takeover | Server-side only, use publishable key for client |
| Trusting client-side tier claim | Feature access bypass | Always verify tier server-side for premium features |
| Not validating webhook signatures | Spoofed events, fake payments | Use `stripe.webhooks.constructEvent()` |
| Logging full credit card errors | PCI compliance violation | Only log Stripe error codes, not card details |
| Storing raw webhook payloads with card data | PCI scope expansion | Extract only needed fields |
| Not rate limiting checkout creation | Abuse, testing fraud | Rate limit by user, require auth |

## UX Pitfalls

Common user experience mistakes in billing flows.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Blocking UI during checkout creation | User thinks it's broken, double-clicks | Immediate loading state, disable button |
| No feedback on upgrade success | User unsure if it worked | Show success message, update UI immediately |
| Hiding current plan details | User can't find billing info | Clear billing section in settings (already done) |
| Confusing proration explanation | Surprise charges cause disputes | Show clear breakdown before confirming |
| No way to cancel | GDPR/consumer law violations | Customer portal access (already implemented) |
| Email receipt not matching plan name | Confusion, dispute potential | Use consistent naming across app and Stripe |
| Upgrade prompts too aggressive | User feels nagged, churns | Contextual, helpful prompts at point of need |
| No trial expiration warning | User surprised by sudden block | Banner warning (already implemented with `TrialBanner`) |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Checkout flow:** Often missing loading states, error handling, and duplicate-click prevention - verify all edge cases
- [ ] **Webhook handler:** Often missing idempotency, timeout handling, and complete event coverage - verify with Stripe webhook testing
- [ ] **Feature gating:** Often missing server-side verification - verify premium features check on server
- [ ] **Trial expiration:** Often missing grace period and conflict resolution - verify trial-to-paid transition
- [ ] **Cancellation flow:** Often missing local status update - verify user state after Stripe portal cancellation
- [ ] **Past-due handling:** Often missing downgrade/restrict logic - verify what happens when payment fails
- [ ] **Customer portal:** Often missing configuration - verify portal shows correct options, hides sensitive codes
- [ ] **Promo codes:** Often missing usage limits and expiration - verify codes can't be over-used
- [ ] **Plan switching:** Often missing proration preview - verify upgrade/downgrade calculates correctly
- [ ] **Webhook security:** Often missing signature verification - verify handler rejects invalid signatures
- [ ] **Multi-tier access:** Often missing tier-specific feature checks - verify each tier can only access their features
- [ ] **Dunning emails:** Often missing failed payment notifications - verify user is notified of payment issues

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate charges | MEDIUM | Issue refunds via Stripe, email affected users, implement idempotency |
| Feature access post-cancellation | LOW | Force sync from Stripe, invalidate caches, audit access logs |
| Trial/paid state mismatch | LOW | Query Stripe subscription status, update local DB, reconcile |
| Promo code abuse | MEDIUM | Deactivate codes, assess revenue impact, update code restrictions |
| Missing webhook events | HIGH | Sync all subscriptions from Stripe API, implement missing handlers |
| Customer data mismatch | MEDIUM | Reconciliation script to compare Stripe and local state |
| Wrong tier access | LOW | Add tier column, backfill from Stripe price IDs, add access checks |
| Unexpected proration charges | MEDIUM | Review chargebacks, add proration preview, consider goodwill credits |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Non-idempotent webhooks | Phase 1: Webhook Infrastructure | Test: Send same event twice, verify single processing |
| Webhook timeout | Phase 1: Webhook Infrastructure | Test: Webhook with 30s+ processing, verify no timeout |
| Signature timing attack | Phase 1: Webhook Infrastructure | Test: Delayed queue processing, verify no signature errors |
| Missing event coverage | Phase 1: Webhook Infrastructure | Audit: All Stripe subscription events have handlers |
| Trial conversion gaps | Phase 1: Webhook Infrastructure | Test: Checkout during final trial hours, verify smooth transition |
| Feature gating race conditions | Phase 2: Feature Gating | Test: Upgrade during active session, verify immediate access |
| Client-only tier checks | Phase 2: Feature Gating | Audit: All premium endpoints have server-side checks |
| Multi-tier confusion | Phase 2: Feature Gating | Test: Each tier can only access their specific features |
| Plan switching proration | Phase 2: Feature Gating | Test: All plan-to-plan transitions with proration preview |
| Voucher exploitation | Phase 3: Voucher System | Audit: All codes have limits, expiration, or restrictions |
| Portal promo exposure | Phase 4: Customer Portal | Review: Portal configuration hides sensitive discounts |

## Sources

### Official Documentation (HIGH confidence)
- [Stripe Webhooks Best Practices](https://docs.stripe.com/webhooks/best-practices) - Timeout, idempotency, signature verification
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests) - API idempotency patterns
- [Stripe Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons) - Coupon vs promo code, restrictions
- [Stripe Customer Portal Configuration](https://docs.stripe.com/customer-management/configure-portal) - Portal limitations and settings
- [Stripe Upgrade/Downgrade Subscriptions](https://docs.stripe.com/billing/subscriptions/upgrade-downgrade) - Proration handling

### Community Resources (MEDIUM confidence)
- [Stigg: Best Practices for Stripe Webhooks](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) - Queue pattern, signature timing
- [Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) - Idempotency implementation
- [SaaS Billing Best Practices](https://www.withorb.com/blog/saas-billing-tips) - Feature gating, transparency
- [Feature Gating Guide](https://www.withorb.com/blog/feature-gating) - When to gate, communication strategies
- [Stripe Webhooks Guide](https://www.magicbell.com/blog/stripe-webhooks-guide) - Event examples and patterns
- [Moldstud: Common Stripe Mistakes](https://moldstud.com/articles/p-common-mistakes-developers-make-when-using-stripe-payment-processing-avoid-these-pitfalls) - Integration issues
- [SaaS Subscription Tier Design](https://www.hubifi.com/blog/saas-subscription-tiers-design) - Multi-tier pitfalls

### Existing Codebase Analysis (HIGH confidence)
- `src/app/api/webhooks/stripe/route.ts` - Current webhook implementation (lacks idempotency)
- `src/app/api/billing/create-checkout/route.ts` - Current checkout flow (uses allow_promotion_codes)
- `src/app/api/billing/portal/route.ts` - Current portal implementation (default config)
- `src/lib/hooks/use-user.ts` - Current tier checking (5-min cache, client-side only)
- `src/lib/db/schema.ts` - Current billing fields (billingStatus enum, no tier column)
- `src/components/billing/trial-banner.tsx` - Trial warning UI (already implemented)
- `src/lib/stripe/products.ts` - Current pricing config (single tier structure)

---

**Confidence Assessment:**

| Pitfall Category | Confidence | Rationale |
|------------------|------------|-----------|
| Webhook Handling | HIGH | Stripe official docs + multiple implementation guides |
| Feature Gating | HIGH | Codebase analysis + common SaaS patterns |
| Voucher Codes | HIGH | Stripe documentation + 2025 API changes |
| Customer Portal | HIGH | Official Stripe docs on configuration |
| Multi-tier Pricing | MEDIUM | Pattern-based, needs validation with actual pricing tiers |
| Plan Switching | MEDIUM | Stripe docs, but specific proration behavior needs testing |

---

*Pitfalls research for: Billing & Monetization on Subscription Manager*
*Researched: 2026-02-11*
