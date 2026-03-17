---
id: T01
parent: S44
milestone: M001
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T01: 44-onboarding-hints 01

**# Phase 44 Plan 01: Hint Dismissal Infrastructure Summary**

## What Happened

# Phase 44 Plan 01: Hint Dismissal Infrastructure Summary

localStorage-backed `useHintDismissals` hook and `DismissibleEmptyState` wrapper component for permanent onboarding hint dismissal.

## What Was Built

### useHintDismissals hook

**File:** `src/lib/hooks/use-hint-dismissals.ts`

localStorage-backed boolean dismissal hook. Simpler than the overlap hook — dismissal is permanent (no re-surface logic, no group signatures).

**API:**
```typescript
const { isDismissed, dismiss } = useHintDismissals();

isDismissed("subscriptions") // boolean — true if previously dismissed
dismiss("subscriptions")     // void — writes to localStorage, triggers re-render
```

**localStorage schema:**
```
key: "onboarding_hints"
value: JSON-stringified Record<pageId, boolean>
example: { "subscriptions": true, "vault": true, "dashboard": true }
```

**Key implementation details:**
- `useState(() => readHintDismissals())` lazy initializer reads from localStorage on mount
- SSR guard: `typeof window === "undefined"` returns `{}`
- Silent error handling for private browsing / quota exceeded
- `dismiss()` reads current state, merges `{ [pageId]: true }`, writes back, updates React state

### DismissibleEmptyState component

**File:** `src/components/shared/dismissible-empty-state.tsx`

`"use client"` wrapper component that makes any empty state dismissible.

**Props interface:**
```typescript
interface DismissibleEmptyStateProps {
  pageId: string;           // e.g., "subscriptions", "vault"
  dismissedText: string;    // e.g., "No subscriptions yet"
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string; icon?: LucideIcon; };
  secondaryAction?: { label: string; href: string; };
}
```

**Rendering behavior:**
- Not dismissed: `<div className="relative">` + absolute X button top-right + `<EmptyState />`
- Dismissed: `<p className="py-12 text-center text-sm text-muted-foreground">{dismissedText}</p>`

### hooks/index.ts export

Added to `src/lib/hooks/index.ts`:
```typescript
// Onboarding hint hooks
export { useHintDismissals } from "./use-hint-dismissals";
```

## Test Results

All 9 tests pass in `tests/unit/use-hint-dismissals.test.ts`:

- isDismissed returns false when nothing is stored
- isDismissed returns false for a different key when only one is stored
- isDismissed returns true after dismiss is called
- dismiss writes `{ subscriptions: true }` to localStorage under 'onboarding_hints' key
- Multiple dismissals accumulate: dismiss('subscriptions') then dismiss('vault') stores both
- isDismissed returns true across re-reads (persistence)
- hook returns `{ isDismissed, dismiss }` tuple
- handles invalid JSON in localStorage gracefully
- handles empty localStorage gracefully

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `91a8c66` feat(44-01): implement useHintDismissals hook with TDD
- `3b9f454` feat(44-01): add DismissibleEmptyState component and export hook

## Self-Check: PASSED

All files found at expected paths. Both commits exist in git history.
