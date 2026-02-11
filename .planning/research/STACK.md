# Stack Research: Billing & Monetization

**Project:** Subscription Manager - Billing Milestone
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

The billing milestone adds three paid tiers (Primary, Enhanced, Advanced), Stripe Checkout with monthly/annual billing, voucher codes, feature gating, and customer portal integration. The existing stack is already well-suited for this:

1. **Stripe SDK** - Already installed (stripe@20.2.0, @stripe/stripe-js@8.6.3), webhooks configured
2. **Database schema** - Already has billing fields on users table (billingStatus, stripeCustomerId, etc.)
3. **Existing UI** - Billing page, trial banner, and checkout flow already implemented

**Key decision:** Extend the existing single-tier setup to multi-tier. NO new libraries needed. This is an architectural expansion, not a technology addition.

**Stack additions:** None. All required packages are installed. Implementation involves:
- Extending products.ts with three tiers and their feature definitions
- Adding feature gating utilities (server + client)
- Extending schema for tier tracking (stripePriceId already captures this)

---

## Current State Analysis

### Already Implemented (No Changes Needed)

| Capability | Location | Status |
|------------|----------|--------|
| Stripe server SDK | stripe@20.2.0 | Installed, client initialized |
| Stripe JS | @stripe/stripe-js@8.6.3 | Installed |
| Webhook handling | src/app/api/webhooks/stripe/route.ts | Handles checkout.session.completed, subscription.*, invoice.* |
| Checkout session creation | src/app/api/billing/create-checkout/route.ts | Working with allow_promotion_codes: true |
| Customer portal | src/app/api/billing/portal/route.ts | Working |
| Billing status tracking | users table | billingStatus, stripeCustomerId, stripeSubscriptionId, stripePriceId, currentPeriodEnd |
| Trial management | useUserStatus hook | isTrialActive, isPaid, daysLeftInTrial |
| Billing UI | src/app/(dashboard)/settings/billing/page.tsx | Shows current plan, checkout buttons |
| Trial banners | src/components/billing/trial-banner.tsx | Urgent + expired states |

### Needs Extension (Architectural Changes)

| Capability | What's Missing | Effort |
|------------|----------------|--------|
| Multi-tier products | Currently only monthly/annual for single tier | Low - extend products.ts |
| Feature definitions per tier | No feature-to-tier mapping | Low - add constants |
| Feature gating (server) | No middleware/utility for tier checks | Medium - add utility |
| Feature gating (client) | No React component for upgrade prompts | Medium - add component |
| Voucher code creation | Stripe coupons/promotion codes (Stripe Dashboard + API) | Low - Stripe handles this |
| Tier display in UI | Pricing page shows single tier | Low - update UI |

---

## Recommended Stack (No Additions)

### Core Technologies (Already Installed)

| Technology | Version | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| stripe | 20.2.0 | Server-side Stripe API | Latest version, handles all billing operations |
| @stripe/stripe-js | 8.6.3 | Client-side Stripe elements | Redirect to Checkout, no embedded elements needed |
| Drizzle ORM | 0.45.1 | Database operations | Schema already has billing fields |
| NextAuth.js | 5.0.0-beta.30 | Session management | User context available for tier checks |
| TanStack Query | 5.90.19 | State management | useUserStatus already implemented |

### What NOT to Add

| Library | Why NOT |
|---------|---------|
| @stripe/react-stripe-js | Not needed - using Stripe Checkout redirect, not embedded elements |
| zustand/jotai for billing state | useUserStatus hook already provides billing state via TanStack Query |
| Feature flag service (LaunchDarkly, etc.) | Over-engineering - simple tier-based gating is sufficient |
| clerk/use-stripe-subscription | Adds Clerk dependency we don't need - we have NextAuth.js |

---

## Implementation Patterns

### Pattern 1: Multi-Tier Product Configuration

**What:** Extend products.ts to define three tiers with features.

**Current state:**
```typescript
export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID ?? "",
  annual: process.env.STRIPE_ANNUAL_PRICE_ID ?? "",
} as const;
```

