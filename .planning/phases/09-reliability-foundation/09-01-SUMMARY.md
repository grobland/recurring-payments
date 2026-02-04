---
# Summary Metadata
phase: 09-reliability-foundation
plan: 01

# Dependency Graph
requires:
  - 09-02 (pino logging and health endpoint)
provides:
  - Sentry error tracking integration
  - Performance monitoring via Web Vitals
  - User context in error reports
affects:
  - All error handling and debugging workflows

# Tech Tracking
tech-stack:
  added:
    - "@sentry/nextjs"
  patterns:
    - Instrumentation hooks for Next.js runtime separation
    - Error boundary integration with monitoring
    - User context propagation in server components

# File Tracking
key-files:
  created:
    - src/instrumentation.ts
    - src/instrumentation-client.ts
    - src/sentry.server.config.ts
    - src/sentry.edge.config.ts
  modified:
    - package.json
    - next.config.ts
    - src/app/error.tsx
    - src/app/global-error.tsx
    - src/app/(dashboard)/layout.tsx

# Decisions
decisions:
  - key: sentry-sample-rates
    choice: "0.1 production, 1.0 development"
    reason: "Balance cost/performance in production with full visibility in development"
  - key: replay-sample-rates
    choice: "0.1 session, 1.0 on error"
    reason: "Capture all sessions with errors, sample normal sessions to control costs"
  - key: tunnel-route
    choice: "/monitoring"
    reason: "Bypass ad-blockers that might block Sentry requests"

# Metrics
metrics:
  duration: "7 minutes"
  completed: "2026-02-04"
---

# Phase 09 Plan 01: Sentry Error Tracking Setup Summary

Sentry SDK integration with runtime-aware initialization, error boundary capture, and authenticated user context

## What Was Built

### 1. Instrumentation Files (Task 1)

**src/instrumentation.ts** - Next.js server instrumentation hook:
- Dynamically imports server or edge config based on NEXT_RUNTIME
- Exports onRequestError for automatic request error capture
- Handles both nodejs and edge runtimes

**src/sentry.server.config.ts** and **src/sentry.edge.config.ts**:
- Initialize Sentry with DSN from NEXT_PUBLIC_SENTRY_DSN
- Configure tracesSampleRate: 0.1 in production, 1.0 in development
- Set environment from NODE_ENV
- Enable debug mode in development

**src/instrumentation-client.ts** - Client-side initialization:
- Same base configuration as server
- Adds replayIntegration() for session replays
- Configures replaysSessionSampleRate: 0.1 (sample 10% of sessions)
- Configures replaysOnErrorSampleRate: 1.0 (capture all error sessions)
- Exports onRouterTransitionStart for navigation performance tracking

**next.config.ts** - Wrapped with Sentry:
```typescript
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: false },
});
```

### 2. Error Boundary Integration (Task 2)

**src/app/error.tsx** - Route error boundary:
- Added `Sentry.captureException(error)` in useEffect
- Retained console.error for development debugging
- Errors caught by this boundary are reported to Sentry

**src/app/global-error.tsx** - Root error boundary:
- Added `Sentry.captureException(error)` in useEffect
- Captures critical errors that escape route boundaries

**src/app/(dashboard)/layout.tsx** - User context:
- Added `Sentry.setUser({ id, email })` after auth check
- All errors in authenticated routes include user identity
- Enables filtering and alerting by user in Sentry dashboard

## Architecture

```
Browser Request
    |
    v
[instrumentation-client.ts] -- Client-side init
    |                           - Performance traces
    |                           - Session replays
    |                           - Router transitions
    v
[Next.js App Router]
    |
    +---> Client Error --> [error.tsx] --> Sentry.captureException
    |
    +---> Server Request
              |
              v
         [instrumentation.ts]
              |
              +---> nodejs --> [sentry.server.config.ts]
              |
              +---> edge --> [sentry.edge.config.ts]
              |
              v
         [Dashboard Layout] --> Sentry.setUser
              |
              v
         Error occurs --> Sentry includes user context
```

## Configuration Required

Add to `.env.local`:
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token  # For source map uploads
```

## Verification Results

| Check | Status |
|-------|--------|
| npm run build succeeds | Pass |
| instrumentation.ts exists | Pass |
| instrumentation-client.ts exists | Pass |
| sentry.server.config.ts exists | Pass |
| sentry.edge.config.ts exists | Pass |
| next.config.ts uses withSentryConfig | Pass |
| error.tsx calls Sentry.captureException | Pass |
| global-error.tsx calls Sentry.captureException | Pass |
| Dashboard layout calls Sentry.setUser | Pass |

## Commits

| Hash | Message |
|------|---------|
| 797032b | feat(09-01): install Sentry SDK and create configuration files |
| 813e313 | feat(09-01): add Sentry error capture and user context |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed deprecated hideSourceMaps option**
- **Found during:** Task 1 build verification
- **Issue:** Sentry SDK no longer supports `hideSourceMaps` option, build failed with TypeScript error
- **Fix:** Replaced with `sourcemaps: { disable: false }` configuration
- **Files modified:** next.config.ts

**2. [Rule 2 - Missing Critical] Added onRouterTransitionStart export**
- **Found during:** Task 1 build verification
- **Issue:** Sentry SDK warning about missing navigation instrumentation
- **Fix:** Added `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart` to instrumentation-client.ts
- **Files modified:** src/instrumentation-client.ts

## Next Phase Readiness

**Ready to proceed.** Sentry integration is complete and verified.

**Before production deployment:**
1. Create Sentry project and obtain DSN
2. Add environment variables (NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT)
3. Optional: Add SENTRY_AUTH_TOKEN for source map uploads in CI

**Monitoring capabilities now available:**
- Error tracking with stack traces and user context
- Performance monitoring (page loads, API latency)
- Web Vitals tracking (LCP, INP, CLS)
- Session replays for debugging user-reported issues
