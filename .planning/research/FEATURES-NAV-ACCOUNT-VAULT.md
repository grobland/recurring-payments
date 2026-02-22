# Feature Research: Navigation Restructure & Account Vault

**Domain:** Financial app navigation, account management, payment type filtering, schema introspection, help documentation
**Milestone:** v3.0 Navigation & Account Vault
**Researched:** 2026-02-22
**Confidence:** HIGH (nav restructure, account detail pages), MEDIUM (payment type selector UX, schema viewer), HIGH (help page patterns)

---

## Context: What Already Exists

This is a subsequent milestone. Understanding existing infrastructure prevents rebuilding what is already there.

### Already Built (Do Not Re-Build)

**Navigation infrastructure:**
- `AppSidebar` with shadcn/ui Sidebar primitives (SidebarGroup, SidebarGroupLabel, SidebarMenu, etc.)
- Two-group layout already: "Menu" group (main nav) + "Support" group (Settings, Help)
- `LockedNavItem` feature-gating component for sidebar items
- Admin section already conditionally rendered by role
- Trial banner in sidebar already implemented

**Sources / data model:**
- `importAudits` table with `statementSource` (varchar, the human-readable account name)
- `statements` table with `sourceType` and `sourceName` for grouping
- `/sources` page — source dashboard with accordion list, coverage stats
- `source-dashboard`, `source-list`, `source-row` components
- Coverage grid component already built (used in vault)
- `account-combobox.tsx` for source-name autocomplete

**Transaction browser:**
- `/transactions` page — `TransactionBrowser` component with virtualized scrolling
- Keyset pagination for 10k+ items at 60fps
- Inline tagging (combobox), bulk operations, one-click subscription conversion

**Vault:**
- `/vault` page — dual-view (file cabinet + timeline) with coverage heat map
- Historical upload wizard for coverage gaps
- View preference persistence

**Supporting infrastructure:**
- `DashboardHeader` with breadcrumb support
- TanStack Query for all data fetching
- React Hook Form + Zod for all forms
- Drizzle ORM with 10 migrations applied

### What This Milestone Adds

1. **Sidebar restructure** — flatten the flat nav into three labeled sections (fin Vault, payments Portal, Support) with logical sub-groupings
2. **data Vault (account management)** — promote sources from import-time strings to named, typed, editable account entities (Bank/Debit, Credit Card, Loan)
3. **Account detail pages** — per-account pages: edit form, coverage grid, transaction list, spending summary
4. **Data Schema viewer** — read-only page showing the app's data model (tables, fields, relationships)
5. **Payment Type Selector** — transaction browser extended with type toggles (recurring vs one-time) and additional filters
6. **Help page** — static FAQ/documentation page

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a mature financial app. Missing these = product feels unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Labeled navigation sections | Standard in any SaaS with 8+ nav items. Flat lists become overwhelming. | LOW | shadcn Sidebar already supports SidebarGroupLabel. Purely organizational. |
| Account list with type differentiation | Every banking app (Chase, Mint, YNAB) shows accounts grouped by type. Users expect "Checking", "Credit Card" as distinct categories. | LOW | Requires new `accounts` table or extend sources model |
| Account detail page | Any entity in a financial app must have a detail page. Sources currently have `/sources` aggregate view only — no per-source drilldown beyond the accordion. | MEDIUM | Page already has components to compose: coverage grid, statement list |
| Edit account name/type | Users make typos. Names evolve ("Chase Freedom" vs "Chase Visa"). Must be editable. | LOW | Standard form. Name + type fields only. |
| Transaction browser filter bar | Users with 10k+ transactions need filters. Source filter already has groundwork; type toggle is the gap. | LOW | Toggle UI is one-week add on existing TransactionBrowser |
| Help page with FAQ | Every SaaS has a Help page. Users expect answers to "how do I X" without contacting support. | LOW | Static content, no backend needed |

### Differentiators (Competitive Advantage)

