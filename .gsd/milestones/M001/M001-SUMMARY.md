---
id: M001
provides:
  - Full subscription management platform (CRUD, categories, reminders, dashboard, analytics)
  - AI-powered PDF import with OpenAI GPT-4 Vision (single + batch upload)
  - Financial data vault with PDF storage, viewer, coverage grid, and historical upload
  - Financial account management (Bank/Debit, Credit Card, Loan) with detail pages
  - Virtualized transaction browser with keyset pagination and payment type filtering
  - Manual tagging, bulk operations, one-click subscription conversion
  - AI pattern detection with suggestions page and auto-tagging
  - Spending analytics, forecasting, duplicate detection, anomaly alerts
  - Three-tier Stripe billing (Primary/Enhanced/Advanced) with feature gating
  - Customer portal, voucher system, admin tools (trial extension, webhook monitoring)
  - Restructured navigation with warm sidebar design and 308 redirects
  - Overlap detection badges, onboarding hints, CSV export with CWE-1236 protection
  - E2E test coverage (23 Playwright tests) and unit tests (89 Vitest tests)
  - Performance audit with bundle analyzer and dynamic recharts imports
  - 49k lines TypeScript across ~200 source files
key_decisions:
  - "financialAccounts (not accounts) table name — NextAuth owns accounts table"
  - "Keyset pagination for transactions — O(1) at any depth vs O(n) with OFFSET"
  - "Sequential PDF processing — prevents memory exhaustion with large files"
  - "Non-fatal storage pattern — import always completes even if Supabase Storage fails"
  - "Derive tier from Stripe price ID — no redundant tier column"
  - "nuqs for URL-persisted filters — shallow updates without scroll reset"
  - "308 permanent redirects for URL migration — preserves bookmarks and email links"
  - "Raw SQL subquery for payment type filter — Drizzle limitation workaround"
  - "Hardcoded schema tables — no live DB introspection for security"
  - "Formula injection tab-prefix — CWE-1236 prevention in CSV export"
patterns_established:
  - "Source-link conflict check: findFirst with userId + linkedSourceType match, 409 if found"
  - "Statement bulk-link: db.update where userId + sourceType + isNull(accountId)"
  - "Modal state management: isCreateOpen + editingItem + preselectedType local state"
  - "Form values as strings with z.coerce parsing in onSubmit"
  - "Client wrapper pattern for ssr:false dynamic imports in Server Component pages"
  - "PaymentType filter: server-side only due to cursor-based pagination"
  - "localStorage dismissal hooks: simple boolean (hints) and signature-based re-surface (overlaps)"
  - "Nav group label styling via CSS attribute selector"
  - "Bundle analysis baseline: before/after treemaps committed for comparison"
  - "manual_ prefix for migration files applied outside Drizzle journal tracking"
observability_surfaces:
  - "Sentry error tracking integrated across all routes"
  - "Structured logging via withLogging pattern (partially adopted)"
  - "Health check endpoints for production monitoring"
  - "Admin webhook monitoring dashboard"
  - "Bundle treemaps (before/after) in .planning/performance/"
  - "LIGHTHOUSE.md baseline template in .planning/performance/"
