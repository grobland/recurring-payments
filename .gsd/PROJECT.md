# Subscription Manager

## What This Is

A web application for tracking and managing recurring subscriptions with Stripe-powered billing, a financial data vault, and structured account management. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction. Features include batch PDF import with full statement data retention, PDF storage and in-app viewing, a vault for browsing and organizing original bank statements, coverage visualization with historical upload support, financial account management (Bank/Debit, Credit Card, Loan) with per-account detail pages showing coverage, transactions, and spending, a virtualized transaction browser with payment type filtering, manual tagging and one-click conversion, AI-powered pattern detection, comprehensive spending analytics with forecasting, duplicate detection, anomaly alerts, email reminders before renewals, category management, CSV data export with formula injection protection, three-tier paid subscriptions (Primary/Enhanced/Advanced), feature gating with upgrade prompts, customer portal for subscription management, admin tools for trial extensions and webhook monitoring, static support pages (data schema viewer, help/FAQ), and E2E test coverage with 23 Playwright tests.

## Core Value

Users can see all their subscriptions in one place and never get surprised by a renewal again.

## Current State

**Version:** v4.0 Immutable Ledger (shipped 2026-03-13)
**Codebase:** ~50,500 lines TypeScript, Next.js 16 + Supabase + OpenAI + Stripe
**Production URL:** https://recurring-payments.vercel.app
**Milestone:** M002 complete — 5 slices, 123 unit tests + 23 E2E tests passing

**Current capabilities:**
- Restructured sidebar with 4 groups (Documents, Overview, Manage, Support) and warm oklch theme
- Overlap detection badges on same-category subscriptions with dismissal and auto re-surface
- Dismissible onboarding hints on 5 pages (subscriptions, vault, transactions, dashboard, suggestions)
- Bundle analyzer with before/after treemaps and dynamic recharts imports
- Financial account management (Bank/Debit, Credit Card, Loan) with type-specific fields
- Account detail pages with 4 tabs (Details, Coverage, Transactions, Spending)
- Source-to-account linking with automatic assignment during batch import
- Payment type selector with recurring/one-time filtering and nuqs URL persistence
- Data Schema viewer (21-table card grid) and Help FAQ (6-category accordion)
- 308 permanent redirects for all moved URLs (bookmark compatibility)
- Batch PDF import with drag-and-drop and duplicate detection
- PDF storage in Supabase Storage with non-fatal degradation
- In-app PDF viewer with page navigation and download
- Vault UI with file cabinet view (source-grouped) and timeline calendar grid
- Coverage heat map showing PDF/data/missing per source per month
- Historical upload wizard for filling coverage gaps
- Full statement data retention (all line items, not just subscriptions)
- Virtualized transaction browser with keyset pagination (10k+ items at 60fps)
- Manual tagging with inline combobox and bulk operations
- One-click subscription conversion with 8-second undo
- Source dashboard with coverage visualization and gap detection
- AI-powered pattern detection with auto-tagging during import
- Suggestions page for accepting/dismissing detected patterns
- Full subscription CRUD with category management
- Dashboard with spending analytics (period selector, stat cards, category chart)
- Spending trends (month-over-month, year-over-year, per-category)
- Spending forecasting with calendar view and fan charts
- Duplicate detection during import and background scanning
- Anomaly alerts (price increases, missed renewals)
- Notification bell UI with weekly digest emails
- Email reminders before renewals
- CSV export for subscriptions and transactions with formula injection protection (CWE-1236) and UTF-8 BOM
- Three-tier billing (Primary/Enhanced/Advanced) with Stripe Checkout
- Feature gating with upgrade prompts for locked features
- Stripe customer portal for subscription management (tier switching, billing)
- Grandfathering (original pricing preserved when prices change)
- Voucher/promotion code support in checkout
- Admin trial extension UI with audit trail
- Admin webhook monitoring dashboard
- Admin RBAC with role-based layout and API guards
- Production-ready error tracking (Sentry)
- Mobile-responsive design with polished UX
- Structured logging and health monitoring
- 23 Playwright E2E tests covering auth, subscriptions, vault, analytics, billing, accounts, export, and onboarding

