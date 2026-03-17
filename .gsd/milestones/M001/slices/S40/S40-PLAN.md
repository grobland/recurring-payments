# S40: Static Pages

**Goal:** Create two static content pages and add sidebar navigation entries: a Data Schema page showing all 21 database tables as card-based column listings, and a Help page with accordion-organized FAQ sections grouped by category.
**Demo:** Create two static content pages and add sidebar navigation entries: a Data Schema page showing all 21 database tables as card-based column listings, and a Help page with accordion-organized FAQ sections grouped by category.

## Must-Haves


## Tasks

- [x] **T01: 40-static-pages 01** `est:4min`
  - Create two static content pages and add sidebar navigation entries: a Data Schema page showing all 21 database tables as card-based column listings, and a Help page with accordion-organized FAQ sections grouped by category.

Purpose: Completes the final two v3.0 requirements (SCHEMA-01, HELP-01). Both pages are purely static server components with hardcoded content — no API routes, no DB queries, no client-side state management.

Output: Two new page files under src/app/(dashboard)/support/, updated supportItems in app-sidebar.tsx with Help and Data Schema nav entries.

## Files Likely Touched

- `src/components/layout/app-sidebar.tsx`
- `src/app/(dashboard)/support/schema/page.tsx`
- `src/app/(dashboard)/support/help/page.tsx`
