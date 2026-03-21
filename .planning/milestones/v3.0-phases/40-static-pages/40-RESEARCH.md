# Phase 40: Static Pages - Research

**Researched:** 2026-02-27
**Domain:** Static content pages — Next.js App Router server components, shadcn/ui Accordion, card-based data display
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema Presentation**
- Table cards layout — each database table rendered as a card with columns listed vertically
- Essential detail only — column name and type per row, no nullable/default/constraint details
- FK columns show `→ tableName` inline as text labels (no diagram or separate relationships section)
- Hardcoded static data — manually written, not auto-generated from Drizzle schema
- All table cards expanded on page load (no collapsible behavior on schema page)

**Help Content & Structure**
- Casual & friendly tone — conversational, uses "you", approachable
- Both feature walkthroughs AND troubleshooting sections (comprehensive coverage)
- Brief answers — 2-3 sentences per FAQ answer, quick to scan
- Questions grouped under category headers (e.g., Getting Started, Importing, Subscriptions, Billing, Troubleshooting)
- Simple mailto "Contact us" email link at the bottom of the page

**Accordion Behavior**
- Multi-open — multiple sections can be expanded simultaneously
- All sections collapsed by default on page load
- Questions grouped under category headings with accordions nested within each group

**Page Styling & Layout**
- Monochrome type display — no color coding for column types
- Title + 1-line description header on both pages
- Minimal documentation style — clean, text-focused like Stripe docs or Notion, prioritize readability over decoration

### Claude's Discretion
- Schema card layout (single column vs grid) — pick based on number of tables
- Exact spacing, typography, and card styling within existing design system
- Which FAQ questions to include and how to group them into categories
- Contact email address to use in the mailto link

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHEMA-01 | User can view a static read-only representation of the system data model on the Data Schema page | Server component page at `/support/schema` with hardcoded table cards, Card + CardHeader + CardContent components, no DB queries |
| HELP-01 | User can view static FAQ and documentation on the Help page with accordion sections | Server component page at `/support/help` with shadcn/ui `<Accordion type="multiple">` component already installed and verified in codebase |
</phase_requirements>

---

## Summary

Phase 40 is a pure content delivery task with no data-fetching, no API routes, and no state management. Both pages are static — the schema data is hardcoded TypeScript objects and the Help FAQ is hardcoded JSX. The entire phase can be implemented as Next.js App Router **server components** (no `"use client"` directive needed) since there is no browser-only interactivity: the shadcn/ui Accordion component handles its own collapse state via Radix UI's internal state, which requires client-side JS but is already encapsulated in `src/components/ui/accordion.tsx` as a client boundary.

The sidebar already has a `supportItems` array with a comment placeholder (`// Help and Schema added by Phase 40`), meaning the implementation path is straightforward: add two new route entries, create the pages, and update the sidebar array. The existing `DashboardHeader` component and `main` layout wrapper pattern are consistent across all pages and should be reused verbatim.

The schema data model covers 16 tables in `src/lib/db/schema.ts`. With 16 tables, a grid layout (2-column on desktop, 1-column on mobile) is appropriate — this fits comfortably on screen without excessive scrolling and groups related tables visually. The `<Accordion type="multiple">` prop enables the required multi-open behavior for the Help page.

**Primary recommendation:** Two server component pages under `src/app/(dashboard)/support/`, updating `app-sidebar.tsx` supportItems array — no new packages, no API routes, no state hooks.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (project) | Page routing via `app/(dashboard)/support/` directory | Project's existing router |
| shadcn/ui Accordion | already installed | Multi-open accordion for Help FAQ | Already in `src/components/ui/accordion.tsx`, backed by Radix UI |
| shadcn/ui Card | already installed | Table card containers for Schema page | Already in `src/components/ui/card.tsx`, used throughout app |
| Lucide React | already installed | Page icons (HelpCircle, Database, etc.) for sidebar nav entries | Used in all sidebar items and page headers |
| DashboardHeader | project component | Consistent page top-bar with breadcrumbs | Used on every dashboard page |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Separator | already installed | Visual divider between schema card sections | If needed between column rows |
| Badge | already installed | Could label FK type if needed | Only if design calls for it — locked decision says monochrome, so likely not needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hardcoded static data | Auto-generate from Drizzle schema | Locked out — user decided hardcoded; auto-gen adds complexity and security surface |
| shadcn Accordion | Custom `<details>` / `<summary>` | Accordion is already installed and matches design system; custom would be redundant |
| Server component pages | Client components | No need for `"use client"` — no browser-only state in the page shells; accordion manages its own state internally |

