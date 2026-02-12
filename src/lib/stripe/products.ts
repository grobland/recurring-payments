import type { Tier } from "@/lib/db/schema";

// Re-export Tier type for convenience
export type { Tier };

/**
 * Tier configuration - features and display info
 * Price amounts are stored in database, not here
 */
export const TIER_CONFIG: Record<Tier, {
  name: string;
  tagline: string;
  description: string;
  features: string[];
}> = {
  primary: {
    name: "Primary",
    tagline: "Essential subscription tracking",
    description: "Everything you need to track and manage recurring subscriptions",
    features: [
      "Unlimited subscription tracking",
      "PDF statement imports",
      "Spending analytics dashboard",
      "Email renewal reminders",
      "Category organization",
    ],
  },
  enhanced: {
    name: "Enhanced",
    tagline: "General banking insights",
    description: "Advanced analytics plus spending monitoring and budgeting",
    features: [
      "Everything in Primary",
      "Spending monitoring",
      "Budget management",
      "Debt tracking",
      "Transaction categorization",
    ],
  },
  advanced: {
    name: "Advanced",
    tagline: "Full financial picture",
    description: "Complete financial overview with investments and net worth",
    features: [
      "Everything in Enhanced",
      "Investment tracking",
      "Net worth dashboard",
      "Multi-account aggregation",
      "Financial goal planning",
    ],
  },
};

/**
 * Get display name for tier
 */
export function getTierDisplayName(tier: Tier): string {
  return TIER_CONFIG[tier].name;
}

/**
 * Get features for tier
 */
export function getTierFeatures(tier: Tier): string[] {
  return TIER_CONFIG[tier].features;
}

/**
 * Format price for display
 */
export function formatPrice(
  amountInCents: number,
  currency: string = "usd"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountInCents / 100);
}

/**
 * Calculate annual savings compared to monthly
 * @param monthlyAmount Monthly amount in cents
 * @param annualAmount Annual amount in cents
 * @returns Percentage saved (e.g., 17 for 17%)
 */
export function calculateAnnualSavings(
  monthlyAmount: number,
  annualAmount: number
): number {
  const monthlyTotal = monthlyAmount * 12;
  const savings = ((monthlyTotal - annualAmount) / monthlyTotal) * 100;
  return Math.round(savings);
}

// Supported currencies
export const SUPPORTED_CURRENCIES = ["usd", "eur", "gbp"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Billing intervals
export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];
