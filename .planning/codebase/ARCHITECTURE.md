# Architecture

**Analysis Date:** 2026-01-24

## Pattern Overview

**Overall:** Full-stack Next.js application with client-server architecture using Server Components for routing/layout and Client Components for interactive features.

**Key Characteristics:**
- Next.js 16 App Router for file-based routing
- API-first backend with RESTful routes
- Database-driven with Drizzle ORM and PostgreSQL (Supabase)
- Client-side state management via TanStack Query for server state
- Authentication layer using NextAuth.js with JWT sessions
- Multi-tenant SaaS model with trial/billing system

## Layers

**Presentation Layer (Client):**
- Purpose: User interfaces and interactive components
- Location: `src/app/` (pages), `src/components/`
- Contains: React components, page layouts, form handling
- Depends on: API layer, hooks, utilities
- Used by: Browser clients

**API Layer (Server):**
- Purpose: RESTful endpoints for data operations and external integrations
- Location: `src/app/api/`
- Contains: Route handlers (GET, POST, PATCH, DELETE), cron jobs, webhooks
- Depends on: Database, authentication, external services (OpenAI, Stripe, Resend)
- Used by: Frontend clients, scheduled tasks, webhooks

**Business Logic Layer (Server):**
- Purpose: Core application logic and utilities
- Location: `src/lib/` (auth, db, email, openai, stripe, fx, utils)
- Contains: Authentication config, database schema, email templates, PDF parsing, payment handling
- Depends on: Database, external APIs
- Used by: API routes, hooks

**Data Layer (Server):**
- Purpose: Database schema and relationships
- Location: `src/lib/db/schema.ts`
- Contains: 10 Drizzle ORM tables with relations
- Depends on: PostgreSQL (Supabase)
- Used by: All server code requiring data persistence

**State Management (Client):**
- Purpose: Client-side data fetching and caching
- Location: `src/lib/hooks/` (custom hooks wrapping TanStack Query)
- Contains: Query hooks for subscriptions, categories, user data
- Depends on: API layer
- Used by: React components

## Data Flow

**Subscription Management Flow:**

1. User interacts with form in `src/app/(dashboard)/subscriptions/new/page.tsx`
2. Form validates with `src/lib/validations/subscription.ts` (Zod schemas)
3. Submit calls `useCreateSubscription()` hook from `src/lib/hooks/use-subscriptions.ts`
4. Hook calls `POST /api/subscriptions` in `src/app/api/subscriptions/route.ts`
5. API route authenticates via `src/lib/auth/index.ts`, validates, calculates normalized amount
6. Inserts into `subscriptions` table via `src/lib/db/index.ts`
7. Hook invalidates TanStack Query cache, triggering page re-fetch
8. Component updates from cache

**PDF Import Flow:**

1. User uploads files in `src/app/(dashboard)/import/page.tsx`
2. POST request to `src/app/api/import/route.ts` with FormData
3. Files converted to base64, passed to `src/lib/openai/pdf-parser.ts`
4. OpenAI GPT-4 Vision extracts subscription data
5. Results returned with duplicate detection
6. User confirms import via `POST /api/import/confirm/route.ts`
7. Subscriptions inserted with `importAuditId` tracking

**Reminder/Cron Flow:**

1. Scheduled cron job calls `GET /api/cron/send-reminders`
2. Verifies `CRON_SECRET` header
3. Queries subscriptions with upcoming renewal dates
4. For each reminder due, calls `src/lib/email/client.ts` (Resend API)
5. Uses email template from `src/lib/email/templates/`
6. Logs result in `reminder_logs` table
7. Also processes trial-ending emails for users within 5 days

**Stripe Webhook Flow:**

1. Stripe posts event to `POST /api/webhooks/stripe`
2. Webhook handler in `src/lib/stripe/webhook.ts` validates signature
3. Handles `customer.subscription.updated`, `customer.subscription.deleted`, `charge.failed` events
4. Updates user `billingStatus` in `users` table
5. Logs to reminder_logs if action taken

**State Management Pattern:**

- TanStack Query caches API responses with 1-minute staleTime
- Query keys in `src/lib/hooks/use-*.ts` follow hierarchical pattern: `[entityType, operation, filters]`
- Mutations invalidate related query keys on success
- Manual cache updates for optimistic patterns (e.g., `setQueryData` for specific details)

## Key Abstractions