Features that go beyond expectations and create unique value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Account-level coverage grid | No consumer financial tool shows per-account statement coverage as a visual calendar grid. The coverage pattern already exists for the vault; applying it per-account creates a unique "data health" view. | LOW | Reuse CoverageGrid component, scope to single account. High reuse, high impact. |
| Account-level spending summary | Seeing "how much did I spend from this credit card this year" is genuinely useful and not available in most subscription managers. | MEDIUM | Reuse existing analytics patterns; scope to account's transactions only |
| Source-to-account migration with type tagging | Automatic promotion of existing source strings to typed account entities, preserving all statement history. Users get organized without re-importing. | MEDIUM | Requires migration strategy: one-time script or lazy promotion on first account page visit |
| Data Schema viewer | Transparency about how the system stores data builds power-user trust. Rare in consumer apps — common in developer tools. Appropriate here because users are "financial nerds" who imported raw PDFs. | LOW | Read-only static-ish page. No backend needed beyond reading the schema definition. |
| Payment type toggle (recurring vs subscription) | Most transaction browsers are undifferentiated. Surfacing "these are subscription charges" vs "these are one-time recurring" vs "unclassified" is genuinely novel and actionable. | MEDIUM | Requires tagging model to be extended with payment-type field or derived from tag status |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem right but should be explicitly avoided.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Collapsible/expandable sidebar sections | Large nav looks cleaner collapsed | Collapse breaks findability — users forget where items live. shadcn sidebar already handles icon-only collapsed mode at the sidebar level. Section-level collapse adds a second layer of hiding. | Use section labels and visual grouping instead. The sidebar already collapses at the rail level. |
| Nested sub-menus (3+ levels deep) | "More organization" | Cognitive overload. Research (Toptal multilevel menu study) shows 3+ levels causes users to lose orientation. Two levels (section label + item) is the maximum before users get lost. | Cap at two visual levels: section label + flat item list |
| Account merging / deduplication UI | Users may import from same bank with slightly different names ("Chase" vs "Chase Visa") | Merging financial data sources is destructive and complex. Users have low trust for automated merges in financial context. | Provide rename ability so users fix names manually. Offer a "same account?" hint if names are similar, but never auto-merge. |
| Real-time account balance sync | Users will ask "can I see my live balance?" | Requires Plaid/MX ($500+/month, compliance burden, out-of-scope per PROJECT.md). | Show "based on imported statements" with last-import-date clearly visible |
| Per-account notification settings | Power users will request "notify me only when this credit card has anomalies" | Adds combinatorial complexity to the alerts system. Current weekly digest is already account-aware in data — display is the gap. | Surface account name in alert notifications rather than per-account opt-in |
| Full-text search in Help page | Seems useful | Static FAQ doesn't need search infra. Adds complexity for little gain at low content volume. | Use anchor links and clear section headings. Browser Ctrl+F covers 95% of use cases. |
| Interactive schema editor | Users who see the schema viewer might want to "customize" field names | This is a personal finance app, not a no-code platform. Schema edits break the application. | Read-only with copy-to-clipboard. Add tooltip: "This shows how your data is organized internally." |

---

## Feature Dependencies

```
[Nav Restructure]
    └──requires──> [Sidebar group labels already exist in shadcn/ui]
    └──enables──> [data Vault section] (logical grouping makes it findable)
    └──enables──> [payments Portal section] (logical grouping makes it findable)

[data Vault / Account Management]
    └──requires──> [accounts table or extend import_audits/statements]
    └──requires──> [source-to-account migration]
    └──enables──> [Account Detail Pages]

[Account Detail Pages]
    └──requires──> [Account Management entity exists]
    └──reuses──> [CoverageGrid component] (already built for vault)
    └──reuses──> [TransactionBrowser component] (already built, needs account filter)
    └──reuses──> [DashboardHeader with breadcrumbs] (already built)
    └──requires──> [Account-scoped API endpoints]

[Payment Type Selector]
    └──requires──> [TransactionBrowser] (existing, needs extension)
    └──requires──> [transaction tag_status field] (existing: unreviewed/potential_subscription/not_subscription/converted)
    └──enhances──> [Account Detail Pages] (transaction tab can reuse same filter UI)

[Data Schema Viewer]
    └──independent──> no data dependencies, no backend needed
    └──enhances──> [Help page] (link from help to schema for power users)

[Help Page]
    └──independent──> static content only
    └──enhances──> [nav restructure] (occupies Support section slot alongside Settings)
```

### Dependency Notes

- **Nav Restructure is Phase 1:** Everything else becomes findable after nav is reorganized. Build this first — it is the frame for all other features.
- **Account management before account detail pages:** The entity must exist before the detail page can render anything meaningful.
- **Source-to-account migration is a dependency, not optional:** Existing users have 10+ sources. If migration doesn't run, their data Vault would be empty and confusing.
- **Payment Type Selector extends TransactionBrowser, not replaces it:** The existing virtualized browser with keyset pagination is complex infrastructure. Extend with a filter bar; do not rewrite.
- **Coverage Grid is already built:** Zero new development needed for the account detail coverage tab — it's a parameter change to scope by account.
- **Help page and Schema viewer are independent:** Can be built in any order, no blockers.

---

## Feature Details by Area

### 1. Navigation Restructure

