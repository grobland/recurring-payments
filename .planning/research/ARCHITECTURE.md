# Architecture Research

**Domain:** v3.0 Navigation & Account Vault — integrating account management, nav restructure, payment type filtering, schema viewer, and help page into the existing subscription manager
**Researched:** 2026-02-22
**Confidence:** HIGH (all findings from direct codebase analysis)

## Standard Architecture

### System Overview

The existing architecture is a layered Next.js 16 App Router application with a clear separation between
presentation, API, business logic, and data layers. All new features integrate into this existing skeleton
without changing the fundamental approach.

```
┌────────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER (Client)                       │
│                                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ AppSidebar  │  │ AccountPages │  │ Transaction  │  │SchemaViewer │  │
│  │(3 sections) │  │(list+detail) │  │Browser+Filter│  │ (static)    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                │                  │                  │         │
├─────────┴────────────────┴──────────────────┴──────────────────┴─────────┤
│                         API LAYER (Server Routes)                         │
│                                                                           │
│  ┌────────────────┐  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │ /api/accounts  │  │  /api/transactions   │  │ existing: sources,     │ │
│  │  CRUD (NEW)    │  │  + paymentType filter│  │ statements, vault, etc.│ │
│  └────────┬───────┘  │  (MODIFIED)         │  └──────────────┬─────────┘ │
│            │          └──────────┬──────────┘                 │          │
├────────────┴─────────────────────┴─────────────────────────────┴─────────┤
│                     BUSINESS LOGIC LAYER (src/lib/)                       │
│                                                                           │
│  ┌────────────────┐  ┌───────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ db/schema.ts   │  │  lib/hooks/   │  │  features/   │  │ utils/    │ │
│  │ (+ accounts    │  │  use-accounts │  │  config.ts   │  │ normalize │ │
│  │  table + FK)   │  │  use-trans    │  │  (unchanged) │  │           │ │
│  └──────┬─────────┘  └───────┬───────┘  └──────┬───────┘  └─────┬────┘ │
│          │                    │                   │                │      │
├──────────┴────────────────────┴───────────────────┴────────────────┴─────┤
│                        DATA LAYER (Supabase PostgreSQL)                   │
│                                                                           │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  financial │  │ statements │  │ transactions │  │  (13 existing   │  │
│  │  _accounts │  │ (+acctId)  │  │ (unchanged)  │  │   tables)       │  │
│  │   (NEW)    │  │  (MODIFY)  │  │              │  │                 │  │
│  └────────────┘  └────────────┘  └──────────────┘  └─────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `AppSidebar` | Multi-level nav with three named section groups | MODIFY |
| `AccountListPage` | Grid of user accounts with type badges | NEW |
| `AccountDetailPage` | Tabs: details, coverage grid, transactions, spending | NEW |
| `AccountForm` | Create/edit form with type-discriminated conditional fields | NEW |
| `TransactionBrowser` | Virtualized transaction list with keyset pagination | MODIFY |
| `TransactionFilters` | Filter bar with payment type toggle group | MODIFY |
| `SchemaViewerPage` | Read-only display of system data model | NEW |
| `HelpPage` | Static FAQ content | NEW |

## Existing Architecture: What Already Works

Understanding what NOT to change is as important as what to add.

### Routing Skeleton (App Router)

```
src/app/(dashboard)/
├── layout.tsx                  -- auth guard + SidebarProvider (NO CHANGE)
├── dashboard/page.tsx          -- stays in fin Vault section
├── vault/page.tsx              -- stays in fin Vault section
├── sources/page.tsx            -- stays, links to account management
├── statements/[id]/page.tsx    -- stays
├── subscriptions/...           -- stays in payments Portal section
├── transactions/page.tsx       -- stays in payments Portal section
├── analytics/page.tsx          -- stays in payments Portal section
├── import/...                  -- stays in payments Portal section
├── suggestions/page.tsx        -- stays in payments Portal section
├── reminders/page.tsx          -- stays in payments Portal section
├── settings/...                -- stays in Support section
└── [NEW ROUTES ADDED]
    ├── accounts/
    │   ├── page.tsx            -- Account list page (NEW)
    │   └── [id]/
    │       └── page.tsx        -- Account detail page (NEW)
    ├── schema/
    │   └── page.tsx            -- Data Schema Viewer (NEW)
    └── help/
        └── page.tsx            -- Help FAQ page (NEW)
```

### Database Schema: Current Relevant Tables

```
statements
  id                uuid PK
  userId            uuid FK -> users
  sourceType        varchar(100)     -- "Chase Sapphire" (the old account identity)
  pdfStoragePath    text (nullable)  -- Supabase Storage path
  statementDate     timestamp
  processingStatus  enum

transactions
  id                uuid PK
  statementId       uuid FK -> statements
  userId            uuid FK -> users
  tagStatus         enum (unreviewed | potential_subscription | not_subscription | converted)
  -- tagStatus is the data that powers the new "payment type" filter