**Installation:** No new packages required. Everything is already in the project.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(dashboard)/
│   └── support/
│       ├── schema/
│       │   └── page.tsx          # Data Schema page (server component)
│       └── help/
│           └── page.tsx          # Help/FAQ page (server component)
└── components/layout/
    └── app-sidebar.tsx           # Add 2 items to supportItems[]
```

No new component files are necessary — both pages are self-contained. The schema data can be defined as a const array within `page.tsx` or extracted to a small data file at `src/lib/constants/schema-data.ts` if length warrants it.

### Pattern 1: Server Component Static Page

**What:** Page component with no `"use client"` directive that renders purely static JSX
**When to use:** Content pages with no user interaction at the page level (accordion state is encapsulated in the child component)
**Example (from accounts/page.tsx pattern):**

```typescript
// src/app/(dashboard)/support/schema/page.tsx
import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Data Schema",
  description: "System data model reference",
};

export default function DataSchemaPage() {
  return (
    <>
      <DashboardHeader title="Data Schema" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* page-level title + description */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Data Schema</h2>
            <p className="text-muted-foreground">
              Read-only reference for the system data model
            </p>
          </div>
          {/* table cards grid */}
        </div>
      </main>
    </>
  );
}
```

### Pattern 2: Schema Table Card

**What:** A `Card` per database table with column rows rendered as a list
**When to use:** Each of the 16 schema tables becomes one card
**Example:**

```typescript
// Table card structure
<Card>
  <CardHeader>
    <CardTitle>users</CardTitle>
    <CardDescription>User accounts with preferences and billing</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-1 text-sm font-mono">
      <div className="flex gap-3">
        <span className="text-muted-foreground w-48 shrink-0">id</span>
        <span>uuid</span>
      </div>
      <div className="flex gap-3">
        <span className="text-muted-foreground w-48 shrink-0">categoryId</span>
        <span>uuid → categories</span>
      </div>
    </div>
  </CardContent>
</Card>
```

### Pattern 3: Multi-open Accordion (Help Page)

**What:** `<Accordion type="multiple">` groups FAQ questions by category
**When to use:** When multiple accordion items can be open simultaneously
**Example (from shadcn/ui Accordion component already in project):**

```typescript
// src/app/(dashboard)/support/help/page.tsx
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// Category grouping structure
<div className="space-y-8">
  {FAQ_CATEGORIES.map((category) => (
    <div key={category.id}>
      <h3 className="text-lg font-semibold mb-4">{category.title}</h3>
      <Accordion type="multiple" className="border rounded-lg">
        {category.questions.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ))}
</div>
```

**Key detail:** `type="multiple"` on `<Accordion>` enables independent expand/collapse per item. No `defaultValue` prop means all items start collapsed — correct per the locked decision.

### Pattern 4: Sidebar Entry Update

**What:** Add route objects to the existing `supportItems` array in `app-sidebar.tsx`
**When to use:** Any time a new nav link is added to the sidebar
**Example (from existing `supportItems` in `src/components/layout/app-sidebar.tsx` line 73-76):**

```typescript
const supportItems = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Help", href: "/support/help", icon: HelpCircle },
  { title: "Data Schema", href: "/support/schema", icon: Database },
];
```

`Database` is already imported in `app-sidebar.tsx` (line 26). `HelpCircle` would need to be added to the Lucide import.

### Anti-Patterns to Avoid

- **Adding `"use client"` to page shells:** Not needed — accordion client state is contained within the accordion component itself. Page-level server component is fine.
- **Live DB queries for schema page:** Explicitly out of scope per REQUIREMENTS.md ("Live DB introspection for schema viewer: Security risk"). All data is hardcoded.
- **One `<Accordion>` wrapping all categories:** Use one `<Accordion type="multiple">` per category group — this creates the nested visual grouping the user described. A single top-level accordion with category names as triggers is an alternative but less clean for the requested "questions grouped under category headings" pattern.
- **Using `defaultValue` on Accordion:** Omit this prop entirely — it causes items to start expanded, which is the opposite of the locked decision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accordion expand/collapse | Custom toggle state + CSS | `shadcn/ui Accordion` (already installed) | Handles accessibility (ARIA), keyboard nav, animation — all free |
| Page header bar | Custom header | `DashboardHeader` component | Already handles SidebarTrigger, breadcrumbs, ThemeToggle, NotificationBell consistently |
| Card container | Custom div styling | `Card`, `CardHeader`, `CardContent` | Already styled, consistent shadow/border/radius with design system |

---

## Common Pitfalls

### Pitfall 1: Schema Page Route Conflict

**What goes wrong:** Creating page at `/schema` or `/data-schema` instead of within `/support/` group, breaking the sidebar nav tree
**Why it happens:** Phase spec says "accessible via Support section of sidebar" — must be nested under `/support/`
**How to avoid:** Place both pages under `src/app/(dashboard)/support/schema/page.tsx` and `src/app/(dashboard)/support/help/page.tsx`
**Warning signs:** Nav item doesn't highlight as active when on the page

### Pitfall 2: Accordion Type Mismatch

**What goes wrong:** Using `type="single"` instead of `type="multiple"` — only one item can be open at a time
**Why it happens:** `type="single"` is the Radix default example in many docs
**How to avoid:** Explicitly pass `type="multiple"` per locked decision
**Warning signs:** Clicking a second question collapses the first

### Pitfall 3: Missing `isActive` for New Nav Items

**What goes wrong:** New sidebar items don't highlight when navigating to them
**Why it happens:** `isNavItemActive` in `app-sidebar.tsx` uses exact match by default — the items use `pathname === href`, which is correct for `/support/help` and `/support/schema` (no children), so no special-casing needed
**How to avoid:** Verify `isNavItemActive` handles the new hrefs — exact match is correct here, no prefix match needed
**Warning signs:** Nav item never highlights

### Pitfall 4: Schema Data Scope Creep

**What goes wrong:** Including column constraints, defaults, nullability, index definitions, or enum values in the schema cards
**Why it happens:** The full Drizzle schema has all this information available and it's tempting to include it
**How to avoid:** Locked decision: "Essential detail only — column name and type per row". FK references shown as `→ tableName`. Nothing else.
**Warning signs:** Cards become too tall and lose scanability

### Pitfall 5: HelpCircle Icon Not Imported

**What goes wrong:** Adding `HelpCircle` to `supportItems` but forgetting to add it to the Lucide import at the top of `app-sidebar.tsx`
**Why it happens:** `Database` is already imported (line 26), `HelpCircle` is not
**How to avoid:** Add `HelpCircle` to the existing import: `import { ..., HelpCircle } from "lucide-react"`
**Warning signs:** TypeScript error `HelpCircle is not defined`

---

## Code Examples

Verified patterns from existing codebase:

### DashboardHeader with breadcrumbs (from `accounts/[id]/page.tsx`)

```typescript
<DashboardHeader
  title="Data Schema"
  breadcrumbs={[
    { label: "Support", href: "/support/help" },
    { label: "Data Schema" },
  ]}