## Requirements

### Validated

**v1.0 MVP:**
- ✓ User authentication with email/password and Google OAuth — v1.0
- ✓ Database schema for subscriptions, categories, reminders, billing — v1.0
- ✓ Subscription CRUD API endpoints — v1.0
- ✓ Dashboard layout with sidebar navigation — v1.0
- ✓ PDF import flow with OpenAI GPT-4 Vision — v1.0
- ✓ Email reminder templates and cron job — v1.0
- ✓ Stripe webhook handling and billing status — v1.0
- ✓ Category management with icons — v1.0
- ✓ Currency normalization for analytics — v1.0
- ✓ Trial system (14-day) — v1.0
- ✓ Service configuration (OpenAI, Stripe, Resend, Vercel) — v1.0
- ✓ E2E test coverage for CRUD and email reminders — v1.0

**v1.1 Import Improvements:**
- ✓ Show all statement items with confidence scores during import — v1.1
- ✓ Allow user to select which items to import (not just high-confidence) — v1.1
- ✓ Store full statement data for reference (rawExtractionData) — v1.1
- ✓ Capture bank/credit card name as statement source — v1.1
- ✓ Reuse statement source for future imports from same bank — v1.1
- ✓ Calculate renewal date from transaction date on statement — v1.1
- ✓ Fix duplicate categories in edit dropdown — v1.1
- ✓ Add category CRUD (create, update, delete) — v1.1
- ✓ Handle category deletion gracefully (subscriptions become uncategorized) — v1.1

**v1.2 Production Polish:**
- ✓ Mobile responsiveness across all pages — v1.2
- ✓ Visual polish (typography, spacing, consistency) — v1.2
- ✓ Loading states and skeleton loaders — v1.2
- ✓ Empty state messages — v1.2
- ✓ User-friendly error messages — v1.2
- ✓ Form validation improvements — v1.2
- ✓ API error handling with retry logic — v1.2
- ✓ Error tracking integration (Sentry) — v1.2
- ✓ Structured logging — v1.2
- ✓ Health check endpoints — v1.2

**v1.3 Data & Intelligence:**
- ✓ Duplicate detection during PDF import (warn if similar subscription exists) — v1.3
- ✓ Background duplicate scanning (surface potential duplicates for review) — v1.3
- ✓ Multi-statement pattern detection (identify recurring charges across imports) — v1.3
- ✓ Subscription suggestions from detected patterns (user confirms to add) — v1.3
- ✓ Historical spending trends (month-over-month, year-over-year charts) — v1.3
- ✓ Spending forecasting (upcoming charges calendar, annual projections) — v1.3
- ✓ Anomaly alerts in-app (price increases, missed renewals) — v1.3
- ✓ Weekly digest email with alert summaries — v1.3

**v2.0 Statement Hub:**
- ✓ Batch PDF import (multiple files at once with sequential processing) — v2.0
- ✓ Statement line item retention (all items stored, not just subscriptions) — v2.0
- ✓ Duplicate statement detection (hash-based with skip/re-import choice) — v2.0
- ✓ Source management dashboard with coverage visualization — v2.0
- ✓ Statement browser with virtualized scrolling (10k+ items at 60fps) — v2.0
- ✓ Keyset pagination for fast queries at any depth — v2.0
- ✓ Potential subscription tagging system (inline combobox) — v2.0
- ✓ Bulk tagging for multiple transactions at once — v2.0
- ✓ Manual item-to-subscription conversion (one-click with undo) — v2.0
- ✓ AI-powered auto-tagging during import (>80% confidence) — v2.0
- ✓ Pattern detection with suggestions page — v2.0
- ✓ Re-import capability for previously skipped items — v2.0
- ✓ Tag management UI in Settings page — v2.0

