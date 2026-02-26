# Phase 38: Account Detail Pages - Research

**Researched:** 2026-02-26
**Domain:** Next.js App Router dynamic routes, React tab composition, cross-tab state coordination
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page layout & navigation**
- Click AccountCard on the accounts list page to navigate to /accounts/[id]
- Horizontal tab bar below the header: Details | Coverage | Transactions | Spending
- One section visible at a time (tab-based, not stacked or sub-routed)
- Page header shows account name as title, subtitle with type badge, institution, and key stat (credit limit for CC, interest rate for loan)
- Edit and Delete actions accessible from the header
- Back button navigates to accounts list

**Details tab**
- Inline editable form (not modal) with all account fields displayed directly on the page
- Linked source section showing source name and statement count
- Save button at bottom of form
- Type field remains locked (consistent with Phase 37 modal behavior)

**Coverage tab**
- Reuse existing CoverageGrid component from Phase 34, filtered to the single source linked to this account
- When no source is linked: empty state with CTA to link a source (opens edit form to source dropdown)
- Gap cells link to the historical upload wizard (Phase 34), pre-filtered to this source
- Clicking a cell with data switches to the Transactions tab, pre-filtered to that month's date range

**Transaction browser**
- Reuse existing virtualized TransactionBrowser component with keyset pagination, pre-filtered to statements linked to this account
- All existing filters work on top: search, date range, tag status
- Full actions available: inline tagging, bulk tagging, one-click subscription conversion
- Month filter from coverage cell click populates the existing date range filter (user can clear it)
- Count summary banner above the list: "X transactions · Y tagged · Z subscriptions"

**Spending summary**
- Three stat cards: Total Spent (all time), Monthly Average, Top Merchant (by spend)
- Monthly bar chart (Recharts) showing total spending per month for this account
- No merchant breakdown list — stat cards and chart are sufficient
- Empty state when no transactions: "No spending data yet. Link a source and import statements to see spending for this account."

### Claude's Discretion
- Loading skeleton layout for each tab
- Exact spacing and responsive behavior
- Error state handling per tab
- Chart color scheme and axis formatting
- How stat cards compute "Top Merchant" when tied

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DETAIL-01 | User can view account details and edit from the account's own page | Inline form pattern using existing AccountForm fields without Dialog wrapper; existing PATCH /api/accounts/[id] handles saves |
| DETAIL-02 | User can view coverage grid scoped to the account's linked statements | Existing CoverageGrid accepts `sources: CoverageSource[]` prop — pass single-source array filtered to account's linkedSourceType; new GET /api/accounts/[id]/coverage endpoint needed |
| DETAIL-03 | User can browse transactions from the account's linked statements | TransactionBrowser needs `accountId` prop to pre-filter; transactions API needs `accountId` query param to join statements.account_id; cross-tab navigation via lifted state |
| DETAIL-04 | User can view spending summary (total spent, top merchants, monthly breakdown) for the account | New GET /api/accounts/[id]/spending endpoint; new AccountSpendingView component; Recharts BarChart (not yet used in project) for monthly breakdown |
</phase_requirements>

---

## Summary

Phase 38 is a composition phase — it assembles existing infrastructure into a per-account detail page with four tabs. No new data models are required. The primary technical work is: (1) creating the `/accounts/[id]` dynamic route with a tab-based shell; (2) adapting existing components (`CoverageGrid`, `TransactionBrowser`, `AccountForm`) to accept account-scoped props rather than fetching globally; and (3) adding two new API endpoints for account-scoped coverage and spending data.

The most significant engineering challenge is the cross-tab navigation: when a user clicks a coverage cell, the page must switch to the Transactions tab and pre-populate the date range filter. This requires state to be lifted to the page-level component that owns both the active tab and the transaction filter state. The `TransactionBrowser` currently owns all its filter state internally — it needs a `defaultFilters` or controlled `filters` prop added to support external pre-population from coverage cell clicks.