```

### Existing TanStack Query Hook Pattern

All new hooks must follow this exact pattern (from `use-sources.ts`):

```typescript
export const entityKeys = {
  all: ["entity-name"] as const,
  list: () => [...entityKeys.all, "list"] as const,
  detail: (id: string) => [...entityKeys.all, "detail", id] as const,
};

export function useEntities(options?) {
  return useQuery({
    queryKey: entityKeys.list(),
    queryFn: fetchEntities,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}
```

## New Database Table: `financial_accounts`

This is the only new table for v3.0. The `statements.sourceType` string is the existing "account identity" — the migration strategy links existing strings to new typed account records.

### Table Design

```typescript
// NEW enum for schema.ts
export const accountTypeEnum = pgEnum("account_type", [
  "bank_debit",
  "credit_card",
  "loan",
]);

// NEW table for schema.ts
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Identity
    name: varchar("name", { length: 100 }).notNull(),
    type: accountTypeEnum("type").notNull(),

    // Display metadata
    institution: varchar("institution", { length: 100 }),  // "Chase", "Wells Fargo"
    lastFourDigits: varchar("last_four_digits", { length: 4 }),
    color: varchar("color", { length: 7 }),    // Optional hex for card display
    notes: text("notes"),

    // Migration bridge: sourceType string this account absorbs
    legacySourceType: varchar("legacy_source_type", { length: 100 }),

    // Type-discriminated fields (nullable; validation enforced at API layer)
    // bank_debit only
    bankRoutingNumber: varchar("bank_routing_number", { length: 9 }),
    // credit_card only
    creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }),
    statementClosingDay: integer("statement_closing_day"),  // 1-31
    // loan only
    principalAmount: decimal("principal_amount", { precision: 10, scale: 2 }),
    interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
    loanTermMonths: integer("loan_term_months"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("financial_accounts_user_id_idx").on(table.userId),
    index("financial_accounts_type_idx").on(table.type),
  ]
);
```

### `statements` Table Modification

Add a nullable FK to link statements to accounts after user-driven migration:

```typescript
// ADD to existing statements table definition
accountId: uuid("account_id").references(() => financialAccounts.id, {
  onDelete: "set null",
}),
```

Nullable because:
1. Existing statements retain their `sourceType` string as identity — no account record exists yet
2. User creates accounts on demand and selects which `sourceType` to absorb
3. New statements can be linked to an account at import time (future enhancement)

### Migration Approach: User-Driven, Not Automatic

Source-to-account migration is NOT automated by the DB migration. Only the schema changes run automatically.

The flow:
1. Migration adds `financial_accounts` table and nullable `statements.accountId` column
2. Existing statements retain `sourceType` and have `accountId = NULL`
3. User visits `/accounts`, sees "Convert Sources" prompt if unlinked `sourceType` values exist
4. User creates an account, optionally mapping a `legacySourceType` string
5. API links: `UPDATE statements SET accountId = [id] WHERE sourceType = [legacySourceType]`

This preserves user control over what gets labeled as what type of account.

## Recommended Project Structure: New Files Only

```
src/
├── app/(dashboard)/
│   ├── accounts/
│   │   ├── page.tsx                       -- Account list (grid view)
│   │   └── [id]/
│   │       └── page.tsx                   -- Account detail (tabs)
│   ├── schema/
│   │   └── page.tsx                       -- Data Schema Viewer (Server Component)
│   └── help/
│       └── page.tsx                       -- Help/FAQ page (static content)
├── components/
│   ├── accounts/                          -- NEW folder
│   │   ├── account-card.tsx               -- Card for account grid
│   │   ├── account-list.tsx               -- Grid container with empty state
│   │   ├── account-form.tsx               -- Create/edit with type switcher
│   │   ├── account-type-badge.tsx         -- Bank/Card/Loan badge
│   │   ├── account-detail-tabs.tsx        -- Tabs: details, coverage, transactions, spending
│   │   ├── account-spending-summary.tsx   -- Spending aggregation from linked statements
│   │   ├── source-migration-banner.tsx    -- Prompts linking unlinked sourceTypes
│   │   └── index.ts
│   ├── schema/                            -- NEW folder
│   │   ├── schema-viewer.tsx              -- Main schema display component
│   │   ├── table-card.tsx                 -- Per-table column accordion card
│   │   └── index.ts
│   ├── layout/
│   │   └── app-sidebar.tsx                -- MODIFY: add three section groups
│   └── transactions/
│       ├── transaction-filters.tsx        -- MODIFY: add paymentType toggle
│       └── transaction-browser.tsx        -- MODIFY: accept accountId prop; wire paymentType
├── lib/
│   ├── db/
│   │   └── schema.ts                      -- MODIFY: add financialAccounts + accountId FK
│   ├── hooks/
│   │   ├── use-accounts.ts                -- NEW: list, detail, CRUD mutations
│   │   ├── use-account-coverage.ts        -- NEW: coverage data for account detail tab
│   │   ├── use-account-spending.ts        -- NEW: spending summary for account detail tab
│   │   └── use-transactions.ts            -- MODIFY: accept paymentType + accountId params
│   ├── validations/
│   │   └── account.ts                     -- NEW: Zod schemas for account create/edit
│   └── features/
│       └── config.ts                      -- NO CHANGE needed for v3.0
└── app/api/
    ├── accounts/
    │   ├── route.ts                       -- GET (list), POST (create + optional source link)
    │   └── [id]/
    │       ├── route.ts                   -- GET, PATCH, DELETE
    │       ├── coverage/
    │       │   └── route.ts               -- Coverage data scoped to account
    │       ├── transactions/
    │       │   └── route.ts               -- Transactions scoped to account
    │       └── spending/
    │           └── route.ts               -- Spending summary for account
    └── transactions/
        └── route.ts                       -- MODIFY: add paymentType query param handling
