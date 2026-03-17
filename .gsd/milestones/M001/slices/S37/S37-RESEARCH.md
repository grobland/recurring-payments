# Phase 37: Account CRUD + List Page - Research

**Researched:** 2026-02-26
**Domain:** Full-stack CRUD feature — API routes, Zod validation, TanStack Query hooks, React Hook Form, shadcn/ui Dialog/AlertDialog, tabbed card grid
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Account Form Design**
- Modal dialog for both create and edit (not full page or inline)
- Single form with conditional type-specific fields
- Segmented control for type selection: Bank/Debit | Credit Card | Loan
- Selecting Credit Card reveals credit limit field; selecting Loan reveals interest rate + loan term fields
- Common fields always visible: account name, institution name
- Edit reuses the same modal with values pre-filled; type selector is disabled during edit (no type changes after creation)

**Account List Layout**
- Cards in a responsive grid on the Vault page
- Three type groups organized as tabs (Bank/Debit | Credit Cards | Loans)
- Each card shows: account name (primary), institution name (secondary), linked source name as badge
- "Add Account" button at top-right of the page header, always visible regardless of active tab
- Empty type tabs hidden entirely when no accounts of that type exist — or show per-type empty state (see below)

**Source-to-Account Linking**
- Dropdown field in the create/edit modal for selecting a source to link
- Linking is optional — accounts can exist without a linked source
- Source name displayed on the account card in the list view
- Unlinking a source only affects future imports; existing statements keep their account_id
- Whether already-linked sources appear in the dropdown: Claude's discretion (safest approach)

**Empty & Delete States**
- Global empty state: illustration + CTA with "Add your first account" button (consistent with existing app empty states)
- Per-type empty state: type-specific message (e.g., "No credit cards added yet") with add button that pre-selects the type in the form
- Delete via confirmation dialog warning about consequences (linked statements become unlinked)
- On deletion: statements keep all data intact, account_id set to NULL (no cascade, no data loss)

### Claude's Discretion
- Whether already-linked sources show in the dropdown (with indicator) or are hidden
- Card grid column count and responsive breakpoints
- Loading skeleton design for the account list
- Exact segmented control styling
- Form validation messaging patterns
- Tab count badges (whether to show account count per tab)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACCT-01 | User can create a financial account with name, type (Bank/Debit, Credit Card, or Loan), and institution name | POST /api/accounts with Zod-validated body; `financialAccounts` table already exists in DB |
| ACCT-02 | Loan accounts include type-specific fields: interest rate and loan term | Conditional Zod schema (`z.discriminatedUnion` or `.superRefine`); `interestRate` and `loanTermMonths` columns already exist on `financial_accounts` |
| ACCT-03 | Credit card accounts include type-specific field: credit limit | Conditional Zod schema; `creditLimit` column already exists on `financial_accounts` |
| ACCT-04 | User can edit a financial account's details | PATCH /api/accounts/[id]; edit modal reuses AccountForm with pre-filled values; type locked during edit |
| ACCT-05 | User can delete a financial account | DELETE /api/accounts/[id]; hard delete (schema uses `onDelete: "cascade"` from user, `onDelete: "set null"` on statements.account_id); AlertDialog confirmation |
| ACCT-06 | User can see all accounts on the data Vault page grouped by type (Bank/Debit, Credit Cards, Loans) | Accounts page (`/accounts`) with Tabs component; GET /api/accounts returns all accounts; client groups by `accountType` |
| ACCT-07 | User can link an existing statement source (sourceType string) to a financial account | Requires a new `linked_source_type` varchar column on `financial_accounts` (schema migration needed) OR storing link in statements; see Architecture Patterns section for resolution |
| ACCT-08 | Future PDF imports from a linked source are automatically assigned to the associated account | Batch upload route (`/api/batch/upload/route.ts`) must be modified to look up the linked account by `sourceType` and set `accountId` on insert |
</phase_requirements>

---

## Summary

Phase 37 is a complete, self-contained CRUD feature for financial accounts. The database foundation (Phase 35) is fully live: `financial_accounts` table, `account_type` enum, and `statements.account_id` nullable FK are all in Supabase PostgreSQL. TypeScript types (`FinancialAccount`, `NewFinancialAccount`, `AccountType`) are exported from `schema.ts`. Phase 37 builds the full stack on top of this foundation: API routes, Zod validation, TanStack Query hooks, and the React components.