**Extended pattern:**
```typescript
// src/lib/stripe/products.ts

export const TIERS = {
  primary: {
    name: "Primary",
    priceIds: {
      monthly: process.env.STRIPE_PRIMARY_MONTHLY_PRICE_ID ?? "",
      annual: process.env.STRIPE_PRIMARY_ANNUAL_PRICE_ID ?? "",
    },
    pricing: {
      monthly: 499,  // $4.99
      annual: 3999,  // $39.99 (33% savings)
    },
    features: [
      "unlimited_subscriptions",
      "email_reminders",
      "spending_analytics",
      "data_export",
    ],
    limits: {
      pdfImportsPerMonth: 5,
      categories: 10,
    },
  },
  enhanced: {
    name: "Enhanced",
    priceIds: {
      monthly: process.env.STRIPE_ENHANCED_MONTHLY_PRICE_ID ?? "",
      annual: process.env.STRIPE_ENHANCED_ANNUAL_PRICE_ID ?? "",
    },
    pricing: {
      monthly: 999,  // $9.99
      annual: 7999,  // $79.99 (33% savings)
    },
    features: [
      "unlimited_subscriptions",
      "email_reminders",
      "spending_analytics",
      "data_export",
      "pdf_import",
      "pattern_detection",
      "multi_currency",
    ],
    limits: {
      pdfImportsPerMonth: 25,
      categories: 50,
    },
  },
  advanced: {
    name: "Advanced",
    priceIds: {
      monthly: process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID ?? "",
      annual: process.env.STRIPE_ADVANCED_ANNUAL_PRICE_ID ?? "",
    },
    pricing: {
      monthly: 1999,  // $19.99
      annual: 15999,  // $159.99 (33% savings)
    },
    features: [
      "unlimited_subscriptions",
      "email_reminders",
      "spending_analytics",
      "data_export",
      "pdf_import",
      "pattern_detection",
      "multi_currency",
      "statement_browser",
      "forecasting",
      "alerts",
      "priority_support",
    ],
    limits: {
      pdfImportsPerMonth: Infinity,
      categories: Infinity,
    },
  },
} as const;

export type TierName = keyof typeof TIERS;
export type Feature = typeof TIERS[TierName]["features"][number];

// Lookup tier from Stripe Price ID
export function getTierFromPriceId(priceId: string): TierName | null {
  for (const [tierName, tier] of Object.entries(TIERS)) {
    if (tier.priceIds.monthly === priceId || tier.priceIds.annual === priceId) {
      return tierName as TierName;
    }
  }
  return null;
}
```

**Environment variables (add to .env.example):**
```bash
# Stripe Price IDs - Primary Tier
STRIPE_PRIMARY_MONTHLY_PRICE_ID=""
STRIPE_PRIMARY_ANNUAL_PRICE_ID=""

# Stripe Price IDs - Enhanced Tier
STRIPE_ENHANCED_MONTHLY_PRICE_ID=""
STRIPE_ENHANCED_ANNUAL_PRICE_ID=""

# Stripe Price IDs - Advanced Tier
STRIPE_ADVANCED_MONTHLY_PRICE_ID=""
STRIPE_ADVANCED_ANNUAL_PRICE_ID=""
```

---

### Pattern 2: Server-Side Feature Gating

**What:** Utility function to check if user has access to a feature.

**Implementation:**
```typescript
// src/lib/billing/feature-gate.ts

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTierFromPriceId, TIERS, type Feature } from "@/lib/stripe/products";

export async function hasFeature(feature: Feature): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      billingStatus: true,
      stripePriceId: true,
      trialEndDate: true,
    },
  });

  if (!user) return false;

  // Trial users get Enhanced tier features
  if (user.billingStatus === "trial" && user.trialEndDate && new Date(user.trialEndDate) > new Date()) {
    return TIERS.enhanced.features.includes(feature);
  }

  // Paid users get features based on their tier
  if (user.billingStatus === "active" && user.stripePriceId) {
    const tier = getTierFromPriceId(user.stripePriceId);
    if (tier) {
      return TIERS[tier].features.includes(feature);
    }
  }

  return false;
}

export async function requireFeature(feature: Feature): Promise<void> {
  const allowed = await hasFeature(feature);
  if (!allowed) {
    throw new Error(`Feature "${feature}" requires an upgraded plan`);
  }
}

export async function getUserTier(): Promise<TierName | "trial" | "free"> {
  const session = await auth();
  if (!session?.user?.id) return "free";

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      billingStatus: true,
      stripePriceId: true,
      trialEndDate: true,
    },
  });

  if (!user) return "free";

  if (user.billingStatus === "trial" && user.trialEndDate && new Date(user.trialEndDate) > new Date()) {
    return "trial";
  }

  if (user.billingStatus === "active" && user.stripePriceId) {
    const tier = getTierFromPriceId(user.stripePriceId);
    return tier ?? "free";
  }

  return "free";
}
```

