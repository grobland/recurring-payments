# Phase 11: Loading & Empty States - Research

**Researched:** 2026-02-04
**Domain:** UI loading patterns, skeleton loaders, empty state design
**Confidence:** HIGH

## Summary

This research covers implementing loading and empty states for the subscription manager application. The codebase already has foundational patterns in place: shadcn/ui's Skeleton component is installed and in use, TanStack Query v5 provides loading state flags, and tw-animate-css is available for animations. The existing implementation already uses inline skeleton rendering (conditional rendering based on `isLoading`), though some areas need refinement to match CONTEXT.md decisions.

The primary work involves: (1) adding delayed skeleton display to avoid flash on fast loads, (2) implementing minimum skeleton display time, (3) adding content fade-in transitions, (4) enhancing the import page's processing state with status text, and (5) polishing empty states with Lucide icons and friendly CTAs.

**Primary recommendation:** Extend existing skeleton patterns with a custom `useDelayedLoading` hook to manage timing requirements (200ms delay before showing, 300ms minimum display), and create reusable empty state components with consistent icon + message + CTA structure.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Skeleton | built-in | Base skeleton component | Already in use, matches design system |
| TanStack Query | 5.90.19 | Loading state management | Already provides isLoading, isFetching, isPending |
| tw-animate-css | 1.4.0 | CSS animations | Already imported, provides fade-in, duration, delay |
| lucide-react | 0.562.0 | Icons for empty states | Already in use throughout app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sonner | 2.0.7 | Toast notifications | Already used for mutations - continue pattern |
| date-fns | 4.1.0 | Date formatting | Already in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom skeleton | react-loading-skeleton | Would add dependency, shadcn already sufficient |
| Manual animation | framer-motion | Overkill, tw-animate-css already installed |
| Spinner only | Skeleton loader | Skeleton provides better perceived performance |

**Installation:**
No additional packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── shared/
│   │   └── empty-state.tsx         # Reusable empty state component
│   ├── skeletons/                  # Component-specific skeletons (new)
│   │   ├── dashboard-skeleton.tsx
│   │   ├── subscription-table-skeleton.tsx
│   │   └── import-history-skeleton.tsx
│   └── ui/
│       └── skeleton.tsx            # Base skeleton (exists)
├── lib/
│   └── hooks/
│       └── use-delayed-loading.ts  # New hook for timing logic
```

### Pattern 1: Delayed Loading Hook
**What:** Custom hook that manages delayed skeleton display and minimum display time
**When to use:** Any data fetching that shows skeletons
**Example:**
```typescript
// Source: CONTEXT.md timing decisions + TanStack Query patterns
import { useState, useEffect, useRef } from "react";

interface UseDelayedLoadingOptions {
  delayMs?: number;      // Time before showing skeleton (default: 200)
  minDisplayMs?: number; // Minimum time to show skeleton (default: 300)
}

