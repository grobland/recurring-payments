# Milestones: Subscription Manager

## v3.1 "Test & Export" (2026-03-02 → 2026-03-03)

**Goal:** Establish E2E test infrastructure and ship CSV export with security hardening.

**What shipped:**
- Fixed broken Playwright E2E auth cascade — updated waitForURL from v1.0 /dashboard to v3.0 **/payments/dashboard** glob pattern
- 23 Playwright E2E smoke tests across 8 spec files covering auth, vault, analytics, billing, accounts, export, overlap, and onboarding flows
- CSV formula injection sanitization (CWE-1236) via tab-prefix for cells starting with =, +, -, @, \t, \r — with 21 unit tests
- UTF-8 BOM support in CSV responses for correct Excel rendering of international characters
- Transaction export API (/api/transactions/export) with full filter passthrough
- Export CSV buttons on both subscriptions and transactions pages with disabled-on-empty-data state

**Phases completed:** 2 (Phases 41-42)
- Phase 41: E2E Test Infrastructure (3 plans)
- Phase 42: CSV Export (2 plans)

**Stats:**
- 5 plans, 11 tasks, 28 commits
- 45 files changed (+6,570 / -1,735 lines)
- ~48,100 lines TypeScript total
- 1 day development

**Requirements:** 7/7 complete
- TEST-01, TEST-02, TEST-03 (E2E Testing)
- EXPRT-01, EXPRT-02, EXPRT-03, EXPRT-04 (Data Export)

**Key decisions:**
- waitForURL glob pattern **/payments/dashboard** to survive future query param additions
- data-testid naming convention: kebab-case component-action format
- Playwright config trimmed to chromium+firefox only (webkit adds no value for Next.js)
- Formula injection sanitization private to escapeCSVValue (not exported separately)
- BOM added at transport level (createCSVResponse) not data level (objectsToCSV)
- Test file in tests/unit/ to match vitest config include pattern

**Deferred to next milestone:** Phases 43-46 (Overlap Detection, Onboarding Hints, Sidebar Redesign, Performance Audit — 19 requirements)

**What's next:** `/gsd:new-milestone` for next milestone planning

---

## Completed Milestones

### v3.0 "Navigation & Account Vault" (2026-02-22 → 2026-02-27)

**Goal:** Restructure the entire navigation into a structured financial hub and introduce account-level management where sources become named accounts with dedicated pages showing coverage, transactions, and spending.

**What shipped:**
- Database foundation with financial_accounts table, accountTypeEnum (bank_debit, credit_card, loan), and nullable accountId FK on statements
- Full navigation restructure into 3 sections (fin Vault, payments Portal, Support) with 308 permanent redirects and 13 new route files
- Complete account CRUD with type-specific fields (credit limit, interest rate, loan term), source linking, and auto-assignment during batch import
- Account detail pages with 4 tabs (Details edit form, Coverage grid, Transactions browser, Spending chart) and account-scoped API endpoints
- Payment type selector with nuqs URL persistence, recurring/one-time classification via SQL subquery, and inline subscription checkbox on recurring rows
- Static support pages (Data Schema with 21-table card grid, Help FAQ with 6-category accordion)

**Phases completed:** 6 (Phases 35-40)
- Phase 35: Database Foundation (2 plans)
- Phase 36: Navigation Restructure (3 plans)
- Phase 37: Account CRUD + List Page (2 plans)
- Phase 38: Account Detail Pages (2 plans)
- Phase 39: Payment Type Selector (2 plans)
- Phase 40: Static Pages (1 plan)

**Stats:**
- 12 plans, 71 commits
- 119 files changed (+20,816 / -288 lines)
- ~47,800 lines TypeScript total
- 6 days development

**Requirements:** 21/21 complete
- NAV-01 through NAV-04 (Navigation Restructure)
- ACCT-01 through ACCT-08 (Account Management)
- DETAIL-01 through DETAIL-04 (Account Detail Pages)
- FILTER-01 through FILTER-03 (Payment Type Selector)
- SCHEMA-01, HELP-01 (Static Pages)

