# Phase 27: Pricing & Portal UI - Research

**Researched:** 2026-02-13
**Domain:** SaaS pricing UI, Stripe Customer Portal integration
**Confidence:** HIGH

## Summary

Phase 27 enhances the existing pricing and billing pages to provide complete tier visibility and customer self-service. The research confirms that the foundational infrastructure is already in place from Phases 24-26. The main gaps are: (1) adding a feature comparison table to the pricing page, (2) highlighting the user's current tier in billing settings, and (3) configuring Stripe portal branding via Dashboard settings.

The standard approach is to build the feature comparison table using shadcn/ui Table components with responsive design patterns (horizontal scroll on mobile, sticky headers, toggle for monthly/annual views). Stripe Customer Portal configuration is handled entirely through the Stripe Dashboard branding settings—no code changes needed for basic branding. For tier switching, the existing portal session creation already supports subscription updates; the key is ensuring the portal configuration in Stripe Dashboard has "Switch plan" enabled with the correct product catalog.

**Primary recommendation:** Use shadcn/ui Table with sticky headers for feature comparison, configure Stripe portal branding via Dashboard (not code), and add visual tier highlighting to billing page using existing TIER_CONFIG data.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Table | latest | Feature comparison table component | shadcn/ui already in use, provides accessible table primitives with Radix UI |
| Stripe Customer Portal | N/A (hosted) | Customer self-service for subscriptions | Official Stripe solution, zero custom code, PCI compliant |
| Next.js App Router | 16 | Page routing and server actions | Already in use, server actions for tier fetching |
| Tailwind CSS | 4 | Responsive table styling | Already in use, v4 provides better performance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | Icons for feature lists | Already in use, provides Check/X icons for feature matrix |
| date-fns | latest | Date formatting for subscription periods | Already in use for currentPeriodEnd display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui Table | Custom table component | Custom requires manual ARIA labels, keyboard nav, responsive behavior |
| Stripe Portal | Custom portal UI | Custom requires PCI compliance, payment method tokenization, complex security |
| Dashboard config | API-managed portal config | API adds complexity; Dashboard is simpler for single-config use case |

**Installation:**
No new packages required—all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (marketing)/
│   │   └── pricing/
│   │       └── page.tsx          # Add <FeatureComparisonTable />
│   └── (dashboard)/
│       └── settings/
│           └── billing/
│               └── page.tsx       # Add tier highlighting
├── components/
│   ├── pricing/
│   │   ├── FeatureComparisonTable.tsx  # NEW: Feature matrix
│   │   └── PricingTierCard.tsx         # Existing
│   └── ui/
│       └── table.tsx              # shadcn/ui Table (add if missing)
└── lib/
    ├── stripe/
    │   ├── products.ts            # Existing TIER_CONFIG
    │   └── tiers.ts               # Existing getUserTier
    └── features/
        └── config.ts              # Existing FEATURE_TIERS mapping
```

### Pattern 1: Feature Comparison Table with Responsive Design
**What:** A table displaying features across tiers with responsive behavior (horizontal scroll on mobile, sticky headers, clear visual hierarchy)
**When to use:** When comparing 3+ tiers with 5+ features each
**Example:**
```typescript
// components/pricing/FeatureComparisonTable.tsx
"use client";

import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIER_CONFIG } from "@/lib/stripe/products";
import { FEATURES, FEATURE_TIERS } from "@/lib/features/config";
import { cn } from "@/lib/utils";

