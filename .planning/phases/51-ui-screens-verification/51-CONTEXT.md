# Phase 51: UI Screens & Verification - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Build all 8 user-facing screens for the recurring payment management system: dashboard, statement uploads, statement detail, transactions explorer, review queue, recurring master list, recurring master detail, and settings/rules. Integrate with Phase 50's API endpoints via TanStack Query hooks.

This is the final phase of v4.0. After this, users can manage the full recurring payment lifecycle through the UI.

</domain>

<decisions>
## Implementation Decisions

### Navigation integration
- Add new items to existing sidebar groups in `src/components/layout/app-sidebar.tsx`
- **Overview group:** Add "Recurring" item (href: `/recurring`, icon: `RefreshCcw`)
- **Manage group:** Add "Review Queue" item (href: `/recurring/review`, icon: `ClipboardCheck`)
- Do NOT restructure existing sidebar groups — additive only
- New pages live under `src/app/(dashboard)/recurring/` route group

### Page routing structure
- `/recurring` — Recurring master list (UI-06)
- `/recurring/[id]` — Recurring master detail (UI-07)
- `/recurring/review` — Review queue (UI-05)
- `/recurring/settings` — Settings/rules with merchant alias management (UI-08)
- Dashboard enhancements (UI-01) — extend existing `/payments/dashboard` page, don't create new page
- Statement uploads (UI-02) — extend existing `/vault/load` page or `/payments/statements` if exists
- Statement detail (UI-03) — extend existing statement detail components
- Transaction explorer enhancements (UI-04) — extend existing `/payments/transactions` page

### Screen-by-screen decisions

**UI-01: Dashboard enhancements**
- Add a "Recurring Summary" card to the existing dashboard page
- Card shows: active recurring count, monthly total, upcoming payments (next 7 days), needs-review count
- Fetch data from GET /api/recurring/dashboard
- Use existing `Card` + `CardHeader` + `CardContent` pattern
- Amount change warnings shown as alert badges within the card
- Do NOT replace existing dashboard widgets — add alongside them

**UI-02: Statement uploads**
- Existing batch upload flow at `/vault/load` already works for uploading PDFs
- Add a processing status indicator showing: line items extracted, transactions normalized, merchants resolved, recurring patterns detected
- Extend the existing `BatchUploader` component to show post-processing stats
- Statement history: existing statements list on vault page — add recurring detection count column

**UI-03: Statement detail**
- Extend existing statement detail view to show:
  - Each line item's inferred merchant (from merchant resolution)
  - Each line item's recurring status (linked to master? which series?)
  - User action buttons: "Mark as recurring", "Not recurring", "Ignore"
- Actions call POST /api/transactions/{id}/label
- Show recurring master link as a clickable badge on each row

**UI-04: Transaction explorer enhancements**
- Add new filters to existing transaction browser:
  - "Recurring only" toggle — filter by transactions linked to a recurring_series
  - "Unmatched only" toggle — transactions not linked to any series
  - "Merchant" dropdown — filter by merchant entity
- These are additional filter options alongside existing ones (tag status, date range, etc.)
- Use existing `TransactionFilters` component pattern, extend with new filter controls

**UI-05: Review queue**
- New page at `/recurring/review`
- Card-based list layout (not table — review items need more visual space for context)
- Each card shows: merchant name, confidence score (as colored badge), suggested recurring_kind, sample transaction dates/amounts, suggested action
- Action buttons per card: "Confirm", "Link to Existing", "Ignore", "Not Recurring"
- "Link to Existing" opens a modal/dropdown to select from existing masters
- Calls POST /api/recurring/review-queue/{id}/resolve
- Empty state: "No items to review" with description
- Sort by confidence descending (highest confidence first)

**UI-06: Recurring master list**
- New page at `/recurring`
- Table layout with responsive card fallback on mobile
- Columns: name, kind (badge), status (badge), amount, frequency, next payment, actions
- Filter tabs: All, Subscriptions, Bills, Needs Review, Paused/Cancelled
- Search by name
- Click row → navigate to detail page
- "Add Manual" button opens form to create a master manually (POST /api/recurring/masters)

**UI-07: Recurring master detail**
- New page at `/recurring/[id]`
- Header: name, kind badge, status badge, edit button
- Sections:
  - Metadata card: amount, frequency, merchant, importance rating, notes, url
  - Linked series chain: list of series with date ranges, transaction counts
  - Event log: scrollable timeline of recurring_events (created, linked, amount_changed, etc.)
- Edit controls: inline editing or modal form for metadata fields
- Status change buttons: Pause, Cancel, Reactivate
- Merge button: opens modal to select target master

**UI-08: Settings/rules**
- New page at `/recurring/settings`
- Merchant alias management: list of merchant entities with their aliases
- Add/edit/delete aliases (MERCH-05 delivered here)
- Simple table: Merchant Name | Aliases (comma-separated) | Actions (edit, delete)
- Add form: merchant name + alias text
- Calls POST/PATCH/DELETE on merchant entity and alias endpoints
- **Note:** No tolerance settings in v4.0 — detection thresholds are code-defined

### Data fetching hooks
- Create `src/lib/hooks/use-recurring.ts` with TanStack Query hooks:
  - `useRecurringDashboard()` — GET /api/recurring/dashboard
  - `useRecurringSeries(filters)` — GET /api/recurring/series
  - `useRecurringSeriesDetail(id)` — GET /api/recurring/series/{id}
  - `useRecurringMasters(filters)` — GET /api/recurring/masters
  - `useRecurringMasterDetail(id)` — GET /api/recurring/masters/{id}
  - `useReviewQueue()` — GET /api/recurring/review-queue
