---
phase: 51-ui-screens-verification
plan: 03
subsystem: ui
tags: [react, tanstack-query, recurring-payments, forms, merchant-aliases, detail-page, settings]

# Dependency graph
requires:
  - phase: 51-01
    provides: TanStack Query hooks (useRecurringMasterDetail, useUpdateMaster, useChangeMasterStatus, useMergeMasters, useRecurringMasters)
  - phase: 50-apis-review-queue
    provides: REST API endpoints for /api/recurring/masters/[id], /api/recurring/masters/[id]/status, /api/recurring/masters/[id]/merge

provides:
  - RecurringMasterDetail component (master detail view with metadata, edit, status actions, merge, series chain, event log)
  - /recurring/[id] page (server component wrapping RecurringMasterDetail)
  - MerchantAliasManager component (merchant entity + alias CRUD table)
  - /recurring/settings page (settings with MerchantAliasManager)
  - /api/recurring/merchants — GET list + POST create merchant entity with alias
  - /api/recurring/merchants/[id] — PATCH update name + DELETE entity (cascades aliases)

affects:
  - 51-04 (Review Queue page — can link to /recurring/[id] for master context)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Detail page uses client component pattern — DashboardHeader in server page, RecurringMasterDetail client component receives id prop"
    - "Status action buttons: conditional rendering based on current master status, AlertDialog for destructive actions"
    - "Merge dialog: radio selection from masters list, navigates to target on success via router.push"
    - "MerchantAliasManager: inline TanStack Query (useQuery + useMutation) without custom hooks — simpler for isolated component"
    - "zodResolver type mismatch workaround: cast to any — pre-existing duplicate react-hook-form type issue in project"

key-files:
  created:
    - src/components/recurring/recurring-master-detail.tsx
    - src/app/(dashboard)/recurring/[id]/page.tsx
    - src/components/recurring/merchant-alias-manager.tsx
    - src/app/(dashboard)/recurring/settings/page.tsx
    - src/app/api/recurring/merchants/route.ts
    - src/app/api/recurring/merchants/[id]/route.ts
  modified: []

key-decisions:
  - "Merchant API endpoints created inline as part of Task 2 — Phase 50 did not include them, Rule 3 auto-fix"
  - "MerchantAliasManager uses inline TanStack Query rather than custom hook — component is self-contained and CRUD is straightforward"
  - "Detail page component is pure client ('use client') — all state is dynamic (status, merge, edit dialogs)"

patterns-established:
  - "Server page + client component split: server page extracts params, renders client component with id prop"
  - "Status-conditional action buttons: only relevant actions shown per current status state machine"
  - "Merchant normalizedName computed as name.toLowerCase().trim() in API — consistent with pipeline normalization"

requirements-completed: [UI-07, UI-08]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 51 Plan 03: Recurring Master Detail and Settings Pages Summary

**Recurring master detail page (/recurring/[id]) with metadata, edit form, status controls, merge action, series chain, and event log; plus settings page (/recurring/settings) with merchant alias CRUD (MERCH-05 delivered)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18T11:18:20Z
- **Completed:** 2026-03-18T11:23:00Z
- **Tasks:** 2
- **Files modified:** 6 created

## Accomplishments

- Created `src/components/recurring/recurring-master-detail.tsx` — "use client" component with: header (name, kind badge, status badge, edit button), metadata card (2-col grid), status action buttons (pause/cancel/reactivate/activate conditional on current status), merge dialog with master selection + redirect, linked series chain card, activity log card (scrollable, reverse chronological)
- Created `src/app/(dashboard)/recurring/[id]/page.tsx` — server page extracting id from params, DashboardHeader with breadcrumbs, renders RecurringMasterDetail
- Created `src/components/recurring/merchant-alias-manager.tsx` — "use client" component with add form, table of merchant entities and aliases, edit dialog, delete with confirmation. Uses inline TanStack Query hooks
- Created `src/app/(dashboard)/recurring/settings/page.tsx` — server page with metadata title, DashboardHeader breadcrumbs, renders MerchantAliasManager, note about system-defined thresholds
- Created `src/app/api/recurring/merchants/route.ts` — GET (list entities with aliases joined) + POST (create entity + alias)
- Created `src/app/api/recurring/merchants/[id]/route.ts` — PATCH (update entity name) + DELETE (delete entity, cascades to aliases)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build recurring master detail page (UI-07)** - `9587a66` (feat)
2. **Task 2: Build settings page with merchant alias management (UI-08, MERCH-05)** - `8ac72d7` (feat)

## Files Created/Modified

- `src/components/recurring/recurring-master-detail.tsx` — Full detail view component
- `src/app/(dashboard)/recurring/[id]/page.tsx` — Detail page at /recurring/[id]
- `src/components/recurring/merchant-alias-manager.tsx` — Merchant alias CRUD table
- `src/app/(dashboard)/recurring/settings/page.tsx` — Settings page at /recurring/settings
- `src/app/api/recurring/merchants/route.ts` — Merchant list + create API
- `src/app/api/recurring/merchants/[id]/route.ts` — Merchant update + delete API

## Decisions Made

- Merchant API endpoints created inline as part of Task 2 (Phase 50 did not include them; Rule 3 auto-fix for blocking issue)
- MerchantAliasManager uses inline TanStack Query rather than a custom hook in use-recurring.ts — component is self-contained and the CRUD is simple
- zodResolver typed as `any` to work around pre-existing duplicate react-hook-form type resolution in project (not a new error)
- Detection thresholds are system-defined with no tolerance settings exposed in v4.0 UI (per CONTEXT.md decision)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing merchant API endpoints**
- **Found during:** Task 2
- **Issue:** Plan acknowledged merchant API endpoints might not exist ("If API endpoints don't exist yet, create them"). They did not exist in Phase 50.
- **Fix:** Created `src/app/api/recurring/merchants/route.ts` (GET + POST) and `src/app/api/recurring/merchants/[id]/route.ts` (PATCH + DELETE)
- **Files modified:** 2 new API route files
- **Commit:** 8ac72d7

## Issues Encountered

2 pre-existing TypeScript errors in `src/app/api/transactions/route.ts` and `src/app/api/vault/coverage/route.ts` — present before this plan, unmodified, out of scope.

1 TypeScript type conflict with zodResolver (duplicate react-hook-form type resolution) — resolved with `as any` cast, consistent with the pre-existing project-level type issue.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- /recurring/[id] ready for navigation from the masters list page (51-02)
- /recurring/settings accessible from sidebar or direct nav
- Merchant alias CRUD fully functional via new API endpoints
- Plan 04 (Review Queue page) can proceed — it uses separate hooks (useReviewQueue, useResolveReviewItem)

---
*Phase: 51-ui-screens-verification*
*Completed: 2026-03-18*

## Self-Check: PASSED

All 6 created files verified present on disk. Both task commits (9587a66, 8ac72d7) verified in git log.
