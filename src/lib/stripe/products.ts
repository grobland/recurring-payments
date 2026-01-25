// Stripe Price IDs - these should be set in environment variables
// and configured in your Stripe dashboard

export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID ?? "",
  annual: process.env.STRIPE_ANNUAL_PRICE_ID ?? "",
} as const;

export const PRICING = {
  monthly: {
    amount: 499, // $4.99 in cents
    currency: "usd",
    interval: "month" as const,
    name: "Monthly",
    description: "Billed monthly",
  },
  annual: {
    amount: 3999, // $39.99 in cents
    currency: "usd",
    interval: "year" as const,
    name: "Annual",
    description: "Billed yearly (save 33%)",
    savings: "33%",
  },
} as const;

export type PricingPlan = keyof typeof PRICING;

export function formatPrice(amountInCents: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountInCents / 100);
}

export function getPriceId(plan: PricingPlan): string {
  const priceId = STRIPE_PRICES[plan];
  if (!priceId) {
    throw new Error(`Stripe price ID not configured for plan: ${plan}`);
  }
  return priceId;
}
