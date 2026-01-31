# Subscription Manager

## What This Is

A web application for tracking and managing recurring subscriptions. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction. Features include a dashboard with spending analytics, email reminders before renewals, and Stripe-powered billing for the app itself.

## Core Value

Users can see all their subscriptions in one place and never get surprised by a renewal again.

## Current Milestone: v1.1 Import Improvements

**Goal:** Improve PDF import accuracy and user control, fix data quality issues discovered during testing.

**Target features:**
- Smart import: Show all statement items with confidence scores, user selects which to import
- Statement sources: Track bank/credit card name, reuse for future imports
- Renewal date fix: Calculate from actual transaction dates on statements
- Category management: Fix duplicates, add full CRUD for categories

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

### Active

- [ ] Show all statement items with confidence scores during import
- [ ] Allow user to select which items to import (not just high-confidence)
- [ ] Store full statement data for reference
- [ ] Capture bank/credit card name as statement source
- [ ] Reuse statement source for future imports from same bank
- [ ] Calculate renewal date from transaction date on statement
- [ ] Fix duplicate categories in edit dropdown
- [ ] Add category CRUD (create, update, delete)
- [ ] Handle category deletion gracefully (subscriptions become uncategorized)

### Out of Scope

- Stripe billing flows — deferred to future milestone
- Production domain setup — deferred
- Mobile app — web-first approach

## Context

**Codebase state:** v1.0 complete. All core features working end-to-end. User testing revealed data quality and UX issues with PDF import flow.

**Issues from user testing (2026-01-31):**
1. PDF import misses some subscriptions — AI only returns high-confidence matches
2. No way to identify which bank/card a statement came from
3. Renewal dates are calculated incorrectly — should use statement transaction dates
4. Category dropdown shows duplicates in edit form

**Priority order:**
1. Smart import (core UX improvement)
2. Category management (blocking bug fix)
3. Statement sources (data organization)
4. Renewal date fix (data accuracy)

**Production URL:** https://recurring-payments.vercel.app
**Codebase documentation:** See `.planning/codebase/` for detailed architecture, stack, conventions, and concerns analysis.

## Constraints

- **Platform**: Vercel for hosting (cron jobs configured in vercel.json)
- **Database**: Supabase PostgreSQL (already configured)
- **Budget**: Using free tiers where possible (Stripe test mode, Resend free tier, OpenAI pay-as-you-go)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Configure Stripe now, build billing later | Focus on core features first, billing is secondary | — Pending |
| Dev environment only | Reduce scope, validate features before production | — Pending |
| PDF import as priority | Most unique/interesting feature, proves AI integration works | — Pending |

---
*Last updated: 2026-01-31 after milestone v1.1 started*
