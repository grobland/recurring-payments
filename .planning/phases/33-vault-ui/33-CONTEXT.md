# Phase 33: Vault UI - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a dedicated /vault page where users browse all their stored statements in two views: a source-grouped file cabinet view and a chronological calendar grid timeline view. This phase builds the page alongside the existing Sources page — merging/replacing Sources happens later.

</domain>

<decisions>
## Implementation Decisions

### View layout & switching
- Two views: **File Cabinet** and **Timeline**, switched via a **tab bar at the top** of the vault page
- Default view is **File Cabinet** (no persistence of last-chosen view — always opens on File Cabinet)
- **File Cabinet:** Source folders shown as **cards/tiles** — clicking a card **expands inline** to reveal statements below it on the same page (no sub-page navigation)
- Always show folder cards even with a single source — consistent experience
- **Timeline:** A **calendar grid** layout — months as cells, not a flat chronological list
- Each grid cell shows a **PDF icon (green if stored, gray if data-only) + transaction count badge** — click to expand
- Clicking a filled calendar cell **expands a detail panel below the grid** (grid stays visible)

### Statement card content
- Statement rows inside expanded folders use a **rich row** format: PDF icon + filename + statement date + transaction count + status breakdown (converted/pending/skipped) + View PDF action
- **Inline actions** directly on the row: View PDF button + link to statement detail page (no hover/menu pattern)
- Statements imported before v2.2 (no stored PDF) are **shown with a gray icon and "No file stored" indicator** — vault shows all statements, not just PDF-backed ones

### Empty & first-use state
- New users with no statements see an **illustration/icon + explanatory text about the vault + prominent "Upload Statements" button** linking to batch import
- **Summary stats bar** in the page header: "3 sources - 12 statements - 8 PDFs stored" (visible when data exists)

### Navigation & sidebar
- /vault placed **near the top of the sidebar** (after Dashboard) — prominent, primary feature
- Label: **"Vault"** with an **archive icon** (from lucide-react)
- **Sources page remains for now** — vault built alongside it. Intent is for vault to eventually replace Sources, but that happens after vault is proven working
- Phase 33 scope: build /vault, add sidebar link. Do NOT remove Sources page.

### Claude's Discretion
- Exact folder card design and layout (grid columns, spacing)
- Calendar grid implementation approach (CSS Grid vs component library)
- Loading skeleton design for folder cards and grid cells
- Exact summary stats formatting and positioning
- Illustration choice for empty state (can use lucide icons as placeholder)

</decisions>

<specifics>
## Specific Ideas

- File cabinet folder cards should feel like actual folder tiles you click to open — not just a list of names
- Calendar grid cells should make it immediately obvious which months have PDFs vs data-only vs nothing
- The vault is meant to be the "home base" for all financial documents — treat it as a primary destination, not a secondary feature

</specifics>

<deferred>
## Deferred Ideas

- Replace/merge Sources page into Vault — after vault is proven working (future phase or cleanup task)
- View preference persistence (localStorage) — skipped for now, may add later if users request it

</deferred>

---

*Phase: 33-vault-ui*
*Context gathered: 2026-02-20*
