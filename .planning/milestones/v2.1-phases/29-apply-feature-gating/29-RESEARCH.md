# Phase 29: Apply Feature Gating - Research

**Researched:** 2026-02-17
**Domain:** React component integration, Next.js API route middleware, feature access control
**Confidence:** HIGH — All research is codebase-based; infrastructure from Phase 26 is fully verified

---

## Summary

Phase 26 built a complete feature gating infrastructure that has never been connected to the actual application. The audit found that `FeatureGate`, `LockedNavItem`, and `requireFeature()` are exported but never imported anywhere in the codebase. All users currently see and can access all features regardless of their subscription tier.

This phase is purely a wiring task: identifying the correct feature constants from `FEATURES` in `src/lib/features/config.ts`, then applying `FeatureGate` to one or more pages/components and `requireFeature()` to one or more API routes. No new infrastructure needs to be built.

The primary risk is choosing the right feature-to-tier mapping. The `FEATURES` constant already defines this correctly: primary-tier features (subscription_tracking, pdf_imports, basic_analytics, email_reminders, categories) are available to all users including trial. Enhanced and advanced tier features (spending_monitoring, budget_management, etc.) are the candidates for gating that would actually show the upgrade modal.

**Primary recommendation:** Gate the `/api/import` route with `requireFeature(FEATURES.PDF_IMPORTS)` (primary tier, enforces active billing) and apply `FeatureGate` wrapping to the Analytics page content with `FEATURES.BASIC_ANALYTICS`. Use `LockedNavItem` around at least one future/enhanced tier navigation item in the sidebar. All primary-tier features succeed for trial users (null tier treated as "primary").

---

## Standard Stack

No new libraries are needed. This phase uses only infrastructure already installed and verified.

### Core (Already Installed)
| Library | Purpose | Location |
|---------|---------|---------|
| `@/lib/features` | Feature config, server actions | `src/lib/features/index.ts` |
| `@/components/features` | FeatureGate, LockedNavItem components | `src/components/features/index.ts` |

### No Installation Required
```bash
# No new packages needed - all infrastructure exists from Phase 26
```

---

## Architecture Patterns

### Recommended Project Structure

No structural changes needed. Existing files will be modified to import and use Phase 26 components.

```
src/
├── app/api/import/route.ts          # Add requireFeature(FEATURES.PDF_IMPORTS)
├── app/(dashboard)/analytics/page.tsx   # Wrap with FeatureGate
└── components/layout/app-sidebar.tsx    # Wrap future nav items with LockedNavItem
```

### Pattern 1: API Route Protection with requireFeature()

**What:** Call `requireFeature(feature)` early in a route handler. If the user lacks access, it throws an `Error` with the message `"This feature requires {tier} tier"`. The caller must catch this and return a 403 response.

**When to use:** Any API route that serves a tiered feature.

**How requireFeature works (from src/lib/features/server.ts):**
```typescript
// Source: src/lib/features/server.ts lines 65-72
export async function requireFeature(feature: Feature): Promise<void> {
  const hasAccess = await hasFeature(feature);
  if (!hasAccess) {
    const requiredTier = getRequiredTier(feature);
    throw new Error(`This feature requires ${requiredTier} tier`);
  }
}
```

**Usage pattern in an API route:**
```typescript
// Source: pattern derived from server.ts — apply at top of route handler
import { requireFeature } from "@/lib/features";
import { FEATURES } from "@/lib/features";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Feature gate: throws if user lacks PDF import access
    await requireFeature(FEATURES.PDF_IMPORTS);

    // ... rest of handler
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("This feature requires")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    // ... existing error handling
  }
}
```

**IMPORTANT:** `requireFeature()` calls `hasFeature()` which calls `auth()` internally. The route already calls `auth()` for its own 401 check. This means auth() is called twice. This is acceptable (session is cached per request by NextAuth) but worth noting for planning.

### Pattern 2: Page/Component Gating with FeatureGate

