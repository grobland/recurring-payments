import Link from "next/link";
import { Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING, formatPrice } from "@/lib/stripe/products";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = {
  title: "Pricing - Subscription Manager",
  description: "Simple, transparent pricing for managing your subscriptions.",
};

const features = [
  {
    name: "Unlimited subscriptions",
    description: "Track as many subscriptions as you need without limits.",
  },
  {
    name: "AI-powered PDF import",
    description: "Upload bank statements and let AI detect your subscriptions automatically.",
  },
  {
    name: "Email reminders",
    description: "Get notified before subscriptions renew so you're never surprised.",
  },
  {
    name: "Spending analytics",
    description: "See where your money goes with charts and category breakdowns.",
  },
  {
    name: "Multiple currencies",
    description: "Track subscriptions in any currency with live exchange rates.",
  },
  {
    name: "Data export",
    description: "Export your data anytime in CSV or JSON format.",
  },
];

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
    question: "Can I switch between monthly and annual plans?",
    answer: "Yes, you can switch plans at any time through the billing settings. If upgrading to annual, you'll be credited for any unused time on your monthly plan.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "After cancellation, you'll have read-only access to your data. You can export everything before your subscription ends. We retain your data for 30 days after cancellation in case you decide to resubscribe.",
  },
];

export default function PricingPage() {
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

      {/* Pricing Cards */}
      <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
        {/* Monthly Plan */}
        <div className="rounded-xl border p-8">
          <h3 className="text-lg font-semibold">{PRICING.monthly.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {PRICING.monthly.description}
          </p>
          <div className="mt-6">
            <span className="text-4xl font-bold">
              {formatPrice(PRICING.monthly.amount)}
            </span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <Button className="mt-8 w-full" variant="outline" asChild>
            <Link href="/register">Start free trial</Link>
          </Button>
          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-start gap-3">
                <Check className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{feature.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Annual Plan */}
        <div className="relative rounded-xl border-2 border-primary p-8 shadow-lg">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
            Save {PRICING.annual.savings}
          </span>
          <h3 className="text-lg font-semibold">{PRICING.annual.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {PRICING.annual.description}
          </p>
          <div className="mt-6">
            <span className="text-4xl font-bold">
              {formatPrice(PRICING.annual.amount)}
            </span>
            <span className="text-muted-foreground">/year</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            That&apos;s {formatPrice(Math.round(PRICING.annual.amount / 12))}/month
          </p>
          <Button className="mt-6 w-full" asChild>
            <Link href="/register">Start free trial</Link>
          </Button>
          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-start gap-3">
                <Check className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{feature.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Feature Details */}
      <div className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-center text-2xl font-bold">
          Everything included in all plans
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.name}>
              <h3 className="flex items-center gap-2 font-semibold">
                <Check className="h-5 w-5 text-primary" />
                {feature.name}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
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
