# External Integrations

**Analysis Date:** 2026-01-24

## APIs & External Services

**Payment Processing:**
- Stripe - Subscription billing and payment handling
  - SDK/Client: `stripe` (server) 20.2.0, `@stripe/stripe-js` (client) 8.6.3
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Usage: `src/lib/stripe/client.ts` (singleton client), `src/lib/stripe/products.ts`
  - API Routes: `src/app/api/billing/create-checkout/route.ts`, `src/app/api/billing/portal/route.ts`
  - Webhooks: `src/app/api/webhooks/stripe/route.ts` (checkout, subscription, invoice events)
  - Events Handled: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`

**AI & Document Processing:**
- OpenAI GPT-4 Vision - PDF and image extraction for bank statements
  - SDK/Client: `openai` 6.16.0
  - Auth: `OPENAI_API_KEY`
  - Usage: `src/lib/openai/client.ts` (singleton client), `src/lib/openai/pdf-parser.ts`
  - API Route: `src/app/api/import/route.ts` - Processes base64 PDF/image files
  - Features: Subscription detection, duplicate identification

**Email Service:**
- Resend - Transactional email delivery
  - SDK/Client: `resend` 6.8.0
  - Auth: `RESEND_API_KEY`
  - From: `RESEND_FROM_EMAIL`
  - Usage: `src/lib/email/client.ts` (singleton client)
  - Email Templates: `src/lib/email/templates/`
    - `reminder.ts` - Subscription renewal reminders
    - `welcome.ts` - New user welcome
    - `password-reset.ts` - Password reset instructions
    - `trial-ending.ts` - Trial expiration warnings
    - `base.ts` - Base HTML template
  - Scheduled Sends: `src/app/api/cron/send-reminders/route.ts` (9 AM UTC daily)
  - Tracking: Message IDs logged to `reminderLogs` table

**Foreign Exchange Rates:**
- Open Exchange Rates - Currency conversion
  - API: `https://openexchangerates.org/api/latest.json`
  - Auth: `OPEN_EXCHANGE_RATES_APP_ID`
  - Usage: `src/lib/fx/rates.ts`
  - API Route: `src/app/api/fx-rates/route.ts`
  - Caching: 6-hour cache in database (`fx_rates_cache` table)
  - Fallback: Hardcoded rates for 20 major currencies if API unavailable
  - Features: USD-based conversion, multi-currency support

## Data Storage

**Databases:**
- Supabase (PostgreSQL 14+)
  - Connection: `DATABASE_URL` (psycopg format for Drizzle), `DIRECT_URL` (optional direct connection)
  - Client: `postgres` 3.4.8 (raw connection), `drizzle-orm` 0.45.1 (ORM)
  - Schema: `src/lib/db/schema.ts` (11 tables with relations)
  - Adapter: `@auth/drizzle-adapter` 1.11.1 for NextAuth integration
  - Tables:
    - `users` - User accounts, trial/billing status, preferences
    - `accounts` - OAuth provider accounts (NextAuth)
    - `sessions` - User sessions (NextAuth)
    - `verificationTokens` - Email verification (NextAuth)
    - `authenticators` - WebAuthn credentials (NextAuth)
    - `passwordResetTokens` - Password reset token tracking
    - `categories` - Subscription categories (predefined + custom)
    - `subscriptions` - User subscriptions with renewal tracking
    - `reminderLogs` - Email delivery audit trail
    - `importAudits` - PDF import history and stats
    - `fxRatesCache` - Exchange rate caching

**File Storage:**
- Local filesystem only - PDFs/images processed in memory via multipart form-data
- No persistent file storage (files not retained after processing)
- Maximum file size: 10MB per file

**Caching:**
- Database caching: `fxRatesCache` table for exchange rates (6-hour TTL)
- Server-side: Singleton pattern for client initialization (OpenAI, Stripe, Resend)
- Client-side: TanStack React Query with configurable stale times and refetch strategies

## Authentication & Identity

