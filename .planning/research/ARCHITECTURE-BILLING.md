# Architecture Research: Billing & Monetization Integration

**Domain:** SaaS Billing with Tiered Plans
**Researched:** 2025-02-11
**Confidence:** HIGH

## Executive Summary

This document describes how to integrate tiered billing features (Primary/Enhanced/Advanced tiers, voucher codes, feature gating) into the existing Next.js + Supabase + Stripe architecture. The existing codebase already has a solid foundation for billing with Stripe webhooks, checkout sessions, and customer portal integration. The key additions needed are:

1. **Schema changes** - Add tier tracking and voucher tables
2. **Stripe configuration** - Create Products (tiers) and Prices in Stripe
3. **Feature gating** - Hooks and helpers to check tier access
4. **Voucher system** - Leverage Stripe promotion codes (already enabled)

## Existing Architecture Analysis

### Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ BillingPage  │  │ TrialBanner  │  │ useUserStatus│          │
│  │ /settings/   │  │              │  │ (hook)       │          │
│  │ billing      │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
├─────────┴─────────────────┴─────────────────┴───────────────────┤
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ /api/billing/  │  │ /api/billing/  │  │ /api/webhooks/ │    │
│  │ create-checkout│  │ portal         │  │ stripe         │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
│          │                   │                   │              │
├──────────┴───────────────────┴───────────────────┴──────────────┤
│                         Service Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ lib/stripe/client.ts   │  │ lib/stripe/products.ts │        │
│  │ - getStripeClient()    │  │ - STRIPE_PRICES        │        │
│  │ - Singleton pattern    │  │ - PRICING config       │        │
│  └────────────────────────┘  └────────────────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                         Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  users table:                                                    │
│  - billingStatus: trial | active | cancelled | past_due        │
│  - stripeCustomerId, stripeSubscriptionId, stripePriceId       │
│  - trialStartDate, trialEndDate, currentPeriodEnd              │
└─────────────────────────────────────────────────────────────────┘
```

### Current Capabilities

| Capability | Status | Location |
|------------|--------|----------|
| Stripe customer creation | Implemented | `/api/billing/create-checkout` |
| Checkout session | Implemented | `/api/billing/create-checkout` |
| Customer portal | Implemented | `/api/billing/portal` |
| Webhook handling | Implemented | `/api/webhooks/stripe` |
| Trial management | Implemented | `lib/auth/config.ts` (14-day trial) |
| Billing status sync | Implemented | Webhooks update `billingStatus` |
| Promotion codes | Enabled | `allow_promotion_codes: true` in checkout |
| Session/JWT billing data | Implemented | `billingStatus`, `trialEndDate` in token |

### Current Limitations

| Gap | Current State | Needed |
|-----|---------------|--------|
| Tier tracking | Single "active" status | Track which tier (Primary/Enhanced/Advanced) |
| Feature limits | No limits enforced | Subscription limits, PDF imports, etc. |
| Tier-based pricing | Single monthly/annual price | Multiple products with tier prices |
| Voucher redemption | Only Stripe promotion codes | Track which voucher was used |
| Feature gating | Binary active/inactive | Tier-based feature access |

## Recommended Architecture

### Target State

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ BillingPage  │  │ TierBadge    │  │ FeatureGate  │          │
│  │ (upgraded)   │  │ (new)        │  │ (new)        │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴───────┐          │
│  │              useUserTier() hook (new)             │          │
│  │  - tier: 'free' | 'primary' | 'enhanced' | 'advanced'       │
│  │  - limits: { subscriptions, pdfImports, ... }    │          │
│  │  - hasFeature(featureName): boolean              │          │
│  └──────────────────────────────────────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ /api/billing/  │  │ /api/billing/  │  │ /api/webhooks/ │    │
│  │ create-checkout│  │ redeem-voucher │  │ stripe         │    │
│  │ (updated)      │  │ (new)          │  │ (updated)      │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
│          │                   │                   │              │
├──────────┴───────────────────┴───────────────────┴──────────────┤
│                         Service Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐  ┌────────────────────────────┐│
│  │ lib/stripe/products.ts     │  │ lib/billing/tiers.ts (new) ││
│  │ (updated)                  │  │ - TIER_LIMITS              ││
│  │ - TIER_PRODUCTS            │  │ - TIER_FEATURES            ││
│  │ - TIER_PRICES              │  │ - canAccessFeature()       ││
│  └────────────────────────────┘  └────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                         Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  users table (updated):                                          │
│  - tier: 'free' | 'primary' | 'enhanced' | 'advanced' (new)    │
│  - tierActivatedAt (new)                                         │
│  - voucherCode (new) - tracks which voucher was redeemed        │
│                                                                  │
│  vouchers table (new):                                           │
│  - code, tier, type, expiresAt, maxRedemptions, usedCount       │
│  - stripeCouponId (links to Stripe promotion code)              │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Integration Points |
|-----------|----------------|-------------------|
| `useUserTier()` hook | Return current tier, limits, feature access | Reads from session, caches in TanStack Query |
| `<FeatureGate>` | Conditionally render based on tier | Uses `useUserTier()` |
| `/api/billing/create-checkout` | Create tier-specific checkout | Maps tier to Stripe Price ID |
| `/api/billing/redeem-voucher` | Validate & apply voucher | DB voucher lookup, Stripe coupon apply |
| `/api/webhooks/stripe` | Sync tier on subscription change | Parse price ID to tier |
| `lib/billing/tiers.ts` | Tier definitions, limits, features | Used by hooks and API routes |
| `lib/stripe/products.ts` | Stripe product/price mapping | Environment variables for IDs |

## Schema Changes

### Option 1: Tier on Users Table (Recommended)

Add tier tracking directly to users table. Simple and matches existing pattern.

```typescript
// Addition to src/lib/db/schema.ts

