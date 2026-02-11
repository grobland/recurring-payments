# Requirements: Subscription Manager

**Defined:** 2026-02-11
**Core Value:** Users can see all their subscriptions in one place and never get surprised by a renewal again

## v2.1 Requirements

Requirements for billing & monetization milestone. Each maps to roadmap phases.

### Tier System

- [ ] **TIER-01**: User can subscribe to one of three tiers (Primary, Enhanced, Advanced)
- [ ] **TIER-02**: System maps Stripe price ID to tier for access control
- [ ] **TIER-03**: User's original pricing is preserved when tier prices change (grandfathering)

### Checkout & Portal

- [ ] **PORTAL-01**: User can access customer portal from billing settings
- [ ] **PORTAL-02**: User can switch between tiers with prorated billing
- [ ] **PORTAL-03**: Customer portal displays app branding (logo, colors)

### Feature Gating

- [ ] **GATE-01**: System can check if user has access to a specific feature
- [ ] **GATE-02**: Each tier has defined set of accessible features
- [ ] **GATE-03**: User sees upgrade prompt when accessing locked feature

### Voucher System

- [ ] **VCHR-01**: Admin can create voucher codes for free months in Stripe
- [ ] **VCHR-02**: User can redeem voucher code during checkout
- [ ] **VCHR-03**: Admin can create trial extension vouchers for engaged users

### Webhook Infrastructure

- [ ] **HOOK-01**: System tracks processed webhook events to prevent duplicates
- [ ] **HOOK-02**: User receives email when payment fails

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Enhanced Tier Features (v2.2)

- **BANK-01**: User can connect bank accounts
- **BANK-02**: User can view bank transactions
- **BANK-03**: System auto-imports transactions from connected banks

### Advanced Tier Features (v2.3)

- **INVEST-01**: User can connect investment accounts
- **INVEST-02**: User can view investment portfolio
- **INVEST-03**: System tracks investment performance

### Additional Billing (v2.1.x)

- **BILL-01**: User receives retention offer when cancelling
- **BILL-02**: System identifies high-engagement trial users for extension

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Free tier forever | Creates support burden, no conversion pressure - use 14-day trial |
| Usage-based billing | Revenue unpredictability, confusing for consumer app |
| Pause subscription | Complicates billing logic, rarely resumes |
| Crypto payments | Regulatory complexity, <1% demand |
| Lifetime deals | Destroys LTV math, attracts wrong customers |
| Complex cancellation flows | FTC enforcement risk ($2.5B Amazon settlement) |
| Team/family plans | Defer until product-market fit established |
| Referral program | Requires tracking infrastructure, defer to v2.2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TIER-01 | TBD | Pending |
| TIER-02 | TBD | Pending |
| TIER-03 | TBD | Pending |
| PORTAL-01 | TBD | Pending |
| PORTAL-02 | TBD | Pending |
| PORTAL-03 | TBD | Pending |
| GATE-01 | TBD | Pending |
| GATE-02 | TBD | Pending |
| GATE-03 | TBD | Pending |
| VCHR-01 | TBD | Pending |
| VCHR-02 | TBD | Pending |
| VCHR-03 | TBD | Pending |
| HOOK-01 | TBD | Pending |
| HOOK-02 | TBD | Pending |

**Coverage:**
- v2.1 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14 (pending roadmap creation)

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