The codebase has strong, consistent patterns to follow. The tags CRUD (`/api/tags`, `/api/tags/[id]`, `use-tags.ts`, `tag-delete-dialog.tsx`) is the closest analogue — a user-owned resource with GET/POST/PATCH/DELETE routes, a TanStack Query hook file with `useCreate*`, `useUpdate*`, `useDelete*` mutations, and an AlertDialog for delete confirmation. The subscription form (`subscription-form.tsx`) shows the project's React Hook Form + Zod + shadcn/ui Form component pattern.

The one architectural decision requiring clarity before planning: **source-to-account linking for ACCT-07/ACCT-08 requires a new `linked_source_type` varchar column on `financial_accounts`** that is not yet in the schema. This is a schema migration (0012) that must be part of Phase 37. Without it, there is no place to store "account X is linked to sourceType Y" and the batch upload cannot auto-assign accounts for future imports (ACCT-08). The column approach is confirmed by the fact that CONTEXT says "Source name displayed on the account card" — the card needs to know the linked source name from the account data, not by querying statements.

**Primary recommendation:** Follow the tags CRUD pattern for API + hooks. Use Dialog for create/edit form, AlertDialog for delete confirm. Add a `linked_source_type` varchar(100) nullable column via a new migration (0012) to support ACCT-07/ACCT-08. Update the batch upload route to auto-assign `accountId` on new statement inserts when a matching source link exists.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 (installed) | DB queries — `db.insert`, `db.update`, `db.delete`, `db.query.financialAccounts.findMany` | All API routes use this; established project pattern |
| zod | installed (via next/react-hook-form) | Schema validation for API request bodies and form data | All existing API routes use `schema.safeParse(body)`; all forms use `zodResolver` |
| react-hook-form | installed | Form state, validation, submission | All existing forms use `useForm` + `zodResolver` + `<Form>` shadcn components |
| @tanstack/react-query | installed | Server state management — `useQuery` + `useMutation` + `useQueryClient` | All data fetching uses TanStack Query; mutation pattern from `use-tags.ts` |
| sonner | installed | Toast notifications on mutation success/error | `toast.error` / `toast.success` — used in all hooks that mutate |
| @radix-ui/react-dialog | installed (via shadcn `dialog.tsx`) | Modal dialog for create/edit account form | shadcn Dialog is the installed component; used project-wide |
| @radix-ui/react-alert-dialog | installed (via shadcn `alert-dialog.tsx`) | Delete confirmation dialog | Same pattern as `tag-delete-dialog.tsx`, `category-delete-dialog.tsx` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hookform/resolvers | installed | `zodResolver` binding between React Hook Form and Zod | Every form in the project |
| next-auth | v5 (installed) | `auth()` server-side session in API routes | Security check on every API handler |
| isUserActive | internal helper | Trial/billing check before mutations | All write API routes check `isUserActive(session.user)` |
| lucide-react | installed | Icons (Building2, CreditCard, TrendingDown, etc.) | Account type icons, empty state icons |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tabs for type groups | Accordion or separate sections | Tabs is already used in VaultPage for the same visual pattern; consistent UX |
| Dropdown for source linking | Combobox search | Sources are typically < 10 per user; simple Select is sufficient; combobox adds complexity for no benefit at this scale |
| `z.discriminatedUnion` for type-specific fields | `.superRefine` with conditional checks | `superRefine` is simpler for a single-form-multiple-types scenario; discriminated union requires separate schema objects which adds complexity in a modal form where the type field is editable |

**Installation:** No new npm packages needed. All libraries already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── accounts/
│   │       └── page.tsx          # REPLACE stub with AccountsPage (client component wrapper)
│   └── api/
│       └── accounts/
│           ├── route.ts          # GET (list) + POST (create)
│           └── [id]/
│               └── route.ts      # GET (single) + PATCH (update) + DELETE
├── components/
│   └── accounts/
│       ├── account-form.tsx      # Modal form (create + edit, shared)
│       ├── account-card.tsx      # Card component for the grid
│       ├── account-list.tsx      # Tabbed grid with empty states
│       ├── account-delete-dialog.tsx  # AlertDialog confirmation
│       └── index.ts              # Barrel exports
├── lib/
│   ├── hooks/
│   │   └── use-accounts.ts       # useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount
│   └── validations/
│       └── account.ts            # Zod schemas for create/update + form variants
└── db/
    └── migrations/
        └── 0012_*.sql            # ADD: linked_source_type column on financial_accounts