```

## Architectural Patterns

### Pattern 1: Sidebar Section Groups

**What:** Replace the single flat `mainNavItems` array in `app-sidebar.tsx` with three explicit named section arrays, each rendered in its own `SidebarGroup` with a `SidebarGroupLabel`.

**Current state:** One `SidebarGroup` labeled "Menu" with 11 items rendered from a flat array, plus a separate "Support" group with 2 items.

**Target state:**

```typescript
// components/layout/app-sidebar.tsx — target structure
const finVaultItems = [
  { title: "Dashboard",     href: "/dashboard",          icon: LayoutDashboard },
  { title: "Accounts",      href: "/accounts",           icon: Wallet },         // NEW
  { title: "Vault",         href: "/vault",              icon: Archive },
  { title: "Sources",       href: "/sources",            icon: FileStack },
];

const paymentsPortalItems = [
  { title: "Subscriptions", href: "/subscriptions",      icon: CreditCard },
  { title: "Transactions",  href: "/transactions",       icon: Receipt },
  { title: "Analytics",     href: "/analytics",          icon: BarChart3 },
  { title: "Forecast",      href: "/dashboard/forecasting", icon: TrendingUp },
  { title: "Import",        href: "/import",             icon: FileUp },
  { title: "Batch Import",  href: "/import/batch",       icon: FolderUp },
  { title: "Suggestions",   href: "/suggestions",        icon: Sparkles },
  { title: "Reminders",     href: "/reminders",          icon: Bell },
];

const supportItems = [
  { title: "Settings",      href: "/settings",           icon: Settings },
  { title: "Help",          href: "/help",               icon: HelpCircle },     // NEW route
  { title: "Schema",        href: "/schema",             icon: Database },       // NEW
];
```

The `SidebarGroup`, `SidebarGroupLabel`, and `SidebarGroupContent` composition is already used in this file for the "Support" and "Admin" sections — extending to three named groups is a mechanical change, no new primitives needed.

**Trade-offs:**
- More verbose than a flat array, but intent is explicit
- Items moving between sections does not require route changes
- Collapsible behavior via `SidebarGroup` `collapsible` prop is available but optional

### Pattern 2: Type-Discriminated Form with Conditional Fields

**What:** Account creation/edit form where the selected `type` value controls which additional fields render. Zod validation enforces type-specific field requirements server-side.

**When to use:** When an entity has a fixed discriminant that determines which optional fields are meaningful.

```typescript
// components/accounts/account-form.tsx
function AccountForm({ account, onSubmit }: AccountFormProps) {
  const form = useForm<AccountFormData>({ ... });
  const selectedType = form.watch("type");

  return (
    <Form {...form}>
      {/* Always shown — applies to all account types */}
      <FormField name="type" .../>
      <FormField name="name" .../>
      <FormField name="institution" .../>
      <FormField name="lastFourDigits" .../>

      {/* bank_debit only */}
      {selectedType === "bank_debit" && (
        <FormField name="bankRoutingNumber" .../>
      )}

      {/* credit_card only */}
      {selectedType === "credit_card" && (
        <>
          <FormField name="creditLimit" .../>
          <FormField name="statementClosingDay" .../>
        </>
      )}

      {/* loan only */}
      {selectedType === "loan" && (
        <>
          <FormField name="principalAmount" .../>
          <FormField name="interestRate" .../>
          <FormField name="loanTermMonths" .../>
        </>
      )}
    </Form>
  );
}
```

**Zod schema for server validation:**

```typescript
// lib/validations/account.ts
const baseSchema = z.object({
  name: z.string().min(1).max(100),
  institution: z.string().max(100).optional(),
  lastFourDigits: z.string().length(4).regex(/^\d{4}$/).optional(),
  legacySourceType: z.string().max(100).optional(),
});