The spending tab introduces a `BarChart` from Recharts, which is not yet used in the project (existing charts use `AreaChart`, `LineChart`, `PieChart`). The pattern is identical to `SpendingTrendChart` (`spending-trend-chart.tsx`) but with a `BarChart` instead of `AreaChart`. The API endpoint must aggregate `transactions.amount` grouped by month and merchant, joining through `statements.account_id`.

**Primary recommendation:** Build a thin page shell (`AccountDetailPage`) that owns `activeTab` + `transactionFilters` state, passes them down to tab content components, and exposes a `navigateToTransactions(dateFrom, dateTo)` handler to coverage tab for cross-tab navigation.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (in use) | Dynamic route `/accounts/[id]/page.tsx` with `params` | Already in project; server component for page, client component for interactive shell |
| React | 19 (in use) | Tab state, cross-tab navigation coordination | Already in project |
| shadcn/ui Tabs | In use | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` — used by VaultPage and AccountList | Already in use; consistent pattern |
| TanStack Query | In use | `useQuery` for account detail and spending data | Already the project's data-fetching standard |
| Recharts | In use | `BarChart`, `Bar`, `XAxis`, `YAxis`, `ResponsiveContainer`, `Tooltip` | Already installed; BarChart not yet used but same API surface as existing charts |
| React Hook Form + Zod | In use | Inline details form (same schema as AccountForm modal) | Already in use for AccountForm |
| Drizzle ORM | In use | New spending aggregate query via `sql` template | Already in project; used for complex aggregates in analytics |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | In use | Month label formatting for coverage and spending chart | Already used in CoverageGrid and coverage API |
| sonner | In use | Toast notifications for save/delete success | Already used project-wide |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Lifted filter state in page shell | nuqs URL-persisted filter state | nuqs is in project (v2.8.8) but CONTEXT.md doesn't specify URL-persisted filters for account detail — keep simple React state; cross-tab navigation is one-way (coverage → transactions) |
| BarChart for spending | AreaChart (already in SpendingTrendChart) | BarChart is more appropriate for discrete monthly totals; AreaChart implies continuous trend; decision locked by CONTEXT.md ("bar chart") |

**Installation:** No new packages needed. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(dashboard)/accounts/
│   ├── page.tsx                    # Existing accounts list page (UNCHANGED)
│   └── [id]/
│       └── page.tsx                # NEW: Account detail page (server component wrapper)
├── components/accounts/
│   ├── account-detail-page.tsx     # NEW: Client component — tab shell with state
│   ├── account-detail-header.tsx   # NEW: Header with name, type badge, edit/delete actions
│   ├── account-details-tab.tsx     # NEW: Inline edit form (no Dialog wrapper)
│   ├── account-coverage-tab.tsx    # NEW: CoverageGrid scoped to account's source
│   ├── account-transactions-tab.tsx # NEW: TransactionBrowser + count summary banner
│   ├── account-spending-tab.tsx    # NEW: 3 stat cards + monthly bar chart
│   ├── account-spending-chart.tsx  # NEW: Recharts BarChart wrapper
│   ├── account-card.tsx            # MODIFY: add onClick → router.push(`/accounts/${id}`)
│   ├── account-form.tsx            # REUSE as-is for header edit/delete modal (keeps existing Dialog)
│   ├── account-delete-dialog.tsx   # REUSE as-is
│   ├── account-list.tsx            # UNCHANGED
│   └── index.ts                    # EXTEND: export new components
├── lib/hooks/
│   ├── use-accounts.ts             # EXTEND: add useAccount(id) single-record hook
│   ├── use-account-coverage.ts     # NEW: GET /api/accounts/[id]/coverage
│   ├── use-account-spending.ts     # NEW: GET /api/accounts/[id]/spending
│   └── use-transactions.ts         # EXTEND: add accountId filter param support
└── app/api/accounts/[id]/
    ├── route.ts                    # EXISTING: GET/PATCH/DELETE
    ├── coverage/
    │   └── route.ts                # NEW: account-scoped coverage data
    └── spending/
        └── route.ts                # NEW: aggregate spending stats + monthly breakdown
```

