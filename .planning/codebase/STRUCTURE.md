# Codebase Structure

**Analysis Date:** 2026-01-24

## Directory Layout

```
recurring-payments/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth pages group (login, register, password reset)
│   │   ├── (dashboard)/            # Protected pages group (requires authentication)
│   │   │   ├── analytics/          # Spending analytics view
│   │   │   ├── dashboard/          # Main dashboard home
│   │   │   ├── import/             # PDF import interface
│   │   │   ├── onboarding/         # Onboarding flow
│   │   │   ├── reminders/          # Reminder management
│   │   │   ├── settings/           # User settings (billing, privacy)
│   │   │   └── subscriptions/      # Subscription list and detail pages
│   │   ├── (marketing)/            # Public pages (landing, pricing, terms, privacy)
│   │   ├── api/                    # API routes (backend)
│   │   │   ├── auth/               # Authentication endpoints
│   │   │   ├── billing/            # Stripe checkout and portal
│   │   │   ├── categories/         # Category CRUD
│   │   │   ├── cron/               # Scheduled tasks
│   │   │   ├── fx-rates/           # Exchange rate API
│   │   │   ├── import/             # PDF processing
│   │   │   ├── reminders/          # Reminder operations
│   │   │   ├── subscriptions/      # Subscription CRUD
│   │   │   ├── user/               # User operations (delete, export)
│   │   │   └── webhooks/           # Stripe and external webhooks
│   │   ├── layout.tsx              # Root layout (HTML setup, providers)
│   │   ├── providers.tsx           # Client providers (Query, Auth, Theme, Toaster)
│   │   └── globals.css             # Global styles
│   │
│   ├── components/                 # Reusable React components
│   │   ├── ui/                     # shadcn/ui components (primitive UI)
│   │   ├── layout/                 # Layout components (sidebar, header, nav)
│   │   ├── subscriptions/          # Subscription-specific components
│   │   ├── charts/                 # Data visualization (Recharts)
│   │   ├── billing/                # Billing UI (trial banner, pricing)
│   │   └── onboarding/             # Onboarding flow components
│   │
│   ├── lib/                        # Core utilities and business logic
│   │   ├── db/                     # Database
│   │   │   ├── schema.ts           # Complete Drizzle ORM schema (10 tables)
│   │   │   ├── index.ts            # DB client initialization
│   │   │   └── seed.ts             # Seed default categories
│   │   ├── auth/                   # Authentication
│   │   │   ├── config.ts           # NextAuth.js configuration
│   │   │   ├── index.ts            # Auth handler exports
│   │   │   └── helpers.ts          # Auth utility functions (isUserActive)
│   │   ├── validations/            # Zod schemas
│   │   │   ├── subscription.ts     # Subscription form and API schemas
│   │   │   └── [other schemas]
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── use-subscriptions.ts # Subscription CRUD with TanStack Query
│   │   │   ├── use-categories.ts   # Category operations
│   │   │   ├── use-user.ts         # User operations
│   │   │   └── index.ts            # Re-exports
│   │   ├── email/                  # Email sending
│   │   │   ├── client.ts           # Resend API wrapper
│   │   │   └── templates/          # Email templates
│   │   │       ├── reminder.ts
│   │   │       ├── trial-ending.ts
│   │   │       ├── welcome.ts
│   │   │       └── password-reset.ts
│   │   ├── openai/                 # AI integrations
│   │   │   └── pdf-parser.ts       # GPT-4 Vision PDF extraction
│   │   ├── stripe/                 # Stripe integration
│   │   │   ├── client.ts           # Stripe SDK initialization
│   │   │   └── webhook.ts          # Webhook event handling
│   │   ├── fx/                     # Foreign exchange
│   │   │   └── rates.ts            # Exchange rate caching and fetching
│   │   ├── utils/                  # Utility functions
│   │   │   ├── normalize.ts        # Monthly amount normalization
│   │   │   ├── currency.ts         # Currency formatting
│   │   │   ├── dates.ts            # Date utilities
│   │   │   └── [other utils]
│   │   ├── constants/              # App constants
│   │   │   ├── categories.ts       # Default categories list
│   │   │   ├── currencies.ts       # Supported currencies
│   │   │   └── frequencies.ts      # Frequency options (monthly, yearly)
│   │   └── utils.ts                # Generic utilities
│   │
│   ├── hooks/                      # (deprecated, use src/lib/hooks/)
│   │   └── [legacy hook files]
│   │
│   └── types/                      # TypeScript type definitions
│       ├── next-auth.d.ts          # NextAuth session type augmentation
│       └── subscription.ts         # Subscription-related types
│
├── tests/                          # Test files
│   ├── [unit test files]
│   └── [e2e test files]
│
├── public/                         # Static assets
│
├── .env.example                    # Environment variable template
├── .env.local                      # Local environment (git-ignored)
├── .planning/                      # GSD documentation
│   └── codebase/                   # Architecture docs
├── drizzle.config.ts               # Drizzle ORM configuration
├── next.config.ts                  # Next.js configuration
├── tsconfig.json                   # TypeScript configuration with @ alias
├── package.json                    # Dependencies and scripts
└── vitest.config.ts                # Unit test configuration
```

## Directory Purposes

**src/app/(auth):**
- Purpose: Public authentication pages
- Contains: Login, register, forgot password, reset password forms
- Key files: `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`

