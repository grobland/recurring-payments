# Subscription Manager

## What This Is

A web application for tracking and managing recurring subscriptions. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction with confidence scoring. Features include a dashboard with spending analytics, email reminders before renewals, smart import with transaction date intelligence, and full category management.

## Core Value

Users can see all their subscriptions in one place and never get surprised by a renewal again.

## Current Milestone: v1.3 Data & Intelligence

**Goal:** Transform raw subscription data into actionable insights with duplicate detection, pattern recognition, and comprehensive spending analytics.

**Target features:**
- Duplicate detection (import-time warnings + background scanning)
- Multi-statement pattern recognition (suggest subscriptions from recurring charges)
- Spending trends (month-over-month, year-over-year charts)
- Forecasting (upcoming charges calendar, annual projections)
- Anomaly alerts (price increases, unexpected charges, missed renewals — in-app)

## Current State

**Version:** v1.2 Production Polish (shipped 2026-02-05)
**Codebase:** ~18,800 lines TypeScript, Next.js 16 + Supabase + OpenAI
**Production URL:** https://recurring-payments.vercel.app

**Current capabilities:**
- PDF import with AI-powered extraction and confidence scoring
- Full subscription CRUD with category management
- Dashboard with spending analytics
- Email reminders before renewals
- Production-ready error tracking (Sentry)
- Mobile-responsive design with polished UX
- Structured logging and health monitoring

## Requirements

### Validated

- User authentication with email/password and Google OAuth — v1.0
- Database schema for subscriptions, categories, reminders, billing — v1.0
- Subscription CRUD API endpoints — v1.0
- Dashboard layout with sidebar navigation — v1.0
- PDF import flow with OpenAI GPT-4 Vision — v1.0
- Email reminder templates and cron job — v1.0
- Stripe webhook handling and billing status — v1.0
- Category management with icons — v1.0
- Currency normalization for analytics — v1.0
- Trial system (14-day) — v1.0
- Service configuration (OpenAI, Stripe, Resend, Vercel) — v1.0
- E2E test coverage for CRUD and email reminders — v1.0
- ✓ Show all statement items with confidence scores during import — v1.1
- ✓ Allow user to select which items to import (not just high-confidence) — v1.1
- ✓ Store full statement data for reference (rawExtractionData) — v1.1
- ✓ Capture bank/credit card name as statement source — v1.1
- ✓ Reuse statement source for future imports from same bank — v1.1
- ✓ Calculate renewal date from transaction date on statement — v1.1
- ✓ Fix duplicate categories in edit dropdown — v1.1
- ✓ Add category CRUD (create, update, delete) — v1.1
- ✓ Handle category deletion gracefully (subscriptions become uncategorized) — v1.1
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

### Active

- [ ] Duplicate detection during PDF import (warn if similar subscription exists)
- [ ] Background duplicate scanning (surface potential duplicates for review)
- [ ] Multi-statement pattern detection (identify recurring charges across imports)
- [ ] Subscription suggestions from detected patterns (user confirms to add)
- [ ] Historical spending trends (month-over-month, year-over-year charts)
- [ ] Spending forecasting (upcoming charges calendar, annual projections)
- [ ] Anomaly alerts in-app (price increases, unexpected charges, missed renewals)

### Out of Scope

- Stripe billing flows — deferred to future milestone
- Production domain setup — deferred
- Mobile app — web-first approach (web responsiveness is in scope)
- AI confidence calibration dashboard — complexity; defer until usage data collected
- Multi-statement pattern detection — requires historical data; defer to v1.3+

## Context

**Codebase state:** v1.2 complete. Production-ready with error tracking, structured logging, user-friendly error handling, loading states, and mobile-first responsive design. All 19 v1.2 requirements validated.

**Known issues:**
- Email delivery requires verified Resend domain (RESEND_FROM_EMAIL)
- Sentry requires DSN configuration for error tracking to work (NEXT_PUBLIC_SENTRY_DSN)

**Tech debt:**
- Logging infrastructure (withLogging, actionLog) created but not adopted by all API routes; routes adopt incrementally

**Codebase documentation:** See `.planning/codebase/` for detailed architecture, stack, conventions, and concerns analysis.

## Constraints

- **Platform**: Vercel for hosting (cron jobs configured in vercel.json)
- **Database**: Supabase PostgreSQL (already configured)
- **Budget**: Using free tiers where possible (Stripe test mode, Resend free tier, OpenAI pay-as-you-go)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Configure Stripe now, build billing later | Focus on core features first, billing is secondary | — Pending |
| Dev environment only | Reduce scope, validate features before production | ✓ Good |
| PDF import as priority | Most unique/interesting feature, proves AI integration works | ✓ Good |
| AI returns ALL items with confidence scores | User reported missing items; "be conservative" prompt filtered too aggressively | ✓ Good |
| Confidence thresholds 80/50 (not 70/40) | More conservative auto-selection reduces false positives | ✓ Good |
| Transaction date as source of truth | Renewal dates derived from statement transaction dates, not import date | ✓ Good |
| Click-to-edit date pattern | Cleaner UI than always-visible inputs | ✓ Good |
| Command palette for searchable selectors | Better UX than standard Select, reusable pattern | ✓ Good |
| Delayed skeleton pattern (200ms/300ms) | Prevents flash on fast loads while ensuring smooth UX | ✓ Good |
| Touch target minimum 44px | Follows Apple HIG for mobile usability | ✓ Good |
| Error transformation utility | Technical errors become user-friendly messages | ✓ Good |
| Retry detection pattern | Identifies transient failures for automatic retry | ✓ Good |

---
*Last updated: 2026-02-05 after v1.3 milestone started*