/>
```

Or simpler (from `accounts/page.tsx`):

```typescript
<DashboardHeader title="Data Schema" />
```

Both are valid — the breadcrumb pattern is optional but adds navigation context.

### Page main content wrapper (consistent across all pages)

```typescript
<main className="flex-1 p-4 md:p-6">
  <div className="mx-auto max-w-5xl space-y-6">
    {/* content */}
  </div>
</main>
```

### Page-level title + description (from `payments/reminders/page.tsx` lines 141-148)

```typescript
<div>
  <h2 className="text-2xl font-bold tracking-tight">Data Schema</h2>
  <p className="text-muted-foreground">
    A read-only reference for the system's data model
  </p>
</div>
```

### Schema table cards — grid layout recommendation

With 16 tables, use a 2-column responsive grid:

```typescript
<div className="grid gap-4 md:grid-cols-2">
  {SCHEMA_TABLES.map((table) => (
    <Card key={table.name}>
      <CardHeader>
        <CardTitle className="font-mono text-base">{table.name}</CardTitle>
        <CardDescription>{table.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 text-sm">
          {table.columns.map((col) => (
            <div key={col.name} className="flex gap-3">
              <span className="text-muted-foreground font-mono w-44 shrink-0 truncate">
                {col.name}
              </span>
              <span className="font-mono text-muted-foreground">
                {col.type}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### Schema data structure (hardcoded TypeScript constant)

```typescript
// Defined in page.tsx or extracted to src/lib/constants/schema-data.ts
const SCHEMA_TABLES = [
  {
    name: "users",
    description: "User accounts with preferences and billing status",
    columns: [
      { name: "id", type: "uuid" },
      { name: "email", type: "varchar(255)" },
      { name: "name", type: "varchar(255)" },
      { name: "billingStatus", type: "billing_status enum" },
      { name: "stripeCustomerId", type: "varchar(255)" },
      // ... etc
    ],
  },
  {
    name: "subscriptions",
    description: "User subscriptions with renewal tracking",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid → users" },
      { name: "categoryId", type: "uuid → categories" },
      { name: "name", type: "varchar(255)" },
      { name: "amount", type: "decimal(10,2)" },
      { name: "frequency", type: "frequency enum" },
      { name: "status", type: "subscription_status enum" },
      // ... etc
    ],
  },
  // ... 14 more tables
] as const;
```

### Full list of tables to document (from schema.ts)

16 tables present in `src/lib/db/schema.ts`:
1. `users` — user accounts, preferences, billing
2. `accounts` — NextAuth OAuth accounts (note: different from `financial_accounts`)
3. `sessions` — NextAuth sessions
4. `verification_tokens` — NextAuth email verification
5. `authenticators` — NextAuth WebAuthn
6. `password_reset_tokens` — password reset flow
7. `categories` — subscription categories (predefined + custom)
8. `subscriptions` — user subscription records
9. `reminder_logs` — email delivery tracking
10. `import_audits` — PDF import history
11. `fx_rates_cache` — exchange rate cache
12. `recurring_patterns` — AI-detected recurring charge patterns
13. `alerts` — price increase / missed renewal alerts
14. `financial_accounts` — user's bank/credit/loan accounts
15. `statements` — uploaded PDF statement metadata
16. `transactions` — extracted transactions from statements
17. `tags` — user-defined transaction tags
18. `transaction_tags` — junction table: transactions ↔ tags
19. `webhook_events` — Stripe webhook idempotency log
20. `stripe_prices` — Stripe price catalog
21. `trial_extensions` — admin-granted trial extensions

**Correction:** 21 tables total, not 16. A 2-column grid is still the right call — 21 cards fits well on a scrollable page in 2 columns (~11 rows).

### FAQ structure for Help page

Categories suggested (Claude's discretion — based on app features):

1. **Getting Started** — What is this app, how do I add my first subscription, what's the trial
2. **Subscriptions** — Adding manually, editing, deleting, status meanings, currency
3. **Importing** — How PDF import works, supported banks, what happens after upload
4. **Reminders** — How reminders work, changing timing, per-subscription overrides
5. **Billing** — What's included in each tier, how to upgrade, cancellation
6. **Troubleshooting** — Import failed, subscriptions not showing, email not received

### Contact link at bottom of Help page

```typescript
<div className="mt-12 pt-8 border-t text-center">
  <p className="text-muted-foreground text-sm">
    Didn't find what you're looking for?{" "}
    <a
      href="mailto:support@example.com"
      className="text-primary hover:underline font-medium"
    >
      Contact us
    </a>
  </p>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<details>/<summary>` accordion | Radix UI Accordion via shadcn/ui | shadcn/ui adoption | Accessibility + animation included |
| Client component pages | Server component pages (App Router) | Next.js 13+ | No hydration cost for static content |

---

## Open Questions

1. **Contact email address**
   - What we know: User decided "simple mailto link at bottom" (Claude's discretion for the email address)
   - What's unclear: What email address to use
   - Recommendation: Use `support@subscriptions.app` as placeholder or check if there's an existing email in codebase (e.g., in Resend config or landing page)

2. **Schema breadcrumb: link to the other support page?**
   - What we know: Both pages are siblings in `/support/`
   - What's unclear: Whether breadcrumbs should show `Support > Data Schema` (linking to /support/help as parent) or just use the page title directly
   - Recommendation: Use simple title-only `DashboardHeader` (no breadcrumbs) for both pages since there's no `/support/` index page. Or use `DashboardHeader title="Support"` with breadcrumb `{ label: "Data Schema" }` for context. Either is valid.

---

## Sources

### Primary (HIGH confidence)

- Project codebase — `src/components/ui/accordion.tsx` — verified Accordion component exists, uses Radix UI, exports `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- Project codebase — `src/components/layout/app-sidebar.tsx` — confirmed `supportItems` array with Phase 40 comment at line 74-76; `Database` icon already imported; `HelpCircle` not yet imported
- Project codebase — `src/lib/db/schema.ts` — full table inventory (21 tables confirmed)
- Project codebase — `src/app/(dashboard)/accounts/page.tsx`, `payments/reminders/page.tsx` — confirmed page structure pattern (`DashboardHeader` + `<main className="flex-1 p-4 md:p-6">` + `max-w-5xl` wrapper)
- Project codebase — `.planning/REQUIREMENTS.md` — confirms "Live DB introspection: Security risk; static metadata is correct approach" is explicitly out of scope

### Secondary (MEDIUM confidence)

- shadcn/ui Accordion docs (via component source) — `type="multiple"` for multi-open behavior; omitting `defaultValue` for collapsed-by-default state

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified in project files, no new packages
- Architecture: HIGH — page pattern is consistent and verified across 5+ existing pages
- Pitfalls: HIGH — identified from direct code inspection of sidebar import list, Accordion API

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable — no fast-moving dependencies)
