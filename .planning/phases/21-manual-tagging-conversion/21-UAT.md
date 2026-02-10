---
status: complete
phase: 21-manual-tagging-conversion
source: 21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md, 21-04-SUMMARY.md
started: 2026-02-10T10:00:00Z
updated: 2026-02-10T10:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. View Tags on Transaction Row
expected: Transaction rows display colored tag badges. Limited display with overflow count if many tags.
result: pass
note: Tags display correctly when applied. Initial "empty" was because no tags existed yet.

### 2. Open Tag Combobox
expected: Clicking the tag button on a transaction row opens a popover with searchable tag list. Applied tags show checkmarks.
result: pass

### 3. Apply Tag to Transaction
expected: Selecting a tag in the combobox applies it to the transaction. The tag appears as a colored badge on the row.
result: pass

### 4. Remove Tag from Transaction
expected: Clicking an already-applied tag (checked) in the combobox removes it. The badge disappears from the row.
result: pass

### 5. Create New Tag
expected: User can create a new tag via the Tags API or UI. Tags have a name and color. Tags are unique per user.
result: issue
reported: "user cannot create a tag"
severity: major

### 6. Convert Transaction to Subscription
expected: Clicking "Convert" button on a transaction creates a subscription with merchant, amount, and calculated next renewal date. Transaction shows "Converted" badge linking to the subscription.
result: pass

### 7. Undo Conversion via Toast
expected: After converting, an 8-second toast appears with "Undo" action. Clicking Undo deletes the subscription and restores the transaction to unconverted state.
result: pass

### 8. Checkbox Select Single Transaction
expected: Each transaction row has a checkbox. Clicking it selects the row (visual highlight). The floating bulk action bar appears at the bottom.
result: pass

### 9. Checkbox Select All (Header)
expected: Clicking the header checkbox selects all visible/loaded transactions. Shows indeterminate state if only some are selected.
result: pass

### 10. Bulk Tag Multiple Transactions
expected: With multiple transactions selected, the bulk action bar allows applying a tag to all selected items at once.
result: issue
reported: "only 1 is checked or unchecked with multiple or all selections"
severity: major

### 11. Selection Clears on Filter Change
expected: When changing filters (source, date, search), any existing selection is cleared to prevent stale selections.
result: pass

### 12. Mobile Card View Tagging
expected: On mobile, transaction cards show the same tag button and badge display. Conversion button also available.
result: pass

## Summary

total: 12
passed: 10
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Users can create tags via UI (Settings page or inline)"
  status: failed
  reason: "User reported: no UI exists to create tags - must use API directly"
  severity: major
  test: 5
  artifacts: []
  missing: []

- truth: "Bulk tagging applies tag to all selected transactions"
  status: failed
  reason: "User reported: only 1 is checked or unchecked with multiple or all selections"
  severity: major
  test: 10
  artifacts: []
  missing: []
