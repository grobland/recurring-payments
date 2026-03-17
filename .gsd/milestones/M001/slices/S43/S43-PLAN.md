# S43: Overlap Detection

**Goal:** Build the overlap detection logic and badge component that Plan 02 will wire into the subscriptions page.
**Demo:** Build the overlap detection logic and badge component that Plan 02 will wire into the subscriptions page.

## Must-Haves


## Tasks

- [x] **T01: 43-overlap-detection 01**
  - Build the overlap detection logic and badge component that Plan 02 will wire into the subscriptions page.

Purpose: Separating detection logic and UI component from page integration allows clean testing of each piece. Plan 02 only needs to import and use these artifacts.

Output:
- `useOverlapGroups(subscriptions)` — pure computation hook
- `OverlapBadge` — warning badge with tooltip and dismiss button
- [x] **T02: 43-overlap-detection 02**
  - Wire the overlap detection and badge component into the subscriptions list page with localStorage-backed dismissal that auto-re-surfaces when group membership changes.

Purpose: Complete OVRLP-02 (dismissal) and OVRLP-03 (re-surface) by implementing the persistence layer and integrating Plan 01's artifacts into the page.

Output:
- `useOverlapDismissals` hook with localStorage persistence and group signature logic
- Subscriptions page updated to render `OverlapBadge` on affected rows

## Files Likely Touched

- `src/lib/hooks/use-overlap-groups.ts`
- `src/components/subscriptions/overlap-badge.tsx`
- `src/lib/hooks/use-overlap-dismissals.ts`
- `src/app/(dashboard)/payments/subscriptions/page.tsx`
- `src/lib/hooks/index.ts`
