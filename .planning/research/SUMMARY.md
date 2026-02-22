# Project Research Summary

**Project:** Subscription Manager — v3.0 Navigation & Account Vault
**Domain:** Financial account management, multi-level navigation restructure, payment type filtering, data schema viewer
**Researched:** 2026-02-22
**Confidence:** HIGH

## Executive Summary

v3.0 adds structured financial account management, navigation reorganization, and payment type filtering to a mature ~48,000-line Next.js 16 + Supabase subscription manager. The core architectural change is replacing the denormalized `statements.sourceType` string (used as an implicit account identity across 37 files) with a proper `financial_accounts` table and FK relationship. This migration is the single biggest risk in the milestone — it must be done carefully and in stages, with a full audit of existing consumers before any new code is written on top of it. The naming collision between NextAuth's existing `accounts` table (at `schema.ts` line 120) and the new financial accounts concept is a hard constraint: the new table must be named `financial_accounts` with no exceptions.

The recommended approach is purely additive and composed of existing primitives. Only one new npm package is needed: `nuqs@^2.8.8` for URL-persisted filter state on the transaction browser payment type toggle. All sidebar navigation primitives (`SidebarMenuSub`, `Collapsible`), schema tooling (Drizzle ORM, pgEnum), form libraries (React Hook Form + Zod discriminated unions), and query infrastructure (TanStack Query) are already installed and in use. The account management, schema viewer, help page, and payment type filter are all buildable without additional dependencies. Build order is tightly constrained by dependencies: database schema must come first, then account CRUD APIs and hooks, then account detail pages, then navigation restructure, then payment type filter, and finally static pages.

The top risks beyond the naming collision are: stale TanStack Query caches after account renames spreading across five separate query keys (vault coverage, vault timeline, sources, transactions, and accounts), multi-level sidebar active-state collisions when using naive `startsWith` matching across a three-section hierarchy, and old routes returning 404s for existing users after the navigation restructure deploys. Each risk has a concrete, implementation-ready prevention strategy. The `sourceType`-to-FK migration in particular should be treated as a first-class audit task rather than a side effect of adding the new table.

## Key Findings

### Recommended Stack

The existing stack requires no significant additions for v3.0. All five feature areas — multi-level sidebar navigation, account management, source-to-account migration, data schema viewer, and payment type filtering — are buildable with already-installed packages. The single new dependency is `nuqs@^2.8.8`, a 6 kB URL search-param state manager, needed because Next.js App Router's `useSearchParams` is read-only in client components and writing requires `router.push()` which resets the virtualized transaction list's scroll position. The `NuqsAdapter` wrapper must be added to `src/app/providers.tsx`.

The `financial_accounts` table uses a single-table pattern with nullable type-specific columns and a Zod discriminated union schema for validation at the API boundary. The schema viewer is a React Server Component rendering a static metadata object — no diagramming library, no live DB introspection round-trip. The payment type filter maps `paymentType` URL param values to groupings of the existing `tagStatus` enum at the API layer — no new schema column is required.

**Core technologies:**
- `nuqs@^2.8.8` — URL-persisted filter state for payment type toggles — replaces `useState + router.push` boilerplate; prevents scroll reset on filter change in the virtualized transaction browser
- `radix-ui` Collapsible (already installed at ^1.4.3) — collapsible sidebar sections — zero new install; import from existing `collapsible.tsx`
- `SidebarMenuSub` + `SidebarMenuSubButton` (already installed, generated component) — nested nav items — all exported from `sidebar.tsx` lines 640-720
- Drizzle ORM `pgEnum` + `pgTable` (already installed at ^0.45.1) — `financial_accounts` table + `accountTypeEnum` — follows identical pattern to 8 existing enums in schema.ts
- Zod `z.discriminatedUnion` (already installed at ^4.3.5) — type-safe account form validation — same resolver integration as existing subscription form schemas
- TanStack Query (already installed at ^5.90.19) — account CRUD hooks and filtered transaction queries — same `useQuery/useMutation` pattern as `use-sources.ts`

### Expected Features

**Must have (table stakes):**
- `financial_accounts` table + `accountTypeEnum` DB migration — the entire milestone depends on this schema change; everything else is blocked until the migration runs
- Account CRUD UI (list page, detail page with four tabs, create/edit form with type-discriminated conditional fields, account type badge)
- Source migration banner — prompts users to link existing `sourceType` strings to new typed account records; the user-driven migration approach is recommended over automatic backfill
- Navigation restructure into three named sections (fin Vault, Payments Portal, Support) with new Accounts, Schema, and Help items registered in the new structure
- Payment type filter (All / Recurring / Subscriptions toggle group) on the transaction browser, URL-persisted via nuqs