**Usage in API route:**
```typescript
// src/app/api/patterns/detect/route.ts
import { requireFeature } from "@/lib/billing/feature-gate";

export async function POST(request: Request) {
  // Gate the feature
  await requireFeature("pattern_detection");

  // ... rest of the route
}
```

---

### Pattern 3: Client-Side Feature Gate Component

**What:** React component to conditionally render content based on tier.

**Implementation:**
```typescript
// src/components/billing/feature-gate.tsx
"use client";

import { useUserStatus } from "@/lib/hooks";
import { getTierFromPriceId, TIERS, type Feature } from "@/lib/stripe/products";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { user, isTrialActive, isPaid, isLoading } = useUserStatus();

  if (isLoading) {
    return null; // Or skeleton loader
  }

  // Trial users get Enhanced tier features
  if (isTrialActive && TIERS.enhanced.features.includes(feature)) {
    return <>{children}</>;
  }

  // Paid users get features based on their tier
  if (isPaid && user?.stripePriceId) {
    const tier = getTierFromPriceId(user.stripePriceId);
    if (tier && TIERS[tier].features.includes(feature)) {
      return <>{children}</>;
    }
  }

  // Show fallback or default upgrade prompt
  return (
    <>
      {fallback ?? (
        <UpgradePrompt feature={feature} />
      )}
    </>
  );
}

function UpgradePrompt({ feature }: { feature: Feature }) {
  // Find which tier has this feature
  const requiredTier = Object.entries(TIERS).find(([_, tier]) =>
    tier.features.includes(feature)
  )?.[0];

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" />
      <div>
        <h3 className="font-semibold">Upgrade Required</h3>
        <p className="text-sm text-muted-foreground">
          This feature is available on the {requiredTier ? TIERS[requiredTier as keyof typeof TIERS].name : "paid"} plan and above.
        </p>
      </div>
      <Button asChild>
        <Link href="/settings/billing">Upgrade Now</Link>
      </Button>
    </div>
  );
}
```

**Usage in component:**
```tsx
<FeatureGate feature="pattern_detection">
  <PatternSuggestionsCard patterns={patterns} />
</FeatureGate>
```

---

### Pattern 4: Extend useUserStatus Hook

**What:** Add tier and feature information to existing hook.

**Extended hook:**
```typescript
// Add to src/lib/hooks/use-user.ts

export function useUserStatus() {
  const { data, isLoading, error } = useUser();

  const user = data?.user;
  const now = new Date();
  const trialEndDate = user?.trialEndDate ? new Date(user.trialEndDate) : null;

  const isTrialActive =
    user?.billingStatus === "trial" && trialEndDate && trialEndDate > now;

  const isPaid = user?.billingStatus === "active";
  const isActive = isTrialActive || isPaid;

  const daysLeftInTrial = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // NEW: Get current tier
  const tier = useMemo(() => {
    if (isTrialActive) return "trial";
    if (isPaid && user?.stripePriceId) {
      return getTierFromPriceId(user.stripePriceId) ?? "free";
    }
    return "free";
  }, [isTrialActive, isPaid, user?.stripePriceId]);

  // NEW: Feature check helper
  const hasFeature = useCallback((feature: Feature): boolean => {
    if (tier === "trial") {
      return TIERS.enhanced.features.includes(feature);
    }
    if (tier !== "free" && tier !== "trial") {
      return TIERS[tier].features.includes(feature);
    }
    return false;
  }, [tier]);

  return {
    user,
    isLoading,
    error,
    isTrialActive,
    isPaid,
    isActive,
    daysLeftInTrial,
    billingStatus: user?.billingStatus,
    needsOnboarding: user && !user.onboardingCompleted,
    tier,        // NEW
    hasFeature,  // NEW
  };
}
```