**What:** Wrap the page content (or specific widgets) with `<FeatureGate feature={FEATURES.XXX}>`. If the user lacks access, they see a locked placeholder with a Lock icon. Clicking opens an upgrade modal with the tier's feature list and CTAs to `/pricing` and `/settings/billing`.

**When to use:** Any client component or page content that represents a tiered feature.

**FeatureGate interface (from src/components/features/feature-gate.tsx lines 21-27):**
```typescript
// Source: src/components/features/feature-gate.tsx
interface FeatureGateProps {
  feature: Feature;           // Required: which feature to check
  children: React.ReactNode;  // Content to show if user has access
  fallback?: React.ReactNode; // Optional: shown while loading and when locked (if showUpgradePrompt=false)
  showUpgradePrompt?: boolean; // Default: true — shows locked placeholder + modal when denied
  featurePreview?: React.ReactNode; // Optional: preview shown inside the upgrade modal
}
```

**Usage pattern on a page:**
```typescript
// Source: pattern derived from feature-gate.tsx
import { FeatureGate } from "@/components/features";
import { FEATURES } from "@/lib/features";

// In a "use client" page or component:
<FeatureGate feature={FEATURES.BASIC_ANALYTICS}>
  {/* The analytics content that only primary+ users see */}
  <AnalyticsContent />
</FeatureGate>
```

**Loading behavior:** While fetching access, FeatureGate renders `fallback ?? null`. If fallback is not provided, nothing renders during the async check. If the page has its own loading state (skeleton), the fallback can be set to match. The loading check is brief (one server action call).

### Pattern 3: Navigation Gating with LockedNavItem

**What:** Wrap a `SidebarMenuItem` content with `<LockedNavItem feature={...}>`. If locked, the item renders with `opacity-50 cursor-not-allowed pointer-events-none` classes. If accessible, renders normally.

**LockedNavItem interface (from src/components/features/feature-gate.tsx lines 150-154):**
```typescript
// Source: src/components/features/feature-gate.tsx
interface LockedNavItemProps {
  feature: Feature;
  children: React.ReactNode;
  className?: string;
}
```

**Loading behavior:** LockedNavItem returns `null` while loading (access === null), causing a brief layout shift. For nav items this is acceptable. The component fetches once per mount.

**Usage pattern in app-sidebar.tsx:**
```typescript
// Source: pattern derived from feature-gate.tsx
import { LockedNavItem } from "@/components/features";
import { FEATURES } from "@/lib/features";

// In the sidebar JSX:
<SidebarMenuItem key="/some-enhanced-feature">
  <LockedNavItem feature={FEATURES.SPENDING_MONITORING}>
    <SidebarMenuButton asChild>
      <Link href="/spending">
        <BarChart className="size-4" />
        <span>Spending Monitor</span>
      </Link>
    </SidebarMenuButton>
  </LockedNavItem>
</SidebarMenuItem>
```

**NOTE:** LockedNavItem disables pointer events, preventing navigation. However, a determined user could still type the URL directly — so API-level enforcement (requireFeature) is the actual security boundary.

### Anti-Patterns to Avoid

- **Gating primary-tier features for trial users:** Trial users (null userTier) are treated as "primary" via `userTier ?? "primary"` in `canTierAccessFeature()`. Never use FeatureGate on subscription_tracking, pdf_imports, basic_analytics, email_reminders, or categories for a use case involving trial users — they should always have access.

- **Using FeatureGate without the "use client" directive:** FeatureGate has `"use client"` at the top of feature-gate.tsx and uses `useRouter`, `useState`, `useEffect`. It cannot be used in a Server Component directly. Wrap in a client component layer if needed.

- **Forgetting the catch pattern in API routes:** `requireFeature()` throws an `Error` (not an HTTP response). The route's try/catch must specifically detect this and return a 403. Uncaught, it would return a 500.

- **Duplicate auth() calls causing confusion:** The route already calls `auth()` for the 401 check. `requireFeature()` calls `auth()` again internally. This is fine (NextAuth caches the session within a request), but the planner should be aware the double call is intentional.

