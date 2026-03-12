import * as Sentry from "@sentry/nextjs";

// Skip Sentry init entirely when no DSN is configured (local dev without Sentry)
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Environment
    environment: process.env.NODE_ENV,

    // Only enable debug in dev when DSN is present
    debug: false,
  });
}