**src/app/(dashboard):**
- Purpose: Protected application pages requiring authentication
- Contains: Main features (subscriptions, analytics, import, reminders, settings)
- Key files: `layout.tsx` (auth guard), `dashboard/page.tsx` (home), `subscriptions/page.tsx` (list)

**src/app/(marketing):**
- Purpose: Public marketing pages
- Contains: Landing page, pricing, terms, privacy policy
- Key files: `pricing/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`

**src/app/api:**
- Purpose: Backend API endpoints
- Contains: RESTful routes, cron jobs, webhooks
- Pattern: Each directory is a resource (e.g., `/api/subscriptions`), route files are `route.ts`

**src/components:**
- Purpose: Reusable React components
- UI components: `src/components/ui/` (shadcn/ui - buttons, cards, dialogs, forms)
- Domain components: By feature (subscriptions, charts, billing, onboarding)
- Layout: `src/components/layout/` (sidebar, header, navigation)

**src/lib:**
- Purpose: Server utilities and core logic
- db: Drizzle ORM schema, client, relations, seed
- auth: NextAuth.js config, helpers, authentication logic
- validations: Zod schemas for all forms and API inputs
- hooks: Custom React hooks (TanStack Query wrappers)
- email: Resend API client and email templates
- openai: GPT-4 Vision PDF parser
- stripe: Stripe client and webhook handler
- fx: Currency exchange rates
- utils: Helper functions (normalize, format, dates)
- constants: App-wide constants

**src/types:**
- Purpose: Global TypeScript definitions
- `next-auth.d.ts`: Extends NextAuth Session, User, and JWT types
- `subscription.ts`: Domain types for subscriptions

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML setup and Providers component wrapper
- `src/app/providers.tsx`: Client-side providers (SessionProvider, QueryClientProvider, ThemeProvider)
- `src/app/(dashboard)/layout.tsx`: Authentication guard for dashboard

**Configuration:**
- `drizzle.config.ts`: Drizzle ORM database URL and schema location
- `src/lib/auth/config.ts`: NextAuth.js providers, callbacks, and trial setup
- `tsconfig.json`: Path alias `@/*` → `./src/*`
- `vitest.config.ts`: Unit test runner configuration

**Core Logic:**
- `src/lib/db/schema.ts`: All 10 database tables (users, subscriptions, categories, etc.)
- `src/lib/auth/helpers.ts`: `isUserActive()` check for trial/billing status
- `src/lib/validations/subscription.ts`: Zod schemas for subscription forms and API
- `src/lib/hooks/use-subscriptions.ts`: TanStack Query hooks with query keys and API calls

**Testing:**
- `tests/`: Unit tests and E2E tests (Vitest and Playwright)
- Test pattern: `[feature].test.ts` or `[feature].spec.ts`

## Naming Conventions

**Files:**
- Page routes: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention, one per directory)
- Components: PascalCase, e.g., `SubscriptionForm.tsx`, `TrialBanner.tsx`
- Utilities/hooks: kebab-case, e.g., `use-subscriptions.ts`, `normalize.ts`
- Schemas/types: kebab-case filenames, e.g., `subscription.ts`

**Directories:**
- Feature groups in app: Parentheses for grouping without URL impact, e.g., `(auth)`, `(dashboard)`, `(marketing)`
- Dynamic routes: Brackets, e.g., `[id]` for route parameters
- Components: PascalCase directories by feature, e.g., `subscriptions/`, `charts/`, `layout/`
- Utilities: kebab-case, e.g., `use-subscriptions.ts`, `next-auth.d.ts`

## Where to Add New Code

**New Feature:**
- Primary code: `src/app/api/[resource]/route.ts` for API endpoint
- Page: `src/app/(dashboard)/[feature]/page.tsx` for UI
- Components: `src/components/[feature]/` for reusable components
- Validation: `src/lib/validations/[resource].ts` for Zod schema
- Hooks: `src/lib/hooks/use-[resource].ts` for TanStack Query wrapper
- Tests: `tests/[feature].test.ts` for unit tests

**New Component/Module:**
- Implementation: `src/components/[feature]/[ComponentName].tsx` or `src/lib/[module]/[file].ts`
- If needs state: Create hook in `src/lib/hooks/use-[name].ts` with TanStack Query
- If UI: Use shadcn/ui components from `src/components/ui/` as base

**Utilities:**
- Shared helpers: `src/lib/utils/[function-name].ts`
- Constants: `src/lib/constants/[category].ts`
- Type definitions: `src/types/[domain].ts`

**Database Changes:**
- Schema updates: Edit `src/lib/db/schema.ts`
- Generate migration: `npm run db:generate`
- Run migration: `npm run db:push`

## Special Directories

**src/components/ui/:**
- Purpose: Shadcn/ui primitive components
- Generated: Yes (via shadcn CLI)
- Committed: Yes (included in git)
- Pattern: Base styling with Tailwind, no feature-specific logic

**src/lib/db:**
- Purpose: Database schema and initialization
- Generated: `schema.ts` derived from Drizzle ORM definitions, migrations in `.migrations/` (not shown)
- Committed: Schema committed, migrations tracked by Drizzle

**tests/:**
- Purpose: Test files following component/feature structure
- Generated: No (manually written)
- Committed: Yes (test code tracked)

**public/:**
- Purpose: Static assets (favicon, fonts, images)
- Generated: No
- Committed: Yes

**.env.local:**
- Purpose: Local environment variables (secrets)
- Generated: No (from `.env.example`)
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-01-24*