**Key decisions:**
- financial_accounts (not accounts) to avoid NextAuth table collision
- Nullable accountId FK — existing statements predate accounts, NOT NULL impossible
- User-driven source-to-account migration (no automatic backfill)
- nuqs for URL-persisted filter state without scroll reset (only new npm package in v3.0)
- isNavItemActive exact match by default, prefix match only for routes with real children
- Raw SQL subquery for recurringPatterns merchant matching (Drizzle inArray limitation)
- AccountTransactionsTab self-contained (not modifying TransactionBrowser)
- Hardcoded SCHEMA_TABLES const array (no live DB introspection for security)

**Tech debt:**
- Old dead-code route files remain at original locations (308 redirects handle compatibility)
- zodResolver cast as any in AccountForm (z.coerce.number() TypeScript workaround)
- Account hooks not exported from barrel index (direct imports work)
- PaymentTypeSelector absent from AccountTransactionsTab (low severity, not a requirement gap)

**What's next:** `/gsd:new-milestone` for next milestone planning

---

### v2.2 "Financial Data Vault" (2026-02-19 → 2026-02-21)

**Goal:** Transform the app into a financial data vault where users store, organize, and browse original bank statement PDFs with all data extracted into the database.

**What shipped:**
- Supabase Storage integration with non-fatal degradation (PDFs persisted during batch import, graceful fallback if storage unavailable)
- In-app PDF viewer with react-pdf v10, page navigation, and dual signed URLs (inline view + download with Content-Disposition)
- Vault UI at /vault with expandable file cabinet view (source-grouped folders) and interactive timeline calendar grid
- Coverage heat map showing PDF stored / data only / missing per source per month
- Historical upload wizard for filling coverage gaps with statementDate pipeline fix
- hasPdf boolean pattern at API boundary (raw storage paths never exposed to client)

**Phases completed:** 4 (Phases 31-34)
- Phase 31: Storage Foundation (2 plans)
- Phase 32: PDF Viewer (2 plans)
- Phase 33: Vault UI (2 plans)
- Phase 34: Coverage & Historical Upload (3 plans)

**Stats:**
- 9 plans, 50 commits
- 65 files changed (+8,490 / -106 lines)
- 3 days development

**Requirements:** 10/10 complete
- STOR-01, STOR-02 (PDF Storage)
- VIEW-01, VIEW-02 (PDF Viewing)
- VAULT-01, VAULT-02, VAULT-03, VAULT-04 (Vault Browsing)
- VENH-01, VENH-02 (Vault Enhancements)

**Key decisions:**
- Non-fatal storage pattern (uploadStatementPdf returns null on failure, import always completes)
- react-pdf two-file split (inner with worker config + outer with dynamic SSR-disabled wrapper)
- Signed URLs generated on-demand (55-min staleTime, 1-hour expiry)
- Collapsible (not Accordion) for multi-open vault folder cards
- Coverage cell three-valued state machine (pdf/data/missing) extending hasPdf boolean
- Single Radix TooltipProvider wrapping entire coverage grid for performance
- statementDate parsed as first-of-month UTC to avoid timezone ambiguity

**Tech debt:**
- Existing statements with NULL statementDate remain gray in coverage grid until re-import or backfill
- PdfStatusIcon duplicated locally in 4 files (6-line component, intentional to avoid premature abstraction)
- Blob storage for PDF persistence resolved (was v2.0 tech debt)

**What's next:** `/gsd:new-milestone` for next milestone planning

---

### v2.1 "Billing & Monetization" (2026-02-10 → 2026-02-18)

**Goal:** Enable paid subscriptions with three-tier feature access, Stripe integration, and promotional capabilities.

**What shipped:**
- Webhook idempotency with database-backed dedup preventing duplicate processing during Stripe retries
- Three-tier product system (Primary/Enhanced/Advanced) with price-to-tier mapping and grandfathering
- Feature gating infrastructure with server-side access checks (hasFeature, requireFeature) and client-side gate components (FeatureGate, LockedNavItem)
- Pricing & Portal UI with feature comparison table, tier highlighting, and Stripe customer portal
- Voucher system with trial extensions, admin UI, and promotion code support in checkout
- Feature gating applied to import API, analytics page, and sidebar navigation
- Admin RBAC with role-based layout guards, API 403 protection, and conditional sidebar nav