---

### Pattern 5: Voucher/Coupon Code Implementation

**What:** Use Stripe's built-in coupon and promotion code system.

**No code changes needed.** The existing checkout session already has `allow_promotion_codes: true`:

```typescript
// src/app/api/billing/create-checkout/route.ts (already implemented)
const checkoutSession = await stripe.checkout.sessions.create({
  // ...
  allow_promotion_codes: true, // <-- Already enabled!
  // ...
});
```

**Stripe Dashboard setup (manual):**

1. Go to Stripe Dashboard > Products > Coupons
2. Create coupon: "1 Month Free" - 100% off, duration "once"
3. Create promotion code: "FREEMONTH" linking to the coupon
4. Set restrictions: first-time customers only, expires after X redemptions

**For programmatic coupon creation:**
```typescript
// src/app/api/admin/coupons/route.ts (if needed)
export async function POST(request: Request) {
  const stripe = getStripeClient();

  // Create coupon
  const coupon = await stripe.coupons.create({
    duration: "once",
    percent_off: 100,
    id: "free-month",
    max_redemptions: 100,
  });

  // Create promotion code
  const promoCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: "FREEMONTH2026",
    restrictions: {
      first_time_transaction: true,
    },
  });

  return NextResponse.json({ coupon, promoCode });
}
```

---

### Pattern 6: Extend Checkout for Multi-Tier

**What:** Update checkout endpoint to accept tier + billing period.

**Extended endpoint:**
```typescript
// src/app/api/billing/create-checkout/route.ts
import { z } from "zod";
import { TIERS, type TierName } from "@/lib/stripe/products";

const checkoutSchema = z.object({
  tier: z.enum(["primary", "enhanced", "advanced"]),
  period: z.enum(["monthly", "annual"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = checkoutSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { tier, period } = result.data;
  const tierConfig = TIERS[tier];
  const priceId = tierConfig.priceIds[period];

  if (!priceId) {
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  // ... rest of checkout logic (unchanged)
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/settings/billing?success=true`,
    cancel_url: `${APP_URL}/settings/billing?canceled=true`,
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

---

## What NOT to Change

### Schema Changes (Not Needed)

The existing users table already has all needed fields:

| Field | Purpose | Already Has |
|-------|---------|-------------|
| billingStatus | Trial/active/cancelled/past_due | Yes |
| stripeCustomerId | Link to Stripe customer | Yes |
| stripeSubscriptionId | Active subscription | Yes |
| stripePriceId | Current price (reveals tier) | Yes |
| currentPeriodEnd | When subscription renews | Yes |
| trialStartDate / trialEndDate | Trial tracking | Yes |

**No new columns needed.** The `stripePriceId` field already tells us which tier the user is on. We look up the tier from the price ID.

### Webhook Changes (Minimal)

The existing webhook handler already handles:
- checkout.session.completed
- customer.subscription.created/updated/deleted
- invoice.payment_succeeded/failed

**Only addition:** Log tier name in subscription metadata for debugging.

---

## Stripe Dashboard Configuration

### Products to Create

| Tier | Product Name | Monthly Price | Annual Price |
|------|--------------|---------------|--------------|
| Primary | Subscription Manager - Primary | $4.99/month | $39.99/year |
| Enhanced | Subscription Manager - Enhanced | $9.99/month | $79.99/year |
| Advanced | Subscription Manager - Advanced | $19.99/month | $159.99/year |

**After creating, copy price IDs to environment variables.**

### Customer Portal Configuration

1. Go to Stripe Dashboard > Settings > Customer Portal
2. Enable subscription upgrades/downgrades
3. Enable promotion codes in portal
4. Set default behavior for cancellations

---

## Installation

```bash
# No new packages to install!

# Verify existing packages
npm list stripe @stripe/stripe-js
# Expected: stripe@20.2.0, @stripe/stripe-js@8.6.3

# Add environment variables for new price IDs
# (see .env.example updates above)
```

---

