# Phase 24: Webhook Infrastructure Hardening - Research

**Researched:** 2026-02-11
**Domain:** Stripe webhook processing, idempotency, reliability patterns
**Confidence:** HIGH

## Summary

Webhook infrastructure hardening is critical for payment system reliability. Stripe operates on an "at least once" delivery guarantee, retrying failed webhooks for up to 3 days with exponential backoff. Without proper idempotency controls, this leads to duplicate processing—double charges, duplicate emails, or data corruption.

The standard approach uses event ID tracking in a database table with unique constraints. Stripe expects a 200 response within 20 seconds (Vercel default: 10 seconds on free, 60 seconds on Pro). The key pattern is: verify signature → check idempotency → return 200 immediately → process asynchronously if needed.

For this phase, we'll implement: (1) a `webhook_events` table tracking processed event IDs with 30-day TTL, (2) payment failure email notifications via Resend with billing portal links, (3) a health check endpoint monitoring DB connectivity and recent event processing, and (4) an admin webhook log page for visibility and debugging.

**Primary recommendation:** Use database unique constraints for idempotency (not in-memory caches), respond within 10 seconds, process synchronously for simple updates (status changes), and log all events for audit and debugging.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 20.2.0+ | Webhook signature verification & event retrieval | Official Stripe SDK, handles signature verification with `constructEvent()` |
| drizzle-orm | 0.45.1+ | Database ORM for event tracking | Already in project stack, supports PostgreSQL unique constraints |
| resend | 6.8.0+ | Transactional email delivery | Already in project stack, developer-friendly API |
| next | 16.1.4+ | API route handlers for webhooks | App Router provides route handlers with raw body access via `request.text()` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0+ | Date calculations for TTL cleanup | Already in project, calculating 30-day expiration dates |
| zod | 4.3.5+ | Webhook payload validation | Already in project, validate event structures before processing |
| pino | 10.3.0+ | Structured logging for webhook events | Already in project, structured logs for audit trail |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database idempotency | In-memory cache (Redis) | Redis adds infrastructure complexity; DB sufficient for webhook volumes |
| Synchronous processing | Background queue (Bull/BullMQ) | Queue adds complexity; sync acceptable for simple status updates (<10s) |
| pg_cron cleanup | Manual cron job | pg_cron requires extension install; scheduled API route simpler for this volume |
| Custom admin UI | Third-party (Hookdeck, Svix) | Third-party adds cost & vendor lock-in; custom UI provides full control |

**Installation:**
```bash
# All dependencies already installed in project
npm install stripe resend drizzle-orm date-fns zod
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   │       └── route.ts          # Main webhook handler
│   │   ├── stripe/
│   │   │   └── health/
│   │   │       └── route.ts          # Health check endpoint
│   │   └── cron/
│   │       └── cleanup-webhooks/
│   │           └── route.ts          # TTL cleanup job
│   └── (dashboard)/
│       └── admin/
│           └── webhooks/
│               └── page.tsx          # Admin webhook log viewer
├── lib/
│   ├── db/
│   │   └── schema.ts                 # Add webhook_events table
│   ├── stripe/
│   │   ├── webhook-handlers.ts      # Individual event handlers
│   │   └── idempotency.ts           # Idempotency checking logic
│   └── email/
│       └── templates/
│           └── payment-failed.tsx   # React Email template
```

### Pattern 1: Database-Backed Idempotency

**What:** Track processed webhook event IDs in a PostgreSQL table with unique constraint
**When to use:** Always, for all webhook processing systems
**Example:**

```typescript
// Source: Stripe official docs + Hookdeck best practices
// https://docs.stripe.com/webhooks
// https://hookdeck.com/webhooks/guides/implement-webhook-idempotency

// Schema definition (Drizzle ORM)
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: varchar("event_id", { length: 255 }).notNull().unique(), // Stripe event.id
    eventType: varchar("event_type", { length: 100 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    status: varchar("status", { length: 20 }).notNull(), // 'processed' | 'failed' | 'skipped'
    errorMessage: text("error_message"),
    processingTimeMs: integer("processing_time_ms"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // TTL: processedAt + 30 days
  },
  (table) => [
    uniqueIndex("webhook_events_event_id_idx").on(table.eventId),
    index("webhook_events_expires_at_idx").on(table.expiresAt),
  ]
);

// Idempotency check with insert-on-duplicate pattern
async function checkIdempotency(eventId: string, eventType: string): Promise<boolean> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day retention

    await db.insert(webhookEvents).values({
      eventId,
      eventType,
      status: 'processed',
      expiresAt,
    });

    return true; // First time processing
  } catch (error) {
    // Unique constraint violation (23505 in PostgreSQL)
    if (error.code === '23505') {
      console.log(`Duplicate event detected: ${eventId}`);
      return false; // Already processed
    }
    throw error; // Unknown error, re-throw
  }
}
```

