# Stack Research

**Domain:** Navigation restructure, account management, schema viewer, payment type filtering — v3.0
**Researched:** 2026-02-22
**Confidence:** HIGH

---

## Context: What Exists vs. What Is New

This milestone adds to a mature Next.js 16 + Supabase + Drizzle ORM codebase (~48,000 lines). The existing stack
(React 19, TanStack Query, shadcn/ui, Zod, React Hook Form, Recharts, Tailwind CSS v4) covers all general-purpose
needs. This document covers only what is NEW or CHANGED for v3.0 features.

**Existing stack that requires NO additions for v3.0:**
- shadcn/ui sidebar primitives (Sidebar, SidebarGroup, SidebarMenu, SidebarMenuSub, SidebarMenuSubItem,
  SidebarMenuSubButton) — all already exported from `src/components/ui/sidebar.tsx` lines 640-720
- Collapsible primitive — `radix-ui` ^1.4.3 already installed; `src/components/ui/collapsible.tsx` already exists
  and used in `folder-card.tsx`
- Drizzle ORM — handles the new `financial_accounts` table migration with the same `pgTable`/`pgEnum` pattern
- TanStack Query — account CRUD hooks and type-filtered transaction queries follow existing `use-*.ts` patterns
- React Hook Form + Zod — account forms with discriminated union schemas for type-specific fields
- Tailwind CSS v4 — all layout and styling for account detail pages, schema viewer, help page
- Recharts — already installed for any new spending charts on account detail pages

---

## Recommended Stack (New Additions)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| nuqs | ^2.8.8 | URL search param state for payment type filter toggles in the transaction browser | Replaces `useState` + `router.push` boilerplate. Next.js App Router's `useSearchParams` is read-only in client components — writing requires `router.push()` which triggers full navigation and resets the virtualized list scroll position. nuqs provides shallow updates by default, behaves like `useState` but syncs to URL, making filter state persist through reloads and be bookmarkable. 6 kB gzipped. |

**That's the only new package.** All five v3.0 feature areas are buildable with what's already installed.

### Supporting Libraries (Already Installed — Usage Patterns for v3.0)

| Library | Installed Version | v3.0 Usage | Notes |
|---------|------------------|-----------|-------|
| `radix-ui` | ^1.4.3 | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` for collapsible sidebar sections | Already used in `folder-card.tsx`; import from `"radix-ui"` as shown in `collapsible.tsx` line 3 |
| shadcn/ui sidebar | n/a (generated component) | `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` for nested nav items | All three exported from `sidebar.tsx` lines 640-720; zero setup required |
| Drizzle ORM | ^0.45.1 | New `financial_accounts` table + `accountTypeEnum` + `accountId` FK on `statements` | 11th migration; `pgEnum` + `pgTable` pattern identical to 8 existing enums |
| Zod | ^4.3.5 | Discriminated union schemas for bank/credit-card/loan type-specific field sets | `z.discriminatedUnion("accountType", [...])` — same pattern as existing validation schemas |
| `@tanstack/react-query` | ^5.90.19 | Account CRUD hooks (`use-accounts.ts`), type-filtered transaction queries | Same `useQuery`/`useMutation` pattern as `use-subscriptions.ts`, `use-tags.ts` |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `drizzle-kit generate` + `drizzle-kit migrate` | Generate and apply the `financial_accounts` migration | Run after schema.ts additions; this will be migration 0011 |

---

## Installation

```bash
# Only new dependency for v3.0
npm install nuqs@^2.8.8

# After adding financial_accounts table to schema.ts
npm run db:generate
npm run db:migrate
```

No other installs required for any v3.0 feature.

---

## Feature-by-Feature Stack Decisions

### 1. Multi-Level Sidebar Navigation

**Approach:** Compose existing primitives — no new library needed.

The current `app-sidebar.tsx` uses flat `SidebarGroup` + `SidebarMenu` lists (one "Menu" group, one "Support" group,
one conditional "Admin" group). The v3.0 restructure introduces collapsible section headers with sub-items, using
primitives already installed and verified present in the codebase.

**Pattern — collapsible section with SidebarMenuSub children:**

```typescript
// src/components/layout/app-sidebar.tsx
// Import already-present primitives
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"; // already exists

import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"; // already exported, lines 640-720

// Official shadcn/ui collapsible section pattern:
<Collapsible defaultOpen className="group/collapsible">
  <SidebarGroup>
    <SidebarGroupLabel asChild>
      <CollapsibleTrigger>
        Data Vault
        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
      </CollapsibleTrigger>
    </SidebarGroupLabel>
    <CollapsibleContent>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/vault"}>
              <Link href="/vault">
                <Archive className="size-4" />
                <span>Vault</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild isActive={pathname.startsWith("/accounts")}>
                  <Link href="/accounts">Accounts</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild isActive={pathname === "/sources"}>
                  <Link href="/sources">Sources</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </CollapsibleContent>
  </SidebarGroup>
