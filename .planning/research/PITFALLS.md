# Pitfalls Research

**Domain:** v3.0 Navigation & Account Vault — adding multi-level navigation restructure, account management with type-discriminated schema, source-to-account migration, account detail pages, payment type filtering, data schema viewer, and help page to an existing Next.js 16 App Router + Supabase subscription manager
**Researched:** 2026-02-22
**Confidence:** HIGH (based on direct codebase inspection + official Next.js, Drizzle, and PostgreSQL documentation; confirmed by known community patterns)

---

## Critical Pitfalls

### Pitfall 1: `sourceType` String Is Used as a Primary Key Everywhere — Not a Safe Migration Target

**What goes wrong:**
The existing `statements` table uses a plain `varchar sourceType` (e.g., `"Chase Sapphire"`) as the grouping key for all vault, coverage, and source components. This string appears in 37 files across API routes, hooks, vault components, source components, and transaction types. When the new `financial_accounts` table is introduced and statements get linked via a UUID foreign key (`accountId`), any code that still drives behavior off `sourceType` string will silently ignore the new structure. The worst outcome: account renaming via the new edit form updates the account name but leaves `statements.sourceType` unchanged — the vault grid and coverage API still show the old string and treat renamed accounts as separate sources.

**Why it happens:**
`sourceType` was a pragmatic early decision (v1.1, Phase 6) that deferred a formal accounts table. It is a denormalized string, not a FK. Migration will feel complete once the new table exists and statements have an `accountId` column — but the old string is still queryable and many components will keep using it if not explicitly audited.

**How to avoid:**
- Add `accountId uuid REFERENCES financial_accounts(id)` to `statements` with `ON DELETE SET NULL` (nullable, not null — old statements have no account yet)
- Keep `sourceType` as the display name denormalized on `financial_accounts.name`; drop the column on `statements` only after all consumers are migrated
- Audit every file in the `sourceType` grep result (37 files) before declaring migration complete
- After migration, queries should drive grouping off `accountId`, not off the string
- The source APIs (`/api/sources`, `/api/vault/coverage`, `/api/vault/timeline`) must be updated to JOIN through `financial_accounts` — not retired; only repointed

**Warning signs:**
- Coverage grid still shows the old name after an account is renamed
- Vault file-cabinet groups duplicated (new name AND old name both appear)
- Source filter dropdown on the transaction browser still lists raw `sourceType` strings
- Historical upload wizard auto-fills based on string match, breaks after rename

**Phase to address:** Account schema and migration phase (first account-related phase). Audit and freeze the `sourceType` usage list before writing any new account code. Treat as the top-priority dependency graph item.

---

### Pitfall 2: Adding `accountId` FK to `statements` Fails If Existing Rows Violate NOT NULL

**What goes wrong:**
Drizzle generates a migration that adds `account_id uuid REFERENCES financial_accounts(id)`. If the column is `NOT NULL`, the migration fails immediately because every existing statement row has a NULL value. If it is nullable but then code assumes `accountId` is always present, null-pointer-style TypeScript errors propagate through account detail pages that look up a statement's account.