export const createAccountSchema = z.discriminatedUnion("type", [
  baseSchema.extend({ type: z.literal("bank_debit"), bankRoutingNumber: z.string().length(9).optional() }),
  baseSchema.extend({ type: z.literal("credit_card"), creditLimit: z.number().positive().optional(), statementClosingDay: z.number().int().min(1).max(31).optional() }),
  baseSchema.extend({ type: z.literal("loan"), principalAmount: z.number().positive().optional(), interestRate: z.number().positive().optional(), loanTermMonths: z.number().int().positive().optional() }),
]);
```

**Trade-offs:**
- Discriminated union gives full type safety at the API boundary
- Nullable DB columns are fine — validation enforces correctness, not the schema
- `form.watch("type")` re-renders conditional fields immediately on type change

### Pattern 3: Account Detail Tabs with Lazy Independent Data Loading

**What:** The account detail page uses tabs where each tab fetches its own data independently via its own hook. Data for tabs not yet visited is not fetched.

**When to use:** When a detail page aggregates from multiple endpoints and not all tabs are always visited.

```typescript
// app/(dashboard)/accounts/[id]/page.tsx
export default function AccountDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="coverage">Coverage</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="spending">Spending</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        {/* useAccount(id) — fetches once, lightweight */}
        <AccountDetailCard accountId={params.id} />
      </TabsContent>

      <TabsContent value="coverage">
        {/* useAccountCoverage(id) — reuses CoverageGrid component unchanged */}
        <AccountCoverageTab accountId={params.id} />
      </TabsContent>

      <TabsContent value="transactions">
        {/* Reuse TransactionBrowser with accountId prop — NOT a new browser */}
        <TransactionBrowser accountId={params.id} />
      </TabsContent>

      <TabsContent value="spending">
        {/* useAccountSpending(id) — simple SUM aggregation */}
        <AccountSpendingSummary accountId={params.id} />
      </TabsContent>
    </Tabs>
  );
}
```

The Coverage tab reuses the existing `CoverageGrid` component from `src/components/vault/coverage-grid.tsx` directly. The account-scoped coverage API returns data in the same `{ sources: CoverageSource[], months: string[] }` shape as the vault coverage hook. Zero changes to `CoverageGrid`.

**Trade-offs:**
- Each tab fetches independently — slightly more requests than one big query
- TanStack Query caches all tab data after first visit — tab switching is instant after first load
- Much simpler than trying to build one mega-query that returns all tab data

### Pattern 4: Payment Type Filter as tagStatus Alias

**What:** "Payment type" is a new filter concept in the transaction browser that maps to groupings of the existing `tagStatus` enum. No new DB column needed.

**When to use:** When a new filter concept can be expressed as a logical grouping of existing enum values.

**Mapping:**

| paymentType value | Equivalent tagStatus filter |
|-------------------|-----------------------------|
| `"all"` | No filter (existing default) |
| `"recurring"` | `tagStatus IN ('potential_subscription', 'converted')` |
| `"subscriptions"` | `tagStatus = 'converted'` |

**Type extension:**

```typescript
// types/transaction.ts — ADD to TransactionFilters
export interface TransactionFilters {
  sourceType?: string;
  tagStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  paymentType?: "all" | "recurring" | "subscriptions";  // NEW
}
```

**API translation:**

```typescript
// app/api/transactions/route.ts — ADD before building conditions
const paymentType = searchParams.get("paymentType");
if (paymentType === "recurring") {
  conditions.push(
    inArray(transactions.tagStatus, ["potential_subscription", "converted"])
  );
} else if (paymentType === "subscriptions") {
  conditions.push(eq(transactions.tagStatus, "converted"));
}
// "all" or null = no additional condition
```

**UI component:** A `ToggleGroup` (3 options, compact) rather than a dropdown, since there are only 3 values and quick toggling is the intended UX. The `paymentType` toggle replaces the `tagStatus` dropdown when active — they're mutually exclusive filters to avoid conflicting state.

**Trade-offs:**
- No schema change — pure query-layer mapping
- "Recurring" includes both `potential_subscription` and `converted` — a reasonable approximation
- Cannot combine paymentType and tagStatus filters simultaneously — simplify UI by hiding tagStatus dropdown when paymentType is not "all"

### Pattern 5: Schema Viewer as Server Component with Static Metadata

**What:** The Data Schema Viewer displays the system data model. It does NOT query the live database — it renders a static description of the schema structure.

**Why NOT query `information_schema`:** The TypeScript schema (`schema.ts`) is the source of truth, not the DB catalog. Querying `information_schema` adds a round-trip, requires extra permissions, and returns raw Postgres type names rather than application-level labels and descriptions.

**Implementation:** A Server Component that renders a pre-authored static metadata object describing each table, its columns, types, and relationships.

```typescript
// app/(dashboard)/schema/page.tsx (Server Component — no "use client")
// No data fetching needed — schema IS the data