**Current state:** Flat "Menu" section with 11 items + "Support" section with 2 items. 13 items in total is too many for undifferentiated listing.

**Target structure:**
```
fin Vault
  ├── doc Vault      (/vault)
  ├── doc Load       (/import/batch)  [was "Batch Import"]
  └── data Vault     (/accounts)     [NEW — account management]

payments Portal
  ├── Payments       (/transactions) [was "Transactions"]
  └── Subscriptions  (/subscriptions)

[unlabeled or Dashboard section]
  ├── Dashboard      (/dashboard)
  ├── Analytics      (/analytics)
  ├── Forecast       (/dashboard/forecasting)
  └── Suggestions    (/suggestions)

Support
  ├── Settings       (/settings)
  └── Help           (/help)         [NEW]
```

**Implementation complexity: LOW**
- shadcn/ui already has `SidebarGroup` and `SidebarGroupLabel` primitives
- It is a reorganization of existing items + adding 2 new items
- The sidebar already collapses to icon-only at the rail level (handled by Sidebar primitive)
- Single-file change: `app-sidebar.tsx`

**UX pattern:** Two levels maximum (section label + flat list). Research shows three levels causes orientation loss (Toptal multilevel menu study, MEDIUM confidence via WebSearch). The proposed structure stays at two levels.

**Active state logic:** The current `pathname === item.href` check works for exact matches. The new structure introduces section grouping, so the `SidebarMenuButton isActive` check may need `pathname.startsWith(item.href)` for sections with child routes (e.g., `/accounts/[id]` should keep "data Vault" highlighted).

---

### 2. data Vault (Account Management)

**What it is:** A named, typed entity representing a real-world financial account (Chase Visa, Wells Fargo Checking, etc.). Currently sources are strings stored on `importAudits.statementSource` — there is no first-class account entity.

**Account types:** Bank/Debit, Credit Card, Loan. These map to how users mentally model their finances and how statements differ (debit transactions vs credit card billing cycles vs loan amortization schedules).

**Migration strategy for existing data:**
- Option A: Create `accounts` table, add `accountId` FK to `statements`/`importAudits`. Write a migration script that creates one account per distinct `statementSource` value, then back-fills the FK. This is the cleanest long-term model.
- Option B: Leave `statementSource` as-is and derive "account" from distinct source strings. No migration, but no type field.
- **Recommendation: Option A.** The type field (Bank/Debit vs Credit Card vs Loan) is the core value add of this milestone. It requires a proper entity. The migration is a one-time SQL operation, not user-facing work.

**Account CRUD operations:**
- Create: New account form with name + type. (Will be used when importing a statement from a new source that has no existing account.)
- Read: Account list page (`/accounts`) showing all accounts grouped by type with coverage summary
- Update: Edit form for name, type, notes
- Delete: Soft-delete or hard-delete with warning. Statements must remain — cascade delete of statements is an anti-feature (users lose their financial history). On delete: orphan statements gracefully (accountId becomes NULL, data stays accessible via vault timeline view).

**UI pattern — Account list page:**
Standard financial app pattern: card or table per account, grouped by type (Bank/Debit | Credit Cards | Loans). Each card shows: account name, type badge, number of statements, coverage status (% months with data), last import date. Clicking navigates to account detail page.

**Complexity: MEDIUM** — Requires new table, migration, API endpoints (CRUD), new page with account list, account form component.

---

### 3. Account Detail Pages

**URL pattern:** `/accounts/[id]` — matches existing convention (`/subscriptions/[id]`, `/statements/[id]`)

**Four-tab structure (industry standard for financial account detail):**

| Tab | Content | Reuse |
|-----|---------|-------|
| Overview | Account name, type, notes, edit button, stats (total statements, date range, total transactions) | New component, low complexity |
| Coverage | Coverage grid scoped to this account | CoverageGrid component already built — add `accountId` filter |
| Transactions | Transaction list scoped to this account | TransactionBrowser with `accountId` filter |
| Spending | Spending summary scoped to this account | New component, reuses analytics query patterns |

**Tab implementation:** shadcn/ui `Tabs` component. Already in the component library. Low complexity.

**Coverage tab:** The existing coverage grid is parameterized by source. Changing the parameter to account ID is a one-line change to the data query. HIGH reuse.

**Transactions tab:** TransactionBrowser already accepts filter props. Adding an `accountId` filter is an extension to the existing keyset pagination query. MEDIUM complexity (query change + prop threading).

**Spending tab:** Month-over-month total for this account's transactions. Sum by month, show a bar chart (Recharts already installed). No novel infrastructure needed.

**Breadcrumbs:** `Dashboard > data Vault > [Account Name]` — DashboardHeader already supports breadcrumb arrays.

