# Phase 25: Multi-Tier Product Setup - Research

**Researched:** 2026-02-12
**Domain:** Stripe multi-tier subscription architecture with grandfathering
**Confidence:** HIGH

## Summary

Multi-tier subscription products in Stripe require three separate Products (one per tier: Primary, Enhanced, Advanced), each with multiple Prices for billing intervals and currencies. The key challenge is maintaining a mapping between Stripe price IDs and application tiers to support grandfathering - where users on old prices continue paying their original rate even when new prices are introduced.

The existing codebase already has strong foundations: webhook handlers update `users.stripePriceId`, the checkout flow creates subscriptions, and the schema tracks billing status. The additions needed are:

1. **Database layer**: Price-to-tier mapping table to support grandfathering
2. **Stripe configuration**: Create 3 Products with 18 Prices (3 tiers × 2 intervals × 3 currencies)
3. **Application logic**: Derive user tier from their current price ID, not a static column
4. **Environment variables**: Store all price IDs for reference and validation

**Primary recommendation:** Store price-to-tier mappings in the database rather than hardcoding in environment variables. This allows adding new grandfathered price IDs without code changes and provides a single source of truth for tier determination.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Stripe Node SDK | 17.x+ | Stripe API client | Official SDK, already in use |
| Drizzle ORM | 0.36+ | Database schema & migrations | Current project ORM |
| PostgreSQL | 15+ | Relational database | Supabase backend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Stripe CLI | Latest | Local webhook testing | Development/testing |
| stripe-node types | Latest | TypeScript definitions | Already included with SDK |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database mapping table | Hardcoded env vars | Env vars simpler initially but requires code deploy to add grandfathered prices |
| Separate products per tier | Single product with metadata | Separate products cleanest for Stripe dashboard UX and reporting |
| Price ID → tier lookup | Store tier column on users | Tier column creates sync issues when prices change |

**Installation:**
```bash
# Already installed in project
# Stripe SDK: npm install stripe
# Drizzle: npm install drizzle-orm
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── stripe/
│   │   ├── client.ts              # Existing: Stripe SDK singleton
│   │   ├── products.ts            # UPDATE: Add tier price mappings
│   │   └── tiers.ts               # NEW: Tier derivation logic
│   └── db/
│       ├── schema.ts              # UPDATE: Add stripe_prices table
│       └── migrations/            # NEW: Migration for stripe_prices
└── app/api/
    ├── billing/create-checkout/   # UPDATE: Accept tier parameter
    └── webhooks/stripe/           # UPDATE: No tier column updates needed
```

### Pattern 1: Price-to-Tier Database Mapping

**What:** Store all price IDs with their associated tier in a database table
**When to use:** Always - this is the foundation for grandfathering support
**Example:**
```typescript
// src/lib/db/schema.ts
export const stripePrices = pgTable(
  "stripe_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
    tier: tierEnum("tier").notNull(), // 'primary' | 'enhanced' | 'advanced'
    interval: varchar("interval", { length: 20 }).notNull(), // 'month' | 'year'
    currency: varchar("currency", { length: 3 }).notNull(), // 'usd' | 'eur' | 'gbp'
    amountCents: integer("amount_cents").notNull(),
    isActive: boolean("is_active").default(true).notNull(), // Can new users subscribe?
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("stripe_prices_price_id_idx").on(table.stripePriceId),
    index("stripe_prices_tier_idx").on(table.tier),
    index("stripe_prices_active_idx").on(table.isActive),
  ]
);
```

### Pattern 2: Derive Tier from Price ID

**What:** User's tier is determined by looking up their `stripePriceId` in the mapping table
**When to use:** Everywhere tier information is needed
**Example:**
```typescript
// src/lib/stripe/tiers.ts
export async function getUserTier(userId: string): Promise<Tier | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripePriceId: true, billingStatus: true },
  });

  if (!user?.stripePriceId || user.billingStatus !== 'active') {
    return null; // No active subscription
  }

  const priceRecord = await db.query.stripePrices.findFirst({
    where: eq(stripePrices.stripePriceId, user.stripePriceId),
    columns: { tier: true },
  });

  return priceRecord?.tier || null;
}
```

### Pattern 3: Grandfathering Check

