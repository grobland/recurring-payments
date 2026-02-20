# Phase 34: Coverage & Historical Upload - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface a per-source coverage grid showing which months have stored PDFs versus data-only versus missing, and let users fill gaps via a guided upload wizard. This is the final phase of the v2.2 Financial Data Vault milestone.

</domain>

<decisions>
## Implementation Decisions

### Coverage grid visualization
- GitHub-style heat map grid: columns = months, rows = sources
- Show last 12 months by default
- Three cell color states: Green = PDF stored, Yellow = data only (no file), Gray = no data
- Tooltip on hover showing statement date, transaction count, PDF status — keeps grid clean
- Inline legend bar (above or below grid): ● PDF stored ● Data only ● Missing

### Gap cell interaction
- Gray cells (no data): Click opens upload wizard directly with source+month pre-filled
- Yellow cells (data, no PDF): Show message "You have data for this month but no PDF. Want to attach one?" then open upload wizard
- Green cells (PDF stored): Click opens the existing PDF viewer modal for that statement
- All three cell states are interactive with distinct behaviors

### Upload wizard flow
- Single step wizard: confirm source+month (pre-filled from clicked cell), drag-drop PDF, submit
- Appears as a modal dialog — consistent with existing PDF viewer modal pattern
- On success: toast notification + modal auto-closes + grid cell updates to green automatically
- On failure: error shown in modal with retry option

### Grid placement and navigation
- New "Coverage" tab on /vault page alongside File Cabinet and Timeline tabs
- File Cabinet remains the default tab — Coverage is an explore/action tab
- Tab preference persistence extends to include Coverage (existing localStorage pattern)
- Summary header at top: gap count only (e.g., "3 months missing PDFs") — focuses attention on what needs action
- Empty state (no sources): reuse existing vault empty state ("Upload your first statement" CTA)

### Claude's Discretion
- Upload API approach: reuse existing batch upload or create dedicated endpoint — Claude picks based on codebase patterns
- Exact grid cell sizing, spacing, and responsive behavior
- Tooltip positioning and animation
- Error state handling details

</decisions>

<specifics>
## Specific Ideas

- Heat map should feel like GitHub's contribution grid — compact, scannable, color-coded at a glance
- Gap count header keeps user focused on actionable items rather than vanity percentage metrics
- Single-step wizard minimizes friction for historical uploads — the cell click already communicates source+month context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-coverage-historical-upload*
*Context gathered: 2026-02-20*