export function useDelayedLoading(
  isLoading: boolean,
  options: UseDelayedLoadingOptions = {}
) {
  const { delayMs = 200, minDisplayMs = 300 } = options;
  const [showSkeleton, setShowSkeleton] = useState(false);
  const loadingStartRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start loading - set up delay before showing skeleton
      loadingStartRef.current = Date.now();
      delayTimeoutRef.current = setTimeout(() => {
        setShowSkeleton(true);
      }, delayMs);
    } else {
      // Loading finished - clear delay timeout if skeleton not shown yet
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }

      // If skeleton was shown, ensure minimum display time
      if (showSkeleton && loadingStartRef.current) {
        const elapsed = Date.now() - loadingStartRef.current;
        const remaining = Math.max(0, minDisplayMs - elapsed + delayMs);

        if (remaining > 0) {
          setTimeout(() => setShowSkeleton(false), remaining);
        } else {
          setShowSkeleton(false);
        }
      }
      loadingStartRef.current = null;
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [isLoading, delayMs, minDisplayMs, showSkeleton]);

  return showSkeleton;
}
```

### Pattern 2: Empty State Component
**What:** Reusable component with icon, title, description, and CTA(s)
**When to use:** Any list/page with no content
**Example:**
```typescript
// Source: Empty state UX best practices + CONTEXT.md decisions
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex gap-3">
          {primaryAction && (
            <Button asChild>
              <Link href={primaryAction.href}>
                {primaryAction.icon && (
                  <primaryAction.icon className="mr-2 h-4 w-4" />
                )}
                {primaryAction.label}
              </Link>
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" asChild>
              <Link href={secondaryAction.href}>
                {secondaryAction.label}
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

### Pattern 3: Skeleton with Fade Transition
**What:** Skeleton that fades out and content that fades in
**When to use:** When replacing skeleton with actual content
**Example:**
```typescript
// Source: tw-animate-css documentation + CONTEXT.md timing
// Skeleton container - fades out when loading complete
<div className={showSkeleton ? "animate-in fade-in" : "animate-out fade-out duration-150"}>
  {/* skeleton content */}
</div>

// Content container - fades in when data ready
<div className="animate-in fade-in duration-150">
  {/* actual content */}
</div>
```

### Pattern 4: PDF Processing Status States
**What:** Multi-stage status text during long operations
**When to use:** PDF import processing
**Example:**
```typescript
// Source: CONTEXT.md loading feedback decisions
type ProcessingStatus = "uploading" | "analyzing" | "extracting";

const statusMessages: Record<ProcessingStatus, string> = {
  uploading: "Uploading...",
  analyzing: "Analyzing document...",
  extracting: "Extracting subscriptions...",
};

// In processing UI:
<Loader2 className="h-12 w-12 animate-spin text-primary" />
<p className="mt-4 text-lg font-medium">
  {statusMessages[status]}
</p>
<Button variant="outline" onClick={handleCancel}>
  Cancel
</Button>
```

### Anti-Patterns to Avoid
- **Skeleton for page headers:** Headers render immediately, only content areas need skeletons
- **Layout shift on load:** Skeleton dimensions must exactly match content dimensions
- **Brief flash:** Never show skeleton for < 300ms - looks glitchy
- **Staggered animations:** All items appear together, no cascading delay
- **Global loading indicators:** Skeletons are sufficient, avoid redundant spinners
- **Blocking UI for refetch:** Use subtle "Refreshing..." text for background updates

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton animation | Custom CSS keyframes | `animate-pulse` class | Built into Tailwind, consistent |
| Loading state tracking | Manual useState | TanStack Query flags | Already handles caching, refetch states |
| Fade animations | Manual CSS transitions | tw-animate-css classes | Already installed, tree-shakes unused |
| Icon rendering | Custom SVGs | Lucide React components | Consistent weight, tree-shakeable |
| Toast notifications | Alert components | Sonner (via shadcn) | Already integrated, handles stacking |

**Key insight:** The existing stack already provides all primitives. The work is composition and timing logic, not new UI components.

## Common Pitfalls

### Pitfall 1: isLoading vs isPending vs isFetching Confusion
**What goes wrong:** Using wrong flag causes incorrect loading states
**Why it happens:** TanStack Query v5 renamed flags from v4
**How to avoid:**
- `isPending`: True when no cached data exists (initial load)
- `isFetching`: True when any fetch is in progress (including refetch)
- `isLoading`: Combination - pending AND fetching (first load only)
**Warning signs:** Skeleton shows on every refetch, or never shows on initial load

### Pitfall 2: Layout Shift from Skeleton to Content
**What goes wrong:** Content "jumps" when skeleton replaced
**Why it happens:** Skeleton dimensions don't match content
**How to avoid:** Inspect actual content dimensions and replicate exactly in skeleton
**Warning signs:** CLS (Cumulative Layout Shift) visible during testing

### Pitfall 3: Flash of Loading State
**What goes wrong:** Skeleton appears briefly then disappears (< 300ms)
**Why it happens:** Fast network/cache made load complete quickly
**How to avoid:** Implement delay before showing + minimum display time
**Warning signs:** Flickering on fast connections

### Pitfall 4: Empty State Shows During Loading
**What goes wrong:** "No subscriptions" appears while still fetching
**Why it happens:** Checking `data.length === 0` before checking `isLoading`
**How to avoid:** Always check loading state first, then error, then empty, then content
**Warning signs:** Brief "empty" flash before content appears

### Pitfall 5: Cancel Button Doesn't Reset State
**What goes wrong:** Clicking cancel during PDF processing leaves app in bad state
**Why it happens:** Forgetting to clean up all state variables
**How to avoid:** Reset files array, processing status, step state together
**Warning signs:** File list or progress indicator persists after cancel

## Code Examples

Verified patterns from existing codebase and official sources:

### Dashboard Stats Card Skeleton (Enhanced)
```typescript
// Source: Existing dashboard/page.tsx + CONTEXT.md decisions
// Shows full card skeleton including icon in header
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-4 w-4" /> {/* Icon placeholder */}
  </CardHeader>
  <CardContent>
    <Skeleton className="h-8 w-32" />
    <Skeleton className="mt-2 h-3 w-20" />
  </CardContent>
</Card>
```

### Subscription Table Row Skeleton
```typescript
// Source: CONTEXT.md "All columns get skeletons"
// 5 rows with varied widths for realism
const SKELETON_WIDTHS = {
  name: ["w-32", "w-40", "w-36", "w-28", "w-44"],
  category: ["w-20", "w-24", "w-16", "w-20", "w-24"],
  amount: ["w-16", "w-14", "w-18", "w-16", "w-14"],
};

{Array.from({ length: 5 }).map((_, i) => (
  <TableRow key={i}>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className={`h-4 ${SKELETON_WIDTHS.name[i]}`} />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className={`h-6 ${SKELETON_WIDTHS.category[i]} rounded-full`} />
    </TableCell>
    <TableCell>
      <Skeleton className={`h-4 ${SKELETON_WIDTHS.amount[i]}`} />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-16" />
    </TableCell>
    <TableCell>
      <div className="space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-6 w-16 rounded-full" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-8 w-8" />
    </TableCell>
  </TableRow>
))}
```

### Empty State for Subscriptions
```typescript
// Source: CONTEXT.md empty state decisions
import { CreditCard, Plus, FileUp } from "lucide-react";

<EmptyState
  icon={CreditCard}
  title="No subscriptions yet"
  description="Add your first subscription to start tracking your recurring payments, or import them from a bank statement."
  primaryAction={{
    label: "Add subscription",
    href: "/subscriptions/new",
    icon: Plus,
  }}
  secondaryAction={{
    label: "Import from PDF",
    href: "/import",
  }}
/>
```

### Empty State for Import History
```typescript
// Source: CONTEXT.md empty state decisions
import { FileText, Upload } from "lucide-react";

<EmptyState
  icon={FileText}
  title="No imports yet"
  description="Upload a PDF bank statement to automatically detect your subscriptions."
  primaryAction={{
    label: "Upload a PDF",
    href: "/import",
    icon: Upload,
  }}
/>
```

### Refetch/Refresh Indicator
```typescript
// Source: TanStack Query patterns + CONTEXT.md "subtle indicator"
const { data, isLoading, isFetching, refetch } = useSubscriptions(filters);

// In header or toolbar:
{!isLoading && isFetching && (
  <span className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-3 w-3 animate-spin" />
    Refreshing...
  </span>
)}
```

### Button Loading State
```typescript
// Source: CONTEXT.md "Spinner replaces button icon"
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Plus className="h-4 w-4" />
  )}
  {buttonText} {/* Text does not change */}
</Button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spinner-only loading | Skeleton screens | ~2020 | Better perceived performance |
| isLoading boolean | isPending + isFetching | TanStack Query v5 | Finer loading state control |
| CSS keyframe animations | Tailwind animate utilities | Tailwind v3+ | Simpler, tree-shakeable |
| Custom loading libraries | Component library skeletons | 2023+ | Consistent design system |

**Deprecated/outdated:**
- `isLoading` in TanStack Query v4 context: renamed to `isPending` in v5
- Manual loading state with useState: TanStack Query handles this automatically
- Full-page loading spinners: skeleton screens are the standard

## Open Questions

Things that couldn't be fully resolved:

1. **Exact fade timing values**
   - What we know: CONTEXT.md specifies ~150ms for content fade-in
   - What's unclear: Whether tw-animate-css duration-150 is exactly 150ms
   - Recommendation: Use `duration-150` class (maps to 150ms), test visually

2. **Accessibility of skeleton loaders**
   - What we know: shadcn skeleton has `data-slot="skeleton"` attribute
   - What's unclear: Whether aria-busy or aria-live regions needed
   - Recommendation: Add `aria-busy="true"` to skeleton containers, test with screen reader

3. **Import processing cancel behavior**
   - What we know: Cancel should return to upload state per CONTEXT.md
   - What's unclear: Whether abort controller should cancel in-flight API request
   - Recommendation: Use AbortController to cancel fetch, then reset UI state

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Skeleton docs](https://ui.shadcn.com/docs/components/skeleton) - Component API, usage patterns
- [TanStack Query v5 Queries guide](https://tanstack.com/query/v5/docs/framework/react/guides/queries) - Loading state flags
- [tw-animate-css GitHub](https://github.com/Wombosvideo/tw-animate-css) - Animation classes
- Existing codebase patterns - `dashboard/page.tsx`, `subscriptions/page.tsx`, hooks

### Secondary (MEDIUM confidence)
- [TanStack Query isLoading vs isPending discussion](https://github.com/TanStack/query/discussions/6297) - v5 naming rationale
- [Lucide icons](https://lucide.dev/icons) - Icon names for empty states
- [LogRocket blog on loading states](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/) - UX patterns

### Tertiary (LOW confidence)
- Web search results on skeleton timing - Community patterns, needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Patterns derived from existing codebase + official docs
- Pitfalls: MEDIUM - Based on TanStack docs + common React patterns
- Code examples: HIGH - Derived from existing code + CONTEXT.md decisions

**Research date:** 2026-02-04
**Valid until:** 30 days (stable libraries, well-documented patterns)
