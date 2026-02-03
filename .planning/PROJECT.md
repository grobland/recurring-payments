# Subscription Manager

## What This Is

A web application for tracking and managing recurring subscriptions. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction with confidence scoring. Features include a dashboard with spending analytics, email reminders before renewals, smart import with transaction date intelligence, and full category management.

## Core Value

Users can see all their subscriptions in one place and never get surprised by a renewal again.

## Current Milestone: v1.2 Production Polish

**Goal:** Make the app production-ready with comprehensive UX refinements, error handling, and reliability improvements.

**Target features:**
- Mobile responsiveness and visual polish
- Loading states, skeleton loaders, and empty state messages
- User-friendly error messages and form validation
- API error handling with retry logic
- Error tracking (Sentry), structured logging, and health checks

## Current State

**Version:** v1.1 Import Improvements (shipped 2026-02-02)
**Codebase:** ~17,700 lines TypeScript, Next.js 16 + Supabase + OpenAI
**Production URL:** https://recurring-payments.vercel.app

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

### Active

- [ ] Mobile responsiveness across all pages
- [ ] Visual polish (typography, spacing, consistency)
- [ ] Loading states and skeleton loaders
- [ ] Empty state messages
- [ ] User-friendly error messages
- [ ] Form validation improvements
- [ ] API error handling with retry logic
- [ ] Error tracking integration (Sentry)
- [ ] Structured logging
- [ ] Health check endpoints

### Out of Scope

- Stripe billing flows — deferred to future milestone
- Production domain setup — deferred
- Mobile app — web-first approach (web responsiveness is in scope)
- AI confidence calibration dashboard — complexity; defer until usage data collected
- Multi-statement pattern detection — requires historical data; defer to v1.3+

## Context

**Codebase state:** v1.1 complete. Smart import with confidence-based selection, statement source tracking, renewal date intelligence, and full category CRUD all working. All 18 v1.1 requirements validated.

**Known issues:**
- Email delivery requires verified Resend domain (RESEND_FROM_EMAIL)

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

---
*Last updated: 2026-02-03 after v1.2 milestone start*