```

### Pattern 1: Schema Migration for Source Linking (ACCT-07/ACCT-08)

**What:** Add `linked_source_type varchar(100)` to `financial_accounts` to store the one-to-one source link.
**When to use:** Required for ACCT-07 (display source name on card) and ACCT-08 (auto-assign future imports).

The `financial_accounts` table currently has NO column to record which `sourceType` string it is linked to. The `statements.account_id` FK only records the reverse direction (statement → account). To know "account X maps to sourceType Y", we need a field on the account.

```typescript
// src/lib/db/schema.ts — ADD inside financialAccounts table columns object
linkedSourceType: varchar("linked_source_type", { length: 100 }),
// No .notNull() — linking is optional (accounts can exist without a source)
```

Then run `npm run db:generate` → read SQL → `npm run db:migrate`.

**Impact on batch upload (ACCT-08):** After adding this column, modify `/api/batch/upload/route.ts` to look up a matching account on insert:

```typescript
// After validating sourceType, before creating the statement record:
const linkedAccount = await db.query.financialAccounts.findFirst({
  where: and(
    eq(financialAccounts.userId, session.user.id),
    eq(financialAccounts.linkedSourceType, sourceType.trim())
  ),
  columns: { id: true },
});

// Then in the insert values:
await db.insert(statements).values({
  userId: session.user.id,
  sourceType: sourceType.trim(),
  pdfHash: hash,
  // ...other fields...
  accountId: linkedAccount?.id ?? null,  // auto-assign if link exists
});
```

**Recommendation on already-linked sources in dropdown (Claude's Discretion):** Show all sources in the dropdown. If a source is already linked to another account, show it with a "(linked)" indicator. Do not hide it — hiding sources the user might recognize by name is more confusing than showing a clear label. An account can only have one linked source, but a source can only be linked to one account at a time (enforced by checking before save and showing a warning).

### Pattern 2: API Routes — Tags Pattern

**What:** REST API following the existing tags/subscriptions pattern exactly.
**When to use:** All CRUD operations on `financial_accounts`.

```typescript
// src/app/api/accounts/route.ts
// GET /api/accounts — list all accounts for the user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await db.query.financialAccounts.findMany({
    where: eq(financialAccounts.userId, session.user.id),
    orderBy: [asc(financialAccounts.accountType), asc(financialAccounts.name)],
  });

  return NextResponse.json({ accounts });
}

// POST /api/accounts — create account
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isUserActive(session.user)) return NextResponse.json({ error: "Trial expired" }, { status: 403 });

  const body = await request.json();
  const result = createAccountSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const [account] = await db.insert(financialAccounts).values({
    userId: session.user.id,
    ...result.data,
    updatedAt: new Date(),
  }).returning();

  // If linkedSourceType provided, bulk-update existing statements for this source
  if (result.data.linkedSourceType) {
    await db.update(statements)
      .set({ accountId: account.id })
      .where(and(
        eq(statements.userId, session.user.id),
        eq(statements.sourceType, result.data.linkedSourceType),
        isNull(statements.accountId)  // Only unlinked statements
      ));
  }

  return NextResponse.json({ account }, { status: 201 });
}
```

```typescript
// src/app/api/accounts/[id]/route.ts
// PATCH /api/accounts/[id]
// On linkedSourceType change: must invalidate ["accounts"], ["vault","coverage"], ["vault","timeline"], ["sources"], ["transactions"]
// (From STATE.md blocker note)

// DELETE /api/accounts/[id]
// Hard delete — statements.account_id becomes NULL via DB onDelete: "set null"
// No soft delete needed (per CONTEXT: "statements keep all data intact, account_id set to NULL")
await db.delete(financialAccounts).where(
  and(eq(financialAccounts.id, id), eq(financialAccounts.userId, session.user.id))
);
```

### Pattern 3: Zod Schema with Conditional Type-Specific Fields

**What:** Single form schema with `.superRefine` for type-dependent field requirements.
**When to use:** Account form where type field is present and type-specific fields are optional at DB level but required in UI.

```typescript
// src/lib/validations/account.ts
import { z } from "zod";

const accountTypeEnum = z.enum(["bank_debit", "credit_card", "loan"]);