**v2.1 Billing & Monetization:**
- ✓ Webhook idempotency with database-backed dedup — v2.1
- ✓ Payment failed email notifications — v2.1
- ✓ Three-tier product system (Primary/Enhanced/Advanced) — v2.1
- ✓ Price-to-tier mapping with grandfathering — v2.1
- ✓ Feature gating infrastructure (hasFeature, requireFeature) — v2.1
- ✓ Feature gating UI (FeatureGate, LockedNavItem, upgrade modal) — v2.1
- ✓ Feature gating applied to import API, analytics, sidebar — v2.1
- ✓ Pricing page with feature comparison table — v2.1
- ✓ Customer portal with tier switching and branding — v2.1
- ✓ Voucher/promotion code support in checkout — v2.1
- ✓ Admin trial extension system with audit trail — v2.1
- ✓ Admin RBAC with role-based layout and API guards — v2.1
- ✓ Admin webhook monitoring dashboard — v2.1
- ✓ Stripe Checkout with monthly and annual billing — v2.1

**v2.2 Financial Data Vault:**
- ✓ PDF persistence in Supabase Storage — v2.2
- ✓ In-app PDF viewer for original documents — v2.2
- ✓ Vault UI with file cabinet view (by source, then date) — v2.2
- ✓ Vault UI with timeline view (chronological across sources) — v2.2
- ✓ Coverage visualization grid (PDF stored / data only / missing) — v2.2
- ✓ Historical upload wizard for filling coverage gaps — v2.2
- ✓ View preference persistence (file cabinet / timeline / coverage) — v2.2
- ✓ Empty state with upload CTA for new users — v2.2
- ✓ Non-fatal storage degradation (imports succeed without storage) — v2.2
- ✓ hasPdf boolean API pattern (storage paths never exposed to client) — v2.2

**v3.0 Navigation & Account Vault:**
- ✓ Reorganized sidebar with fin Vault, payments Portal, Support sections — v3.0
- ✓ All existing screens reachable via new menu paths — v3.0
- ✓ Active nav item highlights correctly for nested sections — v3.0
- ✓ 308 redirects for moved URLs (bookmark compatibility) — v3.0
- ✓ Financial account CRUD (Bank/Debit, Credit Card, Loan) with type-specific fields — v3.0
- ✓ Source-to-account linking with auto-assignment during import — v3.0
- ✓ Account list grouped by type on data Vault page — v3.0
- ✓ Account detail pages with coverage, transactions, and spending tabs — v3.0
- ✓ Payment type selector with recurring/one-time URL-persisted filtering — v3.0
- ✓ Data Schema viewer with 21-table card grid — v3.0
- ✓ Help FAQ with 6-category accordion — v3.0

**v3.1 Test & Export:**
- ✓ E2E tests updated with correct v3.0 URLs and pass cleanly — v3.1
- ✓ 23 Playwright tests cover all major user flows (auth, subscriptions, vault, analytics, billing, accounts, export, onboarding) — v3.1
- ✓ Interactive elements use data-testid attributes for reliable test selectors — v3.1
- ✓ User can download active subscriptions as CSV from subscriptions page — v3.1
- ✓ User can download transaction history as CSV from transactions page — v3.1
- ✓ CSV export sanitizes formula injection characters (CWE-1236 prevention) — v3.1
- ✓ CSV files include UTF-8 BOM for correct Excel rendering of international characters — v3.1

**v3.2 UX & Performance:**
- ✓ Overlap detection badges on same-category subscriptions — v3.2
- ✓ Overlap badge dismissal with localStorage persistence — v3.2
- ✓ Dismissed badges re-surface when subscription set changes — v3.2
- ✓ Dismissible onboarding hints on subscriptions, vault, transactions, dashboard, suggestions — v3.2
- ✓ Hint dismissal persists across page refresh — v3.2
- ✓ Plain English sidebar labels with 4 logical groups — v3.2
- ✓ Warm oklch sidebar theme (light and dark modes) — v3.2
- ✓ Refreshed Lucide icons for sidebar nav items — v3.2
- ✓ Feature-gate logic preserved during sidebar redesign — v3.2
- ✓ Bundle treemap generated and committed — v3.2
- ✓ Lighthouse baseline template documented — v3.2
- ✓ optimizePackageImports for lucide-react — v3.2
- ✓ Dynamic imports for recharts (9 components) — v3.2

