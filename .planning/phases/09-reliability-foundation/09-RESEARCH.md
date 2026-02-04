# Phase 9: Reliability Foundation - Research

**Researched:** 2026-02-04
**Domain:** Error tracking, structured logging, health monitoring, performance metrics
**Confidence:** HIGH

## Summary

This phase establishes production monitoring infrastructure using Sentry for error tracking and performance monitoring, Pino for structured logging, and a custom health check endpoint. The stack is well-suited for Next.js 16 on Vercel with minimal configuration overhead.

Sentry provides comprehensive error tracking with automatic instrumentation for Next.js App Router, including page loads, API routes, and server components. Its free Developer tier (5k errors, 50 replays) is sufficient for initial production use. For structured logging, Pino is the recommended choice due to its performance characteristics and native JSON output, which works well with Vercel's log infrastructure. Performance monitoring is best handled through Sentry's built-in tracing (Web Vitals, API latency) rather than introducing additional tools.

**Primary recommendation:** Use @sentry/nextjs for error tracking and performance monitoring, Pino for structured logging, and a simple database-query-based health check endpoint.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sentry/nextjs | ^9.x | Error tracking, performance monitoring | Official Sentry SDK for Next.js, automatic instrumentation |
| pino | ^9.x | Structured JSON logging | High performance, minimal overhead, Vercel-compatible |
| pino-pretty | ^11.x | Dev logging formatter | Human-readable logs in development |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-logger | ^5.x | Next.js logging patch | If you want to replace console.log globally |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pino | Winston | Winston is more feature-rich but slower; Pino better for serverless |
| Sentry | Vercel Analytics | Vercel Analytics is simpler but lacks error tracking depth |
| Sentry | Datadog/New Relic | More powerful APM but significantly more expensive |

**Installation:**
```bash
npm install @sentry/nextjs pino pino-pretty
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── instrumentation.ts           # Next.js instrumentation hook (Sentry server init)
├── instrumentation-client.ts    # Client-side Sentry init
├── sentry.server.config.ts      # Server-side Sentry config
├── sentry.edge.config.ts        # Edge runtime Sentry config
├── lib/
│   └── logger.ts                # Pino logger factory
└── app/
    ├── global-error.tsx         # Already exists - add Sentry.captureException
    ├── error.tsx                # Already exists - add Sentry.captureException
    └── api/
        └── health/
            └── route.ts         # Health check endpoint
```

### Pattern 1: Sentry Configuration Files
**What:** Separate configuration files for each Next.js runtime
**When to use:** Always - required for App Router

**instrumentation.ts (root or src):**
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

**sentry.server.config.ts:**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.NODE_ENV,
});
```

**instrumentation-client.ts:**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  environment: process.env.NODE_ENV,
});
```

### Pattern 2: Pino Logger with Environment Detection
**What:** Single logger factory that outputs JSON in production, pretty in development
**When to use:** All server-side logging

**lib/logger.ts:**
```typescript
// Source: https://blog.arcjet.com/structured-logging-in-json-for-next-js/
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});

export default logger;

// Create child loggers for modules
export const createLogger = (module: string) => logger.child({ module });
```

### Pattern 3: Health Check Endpoint
**What:** Simple endpoint that verifies database connectivity
**When to use:** Required for production monitoring and deployment verification

**app/api/health/route.ts:**
```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks = {
    status: "healthy" as "healthy" | "unhealthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: "unknown" as "ok" | "error", latency: 0 },
      api: { status: "ok" as const },
    },
  };

  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.checks.database = {
      status: "ok",
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.checks.database = {
      status: "error",
      latency: 0,
    };
    checks.status = "unhealthy";
  }

  const statusCode = checks.status === "healthy" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
```

### Pattern 4: API Route Logging Wrapper
**What:** Higher-order function that logs request details
**When to use:** Wrap API route handlers for consistent logging

