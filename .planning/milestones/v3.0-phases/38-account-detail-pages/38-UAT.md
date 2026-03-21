---
status: complete
phase: 38-account-detail-pages
source: 38-01-SUMMARY.md, 38-02-SUMMARY.md
started: 2026-02-26T12:00:00Z
updated: 2026-02-26T13:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. AccountCard navigates to detail page
expected: On the Accounts list page, clicking the left side of an account card (icon + name area) navigates to /accounts/[id]. The dropdown menu (three dots) should still work independently without triggering navigation.
result: pass

### 2. Account detail page header
expected: The /accounts/[id] page shows a header with: back arrow button, account type icon, account name (large text), type badge (e.g. "Bank / Debit", "Credit Card", or "Loan"), institution name if set, and a key stat (credit limit for credit cards, interest rate for loans). Edit and Delete buttons visible on the right.
result: pass

### 3. Back button returns to accounts list
expected: Clicking the back arrow button in the header navigates back to /accounts list page.
result: pass

### 4. Edit button opens modal
expected: Clicking "Edit" in the header opens the existing AccountForm modal dialog with the account's current values pre-filled. Saving updates the account and the header reflects changes.
result: pass

### 5. Delete button with confirmation
expected: Clicking "Delete" opens a confirmation dialog. Confirming deletes the account and navigates back to /accounts. The deleted account no longer appears in the list.
result: pass

### 6. Tab bar with four tabs
expected: Below the header, a tab bar shows four tabs: Details, Coverage, Transactions, Spending. Only one tab's content is visible at a time. Clicking a tab switches the visible content.
result: pass

### 7. Details tab - inline edit form
expected: The Details tab shows an inline form (not a modal) with: account type buttons (all disabled/locked showing current type highlighted), account name, institution, linked source dropdown, and type-specific fields (credit limit for credit card, interest rate + loan term for loan). A "Save Changes" button at the bottom.
result: pass

### 8. Details tab - interest rate display
expected: For a loan account, the interest rate field shows the rate as a percentage (e.g. "4.99") not the raw decimal (e.g. "0.0499"). Saving the form should round-trip correctly.
result: pass

### 9. Details tab - save changes
expected: Modifying a field (e.g. institution name) and clicking "Save Changes" shows a loading state, then a success toast "Account updated". The header updates to reflect the change.
result: pass

### 10. Coverage tab - with linked source
expected: For an account that has a linked statement source, the Coverage tab shows a 12-month coverage grid (same style as the vault page coverage grid) scoped to that account's statements only.
result: pass

### 11. Coverage tab - empty state
expected: For an account with no linked source, the Coverage tab shows "No statement source linked to this account" with a button/link "Go to Details to link a source" that switches to the Details tab.
result: pass

### 12. Coverage cell click to transactions
expected: On the Coverage tab, clicking a cell that has data (pdf or data state) switches to the Transactions tab with the date range pre-populated to that month. The transactions shown are filtered to that month.
result: pass

### 13. Transactions tab - account-scoped browser
expected: The Transactions tab shows transactions filtered to the current account only. A count summary banner at the top shows something like "Showing X transactions - Y tagged - Z subscriptions". Standard filters (search, date range, tag status) work. Source type filter is hidden.
result: pass

### 14. Spending tab - stat cards
expected: The Spending tab shows three stat cards in a row: "Total Spent" (dollar amount), "Monthly Average" (dollar amount), and "Top Merchant" (merchant name with amount below). If no transactions exist, shows an empty state message.
result: pass

### 15. Spending tab - monthly bar chart
expected: Below the stat cards, a monthly spending bar chart shows spending per month as vertical bars. Hovering a bar shows a tooltip with the month and amount formatted as currency.
result: pass

## Summary

total: 15
passed: 15
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