</Collapsible>
```

**Active state strategy:**
- Section-level: `pathname.startsWith("/vault")` keeps the collapsible open when on any vault sub-page
- Item-level: `pathname === "/accounts"` for exact leaf matches

**Why not a third-party nav library:** All primitives are already present. The v3.0 restructure is a
reorganization of existing items into collapsible groups — not a complex routing change.

---

### 2. Account Management (bank/debit, credit card, loan)

**Approach:** New `financial_accounts` Drizzle table + `accountTypeEnum` + discriminated union Zod schema
+ standard React Hook Form pattern.

**Schema additions to `src/lib/db/schema.ts`:**

```typescript
export const accountTypeEnum = pgEnum("account_type", [
  "bank_debit",
  "credit_card",
  "loan",
]);

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Core fields shared by all account types
    name: varchar("name", { length: 100 }).notNull(),       // "Chase Sapphire", "Wells Fargo Checking"
    accountType: accountTypeEnum("account_type").notNull(),
    institution: varchar("institution", { length: 100 }),    // "Chase", "Wells Fargo" (optional)
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),

    // Credit card specific (null for bank_debit and loan)
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
    statementClosingDay: integer("statement_closing_day"),  // 1-31

    // Loan specific (null for bank_debit and credit_card)
    originalBalance: decimal("original_balance", { precision: 12, scale: 2 }),
    interestRate: decimal("interest_rate", { precision: 5, scale: 4 }), // 0.0499 = 4.99%
    loanTermMonths: integer("loan_term_months"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("financial_accounts_user_id_idx").on(table.userId),
    index("financial_accounts_type_idx").on(table.accountType),
  ]
);
```

**Why a single table with nullable type-specific columns instead of separate tables:**
The three types share ~80% of their fields. Separate tables would multiply the API routes, hooks, and page
components by three for just 3-5 unique fields per type. A single table with a discriminated Zod union
gives type safety without that overhead.

**Discriminated union Zod schema:**

```typescript
// src/lib/validations/financial-account.ts
const baseSchema = z.object({
  name: z.string().min(1).max(100),
  institution: z.string().max(100).optional(),
  currency: z.string().length(3),
  notes: z.string().max(500).optional(),
});

const bankDebitSchema = baseSchema.extend({
  accountType: z.literal("bank_debit"),
});

const creditCardSchema = baseSchema.extend({
  accountType: z.literal("credit_card"),
  creditLimit: z.number().positive().optional(),
  statementClosingDay: z.number().int().min(1).max(31).optional(),
});

const loanSchema = baseSchema.extend({
  accountType: z.literal("loan"),
  originalBalance: z.number().positive().optional(),
  interestRate: z.number().min(0).max(1).optional(),  // decimal form: 0.0499
  loanTermMonths: z.number().int().positive().optional(),
});

export const financialAccountSchema = z.discriminatedUnion("accountType", [
  bankDebitSchema,
  creditCardSchema,
  loanSchema,
]);
```

---

### 3. Source-to-Account Migration (Data Linking)

**Approach:** Additive nullable FK `accountId` on `statements` table. No data backfill. No data loss.

```typescript
// Addition to statements table in schema.ts
accountId: uuid("account_id").references(() => financialAccounts.id, {
  onDelete: "set null",  // Deleting account does not delete statement history
}),
```

Existing `statements.sourceType` (the user-entered string like "Chase Sapphire") remains unchanged.
The new `accountId` is the entity FK. Both coexist:
- `sourceType` — display label, populated at import time
- `accountId` — nullable entity link; populated when user assigns a statement to an account

**Migration path for existing data:** No backfill script needed. Users link existing `sourceType` strings
to `financialAccounts` records via the account detail UI. New imports pick the account from the combobox
(which displays account names from `financial_accounts`) and populate both `sourceType` and `accountId`.

---

### 4. Data Schema Viewer (Read-Only)

**Approach:** Static React Server Component page — no external library.

**Why no diagramming library (Mermaid.js, React Flow):**
- The requirement is "read-only system data model page" — documentation, not an interactive ER diagram
- Mermaid.js adds ~200 kB; React Flow adds ~100 kB for what is a reference page
- shadcn/ui Table + Card components render a clear, styled schema reference server-side with zero JS

**Implementation:**

```typescript
// src/lib/schema-docs/tables.ts — static build-time data, not runtime introspection
export interface ColumnDoc {
  name: string;
  type: string;
  nullable: boolean;
  notes?: string;
}