**What:** Show users if they're on a grandfathered price and what they're saving
**When to use:** Billing page, account settings
**Example:**
```typescript
// src/lib/stripe/tiers.ts
export async function getGrandfatheringInfo(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripePriceId: true },
  });

  if (!user?.stripePriceId) return null;

  const userPrice = await db.query.stripePrices.findFirst({
    where: eq(stripePrices.stripePriceId, user.stripePriceId),
  });

  if (!userPrice) return null;

  // Get current active price for same tier/interval/currency
  const currentPrice = await db.query.stripePrices.findFirst({
    where: and(
      eq(stripePrices.tier, userPrice.tier),
      eq(stripePrices.interval, userPrice.interval),
      eq(stripePrices.currency, userPrice.currency),
      eq(stripePrices.isActive, true)
    ),
    orderBy: desc(stripePrices.createdAt),
  });

  if (!currentPrice || userPrice.amountCents === currentPrice.amountCents) {
    return null; // Not grandfathered
  }

  return {
    isGrandfathered: true,
    userAmount: userPrice.amountCents,
    currentAmount: currentPrice.amountCents,
    savingsPerMonth: currentPrice.amountCents - userPrice.amountCents,
  };
}
```

### Pattern 4: Multi-Currency Price Management

**What:** Store prices for multiple currencies manually (not using Adaptive Pricing)
**When to use:** USD, EUR, GBP pricing
**Example:**
```typescript
// Manual currency prices for control over amounts
const TIER_PRICES = [
  // Primary tier - $4/mo, $40/yr (~17% discount)
  { tier: 'primary', interval: 'month', currency: 'usd', amountCents: 400 },
  { tier: 'primary', interval: 'year', currency: 'usd', amountCents: 4000 },
  { tier: 'primary', interval: 'month', currency: 'eur', amountCents: 400 },
  { tier: 'primary', interval: 'year', currency: 'eur', amountCents: 4000 },
  { tier: 'primary', interval: 'month', currency: 'gbp', amountCents: 300 },
  { tier: 'primary', interval: 'year', currency: 'gbp', amountCents: 3000 },

  // Enhanced tier - $7/mo, $70/yr
  { tier: 'enhanced', interval: 'month', currency: 'usd', amountCents: 700 },
  { tier: 'enhanced', interval: 'year', currency: 'usd', amountCents: 7000 },
  // ... repeat for EUR, GBP

  // Advanced tier - $11/mo, $110/yr
  { tier: 'advanced', interval: 'month', currency: 'usd', amountCents: 1100 },
  { tier: 'advanced', interval: 'year', currency: 'usd', amountCents: 11000 },
  // ... repeat for EUR, GBP
];

// Note: 1:1 pricing for EUR/USD is intentional simplification
// GBP slightly lower reflects purchasing power adjustment
```

### Anti-Patterns to Avoid

- **Storing tier as column on users table:** Creates sync issues when user changes subscriptions. Tier should be derived from price ID.
- **Hardcoding price IDs in application code:** Makes grandfathering impossible without code changes. Use database mapping.
- **Using Adaptive Pricing for consumer SaaS:** Adds 2-4% conversion fee and loses control over exact pricing. Manual currency prices are better for transparency.
- **Single product with metadata tiers:** Stripe dashboard reports get messy, harder to understand MRR by tier.
- **Trusting client-side tier determination:** Always verify tier server-side for access control decisions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency conversion | Exchange rate API + calculations | Stripe manual prices | Control exact prices, no conversion fees, better UX |
| Proration on upgrades | Custom date math | Stripe automatic proration | Stripe handles edge cases (trial periods, billing cycles, refunds) |
| Failed payment retry | Cron job to retry charges | Stripe Smart Retries | Stripe optimizes retry timing based on ML, handles 3DS automatically |
| Invoice generation | PDF library + template | Stripe invoices | Automatic, localized, legally compliant |
| Price ID validation | Regex patterns | Database lookup | Database is source of truth, supports grandfathering |

**Key insight:** Stripe's subscription infrastructure handles billing complexity (proration, retries, invoices, tax) better than custom code. Focus custom logic on tier mapping, which is business-specific.

## Common Pitfalls

### Pitfall 1: Forgetting to Populate stripe_prices Table