export const tierEnum = pgEnum("tier", [
  "free",      // Trial expired, no subscription
  "primary",   // Basic paid tier
  "enhanced",  // Mid tier with more features
  "advanced",  // Top tier with all features
]);

// Update users table - add these columns:
// tier: tierEnum("tier").default("free").notNull(),
// tierActivatedAt: timestamp("tier_activated_at", { withTimezone: true }),
// voucherCode: varchar("voucher_code", { length: 50 }),
```

### Option 2: Separate Subscriptions Table

For complex multi-product scenarios. Overkill for current needs.

```typescript
// NOT RECOMMENDED for this use case - too complex
export const billingSubscriptions = pgTable("billing_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tier: tierEnum("tier").notNull(),
  // ... more fields
});
```

**Recommendation:** Option 1. The users table already tracks Stripe subscription state. Adding a `tier` column is the simplest approach and matches the existing pattern.

### Voucher Table

```typescript
export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull(),

    // What the voucher gives
    tier: tierEnum("tier").notNull(),
    durationMonths: integer("duration_months"), // null = lifetime
    discountPercent: integer("discount_percent"), // For percentage discounts

    // Stripe integration
    stripeCouponId: varchar("stripe_coupon_id", { length: 255 }),
    stripePromotionCodeId: varchar("stripe_promotion_code_id", { length: 255 }),

    // Limits
    maxRedemptions: integer("max_redemptions"), // null = unlimited
    usedCount: integer("used_count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Metadata
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vouchers_code_idx").on(table.code),
  ]
);

export const voucherRedemptions = pgTable(
  "voucher_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voucherId: uuid("voucher_id").notNull().references(() => vouchers.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One redemption per user per voucher
    uniqueIndex("voucher_redemptions_user_voucher_idx").on(table.userId, table.voucherId),
  ]
);
```

## Stripe Configuration

### Products and Prices Strategy

Stripe recommends treating Products as tiers and Prices as billing intervals. This matches the existing pattern.

```typescript
// lib/stripe/products.ts (updated)

export const TIERS = {
  primary: {
    name: "Primary",
    description: "Essential subscription tracking",
    features: ["50 subscriptions", "5 PDF imports/month", "Email reminders"],
  },
  enhanced: {
    name: "Enhanced",
    description: "Advanced analytics and unlimited imports",
    features: ["Unlimited subscriptions", "20 PDF imports/month", "Analytics dashboard", "Priority support"],
  },
  advanced: {
    name: "Advanced",
    description: "Everything plus team features",
    features: ["Everything in Enhanced", "Unlimited PDF imports", "API access", "Team collaboration"],
  },
} as const;

export const TIER_PRICES = {
  primary: {
    monthly: process.env.STRIPE_PRIMARY_MONTHLY_PRICE_ID ?? "",
    annual: process.env.STRIPE_PRIMARY_ANNUAL_PRICE_ID ?? "",
  },
  enhanced: {
    monthly: process.env.STRIPE_ENHANCED_MONTHLY_PRICE_ID ?? "",
    annual: process.env.STRIPE_ENHANCED_ANNUAL_PRICE_ID ?? "",
  },
  advanced: {
    monthly: process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID ?? "",
    annual: process.env.STRIPE_ADVANCED_ANNUAL_PRICE_ID ?? "",
  },
} as const;