### Active

## Completed: M002 — Immutable Ledger ✓

**Shipped:** Full line item extraction from all document types with immutable storage, parallel GPT-4o-mini extraction, chunked processing, read-only ledger viewer with CSV export.

**Delivered:**
- ✓ `statement_line_items` table with common + JSONB details per document type
- ✓ Bank statement extraction (98 items from real Lloyds PDF, validated)
- ✓ Credit card extraction function + Zod schema + 12 unit tests
- ✓ Loan extraction function + Zod schema + 11 unit tests
- ✓ Parallel extraction pipeline (subscription + line items via Promise.all)
- ✓ Text chunking at 8K chars to avoid OpenAI timeouts
- ✓ GPT-4o-mini for all extraction (10x faster than GPT-4o)
- ✓ Read-only API (GET only, no mutation endpoints)
- ✓ Reprocess endpoint for backfilling existing statements
- ✓ Ledger tab in statement detail page with type-appropriate columns
- ✓ CSV export with per-type column headers
- ✓ Existing subscription detection preserved and verified

### Out of Scope

- Production domain setup — planned for future milestone
- Mobile app — web-first approach (web responsiveness is in scope)
- AI confidence calibration dashboard — complexity; defer until usage data collected
- Real-time anomaly alerts — alert fatigue risk; weekly batching preferred
- ML-based pattern detection — cold start problem; heuristics sufficient
- Auto-merge duplicates — user trust critical; always require confirmation
- Parallel PDF processing — memory exhaustion risk; sequential is safer
- Free tier forever — creates support burden, no conversion pressure
- Usage-based billing — revenue unpredictability, confusing for consumer app
- Pause subscription — complicates billing logic, rarely resumes
- Crypto payments — regulatory complexity, <1% demand
- Lifetime deals — destroys LTV math, attracts wrong customers
- Complex cancellation flows — FTC enforcement risk
- Team/family plans — defer until product-market fit established
- Referral program — requires tracking infrastructure, defer
- PDF annotation — PSPDFKit costs $400-1200/month; notes field covers use case
- Custom folder organization — conflicts with source-type mental model; file cabinet view IS the folder metaphor
- Full-text search across PDFs — extracted transactions are already searchable
- Bank API integration (Plaid/MX) — compliance burden and cost prohibitive
- Mobile camera upload — breaks PDF-only processing pipeline
- OCR re-extraction — AI cost and complexity not justified
- Multiple sourceType strings per account (junction table) — one-to-one source link sufficient
- Auto-migrate all sources to accounts — user trust; naming/type must be user-controlled
- Account merge/deduplicate UI — trust-destroying in financial context
- Live DB introspection for schema viewer — security risk; static metadata is correct
- Account balance tracking — requires bank API or manual entry

## Context

**Codebase state:** v4.0 complete. Full subscription management platform with immutable line item ledger, structured navigation, financial account management, data vault, billing, monetization, admin tools, CSV export with security hardening, E2E test coverage, overlap detection, onboarding hints, warm sidebar redesign, and performance audit. M001 complete (46 slices). M002 complete (5 slices) — immutable ledger with bank/credit-card/loan extraction, parallel GPT-4o-mini pipeline, line item viewer with CSV export.

