---
id: S44
parent: M001
milestone: M001
provides:
  - Subscriptions page with DismissibleEmptyState on zero-data branch (pageId: "subscriptions")
  - Vault empty state with X button and "No statements yet" dismissed text (pageId: "vault")
  - Transaction browser with three-state empty logic: filtered / dismissed / zero-data (pageId: "transactions")
  - Dashboard onboarding hint banner when subscriptions empty (pageId: "dashboard")
  - Suggestions page with X button and "No suggestions yet" dismissed text (pageId: "suggestions")
requires: []
affects: []
key_files: []
key_decisions:
  - "Subscriptions page uses DismissibleEmptyState (shared component) because it already used EmptyState — direct prop-for-prop swap"
  - "Vault, transactions, suggestions use useHintDismissals directly because they have custom layouts incompatible with DismissibleEmptyState"
  - "Dashboard shows a dismissible banner (not per-widget empty state) since it's multi-widget and never truly empty"
  - "Transaction browser uses three-state logic: hasActiveFilters (unchanged) / dismissed (minimal text) / zero-data (X button)"
  - "EmptyState import removed from subscriptions page since DismissibleEmptyState fully replaces it"
patterns_established:
  - "Pattern 1: Use DismissibleEmptyState when swapping from shared EmptyState component"
  - "Pattern 2: Use useHintDismissals directly for custom-layout empty states"
  - "Pattern 3: Filtered empty states always remain non-dismissible"
observability_surfaces: []
drill_down_paths: []
duration: 8min
verification_result: passed
completed_at: 2026-03-03
blocker_discovered: false
---
# S44: Onboarding Hints

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

# Phase 44 Plan 02: Onboarding Hints Integration Summary

**Five-page dismissible onboarding hints wired via DismissibleEmptyState and useHintDismissals, with independent per-page localStorage persistence using pageIds: subscriptions, vault, transactions, dashboard, suggestions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-03T23:54:33Z
- **Completed:** 2026-03-03T23:02:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Subscriptions page: replaced EmptyState with DismissibleEmptyState for zero-data branch; filtered empty state unchanged
- Vault, transactions, suggestions: integrated useHintDismissals directly into custom layouts with X buttons
- Dashboard: added dismissible hint banner positioned after trial banner, before period selector; shows only when subscriptions empty and not dismissed
- All 5 pages use unique pageIds for fully independent dismissal state

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire dismissible hints into subscriptions, vault, and transactions** - `3ab153b` (feat)
2. **Task 2: Wire dismissible hints into dashboard and suggestions** - `89d3980` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/(dashboard)/payments/subscriptions/page.tsx` - Replaced EmptyState with DismissibleEmptyState on zero-data branch; removed unused EmptyState import
- `src/components/vault/vault-empty-state.tsx` - Added useHintDismissals hook, X button, and "No statements yet" dismissed state
- `src/components/transactions/transaction-browser.tsx` - Three-state empty: hasActiveFilters (filter empty), dismissed (minimal text), zero-data (X button)
- `src/app/(dashboard)/dashboard/page.tsx` - Added dismissible hint banner when subscriptions.length === 0 && !showSkeleton && !error
- `src/app/(dashboard)/suggestions/page.tsx` - Added X button and "No suggestions yet" dismissed state to empty block

## Decisions Made
- Used DismissibleEmptyState on subscriptions page (direct prop-for-prop swap from EmptyState)
- Used useHintDismissals directly on vault, transactions, suggestions, dashboard (custom layouts)
- Dashboard gets a banner instead of a per-widget empty state because the page always shows widgets
- Filtered empty states (subscriptions with search/filter, transactions with active filters) are deliberately non-dismissible per plan spec

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all five integrations compiled cleanly on first attempt, build passed after each task.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 pages have independently dismissible onboarding hints
- ONBRD-01 through ONBRD-05 requirements fulfilled
- Phase 44 complete — all plans done

---
*Phase: 44-onboarding-hints*
*Completed: 2026-03-03*
