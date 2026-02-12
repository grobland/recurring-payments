import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getStripeClient } from "@/lib/stripe/client";
import { getPriceIdForCheckout } from "@/lib/stripe/tiers";
import { SUPPORTED_CURRENCIES, BILLING_INTERVALS } from "@/lib/stripe/products";
import { z } from "zod";
import type { Tier } from "@/lib/db/schema";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const checkoutSchema = z.object({
  tier: z.enum(["primary", "enhanced", "advanced"] as const),
  interval: z.enum(["month", "year"] as const),
  currency: z.enum(["usd", "eur", "gbp"] as const).default("usd"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { tier, interval, currency } = result.data;

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Look up price ID from database
    const priceId = await getPriceIdForCheckout(tier, interval, currency);

    if (!priceId) {
      console.error(`Price not found for: tier=${tier}, interval=${interval}, currency=${currency}`);
      return NextResponse.json(
        { error: "Price not available for selected options" },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    let customerId = user.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, user.id));
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/settings/billing?success=true`,
      cancel_url: `${APP_URL}/settings/billing?canceled=true`,
      subscription_data: {
        metadata: {
          userId: user.id,
          tier, // Store tier in subscription metadata for reference
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Create checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