export type Tier = keyof typeof TIERS;
export type BillingInterval = "monthly" | "annual";

export function getTierFromPriceId(priceId: string): Tier | null {
  for (const [tier, prices] of Object.entries(TIER_PRICES)) {
    if (prices.monthly === priceId || prices.annual === priceId) {
      return tier as Tier;
    }
  }
  return null;
}
```

### Environment Variables (New)

```bash
# Stripe Tier Products (6 new price IDs)
STRIPE_PRIMARY_MONTHLY_PRICE_ID=""
STRIPE_PRIMARY_ANNUAL_PRICE_ID=""
STRIPE_ENHANCED_MONTHLY_PRICE_ID=""
STRIPE_ENHANCED_ANNUAL_PRICE_ID=""
STRIPE_ADVANCED_MONTHLY_PRICE_ID=""
STRIPE_ADVANCED_ANNUAL_PRICE_ID=""
```

## Feature Gating Implementation

### Tier Limits Configuration

```typescript
// lib/billing/tiers.ts (new file)

export const TIER_LIMITS = {
  free: {
    maxSubscriptions: 5,
    monthlyPdfImports: 0,
    emailReminders: false,
    analytics: false,
    apiAccess: false,
  },
  primary: {
    maxSubscriptions: 50,
    monthlyPdfImports: 5,
    emailReminders: true,
    analytics: false,
    apiAccess: false,
  },
  enhanced: {
    maxSubscriptions: Infinity,
    monthlyPdfImports: 20,
    emailReminders: true,
    analytics: true,
    apiAccess: false,
  },
  advanced: {
    maxSubscriptions: Infinity,
    monthlyPdfImports: Infinity,
    emailReminders: true,
    analytics: true,
    apiAccess: true,
  },
} as const;

export type TierLimits = typeof TIER_LIMITS[keyof typeof TIER_LIMITS];

export function canAccessFeature(
  tier: keyof typeof TIER_LIMITS,
  feature: keyof TierLimits
): boolean {
  const limits = TIER_LIMITS[tier];
  const value = limits[feature];

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}
```

### Client-Side Hook

```typescript
// lib/hooks/use-user-tier.ts (new file)

import { useSession } from "next-auth/react";
import { useUser } from "./use-user";
import { TIER_LIMITS, type TierLimits } from "@/lib/billing/tiers";

export type UserTier = keyof typeof TIER_LIMITS;

export function useUserTier() {
  const { data: session } = useSession();
  const { data: userData, isLoading } = useUser();

  // Derive tier from billing status and tier field
  const user = userData?.user;
  const billingStatus = user?.billingStatus;

  // Determine effective tier
  let tier: UserTier = "free";

  if (billingStatus === "trial") {
    // Trial users get enhanced tier access
    const trialEnd = user?.trialEndDate ? new Date(user.trialEndDate) : null;
    if (trialEnd && trialEnd > new Date()) {
      tier = "enhanced"; // Trial = Enhanced tier access
    }
  } else if (billingStatus === "active" && user?.tier) {
    tier = user.tier as UserTier;
  }

  const limits = TIER_LIMITS[tier];

  return {
    tier,
    limits,
    isLoading,
    hasFeature: (feature: keyof TierLimits) => {
      const value = limits[feature];
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value > 0;
      return false;
    },
    getLimit: (feature: keyof TierLimits) => limits[feature],
    isPaid: billingStatus === "active",
    isTrial: billingStatus === "trial",
  };
}
```

### FeatureGate Component

```typescript
// components/billing/feature-gate.tsx (new file)

"use client";

import { useUserTier, type UserTier } from "@/lib/hooks/use-user-tier";
import { TIER_LIMITS } from "@/lib/billing/tiers";