### Pattern 1: Dynamic Route Page Shell
**What:** Next.js App Router dynamic segment `/accounts/[id]` — thin server component wrapper that renders a client component shell.
**When to use:** When the page needs both server-rendered metadata (title uses account name if feasible) and client-side interactivity (tab state, form state).

```typescript
// src/app/(dashboard)/accounts/[id]/page.tsx (server component)
import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { AccountDetailPage } from "@/components/accounts/account-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Account Detail",
  description: "View and manage your financial account",
};

export default async function AccountDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <DashboardHeader
        title="data Vault"
        breadcrumbs={[
          { label: "data Vault", href: "/accounts" },
          { label: "Account" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
          <AccountDetailPage accountId={id} />
        </div>
      </main>
    </>
  );
}
```

Note: `params` is a Promise in Next.js 15+ App Router — must be awaited (`const { id } = await params`). The existing `/accounts/[id]/route.ts` already follows this pattern (`const { id } = await params`).

### Pattern 2: Page-Level State Coordination (Cross-Tab Navigation)
**What:** AccountDetailPage owns `activeTab` and `transactionFilters` state. CoverageTab calls a prop callback when a cell with data is clicked; the page switches to the Transactions tab and sets date filters.
**When to use:** When one tab must trigger navigation and state changes in another tab.

```typescript
// src/components/accounts/account-detail-page.tsx
"use client";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { TransactionFilters } from "@/types/transaction";

export function AccountDetailPage({ accountId }: { accountId: string }) {
  const [activeTab, setActiveTab] = useState("details");
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>({});

  function handleCoverageCellToTransactions(dateFrom: string, dateTo: string) {
    setTransactionFilters({ dateFrom, dateTo });
    setActiveTab("transactions");
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="coverage">Coverage</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="spending">Spending</TabsTrigger>
      </TabsList>
      <TabsContent value="coverage">
        <AccountCoverageTab
          accountId={accountId}
          onNavigateToTransactions={handleCoverageCellToTransactions}
        />
      </TabsContent>
      <TabsContent value="transactions">
        <AccountTransactionsTab
          accountId={accountId}
          initialFilters={transactionFilters}
          onFiltersChange={setTransactionFilters}
        />
      </TabsContent>
      {/* ... */}
    </Tabs>
  );
}
```

### Pattern 3: TransactionBrowser Extension for accountId Filtering
**What:** The existing `TransactionBrowser` owns all state internally. For account-scoped use, it needs to accept `initialFilters` and emit filter changes upward (for cross-tab pre-population).
**When to use:** External consumers need to pre-set or react to filter state.

The cleanest approach is to keep `TransactionBrowser` self-contained but add two new optional props:
- `initialFilters?: TransactionFilters` — sets the initial filter state when the component mounts
- `onFiltersChange?: (filters: TransactionFilters) => void` — notifies parent of filter changes

This avoids making the browser fully controlled (which would require the parent to handle all filter logic) while still supporting cross-tab pre-population. The `initialFilters` approach avoids prop-drilling entire filter state management up to the page shell.

**Simpler alternative:** Create a new `AccountTransactionBrowser` wrapper that wraps the existing component but adds a `key={JSON.stringify(initialFilters)}` to force re-mount when initial filters change from coverage click. This is simpler but causes a full re-mount (clearing loaded pages). Given the one-way navigation (coverage → transactions), this is acceptable.

### Pattern 4: Account-Scoped Coverage API
**What:** New `GET /api/accounts/[id]/coverage` endpoint that returns a single-source `CoverageResponse`. Uses the same shape as the existing `/api/vault/coverage` response so `CoverageGrid` can be reused unchanged.
**When to use:** Account page coverage tab.

