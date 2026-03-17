# T02: 36-navigation-restructure 02

**Slice:** S36 — **Milestone:** M001

## Description

Replace the current flat two-group sidebar with three named sections (fin Vault, payments Portal, Support), correct item placement, and accurate active-state logic for nested routes.

Purpose: Users see a structured navigation hub instead of a flat list of 11 items. NAV-01 (correct sections) and NAV-03 (correct active state) both live in this single file.
Output: Updated app-sidebar.tsx with three SidebarGroup blocks, new nav item arrays, and fixed isActive logic.

## Must-Haves

- [ ] "Sidebar shows three labeled sections: fin Vault, payments Portal, Support"
- [ ] "fin Vault section contains: doc Vault (/vault), doc Load (/vault/load), Sources (/sources), data Vault (/accounts)"
- [ ] "payments Portal section contains: subs Dash (/payments/dashboard), Analytics (/payments/analytics), subs Forecast (/payments/forecast), subs Master List (/payments/subscriptions), subs Selector (/payments/transactions), subs Suggestions (/payments/suggestions), Reminders (/payments/reminders)"
- [ ] "Support section contains: Settings (/settings)"
- [ ] "Sections are always expanded — no collapse toggle"
- [ ] "Section labels use exact casing: fin Vault, payments Portal, Support"
- [ ] "Active state highlights the correct item when navigating to /payments/subscriptions/new (subscriptions item active, not another)"
- [ ] "Active state does NOT falsely activate /vault when the user is at /vault/load"
- [ ] "Sidebar header logo link points to /payments/dashboard"

## Files

- `src/components/layout/app-sidebar.tsx`