**Should have (differentiators):**
- Account detail coverage tab reusing existing `CoverageGrid` component without modification
- Account detail spending summary (SUM aggregation scoped to account via new `/api/accounts/[id]/spending` route)
- Source-to-account auto-link — when creating an account, optionally link an existing `sourceType` string and backfill `statements.accountId` in the same API call
- `ROUTES` constants file in `src/lib/constants/routes.ts` to prevent path string duplication across sidebar, breadcrumbs, and `router.push()` calls

**Defer (v2+):**
- Interactive ER diagram (React Flow) for the schema viewer — static RSC is sufficient for the current read-only documentation requirement
- CMS-driven help page — static JSX in `help/page.tsx` is correct for infrequently-changing FAQ content; upgrade only if content change frequency justifies the infrastructure
- `NOT NULL` constraint on `statements.accountId` — leave nullable; add only after a complete backfill migration is verified
- Full-text search across vault PDF contents — extracted transactions are already searchable in the existing UI

### Architecture Approach

The architecture is a layered extension of the existing Next.js 16 App Router application. New routes (`/accounts`, `/accounts/[id]`, `/schema`, `/help`) are added to the `(dashboard)` route group. New API routes (`/api/accounts`, `/api/accounts/[id]` and four sub-routes) follow the established pattern from existing source and statement APIs. Three existing components require surgical modification: `app-sidebar.tsx` (flat 13-item nav array split into three named section groups), `transaction-filters.tsx` (payment type toggle group added), and `transaction-browser.tsx` (`accountId?: string` prop added). All other components — including `CoverageGrid`, vault page components, subscription components, billing, auth, and analytics — are entirely untouched.

The account detail page uses a tab pattern with lazy independent data loading: each tab fetches its own data via its own hook only when first visited. TanStack Query caches all tab data after first visit so tab switching is instant thereafter. The `CoverageGrid` component is reused verbatim in the account coverage tab; the account-scoped coverage API returns data in the same `{ sources: CoverageSource[], months: string[] }` shape as the existing vault coverage hook.

**Major components:**
1. `financial_accounts` DB table + `accountTypeEnum` + nullable `accountId` FK on `statements` — data layer foundation; migration 0011
2. Account CRUD layer (`/api/accounts` routes + `use-accounts.ts` hooks + Zod discriminated union schema) — standard Drizzle + TanStack Query pattern; no new patterns
3. `AccountDetailTabs` — assembles existing `CoverageGrid` and `TransactionBrowser` with account-scoped data; neither child component changes
4. Modified `AppSidebar` — splits flat nav into three named section groups using already-installed shadcn `SidebarGroup` + `Collapsible` primitives
5. Payment type filter — maps `paymentType` URL param to `tagStatus` conditions at the API layer; `nuqs` manages URL state; no schema column needed
6. `SchemaViewerPage` (RSC) — static metadata object rendered with shadcn Table; zero DB queries, zero client JS, zero new packages

### Critical Pitfalls

1. **`sourceType` string embedded in 37 files — not just the schema.** Migration feels complete once the `financial_accounts` table exists and the FK column is added to `statements`, but the vault coverage API, source dashboard, vault timeline, and transaction browser all still query by `sourceType` string. Prevention: run `grep -r sourceType src/` before writing any migration logic; audit all 37 consumers; repoint APIs to JOIN through `financial_accounts` rather than retiring them outright. Treat this as the top-priority dependency graph item.

2. **`accounts` naming collision with NextAuth DrizzleAdapter.** The existing `schema.ts` exports an `accounts` table at line 120 for NextAuth OAuth provider accounts. Naming the new financial accounts table `accounts` would silently corrupt OAuth login flows. Prevention: name it `financial_accounts` from the start. No exceptions.

3. **TanStack Query cache not invalidated after account rename — stale data in five places.** The `PATCH /api/accounts/[id]` mutation must invalidate not just `["accounts"]` but also `["vault", "coverage"]`, `["vault", "timeline"]`, `["sources"]`, and `["transactions"]`. Prevention: document the full fan-out invalidation list in the mutation's `onSuccess` handler before writing the account edit form. This is a trust failure if discovered post-deployment.

4. **Multi-level sidebar active-state collisions.** `pathname.startsWith(href)` matches all ancestor segments simultaneously — `/vault/accounts/[id]/transactions` would highlight the vault section, the accounts item, and any transaction sub-item at once. Prevention: implement an explicit `isItemActive(pathname, href, children?)` function using either exact equality or parent-of-deep-routes logic, not naive prefix matching.

