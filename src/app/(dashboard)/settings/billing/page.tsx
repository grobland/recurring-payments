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
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStatus } from "@/lib/hooks";
import { PRICING, formatPrice } from "@/lib/stripe/products";
import { toast } from "sonner";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { user, isLoading, isTrialActive, isPaid, daysLeftInTrial, billingStatus } =
    useUserStatus();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Show success/cancel messages from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout was canceled");
    }
  }, [searchParams]);

  const handleCheckout = async (plan: "monthly" | "annual") => {
    setIsCheckoutLoading(plan);
    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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

  if (isLoading) {
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
                    <p className="font-semibold">Pro Plan</p>
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
      {!isPaid && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Plan</CardTitle>
            <CardDescription>
              Upgrade to unlock all features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Monthly Plan */}
              <div className="rounded-lg border p-6">
                <h3 className="text-lg font-semibold">{PRICING.monthly.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {PRICING.monthly.description}
                </p>
                <div className="my-4">
                  <span className="text-3xl font-bold">
                    {formatPrice(PRICING.monthly.amount)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mb-6 space-y-2 text-sm">
                  <PlanFeature>Unlimited subscriptions</PlanFeature>
                  <PlanFeature>AI-powered PDF import</PlanFeature>
                  <PlanFeature>Email reminders</PlanFeature>
                  <PlanFeature>Spending analytics</PlanFeature>
                  <PlanFeature>Data export</PlanFeature>
                </ul>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleCheckout("monthly")}
                  disabled={isCheckoutLoading !== null}
                >
                  {isCheckoutLoading === "monthly" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Subscribe Monthly"
                  )}
                </Button>
              </div>

              {/* Annual Plan */}
              <div className="relative rounded-lg border-2 border-primary p-6">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Save {PRICING.annual.savings}
                </Badge>
                <h3 className="text-lg font-semibold">{PRICING.annual.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {PRICING.annual.description}
                </p>
                <div className="my-4">
                  <span className="text-3xl font-bold">
                    {formatPrice(PRICING.annual.amount)}
                  </span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <ul className="mb-6 space-y-2 text-sm">
                  <PlanFeature>Unlimited subscriptions</PlanFeature>
                  <PlanFeature>AI-powered PDF import</PlanFeature>
                  <PlanFeature>Email reminders</PlanFeature>
                  <PlanFeature>Spending analytics</PlanFeature>
                  <PlanFeature>Data export</PlanFeature>
                </ul>
                <Button
                  className="w-full"
                  onClick={() => handleCheckout("annual")}
                  disabled={isCheckoutLoading !== null}
                >
                  {isCheckoutLoading === "annual" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Subscribe Annually"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 text-primary" />
      {children}
    </li>
  );
}
