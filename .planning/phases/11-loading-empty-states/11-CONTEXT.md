# Phase 11: Loading & Empty States - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users understand app state during loading and when data is empty. This phase adds skeleton loaders for dashboard and subscription list, loading spinners for PDF processing, and friendly empty state messages with calls-to-action.

</domain>

<decisions>
## Implementation Decisions

### Skeleton Design
- Pulse animation style (opacity fade in/out) — shadcn default
- Exact match to real content layout — no layout shift when content loads
- 5 skeleton items for lists (subscriptions, import history)
- Varied skeleton widths for text elements — looks more realistic
- Full card skeletons for dashboard analytics (title + chart + stats)
- All columns get skeletons in subscription table rows
- No skeleton for page headers — render immediately, only content loads
- Import history gets same skeleton treatment as subscriptions

### Empty State Content
- Friendly & encouraging tone ("No subscriptions yet! Add your first one...")
- Simple Lucide icons above messages (lightweight, not custom illustrations)
- Primary CTA button directly in empty state
- Subscriptions empty state: Primary "Add subscription" + Secondary "Import from PDF"

### Loading Feedback
- PDF processing: Spinner + status text
- Status text updates through stages: "Uploading..." → "Analyzing document..." → "Extracting subscriptions..."
- Button loading: Spinner replaces button icon (no text change)
- Mutations: Button spinner only — toast appears on completion
- No global loading indicator — skeletons are sufficient
- Cancel option visible during PDF processing
- Cancel returns to upload state (file selector ready for re-upload)
- Refetch/refresh: Subtle indicator (small spinner or "Refreshing..." text)

### Transition Timing
- 200ms delay before showing skeletons — skip skeleton if data loads fast
- 300ms minimum skeleton display — avoid brief flash
- Content fades in (~150ms) when skeleton replaced
- All items appear together — no staggered animation

### Claude's Discretion
- Exact skeleton dimensions per component
- Lucide icon choices for empty states
- Subtle refresh indicator placement
- Exact fade animation timing values

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-loading-empty-states*
*Context gathered: 2026-02-04*
