# Technology Stack

**Analysis Date:** 2026-01-24

## Languages

**Primary:**
- TypeScript 5 - Complete codebase, strict mode enabled
- React 19.2.3 - Frontend UI library (JSX)
- JavaScript/Node.js - Runtime environment

**Secondary:**
- SQL - PostgreSQL queries via Drizzle ORM
- HTML/CSS - Generated via React/Tailwind

## Runtime

**Environment:**
- Node.js (LTS recommended, ES2017 target)
- Next.js 16.1.4 (App Router, React 19 compatible)

**Package Manager:**
- npm (npm ci for CI/CD)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.4 - Full-stack React framework with App Router, API routes, server components
- React 19.2.3 - UI library
- Next-Auth.js 5.0.0-beta.30 - Authentication and session management
- Drizzle ORM 0.45.1 - Type-safe database ORM with PostgreSQL dialect
- TanStack React Query 5.90.19 - Server state management and caching

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- Tailwind CSS PostCSS plugin (@tailwindcss/postcss ^4)
- Class Variance Authority 0.7.1 - CSS class composition
- Tailwind Merge 3.4.0 - Smart class merging for Tailwind
- lucide-react 0.562.0 - Icon library (used via icon names in database)

**Forms & Validation:**
- React Hook Form 7.71.1 - Form state and validation
- @hookform/resolvers 5.2.2 - Validation library bridge
- Zod 4.3.5 - TypeScript-first schema validation

**UI Components:**
- shadcn/ui (via @radix-ui) - Component library built on Radix UI primitives
  - Dialog, dropdown, select, tabs, tooltips, etc. via individual @radix-ui packages

**Charts & Data Visualization:**
- Recharts 3.7.0 - React charting library for dashboard analytics

**Date & Time:**
- date-fns 4.1.0 - Modern date manipulation library

**Security & Hashing:**
- bcryptjs 3.0.3 - Password hashing

**Utilities:**
- clsx 2.1.1 - Conditional className helper
- cmdk 1.1.1 - Command menu component
- uuid 13.0.0 - UUID generation
- react-day-picker 9.13.0 - Date picker component
- react-dropzone 14.3.8 - File upload handling
- sonner 2.0.7 - Toast notifications
- next-themes 0.4.6 - Theme switching (light/dark mode)

**Testing:**
- Vitest 4.0.17 - Unit testing framework (Vite-native, Jest-compatible)
- @vitejs/plugin-react 5.1.2 - React support for Vitest
- @testing-library/react 16.3.2 - React testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- Playwright ^1.57.0 - E2E testing framework
- @playwright/test ^1.57.0 - Playwright test runner

**Build & Development:**
- Drizzle Kit 0.31.8 - ORM migration and schema management CLI
- ESLint 9 - JavaScript/TypeScript linting
- eslint-config-next 16.1.4 - Next.js ESLint configuration
- dotenv 17.2.3 - Environment variable loading
- PostgreSQL adapter: postgres 3.4.8, @neondatabase/serverless 1.0.2

## Key Dependencies

**Critical:**
- drizzle-orm 0.45.1 - Type-safe database queries, PostgreSQL dialect
- next-auth 5.0.0-beta.30 - User authentication with JWT sessions and OAuth
- @tanstack/react-query 5.90.19 - Server state, caching, automatic refetching
- stripe 20.2.0 - Billing and payment processing (server)
- @stripe/stripe-js 8.6.3 - Stripe frontend integration (Elements, Payment method)

**Infrastructure:**
- postgres 3.4.8 - PostgreSQL connection driver
- @auth/drizzle-adapter 1.11.1 - NextAuth adapter for Drizzle ORM
- openai 6.16.0 - OpenAI API client for PDF extraction and AI processing
- resend 6.8.0 - Email service for sending reminder/auth emails

## Configuration

**Environment:**
- `.env.local` - Runtime configuration (git-ignored)
- `.env.example` - Template with all required variables
- Configured variables include:
  - `DATABASE_URL`, `DIRECT_URL` - Supabase PostgreSQL connection
  - `NEXTAUTH_SECRET` - Session encryption key
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
  - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID` - Stripe billing
  - `OPENAI_API_KEY` - GPT-4 Vision API access
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL` - Email service
  - `OPEN_EXCHANGE_RATES_APP_ID` - Currency conversion rates
  - `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` - Error tracking (optional)
  - `CRON_SECRET` - Scheduled task authentication
  - `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME` - Public configuration

**Build:**
- `tsconfig.json` - TypeScript compiler configuration (ES2017 target, strict mode)
- `drizzle.config.ts` - Drizzle ORM configuration pointing to `src/lib/db/schema.ts`
- `vitest.config.ts` - Vitest config with jsdom environment, path aliases
- `playwright.config.ts` - Playwright E2E test configuration
- `components.json` - shadcn/ui component configuration
- `next.config.ts` - Next.js configuration
- `.eslintrc.mjs` - ESLint configuration
- `postcss.config.mjs` - PostCSS (Tailwind) configuration

**Scheduled Tasks:**
- `vercel.json` - Cron job definitions:
  - `/api/cron/send-reminders` - Daily at 9 AM
  - `/api/cron/cleanup` - Daily at 3 AM
  - `/api/cron/flag-renewals` - Daily at midnight

## Platform Requirements

**Development:**
- Node.js (recommended LTS)
- npm (v8+)
- Supabase account with PostgreSQL database
- Google OAuth credentials (dev app)
- Stripe test API keys
- OpenAI API key
- Resend API key (or alternative email service)
- Open Exchange Rates API key (optional, uses fallback rates)

**Production:**
- Vercel (Next.js recommended deployment platform)
- Supabase or compatible PostgreSQL database
- Production Stripe account with webhook endpoint
- Production email service (Resend or alternative)
- Production OpenAI account
- Production OAuth credentials (Google)
- Sentry account for error tracking (optional)

---

*Stack analysis: 2026-01-24*
