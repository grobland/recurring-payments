import { db } from "@/lib/db";
import { users, stripePrices } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Tier } from "@/lib/db/schema";

export type { Tier };

/**
 * Get tier for a specific Stripe price ID
 * Used for quick lookups without user context
 */
export async function getTierForPriceId(priceId: string): Promise<Tier | null> {
  const priceRecord = await db.query.stripePrices.findFirst({
    where: eq(stripePrices.stripePriceId, priceId),
    columns: { tier: true },
  });
  return priceRecord?.tier ?? null;
}

/**
 * Get user's current tier based on their active subscription
 * Returns null if user has no active subscription
 */
export async function getUserTier(userId: string): Promise<Tier | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripePriceId: true, billingStatus: true },
  });

  // No subscription or not active
  if (!user?.stripePriceId || user.billingStatus !== "active") {
    return null;
  }

  return getTierForPriceId(user.stripePriceId);
}

/**
 * Grandfathering info - shows if user is paying less than current price
 */
export interface GrandfatheringInfo {
  isGrandfathered: boolean;
  userAmountCents: number;
  currentAmountCents: number;
  savingsPerMonth: number; // In cents
  currency: string;
}

export async function getGrandfatheringInfo(
  userId: string
): Promise<GrandfatheringInfo | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripePriceId: true },
  });

  if (!user?.stripePriceId) return null;

  // Get user's current price record
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
    return null; // Not grandfathered - same price
  }

  // Calculate monthly savings (annualize yearly savings to monthly)
  const userMonthly = userPrice.interval === "year"
    ? Math.round(userPrice.amountCents / 12)
    : userPrice.amountCents;
  const currentMonthly = currentPrice.interval === "year"
    ? Math.round(currentPrice.amountCents / 12)
    : currentPrice.amountCents;

  return {
    isGrandfathered: true,
    userAmountCents: userPrice.amountCents,
    currentAmountCents: currentPrice.amountCents,
    savingsPerMonth: currentMonthly - userMonthly,
    currency: userPrice.currency,
  };
}

/**
 * Get price ID for checkout - looks up active price for tier/interval/currency
 */
export async function getPriceIdForCheckout(
  tier: Tier,
  interval: "month" | "year",
  currency: string = "usd"
): Promise<string | null> {
  const priceRecord = await db.query.stripePrices.findFirst({
    where: and(
      eq(stripePrices.tier, tier),
      eq(stripePrices.interval, interval),
      eq(stripePrices.currency, currency),
      eq(stripePrices.isActive, true)
    ),
    columns: { stripePriceId: true },
  });
  return priceRecord?.stripePriceId ?? null;
}
