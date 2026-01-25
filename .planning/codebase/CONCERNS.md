# Codebase Concerns

**Analysis Date:** 2026-01-24

## Tech Debt

**PDF-to-Image Conversion Not Implemented:**
- Issue: PDFs are passed directly to OpenAI API as base64 without conversion to images. The code comment acknowledges this limitation but MVP only treats PDF as single page.
- Files: `src/app/api/import/route.ts` (lines 63-69)
- Impact: PDF bank statements may not be properly parsed by GPT-4 Vision, reducing extraction accuracy and user experience for PDF uploads
- Fix approach: Integrate a PDF-to-image library (pdfjs or pdf-lib) to convert multi-page PDFs to individual image pages before sending to OpenAI API

**Missing Email Notifications for Payment Failures:**
- Issue: Payment failure webhook handler logs the error but doesn't send user notification email
- Files: `src/app/api/webhooks/stripe/route.ts` (line 248)
- Impact: Users won't be notified of failed payments, potentially leading to service interruptions and support tickets
- Fix approach: Implement email notification template similar to `trial-ending` email and call `sendEmail()` in `handlePaymentFailed()` function

**Account Deletion Doesn't Cancel Stripe Subscription:**
- Issue: When a user deletes their account, active Stripe subscriptions are not cancelled, leaving orphaned recurring charges
- Files: `src/app/api/user/delete/route.ts` (line 49)
- Impact: Users can still be charged after account deletion, creating financial and legal liability
- Fix approach: Call `stripe.subscriptions.cancel()` before user deletion if `user.stripeSubscriptionId` exists

## Known Bugs

**Invoice Subscription ID Extraction May Fail:**
- Symptoms: Payment succeeded webhook may not properly identify subscription for invoices from older Stripe API versions
- Files: `src/app/api/webhooks/stripe/route.ts` (lines 186-192)
- Trigger: Invoices where `parent.subscription_details.subscription` has different structure than expected
- Workaround: None - requires webhook error logging to identify affected invoices

**Hardcoded Fallback to localhost:**
- Symptoms: If NEXT_PUBLIC_APP_URL env var is missing, checkout callback URLs use `http://localhost:3000` instead of production domain
- Files: `src/app/api/billing/create-checkout/route.ts` (line 10)
- Trigger: Missing or misconfigured NEXT_PUBLIC_APP_URL in production environment
- Workaround: Ensure NEXT_PUBLIC_APP_URL is set in all environments

## Security Considerations

**No Input Validation on Amount and Currency in Import:**
- Risk: Users can input negative amounts or invalid currency codes during import review, though basic validation exists in schema
- Files: `src/app/api/import/confirm/route.ts` (line 75)
- Current mitigation: Zod schema validates amount and currency before insert, but no additional safeguards
- Recommendations: Add explicit check for positive amounts and ISO 4217 currency code validation

**Cron Secret Protection Insufficient:**
- Risk: CRON_SECRET allows unauthenticated access to reminder jobs. If not set, falls back to development-only check
- Files: `src/app/api/cron/send-reminders/route.ts` (lines 12-21)
- Current mitigation: Only checks `NODE_ENV === "development"` if secret missing
- Recommendations: Make CRON_SECRET required in production; consider using request signing instead of Bearer token

**OpenAI API Key Exposure in Client:**
- Risk: Minimal - API key is server-side only in `src/lib/openai/client.ts`, but file should not be modified by client code
- Files: `src/lib/openai/client.ts`, `src/app/api/import/route.ts`
- Current mitigation: Proper API key isolation in server-only code
- Recommendations: Add explicit `use server` directive to pdf-parser module if it's called from client components

**No Rate Limiting on API Routes:**
- Risk: Import, subscription creation, and webhook endpoints have no rate limiting, allowing abuse vectors
- Files: `src/app/api/import/route.ts`, `src/app/api/subscriptions/route.ts`, `src/app/api/webhooks/stripe/route.ts`
- Current mitigation: Auth checks exist but no per-user rate limits
- Recommendations: Implement rate limiting middleware (e.g., Redis-based) on API routes, especially import and email endpoints

**Base64 File Size Not Enforced on API:**
- Risk: Client enforces 10MB file size limit, but server validates after base64 conversion (larger than original)
- Files: `src/app/api/import/route.ts` (lines 10, 40)
- Current mitigation: File type validation and size check before processing
- Recommendations: Document base64 overhead (~33% larger); consider stricter size limits

