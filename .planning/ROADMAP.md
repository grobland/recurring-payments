# Roadmap: Subscription Manager

## Milestones

- ✅ **v1.0 Get It Running** - Phases 1-4 (shipped 2026-01-30)
- 🚧 **v1.1 Import Improvements** - Phases 5-8 (in progress)

## Phases

<details>
<summary>✅ v1.0 Get It Running (Phases 1-4) - SHIPPED 2026-01-30</summary>

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
**Plans**: 1 plan

Plans:
- [x] 04-01-PLAN.md — Create E2E test for email reminder trigger and verification

</details>

---

### 🚧 v1.1 Import Improvements (In Progress)

**Milestone Goal:** Improve PDF import accuracy and user control, fix data quality issues discovered during testing.

**Phase Numbering:**
- Integer phases (5, 6, 7, 8): Planned milestone work
- Decimal phases (e.g., 5.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 5: Category Management** - Fix duplicates bug and add full CRUD for categories
- [ ] **Phase 6: Statement Source Tracking** - Track and reuse bank/credit card names
- [ ] **Phase 7: Smart Import UX** - Show all detected items with confidence-based selection
- [ ] **Phase 8: Renewal Date Intelligence** - Calculate renewal dates from transaction dates

## Phase Details

### Phase 5: Category Management
**Goal**: Users can manage categories without duplicates and with full CRUD operations
**Depends on**: Nothing (first phase of v1.1, independent of other phases)
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05
**Success Criteria** (what must be TRUE):
  1. Category dropdown shows no duplicate entries when editing subscriptions
  2. User can create a new category with custom name, icon, and color
  3. User can edit an existing category and see changes reflected immediately
  4. User can delete a category and affected subscriptions become uncategorized
  5. Category dropdown supports search/filter for finding categories quickly
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — Fix duplicate validation bug in POST /api/categories
- [x] 05-02-PLAN.md — Create CategoryCombobox component and integrate into subscription form
- [x] 05-03-PLAN.md — Build category CRUD UI (form, delete dialog, manager)

### Phase 6: Statement Source Tracking
**Goal**: Users can track which bank or credit card each statement came from
**Depends on**: Phase 5 (independent work, but sequenced for organized delivery)
**Requirements**: SOURCE-01, SOURCE-02, SOURCE-03, SOURCE-04
**Success Criteria** (what must be TRUE):
  1. User can enter bank/credit card name when importing a PDF statement
  2. Bank/card name field shows autocomplete suggestions from previous imports
  3. Subscription detail page displays which statement source it was imported from
  4. Import audit records persist the statement source for historical tracking
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Schema and API foundation (statementSource column, sources endpoint)
- [ ] 06-02-PLAN.md — Import UI integration (AccountCombobox, useImportSources hook)
- [ ] 06-03-PLAN.md — Display source in subscription detail page

### Phase 7: Smart Import UX
**Goal**: Users see all detected statement items and can choose which ones to import
**Depends on**: Phase 6 (builds on statement source tracking foundation)
**Requirements**: IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04, IMPORT-05, IMPORT-06
**Success Criteria** (what must be TRUE):
  1. User sees complete list of all items detected from PDF with confidence scores (0-100)
  2. Items display visual confidence indicators (green for high, yellow for medium, red for low confidence)
  3. User can select/deselect individual items via checkboxes before importing
  4. High-confidence items (70%+) are automatically pre-selected but user can override
  5. User can click "Select all high confidence" button to reset to default selections
  6. System persists raw extraction data for each import for future audit and reprocessing
**Plans**: TBD

Plans:
- [ ] TBD (planned during phase planning)

### Phase 8: Renewal Date Intelligence
**Goal**: Renewal dates are calculated from actual transaction dates on statements
**Depends on**: Phase 7 (builds on AI extraction enhancements)
**Requirements**: RENEW-01, RENEW-02, RENEW-03
**Success Criteria** (what must be TRUE):
  1. System extracts transaction date from statement text using AI analysis
  2. Next renewal date is calculated from the statement transaction date (not import date)
  3. User can review and manually override the calculated renewal date during import if needed
**Plans**: TBD

Plans:
- [ ] TBD (planned during phase planning)

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Service Configuration | v1.0 | 2/2 | Complete | 2026-01-26 |
| 2. PDF Import Verification | v1.0 | 2/2 | Complete | 2026-01-29 |
| 3. Core CRUD Verification | v1.0 | 2/2 | Complete | 2026-01-30 |
| 4. Email Reminders Verification | v1.0 | 1/1 | Complete | 2026-01-30 |
| 5. Category Management | v1.1 | 3/3 | Complete | 2026-01-31 |
| 6. Statement Source Tracking | v1.1 | 0/3 | Not started | - |
| 7. Smart Import UX | v1.1 | 0/TBD | Not started | - |
| 8. Renewal Date Intelligence | v1.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-26*
*Updated for v1.1 milestone: 2026-01-31*
