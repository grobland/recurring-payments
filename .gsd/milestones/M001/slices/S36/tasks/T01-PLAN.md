# T01: 36-navigation-restructure 01

**Slice:** S36 — **Milestone:** M001

## Description

Add 308 permanent redirects for all moved URLs in next.config.ts, update proxy.ts to protect new route paths, and create the /accounts placeholder page.

Purpose: Preserves all existing bookmarks and email links when URLs move. Ensures new paths are auth-protected. Provides the data Vault nav destination before Phase 37 builds the real page.
Output: next.config.ts with redirects array, updated proxy.ts protectedRoutes, accounts/page.tsx placeholder.

## Must-Haves

- [ ] "Navigating to /dashboard returns a 308 redirect to /payments/dashboard"
- [ ] "Navigating to /subscriptions returns a 308 redirect to /payments/subscriptions"
- [ ] "Navigating to /subscriptions/new returns a 308 redirect to /payments/subscriptions/new"
- [ ] "Navigating to /analytics returns a 308 redirect to /payments/analytics"
- [ ] "Navigating to /dashboard/forecasting returns a 308 redirect to /payments/forecast"
- [ ] "Navigating to /transactions returns a 308 redirect to /payments/transactions"
- [ ] "Navigating to /suggestions returns a 308 redirect to /payments/suggestions"
- [ ] "Navigating to /reminders returns a 308 redirect to /payments/reminders"
- [ ] "Navigating to /import returns a 308 redirect to /vault/load"
- [ ] "Navigating to /import/batch returns a 308 redirect to /vault/load"
- [ ] "Navigating to /accounts shows the placeholder empty state page"
- [ ] "Unauthenticated users attempting /payments/dashboard are redirected to /login"
- [ ] "Unauthenticated users attempting /accounts are redirected to /login"

## Files

- `next.config.ts`
- `src/app/proxy.ts`
- `src/app/(dashboard)/accounts/page.tsx`
