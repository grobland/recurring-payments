# Subscription Manager

## What This Is

A web application for tracking and managing recurring subscriptions with Stripe-powered billing. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction. Features include batch PDF import with full statement data retention, a virtualized transaction browser, manual tagging and one-click conversion, AI-powered pattern detection, comprehensive spending analytics with forecasting, duplicate detection, anomaly alerts, email reminders before renewals, category management, three-tier paid subscriptions (Primary/Enhanced/Advanced), feature gating with upgrade prompts, customer portal for subscription management, and admin tools for trial extensions and webhook monitoring.

## Core Value

Users can see all their subscriptions in one place and never get surprised by a renewal again.

## Current State

**Version:** v2.1 Billing & Monetization (shipped 2026-02-18)
**Codebase:** ~40,000+ lines TypeScript, Next.js 16 + Supabase + OpenAI + Stripe
**Production URL:** https://recurring-payments.vercel.app

**Current capabilities:**
- Batch PDF import with drag-and-drop and duplicate detection
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

### Active

(No active requirements — define next milestone via `/gsd:new-milestone`)

### Out of Scope

- Production domain setup — planned for future milestone
- Mobile app — web-first approach (web responsiveness is in scope)
- Banking features — planned for v2.2 (Enhanced tier)
- Investing features — planned for v2.3 (Advanced tier)
- AI confidence calibration dashboard — complexity; defer until usage data collected
- Real-time anomaly alerts — alert fatigue risk; weekly batching preferred
- ML-based pattern detection — cold start problem; heuristics sufficient
- Auto-merge duplicates — user trust critical; always require confirmation
- Blob storage for PDF persistence — PDFs processed in-memory, no storage needed
- Parallel PDF processing — memory exhaustion risk; sequential is safer
- Free tier forever — creates support burden, no conversion pressure
- Usage-based billing — revenue unpredictability, confusing for consumer app
- Pause subscription — complicates billing logic, rarely resumes
- Crypto payments — regulatory complexity, <1% demand
- Lifetime deals — destroys LTV math, attracts wrong customers
- Complex cancellation flows — FTC enforcement risk
- Team/family plans — defer until product-market fit established
- Referral program — requires tracking infrastructure, defer to v2.2+

## Context

**Codebase state:** v2.1 complete. Full subscription management platform with billing, monetization, and admin tools. All 116 requirements across 6 milestones validated.

**Known issues:**
- Email delivery requires verified Resend domain (RESEND_FROM_EMAIL)
- Sentry requires DSN configuration for error tracking (NEXT_PUBLIC_SENTRY_DSN)
- auth() called twice in import route (minor inefficiency)
- Analytics FeatureGate wraps BASIC_ANALYTICS (primary tier) — never visibly locks for current users

**Tech debt:**
- Hooks not re-exported from central index (use-duplicate-scan, useTrends, useForecast*, useAlerts, useTags, etc.)
- Logging infrastructure (withLogging, actionLog) created but not adopted by all API routes
- EvidenceList URL params don't pre-filter transactions (minor UX enhancement)
- Blob storage for PDF persistence (currently processed in-memory)

**Database migrations (10 total):**
- 0001-0006: Core schema, analytics MV, patterns, alerts, statements, tags
- 0007-0008: Webhook events, stripe prices
- 0009: Stripe price seeding
- 0010: User role enum for admin RBAC

**Codebase documentation:** See `.planning/codebase/` for detailed architecture, stack, conventions, and concerns analysis.

## Constraints

- **Platform**: Vercel for hosting (cron jobs configured in vercel.json)
- **Database**: Supabase PostgreSQL (already configured)
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

---
*Last updated: 2026-02-18 after v2.1 milestone*
