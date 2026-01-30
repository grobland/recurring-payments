# Roadmap: Subscription Manager

## Overview

This roadmap delivers milestone v1.0 "Get It Running" — configuring all service integrations and verifying that PDF import, subscription CRUD, and email reminders work end-to-end. The codebase is feature-complete but untested with real services. We start by configuring all external services (OpenAI, Stripe, Resend, Vercel), then verify each core feature in priority order.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Service Configuration** - Configure all external service integrations
- [x] **Phase 2: PDF Import Verification** - Verify AI-powered bank statement import works
- [x] **Phase 3: Core CRUD Verification** - Verify subscription add/edit/delete works
- [ ] **Phase 4: Email Reminders Verification** - Verify reminder emails are sent

## Phase Details

### Phase 1: Service Configuration
**Goal**: All external services are configured and the app is deployed to a preview environment
**Depends on**: Nothing (first phase)
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04
**Success Criteria** (what must be TRUE):
  1. OpenAI API key is set in environment and can make API calls
  2. Stripe test mode API keys are set in environment
  3. Resend API key is set in environment
  4. App is deployed to Vercel preview URL and accessible in browser
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Configure API keys (OpenAI, Stripe, Resend) and verify they work
- [x] 01-02-PLAN.md — Deploy to Vercel and verify preview URL is accessible

### Phase 2: PDF Import Verification
**Goal**: User can upload a bank statement PDF and see extracted subscriptions in the dashboard
**Depends on**: Phase 1 (needs OpenAI API key and deployed app)
**Requirements**: TEST-01
**Success Criteria** (what must be TRUE):
  1. User can navigate to PDF import page
  2. User can upload a bank statement PDF file
  3. System processes PDF with OpenAI GPT-4 Vision and extracts subscription data
  4. User can see extracted subscriptions listed in the import results
  5. User can confirm import and see subscriptions in dashboard
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Add OpenAI timeout config + manual verification with real bank statement
- [x] 02-02-PLAN.md — Create E2E test for PDF import flow

### Phase 3: Core CRUD Verification
**Goal**: User can manually manage subscriptions (add, edit, delete)
**Depends on**: Phase 1 (needs deployed app)
**Requirements**: TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. User can add a new subscription with name, amount, billing cycle, and category
  2. User can view the newly added subscription in the dashboard
  3. User can edit an existing subscription and see changes reflected
  4. User can delete a subscription and see it removed from the dashboard
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Set up Playwright authentication for E2E tests
- [x] 03-02-PLAN.md — Create CRUD E2E tests for subscriptions

### Phase 4: Email Reminders Verification
**Goal**: Email reminders are sent when subscriptions are due for renewal
**Depends on**: Phase 1 (needs Resend API key and deployed app)
**Requirements**: TEST-05
**Success Criteria** (what must be TRUE):
  1. System can identify subscriptions with upcoming renewals
  2. Email reminder is sent via Resend to user's email address
  3. User receives email with subscription renewal details
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Service Configuration | 2/2 | Complete | 2026-01-26 |
| 2. PDF Import Verification | 2/2 | Complete | 2026-01-29 |
| 3. Core CRUD Verification | 2/2 | Complete | 2026-01-30 |
| 4. Email Reminders Verification | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-26*
*Milestone: v1.0 Get It Running*
