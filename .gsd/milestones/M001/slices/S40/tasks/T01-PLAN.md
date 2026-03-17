# T01: 40-static-pages 01

**Slice:** S40 — **Milestone:** M001

## Description

Create two static content pages and add sidebar navigation entries: a Data Schema page showing all 21 database tables as card-based column listings, and a Help page with accordion-organized FAQ sections grouped by category.

Purpose: Completes the final two v3.0 requirements (SCHEMA-01, HELP-01). Both pages are purely static server components with hardcoded content — no API routes, no DB queries, no client-side state management.

Output: Two new page files under src/app/(dashboard)/support/, updated supportItems in app-sidebar.tsx with Help and Data Schema nav entries.

## Must-Haves

- [ ] "Data Schema page at /support/schema renders all 21 database tables as static cards with column name + type per row"
- [ ] "FK columns show arrow notation (e.g. uuid -> users) inline — no separate relationships section"
- [ ] "Help page at /support/help renders FAQ questions grouped under category headings with Accordion type=multiple"
- [ ] "All accordion sections collapsed by default on page load — no defaultValue prop"
- [ ] "Contact us mailto link appears at the bottom of the Help page"
- [ ] "Both pages appear in sidebar Support section and highlight correctly when active"
- [ ] "Schema data is hardcoded static — no live DB queries"

## Files

- `src/components/layout/app-sidebar.tsx`
- `src/app/(dashboard)/support/schema/page.tsx`
- `src/app/(dashboard)/support/help/page.tsx`