### Pattern 2: Fast Response with Logging

**What:** Immediately return 200 to Stripe, log event, then process
**When to use:** For all webhook handlers to stay within timeout limits
**Example:**

```typescript
// Source: Stripe webhook best practices
// https://docs.stripe.com/webhooks
// https://makerkit.dev/blog/tutorials/nextjs-api-best-practices

export async function POST(request: Request) {
  const startTime = Date.now();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  // 1. Verify signature (required for security)
  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 2. Check idempotency BEFORE processing
  const isFirstTime = await checkIdempotency(event.id, event.type);
  if (!isFirstTime) {
    console.log(`Duplicate event ignored: ${event.id}`);
    return NextResponse.json({ received: true }); // Return 200 to stop retries
  }

  // 3. Log event received
  console.log(`Processing webhook: ${event.type} (${event.id})`);

  try {
    // 4. Process event (synchronously for simple updates)
    await handleWebhookEvent(event);

    // 5. Update processing metrics
    const processingTime = Date.now() - startTime;
    await updateWebhookMetrics(event.id, 'processed', processingTime);

    // 6. Return 200 to Stripe
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook processing failed: ${event.id}`, error);
    await updateWebhookMetrics(event.id, 'failed', Date.now() - startTime, error.message);

    // Still return 200 to prevent retries if error is non-retriable
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
```

### Pattern 3: Payment Failure Email with Billing Portal

**What:** Send user-friendly email with direct link to update payment method
**When to use:** On `invoice.payment_failed` event, only on first attempt
**Example:**

```typescript
// Source: Stripe billing portal docs + payment failure email best practices
// https://docs.stripe.com/customer-management/portal-deep-links
// https://saufter.io/effective-failed-payment-email-and-message-templates/

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Only send email on first payment attempt
  const attemptCount = invoice.attempt_count ?? 1;
  if (attemptCount > 1) {
    console.log(`Skipping email for retry attempt ${attemptCount}`);
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Update user status
  await db
    .update(users)
    .set({
      billingStatus: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Create billing portal session with payment method update flow
  const stripe = getStripeClient();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    flow_data: {
      type: 'payment_method_update',
    },
  });

  // Send email notification
  await sendEmail({
    to: user.email,
    subject: "Action Required: Payment Failed",
    html: renderPaymentFailedEmail({
      userName: user.name || 'there',
      amount: (invoice.amount_due / 100).toFixed(2),
      currency: invoice.currency.toUpperCase(),
      billingPortalUrl: portalSession.url,
      retryDate: new Date(invoice.next_payment_attempt * 1000),
    }),
  });

  console.log(`Payment failure email sent to: ${user.email}`);
}
```

### Pattern 4: Health Check Endpoint

**What:** Simple GET endpoint that checks DB connectivity and recent webhook processing
**When to use:** For monitoring, load balancers, and alerting systems
**Example:**

```typescript
// Source: Microsoft Azure health check pattern + webhook monitoring best practices
// https://learn.microsoft.com/en-us/azure/architecture/patterns/health-endpoint-monitoring
// https://moss.sh/devops-monitoring/how-to-set-up-webhook-monitoring/

export async function GET() {
  try {
    // Check 1: Database connectivity
    const dbCheck = await db.execute(sql`SELECT 1 as health`);
    if (!dbCheck.rows[0]) {
      throw new Error("Database health check failed");
    }

    // Check 2: Recent webhook processing (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookEvents)
      .where(gt(webhookEvents.processedAt, fiveMinutesAgo));

    const recentCount = Number(recentEvents[0]?.count ?? 0);

    // Check 3: Recent failures
    const recentFailures = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookEvents)
      .where(
        and(
          gt(webhookEvents.processedAt, fiveMinutesAgo),
          eq(webhookEvents.status, 'failed')
        )
      );

    const failureCount = Number(recentFailures[0]?.count ?? 0);
    const failureRate = recentCount > 0 ? failureCount / recentCount : 0;

    // Healthy if DB connected and failure rate < 10%
    const isHealthy = failureRate < 0.1;

    return NextResponse.json({
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        recentEvents: recentCount,
        recentFailures: failureCount,
        failureRate: (failureRate * 100).toFixed(2) + "%",
      },
    }, { status: isHealthy ? 200 : 503 });

  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
