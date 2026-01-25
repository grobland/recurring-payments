import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  BarChart3,
  Bell,
  FileUp,
  Check,
  ArrowRight,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  // Redirect authenticated users to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            <span className="font-semibold text-lg">Subscription Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container flex flex-col items-center gap-8 px-4 py-24 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Take control of your{" "}
          <span className="text-primary">subscriptions</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Track all your recurring payments in one place. Import from bank
          statements, get renewal reminders, and see where your money goes.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">
              Start free trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          14-day free trial. No credit card required.
        </p>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/50">
        <div className="container px-4 py-24">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything you need to manage subscriptions
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<CreditCard className="h-6 w-6" />}
              title="Track Everything"
              description="Keep all your subscriptions organized in one dashboard. Never lose track of what you're paying for."
            />
            <FeatureCard
              icon={<FileUp className="h-6 w-6" />}
              title="Smart Import"
              description="Upload your bank statements and let AI automatically detect and import your subscriptions."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6" />}
              title="Renewal Reminders"
              description="Get email reminders before your subscriptions renew. Never be caught off guard."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Spending Insights"
              description="See where your money goes with beautiful charts and category breakdowns."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container px-4 py-24">
        <h2 className="mb-4 text-center text-3xl font-bold">
          Simple, transparent pricing
        </h2>
        <p className="mb-12 text-center text-muted-foreground">
          Start with a 14-day free trial. Cancel anytime.
        </p>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          <PricingCard
            title="Monthly"
            price="$4.99"
            period="/month"
            features={[
              "Unlimited subscriptions",
              "AI-powered PDF import",
              "Email reminders",
              "Spending analytics",
              "Multiple currencies",
              "Data export",
            ]}
          />
          <PricingCard
            title="Annual"
            price="$39.99"
            period="/year"
            badge="Save 33%"
            features={[
              "Unlimited subscriptions",
              "AI-powered PDF import",
              "Email reminders",
              "Spending analytics",
              "Multiple currencies",
              "Data export",
            ]}
            highlighted
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="container flex flex-col items-center gap-4 px-4 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>Subscription Manager. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  period,
  features,
  badge,
  highlighted,
}: {
  title: string;
  price: string;
  period: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg border p-8 ${
        highlighted ? "border-primary shadow-lg" : ""
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          {badge}
        </span>
      )}
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-muted-foreground">{period}</span>
      </div>
      <ul className="mb-8 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            {feature}
          </li>
        ))}
      </ul>
      <Button className="w-full" variant={highlighted ? "default" : "outline"} asChild>
        <Link href="/register">Start free trial</Link>
      </Button>
    </div>
  );
}