```typescript
// lib/api-logger.ts
import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

type Handler = (req: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>;

export function withLogging(handler: Handler, routeName: string): Handler {
  return async (req, context) => {
    const start = Date.now();
    const log = logger.child({
      route: routeName,
      method: req.method,
      path: req.nextUrl.pathname,
    });

    log.info("Request started");

    try {
      const response = await handler(req, context);
      const duration = Date.now() - start;

      log.info({
        status: response.status,
        duration,
      }, "Request completed");

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      log.error({ error, duration }, "Request failed");
      throw error;
    }
  };
}
```

### Pattern 5: User Context in Sentry
**What:** Set user identity for error reports
**When to use:** After authentication in layouts/pages

```typescript
// In authenticated layout or after login
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";

// Server Component
const session = await auth();
if (session?.user) {
  Sentry.setUser({
    id: session.user.id,
    email: session.user.email || undefined,
  });
}

// Client Component (in useEffect)
useEffect(() => {
  if (session?.user) {
    Sentry.setUser({
      id: session.user.id,
      email: session.user.email || undefined,
    });
  }
  return () => Sentry.setUser(null);
}, [session]);
```

### Anti-Patterns to Avoid
- **Setting Sentry user in middleware:** Middleware runs in isolated edge runtime; context doesn't propagate to API routes
- **Using console.log in production:** Unstructured, hard to search, no context
- **Health checks that hit external services:** Should only check what you control
- **100% tracesSampleRate in production:** Expensive and unnecessary; use 10-20%

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error tracking | Custom error logging | Sentry | Stack traces, source maps, context, aggregation |
| Performance monitoring | Manual timing code | Sentry tracing | Auto-instrumentation, Web Vitals, distributed tracing |
| JSON logging | Custom JSON formatter | Pino | Battle-tested, performant, handles edge cases |
| Log correlation | Manual request IDs | Pino child loggers | Automatic context propagation |

**Key insight:** Sentry's automatic instrumentation captures far more than you would manually instrument, including Web Vitals (LCP, INP, CLS, FCP, TTFB), fetch/XHR timing, and page navigation.

## Common Pitfalls

### Pitfall 1: Sentry User Context Not Propagating
**What goes wrong:** Setting user in middleware doesn't appear in server component errors
**Why it happens:** Middleware runs in isolated edge runtime; context is not shared
**How to avoid:** Set user context in each runtime separately (client, server components, API routes)
**Warning signs:** Errors appear in Sentry without user information

### Pitfall 2: Pino Workers in Serverless
**What goes wrong:** Pino's worker threads don't work in Vercel serverless functions
**Why it happens:** Serverless doesn't support persistent workers
**How to avoid:** Use synchronous Pino transport in production (default JSON output)
**Warning signs:** Logger initialization errors, missing logs

### Pitfall 3: High Sampling Rate in Production
**What goes wrong:** Exceed free tier limits quickly; high costs
**Why it happens:** Using development settings (100%) in production
**How to avoid:** Set tracesSampleRate to 0.1 (10%) for production
**Warning signs:** Unexpected Sentry bills, rate limiting

### Pitfall 4: Exposing Sensitive Data in Logs
**What goes wrong:** Passwords, tokens, PII in log output
**Why it happens:** Logging entire request bodies or user objects
**How to avoid:** Explicitly select fields to log; never log request.body raw
**Warning signs:** Sensitive data visible in Vercel logs

### Pitfall 5: Health Check Causing Cascading Failures
**What goes wrong:** Health check makes external API calls that slow down or fail
**Why it happens:** Over-engineering health checks to verify everything
**How to avoid:** Only check database connectivity; keep it simple and fast
**Warning signs:** Health checks timing out, false unhealthy reports

## Code Examples

Verified patterns from official sources:

### Modifying next.config.ts for Sentry
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pino", "pino-pretty"],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Route Sentry requests through your server to avoid ad-blockers
  tunnelRoute: "/monitoring",
});
```

### Updating Error Boundaries for Sentry
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // ... existing UI
}
```

