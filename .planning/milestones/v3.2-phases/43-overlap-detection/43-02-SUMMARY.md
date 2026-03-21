---
phase: 43-overlap-detection
plan: "02"
subsystem: subscriptions
tags: [overlap-detection, hooks, localStorage, dismissal, persistence]
dependency_graph:
  requires:
    - 43-01 (useOverlapGroups hook + OverlapBadge component)
  provides:
    - useOverlapDismissals hook (localStorage persistence + group signature re-surface)
    - Subscriptions page wired with overlap detection and dismissal
  affects:
    - src/app/(dashboard)/payments/subscriptions/page.tsx (OverlapBadge now rendered inline)
tech_stack:
  added: []
  patterns:
    - localStorage for client-side persistence (key: overlap_dismissals)
    - Group signature (sorted IDs joined by comma) for change detection
    - useState lazy initializer for localStorage read on mount
    - useEffect for stale key cleanup when groups dissolve
key_files:
  created:
    - src/lib/hooks/use-overlap-dismissals.ts
  modified:
    - src/lib/hooks/index.ts
    - src/app/(dashboard)/payments/subscriptions/page.tsx
decisions:
  - localStorage schema uses Record<categoryId, groupSignature> under "overlap_dismissals" key
  - Group signature computed as sorted(subscriptionIds).join(",") for stable change detection
  - Dismissal state initialized lazily from localStorage on mount (not re-read on every isDismissed call)
  - Cleanup of stale keys (dissolved groups) handled in useEffect keyed on overlapGroups
metrics:
  duration: "6m"
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 43 Plan 02: Dismissal Hook and Page Integration Summary

**One-liner:** localStorage-backed `useOverlapDismissals` hook with group-signature re-surface detection, wired into the subscriptions page to render `OverlapBadge` inline on affected rows.

## What Was Built

### Hook: `useOverlapDismissals`

**File:** `src/lib/hooks/use-overlap-dismissals.ts`

Exports:
- `useOverlapDismissals(overlapGroups)` — React hook returning `{ isDismissed, dismiss }`

**localStorage schema:**
```json
// Key: "overlap_dismissals"
// Value: Record<categoryId, groupSignature>
{ "uuid-entertainment": "id1,id2", "uuid-streaming": "id3,id4,id5" }
```

**Group signature:** `[...subscriptionIds].sort().join(",")` — stable string uniquely identifying the current members of an overlap group.

**isDismissed(categoryId) logic:**
1. Look up `categoryId` in React state (initialized from localStorage on mount)
2. If not found → return `false` (never dismissed)
3. Get current group members from `overlapGroups.get(categoryId)`
4. If group no longer exists → return `false` (stale entry, treat as not dismissed)
5. Compute current signature; compare to stored signature
6. If different → return `false` (re-surface: members changed — OVRLP-03)
7. If same → return `true` (still dismissed, same members)

**dismiss(categoryId) logic:**
1. Get current group members from `overlapGroups`; return if group not found
2. Compute current signature
3. Update localStorage and React state atomically
4. State update triggers re-render so badge hides immediately (OVRLP-02)

**Cleanup:** `useEffect` keyed on `overlapGroups` scans stored keys and removes any `categoryId` whose group no longer exists (prevents stale data buildup after category changes or subscription deletion).

### Hooks Index Export

**File:** `src/lib/hooks/index.ts`

Added two exports at the bottom:
```typescript
export { useOverlapGroups } from "./use-overlap-groups";
export { useOverlapDismissals } from "./use-overlap-dismissals";
```

### Subscriptions Page Wiring

**File:** `src/app/(dashboard)/payments/subscriptions/page.tsx`

Changes:
1. Added imports: `useOverlapGroups`, `useOverlapDismissals` from `@/lib/hooks` and `OverlapBadge` from `@/components/subscriptions/overlap-badge`
2. Added hook calls after existing hooks: `const overlapGroups = useOverlapGroups(subscriptions)` and `const { isDismissed, dismiss } = useOverlapDismissals(overlapGroups)`
3. Added inline IIFE in the name cell (after `needsUpdate` badge) that:
   - Checks if the subscription's `categoryId` is in `overlapGroups`
   - Skips if dismissed
   - Computes `otherNames` (other subscriptions in the same group)
   - Renders `<OverlapBadge>` with `categoryId`, `otherNames`, and `onDismiss={dismiss}`

## Requirements Fulfilled

- **OVRLP-02:** Dismissal persists in localStorage across page refresh — badge remains hidden for dismissed groups with unchanged membership
- **OVRLP-03:** Group signature mismatch re-surfaces dismissed badge — when a subscription is added/removed/category-changed, the signature changes and the badge re-appears on next render

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/lib/hooks/use-overlap-dismissals.ts` | FOUND |
| `src/lib/hooks/index.ts` (exports added) | FOUND |
| `src/app/(dashboard)/payments/subscriptions/page.tsx` (wired) | FOUND |
| Commit e9ade9e (useOverlapDismissals hook) | FOUND |
| Commit 2bbf6a9 (page wiring + hooks index) | FOUND |
| `npm run build` passes | PASSED |