interface FeatureGateProps {
  feature: keyof typeof TIER_LIMITS["free"];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading } = useUserTier();

  if (isLoading) {
    return null; // Or loading skeleton
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

interface TierGateProps {
  minTier: UserTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const TIER_ORDER: UserTier[] = ["free", "primary", "enhanced", "advanced"];

export function TierGate({ minTier, children, fallback }: TierGateProps) {
  const { tier, isLoading } = useUserTier();

  if (isLoading) {
    return null;
  }

  const currentTierIndex = TIER_ORDER.indexOf(tier);
  const requiredTierIndex = TIER_ORDER.indexOf(minTier);

  if (currentTierIndex >= requiredTierIndex) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
```

### Server-Side Gating

```typescript
// lib/billing/server.ts (new file)

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TIER_LIMITS } from "./tiers";

export async function getUserTier(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      billingStatus: true,
      tier: true,
      trialEndDate: true,
    },
  });

  if (!user) return "free";

  if (user.billingStatus === "trial" && user.trialEndDate) {
    const trialEnd = new Date(user.trialEndDate);
    if (trialEnd > new Date()) {
      return "enhanced";
    }
  }

  if (user.billingStatus === "active" && user.tier) {
    return user.tier;
  }

  return "free";
}

export async function checkFeatureAccess(
  userId: string,
  feature: keyof typeof TIER_LIMITS["free"]
): Promise<boolean> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
  const value = limits[feature];

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

export async function checkSubscriptionLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
}> {
  const tier = await getUserTier(userId);
  const limit = TIER_LIMITS[tier as keyof typeof TIER_LIMITS].maxSubscriptions;

  // Count current active subscriptions
  const result = await db.query.subscriptions.findMany({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.userId, userId), isNull(s.deletedAt)),
    columns: { id: true },
  });

  const current = result.length;

  return {
    allowed: current < limit,
    current,
    limit: limit === Infinity ? -1 : limit, // -1 = unlimited
  };
}
```

## Data Flow

### Checkout Flow (Updated)

```
User clicks "Subscribe to Enhanced"
    ↓
Client sends POST /api/billing/create-checkout
  { tier: "enhanced", interval: "monthly" }
    ↓
API route:
  1. Get/create Stripe customer
  2. Look up TIER_PRICES["enhanced"]["monthly"]
  3. Create checkout session with price ID
  4. Return checkout URL
    ↓
User completes checkout on Stripe
    ↓
Stripe sends webhook: checkout.session.completed
    ↓
Webhook handler:
  1. Get subscription from Stripe
  2. Get price ID from subscription
  3. Map price ID to tier using getTierFromPriceId()
  4. Update user: { billingStatus: "active", tier: "enhanced" }
```

### Feature Gate Flow

```
Component renders <FeatureGate feature="analytics">
    ↓
useUserTier() hook:
  1. Get tier from session/user data
  2. Look up TIER_LIMITS[tier]
  3. Return hasFeature("analytics")
    ↓
If true: render children
If false: render fallback (upgrade prompt)
```

### Voucher Redemption Flow

```
User enters voucher code "LAUNCH2025"
    ↓
Client sends POST /api/billing/redeem-voucher
  { code: "LAUNCH2025" }
    ↓
API route:
  1. Validate voucher in database
     - Check isActive, expiresAt, usedCount < maxRedemptions
  2. Check user hasn't already redeemed this voucher
  3. If voucher has stripeCouponId:
     - Apply to Stripe customer for checkout discount
  4. If voucher grants tier directly:
     - Update user.tier, user.voucherCode
  5. Increment voucher.usedCount
  6. Record in voucher_redemptions
    ↓