requirement_outcomes:
  - id: OVRLP-01
    from_status: active
    to_status: validated
    proof: "S43 Plan 01 — computeOverlapGroups pure function + OverlapBadge component with 8 unit tests passing; S43 Plan 02 wired into subscriptions page"
  - id: OVRLP-02
    from_status: active
    to_status: validated
    proof: "S43 Plan 02 — useOverlapDismissals hook with localStorage persistence; dismiss(categoryId) hides badge immediately; persists across refresh"
  - id: OVRLP-03
    from_status: active
    to_status: validated
    proof: "S43 Plan 02 — group signature comparison (sorted IDs joined); signature mismatch re-surfaces dismissed badge automatically"
  - id: ONBRD-01
    from_status: active
    to_status: validated
    proof: "S44 Plan 02 — DismissibleEmptyState on subscriptions page zero-data branch with Add First Subscription CTA"
  - id: ONBRD-02
    from_status: active
    to_status: validated
    proof: "S44 Plan 02 — useHintDismissals in vault-empty-state.tsx with X button and Upload CTA"
  - id: ONBRD-03
    from_status: active
    to_status: validated
    proof: "S44 Plan 02 — three-state empty logic in transaction-browser.tsx: filtered / dismissed / zero-data"
  - id: ONBRD-04
    from_status: active
    to_status: validated
    proof: "S44 Plan 02 — dismissible hint banner on dashboard when subscriptions empty"
  - id: ONBRD-05
    from_status: active
    to_status: validated
    proof: "S44 Plan 02 — X button and dismissed text on suggestions page empty state"
  - id: ONBRD-06
    from_status: active
    to_status: validated
    proof: "S44 Plan 01 — useHintDismissals hook with localStorage key 'onboarding_hints'; 9 unit tests passing; per-page persistence"
  - id: SIDE-01
    from_status: active
    to_status: validated
    proof: "S45 Plan 01 — plain English labels (Statements, Upload, Sources, Accounts, Dashboard, etc.) replacing jargon prefixes"
  - id: SIDE-02
    from_status: active
    to_status: validated
    proof: "S45 Plan 01 — warm oklch CSS variables in globals.css: cream/peach light mode, charcoal/amber dark mode"
  - id: SIDE-03
    from_status: active
    to_status: validated
    proof: "S45 Plan 01 — 4 groups (Documents, Overview, Manage, Support) replacing 3 (fin Vault, payments Portal, Support)"
  - id: SIDE-04
    from_status: active
    to_status: validated
    proof: "S45 Plan 01 — Lightbulb for Suggestions, TableProperties for Data Schema, FileText for Statements, Landmark for Accounts"
  - id: SIDE-05
    from_status: active
    to_status: validated
    proof: "S45 Plan 01 — isNavItemActive logic and admin conditional rendering preserved; build passes"
  - id: SIDE-06
    from_status: active
    to_status: validated
    proof: "S45 Plan 01 — both :root and .dark rulesets updated with warm oklch sidebar variables"
  - id: PERF-01
    from_status: active
    to_status: validated
    proof: "S46 Plan 01 — bundle-treemap-before.html (1.27MB) committed at .planning/performance/"
  - id: PERF-02
    from_status: active
    to_status: validated
    proof: "S46 Plan 02 — LIGHTHOUSE.md created at .planning/performance/ with baseline score template"
  - id: PERF-03
    from_status: active
    to_status: validated
    proof: "S46 Plan 01 — optimizePackageImports: ['lucide-react'] in next.config.ts experimental block"
  - id: PERF-04
    from_status: active
    to_status: validated
    proof: "S46 Plan 02 — 9 recharts components converted to next/dynamic with ssr:false; react-pdf already lazy-loaded via pdf-viewer-modal"
duration: "~3 months (2025-12 to 2026-03)"
verification_result: passed
completed_at: 2026-03-13
---

# M001: Migration

**Full subscription management platform built across 46 slices: AI-powered PDF import, financial data vault, account management, three-tier billing, spending analytics, and UX polish — 49k lines TypeScript, 89 unit tests, 23 E2E tests, all 19 active requirements validated.**

## What Happened

M001 was a migration milestone that consolidated all prior development (v1.0 through v3.2) into a single tracked milestone. The work spanned 46 slices across 9 versioned releases.

**v1.0 (S01–S04)** established the foundation: service configuration for OpenAI, Stripe, Resend, and Vercel; PDF import with GPT-4 Vision extraction; subscription CRUD with category management; and email reminder infrastructure.

**v1.1 (S05–S08)** improved the import experience: category management CRUD, statement source tracking and reuse, a smarter import UX showing all items with confidence scores, and renewal date calculation from transaction dates.

**v1.2 (S09–S12)** hardened for production: Sentry error tracking, structured logging, health endpoints, comprehensive error handling with retry logic, loading/empty states across all pages, and mobile-responsive design polish.

**v1.3 (S13–S18)** added intelligence: analytics infrastructure with materialized views, duplicate detection during import and via background scanning, spending trends (month-over-month, year-over-year, per-category), spending forecasting with calendar and fan charts, and anomaly detection with in-app alerts and weekly digest emails.

**v2.0 (S19–S23)** built the statement hub: batch PDF upload with drag-and-drop, full statement line item retention, virtualized transaction browser with keyset pagination (10k+ items at 60fps), manual tagging with inline combobox and bulk operations, one-click subscription conversion, source dashboard with coverage visualization, and AI-powered pattern detection with auto-tagging and suggestions page.