**What goes wrong:** New price IDs created in Stripe dashboard aren't added to database, causing tier lookup to fail for new subscribers.

**Why it happens:** Manual process with no automation - developers create prices in Stripe but forget database insert.

**How to avoid:**
1. Create admin UI or script to sync Stripe prices to database
2. Add validation in checkout route to ensure price ID exists in database
3. Document process in runbook: "After creating price in Stripe, run `npm run sync-prices`"

**Warning signs:**
- Users successfully checkout but tier-gated features don't unlock
- Webhooks process successfully but `getUserTier()` returns null
- New subscriptions work but tier determination fails

### Pitfall 2: Not Preserving Old Price IDs on Price Changes

**What goes wrong:** When introducing new prices, old price IDs are marked inactive in both Stripe and database, breaking grandfathering for existing users.

**Why it happens:** Misunderstanding Stripe's price model - prices are immutable, can't change amount. Must create new price ID.

**How to avoid:**
1. Never set `isActive: false` on old prices while users are subscribed to them
2. New prices should be created as separate rows with `isActive: true`
3. Query for "currently active price" should be: `isActive = true AND tier = X AND interval = Y AND currency = Z ORDER BY createdAt DESC LIMIT 1`

**Warning signs:**
- Grandfathered users see "Unknown tier" or lose access
- Database queries for old price IDs return no results
- Webhooks fail to update user tier after price change

### Pitfall 3: Using stripePriceId Before Webhook Processes

**What goes wrong:** Checkout completes, user redirected to success page, but `stripePriceId` is still null because webhook hasn't fired yet.

**Why it happens:** Race condition - checkout redirect is synchronous, webhook is asynchronous (can take seconds).

**How to avoid:**
1. Success page should poll for subscription status, not assume immediate availability
2. Use Stripe's `checkout.session.completed` event to know when subscription is ready
3. Show loading state: "Processing your subscription..." with 5-second timeout, then manual refresh button

**Warning signs:**
- Users report "tier not unlocking" immediately after payment
- Success page shows "Loading..." indefinitely
- Tier determination works after page refresh but not initially

### Pitfall 4: Assuming Single Currency Per Customer

**What goes wrong:** User subscribes in USD, cancels, later resubscribes in EUR - checkout logic breaks because it assumes price lookup by tier only.

**Why it happens:** Checkout code looks up price by tier without considering customer's currency preference.

**How to avoid:**
1. Detect currency from customer's location (Stripe Checkout can do this)
2. Store user's preferred currency in database
3. Checkout lookup: `WHERE tier = ? AND interval = ? AND currency = ? AND isActive = true`
4. Allow currency selection in UI for edge cases

**Warning signs:**
- International users get wrong currency prices
- Checkout fails for non-USD customers with "price not found"
- Customer portal shows mixed currencies

### Pitfall 5: Not Handling Downgrade/Upgrade Tier Transitions

**What goes wrong:** User upgrades from Primary to Enhanced - webhook updates `stripePriceId` but application doesn't recognize the change because it caches tier.

**Why it happens:** Client-side caching (TanStack Query, session storage) doesn't invalidate on webhook events.

**How to avoid:**
1. Webhooks that change `stripePriceId` should invalidate relevant caches
2. Use short cache TTLs for billing data (5 minutes max)
3. Implement webhook → WebSocket → client invalidation for real-time updates (optional)
4. Show "Your subscription has been updated" banner that forces data refresh

**Warning signs:**
- Users report needing to log out/in after tier change
- Feature access doesn't change immediately after upgrade
- Billing page shows old tier after successful upgrade

## Code Examples

Verified patterns from official sources:

### Creating Products and Prices in Stripe

