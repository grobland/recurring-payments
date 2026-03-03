# Phase 43: Overlap Detection - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Detect and surface same-category subscription redundancies with per-group dismissal. Users see an inline badge on subscription rows that belong to an overlap group. Badges are dismissible per group and automatically re-surface when the group membership changes (addition, deletion, or category change).

</domain>

<decisions>
## Implementation Decisions

### Badge design & placement
- Yellow warning badge (`variant="warning"`) placed next to the subscription name, same position as the existing "Needs Update" badge
- Tooltip lists the other subscriptions in the overlap group (e.g., "Also in Entertainment: Hulu, Disney+") — follows the DuplicateWarning tooltip pattern
- Small X button on the badge to dismiss (one-click dismiss for the entire overlap group)

### Grouping rules
- Only active subscriptions count toward overlap groups (paused/cancelled excluded)
- Uncategorized subscriptions are excluded — they're unrelated, just unsorted
- Minimum group size: 2+ active subscriptions in the same category triggers overlap badges on each member
- Billing frequency is ignored — monthly and yearly subs in the same category still overlap

### Dismissal behavior
- Dismissing a badge dismisses it for the entire overlap group (all members in that category)
- Badges disappear immediately on dismiss
- Any group membership change triggers re-surface: subscription added, deleted, or category changed
- Re-surfacing is silent — badge simply reappears on next page visit, no toast or notification

### Visibility scope
- Overlap badges appear on the subscriptions list page only (no detail pages, no dashboard)
- No summary section above the table — just inline badges on affected rows

### Claude's Discretion
- Storage approach for dismissals (database vs localStorage) — decide based on requirements and architecture
- Cleanup strategy when an overlap group dissolves (group drops below 2 members)
- Client-side vs server-side overlap computation — decide based on data size and existing patterns

</decisions>

<specifics>
## Specific Ideas

- Badge placement and tooltip follow the same UX pattern as DuplicateWarning component (Badge + Tooltip with group member list)
- X button on badge for dismiss is more explicit than click-to-dismiss or tooltip-based dismiss
- Silent re-surfacing preferred over toast notifications to avoid noise

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Badge` component (`src/components/ui/badge.tsx`): Has `warning` variant (yellow) ready to use
- `DuplicateWarning` component (`src/components/subscriptions/duplicate-warning.tsx`): Badge + Tooltip pattern for similar warning badges — reference for overlap badge design
- `useDismissPattern` hook (`src/lib/hooks/use-dismiss-pattern.ts`): API-backed dismissal with TanStack Query invalidation — pattern for dismiss hook
- `Tooltip` / `TooltipContent` / `TooltipTrigger` from Radix UI — already used in subscription components

### Established Patterns
- Subscription list page (`src/app/(dashboard)/payments/subscriptions/page.tsx`): Table-based layout with existing badge positions (line ~400: "Needs Update" badge next to name)
- TanStack Query for data fetching and cache invalidation on mutations
- `useMutation` + `queryClient.invalidateQueries` pattern for dismiss operations
- Toast notifications via `sonner` for user feedback

### Integration Points
- Subscription table rows (line 373-500 in subscriptions page.tsx) — overlap badge goes in the name cell after the subscription name link
- `useSubscriptions` hook already fetches subscriptions with category data (`subscription.category?.name`)
- `DuplicateScanSection` component renders above the table — overlap badges are inline, not a separate section
- Categories table has `id` field used as `categoryId` FK on subscriptions

</code_context>

<deferred>
## Deferred Ideas

- OVRLP-04: Cost breakdown per category ("$47/mo across 3 services") — tracked in REQUIREMENTS.md as future requirement
- Overlap visibility on detail pages and dashboard — could be added in a future enhancement phase

</deferred>

---

*Phase: 43-overlap-detection*
*Context gathered: 2026-03-03*