```typescript
// GET /api/accounts/[id]/coverage
// Response: { sources: CoverageSource[], gapCount: number, months: string[] }
// Where sources has exactly 0 or 1 entries (the linked source for this account)
// If account has no linkedSourceType: return { sources: [], gapCount: 0, months: [...12 months] }
```

Query logic mirrors `/api/vault/coverage` but filters `WHERE statements.source_type = account.linked_source_type AND statements.user_id = userId`.

### Pattern 5: Account-Scoped Spending API
**What:** New `GET /api/accounts/[id]/spending` endpoint returning aggregate stats and monthly breakdown.
**When to use:** Account spending tab.

```typescript
// GET /api/accounts/[id]/spending
// Response shape:
interface AccountSpendingResponse {
  totalSpent: number;          // Sum of all positive transaction amounts
  monthlyAverage: number;      // totalSpent / number of months with any transactions
  topMerchant: string | null;  // Merchant with highest total spend; null if no transactions
  topMerchantAmount: number;   // Spend for topMerchant
  monthlyBreakdown: {
    month: string;             // "yyyy-MM" label
    amount: number;            // Total spent in that month
  }[];
}
```

DB query approach:
1. Fetch account to get `linkedSourceType`
2. If no `linkedSourceType`: return zero-state response
3. Join `transactions → statements` where `statements.account_id = accountId` (not sourceType — use the FK)
4. Use Drizzle `sql` template for `SUM(amount)`, `GROUP BY DATE_TRUNC('month', transaction_date)`, and merchant aggregation

### Pattern 6: Inline Edit Form (Details Tab)
**What:** The existing `AccountForm` component is a Dialog wrapper. For the Details tab, we need the same form fields without the Dialog. Extract the form body into a shared component or re-implement the fields inline.
**When to use:** Details tab needs an inline (not modal) form.

Best approach: Do NOT extract shared form body from `AccountForm` (that would risk breaking Phase 37 work). Instead, create `AccountDetailsTab` with its own `useForm` call using the same `createAccountFormSchema` and field structure, but rendered inline (no Dialog wrapper). The submit handler calls `useUpdateAccount()` as-is.

This matches the existing pattern: `AccountFormValues` interface, `z.coerce.number()` workaround with string fields, `form.reset()` on account data load, and the `interestRate` percentage display convention.

### Anti-Patterns to Avoid
- **Making TransactionBrowser fully controlled:** Lifting all filter state to the page shell makes the parent responsible for debouncing, pagination reset, etc. Use `initialFilters` prop with local state override instead.
- **Duplicating coverage API logic:** The `/api/accounts/[id]/coverage` endpoint should use the same cell-building logic as `/api/vault/coverage` — extract a shared utility function or simply filter by account's `linkedSourceType` using the same algorithm.
- **Fetching all transactions client-side for spending stats:** Compute spending aggregates server-side in the `/api/accounts/[id]/spending` endpoint using SQL SUM/GROUP BY. Never pull all transactions to the client just to sum them.
- **accountType === "bank_debit" shows interest rate field:** The inline form must hide credit-limit field for non-CC and hide interest-rate/loan-term for non-loan accounts — same conditional rendering as `AccountForm`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab component | Custom tab implementation | `shadcn/ui Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`) | Already used by VaultPage and AccountList; consistent behavior |
| Coverage grid | New grid component | Existing `CoverageGrid` component with `sources` prop filtered to single source | Grid is complete and tested; just pass a single-item `sources` array |
| Transaction pagination/virtualization | New transaction list | Existing `TransactionBrowser` with new `initialFilters` prop | All keyset pagination, infinite scroll, and bulk actions are already implemented |
| Form state management | Custom form state | React Hook Form + same `createAccountFormSchema` as AccountForm | Already validated and working; same interestRate display convention |
| Monthly bar chart | D3 custom chart | Recharts `BarChart` + `Bar` — same pattern as `SpendingTrendChart` but BarChart variant | Already installed; `SpendingTrendChart` shows the exact axis/tooltip pattern to follow |
| Spending aggregation | Client-side sum | Server-side `SUM(amount) GROUP BY DATE_TRUNC('month', ...)` in new API endpoint | Performance; all transaction amounts for an account could be thousands of rows |

