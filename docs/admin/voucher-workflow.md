# Voucher Creation Workflow

This document describes how to create promotional voucher codes for the subscription manager.

## Overview

Vouchers are managed entirely in the Stripe Dashboard. There is no custom admin UI for voucher creation - this keeps the system simple and leverages Stripe's built-in coupon/promotion code management.

## Creating a Discount Voucher

### Step 1: Create a Coupon

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) -> Products -> Coupons
2. Click **Create coupon**
3. Configure the discount:
   - **Percentage off**: e.g., 25% off
   - **Amount off**: e.g., $5 off (for fixed discounts)
4. Set **Duration**:
   - **Once**: Applies to first payment only
   - **Repeating**: Applies for X months
   - **Forever**: Applies to all future payments
5. (Optional) Set redemption limits and expiration date
6. Click **Create coupon**

### Step 2: Create a Promotion Code

1. Click into the coupon you just created
2. Go to **Promotion codes** tab
3. Click **Create code**
4. Enter a memorable code (e.g., `SUMMER25`, `WELCOME10`)
5. (Optional) Set per-code limits:
   - Max redemptions
   - First-time customers only
   - Minimum order amount
6. Click **Create**

## Common Voucher Types

### Percentage Discount (e.g., 25% off first 3 months)

- Coupon: 25% off, duration "repeating" for 3 months
- Promotion code: `SAVE25`

### Free Trial Extension (e.g., 1 month free)

- Coupon: 100% off, duration "repeating" for 1 month
- Promotion code: `FREEMONTH`

### Forever Discount (e.g., 10% off all payments)

- Coupon: 10% off, duration "forever"
- Promotion code: `LOYAL10`

## Sharing Vouchers

Once created, share the promotion code with users via:
- Email
- Support chat
- Social media campaigns
- Partner referrals

Users enter the code during checkout in the "Add promotion code" field.

## Tracking Usage

View redemption stats in Stripe Dashboard:
- Coupons page shows total redemptions per coupon
- Click into a coupon to see individual promotion codes and their usage
- View in Payments section to see which payments used a coupon

## Notes

- Promotion codes are case-insensitive
- Each coupon can have multiple promotion codes with different restrictions
- Deleted coupons cannot be recovered - use expiration dates instead
- Test in Stripe Test Mode before creating production coupons
