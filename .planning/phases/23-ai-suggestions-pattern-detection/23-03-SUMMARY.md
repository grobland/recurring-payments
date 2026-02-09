---
phase: 23
plan: 03
title: "Suggestions Page & Card"
subsystem: ui
tags: ["suggestions", "patterns", "multi-select", "bulk-actions"]
status: complete
started: 2026-02-09T19:50:10Z
completed: 2026-02-09T19:53:55Z
duration: ~4 min

depends_on:
  phases: [23-01, 23-02]
  context: ["ConfidenceBadge", "EvidenceList", "SuggestionTimeline", "BulkActionsBar", "usePatternSuggestions", "useBulkAcceptPatterns", "useBulkDismissPatterns", "useAcceptPattern", "useDismissPattern"]
provides:
  - "/suggestions page for managing AI-detected subscription patterns"
  - "SuggestionCard component with expandable timeline and evidence"
  - "Sidebar navigation link to suggestions page"
affects:
  next_phase: [23-04]
  next_phase_context: "Dashboard integration can link to /suggestions page"

tech_stack:
  added: []
  patterns:
    - "Collapsible card with expand/collapse for details"
    - "Multi-select with indeterminate checkbox state"
    - "Hook wiring: onAccept={() => mutation.mutate({ id })}"

key_files:
  created:
    - src/app/(dashboard)/suggestions/page.tsx
    - src/components/suggestions/suggestion-card.tsx
  modified:
    - src/components/layout/app-sidebar.tsx

decisions:
  - choice: "Checkbox with indeterminate state for partial selection"
    why: "Clear visual feedback when some but not all items selected"
  - choice: "Clear selection on suggestions.length change"
    why: "Prevents operating on stale selections after mutations"
  - choice: "Sparkles icon for suggestions nav item"
    why: "Conveys AI/magic detection concept"
---

# Phase 23 Plan 03: Suggestions Page & Card Summary

**One-liner:** Dedicated /suggestions page with expandable SuggestionCards, multi-select checkboxes, individual and bulk accept/dismiss actions.

## Objectives Achieved

1. Created SuggestionCard component with collapsible expand/collapse
2. Built /suggestions page with full CRUD operations
3. Added sidebar navigation link with Sparkles icon

## Implementation Details

### SuggestionCard Component

```typescript
// Compact card layout:
// [Checkbox] | Merchant + ConfidenceBadge | $Amount | Frequency | N charges | ~N day interval | [X] [Accept]
// Click "Show evidence (N charges)" to expand:
// - SuggestionTimeline scatter chart
// - EvidenceList with transaction links
```

Key features:
- Controlled checkbox for multi-select with ring highlight when selected
- Accept button with Check icon + "Accept" text
- Dismiss button with X icon only (square)
- Collapsible from shadcn for smooth expand/collapse animation
- Disabled state during mutation processing (opacity-60)

### Suggestions Page

```typescript
// State
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Hook wiring (CRITICAL)
onAccept={() => acceptPattern.mutate({ patternId: pattern.id })}
onDismiss={() => dismissPattern.mutate({ patternId: pattern.id })}

// Bulk operations
onAcceptAll={() => bulkAccept.mutate({ patternIds: Array.from(selectedIds) })}
```

Page states:
- **Loading:** 3 skeleton cards matching card layout
- **Empty:** Sparkles icon + "No suggestions yet" + Import Statements CTA
- **Error:** Error message + Try Again button with refetch()
- **Loaded:** Select all + suggestion cards + floating BulkActionsBar

### Sidebar Navigation

Added after Transactions:
```typescript
{
  title: "Suggestions",
  href: "/suggestions",
  icon: Sparkles,
}
```

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Create SuggestionCard component | a8b638a | Compact layout, collapsible expand, accept/dismiss buttons |
| 2 | Create suggestions page | 213a355 | Full page with multi-select, bulk operations, all states |
| 3 | Add sidebar navigation link | 1c6e7e9 | Sparkles icon + /suggestions href |

## Verification Results

1. TypeScript compilation passes with no errors
2. usePatternSuggestions hook called in page
3. BulkActionsBar rendered with proper props
4. EvidenceList rendered inside SuggestionCard
5. onAccept wired to acceptPattern.mutate with pattern ID
6. Sidebar contains Suggestions link with Sparkles icon

## Deviations from Plan

None - plan executed exactly as written.

## Key Patterns Used

1. **Collapsible expand/collapse:**
   ```tsx
   <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
     <CollapsibleTrigger>Show evidence ({n} charges)</CollapsibleTrigger>
     <CollapsibleContent>Timeline + EvidenceList</CollapsibleContent>
   </Collapsible>
   ```

2. **Multi-select with Set state:**
   ```typescript
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const toggleSelect = (id: string) => {
     setSelectedIds(prev => {
       const next = new Set(prev);
       next.has(id) ? next.delete(id) : next.add(id);
       return next;
     });
   };
   ```

3. **Indeterminate checkbox:**
   ```tsx
   <Checkbox
     checked={someSelected ? "indeterminate" : allSelected}
     onCheckedChange={toggleSelectAll}
   />
   ```

## Files Changed

| File | Change |
|------|--------|
| `src/components/suggestions/suggestion-card.tsx` | Created - SuggestionCard component |
| `src/app/(dashboard)/suggestions/page.tsx` | Created - Suggestions page |
| `src/components/layout/app-sidebar.tsx` | Modified - Added Suggestions nav item |

## Next Phase Readiness

Phase 23-04 (Dashboard Integration) can now:
- Link to /suggestions page from dashboard widgets
- Show suggestion count in navigation badge (optional enhancement)
- Use SuggestionCard component in dashboard context if needed
