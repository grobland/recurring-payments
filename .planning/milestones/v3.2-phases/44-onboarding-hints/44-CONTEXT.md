# Phase 44: Onboarding Hints - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add contextual empty-state hints with persistent dismissal across all key zero-data screens: subscriptions list, vault, transactions page, dashboard, and suggestions page. Each hint tells the user what to do next with a direct action CTA. Hints are individually dismissible and dismissal persists across page refresh and browser restart.

</domain>

<decisions>
## Implementation Decisions

### Hint vs empty state relationship
- Enhance existing empty states by adding a dismiss X button — not a separate new component layer
- Current EmptyState content (icon, title, description, CTA buttons) stays exactly as-is
- When user dismisses, the full empty state hint disappears and a minimal text line replaces it (e.g., "No subscriptions yet" with no CTA or icon)
- Hints only show when the page has zero data — they are the empty states, made dismissible

### Visual style
- Keep the current empty state visual design unchanged — no redesign needed
- Add a small X button in the top-right corner of the empty state area for dismiss
- Matches the Phase 43 overlap badge dismiss UX (X button, one-click)
- No colored banners or callout boxes — stays consistent with existing look

### Dismissal behavior
- Dismissed hints stay dismissed forever — once the user knows the feature exists, the hint doesn't return even if data goes back to zero
- localStorage-based persistence using `onboarding_hints` key
- Storage format: `Record<string, boolean>` where keys are page identifiers (`subscriptions`, `vault`, `transactions`, `dashboard`, `suggestions`)
- New `useHintDismissals` hook following the same read/write pattern as `useOverlapDismissals` but simpler (boolean values, no signatures)

### Dashboard special handling
- Dashboard is a multi-widget page — use a single dismissible hint banner at the top of the dashboard page
- Hint says something like "Add subscriptions to see your spending overview" with CTA to add subscription page
- Individual widget empty states (e.g., "No upcoming renewals") remain unchanged and are not dismissible

### Hint content & CTAs
- Reuse existing empty state copy — current titles, descriptions, and CTA buttons already tell the user what to do
- No new copywriting needed for subscriptions, vault, transactions, or suggestions pages
- Dashboard is the only page that needs new hint copy (top-of-page banner)

### Claude's Discretion
- Exact implementation of the dismiss X button placement and styling
- Whether to extend the existing EmptyState component or create a wrapper DismissibleEmptyState
- Dashboard banner exact copy and styling
- Minimal post-dismiss text wording per page
- Animation/transition when dismissing (fade out, or instant)

</decisions>

<specifics>
## Specific Ideas

- Dismiss X button pattern matches Phase 43 overlap badge (consistent UX for dismiss across the app)
- Post-dismiss state should feel intentional, not broken — a simple "No subscriptions yet" line is better than an empty void
- Dashboard hint is a separate concern from per-widget empty states — one banner covers the whole dashboard

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmptyState` component (`src/components/shared/empty-state.tsx`): Generic component with icon, title, description, primaryAction, secondaryAction — base for all 4 list pages
- `VaultEmptyState` component (`src/components/vault/vault-empty-state.tsx`): Custom vault empty state — needs same dismiss treatment
- `useOverlapDismissals` hook (`src/lib/hooks/use-overlap-dismissals.ts`): localStorage read/write pattern to follow for new `useHintDismissals` hook
- `Badge` component with X button pattern from `OverlapBadge` — reference for dismiss button styling

### Established Patterns
- localStorage for client-side persistence (overlap dismissals established in Phase 43)
- `useState` + lazy initializer for reading localStorage on mount
- Pages check `length === 0` for empty state rendering — hints plug into this same conditional
- TanStack Query for data fetching — empty state shows after query resolves

### Integration Points
- Subscriptions page (`src/app/(dashboard)/payments/subscriptions/page.tsx:337-363`): `displayedSubscriptions.length === 0` branch renders EmptyState
- Vault page (`src/components/vault/vault-page.tsx:44`): `sources.length === 0` renders VaultEmptyState
- Transactions page (`src/components/transactions/transaction-browser.tsx:291`): `allTransactions.length === 0` renders inline empty state
- Dashboard page (`src/app/(dashboard)/dashboard/page.tsx`): Multiple widgets with individual empty states — hint goes above
- Suggestions page (`src/app/(dashboard)/suggestions/page.tsx:127`): `suggestions.length === 0` renders inline empty state

</code_context>

<deferred>
## Deferred Ideas

- ONBRD-07: Contextual onboarding hint for billing/upgrade path (tracked in REQUIREMENTS.md as future requirement)
- ONBRD-08: Full onboarding checklist with progress tracking (tracked in REQUIREMENTS.md as future requirement)
- Cross-device hint dismissal via database (explicitly out of scope per REQUIREMENTS.md)

</deferred>

---

*Phase: 44-onboarding-hints*
*Context gathered: 2026-03-03*
