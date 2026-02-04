# Roadmap: Subscription Manager

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2025-02-01)
- v1.1 Import Improvements - Phases 5-8 (shipped 2026-02-02)
- **v1.2 Production Polish** - Phases 9-12 (in progress)

## Overview

v1.2 Production Polish transforms the functional application into a production-ready product. Starting with reliability infrastructure (error tracking, logging, health checks), then improving error handling for users, adding loading and empty states for better perceived performance, and finally polishing mobile responsiveness and visual consistency across all pages.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (9.1, 9.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 9: Reliability Foundation** - Error tracking, structured logging, health checks
- [x] **Phase 10: Error Handling** - User-friendly errors, form validation, retry logic
- [x] **Phase 11: Loading & Empty States** - Skeleton loaders, empty state messages
- [ ] **Phase 12: Mobile & Visual Polish** - Responsive layout, typography, spacing, colors

## Phase Details

### Phase 9: Reliability Foundation

**Goal**: Production monitoring infrastructure captures errors and provides visibility into app health
**Depends on**: v1.1 completion (Phase 8)
**Requirements**: MON-01, MON-02, MON-03, MON-04, MON-05
**Success Criteria** (what must be TRUE):
  1. Errors thrown in production are captured in Sentry with user/request context
  2. `/api/health` endpoint returns database connectivity and API status
  3. API requests log method, path, duration, and status code in structured format
  4. User actions (login, import, subscription CRUD) are logged with user context
  5. Page load times and API latency are measured and reported
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Sentry error tracking and performance monitoring
- [x] 09-02-PLAN.md — Structured logging with Pino and health check endpoint

### Phase 10: Error Handling

**Goal**: Users see helpful, actionable error messages instead of technical failures
**Depends on**: Phase 9 (errors tracked before improving UX)
**Requirements**: ERR-01, ERR-02, ERR-03, ERR-04, ERR-05, ERR-06
**Success Criteria** (what must be TRUE):
  1. API errors display user-friendly toast messages (e.g., "Unable to save subscription. Please try again.")
  2. Form fields show inline validation errors below the field when invalid
  3. Required fields prevent form submission and show "This field is required" message
  4. Failed API calls retry automatically on network errors or 503 responses
  5. PDF import shows specific error messages ("File too large", "Invalid PDF", "Unable to process")
  6. External service outages display fallback UI with "Service temporarily unavailable"
**Plans**: 3 plans

Plans:
- [x] 10-01-PLAN.md — Error utilities, Zod validation messages, form validation modes
- [x] 10-02-PLAN.md — Mutation retry logic, import error handling, fallback UI component
- [x] 10-03-PLAN.md — Gap closure: Integrate ServiceUnavailable into dashboard pages

### Phase 11: Loading & Empty States

**Goal**: Users understand app state during loading and when data is empty
**Depends on**: Phase 10 (error handling complete)
**Requirements**: UX-02, UX-03, UX-04, UX-05
**Success Criteria** (what must be TRUE):
  1. Dashboard shows skeleton cards while analytics data loads
  2. Subscription list shows skeleton rows while fetching subscriptions
  3. Import page shows spinner with status text during PDF processing
  4. Empty subscription list displays "No subscriptions yet. Add your first subscription or import from a bank statement."
  5. Empty import history displays "No imports yet. Upload a PDF to get started."
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Shared loading infrastructure, Dashboard and Subscriptions skeletons, empty states
- [x] 11-02-PLAN.md — Import page staged processing status, cancel option, import history

### Phase 12: Mobile & Visual Polish

**Goal**: App looks polished and works well on all screen sizes
**Depends on**: Phase 11 (loading states complete)
**Requirements**: UX-01, UX-06, UX-07, UX-08
**Success Criteria** (what must be TRUE):
  1. Sidebar collapses to hamburger menu on mobile screens
  2. Forms stack vertically and remain usable on mobile
  3. Dashboard adapts from multi-column to single-column on mobile
  4. Typography follows consistent scale (headings, body, labels, captions)
  5. Spacing uses consistent values (padding, margins, gaps match design system)
  6. Colors are applied consistently (primary actions, secondary actions, muted text, destructive states)
**Plans**: 3 plans

Plans:
- [ ] 12-01-PLAN.md — Mobile-optimized spacing and touch targets for dashboard pages
- [ ] 12-02-PLAN.md — Form mobile polish with touch targets and button layouts
- [ ] 12-03-PLAN.md — Remaining pages, shared components, and human verification

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 9.1 -> 9.2 -> 10 -> ...

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 9. Reliability Foundation | v1.2 | 2/2 | ✓ Complete | 2026-02-04 |
| 10. Error Handling | v1.2 | 3/3 | ✓ Complete | 2026-02-04 |
| 11. Loading & Empty States | v1.2 | 2/2 | ✓ Complete | 2026-02-04 |
| 12. Mobile & Visual Polish | v1.2 | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-03*
*Last updated: 2026-02-04*