### Structured API Request Logging
```typescript
// In API route handler
import logger from "@/lib/logger";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const start = Date.now();
  const session = await auth();

  const log = logger.child({
    route: "GET /api/subscriptions",
    userId: session?.user?.id,
  });

  try {
    // ... handler logic

    log.info({
      status: 200,
      duration: Date.now() - start,
    }, "Subscriptions fetched");

    return NextResponse.json({ subscriptions });
  } catch (error) {
    log.error({
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - start,
    }, "Failed to fetch subscriptions");

    throw error;
  }
}
```

### User Action Logging
```typescript
// Log user actions with context
import logger from "@/lib/logger";

const actionLog = logger.child({ module: "user-actions" });

// After successful login
actionLog.info({
  action: "login",
  userId: user.id,
  method: "credentials", // or "google"
}, "User logged in");

// After subscription CRUD
actionLog.info({
  action: "subscription.created",
  userId: session.user.id,
  subscriptionId: subscription.id,
  subscriptionName: subscription.name,
}, "Subscription created");

// After import
actionLog.info({
  action: "import.completed",
  userId: session.user.id,
  count: importedSubscriptions.length,
}, "PDF import completed");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sentry.client.config.js | instrumentation-client.ts | Next.js 15 | Uses Next.js instrumentation hooks |
| getServerSideProps wrapping | onRequestError hook | @sentry/nextjs 8.28.0 | Automatic server component error capture |
| Manual Web Vitals reporting | Sentry auto-instrumentation | @sentry/nextjs 8.x | LCP, INP, CLS captured automatically |
| next-logger v4 console patching | v5 instrumentation hooks | 2024 | More reliable, cleaner integration |

**Deprecated/outdated:**
- `sentry.client.config.js` / `sentry.server.config.js` naming: Use new file names
- Manual `reportWebVitals`: Sentry captures these automatically now
- `withSentry` HOC for API routes: Use automatic instrumentation

## Open Questions

Things that couldn't be fully resolved:

1. **Source map upload in Vercel**
   - What we know: Requires SENTRY_AUTH_TOKEN in Vercel environment
   - What's unclear: Exact Vercel integration steps for automatic token setup
   - Recommendation: Use Vercel-Sentry marketplace integration for automatic setup

2. **Log retention on Vercel free tier**
   - What we know: Vercel free tier has limited log retention (1 hour)
   - What's unclear: Exact limits for Pro tier
   - Recommendation: Consider log drain to external service if longer retention needed

3. **Sentry user context in Server Actions**
   - What we know: Requires `withServerActionInstrumentation` wrapper
   - What's unclear: Best pattern for setting user context in Server Actions
   - Recommendation: Set user in the wrapper function before action executes

## Sources

### Primary (HIGH confidence)
- [Sentry Next.js Manual Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) - Complete configuration files
- [Sentry Next.js Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/) - Performance monitoring setup
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/) - Overview and features

### Secondary (MEDIUM confidence)
- [Arcjet Structured Logging Blog](https://blog.arcjet.com/structured-logging-in-json-for-next-js/) - Pino setup patterns
- [Vercel Pino Template](https://vercel.com/templates/next.js/pino-logging) - Official Vercel template
- [Sentry Pricing](https://sentry.io/pricing/) - Free tier limits (5k errors, 50 replays)
- [Hyperping Health Check Guide](https://hyperping.com/blog/nextjs-health-check-endpoint) - Health endpoint patterns

### Tertiary (LOW confidence)
- [GitHub Discussion: setUser in App Router](https://github.com/getsentry/sentry-javascript/discussions/10019) - User context limitations
- [GitHub Discussion: Supabase Health Check](https://github.com/orgs/supabase/discussions/5797) - Database connectivity patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Sentry docs, Vercel templates
- Architecture: HIGH - Patterns from official documentation
- Pitfalls: MEDIUM - Mix of official docs and community reports
- Performance monitoring: HIGH - Sentry automatic instrumentation documented

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable domain)