- Mutation hooks:
  - `useConfirmSeries()` — POST /api/recurring/series/{id}/confirm
  - `useIgnoreSeries()` — POST /api/recurring/series/{id}/ignore
  - `useCreateMaster()` — POST /api/recurring/masters
  - `useUpdateMaster()` — PATCH /api/recurring/masters/{id}
  - `useMergeMasters()` — POST /api/recurring/masters/{id}/merge
  - `useChangeMasterStatus()` — POST /api/recurring/masters/{id}/status
  - `useResolveReviewItem()` — POST /api/recurring/review-queue/{id}/resolve
  - `useLabelTransaction()` — POST /api/transactions/{id}/label
- Follow existing query key pattern: `recurringKeys.all`, `recurringKeys.lists()`, etc.
- Invalidate related queries on mutation success (e.g., resolving review item invalidates dashboard + queue + masters)

### Component organization
- `src/components/recurring/` — New directory for all recurring-specific components
- Components per screen: `RecurringDashboardCard`, `ReviewQueueList`, `ReviewQueueCard`, `RecurringMasterTable`, `RecurringMasterDetail`, `MerchantAliasManager`
- Reuse existing UI primitives: `Card`, `Table`, `Badge`, `Button`, `Input`, `Select`, `Dialog`, `DropdownMenu`, `Skeleton`
- Use `EmptyState` for empty list/queue states
- Use `ServiceUnavailable` for error states
- Use `useDelayedLoading()` for skeleton timing

### Styling
- Follow existing warm oklch hue palette (Phase 45 decision)
- Confidence badges: green (≥0.85), yellow (0.60-0.84), red (<0.60)
- Kind badges: use category colors — subscription (blue), utility (orange), insurance (purple), loan (red), etc.
- Status badges: active (green), paused (yellow), cancelled (red), dormant (gray), needs_review (orange)

### Claude's Discretion
- Exact layout grid proportions for detail pages
- Whether to use tabs or accordion for master detail sections
- Animation/transitions on review queue actions
- Mobile-specific adaptations beyond responsive grid
- Exact chart types for dashboard recurring summary (if any charts needed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §UI Screens (UI-01 to UI-08)
- `.planning/REQUIREMENTS.md` §Merchant Resolution MERCH-05 — merchant alias management UI delivered in UI-08

### Existing UI patterns (MUST READ)
- `src/components/layout/app-sidebar.tsx` — Sidebar navigation structure (add new items here)
- `src/app/(dashboard)/payments/dashboard/page.tsx` — Dashboard page pattern
- `src/app/(dashboard)/payments/transactions/page.tsx` — Transaction browser pattern
- `src/components/transactions/transaction-browser.tsx` — Complex list with filters
- `src/components/subscriptions/subscription-form.tsx` — Form pattern with React Hook Form + Zod
- `src/lib/hooks/use-subscriptions.ts` — TanStack Query hook pattern
- `src/lib/hooks/use-transactions.ts` — Infinite query with cursor pagination

### API endpoints (created in Phase 50)
- `src/app/api/recurring/series/route.ts` — Series list endpoint
- `src/app/api/recurring/masters/route.ts` — Masters list + create
- `src/app/api/recurring/review-queue/route.ts` — Review queue list
- `src/app/api/recurring/dashboard/route.ts` — Dashboard summary
- `src/lib/validations/recurring.ts` — Zod schemas for API requests

### Schema
- `src/lib/db/schema.ts` — Table types for TypeScript

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DashboardHeader` — Page header with title + breadcrumbs (use for all new pages)
- `EmptyState` — Empty list state with icon + CTA
- `ServiceUnavailable` — Error state with retry
- `Card/CardHeader/CardContent` — Widget containers
- `Table/TableHeader/TableBody/TableRow/TableCell` — Data tables
- `Badge` — Status/kind indicators
- `Dialog/DialogContent/DialogHeader` — Modals for merge/link actions
- `DropdownMenu` — Row-level actions
- `Skeleton` — Loading placeholders
- `useDelayedLoading()` — 300ms skeleton delay
- `useDebouncedValue()` — Search debouncing
- `toast` from sonner — Success/error notifications

### Established Patterns
- Pages export metadata + default function returning DashboardHeader + main
- Components in dedicated directory with index.ts barrel export
- Hooks use queryKey factories and invalidate related keys on mutation
- Forms use React Hook Form + Zod resolver with onBlur validation
- Responsive: mobile cards, desktop tables
- URL state via nuqs for filters

### Integration Points
- `app-sidebar.tsx` — Add 2 new nav items
- Existing dashboard page — Add recurring summary card
- Existing transaction browser — Add recurring/unmatched filters
- Existing statement detail — Add recurring status badges

</code_context>

<specifics>
## Specific Ideas

- Review queue is card-based, not table — each item needs visual space for context (merchant, confidence, sample transactions, action buttons)
- Dashboard recurring card is ADDITIVE to existing dashboard — don't touch existing widgets
- Transaction explorer filters are ADDITIVE — extend existing filter component
- Merchant alias management (MERCH-05) is delivered as part of UI-08 settings page
- All mutation hooks invalidate dashboard query to keep counts fresh

</specifics>

<deferred>
## Deferred Ideas

- Drag-and-drop reordering of recurring masters — future UX enhancement
- Recurring payment calendar view — visual timeline of upcoming payments
- Mobile-native gestures (swipe to confirm/ignore in review queue) — future mobile optimization
- Recurring payment notifications/alerts in-app — separate from email reminders
- Bulk actions on recurring masters (mass pause/cancel) — future enhancement
- Export recurring data as CSV — could extend Phase 42's export

</deferred>

---

*Phase: 51-ui-screens-verification*
*Context gathered: 2026-03-18*
