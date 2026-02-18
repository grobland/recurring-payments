# Phase 28: Voucher System - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can create vouchers and users can redeem them for discounts or free months. Vouchers are created in Stripe Dashboard. Users apply promo codes during checkout via Stripe's native field. Trial extension vouchers are admin-applied directly (no user action required).

</domain>

<decisions>
## Implementation Decisions

### Voucher Management Approach
- Create vouchers in Stripe Dashboard only (no custom admin UI for creation)
- Support both percentage-off and free-month (100% off for X months) discount types
- Single-use per user (each user can redeem once, code can work for multiple users)
- Expiration dates required on all vouchers

### Trial Extension Mechanism
- Admin applies extension directly to user (zero friction for user)
- Extension duration configurable per voucher (not fixed)
- Extensions are cumulative (user can receive multiple extensions)
- Trial users only (paid subscribers cannot use trial extension vouchers)

### Voucher Distribution
- Manual sharing only (admin copies code from Stripe Dashboard)
- Trial extensions admin-applied (user sees extended trial without entering code)
- Checkout promo codes use Stripe's native `allow_promotion_codes` field
- No automated voucher triggers (all manual decisions)

### Admin Visibility
- Basic list of applied vouchers/trial extensions in admin panel
- Show trial extension recipients with: user, days added, date applied
- Promo code usage tracking via Stripe Dashboard (no custom UI)
- No custom reporting needed (Stripe's built-in reporting sufficient)

### Claude's Discretion
- Database schema for tracking trial extensions
- Admin panel UI layout and styling
- Trial extension API endpoint design
- Exact fields shown in admin voucher list

</decisions>

<specifics>
## Specific Ideas

- Trial extensions should be frictionless for users — admin clicks, trial extends automatically
- Leverage Stripe's native promo code infrastructure for checkout discounts
- Keep admin UI minimal — just enough to see who got extensions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-voucher-system*
*Context gathered: 2026-02-13*