export interface TableDoc {
  name: string;
  description: string;
  columns: ColumnDoc[];
}

export const SCHEMA_DOCS: TableDoc[] = [
  {
    name: "financial_accounts",
    description: "Named financial accounts (bank, credit card, loan) owned by users",
    columns: [
      { name: "id", type: "uuid", nullable: false, notes: "Primary key" },
      { name: "account_type", type: "enum(bank_debit|credit_card|loan)", nullable: false },
      // ...
    ],
  },
  // all 15+ tables documented here
];

// src/app/(dashboard)/schema/page.tsx — React Server Component (zero client JS)
import { SCHEMA_DOCS } from "@/lib/schema-docs/tables";

export default function SchemaPage() {
  return (
    <div className="space-y-8">
      {SCHEMA_DOCS.map((table) => (
        <section key={table.name} id={table.name}>
          <h2>{table.name}</h2>
          <p>{table.description}</p>
          <Table>{/* shadcn/ui Table */}</Table>
        </section>
      ))}
    </div>
  );
}
```

**If an interactive ER diagram is explicitly requested later:** Use `reactflow` (MIT, React 18+, maintained).
But the current scope is static documentation — a server component loads instantly and needs no JS bundle.

---

### 5. Payment Type Filtering (Transaction Browser)

**Approach:** nuqs for URL-persisted filter toggles + existing transaction query pattern.

The transaction browser currently accepts `tagStatus`, `dateFrom`, `dateTo`, `search`, `sourceType` as URL params
(confirmed in `src/app/api/transactions/route.ts` lines 19-25). Payment type filtering extends this pattern.

**Why nuqs over native `useSearchParams` + `router.push`:**
- `useSearchParams` in client components is read-only — writing requires `router.push()` which triggers a full
  navigation and resets the virtualized list scroll position (TransactionBrowser uses `@tanstack/react-virtual`)
- nuqs provides shallow updates by default: URL updates without triggering server re-render or scroll reset
- Type-safe `useQueryState` behaves like `useState` but syncs to URL — no boilerplate
- Filter state persists through reloads and is bookmarkable/shareable with colleagues
- 6 kB gzipped — negligible

**Amount sign convention check required:** Before building the client-side toggle, verify whether imported
transactions use signed amounts (positive = debit, negative = credit/refund) or always-positive amounts.
This determines whether filtering is client-side (sign inference) or requires a schema addition.

**Option A — Amount sign convention is signed (positive = debit, negative = credit):**
No schema migration needed. Filter is client-side inference:

```typescript
// src/lib/hooks/use-payment-type-filter.ts
import { useQueryState, parseAsStringEnum } from "nuqs";

const PAYMENT_TYPES = ["all", "debit", "credit"] as const;
type PaymentType = (typeof PAYMENT_TYPES)[number];

export function usePaymentTypeFilter() {
  return useQueryState(
    "paymentType",
    parseAsStringEnum([...PAYMENT_TYPES]).withDefault("all")
  );
}
```

Then in the transaction query: pass `paymentType` to the API which adds
`gt(transactions.amount, "0")` or `lt(transactions.amount, "0")` to the filter conditions.

**Option B — Amounts are always positive (direction lost at import):**
Add `transactionType pgEnum("debit" | "credit")` to transactions table, populated at AI extraction time.
This is a larger change — verify the data before committing to this path.

**nuqs setup in Next.js App Router:**

```typescript
// src/app/providers.tsx — add NuqsAdapter (required for Next.js App Router)
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SessionProvider>
    </NuqsAdapter>
  );
}
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| nuqs for URL filter state | `useState` + `router.push` | Full navigation on every toggle resets virtualized list scroll; no type safety; no bookmarkability |
| nuqs for URL filter state | `useSearchParams` (read-only) | Cannot update search params in client components without router.push; same scroll reset problem |
| Static RSC schema page | Mermaid.js | ~200 kB bundle for a static reference page; no interactive requirement in scope |
| Static RSC schema page | React Flow / @xyflow/react | ~100 kB bundle; overkill for read-only documentation |
| Single `financial_accounts` table | Separate tables per type | 3x the API routes and hooks for 3-5 unique fields per type; no benefit |
| Additive `accountId` FK on statements | Replace `sourceType` string with account FK | Destructive — breaks existing vault/coverage queries; `sourceType` is user-visible display label, `accountId` is entity FK — they serve different purposes |
| `SidebarMenuSub` + `Collapsible` | Third-party nav library | All primitives already installed; library adds bundle with no benefit for a structural reorganization |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `mermaid` or `@mermaid-js/mermaid-react` | 200 kB+ for a static reference page; no interactive requirement | shadcn/ui Table + Card components as RSC |
| `reactflow` / `@xyflow/react` | Overkill for read-only schema display | Build only if interactive ER diagram is explicitly required in a future milestone |
| Separate `bank_accounts`, `credit_cards`, `loans` tables | 3x schema + API surface for minimal field variation | Single `financial_accounts` table with discriminated Zod union |
| `@radix-ui/react-collapsible` (separate package) | Already available via `radix-ui` ^1.4.3 meta-package | Import from `"radix-ui"` as in existing `collapsible.tsx` line 3 |
| Any new chart library for account detail pages | Recharts ^3.7.0 already installed | Reuse Recharts components from `src/components/dashboard/` for spending summaries |
| `nuqs` v1.x | v1.x was designed for Next.js 13; v2.x required for Next.js 14+ App Router | `nuqs@^2.8.8` only |