export const createAccountFormSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  accountType: accountTypeEnum,
  institution: z.string().max(100).optional().nullable(),
  linkedSourceType: z.string().max(100).optional().nullable(),

  // Credit card only
  creditLimit: z.coerce.number().positive().optional().nullable(),

  // Loan only
  interestRate: z.coerce.number().min(0).max(100).optional().nullable(),
  loanTermMonths: z.coerce.number().int().positive().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.accountType === "credit_card" && !data.creditLimit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Credit limit is required for credit card accounts",
      path: ["creditLimit"],
    });
  }
  if (data.accountType === "loan") {
    if (!data.interestRate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interest rate is required for loan accounts", path: ["interestRate"] });
    }
    if (!data.loanTermMonths) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Loan term is required for loan accounts", path: ["loanTermMonths"] });
    }
  }
});

// API schema — same but with coercion
export const createAccountSchema = createAccountFormSchema; // Already has z.coerce on numeric fields
export const updateAccountSchema = createAccountFormSchema.partial().extend({
  accountType: accountTypeEnum.optional(), // Allowed in API for validation, ignored in update handler (type locked)
});

export type CreateAccountInput = z.infer<typeof createAccountFormSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
```

Note: The DB stores `interestRate` as `decimal(5,4)` representing a decimal fraction (0.0499 = 4.99%). The form should accept percentage input (0-100) and divide by 100 before storing. Alternatively, accept the decimal directly — pick one approach and document it. Simplest: accept percentage in form, convert in API handler.

### Pattern 4: TanStack Query Hook — use-accounts.ts

**What:** Standard hook file following the `use-tags.ts` pattern exactly.
**When to use:** All account data fetching and mutations.

```typescript
// src/lib/hooks/use-accounts.ts
export const accountKeys = {
  all: ["accounts"] as const,
  lists: () => [...accountKeys.all, "list"] as const,
  list: () => [...accountKeys.lists()] as const,
  details: () => [...accountKeys.all, "detail"] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
};

export function useAccounts() { /* useQuery on GET /api/accounts */ }
export function useCreateAccount() { /* useMutation + invalidate accounts list */ }
export function useUpdateAccount() {
  /* useMutation
   * On success: invalidate accounts list
   * If linkedSourceType changed: also invalidate ["vault","coverage"], ["vault","timeline"], ["sources"], ["transactions"]
   * (per STATE.md blocker — PATCH must invalidate five query keys)
   */
}
export function useDeleteAccount() { /* useMutation + remove from list */ }
```

### Pattern 5: Account Form Component with Conditional Fields

**What:** Modal form using shadcn Dialog + React Hook Form + watch() for conditional field rendering.
**When to use:** Create and edit — same component, different `defaultValues` and `submitLabel`.

```typescript
// src/components/accounts/account-form.tsx
"use client";

const form = useForm<CreateAccountInput>({
  resolver: zodResolver(createAccountFormSchema),
  defaultValues: { accountType: "bank_debit", name: "", institution: "", ... }
});

const accountType = form.watch("accountType");  // key: watch for conditional rendering

// Type selector — use radio-group styled as segmented control (shadcn RadioGroup with button-like styling)
// OR three Button components with variant toggling based on form.watch("accountType")
// Simplest approach: controlled via RadioGroup, styled with Tailwind grid

// Conditional fields:
{accountType === "credit_card" && (
  <FormField name="creditLimit" render={...} />
)}
{accountType === "loan" && (
  <>
    <FormField name="interestRate" render={...} />
    <FormField name="loanTermMonths" render={...} />
  </>
)}
```

**Edit mode:** Pass `defaultValues` from the existing account. Disable the accountType field:
```typescript
<RadioGroup disabled={isEditing} ...>
```

### Pattern 6: Account List Page with Tabs

**What:** Replace the stub `/accounts/page.tsx` with a full page using Tabs for type groups.
**When to use:** ACCT-06 — grouping accounts by type.

```typescript
// src/components/accounts/account-list.tsx
const { data } = useAccounts();
const accounts = data?.accounts ?? [];

const bankDebitAccounts = accounts.filter(a => a.accountType === "bank_debit");
const creditCardAccounts = accounts.filter(a => a.accountType === "credit_card");
const loanAccounts = accounts.filter(a => a.accountType === "loan");

// Global empty state (no accounts at all)
if (accounts.length === 0) return <AccountEmptyState onAddClick={() => setModalOpen(true)} />;

