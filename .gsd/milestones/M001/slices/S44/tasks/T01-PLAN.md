# T01: 44-onboarding-hints 01

**Slice:** S44 — **Milestone:** M001

## Description

Build the hint dismissal hook and dismissible empty state wrapper component that Plan 02 will integrate into all five pages.

Purpose: Separating the shared infrastructure (hook + component) from page integration means Plan 02 only needs to swap EmptyState usages for DismissibleEmptyState. Clean reusable pattern.

Output:
- `useHintDismissals` — localStorage-backed boolean dismissal hook
- `DismissibleEmptyState` — wrapper component with X button and post-dismiss minimal text

## Must-Haves

- [ ] "useHintDismissals hook reads dismissed state from localStorage 'onboarding_hints' key on mount"
- [ ] "Calling dismiss(pageId) writes to localStorage and triggers re-render so the hint hides immediately"
- [ ] "After page refresh, isDismissed(pageId) returns true for previously dismissed pages"
- [ ] "Dismissal is permanent — once dismissed, hints never reappear even if data goes back to zero"
- [ ] "DismissibleEmptyState renders the full EmptyState content plus an X button, or minimal text when dismissed"

## Files

- `src/lib/hooks/use-hint-dismissals.ts`
- `src/components/shared/dismissible-empty-state.tsx`
- `src/lib/hooks/index.ts`