**Known issues:**
- Email delivery requires verified Resend domain (RESEND_FROM_EMAIL)
- Sentry requires DSN configuration for error tracking (NEXT_PUBLIC_SENTRY_DSN)
- auth() called twice in import route (minor inefficiency)
- Analytics FeatureGate wraps BASIC_ANALYTICS (primary tier) — never visibly locks for current users
- Existing statements with NULL statementDate remain gray in coverage grid until re-import or backfill
- Old dead-code route files remain at original locations (308 redirects handle compatibility)

**Tech debt:**
- Hooks not re-exported from central index (use-duplicate-scan, useTrends, useForecast*, useAlerts, useTags, useAccount*, etc.)
- Logging infrastructure (withLogging, actionLog) created but not adopted by all API routes
- EvidenceList URL params don't pre-filter transactions (minor UX enhancement)
- PdfStatusIcon duplicated locally in 4 files (6-line component, intentional)
- zodResolver cast as any in AccountForm (z.coerce.number() TypeScript workaround)
- PaymentTypeSelector absent from AccountTransactionsTab (low severity enhancement)

**Env vars needed:**
- NEXT_PUBLIC_SUPABASE_URL (browser-side storage)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (browser-side storage)
- SUPABASE_SERVICE_ROLE_KEY (server-side uploads — no NEXT_PUBLIC_ prefix)

**Database migrations (12 total):**
- 0001-0006: Core schema, analytics MV, patterns, alerts, statements, tags
- 0007-0008: Webhook events, stripe prices
- 0009: Stripe price seeding
- 0010: User role enum for admin RBAC
- 0011: financial_accounts table, accountTypeEnum, accountId FK on statements
- 0012: linkedSourceType column on financial_accounts
- 0013: statement_line_items table, documentTypeEnum (bank_debit, credit_card, loan)

**Codebase documentation:** See `.planning/codebase/` for detailed architecture, stack, conventions, and concerns analysis.

## Constraints

- **Platform**: Vercel for hosting (cron jobs configured in vercel.json)
- **Database**: Supabase PostgreSQL (already configured)
- **Storage**: Supabase Storage (private bucket, service-role key for uploads)
- **Budget**: Using free tiers where possible (Stripe test mode, Resend free tier, OpenAI pay-as-you-go)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dev environment only | Reduce scope, validate features before production | ✓ Good |
| PDF import as priority | Most unique/interesting feature, proves AI integration works | ✓ Good |
| AI returns ALL items with confidence scores | User reported missing items | ✓ Good |
| Materialized view pattern | Fast analytics queries (<100ms) with 15-minute refresh | ✓ Good |
| Sequential PDF processing | Prevents memory exhaustion with 50-100MB files | ✓ Good |
| Keyset pagination | O(1) performance at any depth vs O(n) with OFFSET | ✓ Good |
| Many-to-many tags | Flexible tagging system with junction table | ✓ Good |
| Derive tier from price ID | Query stripe_prices table instead of storing tier column | ✓ Good |
| Null tier = primary | Trial users get primary tier access via coalescing | ✓ Good |
| Insert-on-conflict idempotency | Atomic webhook dedup via PostgreSQL unique constraint | ✓ Good |
| Grandfathering via price comparison | User price vs current active price for same tier/interval | ✓ Good |
| Features as const object | Type-safe via Feature type union, better than enum | ✓ Good |
| Admin routes redirect silently | Don't leak admin route existence to unauthorized users | ✓ Good |
| Role bootstrapped via seed script | Minimal attack surface, auditable admin promotion | ✓ Good |
| ESLint no-unused-vars at warn | Flags dead code without breaking CI | ✓ Good |
| Non-fatal storage pattern | Import always completes even if storage fails | ✓ Good |
| react-pdf two-file split | Worker config must be in same file as Document to prevent fake worker | ✓ Good |
| Signed URLs on-demand | 55-min staleTime, never pre-fetched, avoids stale URL problem | ✓ Good |
| hasPdf boolean at API boundary | Raw storage paths never exposed to client (security + simplicity) | ✓ Good |
| Collapsible not Accordion for vault | Multiple folder cards can be open simultaneously | ✓ Good |
| Coverage cell three-valued state | pdf/data/missing extends hasPdf boolean pattern | ✓ Good |
| statementDate as first-of-month UTC | Avoids timezone ambiguity in coverage grid month mapping | ✓ Good |
| financial_accounts (not accounts) | NextAuth owns accounts table; naming collision is hard constraint | ✓ Good |
| Nullable accountId FK on statements | Existing statements predate accounts; NOT NULL impossible | ✓ Good |
| User-driven source-to-account migration | No automatic backfill; user trust in financial context | ✓ Good |
| nuqs for URL-persisted filters | Shallow updates without scroll reset; only new npm package in v3.0 | ✓ Good |
| isNavItemActive exact match default | Prevents false activation on parent/sibling routes | ✓ Good |
| Raw SQL subquery for payment type | Drizzle inArray doesn't support cross-table subqueries | ✓ Good |
| AccountTransactionsTab self-contained | Avoids breaking global TransactionBrowser while supporting account scoping | ✓ Good |
| Hardcoded SCHEMA_TABLES const | Static snapshot, no live DB introspection (security) | ✓ Good |
| 308 permanent redirects | All moved URLs redirect; preserves bookmarks and email links | ✓ Good |
| waitForURL glob patterns | **/route** survives future query param additions | ✓ Good |
| data-testid kebab-case naming | Stable selectors for E2E tests (component-action format) | ✓ Good |
| Chromium+Firefox only in Playwright | Webkit/Mobile Chrome add no value for Next.js app | ✓ Good |
| Formula injection tab-prefix | CWE-1236 prevention inside escapeCSVValue (private function) | ✓ Good |
| BOM at transport level only | createCSVResponse adds BOM, objectsToCSV does not (prevents double-BOM) | ✓ Good |

