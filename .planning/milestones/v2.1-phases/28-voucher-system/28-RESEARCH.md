# Phase 28: Voucher System - Research

**Researched:** 2026-02-17
**Domain:** Stripe Coupons, Promotion Codes, Trial Extension
**Confidence:** HIGH (Stripe official docs + codebase inspection)

## Summary

The voucher system has two distinct parts: (1) user-redeemable promo codes at checkout using Stripe's native infrastructure, and (2) admin-applied trial extensions that update `users.trialEndDate` in the database. Both paths already have most infrastructure in place.

Stripe uses a two-layer model: **Coupons** define the discount terms (percent off, duration, redemption limits). **Promotion Codes** are the customer-facing codes (e.g., "FREE30DAYS") that point to a coupon. Users redeem promotion codes, not coupons directly. The checkout session already has `allow_promotion_codes: true` set in `src/app/api/billing/create-checkout/route.ts`, so the promo code input field is already live in checkout — VCHR-02 is mostly done.

Trial extension (VCHR-03) is a pure database operation: update `users.trialEndDate` to a future timestamp. Trial users have no Stripe subscription yet (they only get one when they pay), so there is no Stripe subscription `trial_end` to update. The existing `isUserActive()` helper in `src/lib/auth/helpers.ts` reads `trialEndDate` directly from the session, so updating the DB column is sufficient.

**Primary recommendation:** Build a new `trial_extensions` table to track extension history. Add an admin API route at `POST /api/admin/trial-extensions` protected by `auth()` session check. Add an admin page at `/admin/trial-extensions` following the webhooks admin page pattern.

## Standard Stack

The Stripe SDK and Drizzle ORM are already installed. No new packages needed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | `2025-12-15.clover` API version | Coupon/promo code API calls | Already in use, `getStripeClient()` available |
| drizzle-orm | Current | New table for extension tracking | Already in use for all DB operations |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Current | `addDays()` for computing new trial end date | Already used in auth config |
| zod | Current | Validate admin API request body | Already used in all API routes |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/admin/
│   │   ├── layout.tsx                    # Existing — auth check
│   │   ├── webhooks/page.tsx             # Existing pattern to follow
│   │   └── trial-extensions/page.tsx     # NEW — list view
│   └── api/
│       └── admin/
│           └── trial-extensions/
│               └── route.ts              # NEW — POST endpoint
├── lib/
│   └── db/
│       └── schema.ts                     # Add trialExtensions table
```

### Pattern 1: Stripe Coupon + Promotion Code Creation (Stripe Dashboard Only)

Per the context decisions, voucher codes are created in Stripe Dashboard, not via custom UI. The planner should document what fields admins configure, not build an API for creation.

**Stripe Dashboard workflow:**
1. Go to Stripe Dashboard > Products > Coupons > Create coupon
2. Set `percent_off: 100`, `duration: repeating`, `duration_in_months: N` for free months
3. Set `max_redemptions` for total code usage limit, `redeem_by` for expiry
4. Create Promotion Code on top of that coupon with human-readable `code` string

**Key coupon parameters for free months:**
```typescript
// Source: https://docs.stripe.com/api/coupons/create
{
  percent_off: 100,           // 100% off = free
  duration: "repeating",      // Applies for multiple billing cycles
  duration_in_months: 1,      // Number of free months
  max_redemptions: 500,       // How many total users can redeem
  redeem_by: 1767225600,      // Unix timestamp expiration
  name: "1 Free Month"        // Shows on invoices
}
```

**Key promotion code parameters:**
```typescript
// Source: https://docs.stripe.com/api/promotion_codes/create
{
  coupon: "coupon_id_here",
  code: "FREEMONTH2026",       // What users type at checkout
  max_redemptions: 500,        // Per-code redemption limit
  expires_at: 1767225600,      // Unix timestamp
  restrictions: {
    first_time_transaction: true  // Only new customers
  }
}
```

### Pattern 2: Checkout Session with allow_promotion_codes (Already Done)

The checkout route already has this configured:

```typescript
// Source: src/app/api/billing/create-checkout/route.ts (line 103)
const checkoutSession = await stripe.checkout.sessions.create({
  // ...
  allow_promotion_codes: true,  // Already set — shows promo code field
  // ...
});
```

No changes needed to checkout for VCHR-02. Stripe automatically validates codes, applies discounts, and shows them on the Stripe-hosted checkout page.

### Pattern 3: Trial Extension (DB Update Pattern)

Trial users have `billingStatus: "trial"` and `trialEndDate` in `users` table. They have no Stripe subscription yet. Extending their trial means updating `users.trialEndDate` to a later timestamp.

```typescript
// Pattern: extend trial by N days
// Source: codebase inspection of src/lib/auth/helpers.ts + schema.ts