## Alternatives Considered

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| Per-tier environment variables | Stripe Product metadata | Environment variables are simpler, work in all environments |
| Feature flags service | LaunchDarkly, Statsig | Over-engineering for tier-based gating. Simple constant + lookup is sufficient |
| Embedded Stripe Elements | @stripe/react-stripe-js | Adds complexity. Checkout redirect is simpler and handles all edge cases |
| Custom coupon system | Database coupon table | Stripe handles redemption limits, expiration, fraud prevention |
| Clerk/use-stripe-subscription | Already have NextAuth.js | Would require auth migration |

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|-----------|-----------|
| Stripe SDK | HIGH | Already installed and working, v20.2.0 is latest |
| Multi-tier products | HIGH | Stripe natively supports multiple products/prices |
| Feature gating | HIGH | Simple lookup from price ID to tier features |
| Voucher codes | HIGH | allow_promotion_codes already enabled, Stripe handles everything |
| Customer portal | HIGH | Already implemented, supports tier switching |
| Schema changes | HIGH | No changes needed - existing fields sufficient |

**Overall confidence:** HIGH - This is an architectural expansion of existing, working code. No new dependencies required.

---

## Sources

### Primary (HIGH confidence)

**Stripe SDK:**
- Codebase: package.json (stripe@20.2.0, @stripe/stripe-js@8.6.3)
- Codebase: src/lib/stripe/client.ts (getStripeClient implementation)
- Codebase: src/app/api/webhooks/stripe/route.ts (webhook handling)
- [Stripe Subscriptions Build Guide](https://docs.stripe.com/billing/subscriptions/build-subscriptions)

**Coupons & Promotion Codes:**
- [Stripe Coupons & Promotion Codes Documentation](https://docs.stripe.com/billing/subscriptions/coupons)
- [Stripe Promotion Codes API](https://docs.stripe.com/api/promotion_codes)
- Codebase: create-checkout/route.ts already has `allow_promotion_codes: true`

**Implementation Patterns:**
- [T3's Stripe Recommendations](https://github.com/t3dotgg/stripe-recommendations) - Sync pattern, single source of truth
- [Clerk use-stripe-subscription](https://github.com/clerk/use-stripe-subscription) - Feature gating via product metadata pattern
- [Pedro Alonso Stripe + Next.js 15 Guide](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)

### Secondary (MEDIUM confidence)

- [Vercel Next.js Subscription Payments](https://github.com/vercel/nextjs-subscription-payments) - Reference architecture
- [Stripe Tiered Pricing Guide](https://docs.stripe.com/subscriptions/pricing-models/tiered-pricing)

---

## Next Steps for Roadmap

Based on research, suggested phase structure:

1. **Phase 1: Multi-Tier Product Setup**
   - Create products/prices in Stripe Dashboard
   - Extend products.ts with tier configuration
   - Add environment variables for price IDs
   - Update checkout endpoint to accept tier
   - **Estimated complexity:** Low

2. **Phase 2: Feature Gating Infrastructure**
   - Create server-side hasFeature/requireFeature utilities
   - Create client-side FeatureGate component
   - Extend useUserStatus hook with tier/hasFeature
   - **Estimated complexity:** Medium

3. **Phase 3: Apply Feature Gates**
   - Gate PDF import by tier
   - Gate pattern detection by tier
   - Gate statement browser by tier
   - Add upgrade prompts where features are gated
   - **Estimated complexity:** Medium (many touchpoints)

4. **Phase 4: Pricing UI Updates**
   - Update pricing page with three tiers
   - Update billing settings page
   - Add tier comparison table
   - **Estimated complexity:** Low

5. **Phase 5: Voucher Code Setup**
   - Create coupons in Stripe Dashboard
   - Create promotion codes
   - Test redemption flow (already enabled)
   - **Estimated complexity:** Low (Stripe Dashboard only)

**Phase ordering rationale:**
- Phase 1 is foundational (products must exist before gating)
- Phase 2 creates infrastructure for Phase 3
- Phase 3 applies gates across app
- Phase 4 updates UI to reflect new structure
- Phase 5 is independent, can run in parallel

**No additional research flags:** All technologies are already in use, just being extended.