---

## Common Pitfalls

### Pitfall 1: `params` Is a Promise in Next.js 15+
**What goes wrong:** Accessing `params.id` directly (without `await`) in a server component throws or returns undefined.
**Why it happens:** App Router changed `params` to return a Promise in Next.js 15. Existing route handlers in this project already use `await params`.
**How to avoid:** `const { id } = await params;` in the page server component. The existing `/api/accounts/[id]/route.ts` already demonstrates this pattern.
**Warning signs:** `id` is undefined; TypeScript type shows `Promise<{ id: string }>`.

### Pitfall 2: CoverageGrid Expects Exactly 12-Month Array
**What goes wrong:** Passing a partial months array or wrong-length `sources.cells` array causes visual breakage in the grid.
**Why it happens:** `CoverageGrid` assumes `sources[n].cells.length === months.length` and `months.length === 12`.
**How to avoid:** The `/api/accounts/[id]/coverage` endpoint must produce the same 12-month window as `/api/vault/coverage` — use the same `startOfMonth(subMonths(now, 11))` calculation and fill missing cells with `state: "missing"`.
**Warning signs:** Grid renders with misaligned columns or empty rows.

### Pitfall 3: TransactionBrowser `initialFilters` Not Resetting Loaded Pages
**What goes wrong:** When coverage click pre-populates date filters and switches to Transactions tab, the `useInfiniteQuery` cache for the old filter set is returned immediately, showing stale data briefly.
**Why it happens:** TanStack Query caches by query key. Filter change creates a new query key, which may show stale cache briefly before refetch.
**How to avoid:** This is normal TanStack Query behavior (staleTime-controlled). `staleTime` for transactions is not set (defaults to 0), so the new query fetches immediately. No special handling needed; brief loading skeleton is correct UX.

### Pitfall 4: Spending API — amount Is a Decimal String
**What goes wrong:** Drizzle returns `decimal` columns as strings (e.g., `"45.99"`). Summing without parsing produces string concatenation.
**Why it happens:** PostgreSQL `numeric`/`decimal` is returned as string by pg driver to avoid float precision loss. Drizzle does not auto-coerce.
**How to avoid:** Use Drizzle's `sql<number>` template for aggregates: `sql<number>\`SUM(${transactions.amount}::numeric)\`` or `parseFloat(result.total)` after query.
**Warning signs:** `totalSpent` is `NaN` or a very large number formed from string concatenation.

### Pitfall 5: AccountCard Needs onClick Without Breaking Existing Modal Pattern
**What goes wrong:** Adding `onClick` to `AccountCard` for navigation conflicts with the Edit/Delete dropdown, which also uses onClick.
**Why it happens:** If the entire card is clickable, clicking the DropdownMenuTrigger also fires the card click.
**How to avoid:** Make only the non-interactive portions of the card clickable (wrap the icon + name section in a `<button>` or `<Link>`, not the entire card). The DropdownMenu stays as its own interaction zone. Or: add a `cursor-pointer` class and attach `onClick` only to the card's left content area.

### Pitfall 6: interestRate Display Convention on Details Tab Form
**What goes wrong:** The DB stores `interestRate` as `0.0499` (decimal). If the inline form displays this raw value instead of `4.99`, the user sees wrong data.
**Why it happens:** The `AccountForm` modal manually converts: `String(parseFloat(account.interestRate) * 100)`. The same conversion must be applied in the inline form's `form.reset()` call.
**How to avoid:** Copy the exact reset logic from `AccountForm.useEffect`: `interestRate: account.interestRate != null ? String(parseFloat(account.interestRate) * 100) : ""`.
**Warning signs:** Interest rate shows as `0.0499` instead of `4.99`.

---

## Code Examples