import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function extendTrial(userId: string, daysToAdd: number): Promise<void> {
  // Get current trial end (cumulative extensions)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { trialEndDate: true, billingStatus: true },
  });

  if (!user || user.billingStatus !== "trial") {
    throw new Error("User is not on trial");
  }

  // Extensions are cumulative — extend from current trialEndDate or now
  const baseDate = user.trialEndDate
    ? new Date(Math.max(user.trialEndDate.getTime(), Date.now()))
    : new Date();

  const newTrialEndDate = addDays(baseDate, daysToAdd);

  await db
    .update(users)
    .set({
      trialEndDate: newTrialEndDate,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
```

### Pattern 4: Admin API Endpoint Authentication

Existing admin pages use `auth()` session check (no special admin role yet):

```typescript
// Source: src/app/(dashboard)/admin/layout.tsx
const session = await auth();
if (!session?.user) {
  redirect("/login");
}
// Note: Admin role check is commented out as "Future: Add admin role check"
```

For the admin API endpoint, use the same pattern as other protected API routes:

```typescript
// Source: pattern from src/app/api/billing/create-checkout/route.ts
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Pattern 5: Admin List Page (Webhooks Pattern)

The webhooks admin page at `src/app/(dashboard)/admin/webhooks/page.tsx` is the direct template to follow:
- Server component that queries DB directly (no API route needed for reads)
- Uses `shadcn/ui` Table, Badge, Button components
- Pagination with searchParams
- Filtering via GET form
- `format()` from date-fns for dates

### New Database Table: trial_extensions

```typescript
// Schema to add to src/lib/db/schema.ts
export const trialExtensions = pgTable(
  "trial_extensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Extension details
    daysAdded: integer("days_added").notNull(),
    previousTrialEndDate: timestamp("previous_trial_end_date", { withTimezone: true }),
    newTrialEndDate: timestamp("new_trial_end_date", { withTimezone: true }).notNull(),

    // Admin tracking
    appliedByAdminId: uuid("applied_by_admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"), // Optional note from admin

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("trial_extensions_user_id_idx").on(table.userId),
    index("trial_extensions_created_at_idx").on(table.createdAt),
  ]
);
```

### Anti-Patterns to Avoid
- **Creating a custom coupon creation UI:** Context decisions lock this to Stripe Dashboard only. Do not build any API routes for `POST /stripe/coupons`.
- **Updating Stripe subscription trial_end for trial users:** Trial users have no Stripe subscription yet. Updating Stripe's `trial_end` would fail with "no subscription found." Update the DB `trialEndDate` column only.
- **Allowing non-trial users to receive trial extensions:** The `extendTrial` function must check `billingStatus === "trial"` before proceeding. Paid subscribers cannot receive trial extensions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Promo code validation at checkout | Custom code validation logic | Stripe's `allow_promotion_codes: true` | Stripe validates codes, applies discounts, handles max_redemptions automatically |
| Coupon redemption counting | Custom redemption tracking table | Stripe Dashboard reporting | Stripe tracks `times_redeemed` on promotion codes natively |
| Checkout promo code UI | Custom input field on checkout page | Stripe Hosted Checkout's built-in field | already rendered by Stripe when `allow_promotion_codes: true` |

**Key insight:** Stripe handles all promo code mechanics at checkout (validation, counting, UI rendering). The app only needs to track trial extensions since those are DB-only operations outside Stripe.

## Common Pitfalls

### Pitfall 1: Trial Users Have No Stripe Subscription
**What goes wrong:** Developer calls `stripe.subscriptions.update(user.stripeSubscriptionId, { trial_end: ... })` for a trial user but the user has no subscription, causing a Stripe API error.
**Why it happens:** The naming "trial" is overloaded — the app has its own DB-level trial (users with `billingStatus: "trial"` and `trialEndDate`) that is completely separate from Stripe subscription trials.
**How to avoid:** Check `user.billingStatus !== "trial"` guard. For trial users, only update `users.trialEndDate` in the database. Never call Stripe subscription API for trial users.
**Warning signs:** `user.stripeSubscriptionId` is null for trial users — this is the signal.

### Pitfall 2: Non-Cumulative Extension Logic
**What goes wrong:** Admin applies a 7-day extension, but code computes `now + 7 days` instead of `currentTrialEnd + 7 days`. If trial end is in the future, user loses existing remaining days.
**Why it happens:** Using `new Date()` as the base instead of `Math.max(currentTrialEndDate, now)`.
**How to avoid:** Always use `Math.max(user.trialEndDate.getTime(), Date.now())` as the base for computing the new end date.

### Pitfall 3: Session Cache After Trial Extension
**What goes wrong:** Admin extends trial, but user sees no change because `trialEndDate` is cached in the NextAuth JWT session token and not re-read from DB.
**Why it happens:** NextAuth's JWT callback only refreshes `trialEndDate` on sign-in and token refresh. The session token can be stale.
**How to avoid:** This is a known limitation of JWT sessions. Users need to re-authenticate (sign out/in) or wait for the session to refresh. Document this in admin UI ("Changes may take up to 24 hours to reflect for the user"). Alternatively, consider adding a `session.strategy: "database"` — but that's out of scope; document the limitation instead.

### Pitfall 4: Missing Index on trial_extensions.userId
**What goes wrong:** Admin page query to list trial extensions joins users and is slow without an index.
**How to avoid:** The schema above includes `index("trial_extensions_user_id_idx").on(table.userId)`.

### Pitfall 5: Coupon vs Promotion Code Confusion
**What goes wrong:** Developer tries to pass a `coupon_id` to `allow_promotion_codes` checkout thinking they're the same. They're not — `allow_promotion_codes` enables Stripe's UI for users to type a promotion code string, not a coupon ID.
**Why it happens:** Stripe's two-layer model is not obvious. Coupon = discount definition. Promotion Code = redeemable string users type.
**How to avoid:** Never pass coupon IDs to the checkout session when using `allow_promotion_codes`. Create the promotion code in Stripe Dashboard, distribute that code string to users.

## Code Examples

### Admin Trial Extension API Route

```typescript
// src/app/api/admin/trial-extensions/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, trialExtensions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { z } from "zod";

const schema = z.object({
  userId: z.string().uuid(),
  daysToAdd: z.number().int().min(1).max(365),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { userId, daysToAdd, reason } = result.data;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { trialEndDate: true, billingStatus: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.billingStatus !== "trial") {
    return NextResponse.json(
      { error: "User is not on trial" },
      { status: 400 }
    );
  }

  // Cumulative: extend from current end date, not from now
  const baseDate = user.trialEndDate
    ? new Date(Math.max(user.trialEndDate.getTime(), Date.now()))
    : new Date();
  const newTrialEndDate = addDays(baseDate, daysToAdd);

  // Update user trial end date
  await db
    .update(users)
    .set({ trialEndDate: newTrialEndDate, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Log the extension
  await db.insert(trialExtensions).values({
    userId,
    daysAdded: daysToAdd,
    previousTrialEndDate: user.trialEndDate,
    newTrialEndDate,
    appliedByAdminId: session.user.id,
    reason: reason ?? null,
  });

  return NextResponse.json({ success: true, newTrialEndDate });
}
```

### Drizzle Query for Admin Extension List Page

```typescript
// Server component — follows webhooks page pattern
// Source: adapted from src/app/(dashboard)/admin/webhooks/page.tsx

import { db } from "@/lib/db";
import { trialExtensions, users } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const extensions = await db
  .select({
    id: trialExtensions.id,
    daysAdded: trialExtensions.daysAdded,
    reason: trialExtensions.reason,
    createdAt: trialExtensions.createdAt,
    newTrialEndDate: trialExtensions.newTrialEndDate,
    userEmail: users.email,
    userName: users.name,
  })
  .from(trialExtensions)
  .innerJoin(users, eq(trialExtensions.userId, users.id))
  .orderBy(desc(trialExtensions.createdAt))
  .limit(50);
```

### Schema Relations to Add

```typescript
// Add to usersRelations in schema.ts
trialExtensions: many(trialExtensions),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Passing coupon ID directly to checkout session | Use `allow_promotion_codes: true` for user-facing input | Stripe introduced Promotion Codes ~2020 | Users type human-readable codes; Stripe handles validation |
| Custom discount tracking tables | Stripe Dashboard reporting | N/A | Promo code usage stats live in Stripe, no need to replicate |

**Verified current state:**
- `allow_promotion_codes: true` is already in `create-checkout/route.ts` (line 103) — VCHR-02 checkout UI is already done
- Stripe API version in use: `2025-12-15.clover` — current

## Open Questions

1. **Admin authentication for trial extension endpoint**
   - What we know: Admin layout uses `auth()` session check, no admin role exists yet
   - What's unclear: Should the admin API endpoint check a special admin flag/env var, or is session auth sufficient for this internal tool?
   - Recommendation: Use session auth + document that any logged-in user can currently access admin routes. This matches the existing admin webhooks page behavior. Add a note that admin role gating is a future enhancement (already commented in layout.tsx).

2. **Session staleness after trial extension**
   - What we know: NextAuth JWT sessions cache `trialEndDate` and won't refresh immediately after DB update
   - What's unclear: How long is the JWT session valid before it re-reads from DB?
   - Recommendation: Check `src/lib/auth/config.ts` for session maxAge. Add a note in admin UI that changes reflect on user's next login or session refresh.

3. **Stripe promo code `first_time_transaction` restriction behavior**
   - What we know: The restriction limits codes to customers with no prior successful payments
   - What's unclear: How Stripe determines "first time" — is it per-customer or per-email?
   - Recommendation: Test in Stripe test mode before shipping. The planner should include a test task for this.

## Sources

### Primary (HIGH confidence)
- `https://docs.stripe.com/api/coupons/create` — Coupon parameters (percent_off, duration, duration_in_months, max_redemptions, redeem_by)
- `https://docs.stripe.com/api/promotion_codes/create` — Promotion code parameters (code, max_redemptions, expires_at, restrictions.first_time_transaction)
- `https://docs.stripe.com/billing/subscriptions/coupons` — Coupon/promo code relationship, allow_promotion_codes behavior
- `https://docs.stripe.com/api/subscriptions/update` — trial_end parameter semantics
- `src/app/api/billing/create-checkout/route.ts` — Confirmed `allow_promotion_codes: true` already set
- `src/app/(dashboard)/admin/webhooks/page.tsx` — Admin page pattern to follow
- `src/lib/db/schema.ts` — Database schema, users table with trialEndDate/billingStatus fields
- `src/lib/auth/helpers.ts` — Trial logic: isUserActive() reads trialEndDate directly

### Secondary (MEDIUM confidence)
- `https://docs.stripe.com/billing/subscriptions/trials` — Trial period extension concepts verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed all libraries already installed, no new deps
- Architecture: HIGH — checkout change already done; admin pattern directly follows existing webhooks page
- Pitfalls: HIGH — identified from codebase inspection + official Stripe docs
- Trial extension mechanism: HIGH — confirmed trial users have no Stripe subscription (stripeSubscriptionId is null); DB-only update is correct approach

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (Stripe API stable; Next.js patterns stable)