## Performance Bottlenecks

**GPT-4 Vision Processing Blocks Response:**
- Problem: Import route makes synchronous call to OpenAI API, blocking the request. No timeout or cancellation token.
- Files: `src/app/api/import/route.ts` (line 78)
- Cause: Synchronous `parseDocumentForSubscriptions()` call with 4096 max tokens
- Improvement path: Implement background job queue (Bull, Inngest) to process PDFs asynchronously, return job ID to client, poll for results

**Duplicate Detection Uses Nested Loop:**
- Problem: `detectDuplicates()` has O(n*m) complexity where n=detected, m=existing subscriptions
- Files: `src/lib/openai/pdf-parser.ts` (lines 160-183)
- Cause: Nested loop iterates all existing subscriptions for each detected subscription
- Improvement path: Index existing subscriptions by normalized name, use HashMap lookup in duplicate detection loop

**No Pagination on Subscription List:**
- Problem: GET `/api/subscriptions` loads all subscriptions at once without limit
- Files: `src/app/api/subscriptions/route.ts` (line 79)
- Cause: No limit/offset parameters in query builder
- Improvement path: Add `limit`, `offset`, and `page` parameters with sensible defaults (e.g., 50 items/page)

**Cron Job Iterates All Users Synchronously:**
- Problem: `processSubscriptionReminders()` loads all users and processes reminders in sequence, one per iteration
- Files: `src/app/api/cron/send-reminders/route.ts` (lines 71-82, 86-200+)
- Cause: No batch processing or parallelization
- Improvement path: Batch users, process reminders in parallel with Promise.all(), implement batched database queries

**Large Component Files Lack Code Splitting:**
- Problem: Several page components are 400-700 lines with no lazy loading or splitting
- Files: `src/components/ui/sidebar.tsx` (726 lines), `src/app/(dashboard)/import/page.tsx` (522 lines), `src/app/(dashboard)/subscriptions/page.tsx` (457 lines)
- Cause: All functionality rendered on page load
- Improvement path: Extract modal dialogs, form sections into separate components; implement dynamic imports for heavy components

## Fragile Areas

**Stripe Webhook Event Handlers:**
- Files: `src/app/api/webhooks/stripe/route.ts`
- Why fragile: Multiple handler functions use similar patterns but with subtle differences in data extraction. Failure in one doesn't fail others (silent errors with console.log only).
- Safe modification: Add structured error logging before each early return; add monitoring/alerting for webhook processing failures
- Test coverage: No test files for webhook handlers - critical business logic without coverage

**PDF Parser JSON Extraction:**
- Files: `src/lib/openai/pdf-parser.ts` (lines 109-120)
- Why fragile: Regex-based JSON extraction `match(/\[[\s\S]*\]/)`  assumes JSON is at root level, breaks if GPT wraps in markdown or other text
- Safe modification: Use JSON.parse with try-catch on progressively stripped strings; add logging of raw response for debugging
- Test coverage: No unit tests for JSON parsing edge cases

**Trial Status Detection:**
- Files: `src/app/api/cron/send-reminders/route.ts` (lines 88-92), `src/lib/auth/helpers.ts`
- Why fragile: Multiple places check `billingStatus === "trial"` and `trialEndDate > now`. If trial logic changes, easy to miss a place
- Safe modification: Create a single `isUserInTrial()` helper function; centralize trial logic
- Test coverage: No dedicated tests for trial boundary conditions

**File Type Validation Not Exhaustive:**
- Files: `src/app/api/import/route.ts` (line 47)
- Why fragile: Checks `file.type` which can be spoofed by client. Only validates MIME type, not file magic bytes
- Safe modification: Add server-side magic byte checking for PDF/image files; use file extension as secondary validation
- Test coverage: No tests for invalid file type rejection

## Scaling Limits

**Single-Page PDF Processing:**
- Current capacity: Single PDF processed as one base64 blob to GPT-4 Vision (4096 tokens max)
- Limit: Multi-page PDFs (common for bank statements) are truncated to first page only
- Scaling path: Implement PDF page splitting before processing; process each page separately with cumulative token budget

**No Database Connection Pooling Configuration:**
- Current capacity: Drizzle ORM uses serverless Postgres (Neon). Default connection strategy with potential exhaustion
- Limit: High concurrent requests may exhaust available connections in serverless environment
- Scaling path: Configure connection pool size in `src/lib/db/index.ts`; implement connection retry logic with exponential backoff

