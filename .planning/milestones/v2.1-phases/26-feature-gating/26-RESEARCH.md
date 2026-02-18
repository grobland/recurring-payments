# Phase 26: Feature Gating Infrastructure - Research

**Researched:** 2026-02-12
**Domain:** Feature gating, tier-based access control, subscription permissions
**Confidence:** HIGH

## Summary

Feature gating infrastructure for a subscription-based SaaS requires both server-side authorization checks and client-side UI components to control feature access by tier. The standard approach uses TypeScript configuration files for feature-to-tier mappings (not database storage, which adds latency and complexity), server-side utilities for permission checking (`hasFeature()`, `requireFeature()`), and React client components for upgrade prompts.

The codebase already has strong foundations in place: NextAuth.js v5 for session management, server actions pattern with `"use server"` directives, client components with `"use client"` directives, existing tier system (`primary`, `enhanced`, `advanced`), and trial/billing status tracking in the users table. The phase builds on these patterns to add feature-specific gating.

**Primary recommendation:** Use TypeScript configuration file for feature-to-tier mapping (single source of truth, fast lookups, type-safe), implement server-side utilities as server actions in `src/lib/features/` directory, create client-side `<FeatureGate>` wrapper component using Radix UI Dialog for upgrade prompts, and extend existing `useUserStatus()` hook for tier checking.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 (App Router) | Framework with RSC support | Already in use, provides server/client split needed for auth checks |
| NextAuth.js | v5 | Session management | Already configured, provides user context with billing status |
| TypeScript | 5.x | Type-safe config | Ensures feature flags are type-checked, autocomplete for feature names |
| Radix UI Dialog | Latest | Modal component | Already used via shadcn/ui, accessible upgrade prompts |
| Drizzle ORM | Latest | Database queries | Already configured for user tier lookups |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | Latest | Runtime validation | Already in use, validate feature access requests |
| TanStack Query | Latest | Client state management | Already in use for `useUserStatus()` hook |
| next/navigation | 16 | Routing for upgrade flow | Navigate to /settings/billing from prompts |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TypeScript config file | Database storage | Database adds query latency, complexity, and harder deployment (requires migration). Only beneficial if non-technical users need to change feature gates (not the case here) |
| Server Actions | API Routes | Server actions are more concise for server-side checks, but API route middleware pattern also works. Stick with server actions for consistency with existing `tiers.ts` |
| Custom dialog | Headless UI or react-modal | Radix UI already integrated via shadcn/ui, provides better accessibility |

**Installation:**
```bash
# No new dependencies needed - all already installed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── features/
│   │   ├── config.ts           # Feature-to-tier mapping (TypeScript constant)
│   │   ├── server.ts           # Server-side utilities (hasFeature, requireFeature)
│   │   └── index.ts            # Re-exports for convenience
│   ├── stripe/
│   │   ├── products.ts         # Existing TIER_CONFIG
│   │   └── tiers.ts            # Existing getUserTier() server action
│   └── hooks/
│       └── use-user.ts         # Extend useUserStatus() with tier info
├── components/
│   └── features/
│       └── feature-gate.tsx    # Client component for conditional rendering
└── app/
    └── api/                    # API routes use requireFeature() middleware
```

### Pattern 1: Feature Configuration (TypeScript Constant)

**What:** Define feature-to-tier mappings as a typed constant
**When to use:** Always for SaaS feature gates (fast, type-safe, version controlled)
**Example:**

