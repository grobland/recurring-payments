# T01: 43-overlap-detection 01

**Slice:** S43 — **Milestone:** M001

## Description

Build the overlap detection logic and badge component that Plan 02 will wire into the subscriptions page.

Purpose: Separating detection logic and UI component from page integration allows clean testing of each piece. Plan 02 only needs to import and use these artifacts.

Output:
- `useOverlapGroups(subscriptions)` — pure computation hook
- `OverlapBadge` — warning badge with tooltip and dismiss button

## Must-Haves

- [ ] "Overlap groups are computed purely from the existing subscription array (no extra API call)"
- [ ] "A group only forms when 2+ active (non-paused, non-cancelled), categorized subscriptions share the same categoryId"
- [ ] "The hook returns a Map<categoryId, string[]> of subscription IDs per overlap group"
- [ ] "OverlapBadge renders a yellow warning badge with a tooltip listing the other group members by name"
- [ ] "OverlapBadge has an X button that calls onDismiss with the categoryId"

## Files

- `src/lib/hooks/use-overlap-groups.ts`
- `src/components/subscriptions/overlap-badge.tsx`
