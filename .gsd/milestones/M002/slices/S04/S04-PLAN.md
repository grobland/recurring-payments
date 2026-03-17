# S04: Subscription Detection Integration

**Goal:** Verify that the parallel extraction pipeline correctly populates both `statement_line_items` (full ledger) AND `transactions` (subscription candidates) without regression, and update the `aiMetadata.model` field to reflect the actual model used (gpt-4o-mini).
**Demo:** Upload a bank_debit PDF → both line items and transactions are created → existing transaction browser and subscription tagging work unchanged.

## Must-Haves

- Verify parallel pipeline produces both line items and transactions for bank_debit
- Fix aiMetadata.model to reflect actual model (gpt-4o-mini, not gpt-4o)
- Verify subscription detection quality hasn't degraded with gpt-4o-mini
- Existing transaction browser shows transactions correctly
- Subscription suggestions page works unchanged

## Verification

- `npx tsc --noEmit` exits with zero errors
- `npx vitest run` — all 123 tests pass
- Manual: check that Lloyds Feb 26 statement has both line items (98) AND transactions (8)
- Manual: visit /transactions page → verify transactions display
- Manual: visit /suggestions page → verify subscription suggestions work

## Tasks

- [x] **T01: Fix aiMetadata.model and verify pipeline** `est:10m`
  - Why: The process route hardcodes "gpt-4o" in aiMetadata but we switched to gpt-4o-mini
  - Files: `src/app/api/batch/process/route.ts`
  - Do:
    1. Update `aiMetadata.model` from "gpt-4o" to "gpt-4o-mini" in transaction record creation
    2. Verify the Lloyds Feb 26 statement has both line items and transactions via API
  - Verify: GET /api/statements/[id]/line-items returns 98 items; transactions exist for same statement
  - Done when: aiMetadata correctly reflects model used

## Files Likely Touched

- `src/app/api/batch/process/route.ts`