- **Gating enhanced/advanced features that don't exist in the UI yet:** The enhanced/advanced features (SPENDING_MONITORING, INVESTMENT_TRACKING, etc.) are not yet implemented as actual product pages. Applying LockedNavItem to non-existent nav items is not useful. The meaningful gating for this phase should target existing features that match the tier boundaries.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Feature access check | Custom session+tier lookup | `requireFeature()` from `@/lib/features` | Already implements auth, getUserTier, canTierAccessFeature with null-tier handling |
| Upgrade modal | Custom Dialog component | `FeatureGate` component | Already implements Dialog, TIER_CONFIG features list, router navigation to /pricing and /settings/billing |
| Locked nav styling | Custom opacity/pointer CSS | `LockedNavItem` component | Already implements opacity-50 cursor-not-allowed pointer-events-none with correct access state management |
| Tier hierarchy | Custom tier comparison | `TIER_LEVELS` and `canTierAccessFeature()` | Already handles null tier, numeric comparison, all three tiers |

**Key insight:** Phase 26 deliberately separated infrastructure from application. Phase 29 is the wiring step — resist the temptation to add new infrastructure or modify Phase 26 files. The only changes are imports and wrapping in consumer files.

---

## Common Pitfalls

### Pitfall 1: Applying FeatureGate to Primary-Tier Features
**What goes wrong:** A primary feature like PDF imports gets wrapped with FeatureGate. Trial users have null tier, which is treated as "primary". So they would see the content — but if the intent was to block expired-trial users, that's handled by `isUserActive()` in the route handler, not by FeatureGate. Confusing the two systems leads to incorrect access logic.
**Why it happens:** Conflating "trial" (time-limited) with "tier" (feature-limited). Trial users are "primary" tier users. Expired-trial users are blocked by `isUserActive()` at the route level.
**How to avoid:** Use FeatureGate only on enhanced or advanced tier features. Use `isUserActive()` for trial expiry gates.

### Pitfall 2: Forgetting 403 Handling Pattern in API Routes
**What goes wrong:** `requireFeature()` throws an Error. If the route's catch block doesn't detect the feature error specifically, it falls through to a generic 500 handler. The client receives "An error occurred" instead of a meaningful 403.
**Why it happens:** `requireFeature()` throws a plain Error, not a custom error class or HTTP exception.
**How to avoid:** Add a specific catch check: `if (error instanceof Error && error.message.startsWith("This feature requires")) { return NextResponse.json({ error: error.message }, { status: 403 }); }` — place this BEFORE the generic catch handler.
**Warning signs:** Client receives 500 when accessing a locked feature via the API.

### Pitfall 3: LockedNavItem Causes Layout Shift on Load
**What goes wrong:** LockedNavItem returns `null` while fetching access (access === null). Navigation items briefly disappear then reappear, causing a flash.
**Why it happens:** The component fetches access asynchronously via getUserFeatureAccess server action in useEffect.
**How to avoid:** Accept this as a known limitation of the current LockedNavItem implementation (from Phase 26). For this phase, the behavior is acceptable — do not change the LockedNavItem implementation, just apply it. If it needs to be improved, that is a future phase concern.
**Warning signs:** Nav items briefly disappear on page load.

### Pitfall 4: Wrapping Server Components with FeatureGate
**What goes wrong:** FeatureGate is a client component (`"use client"`). If used in a Server Component (no `"use client"` directive), Next.js will error because FeatureGate uses hooks (useRouter, useState, useEffect).
**Why it happens:** The analytics page is already `"use client"`, so this is not a risk there. But future server-rendered pages would need a client wrapper.
**How to avoid:** The analytics page (`src/app/(dashboard)/analytics/page.tsx`) already has `"use client"` — FeatureGate can be used directly. Check for `"use client"` before applying.