**Reminder Processing Sequential:**
- Current capacity: Can process ~100-500 users per cron execution (depends on DB query time + email sending)
- Limit: If user base grows, cron job duration exceeds acceptable window (typical cron jobs are 5-10 min timeout)
- Scaling path: Partition users by ID or created date; run multiple cron invocations in parallel; use job queue for email sending

**OpenAI API Rate Limits Not Handled:**
- Current capacity: No queuing or retry logic for OpenAI API calls
- Limit: Concurrent PDF imports will quickly hit OpenAI rate limits (3500 RPM on standard accounts)
- Scaling path: Implement request queuing with exponential backoff; cache GPT responses for identical files

## Dependencies at Risk

**next-auth v5.0.0-beta.30:**
- Risk: Still in beta version, may have breaking changes before stable release
- Impact: Authentication system could break with unexpected API changes or bugs
- Migration plan: Monitor next-auth releases; plan upgrade to stable v5 when available; test thoroughly before upgrading

**openai ^6.16.0:**
- Risk: GPT-4 Vision API is critical path for feature; API deprecation or pricing changes not in control
- Impact: PDF import feature stops working if OpenAI deprecates Vision API or rate limits spike
- Migration plan: Implement fallback image processing (Tesseract OCR); abstract OpenAI behind service layer to swap providers

**Stripe Integration Tightly Coupled:**
- Risk: Stripe client calls scattered across multiple files without abstraction layer
- Impact: Changing billing provider or Stripe API version requires changes in multiple places
- Migration plan: Create `src/lib/billing/` abstraction layer with provider-agnostic interface; current Stripe implementation as one provider

## Missing Critical Features

**No Idempotent Webhook Processing:**
- Problem: Webhook handlers update user records without idempotency checks. If webhook fires twice, state updated twice.
- Blocks: Reliable billing status tracking; prevents audit compliance
- Implementation: Add webhook event ID deduplication table; check if event already processed before updating

**No Subscription Cost Trend Analysis:**
- Problem: Dashboard shows current subscriptions but no analysis of spending growth/trends over time
- Blocks: Users can't identify where money is going; no alerts for sudden cost increases
- Implementation: Add spending trend calculations; implement cost spike detection with alerts

**No Bulk Operations:**
- Problem: Users can't pause/cancel multiple subscriptions at once
- Blocks: Users managing many subscriptions face tedious one-at-a-time operations
- Implementation: Add multi-select UI to subscription list; implement bulk update endpoint

**No Export Functionality:**
- Problem: Users can't export their subscription data (CSV, PDF)
- Blocks: Data portability; GDPR compliance edge case
- Implementation: Create CSV export endpoint; implement data export request flow

## Test Coverage Gaps

**No API Route Tests:**
- What's not tested: Subscription CRUD, import flow, billing, webhooks, reminders
- Files: `src/app/api/**/*.ts` (entire API directory)
- Risk: Silent failures in core business logic; breaking changes go undetected
- Priority: **High** - All API routes should have unit + integration tests

**No Webhook Handler Tests:**
- What's not tested: Stripe event handling, state transitions, edge cases (missing fields, etc)
- Files: `src/app/api/webhooks/stripe/route.ts`
- Risk: Billing state corruption; users charged incorrectly
- Priority: **High** - Critical business logic needs comprehensive coverage

**No PDF Parser Tests:**
- What's not tested: JSON extraction, duplicate detection, validation logic
- Files: `src/lib/openai/pdf-parser.ts`
- Risk: AI response parsing failures go unnoticed; duplicates missed or false positives
- Priority: **High** - Complex parsing logic needs edge case coverage

**No Auth Flow Tests:**
- What's not tested: Login, registration, password reset, OAuth integration
- Files: `src/lib/auth/`, `src/app/(auth)/**`
- Risk: Authentication bypasses or session leaks undetected
- Priority: **High** - Security-critical flows must be tested

**No Component Tests:**
- What's not tested: Form validation, modal interactions, sorting/filtering, error states
- Files: `src/components/**`, `src/app/(dashboard)/**`
- Risk: UI bugs, broken user flows, accessibility issues
- Priority: **Medium** - Component tests would improve robustness

**No E2E Tests:**
- What's not tested: Complete user journeys (signup → import → billing)
- Files: E2E test configuration exists but no test files written
- Risk: Integration failures between frontend and backend go undetected
- Priority: **Medium** - Critical user flows should have E2E coverage

---

*Concerns audit: 2026-01-24*