export function FeatureComparisonTable() {
  const tiers = ["primary", "enhanced", "advanced"] as const;

  // Group features by tier level
  const featuresByTier = Object.entries(FEATURES).reduce((acc, [key, feature]) => {
    const tier = FEATURE_TIERS[feature];
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(key);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[600px]">
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[200px]">Feature</TableHead>
            {tiers.map((tier) => (
              <TableHead key={tier} className="text-center">
                {TIER_CONFIG[tier].name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(featuresByTier).map(([tierKey, features]) => (
            features.map((feature, idx) => (
              <TableRow key={feature}>
                <TableCell className="font-medium">
                  {formatFeatureName(feature)}
                </TableCell>
                {tiers.map((tier) => {
                  const hasAccess = tierLevel(tier) >= tierLevel(tierKey);
                  return (
                    <TableCell key={tier} className="text-center">
                      {hasAccess ? (
                        <Check className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```
**Source:** Adapted from [shadcn/ui pricing page patterns](https://github.com/aymanch-03/shadcn-pricing-page) and [LogRocket feature comparison best practices](https://blog.logrocket.com/ux-design/ui-design-comparison-features/)

### Pattern 2: Current Tier Highlighting in Billing Page
**What:** Visual indicator showing user's active tier with distinct styling (border, badge, background)
**When to use:** When user has an active subscription and can view multiple tier options
**Example:**
```typescript
// In billing page.tsx - modify tier card rendering
const isCurrentTier = isPaid && userTier === tier;

<div
  key={tier}
  className={cn(
    "relative rounded-lg border p-6 transition-all",
    isCurrentTier && "border-2 border-primary bg-primary/5 shadow-lg",
    isRecommended && !isCurrentTier && "border-2 border-primary"
  )}
>
  {isCurrentTier && (
    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
      Current Plan
    </Badge>
  )}
  {/* Rest of tier card content */}
</div>
```
**Source:** Standard pattern from [shadcn pricing templates](https://shadcn-pricing-page-generator.shipixen.com/) and existing app tier card styling

### Pattern 3: Stripe Portal Session with Feature Configuration
**What:** Creating portal sessions with specific feature enablement (subscription switching, proration settings)
**When to use:** When redirecting users to Stripe-hosted billing portal
**Example:**
```typescript
// app/api/billing/portal/route.ts (existing - no changes needed)
// The portal configuration is managed in Stripe Dashboard, not code
const portalSession = await stripe.billingPortal.sessions.create({
  customer: user.stripeCustomerId,
  return_url: `${APP_URL}/settings/billing`,
  // Optional: configuration parameter for multi-config scenarios
  // configuration: 'bpc_xxx' // Only needed if using API-managed configs
});
```
**Source:** [Stripe Customer Portal API Reference](https://docs.stripe.com/api/customer_portal/sessions/create)

### Anti-Patterns to Avoid

- **Don't build custom payment method updates:** Stripe Portal handles this securely. Building custom = PCI compliance burden.
- **Don't hardcode feature lists in multiple places:** Use TIER_CONFIG and FEATURE_TIERS as single source of truth.
- **Don't force mobile users to pinch-zoom tables:** Use horizontal scroll with visual hints (shadows/gradients at edges).
- **Don't show "Upgrade" on current tier:** It confuses users. Show "Current Plan" badge instead.
- **Don't create portal configurations via API for single-config apps:** Dashboard config is simpler and sufficient.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment method updates | Custom credit card form | Stripe Customer Portal | PCI compliance, 3D Secure, fraud detection, tokenization |
| Feature comparison tables | Custom responsive table | shadcn/ui Table + Tailwind patterns | Accessibility (ARIA roles, keyboard nav), responsive patterns, screen reader support |
| Subscription proration | Manual proration calculations | Stripe automatic proration | Handles edge cases (leap years, billing cycle anchors, credits, refunds) |
| Portal branding | Custom branded checkout | Stripe Dashboard branding settings | Logo, colors, fonts automatically applied |
| Tier access control | Custom permission logic | Existing FEATURE_TIERS + canTierAccessFeature | Already implemented in Phase 26, tested, and consistent |

**Key insight:** Stripe Customer Portal eliminates 90% of self-service billing complexity. For SaaS apps, building custom subscription management is a costly distraction from core product.

## Common Pitfalls

### Pitfall 1: Forgetting to Enable "Switch Plan" in Stripe Dashboard
**What goes wrong:** Portal session creates successfully, but users can't switch tiers—only cancel or update payment method.
**Why it happens:** Stripe Customer Portal features default to OFF except cancellation. "Switch plan" must be manually enabled.
**How to avoid:**
1. Go to Stripe Dashboard → Settings → Billing → Customer Portal
2. Enable "Switch plan" checkbox
3. Set proration behavior to "Credit back customers for time remaining" (prorated billing)
4. Add all three price IDs to the product catalog (max 10 products)
**Warning signs:** Users report "I don't see upgrade option" or portal only shows "Cancel subscription" button.

### Pitfall 2: Not Syncing Portal Config with Database Prices
**What goes wrong:** User tries to switch tiers but sees "Price not available" or old prices.
**Why it happens:** Portal product catalog references specific Stripe price IDs. If you update prices in DB but don't update portal config, it breaks.
**How to avoid:**
- When adding new price IDs to stripePrices table, also add them to Stripe Dashboard portal product catalog
- Document the two-step process: (1) Add to DB via migration, (2) Add to portal config manually
- Consider API-managed portal configurations if prices change frequently
**Warning signs:** Tier switching fails silently, or users see outdated pricing in portal.

### Pitfall 3: Horizontal Table Overflow Without Visual Cues
**What goes wrong:** Mobile users don't realize they can scroll horizontally, assume features are missing.
**Why it happens:** Default overflow-x-auto has no visual indication of scrollable content.
**How to avoid:**
```css
/* Add gradient shadow to indicate scrollability */
.table-container {
  position: relative;
  overflow-x: auto;
}
.table-container::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to left, white, transparent);
  pointer-events: none;
}
```
**Warning signs:** High mobile bounce rate on pricing page, support tickets asking "Where are the features?"

### Pitfall 4: Showing "Subscribe" Button for Current Tier
**What goes wrong:** Users click "Subscribe" on their current tier, get error or unexpected billing.
**Why it happens:** Not checking `userTier === tier` before showing CTA.
**How to avoid:**
```typescript
{isCurrentTier ? (
  <Badge>Current Plan</Badge>
) : (
  <Button onClick={() => handleCheckout(tier)}>Subscribe</Button>
)}
```
**Warning signs:** Users report double-billing attempts, support tickets saying "I already have this plan."

### Pitfall 5: Not Handling Grandfathered Pricing in UI
**What goes wrong:** User on old price sees higher price in UI, thinks you're overcharging, contacts support.
**Why it happens:** UI shows current pricing from API, not user's actual price.
**How to avoid:** Show grandfathering badge if `isGrandfathered` from `getGrandfatheringInfo` (already implemented in billing page).
**Warning signs:** Support tickets saying "Why did my price go up?" when it didn't.

## Code Examples

Verified patterns from official sources:

### Feature Comparison Table with Mobile-First Design
```typescript
// components/pricing/FeatureComparisonTable.tsx
"use client";

import { Check, X } from "lucide-react";
import { TIER_CONFIG } from "@/lib/stripe/products";
import type { Tier } from "@/lib/db/schema";

interface Feature {
  name: string;
  primary: boolean;
  enhanced: boolean;
  advanced: boolean;
}

const FEATURE_MATRIX: Feature[] = [
  { name: "Unlimited subscription tracking", primary: true, enhanced: true, advanced: true },
  { name: "PDF statement imports", primary: true, enhanced: true, advanced: true },
  { name: "Spending analytics dashboard", primary: true, enhanced: true, advanced: true },
  { name: "Email renewal reminders", primary: true, enhanced: true, advanced: true },
  { name: "Category organization", primary: true, enhanced: true, advanced: true },
  { name: "Spending monitoring", primary: false, enhanced: true, advanced: true },
  { name: "Budget management", primary: false, enhanced: true, advanced: true },
  { name: "Debt tracking", primary: false, enhanced: true, advanced: true },
  { name: "Transaction categorization", primary: false, enhanced: true, advanced: true },
  { name: "Investment tracking", primary: false, enhanced: false, advanced: true },
  { name: "Net worth dashboard", primary: false, enhanced: false, advanced: true },
  { name: "Multi-account aggregation", primary: false, enhanced: false, advanced: true },
  { name: "Financial goal planning", primary: false, enhanced: false, advanced: true },
];

export function FeatureComparisonTable() {
  const tiers: Tier[] = ["primary", "enhanced", "advanced"];

  return (
    <div className="relative overflow-x-auto rounded-lg border">
      {/* Desktop view - traditional table */}
      <table className="hidden md:table w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold">Features</th>
            {tiers.map((tier) => (
              <th key={tier} className="px-6 py-4 text-center text-sm font-semibold">
                {TIER_CONFIG[tier].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {FEATURE_MATRIX.map((feature, idx) => (
            <tr key={idx} className="hover:bg-muted/50">
              <td className="px-6 py-4 text-sm">{feature.name}</td>
              {tiers.map((tier) => (
                <td key={tier} className="px-6 py-4 text-center">
                  {feature[tier] ? (
                    <Check className="inline h-5 w-5 text-primary" />
                  ) : (
                    <X className="inline h-5 w-5 text-muted-foreground" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile view - stacked cards */}
      <div className="md:hidden space-y-6 p-4">
        {tiers.map((tier) => (
          <div key={tier} className="rounded-lg border p-4">
            <h3 className="text-lg font-bold mb-4">{TIER_CONFIG[tier].name}</h3>
            <ul className="space-y-2">
              {FEATURE_MATRIX.filter((f) => f[tier]).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
```
**Source:** Adapted from [responsive pricing table patterns](https://blog.logrocket.com/ux-design/ui-design-comparison-features/) and mobile-first design best practices

### Billing Page with Current Tier Highlighting
```typescript
// In app/(dashboard)/settings/billing/page.tsx
// Add after line 48 (after userTier state)

// Fetch user's current tier (add to useEffect after fetching grandfathering info)
useEffect(() => {
  async function fetchUserTier() {
    if (!user?.id || !isPaid) return;
    try {
      const tier = await getUserTier(user.id);
      setUserTier(tier);
    } catch (error) {
      console.error("Error fetching user tier:", error);
    }
  }
  fetchUserTier();
}, [user?.id, isPaid]);

// Modify tier card rendering (around line 315)
const isCurrentTier = isPaid && userTier === tier;

<div
  key={tier}
  className={cn(
    "relative rounded-lg border p-6 transition-all",
    isSelected && "border-primary shadow-lg",
    isCurrentTier && "border-2 border-primary bg-primary/5",
    isRecommended && !isCurrentTier && "border-2 border-primary"
  )}
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

  {/* Disable button for current tier */}
  <Button
    className="w-full"
    variant={isSelected ? "default" : "outline"}
    onClick={(e) => {
      e.stopPropagation();
      handleCheckout(tier);
    }}
    disabled={isCheckoutLoading !== null || isCurrentTier}
  >
    {isCurrentTier ? "Current Plan" : isCheckoutLoading === tier ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </>
    ) : (
      "Subscribe"
    )}
  </Button>
</div>
```
**Source:** Existing billing page patterns extended with tier highlighting from [shadcn pricing examples](https://shadcnstudio.com/blocks/marketing-ui/pricing-component)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom billing portal with iframes | Stripe-hosted Customer Portal | 2019-2020 | 80% reduction in billing code, automatic PCI compliance |
| API-managed portal configurations | Dashboard-managed portal configs | 2021+ | Simpler for single-config use cases, faster setup |
| Client-side only pricing pages | Hybrid: Server-fetched prices + client interactivity | 2023+ (RSC) | SEO-friendly pricing, dynamic without hydration cost |
| Fixed feature lists in marketing | Database-driven feature gates | 2024+ | Features tied to actual tier logic, no drift |
| Immediate downgrades with refunds | Scheduled downgrades at period end | 2024 (Stripe update) | Better UX, less churn, simpler accounting |

**Deprecated/outdated:**
- Stripe.js v2: Replaced by Stripe.js v3 (Elements API). v2 had limited customization and no PaymentIntents support.
- Manual proration calculations: Stripe now handles all proration automatically via `proration_behavior` parameter.
- Custom subscription change flows: Customer Portal now supports tier switching natively with portal configuration.

## Open Questions

Things that couldn't be fully resolved:

1. **Should portal allow downgrade at period end or immediately?**
   - What we know: Stripe Dashboard supports both "immediate" and "end of period" downgrade scheduling (added Oct 2024)
   - What's unclear: Product decision needed—immediate downgrade gives instant savings, but period-end is less disruptive
   - Recommendation: Use "end of period" for downgrades, "immediate" for upgrades. This is the pattern used by Zoom, Trello, GitHub per [Stripe docs](https://docs.stripe.com/billing/subscriptions/upgrade-downgrade)

2. **Should pricing page link to /register or /settings/billing for CTA?**
   - What we know: Current pricing page links to `/register` (line 207). Existing users would hit register page again.
   - What's unclear: Should CTA be smart and redirect based on auth state?
   - Recommendation: Keep `/register` for marketing pricing page. Authenticated users use `/settings/billing` for upgrades. Add auth check if needed: `isAuthenticated ? '/settings/billing' : '/register'`

3. **Should feature comparison table show "Coming Soon" for unimplemented features?**
   - What we know: Enhanced and Advanced tier features are placeholders (see config.ts comments). Users can subscribe but features don't exist yet.
   - What's unclear: Ethical question—should we let users pay for features not built?
   - Recommendation: Either (a) mark features as "Coming Soon" with launch dates, or (b) only show/sell Primary tier until others are built. Consult Phase 28+ roadmap.

## Sources

### Primary (HIGH confidence)
- [Stripe Customer Portal Configuration Docs](https://docs.stripe.com/customer-management/configure-portal) - Portal branding and feature setup
- [Stripe Customer Portal API Reference](https://docs.stripe.com/api/customer_portal/sessions/create) - Session creation parameters
- [Stripe Portal Configuration Object](https://docs.stripe.com/api/customer_portal/configurations/object) - Available configuration options
- [Stripe Subscription Upgrade/Downgrade](https://docs.stripe.com/billing/subscriptions/upgrade-downgrade) - Proration and tier switching best practices

### Secondary (MEDIUM confidence)
- [LogRocket Feature Comparison Tables](https://blog.logrocket.com/ux-design/ui-design-comparison-features/) - UX design patterns verified with official sources
- [shadcn-pricing-page GitHub](https://github.com/aymanch-03/shadcn-pricing-page) - Open source example using shadcn/ui (MIT license)
- [SaaS Pricing Page Best Practices 2026](https://www.designstudiouiux.com/blog/saas-pricing-page-design-best-practices/) - Industry patterns cross-referenced with existing app

### Tertiary (LOW confidence)
- [Pricing Plans UX Patterns](https://smart-interface-design-patterns.com/articles/pricing-plans/) - Generic UX guidance, not React-specific
- Various shadcn pricing generators - Marketing tools, but patterns align with official shadcn/ui docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified versions
- Architecture: HIGH - Patterns verified with official Stripe docs and existing codebase
- Pitfalls: HIGH - Derived from Stripe documentation warnings and common support issues
- Feature comparison UI: MEDIUM - Pattern is standard, but mobile-first implementation needs testing
- Portal branding: HIGH - Official Stripe Dashboard feature, well-documented

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (30 days - stable APIs, Stripe changes infrequently)