### Pitfall 5: requireFeature Called Before Auth Check
**What goes wrong:** If `requireFeature()` is called before `auth()` in a route, it calls `auth()` internally and returns `false` for unauthenticated users (not an error, just false → throws feature error). This means an unauthenticated user would receive "This feature requires primary tier" instead of 401 Unauthorized.
**Why it happens:** `hasFeature()` returns false (not throws) for unauthenticated users. `requireFeature()` then throws the tier error.
**How to avoid:** Always keep the existing `auth()` 401 check FIRST in the route handler, then call `requireFeature()` after confirming the session exists. The current pattern in import/route.ts already does this correctly.

---

## Code Examples

Verified patterns from reading the actual Phase 26 source files:

### Applying requireFeature in /api/import/route.ts
```typescript
// Source: derived from src/lib/features/server.ts + src/app/api/import/route.ts
import { requireFeature } from "@/lib/features";
import { FEATURES } from "@/lib/features";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Feature gate: PDF imports require primary tier (blocks expired trial users via hasFeature)
    await requireFeature(FEATURES.PDF_IMPORTS);

    // ... existing isUserActive check and handler logic unchanged ...
  } catch (error) {
    // Feature access denied (requireFeature throws Error)
    if (error instanceof Error && error.message.startsWith("This feature requires")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    // ... existing error handling ...
  }
}
```

### Applying FeatureGate to Analytics Page Content
```typescript
// Source: derived from src/components/features/feature-gate.tsx interface
// File: src/app/(dashboard)/analytics/page.tsx
"use client";
import { FeatureGate } from "@/components/features";
import { FEATURES } from "@/lib/features";

export default function AnalyticsPage() {
  // ... existing state and hooks ...
  return (
    <>
      <DashboardHeader ... />
      <FeatureGate feature={FEATURES.BASIC_ANALYTICS}>
        <main className="flex-1 space-y-6 p-6">
          {/* ... existing analytics content ... */}
        </main>
      </FeatureGate>
    </>
  );
}
```

### Applying LockedNavItem in app-sidebar.tsx
```typescript
// Source: derived from src/components/features/feature-gate.tsx LockedNavItem
// File: src/components/layout/app-sidebar.tsx
"use client";
import { LockedNavItem } from "@/components/features";
import { FEATURES } from "@/lib/features";

// In the JSX where mainNavItems are rendered:
// For a future enhanced-tier item (e.g., Spending Monitor placeholder):
<SidebarMenuItem>
  <LockedNavItem feature={FEATURES.SPENDING_MONITORING}>
    <SidebarMenuButton asChild>
      <Link href="/spending">
        <BarChart3 className="size-4" />
        <span>Spending Monitor</span>
      </Link>
    </SidebarMenuButton>
  </LockedNavItem>
</SidebarMenuItem>
```

---

## Feature-to-Route Mapping (Key Decision for Planning)

Based on the FEATURES constant in `src/lib/features/config.ts` and the actual pages/routes in the codebase:

| FEATURES constant | Tier | Existing Route/Page | Recommended Gating |
|---|---|---|---|
| `PDF_IMPORTS` | primary | `POST /api/import/route.ts` | requireFeature() — best candidate, clear boundary |
| `BASIC_ANALYTICS` | primary | `GET /analytics/page.tsx` | FeatureGate wrapper — visible upgrade prompt |
| `EMAIL_REMINDERS` | primary | `GET/PUT /api/reminders/route.ts` | requireFeature() — meaningful API protection |
| `SUBSCRIPTION_TRACKING` | primary | `/api/subscriptions/route.ts` | NOT recommended — core feature, too broad |
| `SPENDING_MONITORING` | enhanced | No page exists yet | LockedNavItem in sidebar for a placeholder nav item |
| `BUDGET_MANAGEMENT` | enhanced | No page exists yet | LockedNavItem (if adding placeholder nav items) |

**Recommendation for minimum viable gating (satisfies all 5 success criteria):**

