# Phase 40: Static Pages - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Two read-only content pages accessible from the Support section of the restructured sidebar (Phase 36): a Data Schema viewer showing the system's data model, and a Help page with accordion-organized FAQ and documentation. No live DB queries, no dynamic data — purely static content pages.

</domain>

<decisions>
## Implementation Decisions

### Schema Presentation
- Table cards layout — each database table rendered as a card with columns listed vertically
- Essential detail only — column name and type per row, no nullable/default/constraint details
- FK columns show `→ tableName` inline as text labels (no diagram or separate relationships section)
- Hardcoded static data — manually written, not auto-generated from Drizzle schema
- All table cards expanded on page load (no collapsible behavior on schema page)

### Help Content & Structure
- Casual & friendly tone — conversational, uses "you", approachable
- Both feature walkthroughs AND troubleshooting sections (comprehensive coverage)
- Brief answers — 2-3 sentences per FAQ answer, quick to scan
- Questions grouped under category headers (e.g., Getting Started, Importing, Subscriptions, Billing, Troubleshooting)
- Simple mailto "Contact us" email link at the bottom of the page

### Accordion Behavior
- Multi-open — multiple sections can be expanded simultaneously
- All sections collapsed by default on page load
- Questions grouped under category headings with accordions nested within each group

### Page Styling & Layout
- Monochrome type display — no color coding for column types
- Title + 1-line description header on both pages
- Minimal documentation style — clean, text-focused like Stripe docs or Notion, prioritize readability over decoration

### Claude's Discretion
- Schema card layout (single column vs grid) — pick based on number of tables
- Exact spacing, typography, and card styling within existing design system
- Which FAQ questions to include and how to group them into categories
- Contact email address to use in the mailto link

</decisions>

<specifics>
## Specific Ideas

- "Minimal documentation style" — think Stripe docs or Notion: clean, text-focused, readability over decoration
- Schema is a quick reference, not full database documentation — keep it scannable
- Help page should feel like a helpful friend explaining things, not a technical manual

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-static-pages*
*Context gathered: 2026-02-27*
