# Phase 37: Account CRUD + List Page - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create, view, edit, and delete financial accounts of three types (Bank/Debit, Credit Card, Loan) with type-specific fields, see all accounts grouped by type on the data Vault page, and link existing statement sources to accounts. Future imports from linked sources auto-assign to the account.

Requirements: ACCT-01 through ACCT-08.

</domain>

<decisions>
## Implementation Decisions

### Account Form Design
- Modal dialog for both create and edit (not full page or inline)
- Single form with conditional type-specific fields
- Segmented control for type selection: Bank/Debit | Credit Card | Loan
- Selecting Credit Card reveals credit limit field; selecting Loan reveals interest rate + loan term fields
- Common fields always visible: account name, institution name
- Edit reuses the same modal with values pre-filled; type selector is disabled during edit (no type changes after creation)

### Account List Layout
- Cards in a responsive grid on the Vault page
- Three type groups organized as tabs (Bank/Debit | Credit Cards | Loans)
- Each card shows: account name (primary), institution name (secondary), linked source name as badge
- "Add Account" button at top-right of the page header, always visible regardless of active tab
- Empty type tabs hidden entirely when no accounts of that type exist — or show per-type empty state (see below)

### Source-to-Account Linking
- Dropdown field in the create/edit modal for selecting a source to link
- Linking is optional — accounts can exist without a linked source
- Source name displayed on the account card in the list view
- Unlinking a source only affects future imports; existing statements keep their account_id
- Whether already-linked sources appear in the dropdown: Claude's discretion (safest approach)

### Empty & Delete States
- Global empty state: illustration + CTA with "Add your first account" button (consistent with existing app empty states)
- Per-type empty state: type-specific message (e.g., "No credit cards added yet") with add button that pre-selects the type in the form
- Delete via confirmation dialog warning about consequences (linked statements become unlinked)
- On deletion: statements keep all data intact, account_id set to NULL (no cascade, no data loss)

### Claude's Discretion
- Whether already-linked sources show in the dropdown (with indicator) or are hidden
- Card grid column count and responsive breakpoints
- Loading skeleton design for the account list
- Exact segmented control styling
- Form validation messaging patterns
- Tab count badges (whether to show account count per tab)

</decisions>

<specifics>
## Specific Ideas

- Account cards should feel consistent with the vault's existing file-cabinet visual language
- The segmented type control should feel native to the existing shadcn/ui component library
- Delete confirmation should be explicit about what happens to linked data ("Statements from this account will remain but become unlinked")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-account-crud-list-page*
*Context gathered: 2026-02-25*
