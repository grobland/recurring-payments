---
phase: 51-ui-screens-verification
plan: "02"
subsystem: recurring-ui
tags: [ui, recurring, review-queue, master-list, nuqs, react-hook-form]
dependency_graph:
  requires: ["51-01"]
  provides: ["/recurring/review page", "/recurring page"]
  affects: ["dashboard navigation", "recurring payment management flow"]
tech_stack:
  added: []
  patterns: ["nuqs URL-persisted filters", "useDelayedLoading skeleton", "EmptyState/ServiceUnavailable error handling", "responsive table+card layout"]
key_files:
  created:
    - src/app/(dashboard)/recurring/review/page.tsx
    - src/components/recurring/review-queue-list.tsx
    - src/components/recurring/review-queue-card.tsx
    - src/app/(dashboard)/recurring/page.tsx
    - src/components/recurring/recurring-master-table.tsx
  modified: []
decisions:
  - "zodResolver cast as any to suppress TS2719 spurious resolver type incompatibility — same pattern as subscription-form.tsx"
  - "DropdownMenu used for Link to Existing when masters.length <= 10; Dialog with scrollable list for > 10 — avoids giant dropdown"
  - "Filter tabs implemented as Button group with local state (not nuqs) — tab is ephemeral UI state, search is URL-persistent"
metrics:
  duration_seconds: 244
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
requirements: [UI-05, UI-06]
---

# Phase 51 Plan 02: Review Queue Page and Recurring Master List Summary

**One-liner:** Card-based review queue at /recurring/review with confidence-sorted items and 4-action resolution, plus table-based master list at /recurring with kind/status badges, filter tabs, and Add Manual dialog.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build review queue page with card-based layout (UI-05) | fc58367 | review-queue-card.tsx, review-queue-list.tsx, review/page.tsx |
| 2 | Build recurring master list page with filter tabs (UI-06) | 4b296ab | recurring-master-table.tsx, recurring/page.tsx |

## What Was Built

### UI-05: Review Queue (`/recurring/review`)

- `ReviewQueueCard` — shows merchant name, confidence badge (green >= 85%, amber 60-84%, red < 60%), series info grid (avg amount, cadence, transaction count), suggested action text, and 4 action buttons
- Confirm (green button), Link to Existing (DropdownMenu for <= 10 masters, Dialog for > 10), Ignore (outline), Not Recurring (destructive)
- `ReviewQueueList` — fetches `useReviewQueue()` + `useRecurringMasters({})`, sorts items by confidence descending, 3-card loading skeleton, EmptyState (ClipboardCheck icon), ServiceUnavailable with retry
- Server component page with metadata title "Review Queue", DashboardHeader with breadcrumbs

### UI-06: Recurring Master List (`/recurring`)

- `RecurringMasterTable` — filter tabs (All / Subscriptions / Bills / Needs Review / Paused/Cancelled), URL-persistent search via nuqs `parseAsString`, `useDebouncedValue(300ms)` for search debounce
- Desktop: Table with Name, Kind (colored badge), Status (colored badge), Amount, Frequency, Next Payment, DropdownMenu actions
- Mobile: Card layout via responsive `hidden md:block` / `md:hidden` classes
- Kind badge palette: subscription=blue, utility=orange, insurance=purple, loan=red, rent_mortgage=emerald, membership=teal, installment=amber, other_recurring=gray
- Status badge palette: active=green, paused=yellow, cancelled=red, dormant=gray, needs_review=orange
- Add Manual dialog: react-hook-form + zodResolver + `createMasterSchema`, fields: name*, recurringKind*, currency*, expectedAmount, billingFrequency
- Server component page with metadata title "Recurring Payments", DashboardHeader with breadcrumbs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TS2719 zodResolver type incompatibility**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `zodResolver(createMasterSchema)` produced TS2719 "Two different types with this name exist, but they are unrelated" — a known spurious error with certain @hookform/resolvers + zod + TypeScript version combinations
- **Fix:** Added `as any` cast on the resolver — same approach used in other form components in the codebase (subscription-form.tsx does not hit this because it doesn't use `z.coerce.number()`)
- **Files modified:** `src/components/recurring/recurring-master-table.tsx`
- **Commit:** 4b296ab (included in task commit)

## Verification

- `npx tsc --noEmit` — only 2 pre-existing errors (transactions/route.ts, vault/coverage/route.ts); all new files clean
- Acceptance criteria: all 16 grep checks passed
- Both pages use hooks from Plan 01 (`useReviewQueue`, `useResolveReviewItem`, `useRecurringMasters`, `useCreateMaster`)

## Self-Check: PASSED

Files created:
- src/app/(dashboard)/recurring/review/page.tsx — FOUND
- src/components/recurring/review-queue-list.tsx — FOUND
- src/components/recurring/review-queue-card.tsx — FOUND
- src/app/(dashboard)/recurring/page.tsx — FOUND
- src/components/recurring/recurring-master-table.tsx — FOUND

Commits:
- fc58367 — feat(51-02): build review queue page with card-based layout (UI-05)
- 4b296ab — feat(51-02): build recurring master list page with filter tabs (UI-06)