| Warm oklch sidebar theme | cream/peach light + charcoal/amber dark — Notion/Todoist aesthetic | ✓ Good |
| Single table + JSONB details | statement_line_items with documentType discriminator, not separate tables | ✓ Good |
| GPT-4o-mini for extraction | GPT-4o caused 3+ min timeouts; mini is 10x faster, accurate for structured data | ✓ Good |
| Text chunking at 8K chars | OpenAI drops connections on responses requiring >60s generation time | ✓ Good |
| Parallel extraction | Subscription + line item extraction via Promise.all, not sequential | ✓ Good |
| No retries for extraction | maxRetries:0 prevents 60s×3 timeout cascade | ✓ Good |
| Signed amount convention | negative=debit, positive=credit; original split in JSONB details | ✓ Good |
| Ledger tab default | Statement detail defaults to Ledger tab when line items exist | ✓ Good |
| localStorage dismissal hooks | Simple boolean for hints, signature-based for overlaps | ✓ Good |
| Client wrapper for ssr:false | Server Components can't use ssr:false; client file pattern | ✓ Good |
| --webpack flag for bundle analyzer | Turbopack incompatible with @next/bundle-analyzer | ✓ Good |

**v4.0 Immutable Ledger:**
- ✓ Immutable statement_line_items table — no update/delete endpoints — v4.0
- ✓ Bank statement line item extraction with normalized fields — v4.0
- ✓ Credit card statement line item extraction with type-specific fields — v4.0
- ✓ Loan statement line item extraction with type-specific fields — v4.0
- ✓ Read-only API for line items (GET only) — v4.0
- ✓ Line item extraction integrated into batch upload pipeline — v4.0
- ✓ Parallel extraction (subscription + line items) — v4.0
- ✓ Chunked GPT-4o-mini extraction for large documents — v4.0
- ✓ Reprocess endpoint for backfilling existing statements — v4.0
- ✓ Line item viewer UI with per-type columns — v4.0
- ✓ CSV export for line items with type-appropriate headers — v4.0
- ✓ Existing subscription detection preserved alongside line items — v4.0

---
*Last updated: 2026-03-13 after M002 milestone complete*
