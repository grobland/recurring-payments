# Phase 45: Sidebar Redesign - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Rename all sidebar nav items to plain English labels, reorganize into 4+ logical section groups, and apply a warm/friendly visual design (Notion/Todoist aesthetic) that works correctly in both light and dark modes. Feature-gate logic must be preserved via the existing typed nav item data structure. No new pages or routes — this is a visual and labeling refactor only.

</domain>

<decisions>
## Implementation Decisions

### Nav labels
- All product jargon removed — plain English labels throughout
- Claude picks the most natural plain English label for each item
- Current mappings to be determined by Claude (e.g., "subs Dash" → something like "Dashboard", "doc Vault" → something like "Statements", "subs Master List" → something like "Subscriptions", "subs Selector" → something like "Transactions")
- Labels should be immediately understandable to a first-time user

### Section grouping
- Split Payments section into two groups: Overview (Dashboard, Analytics, Forecast) and Manage (Subscriptions, Transactions, Suggestions, Reminders)
- Keep Documents group (Statements, Upload, Sources, Accounts)
- Keep Support group (Settings, Help, Data Schema)
- Results in 4+ groups total (Documents, Overview, Manage, Support + conditional Admin)
- Section names should be plain English, consistent with item label style

### Admin section
- Claude decides whether Admin section matches warm style or stays distinct based on overall design coherence

### Color palette
- Claude picks a warm accent color family that complements the existing design
- Sidebar background gets a warm tint in light mode (subtle cream/beige) and warm dark tint in dark mode (warm charcoal instead of pure gray)
- Active item styling: Claude determines the best approach (subtle highlight, left border, or pill) based on overall aesthetic

### Section headers
- Claude picks section header color treatment based on chosen accent color

### Dark mode
- Claude calibrates dark mode warmth for comfortable reading — same hue family, adjusted saturation/lightness

### Icons
- Claude reviews each icon against the new label and swaps where a better semantic match exists in lucide-react
- Keep lucide-react outline style throughout
- Icon color treatment: Claude determines based on overall warm design

### Claude's Discretion
- Exact warm color values (oklch) for all sidebar CSS variables
- Specific icon swaps (which icons to change, which to keep)
- Active state visual treatment (highlight vs border vs pill)
- Section header styling details
- Dark mode saturation/lightness calibration
- Whether Admin section gets warm or utilitarian treatment

</decisions>

<specifics>
## Specific Ideas

- Notion/Todoist aesthetic referenced as design targets — warm, friendly, not corporate
- Always-expanded sections (carried from Phase 36) — not collapsible
- Gap-based section separation (no dividers/horizontal rules)
- The redesign should make the app feel approachable and cozy, not cold/technical

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/layout/app-sidebar.tsx`: Main sidebar with 3 nav item arrays (finVaultItems, paymentsPortalItems, supportItems) + conditional Admin section
- `src/components/ui/sidebar.tsx`: shadcn/ui sidebar primitives with `data-[active=true]` styling
- `isNavItemActive()` function: Route-based active detection with prefix matching for certain items
- `useUserStatus()` hook: Trial/billing status for sidebar badge

### Established Patterns
- CSS variables in `src/app/globals.css` using oklch color space: `--sidebar`, `--sidebar-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`
- Dark mode via `.dark` class (next-themes with `attribute="class"`)
- SidebarGroup/SidebarGroupLabel/SidebarMenuButton shadcn primitives
- Feature gating via `session?.user?.role === "admin"` conditional rendering

### Integration Points
- Nav item arrays in `app-sidebar.tsx` lines 57-78: Labels and icons defined here
- CSS variables in `globals.css` lines 49-116: Sidebar color tokens (light + dark)
- `SidebarProvider` wraps dashboard layout in `src/app/(dashboard)/layout.tsx`
- Admin section rendering at lines 193-223 of app-sidebar.tsx
- Trial banner at lines 225-247 of app-sidebar.tsx

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 45-sidebar-redesign*
*Context gathered: 2026-03-04*