**Complexity: MEDIUM** — High component reuse means this is mostly composition + new API endpoint for account-scoped data.

---

### 4. Data Schema Viewer

**What it is:** A read-only page showing how the app organizes data: tables, key fields, relationships between tables. Targeted at power users who want to understand what they're importing into.

**Why it matters:** Users who import raw PDF data and manually tag transactions are sophisticated. Showing them the data model builds trust ("I understand how my data is stored"). This is a differentiator because no consumer subscription manager does this.

**Content (what to show):**
- Tables: users, subscriptions, statements, accounts, import_audits, tags, categories
- Key fields per table: name, type, description
- Relationships: accounts → statements, statements → transactions, subscriptions → import_audits
- NOT shown: internal fields (IDs, foreign keys), admin tables (stripe_prices, webhook_events), auth tables (accounts, sessions from NextAuth)

**Implementation approach:** Static page component with hardcoded schema description. Do not query the live database schema (information_schema). Rationale:
1. Security: information_schema exposes table structure, indexes, constraints — sensitive to leak
2. Maintenance: hardcoded description stays curated and user-friendly; live schema would show internal implementation details (created_at, updated_at, admin columns, etc.)
3. Simplicity: zero backend needed, ships faster, no API endpoint required

**UI pattern:** Card grid or accordion per table. Each table card shows: table name (human-friendly), purpose description, key fields list. Relationship lines or arrows optional (adds complexity, limited value for the audience).

**Complexity: LOW** — Static content component. No API, no database query. One new page + one new component.

---

### 5. Payment Type Selector

**What it is:** An extension to the existing TransactionBrowser (`/transactions`) that adds toggles for filtering by payment type: Recurring Payments (identified subscriptions + high-confidence patterns) vs Subscriptions (confirmed subscription conversions only) vs All Transactions.

**Industry context:** Most transaction browsers are undifferentiated lists. The key insight from research is that "recurring" and "subscription" are distinct categories:
- Subscription: confirmed recurring payment for service access (Netflix, Spotify)
- Recurring: automated transaction on a schedule (rent, loan payment, utility)
- One-time: single occurrence

The existing `transactionTagStatus` enum already captures useful signal:
- `converted` = confirmed subscription
- `potential_subscription` = high-confidence recurring pattern
- `not_subscription` = user-dismissed
- `unreviewed` = unknown

**Toggle design:** Segmented control (button group) or tab strip at top of transaction browser. Options:
1. "All" — current behavior
2. "Subscriptions" — filter to `tag_status = 'converted'`
3. "Recurring" — filter to `tag_status IN ('converted', 'potential_subscription')`
4. "Unreviewed" — filter to `tag_status = 'unreviewed'` (power user view)

**Additional filters to include:**
- Account filter (which account/source)
- Date range filter
- Amount range filter (already partially in codebase)

**Implementation:** Add filter state to TransactionBrowser. The keyset pagination query already accepts filter parameters — extend the query to accept `tagStatus` filter. shadcn/ui `ToggleGroup` or `Tabs` for the selector UI. Both are already available.

**Complexity: MEDIUM** — Extending existing infrastructure. The hard part (virtualized scrolling, keyset pagination, bulk operations) is already built. Adding filters is straightforward query extension.

---

### 6. Help Page

**What it is:** Static FAQ and documentation page at `/help`. Answers common questions without requiring support contact.

**Content structure (industry standard):**
- Getting Started (what is this app, how to import first statement)
- Managing Accounts (creating accounts, editing, coverage)
- Subscriptions (what counts as a subscription, how to add manually, how conversion works)
- Transactions (browsing, tagging, bulk operations)
- Billing & Plans (what each tier includes, how to upgrade, cancel)
- Data & Privacy (what data is stored, how to export, deletion)

**Implementation approach:** Next.js static page with hardcoded content. No CMS, no search, no backend. Rationale:
- Content volume is low (6 sections, ~20 FAQ entries) — doesn't justify CMS setup
- No real-time updates needed — content changes with feature releases
- Static rendering = zero server cost, instant load

**UX pattern:** Accordion (`shadcn/ui Accordion`) per section. Each section expands to show Q&A pairs. This is the industry standard pattern (used by Stripe, Linear, Vercel help pages). Accordion allows page scan before reading, reduces scroll depth.

**Anchor links:** Each section and question should have an ID anchor so users can be linked directly to relevant content from other parts of the app (e.g., trial banner links to billing FAQ).