```typescript
// One-time setup script: scripts/setup-stripe-products.ts
import { getStripeClient } from '@/lib/stripe/client';
import { db } from '@/lib/db';
import { stripePrices } from '@/lib/db/schema';

const stripe = getStripeClient();

// Create products (run once)
const primaryProduct = await stripe.products.create({
  id: 'sub_primary', // Custom ID for easy reference
  name: 'Primary',
  description: 'Essential subscription tracking',
});

const enhancedProduct = await stripe.products.create({
  id: 'sub_enhanced',
  name: 'Enhanced',
  description: 'Advanced analytics and unlimited imports',
});

const advancedProduct = await stripe.products.create({
  id: 'sub_advanced',
  name: 'Advanced',
  description: 'Everything plus team features',
});

// Create prices (run once per currency/interval/tier combination)
const prices = [
  // Primary - $4/mo, $40/yr
  { product: 'sub_primary', amount: 400, currency: 'usd', interval: 'month', tier: 'primary' },
  { product: 'sub_primary', amount: 4000, currency: 'usd', interval: 'year', tier: 'primary' },
  // ... repeat for EUR, GBP

  // Enhanced - $7/mo, $70/yr
  { product: 'sub_enhanced', amount: 700, currency: 'usd', interval: 'month', tier: 'enhanced' },
  { product: 'sub_enhanced', amount: 7000, currency: 'usd', interval: 'year', tier: 'enhanced' },
  // ... repeat for EUR, GBP

  // Advanced - $11/mo, $110/yr
  { product: 'sub_advanced', amount: 1100, currency: 'usd', interval: 'month', tier: 'advanced' },
  { product: 'sub_advanced', amount: 11000, currency: 'usd', interval: 'year', tier: 'advanced' },
  // ... repeat for EUR, GBP
];

for (const config of prices) {
  const stripePrice = await stripe.prices.create({
    product: config.product,
    unit_amount: config.amount,
    currency: config.currency,
    recurring: { interval: config.interval as 'month' | 'year' },
  });

  // Store in database
  await db.insert(stripePrices).values({
    stripePriceId: stripePrice.id,
    tier: config.tier,
    interval: config.interval,
    currency: config.currency,
    amountCents: config.amount,
    isActive: true,
  });

  console.log(`Created price: ${stripePrice.id} for ${config.tier} ${config.interval} ${config.currency}`);
}
```

### Updating Checkout to Accept Tier

```typescript
// src/app/api/billing/create-checkout/route.ts (UPDATE)
const checkoutSchema = z.object({
  tier: z.enum(["primary", "enhanced", "advanced"]),
  interval: z.enum(["month", "year"]),
  currency: z.enum(["usd", "eur", "gbp"]).default("usd"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = checkoutSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { tier, interval, currency } = result.data;

  // Look up price ID from database
  const priceRecord = await db.query.stripePrices.findFirst({
    where: and(
      eq(stripePrices.tier, tier),
      eq(stripePrices.interval, interval),
      eq(stripePrices.currency, currency),
      eq(stripePrices.isActive, true)
    ),
  });

  if (!priceRecord) {
    return NextResponse.json(
      { error: "Price not found for tier" },
      { status: 400 }
    );
  }

  // Rest of checkout logic unchanged - use priceRecord.stripePriceId
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceRecord.stripePriceId, quantity: 1 }],
    success_url: `${APP_URL}/settings/billing?success=true`,
    cancel_url: `${APP_URL}/settings/billing?canceled=true`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

### Webhook Handler (No Changes Needed)

```typescript
// src/app/api/webhooks/stripe/route.ts
// Current webhook handler already stores stripePriceId correctly:

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subscriptionItem = subscription.items.data[0];

  await db.update(users).set({
    stripePriceId: subscriptionItem?.price.id, // ✓ Already correct
    billingStatus: "active",
    // No tier column to update - tier is derived from price ID
  }).where(eq(users.id, user.id));
}

// This pattern supports grandfathering automatically:
// - Old price IDs stay in stripePriceId column
// - Tier determination queries stripe_prices table
// - No migration needed when prices change
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single product + metadata tiers | Separate products per tier | 2023+ | Better Stripe dashboard UX, clearer MRR reporting |
| Tier as user table column | Derive tier from price ID | 2024+ | Enables grandfathering without migration complexity |
| Hardcoded price IDs in env vars | Database price mapping table | 2024+ | Allows adding grandfathered prices without code deploy |
| Adaptive Pricing for consumer SaaS | Manual multi-currency prices | 2025+ | Lower customer costs (no 2-4% conversion fee), predictable pricing |
| Custom proration logic | Stripe automatic proration | Always standard | Stripe handles edge cases better than custom code |