1. **`requireFeature(FEATURES.PDF_IMPORTS)`** in `src/app/api/import/route.ts` — satisfies criteria 2 (API route enforces tier)
2. **`<FeatureGate feature={FEATURES.BASIC_ANALYTICS}>`** wrapping the analytics page main content — satisfies criteria 1 (feature/page wrapped) and criteria 3 (upgrade modal shown)
3. **`<LockedNavItem feature={FEATURES.SPENDING_MONITORING}>`** for a new "Spending Monitor" placeholder nav item in app-sidebar.tsx — satisfies criteria 4 (LockedNavItem used)
4. Criteria 5 (trial users access primary tier) is automatically satisfied by the `userTier ?? "primary"` logic in canTierAccessFeature — no code change needed, just verification.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `isUserActive()` for all access control | `requireFeature()` for tier-based access, `isUserActive()` for trial expiry | Both coexist — different concerns |
| No client-side gating | `FeatureGate` component with upgrade modal | Phase 26 built this, Phase 29 applies it |
| All nav items visible to all users | `LockedNavItem` for tier-restricted nav items | Phase 26 built this, Phase 29 applies it |

**Not deprecated:** The existing `isUserActive()` check in `/api/import/route.ts` should be KEPT alongside `requireFeature()`. They serve different purposes: `isUserActive` blocks expired-trial users; `requireFeature` blocks wrong-tier users. Both checks have value.

---

## Open Questions

1. **Should requireFeature be applied to the reminders API as well?**
   - What we know: Email reminders is a primary-tier feature. Trial users have primary access. The reminders API currently has no tier check.
   - What's unclear: Whether gating a primary-tier API route adds value (trial users pass anyway).
   - Recommendation: Apply to at least one primary-tier API route to satisfy the criterion, but be aware it won't actually block any current users. The /api/import route is the better choice since it has more obvious tier implications.

2. **Where to add the LockedNavItem — existing nav or new placeholder?**
   - What we know: No enhanced/advanced tier pages exist yet. Current nav items are all primary-tier.
   - What's unclear: Whether to add a new "Coming Soon" nav item or wrap an existing one.
   - Recommendation: Add a new locked nav item for "Spending Monitor" (enhanced tier placeholder) to the sidebar. This is clean and demonstrates the locked state without disrupting existing navigation.

3. **Should the FeatureGate fallback be a skeleton/loading state?**
   - What we know: FeatureGate renders `fallback ?? null` while loading. The analytics page already has its own skeleton loading state via `isLoading` from `useSubscriptions`.
   - Recommendation: Pass the existing loading skeleton as the `fallback` prop to FeatureGate to avoid a blank flash before the access check completes.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/features/config.ts` — FEATURES constant, FEATURE_TIERS, canTierAccessFeature implementation (read directly)
- `src/lib/features/server.ts` — hasFeature, requireFeature, getUserFeatureAccess implementation (read directly)
- `src/components/features/feature-gate.tsx` — FeatureGate and LockedNavItem component implementation (read directly)
- `src/components/layout/app-sidebar.tsx` — Current nav structure, no FeatureGate usage confirmed (read directly)
- `src/app/api/import/route.ts` — Current import route, isUserActive check pattern (read directly)
- `src/app/(dashboard)/analytics/page.tsx` — Current analytics page, "use client" confirmed (read directly)
- `.planning/phases/26-feature-gating/26-VERIFICATION.md` — Phase 26 verification confirming all infrastructure is complete (read directly)
- `.planning/v2.1-MILESTONE-AUDIT.md` — Gap audit confirming FeatureGate/requireFeature never imported (read directly)
- Grep search for `FeatureGate|LockedNavItem|requireFeature` across all .ts/.tsx files — confirmed zero consumer imports (verified directly)

### Secondary (MEDIUM confidence)
- None required — all research is codebase-internal

### Tertiary (LOW confidence)
- None required

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — uses only Phase 26 infrastructure, no new libraries
- Architecture: HIGH — exact component interfaces read from source; patterns derived from actual implementations
- Pitfalls: HIGH — derived from reading actual implementation details (auth() behavior, null return, error throwing pattern)

**Research date:** 2026-02-17
**Valid until:** Until Phase 26 files are modified (stable)