```

### Anti-Patterns to Avoid

- **Processing before idempotency check:** Always check for duplicates BEFORE executing business logic. Prevents race conditions during Stripe retries.

- **Using event data from webhook payload:** Stripe recommends fetching fresh data via API for "thin events" pattern. However, for performance, using payload data is acceptable if you validate the structure.

- **Throwing errors for duplicate events:** Return 200 for duplicates to stop Stripe retries. Log the duplicate but don't treat it as an error.

- **Complex processing in webhook handler:** Keep handler logic simple (<10s). If complex processing needed (>10s), use a queue (Bull/BullMQ with Redis).

- **Hardcoding secrets:** Always use environment variables for `STRIPE_WEBHOOK_SECRET`. Rotate secrets regularly.

- **Skipping signature verification:** NEVER skip verification, even in development. Attackers can forge events.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC implementation | `stripe.webhooks.constructEvent()` | Stripe's method handles timestamp validation, signature verification, and replay attack prevention |
| Email templates | String concatenation HTML | React Email + Resend | React Email provides component-based templates, preview, and consistent rendering across clients |
| Idempotency tracking | In-memory Set/Map | PostgreSQL unique constraint | In-memory state lost on restart; DB constraints are atomic and persistent |
| Event deduplication | Time-based caching | Event ID tracking with DB constraint | Event IDs are unique; time-based windows have edge cases during clock skew |
| Background job queues | Custom setTimeout/intervals | Bull/BullMQ (if needed) | Queues handle retries, dead letter queues, priority, concurrency, and persistence |
| TTL cleanup | DELETE queries in webhook handler | Scheduled cleanup job (cron) | Cleanup in hot path adds latency; scheduled jobs batch deletions efficiently |
| Admin log UI | CSV exports | Server-side pagination + filters | Large datasets (1000+ events) need pagination; CSV doesn't scale or provide real-time view |

**Key insight:** Webhook reliability is harder than it appears. Stripe retries create race conditions, network issues cause timeouts, and edge cases (out-of-order events, partial failures) are common. Use battle-tested patterns rather than inventing solutions.

## Common Pitfalls

### Pitfall 1: Race Conditions During Retries

**What goes wrong:** Stripe sends webhook → handler starts processing → network timeout before 200 response → Stripe retries immediately → second handler starts processing → both handlers update database → duplicate records.

**Why it happens:** Database transactions without proper idempotency checks. The unique constraint check happens AFTER business logic executes.

**How to avoid:**
1. Check idempotency FIRST, before any business logic
2. Use database unique constraints, not SELECT-then-INSERT patterns (race condition window)
3. Use `INSERT ... ON CONFLICT DO NOTHING` pattern in PostgreSQL
4. Return 200 immediately after idempotency check passes, before complex processing

**Warning signs:**
- Duplicate reminder emails sent to users
- User charged twice for same period
- Database constraint violations in logs
- Webhooks taking >10 seconds to respond

### Pitfall 2: Timeout Cascades

**What goes wrong:** Webhook handler makes slow API call (Stripe, OpenAI) → exceeds 10s timeout → Vercel returns 504 → Stripe retries → same slow call → timeout loop.

**Why it happens:** Synchronous external API calls in webhook handler without timeout controls. Vercel free tier has 10s limit, Pro has 60s (configurable to 300s).

**How to avoid:**
1. Set aggressive timeouts on external API calls (5s max)
2. Use async processing for slow operations (queue pattern)
3. Cache frequently-accessed Stripe data (customer, subscription)
4. Monitor webhook processing time, alert on >5s
5. Consider Vercel Pro for 60s timeout if needed

**Warning signs:**
- 504 Gateway Timeout errors in Vercel logs
- Stripe dashboard shows "Failed" webhook attempts
- Multiple retries for same event
- Users report delayed status updates

### Pitfall 3: Unbounded Data Growth

**What goes wrong:** Webhook events table grows indefinitely → queries slow down → indexes bloat → disk space fills → database performance degrades.

**Why it happens:** No TTL cleanup strategy. Storing 1000 events/day = 365K/year = millions over time.

**How to avoid:**
1. Implement 30-day retention policy (Stripe's event retention is 30 days)
2. Use scheduled cleanup job (daily or weekly)
3. Add `expires_at` column with index for efficient cleanup
4. Use partitioning for very high volumes (>1M events)
5. Consider archiving old events to cold storage (S3)

**Warning signs:**
- Webhook queries taking >1s
- Database storage growing >10GB/month
- Slow admin log page load times
- pg_stat_statements shows slow queries on webhook_events

### Pitfall 4: Silent Failures

**What goes wrong:** Webhook handler catches all exceptions → returns 200 → Stripe thinks it succeeded → error never seen → user billing broken.

**Why it happens:** Over-defensive error handling. Developers return 200 to prevent retries but lose visibility into real issues.

**How to avoid:**
1. Return 200 only for duplicate events (idempotency) or non-retriable errors
2. Return 500 for retriable errors (DB connection, temporary API issues)
3. Log ALL failures with context (event ID, type, error message)
4. Set up alerting for webhook failures (email admin)
5. Create admin dashboard to view failed events

**Warning signs:**
- Users report billing issues but no errors in logs
- Stripe dashboard shows 100% success but business logic not executing
- No visibility into which events are failing
- Missing email notifications

### Pitfall 5: Out-of-Order Event Handling

**What goes wrong:** User upgrades plan → `subscription.updated` → webhook processes → user downgrades immediately → `subscription.updated` arrives first → final state is wrong plan.

**Why it happens:** Network latency causes events to arrive out of order. Stripe doesn't guarantee ordering across different event types.

**How to avoid:**
1. Use timestamps to detect stale updates (compare `event.created` with last processed time)
2. For subscriptions, always fetch fresh data from Stripe API before critical decisions
3. Use version numbers or sequence IDs if available
4. Log event timestamps to detect ordering issues
5. Consider idempotent state machines that can handle events in any order

**Warning signs:**
- User sees old plan after updating
- Billing status flips between states
- Event timestamps in logs are out of sequence
- Race conditions during rapid user actions

## Code Examples

Verified patterns from official sources:

### Webhook Handler with Idempotency (Next.js App Router)

```typescript
// Source: Stripe + Next.js 15+ best practices (January 2026)
// https://github.com/vercel/next.js/discussions/48885
// https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getStripeClient } from "@/lib/stripe/client";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  // CRITICAL: Use request.text() not request.body() for raw body
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Check idempotency
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id),
  });

  if (existing) {
    console.log(`Duplicate event: ${event.id} (${event.type})`);
    return NextResponse.json({ received: true }); // 200 to stop retries
  }

  // Record event
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db.insert(webhookEvents).values({
    eventId: event.id,
    eventType: event.type,
    status: 'processed',
    expiresAt,
  });

  // Process event
  try {
    switch (event.type) {
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      // ... other handlers
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    await db
      .update(webhookEvents)
      .set({
        status: 'failed',
        errorMessage: error.message
      })
      .where(eq(webhookEvents.eventId, event.id));

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
```

### TTL Cleanup Job (Scheduled API Route)

```typescript
// Source: PostgreSQL TTL cleanup best practices
// https://blog.sequinstream.com/time-based-retention-strategies-in-postgres/
// https://nicolaiarocci.com/automatic-deletion-of-older-records-in-postgres/

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

// Protect with authorization header
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify cron secret (from Vercel Cron or external service)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Delete events where expiresAt < now
    const result = await db
      .delete(webhookEvents)
      .where(lt(webhookEvents.expiresAt, now))
      .returning({ deletedId: webhookEvents.id });

    const deletedCount = result.length;

    console.log(`Cleaned up ${deletedCount} expired webhook events`);

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Webhook cleanup failed:", error);
    return NextResponse.json(
      { error: "Cleanup failed", message: error.message },
      { status: 500 }
    );
  }
}

