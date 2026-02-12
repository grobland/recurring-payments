import type { Tier } from "@/lib/db/schema";

/**
 * Feature identifiers for feature gating
 * Primary tier features are available to all users (including trial)
 * Enhanced and Advanced tier features are placeholders for future development
 */
export const FEATURES = {
  // Primary tier (all users including trial)
  SUBSCRIPTION_TRACKING: "subscription_tracking",
  PDF_IMPORTS: "pdf_imports",
  BASIC_ANALYTICS: "basic_analytics",
  EMAIL_REMINDERS: "email_reminders",
  CATEGORIES: "categories",

  // Enhanced tier (placeholder - not implemented yet)
  SPENDING_MONITORING: "spending_monitoring",
  BUDGET_MANAGEMENT: "budget_management",
  DEBT_TRACKING: "debt_tracking",
  TRANSACTION_CATEGORIZATION: "transaction_categorization",

  // Advanced tier (placeholder - not implemented yet)
  INVESTMENT_TRACKING: "investment_tracking",
  NET_WORTH_DASHBOARD: "net_worth_dashboard",
  MULTI_ACCOUNT_AGGREGATION: "multi_account_aggregation",
  GOAL_PLANNING: "goal_planning",
} as const;

/**
 * Type representing a valid feature identifier
 */
export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

/**
 * Feature-to-tier mapping
 * Defines which tier is required to access each feature
 */
export const FEATURE_TIERS: Record<Feature, Tier> = {
  // Primary tier features
  [FEATURES.SUBSCRIPTION_TRACKING]: "primary",
  [FEATURES.PDF_IMPORTS]: "primary",
  [FEATURES.BASIC_ANALYTICS]: "primary",
  [FEATURES.EMAIL_REMINDERS]: "primary",
  [FEATURES.CATEGORIES]: "primary",

  // Enhanced tier features
  [FEATURES.SPENDING_MONITORING]: "enhanced",
  [FEATURES.BUDGET_MANAGEMENT]: "enhanced",
  [FEATURES.DEBT_TRACKING]: "enhanced",
  [FEATURES.TRANSACTION_CATEGORIZATION]: "enhanced",

  // Advanced tier features
  [FEATURES.INVESTMENT_TRACKING]: "advanced",
  [FEATURES.NET_WORTH_DASHBOARD]: "advanced",
  [FEATURES.MULTI_ACCOUNT_AGGREGATION]: "advanced",
  [FEATURES.GOAL_PLANNING]: "advanced",
};

/**
 * Tier hierarchy levels for comparison
 * Higher number = higher tier = more access
 */
export const TIER_LEVELS: Record<Tier, number> = {
  primary: 1,
  enhanced: 2,
  advanced: 3,
};

/**
 * Get the required tier for a feature
 */
export function getRequiredTier(feature: Feature): Tier {
  return FEATURE_TIERS[feature];
}

/**
 * Check if a user's tier can access a feature
 * Higher tiers can access all features of lower tiers
 * Trial users (null tier) are treated as primary tier
 */
export function canTierAccessFeature(
  userTier: Tier | null,
  feature: Feature
): boolean {
  // Trial users get primary tier access
  const effectiveTier = userTier ?? "primary";
  const requiredLevel = TIER_LEVELS[FEATURE_TIERS[feature]];
  const userLevel = TIER_LEVELS[effectiveTier];
  return userLevel >= requiredLevel;
}
