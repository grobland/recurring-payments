# Phase 36: Navigation Restructure - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current flat 11-item sidebar with three named sections (fin Vault, payments Portal, Support). Reorganize existing nav items into the new sections. Add a data Vault placeholder pointing to /accounts (empty state). Apply 308 redirects for moved URLs. Fix active-state logic for nested section structure. New pages (Accounts list, Help, Data Schema) are built in later phases — Phase 36 only wires the navigation shell and placeholder.

</domain>

<decisions>
## Implementation Decisions

### URL path changes

Paths DO change — this is not a labels-only refactor. 308 redirects required.

**fin Vault section** — uses `/vault/` prefix pattern:
- doc Vault: `/vault` (stays — no redirect needed)
- doc Load: `/vault/load` (moves from `/import/batch` and `/import`)
- Sources: `/sources` (stays — no redirect needed)
- data Vault: `/accounts` (new page — no redirect, Phase 37 builds the real page)

**payments Portal section** — uses `/payments/` prefix pattern:
- `/payments/dashboard` (308 from `/dashboard`)
- `/payments/analytics` (308 from `/analytics`)
- `/payments/forecast` (308 from `/dashboard/forecasting`)
- `/payments/subscriptions` (308 from `/subscriptions`)
- `/payments/transactions` (308 from `/transactions`)
- `/payments/suggestions` (308 from `/suggestions`)
- `/payments/reminders` (308 from `/reminders`)

**Support section** — paths stay:
- `/settings` (no redirect)
- `/help` (Phase 40 adds this page)
- `/schema` (Phase 40 adds this page)

### Section structure

Full sidebar structure with all items placed:

```
fin Vault
  ├── doc Vault      (/vault)
  ├── doc Load       (/vault/load)
  ├── Sources        (/sources)
  └── data Vault     (/accounts)   ← Phase 36 placeholder

payments Portal
  ├── subs Dash      (/payments/dashboard)
  ├── Analytics      (/payments/analytics)
  ├── subs Forecast  (/payments/forecast)
  ├── subs Master List (/payments/subscriptions)
  ├── subs Selector  (/payments/transactions)
  ├── subs Suggestions (/payments/suggestions)
  └── Reminders      (/payments/reminders)

Support
  ├── Settings       (/settings)
  └── [Help + Schema added by Phase 40]
```

Note: "subs Settings" from NAV-02 maps to the Reminders page (subscription renewal settings). The global Settings page lives in Support.

### Section visual treatment

- Sections are **always expanded** — not collapsible
- Section labels styled as **subtle uppercase labels** using shadcn `SidebarGroupLabel` default styling
- Labels use **exact casing from spec**: `fin Vault`, `payments Portal`, `Support`
- Separation between sections via **label gap only** — no additional dividers or horizontal rules

### Active state logic

Active state must work correctly for the nested structure. The current `pathname === item.href` check is insufficient for items with child routes. Use `pathname.startsWith(item.href)` for items that act as section roots (e.g., `/vault` should stay active when at `/vault/something`). For flat terminal items, exact match is correct.

### Accounts placeholder

- Phase 36 **adds the `data Vault` nav item** pointing to `/accounts`
- Clicking before Phase 37 shows a **basic empty state page** at `/accounts`:
  - Heading: "No accounts yet"
  - Description: brief explanation of what accounts are
  - Create button (non-functional / disabled until Phase 37)
- **Sources nav item stays** in fin Vault alongside data Vault — both items coexist

### Claude's Discretion

- Exact icon choices for new nav items (doc Load, data Vault)
- Whether to use Next.js `redirect()` in route handlers or middleware for 308s
- Exact empty state page copy and illustration treatment
- Whether `/payments/` route segments need layout files or just redirects

</decisions>

<specifics>
## Specific Ideas

- The spec intentionally uses lowercase 'fin' and 'payments' in section names — this is branding, not a typo. Respect the exact casing.
- The research spec noted that collapsible sections are an anti-feature (two levels = section label + flat list is the max before users lose orientation). Always-expanded is explicitly correct.
- 308 (Permanent Redirect) not 307 (Temporary) — bookmarks and email links need to update permanently.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 36-navigation-restructure*
*Context gathered: 2026-02-25*