const SCHEMA_METADATA = [
  {
    tableName: "users",
    description: "User accounts with authentication and billing status",
    columns: [
      { name: "id", type: "uuid", notes: "Primary key" },
      { name: "email", type: "varchar(255)", notes: "Unique, used for login" },
      { name: "billingStatus", type: "enum", notes: "trial | active | cancelled | past_due" },
      // ...
    ],
  },
  {
    tableName: "financial_accounts",
    description: "User financial accounts (bank accounts, credit cards, loans)",
    columns: [
      { name: "id", type: "uuid", notes: "Primary key" },
      { name: "type", type: "enum", notes: "bank_debit | credit_card | loan" },
      // ...
    ],
  },
  // ... one entry per table
];

export default function SchemaViewerPage() {
  return <SchemaViewer tables={SCHEMA_METADATA} />;
}
```

**Trade-offs:**
- Manual metadata: extra work when schema changes, but full control over descriptions and grouping
- Drizzle introspection (inspecting table column objects): stays in sync automatically, but output requires transformation and loses human-readable descriptions
- Recommendation: Manual for v3.0. When schema has stabilized and table count exceeds ~20, switch to introspection if maintenance burden justifies it.

### Pattern 6: Account-Scoped Coverage Reusing Existing CoverageGrid

**What:** The coverage tab on account detail reuses the existing `CoverageGrid` component verbatim. The account-scoped coverage API returns data in the same shape the vault coverage hook already produces.

**Existing `CoverageGrid` props interface (from `src/components/vault/coverage-grid.tsx`):**

```typescript
interface CoverageGridProps {
  sources: CoverageSource[];       // from types/source.ts (existing)
  months: string[];                // "YYYY-MM" strings
  onCellClick: (info: CoverageCellClickInfo) => void;
}
```

**Account coverage API returns the same shape:**

```typescript
// GET /api/accounts/[id]/coverage
// Response: { sources: CoverageSource[], months: string[] }
// Queries: statements WHERE accountId = [id]
// Same aggregation logic as /api/sources but scoped to one account
```

This means the account coverage tab component is:

```typescript
// components/accounts/account-detail-tabs.tsx (coverage tab)
function AccountCoverageTab({ accountId }: { accountId: string }) {
  const { data } = useAccountCoverage(accountId);
  return (
    <CoverageGrid
      sources={data?.sources ?? []}
      months={data?.months ?? []}
      onCellClick={handleCellClick}
    />
  );
}
```

Zero changes to `CoverageGrid`. Complete reuse.

## Data Flow

### Request Flow: Account List Page

```
User navigates to /accounts
    |
    v
AccountListPage renders (Server Component shell)
    |
    v
AccountList (Client Component) calls useAccounts()
    |
    v
GET /api/accounts
    |
SELECT * FROM financial_accounts WHERE userId = [session.userId]
ORDER BY createdAt DESC
    |
    v
Returns: Account[] with type, name, institution, lastFourDigits
    |
    v
AccountCard x N rendered in grid
```

### Request Flow: Account Creation with Source Linking

```
User submits AccountForm with legacySourceType = "Chase Sapphire"
    |
    v
useCreateAccount.mutate({ name: "Chase Sapphire Visa", type: "credit_card",
                          legacySourceType: "Chase Sapphire" })
    |
    v
POST /api/accounts { ...fields, legacySourceType: "Chase Sapphire" }
    |
    v
INSERT INTO financial_accounts ... RETURNING id
    |
    v (if legacySourceType provided)
UPDATE statements SET accountId = [new_id]
  WHERE userId = [userId] AND sourceType = "Chase Sapphire"
    |
    v
Invalidate: ["accounts"], ["sources"]
    |
    v
AccountList and SourceDashboard both refetch
```

### Request Flow: Transaction Browser with Payment Type Filter

```
User clicks "Recurring" in TransactionFilters ToggleGroup
    |
    v
setFilters({ ...filters, paymentType: "recurring" })
    |
    v
useTransactions({ paymentType: "recurring" }) — new query key, TanStack Query refetches
    |
    v
GET /api/transactions?paymentType=recurring
    |
    v
API translates: paymentType=recurring -> tagStatus IN ('potential_subscription', 'converted')
    |
    v
SELECT ... FROM transactions WHERE tagStatus IN (...) AND userId = [id] ...
    |
    v
Returns filtered, paginated TransactionPage
    |
    v
