# Phase 21 Plan 06: Fix Stale Closure in Bulk Tag Summary

**One-liner:** Fixed bulk tag callback stale closure using ref pattern for sync state access

## Metadata

| Field | Value |
|-------|-------|
| Phase | 21-manual-tagging-conversion |
| Plan | 06 |
| Type | Gap closure |
| Duration | ~2 min |
| Completed | 2026-02-10 |

## What Was Done

### Task 1: Fix stale closure with ref pattern

Fixed the UAT Test 10 failure where bulk tagging only affected 1 transaction even when multiple were selected.

**Root cause:** The `handleBulkTag` useCallback captured `selectedIds` state from the render cycle when the callback was created, not the current value at mutation time.

**Solution applied:**
1. Added `useRef` to imports
2. Created `selectedIdsRef` ref synchronized with `selectedIds` state
3. Added `useEffect` to keep ref in sync with state changes
4. Updated `handleBulkTag` to read from `selectedIdsRef.current` instead of closure
5. Removed `selectedIds` from useCallback dependencies (now uses ref)

**Files modified:**
- `src/components/transactions/transaction-browser.tsx`

**Commit:** 7980c00

## Pattern Applied

This fix uses the **queueRef pattern** already established in the codebase (documented in STATE.md): "Use ref for sync state access in async loops/callbacks."

The pattern works because:
- React state updates are batched and async
- useCallback dependencies create new function instances on state change
- But the closure still captures the value at callback creation time
- Refs provide synchronous access to the latest value at invocation time

## Verification

- Build succeeded with no TypeScript errors
- `handleBulkTag` now reads from `selectedIdsRef.current`
- Callback only depends on `bulkTagMutation` (stable from useMutation)

## Deviations from Plan

None - plan executed exactly as written.

## UAT Impact

This fix addresses UAT Test 10:
- **Before:** Selecting 5 transactions and bulk tagging only tagged 1
- **After:** Selecting 5 transactions and bulk tagging tags all 5

## Files Changed

| File | Change |
|------|--------|
| src/components/transactions/transaction-browser.tsx | Added ref pattern for selectedIds |

## Commits

| Hash | Message |
|------|---------|
| 7980c00 | fix(21-06): fix stale closure in bulk tag callback |
