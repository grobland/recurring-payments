# T02: 43-overlap-detection 02

**Slice:** S43 — **Milestone:** M001

## Description

Wire the overlap detection and badge component into the subscriptions list page with localStorage-backed dismissal that auto-re-surfaces when group membership changes.

Purpose: Complete OVRLP-02 (dismissal) and OVRLP-03 (re-surface) by implementing the persistence layer and integrating Plan 01's artifacts into the page.

Output:
- `useOverlapDismissals` hook with localStorage persistence and group signature logic
- Subscriptions page updated to render `OverlapBadge` on affected rows

## Must-Haves

- [ ] "User sees a yellow 'Overlap' badge with X button on every active subscription row that belongs to a same-category overlap group"
- [ ] "The badge tooltip lists the other subscription names in the same category"
- [ ] "Clicking the X button immediately hides the badge for ALL members of that overlap group (the entire category group is dismissed)"
- [ ] "After page refresh, dismissed badges remain hidden (dismissal persists)"
- [ ] "When a subscription is added, deleted, or its category changed, the dismissed badge re-appears on the next page load"

## Files

- `src/lib/hooks/use-overlap-dismissals.ts`
- `src/app/(dashboard)/payments/subscriptions/page.tsx`
- `src/lib/hooks/index.ts`
