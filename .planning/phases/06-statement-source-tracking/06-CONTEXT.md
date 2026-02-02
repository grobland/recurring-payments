# Phase 6: Statement Source Tracking - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Track which bank or credit card statement each subscription was imported from. Users enter the account name when importing, see autocomplete suggestions from previous imports, and view the source on subscription details. Import audit records persist the source for historical tracking.

</domain>

<decisions>
## Implementation Decisions

### Source Entry UI
- Field appears BEFORE upload — user enters account, then selects PDF
- Combobox input — text with autocomplete dropdown, can type new or select existing
- Required field — user must enter an account before uploading
- Field label: "Account"

### Autocomplete Behavior
- Suggestions show on focus — immediately when user clicks the field
- "Create [name]" option — when typing a new name, user must explicitly click to confirm creation
- Contains match filtering — "cha" matches both "Chase" and "Schwab Checking"
- Sorted by most recently used — accounts imported from recently appear at top

### Source Display
- Shown in metadata section — alongside billing cycle, category, and other details
- Show "Manual entry" for manually added subscriptions (not imported)
- Show as column on subscription list/dashboard view
- Styling: Claude's discretion

### Source Naming
- Recommended format: Bank + type (e.g., "Chase Visa", "Wells Fargo Checking")
- Suggest existing accounts when user types similar names (e.g., "Chase" when "Chase Visa" exists)
- Basic validation — max 50 chars, no empty names

### Claude's Discretion
- Visual styling of source in metadata section (plain text, badge, icon, etc.)
- Exact implementation of similarity detection for suggestions
- Any additional UX polish within scope

</decisions>

<specifics>
## Specific Ideas

- Combobox pattern similar to CategoryCombobox from Phase 5 — reuse that approach
- Most recently used sorting means tracking last import date per account

</specifics>

<deferred>
## Deferred Ideas

- **Account management in settings** (rename, merge, delete accounts) — User mentioned this but it's a new capability beyond the phase scope. Phase 6 covers creating accounts during import and displaying them. Full CRUD management is its own feature.

</deferred>

---

*Phase: 06-statement-source-tracking*
*Context gathered: 2026-01-31*