```typescript
// src/lib/features/config.ts
import type { Tier } from "@/lib/db/schema";

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

export type Feature = typeof FEATURES[keyof typeof FEATURES];

// Feature-to-tier mapping
export const FEATURE_TIERS: Record<Feature, Tier> = {
  // Primary
  [FEATURES.SUBSCRIPTION_TRACKING]: "primary",
  [FEATURES.PDF_IMPORTS]: "primary",
  [FEATURES.BASIC_ANALYTICS]: "primary",
  [FEATURES.EMAIL_REMINDERS]: "primary",
  [FEATURES.CATEGORIES]: "primary",

  // Enhanced
  [FEATURES.SPENDING_MONITORING]: "enhanced",
  [FEATURES.BUDGET_MANAGEMENT]: "enhanced",
  [FEATURES.DEBT_TRACKING]: "enhanced",
  [FEATURES.TRANSACTION_CATEGORIZATION]: "enhanced",

  // Advanced
  [FEATURES.INVESTMENT_TRACKING]: "advanced",
  [FEATURES.NET_WORTH_DASHBOARD]: "advanced",
  [FEATURES.MULTI_ACCOUNT_AGGREGATION]: "advanced",
  [FEATURES.GOAL_PLANNING]: "advanced",
};

// Tier hierarchy for upgrade logic
const TIER_LEVELS: Record<Tier, number> = {
  primary: 1,
  enhanced: 2,
  advanced: 3,
};

export function getRequiredTier(feature: Feature): Tier {
  return FEATURE_TIERS[feature];
}

export function canTierAccessFeature(userTier: Tier | null, feature: Feature): boolean {
  // Trial users get primary tier access
  const effectiveTier = userTier ?? "primary";
  const requiredLevel = TIER_LEVELS[FEATURE_TIERS[feature]];
  const userLevel = TIER_LEVELS[effectiveTier];
  return userLevel >= requiredLevel;
}
```

