"use server";

import { auth } from "@/lib/auth";
import { getUserTier } from "@/lib/stripe/tiers";
import {
  canTierAccessFeature,
  getRequiredTier,
  type Feature,
} from "./config";
import type { Tier } from "@/lib/db/schema";

/**
 * Check if the current user has access to a feature
 * Returns false for unauthenticated users
 */
export async function hasFeature(feature: Feature): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  // Get user's subscription tier
  const userTier = await getUserTier(session.user.id);

  // Check access (trial users get primary tier via canTierAccessFeature)
  return canTierAccessFeature(userTier, feature);
}

/**
 * Get detailed feature access information for the current user
 * Used by client components to determine rendering and upgrade prompts
 */
export async function getUserFeatureAccess(feature: Feature): Promise<{
  hasAccess: boolean;
  userTier: Tier | null;
  requiredTier: Tier;
}> {
  const session = await auth();
  const requiredTier = getRequiredTier(feature);

  if (!session?.user?.id) {
    return {
      hasAccess: false,
      userTier: null,
      requiredTier,
    };
  }

  const userTier = await getUserTier(session.user.id);
  const hasAccess = canTierAccessFeature(userTier, feature);

  return {
    hasAccess,
    userTier,
    requiredTier,
  };
}

/**
 * Require a feature for access - throws if user lacks permission
 * Use in API routes and server actions to enforce access control
 *
 * @throws Error with message "This feature requires {tier} tier"
 */
export async function requireFeature(feature: Feature): Promise<void> {
  const hasAccess = await hasFeature(feature);

  if (!hasAccess) {
    const requiredTier = getRequiredTier(feature);
    throw new Error(`This feature requires ${requiredTier} tier`);
  }
}