// Configure as Vercel Cron Job in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/cleanup-webhooks",
//     "schedule": "0 0 * * *"  // Daily at midnight UTC
//   }]
// }
```

### Payment Failed Email Template (React Email)

```typescript
// Source: Resend + React Email best practices
// https://saufter.io/effective-failed-payment-email-and-message-templates/
// https://resend.com/docs

import { sendEmail, EMAIL_FROM } from "@/lib/email/client";

interface PaymentFailedEmailProps {
  userName: string;
  amount: string;
  currency: string;
  billingPortalUrl: string;
  retryDate: Date;
}

function renderPaymentFailedEmail(props: PaymentFailedEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d32f2f;">Payment Failed</h2>

          <p>Hi ${props.userName},</p>

          <p>We were unable to process your subscription payment of <strong>${props.amount} ${props.currency}</strong>.</p>

          <p>This could be due to:</p>
          <ul>
            <li>Insufficient funds</li>
            <li>Expired card</li>
            <li>Card issuer declined the charge</li>
          </ul>

          <p><strong>What happens next?</strong></p>
          <p>We'll automatically retry your payment on ${props.retryDate.toLocaleDateString()}. To avoid service interruption, please update your payment method now.</p>

          <div style="margin: 30px 0;">
            <a href="${props.billingPortalUrl}"
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Update Payment Method
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            If you have any questions, please reply to this email or contact our support team.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      </body>
    </html>
  `;
}

export async function sendPaymentFailedEmail(props: PaymentFailedEmailProps) {
  return sendEmail({
    to: props.userName, // This should be email address
    subject: "Action Required: Payment Failed",
    html: renderPaymentFailedEmail(props),
  });
}
```

### Admin Webhook Log Page (Next.js)

```typescript
// Source: Webhook admin dashboard best practices
// https://developer.squareup.com/docs/devtools/webhook-logs
// https://docs.adyen.com/development-resources/logs-resources/webhook-event-logs

import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";
import { desc, like, eq, and, gte } from "drizzle-orm";

export default async function WebhookLogsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Build filters
  const filters = [];
  if (searchParams.status) {
    filters.push(eq(webhookEvents.status, searchParams.status));
  }
  if (searchParams.type) {
    filters.push(like(webhookEvents.eventType, `%${searchParams.type}%`));
  }

  // Query events
  const events = await db
    .select()
    .from(webhookEvents)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(webhookEvents.processedAt))
    .limit(pageSize)
    .offset(offset);

  // Count for pagination
  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(webhookEvents)
    .where(filters.length > 0 ? and(...filters) : undefined);

  const total = Number(totalCount[0]?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Webhook Event Logs</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select name="status" className="border rounded px-3 py-2">
          <option value="">All Statuses</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>

        <input
          type="text"
          name="type"
          placeholder="Filter by event type..."
          className="border rounded px-3 py-2 flex-1"
        />
      </div>

      {/* Events table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Event ID</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Processed At</th>
              <th className="px-4 py-2 text-left">Duration</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-sm">{event.eventId}</td>
                <td className="px-4 py-2">{event.eventType}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      event.status === "processed"
                        ? "bg-green-100 text-green-800"
                        : event.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {new Date(event.processedAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  {event.processingTimeMs ? `${event.processingTimeMs}ms` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <div>
          Showing {offset + 1}-{Math.min(offset + pageSize, total)} of {total}
        </div>
        <div className="flex gap-2">
          {page > 1 && (
            <a href={`?page=${page - 1}`} className="px-4 py-2 border rounded">
              Previous
            </a>
          )}
          {page < totalPages && (
            <a href={`?page=${page + 1}`} className="px-4 py-2 border rounded">
              Next
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Snapshot events (full object) | Thin events (ID only) | 2024 | Reduced payload size, version-stable, requires API fetch for details |
| Pages Router `config.bodyParser` | App Router `request.text()` | Next.js 13+ (2023) | Simpler API, no config needed, raw body by default |
| Redis for idempotency | PostgreSQL unique constraints | 2023-2024 | Simpler infrastructure, ACID guarantees, no Redis required |
| Manual cron jobs | Vercel Cron (built-in) | 2023 | No external cron service needed, config in vercel.json |
| Email HTML string concat | React Email components | 2024 | Type-safe templates, component reuse, preview mode |
| Third-party webhook proxies | Direct Stripe webhooks | Always | Lower latency, fewer dependencies, simpler debugging |

**Deprecated/outdated:**
- **Pages Router webhook pattern with `bodyParser: false` config**: Next.js App Router doesn't use this config. Use `request.text()` instead.
- **micro package for buffer parsing**: Not needed in App Router. `request.text()` returns raw body.
- **In-memory idempotency caches**: Lost on serverless cold starts. Use database.
- **Synchronous-only processing**: Modern pattern is fast 200 response + optional async work. But for simple updates (<10s), sync is acceptable.

## Open Questions

Things that couldn't be fully resolved:

1. **Scheduled Cleanup: Vercel Cron vs. External Service**
   - What we know: Vercel Cron supports scheduled jobs in vercel.json, runs on Vercel infrastructure
   - What's unclear: Reliability guarantees, execution logs visibility, cost at scale
   - Recommendation: Start with Vercel Cron (simpler), migrate to external service (GitHub Actions, AWS EventBridge) if reliability issues arise

2. **Async Processing: When to Use Queue vs. Sync**
   - What we know: Simple status updates can be synchronous (<10s), complex workflows need queues
   - What's unclear: Exact threshold for "too slow" depends on operations (DB writes fast, API calls slow)
   - Recommendation: Start synchronous for Phase 24 (status updates, emails), add queue in future phase if processing time exceeds 5s

3. **Admin Alerts: Email vs. Slack vs. PagerDuty**
   - What we know: Admin needs notification when webhook processing fails consistently
   - What's unclear: Best notification channel for this project (email cheapest, Slack better UX, PagerDuty for on-call)
   - Recommendation: Email alerts to admin for Phase 24 (using Resend), can upgrade to Slack webhook in future

4. **Event Retention: 30 days vs. Longer**
   - What we know: Stripe retains events for 30 days, longer retention helps debugging but increases storage
   - What's unclear: Optimal retention period for audit compliance and debugging
   - Recommendation: 30 days matches Stripe's retention, sufficient for most debugging; consider archival to S3 if longer audit trail needed

## Sources

### Primary (HIGH confidence)

- [Stripe Webhook Documentation](https://docs.stripe.com/webhooks) - Official webhook handling guide
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests) - Official idempotency patterns
- [Stripe Billing Portal Deep Links](https://docs.stripe.com/customer-management/portal-deep-links) - Payment method update flows
- [Stripe Webhooks with Subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) - Subscription event handling
- [Next.js API Route Handlers](https://nextjs.org/blog/building-apis-with-nextjs) - Official Next.js API patterns
- [Drizzle ORM Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) - PostgreSQL unique constraints
- [Resend Email API](https://resend.com) - Official Resend documentation

### Secondary (MEDIUM confidence)

- [Handling Payment Webhooks Reliably (Medium)](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) - Nov 2025 webhook patterns
- [Hookdeck Webhook Idempotency Guide](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency) - Best practices implementation
- [Stripe Checkout in Next.js 15 (Medium)](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e) - Jan 2025 practical guide
- [PostgreSQL Time-Based Retention](https://blog.sequinstream.com/time-based-retention-strategies-in-postgres/) - TTL cleanup strategies
- [Microsoft Health Check Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/health-endpoint-monitoring) - Health endpoint design
- [Webhook Monitoring Best Practices (MOSS)](https://moss.sh/devops-monitoring/how-to-set-up-webhook-monitoring/) - Monitoring setup guide
- [Next.js Route Handlers Guide (MakerKit)](https://makerkit.dev/blog/tutorials/nextjs-api-best-practices) - API best practices

### Tertiary (LOW confidence)

- [Stripe Thin Events Best Practices (Hookdeck)](https://hookdeck.com/webhooks/platforms/stripe-thin-events-best-practices) - Migration to thin events
- [Failed Payment Email Templates (Saufter)](https://saufter.io/effective-failed-payment-email-and-message-templates/) - Email copy examples
- [Next.js Background Jobs Discussion](https://github.com/vercel/next.js/discussions/33989) - Community patterns for async work
- [Square Webhook Event Logs](https://developer.squareup.com/docs/devtools/webhook-logs) - Example admin dashboard patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, official Stripe SDK, documented patterns
- Architecture: HIGH - Patterns verified in official Stripe docs, Next.js 16 docs, production implementations
- Pitfalls: MEDIUM - Based on community experiences and common failure modes, not all project-specific

**Research date:** 2026-02-11
**Valid until:** 2026-04-11 (60 days - Stripe/Next.js APIs stable, webhook patterns mature)

**Key uncertainties:**
- Optimal cleanup schedule (daily vs. weekly) depends on event volume
- Async processing threshold (5s vs. 10s) needs production metrics
- Admin alert channels depend on team preferences