---

## Stack Patterns by Variant

**If transaction amounts are signed (positive=debit, negative=credit/refund):**
- No schema migration needed for payment type filtering
- API adds `gt(transactions.amount, "0")` / `lt(transactions.amount, "0")` condition based on `paymentType` param
- Client uses `usePaymentTypeFilter()` hook with nuqs

**If transaction amounts are always positive (direction lost at import):**
- Add `transactionType pgEnum("debit" | "credit")` column to transactions table
- Populate at PDF extraction time in `src/lib/openai/pdf-parser.ts`
- This is migration 0012 if financial_accounts is 0011
- Verify the existing data in the transactions table before choosing this path

**If account detail pages need spending charts:**
- Recharts ^3.7.0 already installed — reuse `AreaChart` or `BarChart` from `src/components/dashboard/`
- API endpoint: `GET /api/accounts/[id]/spending?period=...` — standard TanStack Query hook

**If the schema viewer needs anchor links between related tables:**
- Native HTML `id` attributes on each `<section>` + `href="#table-name"` links — no library needed
- RSC renders to static HTML; anchor navigation is free

**If nuqs causes conflicts with existing URL params in the transaction browser:**
- nuqs coexists with other URL params — it only manages the keys you tell it to (`paymentType`)
- Existing `tagStatus`, `dateFrom`, `dateTo`, `search`, `sourceType` params are unaffected

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| nuqs | ^2.8.8 | Next.js 14+, React 18+ | v2.x required for Next.js 14+ App Router; verified current via `npm view nuqs version` |
| nuqs | ^2.8.8 | `@tanstack/react-query` ^5.90.19 | No conflict — nuqs manages URL state, React Query manages server state independently |
| `radix-ui` Collapsible | ^1.4.3 (installed) | Next.js 16, React 19 | Verified compatible — already used in `folder-card.tsx` with no issues |
| Drizzle ORM `pgEnum` | ^0.45.1 (installed) | PostgreSQL (Supabase) | `accountTypeEnum` follows identical pattern to 8 existing enums in schema.ts |
| Zod discriminated union | ^4.3.5 (installed) | React Hook Form ^7.71.1 via `@hookform/resolvers` ^5.2.2 | Standard pattern — same resolver integration as existing subscription form schemas |

---

## Sources

- shadcn/ui sidebar docs — https://ui.shadcn.com/docs/components/sidebar — `SidebarMenuSub`, `Collapsible` pattern, `SidebarGroupAction` (HIGH confidence — official docs)
- nuqs official site — https://nuqs.dev/ — type-safe URL params, RSC support, 6 kB size, `NuqsAdapter` requirement (HIGH confidence — official docs)
- nuqs version — `npm view nuqs version` → 2.8.8 — verified 2026-02-22 (HIGH confidence)
- Next.js `useSearchParams` docs — https://nextjs.org/docs/app/api-reference/functions/use-search-params — read-only limitation in client components confirmed (HIGH confidence — official docs)
- Codebase: `src/components/ui/sidebar.tsx` lines 640-720 — `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` exports verified (HIGH confidence)
- Codebase: `src/components/ui/collapsible.tsx` — `Collapsible` from `"radix-ui"` already used (HIGH confidence)
- Codebase: `src/app/api/transactions/route.ts` lines 19-25 — existing URL filter param pattern (HIGH confidence)
- Codebase: `src/lib/db/schema.ts` — full schema analyzed; no `transactionType` or `accountType` fields exist (HIGH confidence)
- `package.json` — all existing dependency versions confirmed exact (HIGH confidence)

---

*Stack research for: v3.0 Navigation & Account Vault — subscription manager*
*Researched: 2026-02-22*