**Auth Provider:**
- NextAuth.js v5 (beta) - Custom implementation
  - Implementation: Hybrid email/password + OAuth
  - Adapter: `@auth/drizzle-adapter` 1.11.1
  - Config: `src/lib/auth/config.ts`
  - Session Strategy: JWT (signed tokens)
  - Providers:
    - Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
    - Email/Password Credentials: bcryptjs-hashed passwords
  - Trial Setup: Automatic 14-day trial on new user creation
  - Routes: `src/app/api/auth/[...nextauth]/route.ts`
  - Auth Helpers: `src/lib/auth/helpers.ts` (session checks, trial validation)

**Password Security:**
- bcryptjs 3.0.3 - Password hashing (salt rounds default)
- Password Reset Flow: `src/app/api/auth/reset-password/route.ts`, `forgot-password/route.ts`
- Reset Token Storage: `passwordResetTokens` table with expiration

**Email Verification:**
- NextAuth verification tokens table
- Registration route: `src/app/api/auth/register/route.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry (optional)
  - DSN: `SENTRY_DSN`
  - Auth Token: `SENTRY_AUTH_TOKEN`
  - Status: Not yet integrated, configured for future use

**Logs:**
- Server Logs: Console output (Next.js default)
- Audit Trail: Database logging
  - `reminderLogs` - Email delivery attempts and failures
  - `importAudits` - PDF import history and results
- Email Tracking: Resend message IDs stored in `reminderLogs.resendMessageId`

## CI/CD & Deployment

**Hosting:**
- Vercel (recommended for Next.js)
  - Cron Jobs: Defined in `vercel.json`
  - Environment Variables: Configured in Vercel dashboard

**CI Pipeline:**
- Not detected (can be added via GitHub Actions or Vercel CI)
- Build Command: `npm run build`
- Development: `npm run dev`
- Testing: `npm run test` (Vitest), `npm run test:e2e` (Playwright)

## Environment Configuration

**Required env vars (Production):**
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session encryption key (generate with `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth app credentials
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID` - Stripe billing
- `OPENAI_API_KEY` - OpenAI API access
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` - Email delivery
- `CRON_SECRET` - Bearer token for scheduled tasks
- `NEXT_PUBLIC_APP_URL` - Frontend URL (public, exposed to browser)
- `NEXT_PUBLIC_APP_NAME` - App name (public)

**Optional env vars:**
- `DIRECT_URL` - Direct Supabase connection (for migration tools)
- `OPEN_EXCHANGE_RATES_APP_ID` - Falls back to hardcoded rates if missing
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` - Error tracking

**Secrets location:**
- Development: `.env.local` (git-ignored)
- Production: Vercel Environment Variables dashboard
- Secrets should never be committed

## Webhooks & Callbacks

**Incoming Webhooks:**
- Stripe Webhook Endpoint: `POST /api/webhooks/stripe/route.ts`
  - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
  - Verification: Stripe signature validation with webhook secret
  - Processing: Updates user billing status and subscription information
  - Rate limit: Standard Stripe retry logic (3 attempts over 5 days)

**Outgoing Webhooks:**
- None detected

**Scheduled Tasks (Vercel Cron):**
- `GET /api/cron/send-reminders` - Daily 9 AM UTC
  - Sends subscription renewal reminders (7 and 1 day before)
  - Sends trial ending reminders (7, 3, 1 day before, and on day)
  - Auth: `CRON_SECRET` bearer token verification
  - Tracking: Logs reminder sends/failures to `reminderLogs` table

- `GET /api/cron/cleanup` - Daily 3 AM UTC
  - Purpose: Data cleanup (exact logic in `src/app/api/cron/cleanup/route.ts`)
  - Auth: `CRON_SECRET` bearer token verification

- `GET /api/cron/flag-renewals` - Daily midnight UTC
  - Purpose: Flag overdue subscriptions (exact logic in `src/app/api/cron/flag-renewals/route.ts`)
  - Sets `subscriptions.needsUpdate = true` for past renewal dates
  - Auth: `CRON_SECRET` bearer token verification

---

*Integration audit: 2026-01-24*
