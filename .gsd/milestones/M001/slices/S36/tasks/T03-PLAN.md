# T03: 36-navigation-restructure 03

**Slice:** S36 — **Milestone:** M001

## Description

Create all new route files under /payments/* and /vault/load/ by moving page content from old locations to new locations. Old route files remain in place (next.config.ts redirects handle external links; old files are dead code after this phase).

Purpose: Makes all new nav paths functional — clicking sidebar items navigates to real pages instead of 404s.
Output: 11 new page.tsx files under the new URL structure.

## Must-Haves

- [ ] "Navigating to /payments/dashboard renders the dashboard page (not a 404)"
- [ ] "Navigating to /payments/subscriptions renders the subscriptions list"
- [ ] "Navigating to /payments/subscriptions/new renders the new subscription form"
- [ ] "Navigating to /payments/subscriptions/[id] renders the subscription detail page"
- [ ] "Navigating to /payments/subscriptions/[id]/edit renders the edit form"
- [ ] "Navigating to /payments/analytics renders the analytics page"
- [ ] "Navigating to /payments/forecast renders the forecasting page"
- [ ] "Navigating to /payments/transactions renders the transactions page"
- [ ] "Navigating to /payments/suggestions renders the suggestions page"
- [ ] "Navigating to /payments/reminders renders the reminders page"
- [ ] "Navigating to /vault/load renders the batch import page"

## Files

- `src/app/(dashboard)/payments/dashboard/page.tsx`
- `src/app/(dashboard)/payments/analytics/page.tsx`
- `src/app/(dashboard)/payments/forecast/page.tsx`
- `src/app/(dashboard)/payments/subscriptions/page.tsx`
- `src/app/(dashboard)/payments/subscriptions/new/page.tsx`
- `src/app/(dashboard)/payments/subscriptions/[id]/page.tsx`
- `src/app/(dashboard)/payments/subscriptions/[id]/edit/page.tsx`
- `src/app/(dashboard)/payments/transactions/page.tsx`
- `src/app/(dashboard)/payments/suggestions/page.tsx`
- `src/app/(dashboard)/payments/reminders/page.tsx`
- `src/app/(dashboard)/vault/load/page.tsx`