**Authentication (NextAuth.js):**
- Purpose: Handle user identity and session management
- Examples: `src/lib/auth/config.ts`, `src/lib/auth/index.ts`, `src/lib/auth/helpers.ts`
- Pattern: Adapter-based (DrizzleAdapter for DB), JWT session strategy, support for Email/Credentials and Google OAuth
- Trial automation: `createUser` event sets 14-day trial dates

**Database Relations (Drizzle):**
- Purpose: Type-safe database access with relation querying
- Examples: `subscriptions` → `user`, `category`, `importAudit`, `reminderLogs`
- Pattern: Relations define joins, foreign keys cascade on delete where appropriate
- Type inference: `typeof users.$inferSelect` generates TypeScript types

**Form Validation (Zod):**
- Purpose: Runtime validation for user input
- Examples: `src/lib/validations/subscription.ts`, separate schemas for form (React Hook Form) vs API
- Pattern: API schemas use `.coerce` for FormData conversion, form schemas for type safety

**Email Templating (Resend):**
- Purpose: Reusable email templates
- Examples: `src/lib/email/templates/reminder.ts`, `trial-ending.ts`, `welcome.ts`
- Pattern: Template functions return HTML, wrapped by `src/lib/email/client.ts` (sendEmail)

**PDF Parsing (OpenAI Vision):**
- Purpose: Extract subscription data from bank statements
- Examples: `src/lib/openai/pdf-parser.ts`
- Pattern: Converts files to base64, sends to GPT-4 Vision, parses JSON response, detects duplicates

**Currency Normalization:**
- Purpose: Display all amounts in consistent format
- Examples: `src/lib/utils/normalize.ts` calculates `normalizedMonthlyAmount`
- Pattern: Convert yearly to monthly equivalent for consistent analytics

## Entry Points

**Application Entry:**
- Location: `src/app/layout.tsx`
- Triggers: Browser request to root path
- Responsibilities: Sets up root HTML, includes fonts, integrates Providers component

**Provider Setup:**
- Location: `src/app/providers.tsx`
- Triggers: RootLayout wraps all children
- Responsibilities: SessionProvider (NextAuth), QueryClientProvider (TanStack Query), ThemeProvider (next-themes), Toaster (notifications)

**Authentication Guard:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: Any route in (dashboard) group
- Responsibilities: Redirects to /login if no session, wraps in SidebarProvider and AppSidebar

**API Entry Points:**
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth callback handler
- `src/app/api/subscriptions/route.ts` - Main CRUD endpoint (GET, POST)
- `src/app/api/subscriptions/[id]/route.ts` - Detail operations (GET, PATCH, DELETE)
- `src/app/api/import/route.ts` - PDF processing start
- `src/app/api/cron/*` - Automated tasks (send-reminders, flag-renewals, cleanup)
- `src/app/api/webhooks/stripe` - Stripe event processing

## Error Handling

**Strategy:** Consistent error responses with try-catch in API routes, validation errors caught by Zod, client-side error boundaries via React Query error states.

**Patterns:**

- API Route: Wrap in try-catch, return `NextResponse.json({ error: string }, { status: number })`
- Validation: Zod `.safeParse()`, return first issue message to client
- Authentication: Check `session?.user?.id`, return 401 if missing
- Authorization: Check `isUserActive(session.user)` (trial or active billing), return 403 if expired
- Database: Errors logged to console, generic "An error occurred" returned to client
- Example (from `src/app/api/subscriptions/route.ts`):
  ```typescript
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isUserActive(session.user)) {
    return NextResponse.json(
      { error: "Your trial has expired. Please upgrade..." },
      { status: 403 }
    );
  }
  const result = createSubscriptionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }
  ```

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.error()` and `console.log()` in server code
- Error context: Logged before returning error response to client
- Example: `console.error("Create subscription error:", error)`

**Validation:**
- Approach: Zod schemas for all user input (forms and API bodies)
- Pattern: Separate form schemas (for React Hook Form type safety) from API schemas (with coercion)
- Database relations: Verify ownership (user_id match) before operations

**Authentication:**
- Approach: NextAuth.js with JWT tokens cached in session
- Session refresh: Callbacks query database to keep billing status, trial dates current
- Page-level guards: `src/app/(dashboard)/layout.tsx` redirects unauthenticated users
- API guards: Every API route checks `await auth()` and validates session

**Rate Limiting:**
- Not implemented (assumed handled by infrastructure)

**CORS:**
- Default Next.js (same-origin only, API routes same server)

---

*Architecture analysis: 2026-01-24*