Return { success: true, tier: "enhanced" }
```

## Integration Points

### Existing Components to Update

| Component | Current | Update Needed |
|-----------|---------|---------------|
| `useUserStatus()` | Returns `isActive`, `isPaid` | Add `tier`, `limits`, `hasFeature()` |
| `TrialBanner` | Shows trial days | Add tier-aware messaging |
| `BillingPage` | Single tier pricing | Multi-tier pricing cards |
| `/api/billing/create-checkout` | Fixed price IDs | Tier + interval price lookup |
| `/api/webhooks/stripe` | Updates `billingStatus` | Also updates `tier` from price ID |
| `lib/auth/config.ts` JWT callback | Adds `billingStatus` | Add `tier` to token |
| `types/next-auth.d.ts` | Session types | Add `tier` field |

### New Components

| Component | Purpose |
|-----------|---------|
| `lib/billing/tiers.ts` | Tier limits and features config |
| `lib/billing/server.ts` | Server-side tier checking |
| `lib/hooks/use-user-tier.ts` | Client-side tier hook |
| `components/billing/feature-gate.tsx` | Feature gating components |
| `components/billing/tier-badge.tsx` | Display current tier |
| `components/billing/upgrade-prompt.tsx` | Feature locked prompt |
| `/api/billing/redeem-voucher/route.ts` | Voucher redemption endpoint |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | Existing client, add Products | Create Products/Prices in Stripe Dashboard |
| Supabase | Add columns + tables via migration | Drizzle migrations |
| NextAuth | JWT callback adds tier | Already patterns for billingStatus |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Only Gating

**What people do:** Only check feature access in React components
**Why it's wrong:** Users can bypass by calling API directly
**Instead:** Always validate tier/limits in API routes AND client components

### Anti-Pattern 2: Hardcoded Price IDs

**What people do:** Hardcode Stripe price IDs in checkout logic
**Why it's wrong:** Can't change prices without code deployment
**Instead:** Use environment variables for all price IDs, validate against known set

### Anti-Pattern 3: Trusting Session Tier Without Validation

**What people do:** Trust the tier from session for write operations
**Why it's wrong:** Session data could be stale; user could have cancelled
**Instead:** For write operations (add subscription, import PDF), verify tier from database

### Anti-Pattern 4: Separate Billing Databases

**What people do:** Store subscription data in separate table from users
**Why it's wrong:** Extra JOINs, sync issues, complexity without benefit
**Instead:** Add tier column to existing users table (this project's pattern)

## Build Order Recommendation

Based on dependencies and existing code structure:

### Phase 1: Database & Configuration (Foundation)

1. Add `tier` column to users table (migration)
2. Create vouchers and voucher_redemptions tables (migration)
3. Update `lib/stripe/products.ts` with tier configuration
4. Create `lib/billing/tiers.ts` with limits config
5. Add new Stripe env vars to `.env.example`

**Depends on:** Nothing
**Blocks:** Everything else

### Phase 2: Stripe Product Setup

1. Create 3 Products in Stripe (Primary, Enhanced, Advanced)
2. Create 6 Prices (monthly + annual for each tier)
3. Configure env vars with price IDs
4. Optionally create promotion codes in Stripe for vouchers

**Depends on:** Nothing (parallel with Phase 1)
**Blocks:** Checkout updates

### Phase 3: Backend Tier Sync

1. Update webhook handler to extract tier from price ID
2. Add `tier` to JWT callback and session types
3. Create `lib/billing/server.ts` for server-side checks
4. Update `/api/billing/create-checkout` for tier selection

**Depends on:** Phase 1, Phase 2
**Blocks:** Client-side tier access

### Phase 4: Client-Side Gating

1. Create `useUserTier()` hook
2. Create `<FeatureGate>` and `<TierGate>` components
3. Update `useUserStatus()` or migrate to `useUserTier()`
4. Update billing page with tier selection UI

**Depends on:** Phase 3
**Blocks:** Feature gating in UI

### Phase 5: Voucher System

1. Create `/api/billing/redeem-voucher` endpoint
2. Create voucher redemption UI
3. Integrate with checkout flow (apply Stripe promotion code)

**Depends on:** Phase 1 (voucher tables), Phase 3 (checkout)
**Blocks:** Nothing (can be deferred)

### Phase 6: Feature Gating Rollout

1. Add feature gates to subscription creation (limit check)
2. Add feature gates to PDF import (monthly limit)
3. Add upgrade prompts where features are gated
4. Add tier badge to sidebar/header

**Depends on:** Phase 4
**Blocks:** Nothing

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-10k users | Current architecture is fine. Single users table with tier. |
| 10k-100k users | Consider caching tier limits in Redis. Add usage tracking table. |
| 100k+ users | Separate billing service. Event-driven tier changes. Usage metering. |

### Current Scale Priorities

1. **Simple tier column** - No need for separate subscriptions table
2. **In-memory limits** - TIER_LIMITS constant is fine
3. **Session-based tier** - JWT contains tier, refreshed on subscription change
4. **Database checks for writes** - Verify tier from DB for important operations

## Sources

- [Stripe Subscriptions Documentation](https://docs.stripe.com/billing/subscriptions/build-subscriptions) - Official build guide
- [Stripe Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons) - Voucher implementation
- [Vercel nextjs-subscription-payments](https://github.com/vercel/nextjs-subscription-payments) - Reference implementation
- [Stripe + Next.js 15 Complete Guide 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) - Modern patterns
- [BigBinary Database Design for Subscriptions](https://www.bigbinary.com/books/handling-stripe-subscriptions/designing-database-for-subscription) - Schema patterns
- [Clerk use-stripe-subscription](https://github.com/clerk/use-stripe-subscription) - Feature gating patterns with metadata

---
*Architecture research for: Billing & Monetization Integration*
*Researched: 2025-02-11*
