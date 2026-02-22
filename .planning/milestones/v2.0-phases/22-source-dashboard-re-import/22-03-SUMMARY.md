---
phase: 22
plan: 03
subsystem: ui
tags: [statement-detail, reimport, wizard, transactions]
dependency-graph:
  requires:
    - 22-01 (source coverage API and hooks)
  provides:
    - Statement detail page at /statements/[id]
    - Transaction list with status badges
    - ReimportWizard for converting skipped transactions
    - TransactionStatusBadge component
  affects:
    - 22-04 may link to statement details
tech-stack:
  added: []
  patterns:
    - Checkbox selection with Set<string> state
    - Sequential wizard processing with queue state
    - Dialog-based form wizard
key-files:
  created:
    - src/app/(dashboard)/statements/[id]/page.tsx
    - src/components/sources/statement-detail.tsx
    - src/components/sources/reimport-wizard.tsx
    - src/components/sources/transaction-status-badge.tsx
    - src/lib/hooks/use-statement.ts
    - src/app/api/statements/[id]/route.ts
    - src/app/api/transactions/[id]/route.ts
    - src/app/api/transactions/[id]/skip/route.ts
  modified: []
decisions:
  - decision: "Queue-based wizard processing"
    choice: "Process transactions one at a time"
    why: "Per CONTEXT.md - wizard-style with save one, show next"
  - decision: "Skip marks as not_subscription"
    choice: "Update tagStatus to not_subscription on skip"
    why: "Consistent with Phase 21 tagging pattern"
  - decision: "Pre-fill form from transaction"
    choice: "Auto-populate name, amount, currency, next renewal"
    why: "Reduce manual entry for users"
metrics:
  duration: ~7 min
  completed: 2026-02-09
---

# Phase 22 Plan 03: Statement Detail & Re-import Summary

Statement detail page with transaction list and wizard-based re-import for converting skipped transactions to subscriptions.

## One-liner

Statement detail view with transaction status badges and sequential re-import wizard for converting pending/skipped items.

## What Was Built

### 1. TransactionStatusBadge Component
Created reusable badge component that maps tagStatus to visual status:
- `converted` -> green/success badge
- `not_subscription` -> yellow/warning badge (Skipped)
- `unreviewed`/`potential_subscription` -> gray/secondary badge (Pending)

Includes `getImportStatus()` helper for status mapping.

### 2. Statement Detail Page (/statements/[id])
Full-featured statement viewer:
- Header with filename, source type, statement date
- Upload timestamp display
- Summary stats bar: "47 transactions - 12 converted - 8 skipped - 27 pending"
- Transaction table with columns: checkbox, date, merchant, amount, status
- Checkbox selection for pending/skipped (disabled for converted)
- "Import Selected" button appears when items selected

### 3. ReimportWizard Dialog
Sequential wizard for processing multiple transactions:
- Progress indicator: "Importing 2 of 5" with progress bar
- Pre-filled subscription form from transaction data
- Fields: name, amount, currency, frequency, next renewal, category
- Skip button to mark as not_subscription
- Cancel confirmation when mid-process
- Completion summary showing converted/skipped counts

### 4. Supporting API Endpoints
- `GET /api/statements/[id]` - Fetch single statement with stats
- `GET /api/transactions/[id]` - Fetch single transaction details
- `POST /api/transactions/[id]/skip` - Mark transaction as not_subscription

### 5. Supporting Hooks
- `useStatement(id)` - Fetch statement info with TanStack Query

## Technical Details

### Selection Pattern
Reused Phase 21 checkbox selection pattern:
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const selectableIds = useMemo(() =>
  new Set(transactions.filter(tx => tx.tagStatus !== "converted").map(tx => tx.id)),
  [transactions]
);
```

### Wizard State Management
```typescript
type WizardState = {
  queue: string[];      // Transaction IDs to process
  currentIndex: number; // Current position in queue
  completed: number;    // Count of successful conversions
  skipped: number;      // Count of skipped transactions
};
```

### Form Pre-fill Logic
```typescript
const nextDate = addMonths(new Date(transaction.transactionDate), 1);
form.reset({
  name: transaction.merchantName,
  amount: parseFloat(transaction.amount),
  currency: transaction.currency,
  frequency: "monthly",
  nextRenewalDate: nextDate,
  categoryId: null,
});
```

## Deviations from Plan

### Auto-added Critical Functionality

**1. [Rule 2 - Missing Critical] Single transaction GET endpoint**
- **Found during:** Task 3 implementation
- **Issue:** ReimportWizard needed to fetch individual transaction details
- **Fix:** Created GET /api/transactions/[id] endpoint
- **Files created:** src/app/api/transactions/[id]/route.ts
- **Commit:** d9980aa

**2. [Rule 2 - Missing Critical] Skip transaction endpoint**
- **Found during:** Task 3 implementation
- **Issue:** Skip button needed API to mark transaction as not_subscription
- **Fix:** Created POST /api/transactions/[id]/skip endpoint
- **Files created:** src/app/api/transactions/[id]/skip/route.ts
- **Commit:** d9980aa

**3. [Rule 2 - Missing Critical] Statement info hook and API**
- **Found during:** Task 2 implementation
- **Issue:** Statement detail needed to fetch statement metadata
- **Fix:** Created useStatement hook and GET /api/statements/[id] endpoint
- **Files created:** src/lib/hooks/use-statement.ts, src/app/api/statements/[id]/route.ts
- **Commit:** 1aab5a0

## Verification

- [x] `npm run build` completes without errors
- [x] /statements/[id] page registered in build output
- [x] TransactionStatusBadge contains converted|skipped|pending
- [x] Statement detail imports useStatementTransactions hook
- [x] ReimportWizard calls /api/transactions/[id]/convert

## Commits

| Hash | Description |
|------|-------------|
| 399ee64 | feat(22-03): add TransactionStatusBadge component |
| 1aab5a0 | feat(22-03): add statement detail page and component |
| d9980aa | feat(22-03): add ReimportWizard with sequential processing |

## Next Phase Readiness

Phase 22 Wave 2 now complete (22-02 and 22-03). The source dashboard provides:
1. Source list with coverage stats (/sources page from 22-02)
2. Statement detail with transaction list (this plan)
3. Re-import wizard for converting skipped transactions

Remaining: Ensure 22-02 source list links to statement details.
