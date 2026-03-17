# S36: Navigation Restructure

**Goal:** Add 308 permanent redirects for all moved URLs in next.
**Demo:** Add 308 permanent redirects for all moved URLs in next.

## Must-Haves


## Tasks

- [x] **T01: 36-navigation-restructure 01** `est:3min`
  - Add 308 permanent redirects for all moved URLs in next.config.ts, update proxy.ts to protect new route paths, and create the /accounts placeholder page.

Purpose: Preserves all existing bookmarks and email links when URLs move. Ensures new paths are auth-protected. Provides the data Vault nav destination before Phase 37 builds the real page.
Output: next.config.ts with redirects array, updated proxy.ts protectedRoutes, accounts/page.tsx placeholder.
- [x] **T02: 36-navigation-restructure 02** `est:2min`
  - Replace the current flat two-group sidebar with three named sections (fin Vault, payments Portal, Support), correct item placement, and accurate active-state logic for nested routes.

Purpose: Users see a structured navigation hub instead of a flat list of 11 items. NAV-01 (correct sections) and NAV-03 (correct active state) both live in this single file.
Output: Updated app-sidebar.tsx with three SidebarGroup blocks, new nav item arrays, and fixed isActive logic.
- [x] **T03: 36-navigation-restructure 03**
  - Create all new route files under /payments/* and /vault/load/ by moving page content from old locations to new locations. Old route files remain in place (next.config.ts redirects handle external links; old files are dead code after this phase).

Purpose: Makes all new nav paths functional — clicking sidebar items navigates to real pages instead of 404s.
Output: 11 new page.tsx files under the new URL structure.

## Files Likely Touched

- `next.config.ts`
- `src/app/proxy.ts`
- `src/app/(dashboard)/accounts/page.tsx`
- `src/components/layout/app-sidebar.tsx`
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
