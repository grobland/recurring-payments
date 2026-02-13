"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIER_CONFIG, formatPrice, calculateAnnualSavings } from "@/lib/stripe/products";
import type { Tier } from "@/lib/stripe/products";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { FeatureComparisonTable } from "@/components/pricing/feature-comparison-table";

// FAQ data
const faqs = [
  {
    question: "How does the free trial work?",
    answer: "You get full access to all features for 14 days. No credit card required to start. After the trial, your data remains safe but you'll need to subscribe to add or edit subscriptions.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards through our secure payment processor, Stripe.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we use industry-standard encryption and security practices. Your data is stored securely and is never shared with third parties.",
  },
  {
    question: "Can I switch between tiers?",
    answer: "Yes, you can upgrade or downgrade your tier at any time through the billing settings. Billing adjustments are prorated automatically.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "After cancellation, you'll have read-only access to your data. You can export everything before your subscription ends. We retain your data for 30 days after cancellation in case you decide to resubscribe.",
  },
];

type BillingInterval = "month" | "year";

interface TierPriceData {
  name: string;
  tagline: string;
  features: string[];
  prices: {
    month: Record<string, { priceId: string; amountCents: number }>;
    year: Record<string, { priceId: string; amountCents: number }>;
  };
}

interface PricingData {
  tiers: Record<Tier, TierPriceData>;
}

export default function PricingPage() {
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("month");
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch pricing data from API
    fetch("/api/billing/prices")
      .then((res) => res.json())
      .then((data: PricingData) => {
        setPricingData(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load pricing:", error);
        setIsLoading(false);
      });
  }, []);

  // Calculate savings for annual plan
  const getSavingsPercentage = (tier: Tier) => {
    if (!pricingData) return 0;
    const monthlyPrice = pricingData.tiers[tier].prices.month.usd?.amountCents;
    const annualPrice = pricingData.tiers[tier].prices.year.usd?.amountCents;
    if (!monthlyPrice || !annualPrice) return 0;
    return calculateAnnualSavings(monthlyPrice, annualPrice);
  };

  const getPrice = (tier: Tier, interval: BillingInterval) => {
    if (!pricingData) return null;
    return pricingData.tiers[tier].prices[interval].usd;
  };

  const tiers: Array<{ key: Tier; recommended?: boolean }> = [
    { key: "primary" },
    { key: "enhanced", recommended: true },
    { key: "advanced" },
  ];

  return (
    <div className="container px-4 py-16">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Start with a 14-day free trial. No credit card required.
        </p>
      </div>

      {/* Interval Toggle */}
      <div className="mx-auto mt-12 flex items-center justify-center gap-3">
        <button
          onClick={() => setSelectedInterval("month")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            selectedInterval === "month"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setSelectedInterval("year")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            selectedInterval === "year"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Annual
        </button>
        {selectedInterval === "year" && !isLoading && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Save up to {getSavingsPercentage("enhanced")}%
          </span>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-3">
        {tiers.map(({ key, recommended }) => {
          const tierConfig = TIER_CONFIG[key];
          const price = getPrice(key, selectedInterval);
          const monthlyEquivalent =
            selectedInterval === "year" && price
              ? Math.round(price.amountCents / 12)
              : null;

          return (
            <div
              key={key}
              className={cn(
                "relative rounded-xl border p-8 transition-shadow hover:shadow-lg",
                recommended && "border-2 border-primary shadow-md",
                key === "advanced" && "bg-gradient-to-br from-background to-muted"
              )}
            >
              {recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold">{tierConfig.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tierConfig.tagline}
                </p>
              </div>

              <div className="mb-6">
                {isLoading ? (
                  <div className="h-12 animate-pulse rounded bg-muted" />
                ) : price ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {formatPrice(price.amountCents)}
                      </span>
                      <span className="text-muted-foreground">
                        /{selectedInterval === "month" ? "month" : "year"}
                      </span>
                    </div>
                    {monthlyEquivalent && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        That&apos;s {formatPrice(monthlyEquivalent)}/month
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Price unavailable
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                variant={recommended ? "default" : "outline"}
                asChild
                disabled={isLoading || !price}
              >
                <Link href="/register">Start free trial</Link>
              </Button>

              <ul className="mt-8 space-y-3">
                {tierConfig.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <div className="mx-auto mt-16 max-w-6xl">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Compare all features
        </h2>
        <FeatureComparisonTable />
      </div>

      {/* FAQs */}
      <div className="mx-auto mt-24 max-w-2xl">
        <h2 className="mb-8 flex items-center justify-center gap-2 text-center text-2xl font-bold">
          <HelpCircle className="h-6 w-6" />
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-24 max-w-2xl rounded-xl bg-muted p-8 text-center">
        <h2 className="text-2xl font-bold">Ready to take control?</h2>
        <p className="mt-2 text-muted-foreground">
          Start your 14-day free trial today. No credit card required.
        </p>
        <Button size="lg" className="mt-6" asChild>
          <Link href="/register">Get Started Free</Link>
        </Button>
      </div>
    </div>
  );
}
