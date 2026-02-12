"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Check } from "lucide-react";

import { getUserFeatureAccess, type Feature } from "@/lib/features";
import { TIER_CONFIG } from "@/lib/stripe/products";
import type { Tier } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  featurePreview?: React.ReactNode;
}

interface FeatureAccess {
  hasAccess: boolean;
  userTier: Tier | null;
  requiredTier: Tier;
}

/**
 * FeatureGate conditionally renders children based on feature access.
 * Shows an upgrade prompt modal when users click on locked features.
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  featurePreview,
}: FeatureGateProps) {
  const router = useRouter();
  const [access, setAccess] = React.useState<FeatureAccess | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    getUserFeatureAccess(feature).then(setAccess);
  }, [feature]);

  // Loading state
  if (access === null) {
    return fallback ?? null;
  }

  // User has access - render children
  if (access.hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access
  if (!showUpgradePrompt) {
    return fallback ?? null;
  }

  const tierConfig = TIER_CONFIG[access.requiredTier];
  const tierName = tierConfig.name;

  return (
    <>
      {/* Locked placeholder - clickable to open upgrade modal */}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-muted p-3">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {tierName} Feature
          </p>
          <p className="text-xs text-muted-foreground/75">
            Click to learn more about upgrading
          </p>
        </div>
      </button>

      {/* Upgrade modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to {tierName}</DialogTitle>
            <DialogDescription>
              This feature requires the {tierName} tier
            </DialogDescription>
          </DialogHeader>

          {/* Feature preview section */}
          {featurePreview && (
            <div className="rounded-lg border bg-muted/50 p-4">
              {featurePreview}
            </div>
          )}

          {/* Feature list from tier config */}
          <div className="space-y-3">
            <p className="text-sm font-medium">What you get with {tierName}:</p>
            <ul className="space-y-2">
              {tierConfig.features.map((featureItem, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{featureItem}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                router.push("/pricing");
              }}
              className="w-full sm:w-auto"
            >
              Compare all tiers
            </Button>
            <Button
              onClick={() => {
                setDialogOpen(false);
                router.push("/settings/billing");
              }}
              className="w-full sm:w-auto"
            >
              Upgrade now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface LockedNavItemProps {
  feature: Feature;
  children: React.ReactNode;
  className?: string;
}

/**
 * LockedNavItem renders navigation items with a grayed-out state for locked features.
 * Children are rendered normally if user has access, otherwise with disabled styling.
 */
export function LockedNavItem({
  feature,
  children,
  className,
}: LockedNavItemProps) {
  const [access, setAccess] = React.useState<FeatureAccess | null>(null);

  React.useEffect(() => {
    getUserFeatureAccess(feature).then(setAccess);
  }, [feature]);

  // Loading state - render nothing to avoid layout shift
  if (access === null) {
    return null;
  }

  // User has access - render children normally
  if (access.hasAccess) {
    return <div className={className}>{children}</div>;
  }

  // User doesn't have access - render with disabled styling
  return (
    <div
      className={cn(
        "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {children}
    </div>
  );
}