TransactionTable re-renders with filtered results
```

### State Management: New Query Keys

Follows existing TanStack Query pattern. New keys added:

```
["accounts"]                      -> list all accounts for current user
["accounts", "list"]              -> same (following sourceKeys pattern)
["accounts", "detail", id]        -> single account
["accounts", "detail", id, "coverage"]  -> coverage data for account
["accounts", "detail", id, "spending"]  -> spending summary for account
["transactions", filters]         -> unchanged, extended with paymentType and accountId params
```

Mutations invalidate:
- Account create/update → `["accounts"]`
- Account create with legacySourceType → also `["sources"]` (SourceDashboard shows link status)
- Account delete → `["accounts"]`, and statements with that accountId get `accountId = NULL` (DB cascade)

## Integration Points: New vs. Modified

### New Components (add without touching existing files)

| New Item | Location | Key Dependencies |
|----------|----------|-----------------|
| `AccountCard` | `components/accounts/account-card.tsx` | `AccountTypeBadge`, shadcn Card |
| `AccountList` | `components/accounts/account-list.tsx` | `AccountCard`, `useAccounts` |
| `AccountForm` | `components/accounts/account-form.tsx` | React Hook Form, `account.ts` Zod schema |
| `AccountTypeBadge` | `components/accounts/account-type-badge.tsx` | shadcn Badge |
| `AccountDetailTabs` | `components/accounts/account-detail-tabs.tsx` | `CoverageGrid` (reused), `TransactionBrowser` (reused) |
| `AccountSpendingSummary` | `components/accounts/account-spending-summary.tsx` | `useAccountSpending` |
| `SourceMigrationBanner` | `components/accounts/source-migration-banner.tsx` | `useSources`, detects NULL accountId sources |
| `SchemaViewer` | `components/schema/schema-viewer.tsx` | Static metadata object |
| `TableCard` | `components/schema/table-card.tsx` | shadcn Accordion |
| `/accounts/page.tsx` | `app/(dashboard)/accounts/page.tsx` | `AccountList`, `AccountForm` |
| `/accounts/[id]/page.tsx` | `app/(dashboard)/accounts/[id]/page.tsx` | `AccountDetailTabs` |
| `/schema/page.tsx` | `app/(dashboard)/schema/page.tsx` | `SchemaViewer` (Server Component) |
| `/help/page.tsx` | `app/(dashboard)/help/page.tsx` | Static JSX content |
| `/api/accounts route.ts` | `app/api/accounts/route.ts` | Drizzle, auth, `createAccountSchema` |
| `/api/accounts/[id] route.ts` | `app/api/accounts/[id]/route.ts` | Drizzle, auth |
| `/api/accounts/[id]/coverage` | `app/api/accounts/[id]/coverage/route.ts` | Coverage query logic from `/api/sources` |
| `/api/accounts/[id]/transactions` | `app/api/accounts/[id]/transactions/route.ts` | Transaction query + accountId WHERE |
| `/api/accounts/[id]/spending` | `app/api/accounts/[id]/spending/route.ts` | SUM aggregation |
| `useAccounts` | `lib/hooks/use-accounts.ts` | TanStack Query |
| `useAccount(id)` | `lib/hooks/use-accounts.ts` | TanStack Query |
| `useCreateAccount` | `lib/hooks/use-accounts.ts` | TanStack Query mutation |
| `useUpdateAccount` | `lib/hooks/use-accounts.ts` | TanStack Query mutation |
| `useDeleteAccount` | `lib/hooks/use-accounts.ts` | TanStack Query mutation |
| `useAccountCoverage(id)` | `lib/hooks/use-account-coverage.ts` | TanStack Query |
| `useAccountSpending(id)` | `lib/hooks/use-account-spending.ts` | TanStack Query |
| `account.ts` Zod schema | `lib/validations/account.ts` | zod discriminatedUnion |

### Modified Components (surgical changes, no rewrites)

| Component | File | Specific Change |
|-----------|------|----------------|
| `AppSidebar` | `components/layout/app-sidebar.tsx` | Split flat nav array into 3 named section arrays; add Accounts, Schema, Help items; change SidebarGroup structure |
| `TransactionFilters` | `components/transactions/transaction-filters.tsx` | Add `paymentType` ToggleGroup UI; hide `tagStatus` dropdown when paymentType is not "all" |
| `TransactionBrowser` | `components/transactions/transaction-browser.tsx` | Accept `accountId?: string` prop; pass both `paymentType` and `accountId` through to `useTransactions` |
| `useTransactions` | `lib/hooks/use-transactions.ts` | Accept `paymentType?: string` and `accountId?: string` in filter params object |
| `TransactionFilters type` | `types/transaction.ts` | Add `paymentType?: 'all' \| 'recurring' \| 'subscriptions'` field |
| `/api/transactions route.ts` | `app/api/transactions/route.ts` | Read `paymentType` param; translate to tagStatus conditions; read optional `accountId` param; join statements to filter |
| `schema.ts` | `lib/db/schema.ts` | Add `accountTypeEnum`; add `financialAccounts` table; add `accountId` FK to `statements`; add relations |

### Untouched Components (zero changes needed)

| Component | Why Untouched |
|-----------|---------------|
| `CoverageGrid` | Accepts `sources[]` + `months[]` props; account coverage API returns same shape |
| `VaultPage`, `FileCabinetView`, `TimelineView`, `CoverageView` | Vault remains unchanged; sourceType-based display still valid |
| `SourceDashboard`, `SourceList` | Sources page stays as-is; accounts page is a separate new page |
| All subscription components | Subscriptions unaffected by account structure |
| All billing and Stripe components | Billing untouched |
| All auth components | Auth untouched |
| All analytics and forecast components | Analytics untouched |
| All admin components | Admin untouched |
| All cron and email components | Background jobs untouched |
| `DashboardHeader` | Used by new pages but requires no changes |
| `SidebarProvider`, `SidebarInset` | Dashboard layout unchanged |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolith fine; all queries userId-scoped; no changes needed |
| 1k-10k users | Indexes on `financial_accounts(userId)` already planned; account-scoped queries are efficient with FK + index |
| 100k+ users | Account coverage aggregation (JOIN statements WHERE accountId = X + GROUP BY) may need a materialized view; use the existing analytics MV pattern |

### Scaling Priorities

**First bottleneck:** Account coverage query aggregates statement counts per sourceType, filtered to an account. With hundreds of statements per account this is a GROUP BY on a filtered set — fast at current scale, may need MV if latency exceeds 500ms. Do not pre-optimize.

**Second bottleneck:** The source-to-account migration banner needs to know which `sourceType` values have no linked account. This is a `SELECT DISTINCT sourceType FROM statements WHERE accountId IS NULL` — stays fast even at 10k+ users with an index on `accountId`.

## Anti-Patterns

### Anti-Pattern 1: Rebuilding the Transaction Browser for Account Detail

**What people do:** Create `AccountTransactionBrowser` that duplicates the virtualized table, keyset pagination, debounced search, and mobile/desktop layout from `TransactionBrowser`.

**Why it's wrong:** `TransactionBrowser` is ~275 lines with careful performance tuning (keyset cursor, `useVirtualizer`-style rendering, debounced search, `useRef` for selection state). Duplicating it means two sets of bugs and two places to maintain.

**Do this instead:** Accept `accountId?: string` on the existing `TransactionBrowser`. Pass it to `useTransactions`, which appends `&accountId=[id]` to the API call. The API adds `AND statements.accountId = [id]` to the WHERE clause. Zero duplication.

### Anti-Pattern 2: Storing Account Type Fields in JSONB

**What people do:** Use `metadata jsonb` column to store type-specific fields.

**Why it's wrong:** Loses type safety, no column-level indexing, Drizzle loses its value with opaque JSON blobs, and querying becomes error-prone (e.g., `metadata->>'creditLimit'` vs typed column access).

**Do this instead:** Nullable typed columns for each type-specific field. Most accounts have 0-3 extra fields. The schema overhead is minimal; the queryability and type safety gains are significant.

### Anti-Pattern 3: Auto-Migrating sourceType Strings to Accounts in DB Migration

**What people do:** Write a migration script that automatically creates a `financial_account` row for each distinct `sourceType` in `statements`.

**Why it's wrong:** Account `type` (bank vs credit card vs loan), `institution`, and other metadata are unknown at migration time. Auto-created accounts would have `type = NULL` and empty metadata, requiring user correction anyway. This wastes a migration on incomplete data.

**Do this instead:** Migration only adds schema (the new table + nullable FK column). Source migration is user-driven via the UI. Users create accounts with the correct type and optionally link their existing sources.

### Anti-Pattern 4: Making the Schema Viewer Query the Live Database

**What people do:** Query `information_schema.columns` to display the schema dynamically.

**Why it's wrong:** The TypeScript schema definition (`schema.ts`) is the source of truth, not the Postgres catalog. `information_schema` adds latency, requires explicit permissions, returns raw Postgres type names, and cannot include application-level descriptions or intent.

**Do this instead:** A Server Component rendering a static metadata object. No DB query needed.

### Anti-Pattern 5: Adding a New DB Column for Payment Type

**What people do:** Add `paymentType enum` column to `transactions` table to enable the filter.

**Why it's wrong:** The existing `tagStatus` enum already encodes the necessary signal. `potential_subscription` and `converted` are the "recurring" transactions. Adding a parallel column creates redundancy and a synchronization requirement whenever tagStatus changes.

**Do this instead:** Map `paymentType` filter values to `tagStatus` conditions at the API layer. The `transactions` table stays unchanged.

### Anti-Pattern 6: Making Help Page a Database-Driven CMS

**What people do:** Create a `help_articles` table and an admin UI to manage FAQ content.

**Why it's wrong:** For a small, infrequently-changing FAQ page, a CMS adds enormous complexity (admin UI, content model, API endpoints, caching) with minimal benefit. Content changes require deployment anyway since they affect page structure.

**Do this instead:** Static JSX or MDX in `help/page.tsx`. Content changes go through the same deployment process as any feature change. Upgrade to a CMS only if the help content becomes a high-frequency update concern.

## Build Order

Dependencies between features determine safe build order.

**Phase 1 — Database foundation (blocks all account work):**
1. Add `accountTypeEnum` to schema
2. Add `financialAccounts` table to schema
3. Add nullable `accountId` FK to `statements` table
4. Add Drizzle relations for `financialAccounts` and updated `statements`
5. Generate migration (migration 0011): `npm run db:generate && npm run db:migrate`

**Phase 2 — Account CRUD (blocks account detail page):**
6. `lib/validations/account.ts` — Zod discriminated union schema
7. `app/api/accounts/route.ts` — GET list + POST create (with optional source linking)
8. `app/api/accounts/[id]/route.ts` — GET detail + PATCH update + DELETE
9. `lib/hooks/use-accounts.ts` — `useAccounts`, `useAccount`, `useCreateAccount`, `useUpdateAccount`, `useDeleteAccount`
10. `components/accounts/account-form.tsx` — type switcher + conditional fields
11. `components/accounts/account-type-badge.tsx` and `account-card.tsx`
12. `components/accounts/account-list.tsx` — grid with empty state
13. `app/(dashboard)/accounts/page.tsx` — account list page

**Phase 3 — Account detail page (needs CRUD + existing CoverageGrid):**
14. `app/api/accounts/[id]/coverage/route.ts` — adapt coverage query from `/api/sources`
15. `app/api/accounts/[id]/transactions/route.ts` — adapt from `/api/transactions` + accountId WHERE
16. `app/api/accounts/[id]/spending/route.ts` — simple SUM + currency normalization
17. `lib/hooks/use-account-coverage.ts` and `use-account-spending.ts`
18. `components/accounts/account-detail-tabs.tsx` — assemble CoverageGrid + TransactionBrowser + SpendingSummary
19. `app/(dashboard)/accounts/[id]/page.tsx`
20. `components/accounts/source-migration-banner.tsx` — add to `/accounts` page

**Phase 4 — Nav restructure (can overlap with Phase 2-3, cleaner to do after new pages exist):**
21. Modify `AppSidebar` with three named section groups
22. Add Accounts, Schema, Help to appropriate sections
23. Verify all existing nav links still resolve

**Phase 5 — Payment Type Selector (fully isolated):**
24. Add `paymentType` to `TransactionFilters` type in `types/transaction.ts`
25. Modify `TransactionFilters` component with ToggleGroup UI
26. Modify `useTransactions` to pass `paymentType` as query param
27. Modify `/api/transactions/route.ts` to translate `paymentType` to tagStatus conditions

**Phase 6 — Static pages (zero dependencies, do last if time-pressured):**
28. `app/(dashboard)/help/page.tsx` — FAQ content
29. `components/schema/` — `SchemaViewer` + `TableCard`
30. `app/(dashboard)/schema/page.tsx`

**Rationale for this order:**
- Schema change first because the entire account feature depends on the new table existing
- Account CRUD before account detail (detail page needs account data to display)
- Nav restructure deferred because existing pages work fine with the old nav during development
- Payment type filter is fully isolated from account work — can be done in parallel with Phase 2-3
- Static pages last because they have zero dependencies and are the lowest risk if time runs short

## Integration Points: External Boundaries

| Boundary | Communication Pattern | Notes |
|----------|-----------------------|-------|
| `AppSidebar` → new pages | Next.js `Link` hrefs to `/accounts`, `/schema`, `/help` | No special handling needed |
| `AccountDetailPage` → `CoverageGrid` | Props: `sources: CoverageSource[]`, `months: string[]` | Zero changes to CoverageGrid |
| `AccountDetailPage` → `TransactionBrowser` | Prop: `accountId?: string` | Browser scopes its query when accountId is present |
| `accounts` API → `statements` table | SQL: `accountId FK` set during source linking | Account create optionally runs UPDATE statements |
| Source migration → `useSources` cache | Mutation invalidates `["sources"]` | SourceDashboard reflects link status automatically |
| `CoverageGrid` click → historical upload | Existing `HistoricalUploadModal` pattern | CoverageGrid's `onCellClick` unchanged |

## Sources

Direct codebase analysis (HIGH confidence — all patterns from existing files):
- `src/components/layout/app-sidebar.tsx` — current nav structure, SidebarGroup composition
- `src/lib/db/schema.ts` — complete database schema (13 tables), enum patterns
- `src/app/api/transactions/route.ts` — keyset pagination, filter translation, tagStatus conditions
- `src/app/api/sources/route.ts` — coverage aggregation query pattern to adapt
- `src/components/transactions/transaction-browser.tsx` — existing browser architecture (275 lines)
- `src/components/transactions/transaction-filters.tsx` — existing filter bar, prop interface
- `src/components/vault/coverage-grid.tsx` — existing component, props interface to reuse
- `src/components/vault/vault-page.tsx` — tab pattern for multi-view pages
- `src/lib/hooks/use-sources.ts` — TanStack Query hook pattern (canonical example)
- `src/types/transaction.ts` — existing `TransactionFilters` type to extend
- `src/types/source.ts` — existing `SourceCoverage` type (reused for account coverage)
- `src/lib/features/config.ts` — feature gating system (unchanged for v3.0)
- `.planning/codebase/ARCHITECTURE.md` — prior architecture analysis (2026-01-24)
- `.planning/phases/06-statement-source-tracking/06-RESEARCH.md` — sourceType history

---
*Architecture research for: v3.0 Navigation & Account Vault — Subscription Manager*
*Researched: 2026-02-22*