**Complexity: LOW** — Static content, accordion component already in library, no backend needed.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Nav restructure | HIGH — unlocks orientation for all other features | LOW — sidebar reorganization only | P1 |
| Account list page | HIGH — table stakes for "managing" accounts | MEDIUM — new table + migration + API | P1 |
| Source-to-account migration | HIGH — existing users must not lose data | MEDIUM — SQL migration + backfill | P1 |
| Account detail: Overview tab | HIGH — entry point to account detail | LOW — form + stats, composed from primitives | P1 |
| Account detail: Coverage tab | HIGH — reuses existing component, instant value | LOW — component reuse, filter param change | P1 |
| Account detail: Transactions tab | HIGH — primary utility of account page | MEDIUM — TransactionBrowser with account filter | P1 |
| Payment Type Selector | MEDIUM — useful filter, power-user oriented | MEDIUM — query extension + toggle UI | P2 |
| Account detail: Spending tab | MEDIUM — nice summary, not blocking | MEDIUM — new query + chart | P2 |
| Help page | MEDIUM — reduces support burden | LOW — static content | P2 |
| Data Schema viewer | LOW — power-user niche | LOW — static content page | P3 |

**Priority key:**
- P1: Essential to milestone — ship together as coherent feature set
- P2: High value, add in same milestone but can be deferred if scope is tight
- P3: Low cost, low urgency, nice to have

---

## Competitor Feature Analysis

| Feature | Mint/Intuit | YNAB | Monarch Money | Our Approach |
|---------|-------------|------|---------------|--------------|
| Multi-account grouping | By type (Checking, Savings, Credit) | Manual account creation with type | Same as Mint | Accounts table with enum type field |
| Account detail page | Full page per account with balance history, transactions | Full account detail with activity | Rich account pages | Tabs: overview, coverage, transactions, spending |
| Transaction filtering | Category, date, amount filters | Category + payee filters | Advanced filters including recurring | Type toggle (our differentiation) + account + date |
| Navigation structure | Top-level nav by function | Left sidebar with labeled sections | Collapsible sidebar sections | Section labels (fin Vault, payments Portal, Support) |
| Help/docs | Separate help center (Zendesk) | Extensive docs at help.ynab.com | In-app help center | Static in-app page — simpler, no Zendesk cost |
| Data transparency | None | None | None | Schema viewer (differentiator for power users) |

---

## MVP Definition for This Milestone

### Ship Together (v3.0 core)

- [x] Nav restructure — unlocks everything else being findable
- [x] Accounts table + migration + source backfill — entity must exist
- [x] Account list page (`/accounts`) — entry point to data Vault
- [x] Account detail page — Overview + Coverage + Transactions tabs
- [x] Payment Type Selector on `/transactions` — extends existing browser

### Add in v3.0 if scope allows

- [x] Account Spending tab — reuses analytics patterns, high value
- [x] Help page — low cost, reduces support questions post-launch

### Defer to v3.1

- [ ] Data Schema viewer — power-user feature, no blockers, just low urgency
- [ ] Per-account notification preferences — requires alerts system extension

---

## Sources

- Codebase analysis: `src/components/layout/app-sidebar.tsx`, `src/app/(dashboard)/transactions/page.tsx`, `src/app/(dashboard)/vault/page.tsx`, `src/lib/db/schema.ts`
- Previous research: `.planning/research/FEATURES.md` (v2.2 vault), `.planning/research/FEATURES-STATEMENT-HUB.md` (v2.0 statement hub)
- Phase 6 research: `.planning/phases/06-statement-source-tracking/06-RESEARCH.md`
- [Banking App UI Best Practices 2026](https://procreator.design/blog/banking-app-ui-top-best-practices/) — MEDIUM confidence (WebSearch)
- [Multi-level Menu Design Best Practices](https://www.toptal.com/designers/ux/multilevel-menu-design) — MEDIUM confidence (WebSearch)
- [Best UX Practices for Sidebar Menu 2025](https://uiuxdesigntrends.com/best-ux-practices-for-sidebar-menu-in-2025/) — MEDIUM confidence (WebSearch)
- [Personal Finance Apps: What Users Expect in 2025](https://www.wildnetedge.com/blogs/personal-finance-apps-what-users-expect-in-2025) — MEDIUM confidence (WebSearch)
- [Recurring Payments in Digital Banking](https://www.tapix.io/resources/post/recurring-payments-in-digital-banking) — MEDIUM confidence (WebSearch)
- [Fintech UX Best Practices 2026](https://www.eleken.co/blog-posts/fintech-ux-best-practices) — MEDIUM confidence (WebSearch)

---

*Feature research for: Navigation restructure, Account Vault, Payment Type Selector, Schema Viewer, Help Page*
*Researched: 2026-02-22*
