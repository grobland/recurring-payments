# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Subscription Manager - A web application for tracking and managing recurring subscriptions. Users can add subscriptions manually or import them from bank statement PDFs using AI-powered extraction. Features include a dashboard with spending analytics, email reminders before renewals, and Stripe-powered billing.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Database**: Supabase (PostgreSQL) with Drizzle ORM
- **Auth**: NextAuth.js v5 (Email/Password + Google OAuth)
- **State**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Payments**: Stripe
- **Email**: Resend
- **PDF Processing**: OpenAI GPT-4 Vision
- **Testing**: Vitest (unit), Playwright (E2E)

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
```

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Protected app pages
│   ├── (marketing)/       # Public pages (landing, pricing)
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── subscriptions/     # Subscription-related components
│   ├── dashboard/         # Dashboard widgets
│   └── shared/            # Common components
├── lib/
│   ├── db/                # Drizzle schema & client
│   ├── auth/              # NextAuth config
│   ├── constants/         # App constants
│   ├── utils/             # Helper functions
│   ├── validations/       # Zod schemas
│   └── hooks/             # Custom React hooks
└── types/                 # TypeScript types
```

### Key Files

- `src/lib/db/schema.ts` - Complete database schema
- `src/lib/db/index.ts` - Database client
- `src/app/providers.tsx` - TanStack Query + Theme providers
- `src/lib/constants/categories.ts` - Default subscription categories
- `drizzle.config.ts` - Drizzle ORM configuration

### Database Tables

- `users` - User accounts with preferences and billing status
- `subscriptions` - User subscriptions with renewal tracking
- `categories` - Predefined and custom categories
- `reminder_logs` - Email delivery tracking
- `import_audits` - PDF import history
- `fx_rates_cache` - Exchange rate caching

## Environment Variables

Copy `.env.example` to `.env.local` and configure:
- `DATABASE_URL` - Supabase connection string
- `NEXTAUTH_SECRET` - NextAuth secret key
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth credentials
- `STRIPE_*` - Stripe API keys
- `OPENAI_API_KEY` - For PDF processing
- `RESEND_API_KEY` - For email sending
