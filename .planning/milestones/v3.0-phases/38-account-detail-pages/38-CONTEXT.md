# Phase 38: Account Detail Pages - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

A dedicated page per financial account showing account details (editable), statement coverage by month, a full transaction browser, and a spending summary — all scoped to that account's linked statements. No new data models or capabilities; this phase composes existing components (coverage grid, transaction browser, analytics) into a per-account view.

</domain>

<decisions>
## Implementation Decisions

### Page layout & navigation
- Click AccountCard on the accounts list page to navigate to /accounts/[id]
- Horizontal tab bar below the header: Details | Coverage | Transactions | Spending
- One section visible at a time (tab-based, not stacked or sub-routed)
- Page header shows account name as title, subtitle with type badge, institution, and key stat (credit limit for CC, interest rate for loan)
- Edit and Delete actions accessible from the header
- Back button navigates to accounts list

### Details tab
- Inline editable form (not modal) with all account fields displayed directly on the page
- Linked source section showing source name and statement count
- Save button at bottom of form
- Type field remains locked (consistent with Phase 37 modal behavior)

### Coverage tab
- Reuse existing CoverageGrid component from Phase 34, filtered to the single source linked to this account
- When no source is linked: empty state with CTA to link a source (opens edit form to source dropdown)
- Gap cells link to the historical upload wizard (Phase 34), pre-filtered to this source
- Clicking a cell with data switches to the Transactions tab, pre-filtered to that month's date range

### Transaction browser
- Reuse existing virtualized TransactionBrowser component with keyset pagination, pre-filtered to statements linked to this account
- All existing filters work on top: search, date range, tag status
- Full actions available: inline tagging, bulk tagging, one-click subscription conversion
- Month filter from coverage cell click populates the existing date range filter (user can clear it)
- Count summary banner above the list: "X transactions · Y tagged · Z subscriptions"

### Spending summary
- Three stat cards: Total Spent (all time), Monthly Average, Top Merchant (by spend)
- Monthly bar chart (Recharts) showing total spending per month for this account
- No merchant breakdown list — stat cards and chart are sufficient
- Empty state when no transactions: "No spending data yet. Link a source and import statements to see spending for this account."

### Claude's Discretion
- Loading skeleton layout for each tab
- Exact spacing and responsive behavior
- Error state handling per tab
- Chart color scheme and axis formatting
- How stat cards compute "Top Merchant" when tied

</decisions>

<specifics>
## Specific Ideas

- Coverage cell click cross-navigates to Transactions tab with month pre-filled in date range filter — this is a key UX connection between tabs
- Details tab uses inline form (not modal) to differentiate from the list page's modal pattern — detail page has the space for a full inline form
- Summary banner on transactions tab gives quick context: total count, tagged count, subscription count

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-account-detail-pages*
*Context gathered: 2026-02-26*
