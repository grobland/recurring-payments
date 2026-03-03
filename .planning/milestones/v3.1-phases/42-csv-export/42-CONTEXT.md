# Phase 42: CSV Export - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can download their subscription and transaction data as well-formatted, safe CSV files. Two export buttons (subscriptions page, transactions page) trigger server-side CSV generation with UTF-8 BOM and formula injection sanitization.

</domain>

<decisions>
## Implementation Decisions

### Export button placement
- Subscriptions page: outline button with Download icon and "Export CSV" text, next to "Add Subscription" in the page header area
- Transactions page: outline button with Download icon and "Export CSV" text, right-aligned above the filter bar (alongside PaymentTypeSelector area)
- Both buttons visible on all screen sizes (stacks vertically on mobile)

### Transaction export scope
- Transaction export respects current filters (source, date range, payment type, search)
- Server-side fetch of ALL matching transactions (no pagination limit) — complete export regardless of what's loaded in the virtual list
- Subscriptions export always exports all active (non-deleted) subscriptions regardless of page filter state — matches existing API behavior

### Transaction CSV columns
- Columns: Date, Description, Amount, Currency, Source, Tags, Linked Subscription
- Tags formatted as comma-separated values in a single cell (CSV quoting handles embedded commas)
- Date format: yyyy-MM-dd (ISO) — consistent with existing subscriptions export
- Subscriptions CSV keeps existing 13 columns (Name, Description, Category, Amount, Currency, Frequency, Monthly Equivalent, Next Renewal Date, Start Date, Status, URL, Notes, Created At)

### Export feedback UX
- Click triggers immediate browser download via fetch + blob
- Success toast via sonner ("CSV downloaded") after download completes
- Button shows loading spinner and disables while fetching (prevents double-clicks)
- Button disabled (grayed out) when there are zero items to export
- Filenames: `subscriptions-YYYY-MM-DD.csv` / `transactions-YYYY-MM-DD.csv` (date-stamped, matches existing pattern)

### Claude's Discretion
- Exact spinner implementation (lucide Loader2 animate-spin or similar)
- How to construct the fetch + blob download trigger on the client
- Transaction export API query optimization for large datasets
- Error toast wording if export fails

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/utils/csv.ts`: `objectsToCSV()` and `createCSVResponse()` — working CSV utility, needs UTF-8 BOM and formula sanitization additions
- `src/app/api/subscriptions/export/route.ts`: Working subscriptions export API with 13 columns — needs BOM and sanitization applied
- `sonner` toast library: Already used throughout the app for success/error feedback
- `lucide-react` Download icon: Available for export button icon
- `DashboardHeader` component: Used on subscriptions page, provides header layout structure

### Established Patterns
- API route pattern: `auth()` check first, then Drizzle query, then response
- Button styling: `variant="outline"` for secondary actions, `variant="default"` for primary
- Loading states: `useState` boolean with disabled prop on buttons
- Transaction filters: `useTransactions` hook accepts `TransactionFiltersType`, keyset pagination via cursorDate/cursorId
- PaymentTypeSelector: nuqs-managed URL state for payment type filtering

### Integration Points
- Subscriptions page header: `div.flex` container with "Add Subscription" button — export button slots in next to it
- Transaction browser: `TransactionBrowser` component — export button goes above/alongside `PaymentTypeSelector`
- Transaction API: `src/app/api/transactions/route.ts` — existing filter logic can be reused for export endpoint (source, date, payment type, search)
- CSV utility: `src/lib/utils/csv.ts` — central place to add BOM prefix and formula sanitization

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 42-csv-export*
*Context gathered: 2026-03-03*