5. **Old routes returning 404 for existing users after navigation restructure.** Any route that moves must have a 308 redirect added in `next.config.ts` in the same commit. Email templates for renewal reminders, trial-end, and payment-failed notifications may contain hardcoded deep links — audit these before any route rename deploys. Prevention: add redirects as part of the navigation restructure commit, not as a cleanup step after.

## Implications for Roadmap

The build order is tightly constrained by dependencies. The schema must exist before any account API; the account API must exist before the detail page; the detail page should exist before the nav restructure is finalized so new routes are registered correctly in the new section structure from the start. Payment type filter and static pages are fully independent and can run in parallel or be deferred without blocking anything else.

### Phase 1: Database Foundation
**Rationale:** Every account feature in v3.0 depends on the `financial_accounts` table and `accountTypeEnum` existing in the database. This must be the first phase — nothing else can be built until the schema is in place. The migration also introduces the nullable `accountId` FK on `statements`, which is the linchpin of the entire `sourceType` migration strategy.
**Delivers:** `financial_accounts` table with `accountTypeEnum`, nullable `accountId` FK on `statements`, Drizzle relations, migration 0011. No UI is built in this phase. The migration is the only deliverable, and it must be reviewed manually before running.
**Addresses:** Account management data model; establishes the entity FK that replaces the denormalized string
**Avoids:** NOT NULL migration failure on existing statement rows (Pitfall 2 — column must be nullable because all existing statements predate the account concept); `accounts` naming collision with NextAuth (name the table `financial_accounts`); Drizzle FK + column in same migration SQL generation bug — always read the generated `.sql` file before running `db:migrate`

### Phase 2: Account CRUD (API + Hooks + List Page)
**Rationale:** The account detail page depends on account CRUD existing. The source migration banner depends on accounts being queryable. This phase establishes the complete account data lifecycle before any display-heavy work begins.
**Delivers:** `GET/POST /api/accounts` (create with optional source linking), `GET/PATCH/DELETE /api/accounts/[id]`, `use-accounts.ts` hooks (`useAccounts`, `useAccount`, `useCreateAccount`, `useUpdateAccount`, `useDeleteAccount`), `AccountForm` with type-discriminated conditional fields, `AccountList` page with empty state, `AccountCard`, `AccountTypeBadge`, `SourceMigrationBanner`.
**Uses:** Zod `z.discriminatedUnion`, React Hook Form, TanStack Query — all existing patterns
**Avoids:** Type-inconsistent data in DB (Pitfall 5 — nullable columns with Zod validation at API boundary; optionally add PostgreSQL CHECK constraint in this phase); missing `isUserActive` billing guard on new API routes (apply the same guard used in subscription routes); missing query invalidation fan-out on PATCH mutation (document all five query keys before writing the mutation)

### Phase 3: Account Detail Page
**Rationale:** Depends on account CRUD (Phase 2) and reuses the existing `CoverageGrid` and `TransactionBrowser` components. Building this before the nav restructure ensures the route `/accounts/[id]` is correctly placed in the new section structure from the start, avoiding double-touch of breadcrumb and nav code.
**Delivers:** `AccountDetailTabs` (details, coverage, transactions, spending tabs), four account-scoped API routes (`/coverage`, `/transactions`, `/spending`, inherited from base), `useAccountCoverage` and `useAccountSpending` hooks, account detail page at `/accounts/[id]`.
**Implements:** Lazy tab data loading pattern; `CoverageGrid` reuse with account-scoped coverage API returning the same `{ sources, months }` shape; `TransactionBrowser` reuse by passing `accountId` prop
**Avoids:** Duplicate TransactionBrowser anti-pattern (pass `accountId` prop; never rebuild the virtualized browser); coverage API mismatch during transition (pass `account.name` to existing sourceType-keyed hooks while the API migration completes; do not attempt both simultaneously)

### Phase 4: Navigation Restructure
**Rationale:** Should come after new pages exist so the routes being added to the sidebar are known and testable before the restructure deploys. The restructure itself is a mechanical split of the flat nav array into three named section groups — low code complexity but high breakage risk if redirects and active-state logic are not implemented correctly.
**Delivers:** Modified `AppSidebar` with fin Vault / Payments Portal / Support sections; Accounts, Schema, and Help nav items; `ROUTES` constants file at `src/lib/constants/routes.ts`; 308 redirects in `next.config.ts` for any moved routes; explicit `isItemActive` function for multi-level active state detection.
**Avoids:** Active-state collisions at multiple depth levels (Pitfall 7 — explicit isActive function, not naive startsWith); old route 404s for existing users (Pitfall 4 — redirects added in same commit as route moves); breadcrumbs pointing to 404 URLs (use ROUTES constants throughout)

