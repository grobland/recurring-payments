"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Crown,
  Info,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStatus } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { TIER_CONFIG, formatPrice, calculateAnnualSavings } from "@/lib/stripe/products";
import { getGrandfatheringInfoAction, getUserTier } from "@/lib/stripe/tiers";
import { toast } from "sonner";
import type { Tier } from "@/lib/db/schema";
import type { GrandfatheringInfo } from "@/lib/stripe/tiers";

type BillingInterval = "month" | "year";

interface TierPrices {
  name: string;
  tagline: string;
  features: string[];
  prices: {
    month: Record<string, { priceId: string; amountCents: number }>;
    year: Record<string, { priceId: string; amountCents: number }>;
  };
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { user, isLoading, isTrialActive, isPaid, daysLeftInTrial, billingStatus } =
    useUserStatus();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<Tier | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier>("primary");
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("month");
  const [tierPrices, setTierPrices] = useState<Record<Tier, TierPrices> | null>(null);
  const [grandfatheringInfo, setGrandfatheringInfo] = useState<GrandfatheringInfo | null>(null);
  const [userTier, setUserTier] = useState<Tier | null>(null);

  // Fetch prices from API
  useEffect(() => {
    async function fetchPrices() {
      try {
        const response = await fetch("/api/billing/prices");
        if (!response.ok) throw new Error("Failed to fetch prices");
        const data = await response.json();
        setTierPrices(data.tiers);
      } catch (error) {
        console.error("Error fetching prices:", error);
        toast.error("Failed to load pricing information");
      }
    }
    fetchPrices();
  }, []);

  // Fetch grandfathering info for paid users
  useEffect(() => {
    async function fetchGrandfatheringInfo() {
      if (!user?.id || !isPaid) return;

      try {
        const info = await getGrandfatheringInfoAction(user.id);
        setGrandfatheringInfo(info);

        // Also get user's current tier
        const tier = await getUserTier(user.id);
        setUserTier(tier);
      } catch (error) {
        console.error("Error fetching grandfathering info:", error);
      }
    }
    fetchGrandfatheringInfo();
  }, [user?.id, isPaid]);

  // Show success/cancel messages from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout was canceled");
    }
  }, [searchParams]);

  const handleCheckout = async (tier: Tier) => {
    setIsCheckoutLoading(tier);
    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          interval: selectedInterval,
          currency: "usd",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error("Failed to start checkout. Please try again.");
      setIsCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setIsPortalLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error("Failed to open billing portal. Please try again.");
      setIsPortalLoading(false);
    }
  };

  if (isLoading || !tierPrices) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate savings for interval toggle
  const primaryMonthly = tierPrices.primary.prices.month.usd?.amountCents || 0;
  const primaryYearly = tierPrices.primary.prices.year.usd?.amountCents || 0;
  const savingsPercent = calculateAnnualSavings(primaryMonthly, primaryYearly);

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPaid ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {userTier ? TIER_CONFIG[userTier].name : "Pro"} Plan
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Full access to all features
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Active
                </Badge>
              </div>

              {user?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  Your subscription renews on{" "}
                  {format(new Date(user.currentPeriodEnd), "MMMM d, yyyy")}
                </p>
              )}

              {/* Grandfathering alert */}
              {grandfatheringInfo?.isGrandfathered && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      You're saving{" "}
                      {formatPrice(grandfatheringInfo.savingsPerMonth, grandfatheringInfo.currency)}
                      /month on your legacy pricing!
                    </p>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Manage Billing
                  </>
                )}
              </Button>
            </div>
          ) : isTrialActive ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Free Trial</p>
                    <p className="text-sm text-muted-foreground">
                      {daysLeftInTrial} days remaining
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Trial</Badge>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Your trial ends on{" "}
                  {user?.trialEndDate &&
                    format(new Date(user.trialEndDate), "MMMM d, yyyy")}
                  . Upgrade now to keep full access.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Free Plan</p>
                    <p className="text-sm text-muted-foreground">
                      Read-only access
                    </p>
                  </div>
                </div>
                <Badge variant="outline">Expired</Badge>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Your trial has expired. Upgrade to add and edit subscriptions.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <Card>
          <CardHeader>
            <CardTitle>Choose a Plan</CardTitle>
            <CardDescription>
              Select the tier that fits your needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Interval Toggle */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={selectedInterval === "month" ? "default" : "outline"}
                onClick={() => setSelectedInterval("month")}
                className="min-w-[120px]"
              >
                Monthly
              </Button>
              <Button
                variant={selectedInterval === "year" ? "default" : "outline"}
                onClick={() => setSelectedInterval("year")}
                className="min-w-[120px]"
              >
                Annual
                {savingsPercent > 0 && (
                  <Badge className="ml-2 bg-green-100 text-green-800">
                    Save {savingsPercent}%
                  </Badge>
                )}
              </Button>
            </div>

            {/* Tier Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              {(["primary", "enhanced", "advanced"] as Tier[]).map((tier) => {
                const tierData = tierPrices[tier];
                const price = tierData.prices[selectedInterval].usd;
                const isSelected = selectedTier === tier;
                const isRecommended = tier === "enhanced";
                const isCurrentTier = isPaid && userTier === tier;

                return (
                  <div
                    key={tier}
                    className={cn(
                      "relative rounded-lg border p-6 transition-all cursor-pointer",
                      isSelected && !isCurrentTier && "border-primary shadow-lg",
                      isCurrentTier && "border-2 border-primary bg-primary/5",
                      isRecommended && !isCurrentTier && "border-2 border-primary",
                      !isSelected && !isCurrentTier && !isRecommended && "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => setSelectedTier(tier)}
                    role="button"
                    tabIndex={0}
                  >
                    {isCurrentTier ? (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Current Plan
                      </Badge>
                    ) : isRecommended ? (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Recommended
                      </Badge>
                    ) : null}

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold">{tierData.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {tierData.tagline}
                        </p>
                      </div>

                      <div>
                        <span className="text-4xl font-bold">
                          {price ? formatPrice(price.amountCents) : "$0"}
                        </span>
                        <span className="text-muted-foreground">
                          /{selectedInterval === "month" ? "month" : "year"}
                        </span>
                      </div>

                      <ul className="space-y-2 text-sm">
                        {tierData.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full"
                        variant={isSelected && !isCurrentTier ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckout(tier);
                        }}
                        disabled={isCheckoutLoading !== null || isCurrentTier}
                      >
                        {isCurrentTier ? (
                          "Current Plan"
                        ) : isCheckoutLoading === tier ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Subscribe"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
