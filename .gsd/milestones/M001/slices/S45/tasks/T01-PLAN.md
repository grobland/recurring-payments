# T01: 45-sidebar-redesign 01

**Slice:** S45 — **Milestone:** M001

## Description

Redesign the sidebar navigation to use plain English labels, reorganize into 4+ logical groups, and apply a warm/friendly visual theme (Notion/Todoist aesthetic) that works in both light and dark modes.

Purpose: Transform the sidebar from technical jargon (e.g., "subs Dash", "doc Vault", "fin Vault") to approachable plain English labels, and shift from cold neutral colors to a warm, cozy aesthetic that makes the app feel friendly rather than corporate.

Output: Updated sidebar component with new label/group structure and warm CSS theme variables.

## Must-Haves

- [ ] "All sidebar nav items display plain English labels with no jargon or camelCase"
- [ ] "Sidebar sections are organized into 4+ logical groups (Documents, Overview, Manage, Support, and conditional Admin)"
- [ ] "Active and hovered items use warm accent colors in both light and dark mode"
- [ ] "Sidebar background has warm tint (cream in light, warm charcoal in dark)"
- [ ] "Icons are semantically matched to new plain English labels"
- [ ] "Feature-gated Admin section renders only for admin users"
- [ ] "Trial banner still displays for trial users"

## Files

- `src/components/layout/app-sidebar.tsx`
- `src/app/globals.css`
