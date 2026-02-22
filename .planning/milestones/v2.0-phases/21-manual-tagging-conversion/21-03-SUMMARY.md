---
phase: 21-manual-tagging-conversion
plan: 03
subsystem: transactions
tags: [conversion, subscriptions, toast, mutation]
status: complete
completed: 2026-02-09

dependency-graph:
  requires:
    - 21-01: Tags schema and CRUD foundation
  provides:
    - Transaction to subscription conversion API
    - Conversion mutation hooks with undo
    - ConvertedBadge UI component
  affects:
    - 21-04: May use conversion in bulk operations

tech-stack:
  added: []
  patterns:
    - Undo toast with 8-second window
    - Optimistic UI with mutation state
    - Category guessing from merchant name

file-tracking:
  key-files:
    created:
      - src/app/api/transactions/[id]/convert/route.ts
      - src/lib/hooks/use-convert-transaction.ts
      - src/components/transactions/converted-badge.tsx
    modified:
      - src/components/transactions/transaction-row.tsx
      - src/components/transactions/transaction-card.tsx
      - src/components/transactions/transaction-table.tsx

decisions:
  - decision: 8-second undo toast duration
    choice: Long undo window for safe conversions
    why: User needs time to see toast and click undo if needed
  - decision: Delete subscription on undo
    choice: Hard delete the created subscription
    why: Simplifies undo - subscription was just created, no user data to preserve
  - decision: Default to monthly frequency
    choice: All conversions assume monthly billing cycle
    why: Most common pattern, user can edit after creation

metrics:
  duration: ~8min
  tasks: 3/3
---

# Phase 21 Plan 03: Transaction Conversion Summary

One-click transaction to subscription conversion with undo capability via toast notifications.

## What Was Built

### Task 1: Conversion API (`b7cd9f6`)

Created `/api/transactions/[id]/convert` route with:

- **POST handler:** Creates subscription from transaction data
  - Uses existing `guessCategory()` utility for category matching
  - Calculates next renewal date as transaction date + 1 month
  - Sets default monthly frequency
  - Uses Drizzle transaction for atomicity
  - Updates transaction's `convertedToSubscriptionId` and `tagStatus`

- **DELETE handler:** Undoes conversion
  - Clears `convertedToSubscriptionId` reference
  - Resets `tagStatus` to "unreviewed"
  - Deletes the created subscription

### Task 2: Conversion Hooks (`9af8073`)

Created `src/lib/hooks/use-convert-transaction.ts`:

- **useConvertTransaction:** Main conversion mutation
  - Accepts `transactionId` and `merchantName`
  - Shows success toast with 8-second undo action
  - Invalidates transaction and subscription queries
  - Error handling with retryable error detection

- **useUndoConversion:** Direct undo mutation
  - For programmatic undo (not toast-based)
  - Same query invalidation pattern

### Task 3: UI Integration (`76a5c55`)

**ConvertedBadge component:**
- Green badge with Link2 icon
- Links to `/subscriptions?highlight={id}`
- Tooltip shows "View subscription" on hover

**TransactionRow updates:**
- New Convert column (110px width)
- Shows ConvertedBadge if already converted
- Shows "Convert" button with ArrowRightCircle icon
- Button disabled while mutation pending

**TransactionCard updates:**
- Convert action in card footer (ml-auto positioning)
- Same conditional rendering logic
- Smaller button size for mobile

**TransactionTable updates:**
- Added empty header cell for Convert column alignment

## Key Code Patterns

### Conversion with Undo Toast
```typescript
toast.success(`Converted "${merchantName}" to subscription`, {
  duration: 8000,
  action: {
    label: "Undo",
    onClick: async () => {
      await undoConversion(transactionId);
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      toast.info("Conversion undone");
    },
  },
});
```

### Conditional Render for Status
```tsx
{transaction.convertedToSubscriptionId ? (
  <ConvertedBadge subscriptionId={transaction.convertedToSubscriptionId} />
) : (
  <Button onClick={() => convertTransaction.mutate({...})} disabled={isPending}>
    Convert
  </Button>
)}
```

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/transactions/[id]/convert/route.ts` | New API route |
| `src/lib/hooks/use-convert-transaction.ts` | New mutation hooks |
| `src/components/transactions/converted-badge.tsx` | New badge component |
| `src/components/transactions/transaction-row.tsx` | Added convert button/badge |
| `src/components/transactions/transaction-card.tsx` | Added convert button/badge |
| `src/components/transactions/transaction-table.tsx` | Added column header |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 21-04 (Bulk Operations):**
- Conversion API pattern can be extended for batch
- Transaction status tracking in place
- Query invalidation patterns established

**UI polish opportunities:**
- Highlight subscription after conversion link click
- Batch conversion for selected transactions
- Edit subscription immediately after conversion
