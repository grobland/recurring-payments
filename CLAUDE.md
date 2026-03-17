# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Subscription Manager - A web application for tracking and managing recurring subscriptions. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction. Features include a dashboard with spending analytics, email reminders before renewals, Stripe-powered billing with feature gating, a financial document vault, and structured account management.

**Production URL:** https://recurring-payments.vercel.app

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 (no config file, uses defaults), shadcn/ui
- **Database**: Supabase (PostgreSQL) with Drizzle ORM
- **Auth**: NextAuth.js v5 (Email/Password + Google OAuth) via `src/app/proxy.ts`
- **State**: TanStack Query + nuqs (URL search params)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts (dynamically imported via next/dynamic)
- **Payments**: Stripe (multi-tier: primary/enhanced/advanced)
- **Email**: Resend
- **PDF Processing**: OpenAI GPT-4 Vision
- **Storage**: Supabase Storage (PDF vault)
- **Monitoring**: Sentry (optional, via SENTRY_DSN env var)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Bundle Analysis**: @next/bundle-analyzer (use --webpack flag, not Turbopack)

## Build and Development Commands

```bash
# Development
npm run dev          # Start development server

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed default categories

# Testing
npm run test         # Run unit tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)

# Production
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Analysis
npm run analyze      # Bundle treemap (requires cross-env, uses --webpack)
```

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (auth)/             # Auth pages (login, register, forgot/reset password)
│   ├── (dashboard)/        # Protected app pages
│   │   ├── accounts/       # Financial account management
│   │   ├── admin/          # Admin panel
│   │   ├── analytics/      # Spending analytics & trends
│   │   ├── dashboard/      # Main dashboard
│   │   ├── import/         # PDF import
│   │   ├── onboarding/     # New user onboarding
│   │   ├── payments/       # Payment dashboard views
│   │   ├── reminders/      # Email reminder management
│   │   ├── settings/       # User settings
│   │   ├── sources/        # Statement sources
│   │   ├── statements/     # Statement browser
│   │   ├── subscriptions/  # Subscription CRUD
│   │   ├── suggestions/    # AI suggestions
│   │   ├── support/        # Help & data schema
│   │   ├── transactions/   # Transaction browser
│   │   └── vault/          # Document vault & coverage
│   ├── (marketing)/        # Public pages (landing, pricing, legal)
│   └── api/                # 23 API route groups
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # Sidebar, nav, app shell
│   ├── accounts/           # Account CRUD, detail tabs, coverage
│   ├── batch/              # Batch upload & processing
│   ├── billing/            # Stripe billing UI
│   ├── categories/         # Category management
│   ├── charts/             # Recharts wrappers (dynamically loaded)
│   ├── dashboard/          # Dashboard widgets
│   ├── forecast/           # Spending forecasts
│   ├── import/             # PDF import flow
│   ├── onboarding/         # Onboarding wizard
│   ├── pricing/            # Pricing tiers
│   ├── shared/             # Common components (EmptyState, etc.)
│   ├── sources/            # Statement source views
│   ├── statements/         # Statement detail, line items
│   ├── subscriptions/      # Subscription list, forms
│   ├── suggestions/        # AI suggestion cards
│   ├── tags/               # Transaction tagging
│   ├── transactions/       # Transaction browser, filters
│   └── vault/              # Vault page, coverage grid, PDF viewer
├── lib/
│   ├── auth/               # NextAuth config, helpers
│   ├── constants/          # Categories, currencies, frequencies
│   ├── db/                 # Drizzle schema, client, migrations
│   ├── email/              # Resend email templates
│   ├── features/           # Feature gating logic
│   ├── fx/                 # Exchange rate fetching & caching
│   ├── hooks/              # Custom React hooks (TanStack Query)
│   ├── openai/             # PDF parsing, line-item extraction
│   ├── storage/            # Supabase Storage helpers
│   ├── stripe/             # Stripe client & helpers
│   ├── supabase/           # Supabase client
│   ├── utils/              # Helper functions
│   └── validations/        # Zod schemas
└── types/                  # TypeScript types
```

### Key Files

- `src/lib/db/schema.ts` - Complete database schema (22 tables, 11 enums)
- `src/lib/db/index.ts` - Database client (pool limited to 3 connections)
- `src/app/proxy.ts` - Auth middleware & route protection (replaces middleware.ts)
- `src/app/providers.tsx` - TanStack Query + Theme + NuqsAdapter providers
- `drizzle.config.ts` - Drizzle ORM configuration
- `next.config.ts` - Next.js config (Sentry, bundle analyzer, optimizePackageImports)
- `.gsd/DECISIONS.md` - All architectural decisions with rationale

### Database Tables (22)

**Auth & Users:** users, accounts (OAuth), sessions, verification_tokens, authenticators, password_reset_tokens
**Core:** subscriptions, categories, reminder_logs, import_audits
**Financial:** financial_accounts, statements, statement_line_items, transactions, tags, transaction_tags
**Analytics:** recurring_patterns, alerts, fx_rates_cache
**Billing:** stripe_prices, trial_extensions, webhook_events

### Key Conventions

- `interestRate`: form accepts percentage (4.99%), API divides by 100 before DB insert
- Account type is immutable after creation
- `useDeleteFinancialAccount` (not useDeleteAccount) to avoid collision with GDPR hook
- Charts use `next/dynamic` with `ssr: false` (Server Components need client wrapper)
- DB pool limited to 3 connections (Supabase free tier constraint)

## Planning & GSD

This project uses GSD (Get Stuff Done) workflow with two systems:
- `.planning/` - Legacy milestone docs (v1.0-v1.2)
- `.gsd/` - Current GSD system, milestone M001 with 46+ slices
- `.gsd/DECISIONS.md` - Architectural decisions log (always check before making new decisions)

## Environment Variables

Copy `.env.example` to `.env.local` and configure:
- `DATABASE_URL` - Supabase connection string
- `NEXTAUTH_SECRET` - NextAuth secret key
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth credentials
- `STRIPE_*` - Stripe API keys
- `OPENAI_API_KEY` - For PDF processing
- `RESEND_API_KEY` - For email sending
- `SENTRY_DSN` - Optional Sentry monitoring

## Known Issues

- RESEND_FROM_EMAIL needs verified domain for production (noreply@example.com rejected)