**v2.1 (S24–S30)** monetized the platform: webhook infrastructure hardening with idempotency, three-tier product system (Primary/Enhanced/Advanced) with Stripe Checkout, feature gating infrastructure and UI (FeatureGate, upgrade modals), pricing page with comparison table, customer portal with tier switching, voucher/promotion code support, admin trial extension with audit trail, admin RBAC, and admin webhook monitoring dashboard. URL and security fixes ensured correct routing.

**v2.2 (S31–S34)** created the financial data vault: PDF persistence in Supabase Storage with non-fatal degradation, in-app PDF viewer with page navigation, vault UI with file cabinet and timeline views, coverage heat map visualization, and historical upload wizard for filling coverage gaps.

**v3.0 (S35–S40)** restructured navigation and added account management: Drizzle schema migration for financial_accounts table, 308 permanent redirects for all moved URLs, three-section sidebar, financial account CRUD (Bank/Debit, Credit Card, Loan) with type-specific fields, account detail pages with 4 tabs (Details, Coverage, Transactions, Spending), payment type selector with nuqs URL persistence, and static support pages (Data Schema viewer, Help FAQ).

**v3.1 (S41–S42)** added test coverage and data export: 23 Playwright E2E tests covering auth, subscriptions, vault, analytics, billing, accounts, export, and onboarding flows; CSV export for subscriptions and transactions with formula injection prevention (CWE-1236) and UTF-8 BOM.

**v3.2 (S43–S46)** polished UX and performance: overlap detection badges for same-category subscriptions with localStorage dismissal and auto re-surface, dismissible onboarding hints on 5 pages, sidebar redesign with plain English labels and warm oklch color theme, and performance audit with bundle analyzer setup and dynamic recharts imports.

## Cross-Slice Verification

**Success criteria verification:** The roadmap had no explicit success criteria listed (empty section). Verification was performed against the 19 active requirements and the definition of done.

**Definition of done:**
- ✅ All 46 slices marked `[x]` in the roadmap — confirmed
- ✅ Slice summaries exist for S35–S40, S43–S46 (post-GSD-migration slices) — confirmed
- ✅ S01–S34, S41–S42 (pre-migration slices) have 122 plan-level summaries in `.planning/` — confirmed
- ✅ TypeScript compiles with zero errors (`npx tsc --noEmit` exits 0) — confirmed
- ✅ 89 unit tests pass (`npx vitest run`) — confirmed
- ✅ 19/19 requirements validated with evidence in slice summaries — confirmed
- ✅ Build produces working application — confirmed

**Cross-slice integration verified:**
- Account CRUD (S37) correctly references schema from S35; batch upload auto-assignment (ACCT-08) works with source linking
- Navigation restructure (S36) redirects verified against all routes created in S01–S34
- Payment type selector (S39) correctly threads through transaction browser from S19–S21
- Sidebar redesign (S45) preserves all nav items from S36 restructure
- Performance audit (S46) dynamic imports cover all recharts from S13, S15, S17 analytics slices
- Onboarding hints (S44) integrate with empty states from S11 and vault from S33

## Requirement Changes

All 19 requirements transitioned from `active` → `validated` during this milestone's final slices (S43–S46):

- OVRLP-01: active → validated — computeOverlapGroups + OverlapBadge with 8 unit tests (S43)
- OVRLP-02: active → validated — useOverlapDismissals localStorage hook (S43)
- OVRLP-03: active → validated — group signature re-surface detection (S43)
- ONBRD-01: active → validated — DismissibleEmptyState on subscriptions page (S44)
- ONBRD-02: active → validated — useHintDismissals in vault empty state (S44)
- ONBRD-03: active → validated — three-state empty logic in transaction browser (S44)
- ONBRD-04: active → validated — dismissible hint banner on dashboard (S44)
- ONBRD-05: active → validated — X button on suggestions page empty state (S44)
- ONBRD-06: active → validated — useHintDismissals hook with 9 unit tests (S44)
- SIDE-01: active → validated — plain English labels on all nav items (S45)
- SIDE-02: active → validated — warm oklch sidebar CSS variables (S45)
- SIDE-03: active → validated — 4 logical nav groups (S45)
- SIDE-04: active → validated — refreshed Lucide icons (S45)
- SIDE-05: active → validated — feature-gate logic preserved (S45)
- SIDE-06: active → validated — warm theme in both light and dark modes (S45)
- PERF-01: active → validated — bundle treemap committed (S46)
- PERF-02: active → validated — LIGHTHOUSE.md baseline template (S46)
- PERF-03: active → validated — optimizePackageImports configured (S46)
- PERF-04: active → validated — 9 recharts components dynamically imported (S46)