// Type tabs
<Tabs defaultValue="bank_debit">
  <TabsList>
    {bankDebitAccounts.length > 0 && <TabsTrigger value="bank_debit">Bank/Debit</TabsTrigger>}
    {creditCardAccounts.length > 0 && <TabsTrigger value="credit_card">Credit Cards</TabsTrigger>}
    {loanAccounts.length > 0 && <TabsTrigger value="loan">Loans</TabsTrigger>}
  </TabsList>
  <TabsContent value="bank_debit">
    {bankDebitAccounts.length === 0
      ? <TypeEmptyState type="bank_debit" onAdd={() => openModalWithType("bank_debit")} />
      : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{...cards}</div>
    }
  </TabsContent>
  {/* repeat for credit_card and loan */}
</Tabs>
```

**Tab visibility decision:** Per CONTEXT, "Empty type tabs hidden entirely when no accounts of that type exist — or show per-type empty state". Recommend: Show all three tabs always, but show a per-type empty state inside the tab content. This is cleaner than hiding tabs (avoids the tab defaultValue becoming invalid when the only tab with content changes).

### Pattern 7: Account Card Component

**What:** Card for the grid showing account name, institution, linked source badge.
**When to use:** Inside the tab content grids.

```typescript
// src/components/accounts/account-card.tsx
<div className="rounded-xl border p-4 hover:bg-muted/50 transition-colors">
  <div className="flex items-start justify-between">
    <div className="flex items-start gap-3">
      <AccountTypeIcon type={account.accountType} />  {/* Building2 | CreditCard | TrendingDown */}
      <div>
        <p className="font-semibold text-sm">{account.name}</p>
        {account.institution && (
          <p className="text-xs text-muted-foreground">{account.institution}</p>
        )}
        {account.linkedSourceType && (
          <Badge variant="secondary" className="mt-1 text-xs">{account.linkedSourceType}</Badge>
        )}
      </div>
    </div>
    <DropdownMenu>  {/* Edit / Delete actions */}
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onEdit(account)}>Edit</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(account)}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
```

Note: `DropdownMenu` is available in `src/components/ui/dropdown-menu.tsx`.

### Anti-Patterns to Avoid

- **Omitting `linkedSourceType` from schema:** ACCT-07/ACCT-08 cannot be implemented without storing the source link on the account. Do not try to infer it from `statements.account_id` — that is the wrong direction for the lookup required in batch upload.
- **Hiding already-linked sources from the dropdown:** Confusing — user may not know a source is already linked elsewhere. Show with "(linked)" indicator.
- **Allowing account type changes during edit:** CONTEXT explicitly locks type during edit. Disable the type selector, do not accept `accountType` changes in the PATCH handler.
- **Cascading statement deletion on account delete:** The DB schema uses `onDelete: "set null"` on `statements.account_id`. Do NOT hard-delete statements. The alert dialog text must explain this: "Statements from this account will remain but become unlinked."
- **Five query key invalidation on PATCH:** STATE.md explicitly notes PATCH `/api/accounts/[id]` must invalidate: `["accounts"]`, `["vault","coverage"]`, `["vault","timeline"]`, `["sources"]`, `["transactions"]`. Missing any of these will leave stale data in the vault views.
- **Skipping the `isUserActive` check:** Every write endpoint in the project calls `isUserActive(session.user)` before mutating. Account routes must follow this pattern.
- **Storing `interestRate` as percentage without converting:** The DB column is `decimal(5,4)` which stores 0.0499 for 4.99%. If the form shows percentage (e.g. "4.99"), divide by 100 before storing and multiply by 100 before displaying. Document the conversion once, use it consistently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialog | Custom CSS overlay | shadcn `Dialog` + `DialogContent` | Already installed; accessibility (focus trap, ESC key, aria attributes) handled by Radix UI |
| Delete confirmation | Custom confirm modal | shadcn `AlertDialog` | Same as tag-delete-dialog.tsx and category-delete-dialog.tsx — established project pattern |
| Form validation | Manual field checks | Zod + `zodResolver` + React Hook Form `<Form>` components | Consistent with every other form in the project; `FormMessage` handles error display |
| Server state / cache | useState + useEffect + fetch | TanStack Query `useQuery` + `useMutation` | Cache invalidation (5 query keys on PATCH) is non-trivial to manage manually |
| Segmented type control | Custom toggle buttons with useState | shadcn `Tabs` or styled `RadioGroup` | Both are installed; RadioGroup with `useController` is the cleanest approach inside React Hook Form |
| Toast notifications | Custom notification system | `sonner` toast | Already installed and configured globally; all hooks use `toast.error` / `toast.success` |

**Key insight:** The project has consistent patterns for every part of this feature (Dialog, AlertDialog, Form, TanStack Query). Deviating adds inconsistency without benefit.

---

## Common Pitfalls

### Pitfall 1: Missing `linked_source_type` Column — ACCT-07/ACCT-08 Blocked

**What goes wrong:** Building the entire CRUD without the schema migration, then realizing the batch upload route has no column to store the link, and the account card can't show the source name.

**Why it happens:** The Phase 35 schema was completed, so developers assume no migration is needed. But Phase 35 only added the `financial_accounts` table structure — source linking was planned as part of Phase 37.

**How to avoid:** Make the schema migration the FIRST task of Phase 37, before writing any API routes. The migration adds `linked_source_type varchar(100)` to `financial_accounts`. Apply `db:generate` + read SQL + `db:migrate` before proceeding.

**Warning signs:** If you find yourself trying to query `statements WHERE account_id IS NOT NULL GROUP BY source_type` to get the linked source name — you've hit this pitfall. That query would work but is slow and indirect.

### Pitfall 2: STATE.md Query Key Invalidation — Five Keys on PATCH

**What goes wrong:** After updating an account's linked source, the vault coverage grid, vault timeline, sources list, and transactions list show stale data because only `["accounts"]` was invalidated.

**Why it happens:** The `useUpdateAccount` mutation only invalidates the accounts query key, not the five keys listed in STATE.md.

**How to avoid:** In `useUpdateAccount`'s `onSuccess`:
```typescript
queryClient.invalidateQueries({ queryKey: ["accounts"] });
queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
queryClient.invalidateQueries({ queryKey: ["vault", "timeline"] });
queryClient.invalidateQueries({ queryKey: ["sources"] });
queryClient.invalidateQueries({ queryKey: ["transactions"] });
```

**Warning signs:** After editing an account's linked source, the vault page still shows the old source-to-account association.

### Pitfall 3: Source Already Linked to Another Account

**What goes wrong:** User links "Chase" to Account A, then tries to link "Chase" to Account B. Now two accounts claim the same source, and future imports are assigned to whichever account the lookup finds first.

**Why it happens:** No uniqueness constraint on `linked_source_type` in the schema (it's not defined as unique since one user might have two accounts that both relate to the same bank, just different products).

**How to avoid:** In the POST/PATCH handler, before saving `linkedSourceType`, check if another account already claims it:
```typescript
if (data.linkedSourceType) {
  const existingLink = await db.query.financialAccounts.findFirst({
    where: and(
      eq(financialAccounts.userId, session.user.id),
      eq(financialAccounts.linkedSourceType, data.linkedSourceType),
      notEq(financialAccounts.id, id)  // Exclude self on PATCH
    ),
  });
  if (existingLink) {
    return NextResponse.json({ error: `Source "${data.linkedSourceType}" is already linked to another account` }, { status: 409 });
  }
}
```

**Warning signs:** Multiple account cards showing the same source badge.

### Pitfall 4: `interestRate` Decimal Representation

**What goes wrong:** Form shows "4.99" (percentage). Developer stores 4.99 in the DB. DB column is `decimal(5,4)` — stores up to 9.9999 without overflow, so 4.99 fits. But the intent was 4.99% = 0.0499. Future display code divides by 100, showing 0.05%.

**Why it happens:** The column type (`precision: 5, scale: 4`) was designed to store 0.0499 = 4.99%, not 4.99. The Phase 35 research explicitly documents this.

**How to avoid:** Decide once: store as decimal fraction (0.0499) OR as percentage (4.99). The column definition (`precision: 5, scale: 4`) is designed for decimal fraction. Therefore:
- Form input: percentage (e.g. "4.99")
- On submit: divide by 100 before sending to API
- On display: multiply by 100 before showing to user
- Add a `%` suffix to the input field label

**Warning signs:** `decimal(5,4)` cannot store values ≥ 10 (max is 9.9999). If storing 4.99 (a percentage), the column would store 4.9900 which looks fine, but storing 12.5% would fail with `value 12.5 out of range for type numeric(5,4)`.

### Pitfall 5: Type Selector Disabled During Edit — Form Default Value

**What goes wrong:** Edit modal opens with account data, type selector is disabled. But if the form's `defaultValues.accountType` doesn't exactly match the account's `accountType`, the disabled control shows the wrong value.

**Why it happens:** Mismatched enum string values (e.g., account stores `"bank_debit"` but form defaults to `"Bank/Debit"` display label).

**How to avoid:** Pass the account's `accountType` directly as `defaultValues.accountType` — the DB enum values (`"bank_debit"`, `"credit_card"`, `"loan"`) are the form field values. Use display labels only in the UI, not as form values.

### Pitfall 6: Drizzle FK Bug #4147 — Read SQL Before Migrating

**What goes wrong:** `db:generate` creates the migration. Running `db:migrate` immediately without reading the SQL applies a corrupt migration.

**Why it happens:** Adding a column with a FK reference to an existing table in a single migration can generate incorrect SQL (Drizzle bug #4147, documented in STATE.md and Phase 35 research).

**How to avoid:** After `npm run db:generate`, open the generated `0012_*.sql` file. Verify the `ALTER TABLE "financial_accounts" ADD COLUMN "linked_source_type" varchar(100);` line is correct. The `linked_source_type` column has no FK — it's just a varchar — so the FK bug does not apply here. But the read-before-migrate habit is established project protocol.

---

## Code Examples

### Complete API Route Pattern (from existing tags [id] route)

```typescript
// Source: src/app/api/tags/[id]/route.ts (established project pattern)
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isUserActive(session.user)) return NextResponse.json({ error: "..." }, { status: 403 });

  const { id } = await params;  // params is a Promise in Next.js 15 / React 19
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const existing = await db.query.table.findFirst({
    where: and(eq(table.id, id), eq(table.userId, session.user.id)),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db.update(table).set(result.data).where(eq(table.id, id)).returning();
  return NextResponse.json({ account: updated });
}
```

### TanStack Query Delete Mutation with Cache Update

```typescript
// Source: src/lib/hooks/use-tags.ts (established project pattern)
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error); }
      return response.json();
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<AccountsResponse>(accountKeys.list(), (old) => {
        if (!old) return old;
        return { accounts: old.accounts.filter(a => a.id !== id) };
      });
      // Also invalidate vault data since deleting an account unlinks statements
      queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "timeline"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (error) => toast.error(getErrorMessage(error), { duration: Infinity, action: { label: "Try again", onClick: () => {} } }),
  });
}
```

### Conditional Field Rendering with React Hook Form `watch`

```typescript
// Source: pattern from subscription-form.tsx (watch used for date fields)
// Adaptation for type-conditional fields:
const accountType = form.watch("accountType");