### Account-Scoped Spending Aggregate Query
```typescript
// Source: Drizzle ORM sql template pattern (used in existing /api/transactions/route.ts line 131)
import { sql, eq, and } from "drizzle-orm";
import { transactions, statements } from "@/lib/db/schema";
import { format } from "date-fns";

// Get monthly spending breakdown for account
const monthlyRows = await db
  .select({
    month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${transactions.transactionDate}), 'YYYY-MM')`,
    total: sql<string>`SUM(${transactions.amount}::numeric)`,
  })
  .from(transactions)
  .innerJoin(statements, eq(transactions.statementId, statements.id))
  .where(
    and(
      eq(transactions.userId, userId),
      eq(statements.accountId, accountId)
    )
  )
  .groupBy(sql`DATE_TRUNC('month', ${transactions.transactionDate})`)
  .orderBy(sql`DATE_TRUNC('month', ${transactions.transactionDate}) ASC`);

// Top merchant by total spend
const merchantRows = await db
  .select({
    merchantName: transactions.merchantName,
    total: sql<string>`SUM(${transactions.amount}::numeric)`,
  })
  .from(transactions)
  .innerJoin(statements, eq(transactions.statementId, statements.id))
  .where(and(eq(transactions.userId, userId), eq(statements.accountId, accountId)))
  .groupBy(transactions.merchantName)
  .orderBy(sql`SUM(${transactions.amount}::numeric) DESC`)
  .limit(1);

// Note: parseFloat(row.total) to convert decimal string to number
```

### Account Coverage Hook
```typescript
// src/lib/hooks/use-account-coverage.ts
import { useQuery } from "@tanstack/react-query";
import type { CoverageResponse } from "@/lib/hooks/use-vault-coverage";

export const accountCoverageKeys = {
  coverage: (accountId: string) => ["accounts", accountId, "coverage"] as const,
};

