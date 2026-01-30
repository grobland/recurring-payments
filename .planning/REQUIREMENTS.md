# Requirements: Subscription Manager

**Defined:** 2026-01-26
**Core Value:** Users can see all their subscriptions in one place and never get surprised by a renewal again

## v1.0 Requirements

Requirements for milestone v1.0 "Get It Running". Each maps to roadmap phases.

### Service Configuration

- [x] **CONF-01**: OpenAI API key configured and working in environment
- [x] **CONF-02**: Stripe account created with test mode API keys configured
- [x] **CONF-03**: Resend account created with API key configured
- [x] **CONF-04**: Vercel project configured and app deployed to preview environment

### Feature Verification

- [x] **TEST-01**: User can upload a bank statement PDF and see extracted subscriptions
- [x] **TEST-02**: User can manually add a new subscription with all fields
- [x] **TEST-03**: User can edit an existing subscription
- [x] **TEST-04**: User can delete a subscription
- [x] **TEST-05**: Email reminder is sent when triggered (manual or cron)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Billing

- **BILL-01**: User trial status enforced (14-day limit)
- **BILL-02**: User can subscribe via Stripe checkout
- **BILL-03**: Billing status updates via webhook

### Production

- **PROD-01**: Custom domain configured
- **PROD-02**: Production environment variables set
- **PROD-03**: Error monitoring configured

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Stripe billing flows | Configure keys only this milestone, test billing later |
| Production deployment | Dev environment only for now |
| Custom domain | Not needed for dev |
| Automated E2E tests | Manual verification sufficient for v1.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONF-01 | Phase 1 | Complete |
| CONF-02 | Phase 1 | Complete |
| CONF-03 | Phase 1 | Complete |
| CONF-04 | Phase 1 | Complete |
| TEST-01 | Phase 2 | Complete |
| TEST-02 | Phase 3 | Complete |
| TEST-03 | Phase 3 | Complete |
| TEST-04 | Phase 3 | Complete |
| TEST-05 | Phase 4 | Complete |

**Coverage:**
- v1.0 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-01-26*
*Last updated: 2026-01-30 after Phase 4 completion*