// In JSX:
{accountType === "credit_card" && (
  <FormField
    control={form.control}
    name="creditLimit"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Credit Limit</FormLabel>
        <FormControl>
          <Input type="number" step="0.01" min="0" className="h-11" {...field}
            onChange={(e) => field.onChange(parseFloat(e.target.value) || null)} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

### AlertDialog Delete Confirmation

```typescript
// Source: src/components/tags/tag-delete-dialog.tsx (established project pattern)
<AlertDialog open={isOpen} onOpenChange={onClose}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Account</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to delete &quot;{account.name}&quot;?
        {account.linkedSourceType && (
          <><br /><br />Statements from this account will remain but become unlinked.</>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={(e) => { e.preventDefault(); onConfirm(); }}
        disabled={isDeleting}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Batch Upload Auto-Assignment (ACCT-08)

```typescript
// Modification to: src/app/api/batch/upload/route.ts
// ADD after sourceType validation, BEFORE creating the statement record:
const linkedAccount = await db.query.financialAccounts.findFirst({
  where: and(
    eq(financialAccounts.userId, session.user.id),
    eq(financialAccounts.linkedSourceType, sourceType.trim())
  ),
  columns: { id: true },
});

// MODIFY the insert to include accountId:
const [newStatement] = await db.insert(statements).values({
  userId: session.user.id,
  sourceType: sourceType.trim(),
  pdfHash: hash,
  originalFilename: file.name,
  fileSizeBytes: file.size,
  processingStatus: "pending",
  accountId: linkedAccount?.id ?? null,  // ADD THIS
  ...(statementDate ? { statementDate } : {}),
}).returning({ id: statements.id });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No `financial_accounts` table | `financial_accounts` table + `accountTypeEnum` + `statements.account_id` | Phase 35 (2026-02-22) | Full DB foundation is live; Phase 37 is pure application code + one small migration |
| Stub `/accounts/page.tsx` with disabled button | Fully functional AccountsPage with tab grid | This phase | Users can manage accounts |
| Batch upload always sets `accountId: null` | Batch upload looks up linked account, auto-assigns `accountId` | This phase (ACCT-08) | Future imports automatically associated with the right account |

**Not changing in this phase:**
- `statements.sourceType` — retained; still the primary source grouping key in vault views
- All vault, coverage, timeline, sources APIs — used as-is; only invalidated from the accounts hook layer

---

## Open Questions

1. **`interestRate` form representation: percentage vs. decimal fraction**
   - What we know: DB column is `decimal(5,4)` — designed for 0.0499 format (Phase 35 research)
   - What's unclear: The form could show 4.99% or 0.0499 — user expectation is percentage
   - Recommendation: Accept percentage in form (0-100), convert to decimal on submit (`/ 100`), display as percentage (`* 100`). Add `%` suffix label to the input. If user enters 4.99, store 0.0499.

2. **Tab default value when only one or two types have accounts**
   - What we know: CONTEXT says tabs for three types; decision on hiding empty tabs was left open
   - What's unclear: If user has only loans, should defaultValue be "loan" automatically?
   - Recommendation: Always show all three tabs. Default to `"bank_debit"`. Show per-type empty state in each tab. Avoids the complexity of computing which tab has data for defaultValue.

3. **Account card overflow menu vs. inline buttons**
   - What we know: Card must support Edit and Delete actions
   - What's unclear: Whether to use a DropdownMenu (3-dot menu) or inline Edit/Delete buttons
   - Recommendation: DropdownMenu (MoreHorizontal icon) — consistent with the vault's folder-card pattern and keeps the card clean. The vault folder-card uses a similar approach.

4. **Bulk statement linking on account create with source**
   - What we know: When user creates an account with a linked source, existing statements for that source have `account_id = null`
   - What's unclear: Should the POST handler bulk-update existing statements to set `account_id`?
   - Recommendation: YES — bulk-update existing statements in the POST handler (`UPDATE statements SET account_id = $account_id WHERE user_id = $user_id AND source_type = $source AND account_id IS NULL`). This ensures historical statements are linked immediately, not just future ones.

---

## Validation Architecture

Note: `workflow.nyquist_validation` is not set to `true` in `.planning/config.json` (key absent). Skipping this section per research instructions.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase: `src/lib/db/schema.ts` — `financialAccounts` table definition confirmed live, `linked_source_type` column confirmed ABSENT, `statements.accountId` FK confirmed present
- Direct codebase: `src/app/api/tags/[id]/route.ts` — canonical GET/PATCH/DELETE pattern with `params: Promise<{id}>`, `isUserActive`, `safeParse`, ownership check
- Direct codebase: `src/lib/hooks/use-tags.ts` — canonical hook pattern with `useQuery`/`useMutation`/`useQueryClient`, optimistic cache updates, toast error handling
- Direct codebase: `src/components/tags/tag-delete-dialog.tsx` + `category-delete-dialog.tsx` — AlertDialog delete confirmation pattern
- Direct codebase: `src/components/subscriptions/subscription-form.tsx` — React Hook Form + zodResolver + shadcn Form + conditional rendering pattern
- Direct codebase: `src/components/vault/vault-page.tsx` — Tabs usage pattern (three tabs, TabsList/TabsTrigger/TabsContent)
- Direct codebase: `src/components/shared/empty-state.tsx` — global empty state component (icon + title + description + Button)
- Direct codebase: `src/app/api/batch/upload/route.ts` — batch upload flow, where ACCT-08 modification is needed
- `.planning/STATE.md` — locked decisions: `financial_accounts` naming, five query keys to invalidate on PATCH, grep sourceType audit requirement
- `.planning/phases/35-database-foundation/35-01-SUMMARY.md` + `35-02-SUMMARY.md` — Phase 35 complete confirmation; `financial_accounts` table live in Supabase

### Secondary (MEDIUM confidence)

- None needed — all findings verified directly from codebase.

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed and used in existing CRUD features
- Architecture: HIGH — patterns confirmed from tags CRUD (direct analogue), schema confirmed from Phase 35 completion; one gap (`linked_source_type` column) identified with clear resolution
- Pitfalls: HIGH — five pitfalls identified from STATE.md notes, schema analysis, and established patterns

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable stack; no fast-moving dependencies)