**Phases completed:** 7 (Phases 24-30)
- Phase 24: Webhook Infrastructure Hardening (3 plans)
- Phase 25: Multi-Tier Product Setup (5 plans)
- Phase 26: Feature Gating Infrastructure (2 plans)
- Phase 27: Pricing & Portal UI (3 plans)
- Phase 28: Voucher System (3 plans)
- Phase 29: Apply Feature Gating — gap closure (1 plan)
- Phase 30: Fix URLs & Admin Security — gap closure (2 plans)

**Stats:**
- 19 plans, 94 commits
- 42 source files changed (+16,671 / -247 lines)
- 8 days development

**Requirements:** 14/14 complete
- HOOK-01, HOOK-02 (Webhook Infrastructure)
- TIER-01, TIER-02, TIER-03 (Tier System)
- GATE-01, GATE-02, GATE-03 (Feature Gating)
- PORTAL-01, PORTAL-02, PORTAL-03 (Checkout & Portal)
- VCHR-01, VCHR-02, VCHR-03 (Voucher System)

**Key decisions:**
- Insert-on-conflict idempotency pattern for webhook dedup (PostgreSQL unique constraint)
- Derive tier from stripePriceId lookup (not stored column) for always-accurate tier
- Grandfathering via price comparison (user price vs current active price)
- Features as const object with FEATURE_TIERS mapping (type-safe, no enum)
- Null tier = primary (trial users get primary tier access)
- Admin routes redirect silently (don't leak admin route existence)
- ESLint no-unused-vars at warn (flags dead code without breaking CI)

**Tech debt:**
- auth() called twice in import route (minor inefficiency)
- Analytics FeatureGate wraps BASIC_ANALYTICS (primary tier) — never visibly locks for current users
- No SUMMARY.md files include requirements_completed frontmatter (process gap)

**What's next:** `/gsd:new-milestone` for next milestone planning

---

### v2.0 "Statement Hub" (2026-02-08 → 2026-02-10)

**Goal:** Comprehensive statement management with batch uploads, full data retention, and manual enrichment.

**What shipped:**
- Batch PDF upload with drag-and-drop, sequential processing, and duplicate detection
- Virtualized transaction browser with keyset pagination for 10k+ items at 60fps
- Manual tagging with inline combobox and bulk operations
- One-click subscription conversion with 8-second undo
- Source dashboard with coverage visualization and gap detection
- Statement detail view with re-import capability for skipped items
- AI-powered pattern detection with auto-tagging during import
- Suggestions page with accept/dismiss and bulk operations
- Tag management UI in Settings page

**Phases completed:** 5 (Phases 19-23)
- Phase 19: Batch Upload Foundation (5 plans)
- Phase 20: Statement Browser & Filtering (2 plans)
- Phase 21: Manual Tagging & Conversion (4 plans + 2 gap closures)
- Phase 22: Source Dashboard & Re-import (4 plans)
- Phase 23: AI Suggestions & Pattern Detection (4 plans)

**Stats:**
- 21 plans total (19 + 2 gap closures)
- 82 files modified, 10,886 insertions
- ~36,050 lines TypeScript (up from ~27,350)
- 3 days development

**Requirements:** 27/27 complete
- BATCH-01 through BATCH-05 (Batch Import)
- DATA-01 through DATA-04 (Statement Data)
- BRWS-01 through BRWS-06 (Statement Browser)
- ENRCH-01 through ENRCH-04 (Manual Enrichment)
- SRC-01 through SRC-04 (Source Management)
- AI-01 through AI-04 (AI Suggestions)

**Key decisions:**
- Sequential PDF processing to prevent memory exhaustion (50-100MB per file)
- Keyset pagination (date, id) cursor for O(1) performance at any depth
- TanStack Virtual for virtualized scrolling with IntersectionObserver
- Many-to-many junction table for tags (transactionTags)
- 8-second undo toast pattern for conversions (matches v1.3 patterns)
- Fire-and-forget pattern detection trigger (non-blocking)
- selectedIdsRef pattern for sync access in async callbacks

**Tech debt:**
- TODO: Blob storage for PDF persistence (currently processed in-memory)
- TODO: Parser improvements (current parser meets requirements)
- EvidenceList URL params don't pre-filter (minor UX enhancement)

---

### v1.3 "Data & Intelligence" (2026-02-05 → 2026-02-08)

**Goal:** Transform raw subscription data into actionable insights with duplicate detection, pattern recognition, and comprehensive spending analytics.

**What shipped:**
- Analytics infrastructure with materialized views for fast dashboard queries (<100ms)
- Spending trends (month-over-month indicators, year-over-year charts, per-category trends)
- Spending forecasting with calendar view (30/60/90 days) and fan charts with confidence intervals
- Duplicate detection during import with similarity scoring and merge capabilities
- Pattern recognition detecting recurring charges across statements with subscription suggestions
- Anomaly alerts for price increases (>5% or >$2) and missed renewals (3+ days overdue)
- Notification bell UI with weekly digest emails (Monday 8am UTC)

**Phases completed:** 6 (Phases 13-18)
- Phase 13: Analytics Infrastructure (3 plans)
- Phase 14: Duplicate Detection (4 plans)
- Phase 15: Spending Analytics & Trends (3 plans)
- Phase 16: Pattern Recognition (3 plans)
- Phase 17: Spending Forecasting (4 plans)
- Phase 18: Anomaly Detection & Alerts (4 plans)

**Stats:**
- 21 plans, 100 commits
- 146 files modified
- ~27,350 lines TypeScript
- 4 days development

**Requirements:** 23/23 complete
- DUP-01 through DUP-06 (Duplicate Detection)
- ANLYT-01 through ANLYT-06 (Spending Analytics)
- PTRN-01 through PTRN-03 (Pattern Recognition)
- FCST-01 through FCST-04 (Forecasting)
- ALRT-01 through ALRT-04 (Anomaly Alerts)

**Key decisions:**
- Materialized view pattern for analytics (<100ms queries with 15-minute refresh)
- 70% similarity threshold for duplicate detection (balance accuracy vs false positives)
- sqrt(time) uncertainty scaling for forecast confidence intervals
- Weekly digest batching over real-time alerts (prevent notification fatigue)
- Fire-and-forget pattern triggers (async operations don't block primary request)
- Jaro-Winkler for fuzzy name matching with 0.8 threshold
- Multi-factor confidence scoring for patterns (occurrence 30%, interval 40%, amount 30%)

---

### v1.2 "Production Polish" (2026-02-04 → 2026-02-05)

**Goal:** Make the app production-ready with comprehensive UX refinements, error handling, and reliability improvements.

**What shipped:**
- Sentry error tracking with performance monitoring, session replays, and user context
- Structured logging (Pino) and health check endpoint for production monitoring
- User-friendly error messages with getErrorMessage transformation and retry detection
- Form validation improvements with onBlur validation and inline error messages
- Loading infrastructure with useDelayedLoading hook preventing skeleton flash
- Mobile-first responsive design with 44px touch targets and consistent spacing
- Empty states with helpful guidance and dual CTAs

**Phases completed:** 4 (Phases 9-12)

**Stats:**
- 10 plans, 67 files modified
- ~18,800 lines TypeScript
- 2 days development

**Requirements:** 19/19 complete

---

### v1.1 "Import Improvements" (2026-01-31 → 2026-02-02)

**Goal:** Improve PDF import accuracy and user control, fix data quality issues discovered during testing.

**What shipped:**
- Category management with full CRUD, searchable dropdown, and duplicate prevention
- Statement source tracking with autocomplete from previous imports
- Smart import UX showing ALL detected items with confidence scores (green/yellow/red)
- Renewal date intelligence extracting transaction dates and calculating renewals correctly

**Phases completed:** 4 (Phases 5-8)

**Stats:**
- 11 plans, 57 commits, 70 files modified
- ~17,700 lines TypeScript
- 3 days development

**Requirements:** 18/18 complete

---

### v1.0 "Get It Running" (2026-01-26 → 2026-01-30)

**Goal:** Configure all service integrations and verify the three core features work end-to-end in a deployed environment.

**What shipped:**
- PDF import with OpenAI GPT-4 Vision text extraction
- Subscription CRUD with full E2E test coverage
- Email reminders via Resend with database logging
- Dashboard with spending analytics
- Vercel deployment with cron jobs

**Phases completed:** 4 (Phases 1-4)

**Requirements:** 9/9 complete

---
*Last updated: 2026-02-27*