export function useAccountCoverage(accountId: string) {
  return useQuery({
    queryKey: accountCoverageKeys.coverage(accountId),
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/coverage`);
      if (!res.ok) throw new Error("Failed to fetch account coverage");
      return res.json() as Promise<CoverageResponse>;
    },
    staleTime: 2 * 60 * 1000, // match vault coverage staleTime
  });
}
```

### AccountCard with Navigation
```typescript
// Modify account-card.tsx to add navigation
// Wrap the left content section (icon + info) in a clickable element
import { useRouter } from "next/navigation";

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const router = useRouter();

  return (
    <div className="rounded-xl border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Left: navigates to detail page */}
        <button
          className="flex items-start gap-3 min-w-0 flex-1 text-left"
          onClick={() => router.push(`/accounts/${account.id}`)}
        >
          {/* ... existing icon + info JSX ... */}
        </button>

        {/* Right: action menu stays separate — no click propagation issue */}
        <DropdownMenu>
          {/* ... unchanged ... */}
        </DropdownMenu>
      </div>
    </div>
  );
}
```

### Recharts BarChart for Monthly Spending
```typescript
// src/components/accounts/account-spending-chart.tsx
// Pattern mirrors SpendingTrendChart but uses BarChart
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlySpend { month: string; amount: number; }

export function AccountSpendingChart({ data }: { data: MonthlySpend[] }) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
      minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  return (
    <Card>
      <CardHeader><CardTitle>Monthly Spending</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12}
              tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12}
              tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
            <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Spent"]}
              contentStyle={{ backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
              labelStyle={{ color: "hsl(var(--foreground))" }} />
            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Count Summary Banner (Transactions Tab)
```typescript
// Compute summary counts from loaded transactions
const taggedCount = allTransactions.filter(
  (t) => t.tagStatus !== "unreviewed"
).length;
const subscriptionCount = allTransactions.filter(
  (t) => t.tagStatus === "converted"
).length;

// Banner JSX
<div className="text-sm text-muted-foreground mb-3">
  {allTransactions.length} transactions · {taggedCount} tagged · {subscriptionCount} subscriptions
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params.id` direct access | `const { id } = await params` | Next.js 15 (project uses v16) | Must await params in server components and API route handlers |
| Global coverage fetch | Account-scoped coverage endpoint | Phase 38 (new) | Pass single-source array to CoverageGrid; reuses existing component |
| TransactionBrowser self-contained | TransactionBrowser + initialFilters prop | Phase 38 (new) | Enables cross-tab pre-population from coverage cell clicks |

**Deprecated/outdated:**
- None relevant to this phase.

---

## Open Questions

1. **Single account fetch hook (`useAccount(id)`)**
   - What we know: `use-accounts.ts` has `accountKeys.detail(id)` in the key factory but no `useAccount(id)` query hook — only `useAccounts()` (list). The PATCH mutation uses `setQueryData(accountKeys.detail(id), ...)` but nothing reads from it currently.
   - What's unclear: Should the detail page load the account via the list hook (`useAccounts()` then find by id) or a new `useAccount(id)` hook hitting `GET /api/accounts/[id]`?
   - Recommendation: Add a `useAccount(id: string)` hook that calls `GET /api/accounts/[id]`. The endpoint already exists. This is more correct — it fetches only the needed record rather than pulling the full list, and it populates the `accountKeys.detail(id)` cache key that `useUpdateAccount` already writes to.

2. **Coverage tab: empty state CTA behavior**
   - What we know: When no source is linked, CONTEXT.md says "CTA to link a source (opens edit form to source dropdown)". The details tab has an inline edit form (not a modal). The coverage tab CTA would need to navigate back to the Details tab and focus/highlight the source dropdown.
   - What's unclear: How to "focus" or scroll to a specific field in the Details tab inline form from the Coverage tab.
   - Recommendation: CTA button in coverage tab calls `setActiveTab("details")` (via callback prop from page shell). The details tab can optionally accept a `focusField` prop, but for simplicity a scroll-into-view after tab switch is sufficient. Or simply: the CTA text says "Go to Details to link a source" and switches the tab, with no field pre-focus. Simpler to implement and clear enough for users.

3. **Transaction count accuracy for summary banner**
   - What we know: `TransactionBrowser` uses infinite scroll with keyset pagination — `allTransactions` reflects only loaded pages, not the total DB count.
   - What's unclear: Should the summary banner show loaded counts ("50 of X transactions") or trigger a separate count query?
   - Recommendation: Show loaded counts only (no separate count query). The banner text can be: "Showing X transactions · Y tagged · Z subscriptions" — making it clear these reflect loaded data, not total. This avoids an extra API round-trip and is consistent with current TransactionBrowser behavior.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` (only `workflow.research: true`). Skipping this section.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/components/vault/coverage-grid.tsx` — CoverageGrid props interface, verified cell structure
- Codebase: `src/components/transactions/transaction-browser.tsx` — TransactionBrowser internals, filter state ownership
- Codebase: `src/app/api/accounts/[id]/route.ts` — existing PATCH/DELETE patterns, `await params` pattern
- Codebase: `src/app/api/vault/coverage/route.ts` — coverage query algorithm to replicate for account-scoped endpoint
- Codebase: `src/lib/db/schema.ts` — `financialAccounts`, `statements`, `transactions` table definitions and relationships
- Codebase: `src/lib/hooks/use-accounts.ts` — existing query key factory, mutation cache update patterns
- Codebase: `src/components/charts/spending-trend-chart.tsx` — Recharts chart pattern to follow for BarChart variant
- Codebase: `src/lib/hooks/use-vault-coverage.ts` — `CoverageResponse` type used by CoverageGrid

### Secondary (MEDIUM confidence)
- Codebase: `src/components/accounts/account-form.tsx` — interestRate display convention, form field structure for reuse

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; verified from source files
- Architecture: HIGH — all patterns directly derived from existing codebase analysis
- Pitfalls: HIGH — identified from actual code (decimal string issue in schema, await params in route.ts, interestRate convention in account-form.tsx)

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable stack)
