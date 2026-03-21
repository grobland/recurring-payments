---
phase: 36-navigation-restructure
plan: 03
subsystem: navigation
tags: [routing, url-restructure, next-app-router]
dependency_graph:
  requires: [36-01, 36-02]
  provides: [new-route-files, updated-internal-links]
  affects: [all-navigation-paths]
tech_stack:
  added: []
  patterns: [next-app-router-pages, verbatim-page-copy]
key_files:
  created:
    - src/app/(dashboard)/payments/dashboard/page.tsx
    - src/app/(dashboard)/payments/dashboard/loading.tsx
    - src/app/(dashboard)/payments/analytics/page.tsx
    - src/app/(dashboard)/payments/forecast/page.tsx
    - src/app/(dashboard)/payments/subscriptions/page.tsx
    - src/app/(dashboard)/payments/subscriptions/loading.tsx
    - src/app/(dashboard)/payments/subscriptions/new/page.tsx
    - src/app/(dashboard)/payments/subscriptions/[id]/page.tsx
    - src/app/(dashboard)/payments/subscriptions/[id]/edit/page.tsx
    - src/app/(dashboard)/payments/transactions/page.tsx
    - src/app/(dashboard)/payments/suggestions/page.tsx
    - src/app/(dashboard)/payments/reminders/page.tsx
    - src/app/(dashboard)/vault/load/page.tsx
  modified:
    - src/app/(auth)/login/login-form.tsx
    - src/app/(dashboard)/admin/layout.tsx
    - src/app/(dashboard)/onboarding/page.tsx
    - src/app/(dashboard)/settings/layout.tsx
    - src/app/(dashboard)/sources/page.tsx
    - src/app/(dashboard)/statements/[id]/page.tsx
    - src/app/(dashboard)/vault/page.tsx
    - src/app/error.tsx
    - src/app/not-found.tsx
    - src/app/page.tsx
    - src/components/sources/incomplete-batch-banner.tsx
    - src/components/suggestions/evidence-list.tsx
    - src/components/vault/vault-empty-state.tsx
    - src/lib/hooks/use-batch-upload.ts
    - src/lib/hooks/use-bulk-patterns.ts
decisions:
  - "Verbatim copy strategy for new route files — no refactoring at copy time to minimize diff surface and risk"
  - "Combined Task 1 and Task 2 link updates for new files — applied updated paths during initial write instead of two passes"
  - "Also updated sources/page.tsx, statements/[id]/page.tsx, vault/page.tsx, error.tsx, not-found.tsx per Rule 2 — these were not in the plan file list but had /dashboard hrefs that need updating for correct navigation"
metrics:
  duration_seconds: 653
  completed_date: "2026-02-25"
  tasks_completed: 2
  files_created: 13
  files_modified: 15
---

# Phase 36 Plan 03: Create New Route Files Summary

11 new page.tsx files created under /payments/* and /vault/load/ by copying source content from old locations with internal links updated to new URL paths, plus 15 shared files updated to use new navigation paths.

## What Was Built

### Task 1: Create /payments/* route files

Created 10 new page files under `/payments/*` and 2 loading.tsx files, copying content verbatim from old locations then updating all internal links within those files to new paths:

| New Route | Source |
|-----------|--------|
| /payments/dashboard | /dashboard |
| /payments/analytics | /analytics |
| /payments/forecast | /dashboard/forecasting |
| /payments/subscriptions | /subscriptions |
| /payments/subscriptions/new | /subscriptions/new |
| /payments/subscriptions/[id] | /subscriptions/[id] |
| /payments/subscriptions/[id]/edit | /subscriptions/[id]/edit |
| /payments/transactions | /transactions |
| /payments/suggestions | /suggestions |
| /payments/reminders | /reminders |

Also copied loading.tsx for dashboard and subscriptions routes.

### Task 2: Create /vault/load and update shared links

Created `/vault/load/page.tsx` copying from `/import/batch/page.tsx` with updated breadcrumb and router.push.

Updated 15 shared/existing files to point to new URL paths. Key changes:
- `login-form.tsx`: callbackUrl default `/dashboard` → `/payments/dashboard`
- `page.tsx` (root): authenticated redirect → `/payments/dashboard`
- `admin/layout.tsx`: non-admin redirect → `/payments/dashboard`
- `onboarding/page.tsx`: all router.push calls → new paths
- `settings/layout.tsx`: `/reminders` → `/payments/reminders`
- `incomplete-batch-banner.tsx`: `/import/batch` → `/vault/load`
- `vault-empty-state.tsx`: `/import/batch` → `/vault/load`
- `evidence-list.tsx`: `/transactions` → `/payments/transactions`
- `use-batch-upload.ts`: `window.location.href` → `/payments/suggestions`
- `use-bulk-patterns.ts`: `window.location.href` → `/payments/subscriptions`

## Verification Results

- `npm run build` passed with no TypeScript errors
- All 11 new routes visible in build output
- No old `window.location.href` references to `/suggestions` or `/subscriptions`
- Old route files remain as dead code (untouched), handled by next.config.ts redirects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Updates] Updated additional files with /dashboard hrefs not in plan file list**
- **Found during:** Task 2 — grep verification revealed additional files
- **Issue:** sources/page.tsx, statements/[id]/page.tsx, vault/page.tsx, error.tsx, not-found.tsx all had `href="/dashboard"` breadcrumbs/links that would navigate to old URL
- **Fix:** Updated all 5 files to use `/payments/dashboard`
- **Files modified:** as listed above
- **Commit:** 8053e9d

## Self-Check: PASSED

Files created verified:
- src/app/(dashboard)/payments/dashboard/page.tsx — EXISTS
- src/app/(dashboard)/payments/subscriptions/page.tsx — EXISTS
- src/app/(dashboard)/vault/load/page.tsx — EXISTS

Commits verified:
- 96ce535 — feat(36-03): create /payments/* and /vault/load route files
- 8053e9d — feat(36-03): update internal link references to new URL paths
