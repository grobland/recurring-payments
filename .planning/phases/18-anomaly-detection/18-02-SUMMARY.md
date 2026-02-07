---
phase: 18-anomaly-detection
plan: 02
subsystem: api, hooks
tags: [alerts, api, tanstack-query, price-detection, subscriptions]

# Dependency graph
requires:
  - phase: 18-01
    provides: alerts table, detectPriceChange utility, alertsRelations
provides:
  - GET /api/alerts endpoint for fetching user alerts
  - PATCH /api/alerts/[id] endpoint for acknowledging alerts
  - DELETE /api/alerts/[id] endpoint for dismissing alerts
  - TanStack Query hooks for alert management
  - Price increase detection on subscription update
affects: [18-03, alert-ui, dashboard-header]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Query key factory pattern (alertKeys) for cache management"
    - "Fire-and-forget alert creation on subscription update"
    - "Optimistic UI via cache invalidation on mutations"

key-files:
  created:
    - src/app/api/alerts/route.ts
    - src/app/api/alerts/[id]/route.ts
    - src/lib/hooks/use-alerts.ts
  modified:
    - src/app/api/subscriptions/[id]/route.ts

key-decisions:
  - "Price detection runs before update, alert insert is fire-and-forget"
  - "Alerts include subscription join for efficient rendering"
  - "useHasUnreadAlerts derived hook for badge indicator"
  - "useDismissAllAlerts batch-dismisses for clear all functionality"

patterns-established:
  - "Alert mutation hooks invalidate alertKeys.all for instant UI refresh"
  - "1-minute staleTime for alerts (less aggressive than analytics)"

# Metrics
duration: 4min
completed: 2026-02-07
---

# Phase 18 Plan 02: Alerts API and Hooks Summary

**Complete alerts CRUD API with TanStack Query hooks and price increase detection on subscription edit**

## What Was Built

### Alerts API Endpoints

1. **GET /api/alerts** - Fetches non-dismissed alerts for the authenticated user
   - Returns up to 50 alerts, newest first
   - Includes subscription data (id, name, amount, currency, nextRenewalDate)
   - Filters out dismissed alerts via `isNull(alerts.dismissedAt)`

2. **PATCH /api/alerts/[id]** - Acknowledges an alert
   - Sets `acknowledgedAt` timestamp
   - Verifies user ownership before update
   - Returns the updated alert

3. **DELETE /api/alerts/[id]** - Dismisses an alert (soft delete)
   - Sets `dismissedAt` timestamp
   - Verifies user ownership before update
   - Returns the dismissed alert

### TanStack Query Hooks

- **alertKeys** - Query key factory for consistent cache management
- **useAlerts()** - Fetches alerts with 1-minute stale time and retry logic
- **useHasUnreadAlerts()** - Derived hook returning boolean for badge indicator
- **useAcknowledgeAlert()** - Mutation hook for acknowledging alerts
- **useDismissAlert()** - Mutation hook for dismissing individual alerts
- **useDismissAllAlerts()** - Mutation hook for batch dismissing all alerts

### Price Increase Detection

Modified `PATCH /api/subscriptions/[id]` to:
1. Detect when amount changes via `detectPriceChange()` utility
2. Create `price_increase` alert when change exceeds threshold (>5% OR >$2)
3. Store metadata: oldAmount, newAmount, currency, subscriptionName
4. Use fire-and-forget pattern to not block subscription update

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Alert With Subscription Type
```typescript
interface AlertWithSubscription extends Alert {
  subscription: Pick<Subscription, "id" | "name" | "amount" | "currency" | "nextRenewalDate"> | null;
}
```

### Price Detection Integration
The price detection runs before the subscription update and uses fire-and-forget to avoid blocking the main operation. Errors are logged but don't fail the subscription update.

## Commits

| Hash | Description |
|------|-------------|
| d70ee1e | feat(18-02): create alerts API endpoints |
| 55ab0d9 | feat(18-02): create TanStack Query hooks for alerts |
| 42f4d35 | feat(18-02): add price increase detection to subscription update |

## Testing Notes

1. **API Testing**: Verify endpoints via curl or browser dev tools
2. **Hook Testing**: Import hooks in React components to verify cache invalidation
3. **Price Detection**: Edit a subscription's amount by more than 5% or $2 to trigger alert

## Next Phase Readiness

Phase 18-03 (Alerts UI) can now:
- Use `useAlerts()` to fetch and display alerts
- Use `useHasUnreadAlerts()` for notification badge
- Use `useAcknowledgeAlert()` and `useDismissAlert()` for user interactions
- Price increase alerts will appear immediately when subscriptions are edited