A second failure mode: the Drizzle migration generator has a documented bug (GitHub issue #4147) where adding a foreign key and a new column in the same migration can generate incorrect SQL — the FK reference may point to the wrong temporary table. Applying this unreviewed migration in production corrupts the schema.

**Why it happens:**
Developers make the column `NOT NULL` thinking every statement should have an account, forgetting that 10 migrations' worth of existing production data has no account concept yet. Or they trust the auto-generated migration SQL without reviewing it.

**How to avoid:**
- Make `accountId` nullable on the `statements` table. This is required — old statements cannot have an account until a backfill runs.
- After adding the column, run a backfill migration that creates one `financial_account` per distinct `sourceType` and sets `statements.account_id` for all matching rows
- Always read the generated `.sql` migration file before `db:migrate` — especially when adding a FK and a new column in the same Drizzle schema change
- Do not add a `NOT NULL` constraint until after backfill is verified complete

**Warning signs:**
- `db:migrate` throws `not-null constraint violation` on the `account_id` column
- Coverage or vault APIs return empty arrays because the JOIN on `accountId` drops all rows where it is NULL
- Account detail pages crash with "Cannot read property of null" for statements that predate the account system

**Phase to address:** Account schema and migration phase. The backfill migration must be the second migration in the sequence — add nullable column first, backfill second.

---

### Pitfall 3: Route Restructure Breaks Existing Pathname-Based Active Link Logic

**What goes wrong:**
The current sidebar uses `pathname === item.href` for exact matches and `pathname.startsWith(item.href)` for prefix matches. After restructuring into a multi-section sidebar with sections like "fin Vault," "payments Portal," and "Support," several existing routes will move. For example, `/sources` will likely become `/accounts` or `/vault/accounts`. Any hardcoded path string in `app-sidebar.tsx`, breadcrumb definitions, or `isActive` checks that references the old paths will silently show no active state or an incorrect active item.

Worse: existing pages export `DashboardHeader` breadcrumbs with hardcoded `href` values like `{ label: "Dashboard", href: "/dashboard" }`. If the route hierarchy changes such that "Dashboard" becomes `/` or nests under a section prefix, all breadcrumb trails for existing pages become incorrect without touching those individual page files.

**Why it happens:**
Path strings are duplicated across the sidebar config array, individual page breadcrumb props, and any `router.push()` calls in client components. There is no central route constants file. When routes move, each duplication must be found and updated manually.

**How to avoid:**
- Create `src/lib/constants/routes.ts` before restructuring — a single export of all named routes (`ROUTES.DASHBOARD = "/dashboard"`, `ROUTES.ACCOUNTS = "/accounts"`, etc.)
- Refactor the sidebar nav items array to use `ROUTES.*` constants
- Update DashboardHeader breadcrumb props in individual page files to reference constants, not strings
- The isActive check for section-level nav items with sub-pages must use `pathname.startsWith(item.href)` — not exact equality — to keep the parent section highlighted when a child route is active
- After restructuring, test every nav item in both collapsed and expanded sidebar states; active highlight is easy to miss in the collapsed icon-only view

**Warning signs:**
- No nav item appears highlighted after clicking a restructured section
- Clicking the old `/sources` path results in a 404 (not redirected to the new route)
- Multiple nav items appear active simultaneously (prefix collision — e.g., `/vault` prefix matching both `/vault/accounts` and `/vault`)
- Breadcrumbs point to old URLs that no longer resolve

**Phase to address:** Navigation restructure phase (must come first, before any new account/detail pages are added, since those new routes must be defined in the new structure from the start).

---

### Pitfall 4: Old Routes Have No Redirect — Existing Users Get 404 After Deployment

**What goes wrong:**
When routes are renamed (e.g., `/sources` becomes `/accounts`, `/transactions` moves to a new section), any user who has that URL bookmarked, cached in their browser, or deep-linked from a notification email (renewal reminders link back to the app) will land on a 404 page after the deployment. This is particularly damaging for renewal reminder emails that were sent before the deployment and contain hardcoded URLs like `/subscriptions/[id]`.

**Why it happens:**
Developers focus on the new routes and forget to handle the old ones. The 404 is invisible in development because the developer always navigates to the new paths. It only appears when existing sessions or bookmarks are used.

**How to avoid:**
- Add permanent redirects (308) in `next.config.ts` for every URL that moves:
  ```js
  redirects: async () => [
    { source: '/sources', destination: '/accounts', permanent: true },
    // Add one entry per moved route
  ]
  ```
- Do NOT use `permanent: true` for routes that may move again — start with temporary (307) and finalize to permanent (308) only when the URL structure is locked
- Audit all outbound links in email templates (reminder, trial-ending, payment-failed) for hardcoded paths before deployment
- For internally linked deep routes (e.g., `/subscriptions/[id]`), keep existing paths intact if they are included in email templates — do not rename until email templates are updated

**Warning signs:**
- 404 errors in Vercel access logs on the day after deployment
- User-reported "that link in the email doesn't work"
- Sentry captures 404 events at the old route patterns

**Phase to address:** Navigation restructure phase — add redirects as part of the nav work, not as a cleanup step after. Each route that moves gets a redirect in the same commit.

---

### Pitfall 5: Type-Discriminated Account Fields Using Nullable Columns Without CHECK Constraints Creates Inconsistent Data

**What goes wrong:**
The new `financial_accounts` table will have a `type` field (bank/debit, credit card, loan) with type-specific fields (e.g., `creditLimit`, `interestRate` for credit cards; `routingNumber` for bank accounts). The temptation is to add all fields as nullable columns on the single table and rely on application code to fill in the correct subset. Without a CHECK constraint enforcing which fields must be non-null for each type, the database accepts logically invalid rows: a loan account with `creditLimit` populated, a bank account with `interestRate` set, or a credit card account with a routing number. TypeScript discriminated unions enforce this at compile time, but TypeScript types are erased at runtime — a malformed API request or a future developer's mistake can write inconsistent data.

**Why it happens:**
PostgreSQL does not natively support discriminated union types. Nullable columns on a single table is the simplest implementation. CHECK constraints that enforce cross-column invariants feel like over-engineering for a new feature.

**How to avoid:**
Add a PostgreSQL CHECK constraint that enforces which fields are populated per account type:
```sql
ALTER TABLE financial_accounts
ADD CONSTRAINT type_field_consistency CHECK (
  (type = 'bank_debit' AND credit_limit IS NULL AND interest_rate IS NULL) OR
  (type = 'credit_card' AND routing_number IS NULL) OR
  (type = 'loan' AND routing_number IS NULL AND credit_limit IS NULL)
);
```
If the type-specific fields are few (2-3 per type), a simpler approach is `JSONB` for type-specific metadata — the base table stores `type`, `name`, `accountId`; a `metadata JSONB` column stores the type-specific data. This avoids nullable column sprawl entirely and is validated at the application layer via Zod schemas keyed to the `type` value.

**Warning signs:**
- Account form submits successfully but type-specific fields from another type are present in the DB row
- Coverage grid shows loan accounts with a credit limit badge
- TypeScript errors disappear but incorrect data appears in the UI after a schema change

**Phase to address:** Account schema design phase. Decide between nullable columns + CHECK constraint vs. JSONB metadata before writing the migration — changing the approach after data exists requires a second migration.

---

### Pitfall 6: TanStack Query Cache Not Invalidated After Account Name Change — Stale Data Appears Across Multiple Pages

**What goes wrong:**
When a user renames an account via the account edit form, the mutation calls `PATCH /api/accounts/[id]` and invalidates the `["accounts"]` query key. However, the vault coverage grid (`useVaultCoverage`), the vault timeline (`useVaultTimeline`), the source dashboard (`useSources`), and the transaction browser (`useTransactions`) all contain the `sourceType` string (which becomes the account name). These components are powered by separate query keys (`["vault", "coverage"]`, `["vault", "timeline"]`, etc.) that are NOT invalidated by the account mutation. The user renames "Chase Sapphire" to "Chase Checking," saves, sees the account list update — but the vault grid still shows "Chase Sapphire" until a manual page refresh.

**Why it happens:**
Query invalidation is only as complete as the invalidation list in the mutation's `onSuccess` handler. Developers invalidate the query they edited but forget all the derived views that embed the same data. As coverage and account data is progressively unified, the fan-out invalidation set grows.

**How to avoid:**
When implementing the account PATCH mutation, invalidate all known query keys that contain account/source name data:
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["accounts"] });
  queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
  queryClient.invalidateQueries({ queryKey: ["vault", "timeline"] });
  queryClient.invalidateQueries({ queryKey: ["sources"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] }); // if sourceType is in filter options
};
```
Alternatively, after the accounts migration is complete, query keys that previously started with `["sources"]` should be retired in favor of `["accounts"]`, and the vault coverage/timeline queries should embed account name via JOIN rather than storing it independently.

**Warning signs:**
- Renaming an account updates the account list but not the vault grid
- Transaction browser still shows the old account name in the filter dropdown
- Coverage cells show a mix of old and new names for the same account after rename
- Stale name persists until the component unmounts and remounts (navigation away and back)

**Phase to address:** Account CRUD phase (account edit form). Document the full query invalidation fan-out in the mutation handler — do not discover it post-deployment via user reports.

---

### Pitfall 7: Multi-Level Sidebar isActive Logic Causes Multiple Items to Appear Simultaneously Active

**What goes wrong:**
The current sidebar uses two patterns: `pathname === item.href` (exact) for most items and `pathname.startsWith(item.href)` (prefix) for settings. When restructuring to sections with sub-items, a route like `/vault/accounts/[id]/transactions` will match `startsWith("/vault")`, `startsWith("/vault/accounts")`, AND `startsWith("/vault/accounts/[id]")` simultaneously. All three levels appear highlighted. This is visually broken and confusing.

The secondary issue: the section-level "fin Vault" label is not a link — it is just a `SidebarGroupLabel`. If the designer wants the section header itself to be clickable (linking to an overview page like `/vault`), the existing shadcn `SidebarGroupLabel` does not support `asChild`. Adding an `<a>` inside it breaks the DOM structure.

**Why it happens:**
Prefix matching is the correct approach for hierarchical nav, but without an explicit depth check, every ancestor segment matches. The shadcn sidebar component was designed for single-level navigation items and its `SidebarGroupLabel` does not take an `asChild` prop.

**How to avoid:**
For each item, define an explicit `isActive` function rather than relying on `startsWith` alone:
```ts
// Match exactly OR match as parent of deeper routes, but NOT match sibling sections
function isItemActive(pathname: string, href: string, children?: string[]): boolean {
  if (pathname === href) return true;
  if (children?.some(child => pathname.startsWith(child))) return true;
  return pathname.startsWith(href + "/");
}
```
For section-level links (if the section header should be clickable), wrap a `SidebarMenuItem` + `SidebarMenuButton` styled to look like a header rather than attempting to extend `SidebarGroupLabel`.

**Warning signs:**
- Two or more sidebar items appear highlighted on the same route
- Section header is not clickable even though the design calls for it
- Clicking a child page deselects the parent section item

**Phase to address:** Navigation restructure phase — define the isActive logic for the new multi-level structure before adding any account or sub-pages.

---

### Pitfall 8: Account Detail Pages With Dynamic Route Segments Break the Coverage Grid's `sourceType`-Keyed API

**What goes wrong:**
Account detail pages will use the route `/accounts/[accountId]` (or `/vault/accounts/[accountId]`). The coverage grid and source-statements API currently key everything off `sourceType` (a string). The historical upload modal (`historical-upload-modal.tsx`) sends `sourceType` as a query parameter to determine which source to fill gaps for. The reimport wizard similarly uses `sourceType` to fetch the relevant statements. When the account detail page is reached via `[accountId]`, these components need the account's `sourceType` string to remain compatible with existing APIs — OR the APIs must be updated to accept `accountId` UUID instead.

If account detail pages pass `accountId` to the coverage component but the coverage API only understands `sourceType`, the grid will render empty. The API update and the component update must be in sync.

**Why it happens:**
Account detail is a new concept layered onto a coverage system that was not designed with FK-based account identity. The first instinct is to pass the `accountId` from the URL params into the existing `useSources`, `useVaultCoverage`, or `useSourceStatements` hooks — but those hooks fetch by `sourceType` string.

**How to avoid:**
- On the account detail page, fetch the account by `accountId` first, extract `account.name` (the display name = former `sourceType`)
- Pass `account.name` as the source type filter to the existing coverage and statement hooks until the APIs are migrated to accept `accountId`
- In a subsequent phase, migrate the coverage API to accept `accountId` as an optional query param (prefer UUID over string; fall back to string for backward compat during transition)
- Do NOT attempt to do the API migration and the UI page simultaneously — they will break each other

**Warning signs:**
- Account detail page loads but coverage grid is empty
- Statement list on account detail shows zero items (API filtering by accountId that the source-statements API doesn't recognize)
- Historical upload modal shows sources from other accounts (sourceType-based filtering not scoped to this account)

**Phase to address:** Account detail pages phase. The transition strategy (name-passthrough vs. full API migration) must be decided before writing the page component.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `sourceType` string on `statements` forever (no FK migration) | Avoids migration complexity | Cannot rename accounts without breaking coverage; cannot query by account type; no referential integrity | Never — the entire v3.0 value prop requires proper account identity |
| Hardcode new route strings in sidebar instead of using a `ROUTES` constants file | Faster to write | Same paths repeated in sidebar, breadcrumbs, email templates, `router.push()` — each must be updated manually on every move | Acceptable for MVP; add `ROUTES` constants before the nav structure is considered stable |
| Add all type-specific fields as nullable columns (no CHECK constraint) | Simpler migration | Inconsistent data; credit card fields set on loan accounts; TypeScript guards erased at runtime | Acceptable in MVP if the UI strictly controls which fields appear per type; add CHECK constraint before v4.0 |
| Invalidate only the direct query key in account mutations | Simpler mutation handlers | Stale data in vault, coverage, and transaction views after account rename | Never — stale financial data shown after a user action is a trust failure |
| Implement nav restructure and account pages in one phase | Fewer deployments | Mixing routing concerns with data model concerns makes rollback impossible; debugging is harder | Never — separate navigation restructure from account schema migration |
| Static help page as raw HTML without a component structure | Fastest to ship | Cannot reuse FAQ items, cannot localize, cannot add search later | Acceptable if help page is truly static and minimal; do not wire to CMS until needed |
| Skip breadcrumb updates for moved routes | Saves time per page | Breadcrumbs point to 404 routes; users cannot navigate back contextually | Never for routes that are user-facing destinations |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `statements.sourceType` → `financial_accounts.id` migration | Add `accountId` as NOT NULL immediately | Add nullable, backfill, then add a NOT NULL default only if truly required; leave nullable for legacy statements |
| TanStack Query + account rename | Invalidate `["accounts"]` only | Invalidate all query keys that embed account name: coverage, timeline, sources, transactions |
| shadcn SidebarGroupLabel + clickable section headers | Add `<a>` tag inside `SidebarGroupLabel` | Use `SidebarMenuItem` + `SidebarMenuButton` styled as a group header instead |
| Next.js `usePathname` + multi-level active state | `pathname.startsWith(href)` at all levels | Scope prefix matching to the deepest specific segment; exact-match for terminal leaf items |
| Account detail page + coverage grid | Pass `accountId` to old `sourceType`-keyed coverage hook | Read `account.name` from the account fetch; pass name to existing hooks; migrate the hook to accept `accountId` in a later phase |
| Drizzle migration + FK + new column in same schema change | Trust the auto-generated migration SQL | Always read the generated `.sql` file; FK + column added in same migration is a known Drizzle bug (issue #4147) |
| Routing restructure + email templates with hardcoded paths | Restructure routes, forget emails | Audit all email templates for `/subscriptions`, `/settings/billing`, and other deep links before any route rename deploys |
| Data schema viewer + Drizzle introspection | Generate schema dynamically by introspecting the live database | Use a static snapshot of the schema definitions (read from `schema.ts` at build time or keep a maintained static data structure) — live introspection adds DB latency to a read-only page |
| Payment type filter + transaction `tagStatus` enum | Add a new enum value for "payment type" category | The existing `transactionTagStatusEnum` maps to user review state, not payment type; add a separate `paymentType` column or derive it from the subscription conversion logic rather than conflating with tag status |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Account detail page fetches all statements for the account without pagination | Account detail loads slowly for accounts with 24+ months of statements | Add limit/offset or cursor pagination to the account-scoped statement API | Accounts with 12+ statements (~100+ transactions per account) |
| Spending summary per account runs aggregation on every page load | Account detail spending section takes 2-4s to load | Cache the spending aggregation query (TanStack Query staleTime 5 min); or compute in a materialized view update | Accounts with 1000+ transactions |
| Nav restructure causes all sidebar items to re-render on every route change | Sidebar flickers or stutters on navigation | Memoize nav item active-state calculations; ensure the sidebar is rendered in a layout that does not unmount on navigation (it is — the dashboard layout wraps it) | Always visible on navigation-heavy user flows |
| Data schema viewer dynamically queries the live database to generate the schema display | Schema page adds a DB query to every load | Read schema definitions from a static data structure built at compile time from `schema.ts` exports | Every page load — unnecessary DB cost for a read-only informational page |
| Payment type filter with multiple toggles triggers separate API calls per toggle | Transaction browser flickering with each toggle change | Debounce filter changes by 300ms; combine all active filters into a single query param before sending the API request | Every user interaction with the filter UI |
| Account list page loads all accounts + all statements count per account in N+1 queries | Accounts page loads slowly with 5+ accounts | Use a single JOIN query with COUNT aggregation; no per-account sub-queries from the UI layer | 3+ accounts |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Account API (`/api/accounts/[id]`) does not verify that the account belongs to the requesting user | Any authenticated user can read or modify another user's account by guessing a UUID | Always include `WHERE userId = session.user.id AND id = params.id` in account queries; never trust UUID alone as an authorization mechanism |
| Data schema viewer exposes real column names and table structure to any user | Internal schema knowledge aids SQL injection or targeted attacks | The schema viewer shows Drizzle ORM model names, not raw SQL column names; never expose connection strings, migration history, or actual SQL `INFORMATION_SCHEMA` output |
| Account type-specific fields (routing number for bank accounts) stored in plaintext | Routing numbers + account-level context = partial account info for phishing | Routing numbers are public (not secret) but should not appear in API responses unless explicitly requested; mask partial routing numbers in the UI (show last 4 digits only) |
| New account CRUD routes skip the existing `isUserActive` billing check | Trial-expired users can still create accounts via the API | Apply the same `isUserActive(session.user)` guard used in subscription routes to all account API routes |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Nav restructure deploys and existing `/sources` bookmark 404s with no explanation | User thinks the app is broken; trust failure | Add a redirect AND a helpful message in the 404 page: "The Sources page has moved — find it in the fin Vault section" |
| Account type selector shows all type-specific fields regardless of type selection | Bank account form shows credit limit field; confusing | Use conditional rendering — only show fields relevant to the selected type; hide other fields with zero layout shift |
| Account detail page has four sub-sections (details, coverage, transactions, spending) with no tab or scroll anchoring | User lands on account detail and does not find transactions (they scroll past it) | Use tab navigation or anchor links within the detail page to jump to the desired sub-section |
| Renaming an account does not update the breadcrumb on the current detail page | User renames account, breadcrumb still shows old name | Invalidate the account query key on successful rename; the detail page re-fetches the account name from TanStack Query |
| Payment type filter UI resets when user navigates away and back | User sets up a complex filter, clicks a transaction, hits back, filter is gone | Persist filter state in URL search params (not component state); allows bookmarking and back-navigation |
| Help page is added as a static route with no link from error states | Users who hit an error have no discoverable path to help | Add a "View Help" link in the generic error boundary and in empty states where the user is likely confused |
| Account list empty state does not explain what accounts are or how they relate to existing sources | New users see an empty list and do not know what to add | Empty state for accounts should say "Your bank and credit card accounts from imported statements will appear here — or add one manually" with a visual reference to existing sources |

---

## "Looks Done But Isn't" Checklist

- [ ] **Nav restructure complete:** All new sections render — verify that every existing page route still works (no 404s) and every old route that moved has a redirect configured in `next.config.ts`
- [ ] **Account migration complete:** `financial_accounts` table exists and `statements.accountId` is set — verify by querying `SELECT COUNT(*) FROM statements WHERE account_id IS NULL` after the backfill migration; should be 0 for all non-legacy rows
- [ ] **Coverage grid post-migration:** Coverage grid renders for an account — verify that renaming the account updates the coverage grid header label without requiring a page refresh
- [ ] **isActive correct at all depths:** Sidebar shows correct active item — navigate to `/vault/accounts/[id]/transactions` and verify that only the accounts item (not dashboard, not subscriptions) is highlighted; verify that the vault section group is also highlighted
- [ ] **Account API user-scoping:** Account CRUD works — attempt to read another user's account UUID via the API (requires a test user); confirm 404 or 403 is returned, not the account data
- [ ] **Type-specific fields:** Credit card account form shows credit limit field — create a bank account and verify `creditLimit` is NULL in the database; create a credit card and verify `routingNumber` is NULL
- [ ] **Payment type filter:** Toggle between "recurring payments" and "subscriptions" — verify the transaction count changes; verify toggling both off shows an empty state, not all transactions
- [ ] **Query invalidation fan-out:** Rename an account — verify that the vault coverage grid, vault timeline, source dashboard, and transaction browser all reflect the new name without a page refresh
- [ ] **Redirect from old routes:** Navigate to `/sources` after deployment — verify it redirects to the new account/sources URL, not 404
- [ ] **Help page linked from nav:** Help page renders correctly — verify the link appears in the Support section of the sidebar and is accessible to trial, active, and expired users (no feature gate required for a help page)
- [ ] **Data schema viewer:** Renders all tables — verify no DB query is triggered (check network tab); verify no raw SQL or connection metadata is exposed in the response

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| `sourceType` string data inconsistent after partial account migration | MEDIUM | Run a one-off backfill script that re-scans `statements.sourceType` and creates missing `financial_accounts` rows; update `accountId` FK for any NULLs |
| Account rename left stale data in vault/coverage/transactions views | LOW | Force a TanStack Query cache reset via `queryClient.clear()` from a settings action or by adding missing invalidation keys to the account PATCH mutation |
| Route restructure caused 404s for existing users | LOW | Add redirects in `next.config.ts` immediately; deploy as a hotfix; existing bookmarks and email deep links resolve again within minutes |
| Type-inconsistent data (wrong fields set for account type) | LOW-MEDIUM | Add a one-time cleanup migration that NULLs out fields not appropriate for each account type; add CHECK constraint going forward |
| Multi-level sidebar active state broken (wrong item highlighted) | LOW | Fix the `isActive` logic in `app-sidebar.tsx`; no data migration required |
| Account detail coverage grid empty after API migration mismatch | LOW | Revert the account detail page to pass `account.name` to the old `sourceType`-keyed hook while the API migration is completed |
| `NOT NULL` constraint migration fails on existing statements | MEDIUM | Roll back the migration; re-apply with nullable column; run backfill; re-apply NOT NULL only after verifying all rows have values |
| Payment type filter conflating `tagStatus` with payment type | MEDIUM | Add a separate `paymentType` or `transactionType` column to `transactions`; migrate existing data based on `convertedToSubscriptionId` presence; retire the conflated filter UI |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `sourceType` used as identity everywhere (37 files) | Account schema phase — audit all usages before writing any migration | `grep -r sourceType src/ --include="*.ts" --include="*.tsx"` returns 0 unexpected consumers post-migration |
| NOT NULL FK migration fails on existing data | Account schema phase — nullable column + backfill migration pair | `SELECT COUNT(*) FROM statements WHERE account_id IS NULL` = 0 after backfill |
| Route restructure breaks active link detection | Navigation restructure phase — define isActive logic first | Navigate to every route; verify exactly one sidebar item is highlighted per route |
| Old routes 404 without redirects | Navigation restructure phase — redirects added with the restructure | Access all previous route paths after deployment; confirm all redirect to new destinations |
| Type-discriminated fields without CHECK constraint | Account schema design phase | Insert an invalid combination via direct DB query; confirm constraint rejects it |
| TanStack Query stale data after account rename | Account CRUD phase — document full invalidation fan-out | Rename an account; verify vault, coverage, timeline, and transaction filter all reflect new name without refresh |
| Multi-level sidebar active state collisions | Navigation restructure phase — implement `isActive` before sub-pages exist | Navigate to all depth levels; verify only one item per depth level is active |
| Account detail page breaks coverage grid | Account detail phase — agree on sourceType passthrough strategy before coding | Account detail coverage grid shows correct cells for the account; historical upload wizard opens with correct source pre-filled |
| Missing query-key fan-out invalidation | Account CRUD phase | Integration test: rename account, assert all five query keys show updated data |
| Payment type filter conflates `tagStatus` | Payment type filter phase — define the data model for type classification before the UI | Toggle "subscriptions" filter; verify only `convertedToSubscriptionId IS NOT NULL` rows appear; toggle "recurring" filter; verify different rows appear |
| Data schema viewer hitting live DB | Data schema viewer phase | Open browser DevTools Network tab while loading schema viewer; confirm zero database API calls |

---

## Sources

**Official documentation (HIGH confidence):**
- [Next.js App Router redirects — next.config.js redirects reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects)
- [Next.js permanentRedirect function — 308 vs 307 behavior](https://nextjs.org/docs/app/api-reference/functions/permanentRedirect)
- [Next.js usePathname hook — client-side pathname in App Router](https://nextjs.org/docs/app/getting-started/linking-and-navigating)
- [TanStack Query invalidateQueries — query invalidation reference](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [Drizzle ORM migration pitfalls — bug report: FK + column added in same migration generates incorrect SQL (issue #4147)](https://github.com/drizzle-team/drizzle-orm/issues/4147)
- [PostgreSQL CHECK constraints — cross-column constraint syntax](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL zero-downtime FK addition — validate constraint pattern](https://travisofthenorth.com/blog/2017/2/2/postgres-adding-foreign-keys-with-zero-downtime)
- [PostgreSQL NOT NULL migration on existing rows — squawk linter documentation](https://squawkhq.com/docs/adding-not-nullable-field)

**Codebase evidence (HIGH confidence — direct inspection):**
- `src/components/layout/app-sidebar.tsx` — `pathname === item.href` and `pathname.startsWith(item.href)` active link logic confirmed; will require extension for multi-level sections
- `src/lib/db/schema.ts` — `statements.sourceType varchar` confirmed as denormalized string with no FK; `accounts` table confirmed as NextAuth OAuth accounts (naming conflict risk with new financial accounts table)
- `grep sourceType src/` — 37 files confirmed as consumers; full migration audit required
- `src/lib/hooks/use-vault-coverage.ts` — `CoverageSource.sourceType: string` confirmed as the identifier throughout coverage data model
- `src/lib/features/config.ts` — `FEATURES` const object pattern confirmed; new account management features should follow this pattern if feature-gated
- `src/app/api/sources/route.ts` — groups by `statements.sourceType` confirmed; API must be updated to support account-based querying
- `.planning/codebase/CONCERNS.md` — `accounts` table naming collision noted (NextAuth uses `accounts` table); new financial accounts table must use a distinct name (e.g., `financial_accounts`)

**Community patterns (MEDIUM confidence — verified against codebase structure):**
- [Modelling discriminated unions in Postgres — single table + check constraint pattern](https://weiyen.net/articles/modelling-discriminated-unions-in-postgres/)
- [shadcn Nested Sidebar Items — collapsible multi-level pattern](https://www.shadcn.io/patterns/collapsible-sidebar-1)
- [App Router pitfalls — active link detection, error.tsx, caching](https://imidef.com/en/2026-02-11-app-router-pitfalls)
- [TanStack Query + Next.js App Router cache invalidation discussion (issue #3037 — invalidateQueries behavior across route changes)](https://github.com/TanStack/query/discussions/3037)

---

**Critical naming collision note:** The existing `schema.ts` already exports an `accounts` table (line 120) for NextAuth OAuth provider accounts. A new `financial_accounts` table for bank/credit card/loan accounts MUST use a different name. Calling it `accounts` would conflict with the existing NextAuth table, break DrizzleAdapter, and silently corrupt OAuth login flows.

---
*Pitfalls research for: v3.0 Navigation & Account Vault — nav restructure, account management, source migration, account detail pages, payment type filtering, data schema viewer, help page*
*Researched: 2026-02-22*