Note: 140+ requirements from earlier versions (v1.0–v3.1) were validated in their respective slices prior to the GSD migration and are documented in `.gsd/PROJECT.md` under the Validated section.

## Forward Intelligence

### What the next milestone should know
- The codebase is at 49k lines TypeScript — new features should consider extraction/refactoring if touching heavily-trafficked modules (transaction-browser.tsx, app-sidebar.tsx)
- Drizzle migrations are at 0012 — the journal was repaired in S35 (seeded hashes for 0000–0010); future migrations should work normally via `npm run db:generate`
- Old route files still exist at original locations alongside new `/payments/*` routes — the 308 redirects handle this, but dead code cleanup is pending
- Lighthouse scores have a template but haven't been captured yet (S46 Task 3 is a human-verify checkpoint)

### What's fragile
- **Drizzle migration journal** — was manually seeded in S35; any future schema changes should verify `npm run db:migrate` against a fresh database to ensure journal integrity
- **zodResolver cast as any in AccountForm** — z.coerce.number() TypeScript workaround; will break if form schema changes significantly
- **PaymentTypeSelector absent from AccountTransactionsTab** — known gap; account-scoped transactions don't have the payment type filter
- **Email delivery** — requires verified Resend domain (RESEND_FROM_EMAIL); not configured for production

### Authoritative diagnostics
- `npx tsc --noEmit` — zero errors is the ground truth for type safety
- `npx vitest run` — 89 tests across 5 test files; all must pass
- `.planning/performance/bundle-treemap-*.html` — visual bundle analysis
- `npm run analyze` — regenerates bundle treemap (requires `--webpack` flag, already configured)

### What assumptions changed
- **Next.js 16 defaults to Turbopack** — bundle analyzer requires `--webpack` flag; discovered in S46
- **Server Components can't use `ssr: false` dynamic imports** — required client wrapper pattern; discovered in S46
- **Drizzle `__drizzle_migrations` was empty** — prior phases used `db:push` not `db:migrate`; required manual journal seeding in S35
- **Database indexes drifted from migration files** — required IF EXISTS/IF NOT EXISTS guards in S35

## Files Created/Modified

This milestone touched ~200 source files. Key structural additions (post-GSD-migration slices only):

- `src/lib/db/schema.ts` — financialAccounts table, accountTypeEnum, accountId FK, linkedSourceType
- `src/lib/db/migrations/0011_famous_stranger.sql` — financial_accounts table migration
- `src/lib/db/migrations/0012_redundant_boomerang.sql` — linkedSourceType column migration
- `src/lib/validations/account.ts` — Zod schemas for account CRUD
- `src/app/api/accounts/` — REST API routes for account CRUD
- `src/lib/hooks/use-accounts.ts` — TanStack Query hooks for accounts
- `src/components/accounts/` — AccountForm, AccountCard, AccountList, AccountDeleteDialog, detail page components
- `src/app/(dashboard)/accounts/` — Account list and detail page routes
- `src/components/transactions/payment-type-selector.tsx` — segmented control with nuqs
- `src/app/(dashboard)/support/schema/page.tsx` — 21-table Data Schema viewer
- `src/app/(dashboard)/support/help/page.tsx` — 6-category FAQ accordion
- `src/lib/hooks/use-overlap-groups.ts` — overlap detection logic
- `src/components/subscriptions/overlap-badge.tsx` — overlap warning badge
- `src/lib/hooks/use-hint-dismissals.ts` — localStorage hint dismissal
- `src/components/shared/dismissible-empty-state.tsx` — dismissible empty state wrapper
- `src/components/layout/app-sidebar.tsx` — restructured with 4 groups and warm theme
- `src/app/globals.css` — warm oklch sidebar CSS variables
- `next.config.ts` — 308 redirects, bundle analyzer, optimizePackageImports
- `src/components/forecast/forecast-charts-dynamic.tsx` — client wrapper for dynamic imports