**Sources:**
- [TypeScript Best Practices for Large-Scale Applications](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/)
- [Feature Flag Storage: Config Files vs Database](https://www.abtasty.com/blog/feature-flag-storage/)

### Pattern 2: Server-Side Permission Checking (Server Actions)

**What:** Server actions that verify user has access to a feature
**When to use:** Before any data mutation or sensitive query
**Example:**

```typescript
// src/lib/features/server.ts
"use server";

import { auth } from "@/lib/auth";
import { getUserTier } from "@/lib/stripe/tiers";
import { canTierAccessFeature, getRequiredTier, type Feature } from "./config";
import type { Tier } from "@/lib/db/schema";

/**
 * Check if current user has access to a feature
 * Returns false for unauthenticated users
 */
export async function hasFeature(feature: Feature): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  // Get user's subscription tier
  const userTier = await getUserTier(session.user.id);

  // Check access (trial users get primary tier)
  return canTierAccessFeature(userTier, feature);
}

/**
 * Get user's current tier and feature access info
 * Used by client components via server actions
 */
export async function getUserFeatureAccess(feature: Feature): Promise<{
  hasAccess: boolean;
  userTier: Tier | null;
  requiredTier: Tier;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      hasAccess: false,
      userTier: null,
      requiredTier: getRequiredTier(feature),
    };
  }

  const userTier = await getUserTier(session.user.id);
  const requiredTier = getRequiredTier(feature);
  const hasAccess = canTierAccessFeature(userTier, feature);

  return { hasAccess, userTier, requiredTier };
}

/**
 * Middleware-style function for API routes
 * Throws error if user lacks access
 */
export async function requireFeature(feature: Feature): Promise<void> {
  const hasAccess = await hasFeature(feature);
  if (!hasAccess) {
    const requiredTier = getRequiredTier(feature);
    throw new Error(`This feature requires ${requiredTier} tier`);
  }
}
```

**Pattern follows:** Existing `getUserTier()` and `hasFeature()` pattern in `src/lib/stripe/tiers.ts`

**Sources:**
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication)
- [Auth.js Server-Side Protection](https://authjs.dev/getting-started/session-management/protecting)

### Pattern 3: Client-Side Feature Gate Component

**What:** React component that conditionally renders content or upgrade prompt
**When to use:** Wrap UI sections that should be gated by tier
**Example:**

```typescript
// src/components/features/feature-gate.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getUserFeatureAccess, type Feature } from "@/lib/features";
import { TIER_CONFIG } from "@/lib/stripe/products";
import type { Tier } from "@/lib/db/schema";

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  featurePreview?: React.ReactNode; // Screenshot or description
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  featurePreview,
}: FeatureGateProps) {
  const router = useRouter();
  const [access, setAccess] = useState<{
    hasAccess: boolean;
    userTier: Tier | null;
    requiredTier: Tier;
  } | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    getUserFeatureAccess(feature).then(setAccess);
  }, [feature]);

  if (!access) {
    // Loading state
    return fallback ?? null;
  }

  if (access.hasAccess) {
    return <>{children}</>;
  }

  // User lacks access
  if (!showUpgradePrompt) {
    return fallback ?? null;
  }

  // Show upgrade prompt
  const requiredTierConfig = TIER_CONFIG[access.requiredTier];

  return (
    <>
      {fallback ?? (
        <button
          onClick={() => setShowDialog(true)}
          className="relative w-full cursor-pointer rounded-lg border border-dashed border-gray-300 p-6 text-center hover:border-gray-400"
        >
          <Lock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Upgrade to unlock this feature
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Available on {requiredTierConfig.name} tier
          </p>
        </button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upgrade to {requiredTierConfig.name}
            </DialogTitle>
            <DialogDescription>
              This feature requires the {requiredTierConfig.name} tier
            </DialogDescription>
          </DialogHeader>

          {featurePreview && (
            <div className="my-4 rounded-lg border p-4 bg-muted">
              {featurePreview}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">What you'll get:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {requiredTierConfig.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/pricing")}
            >
              Compare all tiers
            </Button>
            <Button onClick={() => router.push("/settings/billing")}>
              Upgrade now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Convenience wrapper for locked navigation items
export function LockedNavItem({
  feature,
  children,
  className,
}: {
  feature: Feature;
  children: React.ReactNode;
  className?: string;
}) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    getUserFeatureAccess(feature).then((access) => setHasAccess(access.hasAccess));
  }, [feature]);

  if (hasAccess === null) return null; // Loading

  return (
    <div className={hasAccess ? className : `${className} opacity-50 cursor-not-allowed`}>
      {children}
    </div>
  );
}
```

**Pattern follows:** Existing dialog usage in `src/components/categories/category-delete-dialog.tsx` and `src/components/ui/dialog.tsx`

**Sources:**
- [React Feature Gate Components](https://github.com/waffleau/react-feature-gate)
- [React Conditional Rendering](https://react.dev/learn/conditional-rendering)

### Pattern 4: API Route Protection with requireFeature

**What:** Middleware-style check in API route handlers
**When to use:** Protect API endpoints that provide tier-gated functionality
**Example:**

```typescript
// Example: src/app/api/analytics/advanced/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireFeature, FEATURES } from "@/lib/features";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    await requireFeature(FEATURES.NET_WORTH_DASHBOARD);

    // If we get here, user has access
    // ... fetch and return data

    return NextResponse.json({ data: [] });
  } catch (error) {
    if (error instanceof Error && error.message.includes("requires")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 } // Forbidden
      );
    }
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
```

**Pattern follows:** Existing auth checks in `src/app/api/subscriptions/route.ts` (lines 15-18, 110-121)

**Sources:**
- [Next.js API Routes Authentication](https://nextjs.org/docs/pages/building-your-application/authentication)
- [Next.js Security Hardening 2026](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e)

### Anti-Patterns to Avoid

- **Client-only checks:** Never rely solely on client-side feature gates for security. Always enforce on server.
- **Hardcoded tier names:** Don't use string literals like `"enhanced"` - use typed constants from `config.ts`
- **Database-stored feature flags:** Adds latency and deployment complexity without benefits for this use case
- **Middleware.ts feature checks:** Next.js 16 renamed middleware to proxy.ts and it's for routing, not feature gates
- **JWT-only authorization:** Always verify with database - JWTs can be stale after tier changes

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom dialog implementation | Radix UI Dialog (via shadcn/ui) | Already integrated, accessible, keyboard navigation, focus management |
| Feature flag evaluation | Complex boolean logic | Tier hierarchy comparison | Simple numeric comparison prevents bugs |
| User tier lookup | Custom caching layer | Existing `getUserTier()` server action | Already optimized with Drizzle ORM |
| Session management | Custom JWT validation | NextAuth.js `auth()` helper | Already configured, handles token refresh |
| Type-safe feature names | Enums or magic strings | `as const` TypeScript pattern | Better autocomplete, compile-time checks |

**Key insight:** Feature gating looks simple but has edge cases (trial users, tier changes during session, grandfathered pricing). Use battle-tested patterns from Auth.js and React Server Components rather than custom logic.

## Common Pitfalls

### Pitfall 1: Client-Only Feature Checks

**What goes wrong:** Implementing feature gates only in React components without server-side enforcement
**Why it happens:** Developers assume UI hiding is sufficient protection
**How to avoid:** Always use `requireFeature()` in API routes and server actions, even if client has `<FeatureGate>`
**Warning signs:** API routes without tier checks, data mutations without permission validation

### Pitfall 2: Stale Session Data After Tier Change

**What goes wrong:** User upgrades subscription but still sees locked features until re-login
**Why it happens:** JWT tokens in NextAuth don't auto-update after external changes (Stripe webhooks)
**How to avoid:** Call `update()` from `next-auth/react` after webhook updates user tier, or use database lookups for tier (not session)
**Warning signs:** Users reporting "I upgraded but still locked out"

**Solution:**
```typescript
// In Stripe webhook handler (src/app/api/webhooks/stripe/route.ts)
// After updating user's stripePriceId in database:
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth/config";

const session = await getServerSession(authConfig);
if (session) {
  // Session update will trigger on next request
  // Alternatively, use database lookups in hasFeature() instead of session
}
```

### Pitfall 3: Trial User Edge Cases

**What goes wrong:** Trial users see "upgrade to primary" prompts when they already have primary tier access
**Why it happens:** Not treating trial users as primary tier in feature checks
**How to avoid:** Use `userTier ?? "primary"` pattern - null tier means trial, which gets primary access
**Warning signs:** Trial users can't access basic features, confusing upgrade prompts

### Pitfall 4: Feature Name Typos

**What goes wrong:** Silent failures when checking `"advanced_analytics"` vs `"ADVANCED_ANALYTICS"`
**Why it happens:** String literals without type checking
**How to avoid:** Use `const FEATURES = {...} as const` and `type Feature = typeof FEATURES[keyof typeof FEATURES]`
**Warning signs:** TypeScript doesn't autocomplete feature names, no compile errors on typos

### Pitfall 5: Missing Upgrade CTA in Locked State

**What goes wrong:** Users see grayed-out features but no way to upgrade
**Why it happens:** Implementing locked state without upgrade prompt
**How to avoid:** Always provide `showUpgradePrompt` in `<FeatureGate>` or render explicit upgrade CTA
**Warning signs:** Low conversion rates, support tickets asking "how do I unlock this?"

## Code Examples

Verified patterns from official sources:

### Server Action for Feature Check
```typescript
// Source: Auth.js + Next.js App Router patterns
"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireEnhancedTier() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check tier (implementation from Pattern 2)
  const hasAccess = await hasFeature(FEATURES.SPENDING_MONITORING);
  if (!hasAccess) {
    redirect("/settings/billing?upgrade=enhanced");
  }
}
```

### Trial Days Indicator (Sidebar)
```typescript
// Source: Existing implementation in src/components/layout/app-sidebar.tsx (lines 198-220)
// Already implemented - shows trial badge and days remaining
// Pattern: Conditional render based on useUserStatus() hook

{isTrialActive && (
  <SidebarGroup>
    <SidebarGroupContent>
      <div className="rounded-lg border bg-muted/50 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Badge variant="secondary" className="text-xs">Trial</Badge>
          <span>{daysLeftInTrial} days left</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Upgrade to keep access to all features
        </p>
        <Link href="/settings/billing" className="...">
          Upgrade now
        </Link>
      </div>
    </SidebarGroupContent>
  </SidebarGroup>
)}
```

### Protected Page Component
```typescript
// Source: Next.js App Router + React Server Components
import { requireFeature, FEATURES } from "@/lib/features";
import { FeatureGate } from "@/components/features/feature-gate";

export default async function NetWorthPage() {
  // Server-side check (redirects if no access)
  await requireFeature(FEATURES.NET_WORTH_DASHBOARD);

  return (
    <div>
      <h1>Net Worth Dashboard</h1>
      {/* Page content only renders if check passes */}
    </div>
  );
}
```

### Locked Widget Placeholder
```typescript
// Source: Context decision - dashboard widgets for locked features
import { FeatureGate } from "@/components/features/feature-gate";
import { FEATURES } from "@/lib/features";

export function NetWorthWidget() {
  return (
    <FeatureGate
      feature={FEATURES.NET_WORTH_DASHBOARD}
      fallback={
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Lock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Net Worth Dashboard</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Track your total assets and liabilities
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.push("/settings/billing?feature=net-worth")}
            >
              Upgrade to unlock
            </Button>
          </CardContent>
        </Card>
      }
    >
      {/* Actual widget content */}
      <NetWorthChart />
    </FeatureGate>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Database-stored feature flags | TypeScript config constants | 2023-2024 | Faster lookups, type safety, easier testing |
| Express.js middleware for auth | React Server Components + Server Actions | Next.js 13+ (2023) | Collocated security checks with UI, better DX |
| Client-side role checks | Server-side tier verification | Always required | Prevents bypass attacks |
| Custom modal libraries | Radix UI primitives | 2022+ | Accessibility built-in, less code to maintain |
| middleware.ts for feature gates | proxy.ts for routing only | Next.js 16 (2026) | Clarifies middleware purpose, feature checks in server actions |

**Deprecated/outdated:**
- **middleware.ts:** Renamed to proxy.ts in Next.js 16, should not be used for feature authorization
- **next-auth/client:** Use `next-auth/react` instead (Next.js App Router)
- **getServerSideProps:** Use React Server Components for data fetching
- **Feature flag libraries (LaunchDarkly, Unleash):** Overkill for subscription tiers - use simple config file

## Open Questions

1. **Should feature checks cache tier lookups?**
   - What we know: `getUserTier()` queries database on each call
   - What's unclear: Performance impact at scale, cache invalidation complexity
   - Recommendation: Start without caching, measure performance. If needed, use React Cache or TanStack Query with 5-minute staleTime

2. **How to handle feature preview screenshots in upgrade prompts?**
   - What we know: Context decision specifies "modal includes preview/screenshot"
   - What's unclear: Static images vs live-but-disabled components vs Figma embeds
   - Recommendation: Use static images in public/ folder for phase 26, evaluate live previews in future phase if conversion rates are low

3. **Should trial users see locked Enhanced/Advanced features?**
   - What we know: Context says "show Enhanced/Advanced features as locked with upgrade prompts during trial"
   - What's unclear: Does this mean dashboard shows locked widgets, or just navigation items are visible but disabled?
   - Recommendation: Show locked navigation items (grayed out) and locked dashboard widgets (placeholder cards) to drive trial-to-paid conversion

## Sources

### Primary (HIGH confidence)

- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) - Official patterns for auth checks
- [Auth.js Server-Side Protection](https://authjs.dev/getting-started/session-management/protecting) - Session management best practices
- [React Server Components](https://react.dev/reference/rsc/server-components) - Official RSC documentation
- [TypeScript Configuration Best Practices](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/) - Enterprise TypeScript patterns
- Existing codebase patterns (`src/lib/stripe/tiers.ts`, `src/components/layout/app-sidebar.tsx`) - HIGH confidence via direct code analysis

### Secondary (MEDIUM confidence)

- [Feature Flag Storage: Config Files vs Database](https://www.abtasty.com/blog/feature-flag-storage/) - Tradeoffs between storage methods
- [Next.js Security Hardening 2026](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e) - Security best practices
- [React Feature Gating Patterns](https://www.patterns.dev/react/react-2026/) - Modern React patterns
- [Building RBAC in Next.js](https://www.permit.io/blog/how-to-add-rbac-in-nextjs) - Role-based access control patterns

### Tertiary (LOW confidence)

- [Feature Flags vs Authorization](https://ntietz.com/blog/feature-flags-and-authorization/) - Conceptual overlap discussion
- [Feature Flag Best Practices](https://www.cloudbees.com/blog/feature-flag-best-practices) - General guidance (not Next.js specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, patterns verified in codebase
- Architecture: HIGH - Follows existing Next.js App Router + NextAuth patterns, validated against official docs
- Pitfalls: MEDIUM - Based on common patterns + search results, not all tested in this specific stack

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable patterns, TypeScript/Next.js/React don't change frequently)
