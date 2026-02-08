# Subscription Manager

## What This Is

A web application for tracking and managing recurring subscriptions. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction with confidence scoring. Features include a dashboard with comprehensive spending analytics, trend visualization, spending forecasting with confidence intervals, duplicate detection with merge capabilities, pattern recognition for suggested subscriptions, anomaly alerts for price changes and missed renewals, email reminders before renewals, and full category management.

## Core Value

Users can see all their subscriptions in one place and never get surprised by a renewal again.

## Current State

**Version:** v1.3 Data & Intelligence (shipped 2026-02-08)
**Codebase:** ~27,350 lines TypeScript, Next.js 16 + Supabase + OpenAI
**Production URL:** https://recurring-payments.vercel.app

**Current capabilities:**
- PDF import with AI-powered extraction and confidence scoring
- Full subscription CRUD with category management
- Dashboard with spending analytics (period selector, stat cards, category chart)
- Spending trends (month-over-month, year-over-year, per-category)
- Spending forecasting with calendar view and fan charts
- Duplicate detection during import and background scanning
- Pattern recognition with subscription suggestions
- Anomaly alerts (price increases, missed renewals)
- Notification bell UI with weekly digest emails
- Email reminders before renewals
- Production-ready error tracking (Sentry)
- Mobile-responsive design with polished UX
- Structured logging and health monitoring

## Requirements

### Validated

**v1.0 MVP:**
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

**v1.1 Import Improvements:**
- Show all statement items with confidence scores during import — v1.1
- Allow user to select which items to import (not just high-confidence) — v1.1
- Store full statement data for reference (rawExtractionData) — v1.1
- Capture bank/credit card name as statement source — v1.1
- Reuse statement source for future imports from same bank — v1.1
- Calculate renewal date from transaction date on statement — v1.1
- Fix duplicate categories in edit dropdown — v1.1
- Add category CRUD (create, update, delete) — v1.1
- Handle category deletion gracefully (subscriptions become uncategorized) — v1.1

**v1.2 Production Polish:**
- Mobile responsiveness across all pages — v1.2
- Visual polish (typography, spacing, consistency) — v1.2
- Loading states and skeleton loaders — v1.2
- Empty state messages — v1.2
- User-friendly error messages — v1.2
- Form validation improvements — v1.2
- API error handling with retry logic — v1.2
- Error tracking integration (Sentry) — v1.2
- Structured logging — v1.2
- Health check endpoints — v1.2

**v1.3 Data & Intelligence:**
- Duplicate detection during PDF import (warn if similar subscription exists) — v1.3
- Background duplicate scanning (surface potential duplicates for review) — v1.3
- Multi-statement pattern detection (identify recurring charges across imports) — v1.3
- Subscription suggestions from detected patterns (user confirms to add) — v1.3
- Historical spending trends (month-over-month, year-over-year charts) — v1.3
- Spending forecasting (upcoming charges calendar, annual projections) — v1.3
- Anomaly alerts in-app (price increases, missed renewals) — v1.3
- Weekly digest email with alert summaries — v1.3

### Active

(No active requirements - awaiting next milestone planning)

### Out of Scope

- Stripe billing flows — deferred to future milestone
- Production domain setup — deferred
- Mobile app — web-first approach (web responsiveness is in scope)
- AI confidence calibration dashboard — complexity; defer until usage data collected
- Real-time anomaly alerts — alert fatigue risk; weekly batching preferred
- ML-based pattern detection — cold start problem; heuristics sufficient
- Auto-merge duplicates — user trust critical; always require confirmation

## Context

**Codebase state:** v1.3 complete. Full analytics suite with forecasting, pattern recognition, and anomaly detection. All 74 requirements across 4 milestones validated.

**Known issues:**
- Email delivery requires verified Resend domain (RESEND_FROM_EMAIL)
- Sentry requires DSN configuration for error tracking to work (NEXT_PUBLIC_SENTRY_DSN)

**Tech debt:**
- Hooks not re-exported from central index (use-duplicate-scan, useTrends, useForecast*, useAlerts, etc.)
- Logging infrastructure (withLogging, actionLog) created but not adopted by all API routes

**Database migrations required:**
- 0002_create_analytics_mv.sql - analytics materialized view
- 0002_gorgeous_surge.sql - mergedAt/mergedIntoId columns
- 0003_old_azazel.sql - recurring_patterns table
- 0004_modern_argent.sql - alerts table and alert_type enum

**Codebase documentation:** See `.planning/codebase/` for detailed architecture, stack, conventions, and concerns analysis.

## Constraints

- **Platform**: Vercel for hosting (cron jobs configured in vercel.json)
- **Database**: Supabase PostgreSQL (already configured)
- **Budget**: Using free tiers where possible (Stripe test mode, Resend free tier, OpenAI pay-as-you-go)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Configure Stripe now, build billing later | Focus on core features first, billing is secondary | — Pending |
| Dev environment only | Reduce scope, validate features before production | Good |
| PDF import as priority | Most unique/interesting feature, proves AI integration works | Good |
| AI returns ALL items with confidence scores | User reported missing items; "be conservative" prompt filtered too aggressively | Good |
| Confidence thresholds 80/50 (not 70/40) | More conservative auto-selection reduces false positives | Good |
| Transaction date as source of truth | Renewal dates derived from statement transaction dates, not import date | Good |
| Materialized view pattern | Fast analytics queries (<100ms) with 15-minute refresh | Good |
| 70% similarity threshold | Balance between catching duplicates and avoiding false positives | Good |
| sqrt(time) uncertainty scaling | Confidence intervals widen naturally with forecast horizon | Good |
| Weekly batch over real-time alerts | Prevents notification fatigue while keeping users informed | Good |
| Fire-and-forget pattern triggers | Background async operations don't block primary request | Good |

---
*Last updated: 2026-02-08 after v1.3 milestone*
