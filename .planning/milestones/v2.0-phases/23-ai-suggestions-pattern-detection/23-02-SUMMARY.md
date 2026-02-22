---
phase: 23
plan: 02
subsystem: ai-suggestions
tags: [hooks, react-query, bulk-operations, components]
dependency-graph:
  requires: [23-01]
  provides:
    - patternKeys query key factory
    - useBulkAcceptPatterns hook
    - useBulkDismissPatterns hook
    - BulkActionsBar component
  affects: [23-03, 23-04]
tech-stack:
  added: []
  patterns:
    - Query key factory pattern for cache invalidation
    - Bulk mutation hooks with toast feedback
key-files:
  created:
    - src/lib/hooks/use-bulk-patterns.ts
    - src/components/suggestions/bulk-actions-bar.tsx
  modified:
    - src/lib/hooks/use-pattern-suggestions.ts
decisions:
  - id: pattern-keys-factory
    choice: "Export patternKeys object with all/lists/suggestions factories"
    why: "Enables consistent cache invalidation across all pattern mutations"
  - id: bulk-hooks-toast
    choice: "Show toast with count and plural handling"
    why: "Clear feedback on bulk operation results"
metrics:
  duration: ~6 min
  completed: 2026-02-09
---

# Phase 23 Plan 02: Bulk Hooks & Actions Bar Summary

Bulk pattern operation hooks with patternKeys factory for cache invalidation, plus floating BulkActionsBar component.

## What Was Built

### 1. Pattern Query Keys Factory (Task 1)

Updated `use-pattern-suggestions.ts` with:
- `patternKeys.all` - Base key for all pattern queries
- `patternKeys.lists()` - For pattern list queries
- `patternKeys.suggestions()` - For suggestions query (used by usePatternSuggestions)

This follows the established pattern from other hooks (subscriptionKeys, alertKeys, transactionKeys).

### 2. Bulk Pattern Hooks (Task 2)

Created `use-bulk-patterns.ts` with two hooks:

**useBulkAcceptPatterns:**
- Calls POST /api/patterns/bulk with action: "accept"
- Invalidates patternKeys.all and ["subscriptions"]
- Shows success toast with count and "View Subscriptions" action

**useBulkDismissPatterns:**
- Calls POST /api/patterns/bulk with action: "dismiss"
- Invalidates patternKeys.all
- Shows success toast with count

Both hooks:
- Use patternKeys import for cache invalidation
- Handle plural/singular in toast messages
- Show error toast on failure

### 3. BulkActionsBar Component (Task 3)

Created `bulk-actions-bar.tsx` with:
- Fixed positioning at bottom center (z-50)
- Returns null when selectedCount is 0
- Shows selected count text
- Three buttons: Dismiss All (outline), Accept All (default), Clear (ghost)
- All buttons disabled during isProcessing

## Key Implementation Details

### Cache Invalidation Strategy

```typescript
// On accept - invalidate both patterns and subscriptions
queryClient.invalidateQueries({ queryKey: patternKeys.all });
queryClient.invalidateQueries({ queryKey: ["subscriptions"] });

// On dismiss - only patterns
queryClient.invalidateQueries({ queryKey: patternKeys.all });
```

### Component Props Interface

```typescript
interface BulkActionsBarProps {
  selectedCount: number;
  onAcceptAll: () => void;
  onDismissAll: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}
```

## Verification Results

1. TypeScript compilation: PASS
2. patternKeys exported: PASS
3. useBulkAcceptPatterns invalidates patterns and subscriptions: PASS
4. useBulkDismissPatterns shows toast with count: PASS
5. BulkActionsBar fixed at bottom: PASS
6. BulkActionsBar hidden when selectedCount === 0: PASS

## Commits

| Hash | Message |
|------|---------|
| 4cae362 | feat(23-02): add patternKeys factory for query invalidation |
| 14d1e85 | feat(23-02): add bulk accept/dismiss pattern hooks |
| a598ab1 | feat(23-02): add BulkActionsBar component for bulk operations |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**23-03 (Suggestions Panel) ready:**
- patternKeys available for cache invalidation
- Bulk hooks available for multi-select operations
- BulkActionsBar ready for integration with selection state

**Integration notes for 23-03:**
- Import useBulkAcceptPatterns, useBulkDismissPatterns from use-bulk-patterns
- Import BulkActionsBar from bulk-actions-bar
- Use Set<string> for selection state management
- Pass isPending state from mutations to isProcessing prop
