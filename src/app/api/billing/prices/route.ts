import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripePrices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TIER_CONFIG } from "@/lib/stripe/products";
import type { Tier } from "@/lib/db/schema";

/**
 * GET /api/billing/prices
 * Returns active prices grouped by tier for frontend display
 * No authentication required - pricing info is public
 */
export async function GET() {
  try {
    // Query all active prices
    const activePrices = await db.query.stripePrices.findMany({
      where: eq(stripePrices.isActive, true),
    });

    // Group prices by tier -> interval -> currency
    const groupedPrices: Record<
      Tier,
      {
        name: string;
        tagline: string;
        features: string[];
        prices: {
          month: Record<string, { priceId: string; amountCents: number }>;
          year: Record<string, { priceId: string; amountCents: number }>;
        };
      }
    > = {
      primary: {
        ...TIER_CONFIG.primary,
        prices: { month: {}, year: {} },
      },
      enhanced: {
        ...TIER_CONFIG.enhanced,
        prices: { month: {}, year: {} },
      },
      advanced: {
        ...TIER_CONFIG.advanced,
        prices: { month: {}, year: {} },
      },
    };

    // Populate prices
    for (const price of activePrices) {
      const tier = price.tier as Tier;
      const interval = price.interval as "month" | "year";
      const currency = price.currency.toLowerCase();

      groupedPrices[tier].prices[interval][currency] = {
        priceId: price.stripePriceId,
        amountCents: price.amountCents,
      };
    }

    return NextResponse.json({ tiers: groupedPrices });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