**Deprecated/outdated:**
- **Storing tier on users table:** Was common 2020-2023, now considered anti-pattern due to sync issues
- **Using subscription metadata for tier:** Stripe's recommended pattern is separate products, not metadata
- **Plan objects:** Deprecated by Stripe in 2019, replaced by Products + Prices model
- **Adaptive Pricing with 2%+ fees:** Acceptable for global marketplaces, not for transparent consumer SaaS

## Open Questions

Things that couldn't be fully resolved:

1. **How to handle annual → monthly downgrades?**
   - What we know: Stripe allows changing price immediately or at period end
   - What's unclear: Best UX for refund vs. credit calculation
   - Recommendation: Default to "change at period end" to avoid refund complexity, make immediate change opt-in with clear cost display

2. **Should legacy current prices stay active forever?**
   - What we know: Stripe allows unlimited active prices, no storage cost
   - What's unclear: Dashboard UX degrades with 50+ active prices per product
   - Recommendation: Keep all prices with active subscribers, archive prices with zero subscribers after 90 days

3. **How to handle currency changes for existing subscribers?**
   - What we know: Stripe doesn't support changing subscription currency without canceling
   - What's unclear: User moved from US to EU, wants to pay in EUR
   - Recommendation: Support cancel → resubscribe flow with proration credit, document as limitation

4. **Multi-currency price setting strategy: 1:1 or purchasing power?**
   - What we know: 1:1 pricing (€4 = $4) is simplest, purchasing power adjusted (€3.50 for $4) is "fairer"
   - What's unclear: Which approach yields better conversion in EU/UK markets
   - Recommendation: Start with 1:1 for USD/EUR, slight discount for GBP (~25% less), A/B test later

## Sources

### Primary (HIGH confidence)
- [Stripe Products and Prices Documentation](https://docs.stripe.com/products-prices/how-products-and-prices-work) - Official product structure guide
- [Stripe Change Subscription Price](https://docs.stripe.com/billing/subscriptions/change-price) - Grandfathering strategy
- [Stripe Multi-Currency Pricing](https://docs.stripe.com/payments/checkout/multi-currency-prices) - Manual currency prices
- [Stripe Adaptive Pricing](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing) - Automatic conversion (not recommended for this use case)
- [Stripe API Price Object](https://docs.stripe.com/api/prices/object) - Price active field for grandfathering

### Secondary (MEDIUM confidence)
- [A Database Model for SaaS Subscriptions in Postgres](https://axellarsson.com/blog/modeling-saas-subscriptions-in-postgres/) - Schema patterns
- [Everything You Need to Know About Grandfathering in SaaS](https://www.wingback.com/blog/everything-you-need-to-know-about-grandfathering-in-saas) - Grandfathering strategies
- [SaaS Subscription Tier Design](https://www.hubifi.com/blog/saas-subscription-tiers-design) - Pricing tier best practices
- [Data Modeling Entitlements and Pricing for SaaS](https://garrettdimon.com/journal/posts/data-modeling-saas-entitlements-and-pricing) - Entitlement patterns

### Tertiary (LOW confidence - general guidance only)
- [Advanced SaaS Pricing Psychology 2026](https://ghl-services-playbooks-automation-crm-marketing.ghost.io/advanced-saas-pricing-psychology-beyond-basic-tiered-models/) - Pricing trends
- [The Future of SaaS Pricing in 2026](https://medium.com/@aymane.bt/the-future-of-saas-pricing-in-2026-an-expert-guide-for-founders-and-leaders-a8d996892876) - Industry trends

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing project stack, Stripe official SDK
- Architecture: HIGH - Patterns verified in Stripe docs and existing codebase analysis
- Pitfalls: MEDIUM - Based on common issues found in community discussions, not all verified in production

**Research date:** 2026-02-12
**Valid until:** 60 days (stable domain - Stripe API changes slowly, tiered pricing is mature pattern)

**Key constraints from CONTEXT.md:**
- Three tiers: Primary, Enhanced, Advanced (locked)
- Monthly and annual billing (locked)
- Multi-currency: USD, EUR, GBP (locked)
- Grandfathering via price ID tracking (locked)
- Database price mapping (Claude's discretion - recommended)
- Exact price amounts (Claude's discretion - suggested $4/$7/$11 monthly)