### Phase 5: Payment Type Filter
**Rationale:** Fully independent of account work. Can be built in parallel with Phases 2-4 or deferred to here. The filter maps a new URL param to groupings of the existing `tagStatus` enum at the API layer — no schema change required.
**Delivers:** `paymentType` toggle group (All / Recurring / Subscriptions) in `TransactionFilters`, `useQueryState` from nuqs managing the filter URL state, `/api/transactions/route.ts` updated to translate `paymentType` to `tagStatus IN (...)` conditions, `NuqsAdapter` added to `src/app/providers.tsx`.
**Uses:** `nuqs@^2.8.8` — the only new npm package for the entire v3.0 milestone
**Avoids:** Scroll reset on filter toggle (nuqs shallow updates preserve the virtualized list scroll position); conflating `tagStatus` with `paymentType` at the schema level (map at API query layer only; `tagStatus` enum stays unchanged); multiple simultaneous API calls per toggle (debounce filter changes 300ms before sending)

### Phase 6: Static Pages (Schema Viewer + Help)
**Rationale:** Zero dependencies on any other phase. Can be done any time or de-prioritized if earlier phases run long. Both pages are zero-JS React Server Components with static content.
**Delivers:** `SchemaViewerPage` at `/schema` (RSC + static metadata object describing all tables + shadcn Table rendering), `HelpPage` at `/help` (static FAQ content); both linked from the Support section of the restructured sidebar from Phase 4.
**Avoids:** Live DB introspection on schema viewer (static metadata only — `information_schema` queries add latency, require extra permissions, and return raw Postgres type names rather than application-level descriptions); CMS over-engineering for help page content

### Phase Ordering Rationale

- Schema before CRUD before UI is a hard dependency chain — the DB table must exist before API routes reference it, and API routes must exist before React components can call them.
- Navigation restructure deferred to Phase 4 because existing pages work fine with the old nav during development; restructuring earlier would require updating page breadcrumbs twice (once for new routes, once for structural changes).
- Payment type filter (Phase 5) is isolated — it touches exactly three existing files (`transaction-filters.tsx`, `use-transactions.ts`, `api/transactions/route.ts`) plus `providers.tsx` for the NuqsAdapter, and can be parallelized or deferred without blocking anything else.
- Static pages (Phase 6) have zero runtime dependencies and zero risk — they are last only because they have the lowest priority if time runs short.

### Research Flags

Phases needing closer attention during execution:

- **Phase 1 (Database Foundation):** Always read the generated `.sql` migration file before running `db:migrate`. Drizzle has a documented bug (GitHub issue #4147) where adding a FK and a new column in the same migration can generate incorrect SQL. Verify manually before applying.
- **Phase 2 (Account CRUD):** The `sourceType`-to-account migration strategy requires a final decision: user-driven only (create accounts manually, link sources via the UI) vs. optional one-click backfill (auto-create accounts from distinct `sourceType` strings). Architecture research recommends user-driven; confirm with product intent before building the source migration banner. Also run `grep -r sourceType src/` and audit all 37 consumers before writing any migration logic.
- **Phase 3 (Account Detail):** Decide the coverage API transition strategy before writing the account detail page: pass `account.name` to existing sourceType-keyed hooks as a bridge (recommended — lower risk, two-step), or migrate the coverage API to accept `accountId` simultaneously (higher risk, one-step). The two-step approach is recommended.
- **Phase 4 (Nav Restructure):** Audit all email templates for hardcoded paths before deploying any route renames. Renewal reminder, trial-end, and payment-failed emails may contain deep links to routes that will move.

Phases with standard patterns (skip additional research):

- **Phase 5 (Payment Type Filter):** nuqs is well-documented with official Next.js App Router adapter. The `tagStatus`-to-`paymentType` mapping is explicit and verified against the existing transactions API.
- **Phase 6 (Static Pages):** Standard RSC pattern; shadcn Table and Accordion components are well-understood in this codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings verified against `package.json`, official docs, and direct codebase inspection. `nuqs@^2.8.8` version confirmed via `npm view nuqs version` on 2026-02-22. Only one new package needed for the entire milestone. |
| Features | HIGH | v3.0 account management features are well-defined from direct codebase analysis. Vault features context from prior v2.2 milestone research is established infrastructure being extended, not redesigned. |
| Architecture | HIGH | All patterns derived from direct codebase analysis of existing files. Component reuse paths (CoverageGrid at `src/components/vault/coverage-grid.tsx`, TransactionBrowser at `src/components/transactions/transaction-browser.tsx`) verified against actual component prop interfaces. |
| Pitfalls | HIGH | Critical pitfalls are evidence-based: `sourceType` in 37 files confirmed by direct grep; `accounts` naming collision confirmed by `schema.ts` line 120; Drizzle FK bug is a documented GitHub issue (#4147); TanStack Query invalidation fan-out confirmed by tracing all consumers of account name data. |

**Overall confidence:** HIGH

### Gaps to Address

- **Transaction amount sign convention (Phase 5 prerequisite):** STACK.md identifies two possible implementations for payment type filtering. Option A (signed amounts — positive=debit, negative=credit) requires no schema change. Option B (always-positive amounts with direction lost at import) requires adding a `transactionType` enum column to `transactions` as migration 0012. Verify the actual data in the `transactions` table before starting Phase 5 — check whether amounts in imported statements are signed or always positive. Run: `SELECT amount FROM transactions LIMIT 50` and inspect.
- **`sourceType` migration scope and strategy:** The architecture research recommends user-driven account creation (no automatic backfill). Confirm this is acceptable: existing users who already have years of imported statements will need to manually create account records and link their sources. If this friction is unacceptable, design a one-click "Import accounts from sources" feature that auto-creates `financial_accounts` rows from distinct `sourceType` strings with `type = NULL` requiring user completion.
- **CHECK constraint decision (Phase 1):** Two approaches for enforcing type-discriminated fields are viable: nullable columns with a PostgreSQL CHECK constraint enforcing cross-column consistency (safer, more complex migration), or nullable columns only relying on Zod validation at the API boundary (simpler, relies on application-layer enforcement). Decide before Phase 1 migration is generated — changing the approach after data exists requires a second migration.

## Sources

### Primary (HIGH confidence)
- `src/components/layout/app-sidebar.tsx` — current nav structure, SidebarGroup composition, `pathname.startsWith` active link patterns
- `src/lib/db/schema.ts` — complete database schema (13 tables), `accounts` table naming collision at line 120, existing enum patterns confirmed
- `src/app/api/transactions/route.ts` lines 19-25 — keyset pagination, `tagStatus` filter translation, existing URL param handling verified
- `src/components/vault/coverage-grid.tsx` — `CoverageGridProps` interface verified for reuse without modification
- `src/lib/hooks/use-sources.ts` — canonical TanStack Query hook pattern (`entityKeys`, `staleTime: 2 * 60 * 1000`) for all new hooks to follow
- `src/components/ui/sidebar.tsx` lines 640-720 — `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` exports confirmed present
- `src/components/ui/collapsible.tsx` — `Collapsible` from `"radix-ui"` already in use in `folder-card.tsx`
- shadcn/ui sidebar docs (https://ui.shadcn.com/docs/components/sidebar) — `SidebarMenuSub`, Collapsible pattern, `SidebarGroupLabel asChild` limitation
- nuqs official site (https://nuqs.dev/) — type-safe URL params, `NuqsAdapter` requirement for Next.js App Router, 6 kB gzipped size
- Next.js `useSearchParams` docs — read-only limitation in client components confirmed (official docs)
- Next.js App Router redirects reference (https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) — 308 vs 307 behavior, `next.config.ts` syntax
- PostgreSQL CHECK constraints (https://www.postgresql.org/docs/current/ddl-constraints.html) — cross-column constraint syntax for discriminated union enforcement
- Drizzle ORM GitHub issue #4147 — FK + column in same migration SQL generation bug confirmed

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md` (2026-01-24) — prior architecture analysis confirming layered pattern
- `.planning/phases/06-statement-source-tracking/06-RESEARCH.md` — sourceType history and prior decisions
- Competitor vault analysis (Dext, FutureVault, SmartVault) — coverage visualization and historical upload wizard confirmed as differentiators with no competitor equivalents
- TanStack Query invalidateQueries reference (https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) — fan-out invalidation pattern
- shadcn Nested Sidebar Items pattern (https://www.shadcn.io/patterns/collapsible-sidebar-1) — collapsible multi-level sidebar

### Tertiary (LOW confidence)
- [Fintech UX in 2026 — what users expect](https://www.stan.vision/journal/fintech-ux-in-2026-what-users-expect-from-modern-financial-products) — general UX pattern reference for account management UI expectations
- [Modelling discriminated unions in Postgres](https://weiyen.net/articles/modelling-discriminated-unions-in-postgres/) — single table + CHECK constraint pattern (community article, verified against official PostgreSQL docs)

---
*Research completed: 2026-02-22*
*Ready for roadmap: yes*
