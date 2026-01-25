# Subscription Manager

## What This Is

A web application for tracking and managing recurring subscriptions. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction. Features include a dashboard with spending analytics, email reminders before renewals, and Stripe-powered billing for the app itself.

## Core Value

Users can see all their subscriptions in one place and never get surprised by a renewal again.

## Requirements

### Validated

- User authentication with email/password and Google OAuth — existing
- Database schema for subscriptions, categories, reminders, billing — existing
- Subscription CRUD API endpoints — existing
- Dashboard layout with sidebar navigation — existing
- PDF import flow with OpenAI GPT-4 Vision — existing (code complete)
- Email reminder templates and cron job — existing (code complete)
- Stripe webhook handling and billing status — existing (code complete)
- Category management with icons — existing
- Currency normalization for analytics — existing
- Trial system (14-day) — existing

### Active

- [ ] Create GitHub repository and push codebase
- [ ] Configure OpenAI API key for PDF import
- [ ] Create Stripe account and configure API keys
- [ ] Create Resend account and configure API key
- [ ] Configure Vercel project for deployment
- [ ] Test PDF import flow end-to-end
- [ ] Test Core CRUD (add/edit/delete subscriptions)
- [ ] Test email reminder sending

### Out of Scope

- Production deployment — dev environment only for now
- Custom domain setup — not needed for dev
- Stripe billing features — configure keys only, build features later

## Context

**Codebase state:** Feature code is largely complete but untested. The app has never run with real service integrations — only the database (Supabase) is connected with tables created.

**Priority order:**
1. PDF import (most interesting feature to test)
2. Core CRUD (foundation for everything)
3. Email reminders (requires Resend working)

**Accounts needed:** Stripe and Resend accounts must be created. GitHub and OpenAI accounts already exist.

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
*Last updated: 2026-01-25 after initialization*
