# Phase 35: Database Foundation - Research

**Researched:** 2026-02-22
**Domain:** Drizzle ORM schema migration — new PostgreSQL enum + new table + nullable FK column addition
**Confidence:** HIGH

---

## Summary

Phase 35 is a pure database schema migration phase. Its entire job is to introduce the `financial_accounts` table, the `account_type` PostgreSQL enum, and a nullable `account_id` FK column on the `statements` table. No UI, no API routes, no React components — only schema changes and a generated migration.

The schema design is already fully worked out in ARCHITECTURE.md and STACK.md. What remains is the mechanical execution: edit `schema.ts`, run `db:generate`, **read the generated SQL before running `db:migrate`**, apply it, and export the TypeScript types. This research surfaces the one genuine risk (Drizzle FK bug #4147), confirms the exact patterns to use from the existing codebase, and documents what the next migration number will be.

The only decision still open is whether to add a PostgreSQL `CHECK` constraint enforcing type-field consistency in this migration or defer it. STATE.md flags this as a decision to make before generating. Research below covers both options so the planner can encode the chosen approach as a task step.

**Primary recommendation:** Add the schema additions to `schema.ts` following the exact `pgEnum` + `pgTable` patterns already used for the 8 existing enums, generate migration 0011, read the SQL file carefully for FK bug #4147 corruption, then apply. Do not add a `CHECK` constraint in this migration — defer that to a later migration after Phase 37 proves the type-field model works correctly in practice.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACCT-01 | User can create a financial account with name, type, and institution name | Requires `financial_accounts` table with `name`, `account_type` enum, and `institution` columns — all part of this phase's schema |
| ACCT-02 | Loan accounts include interest rate and loan term fields | Requires `interest_rate` and `loan_term_months` nullable columns on `financial_accounts` — added in this schema migration |
| ACCT-03 | Credit card accounts include credit limit field | Requires `credit_limit` nullable decimal column on `financial_accounts` — added in this schema migration |
| ACCT-04 | User can edit a financial account's details | Requires the table to exist with updatable columns and `updated_at` timestamp — all present in this phase's design |
| ACCT-05 | User can delete a financial account | Requires `ON DELETE cascade` on `financial_accounts.user_id` FK and `ON DELETE set null` on `statements.account_id` FK — both are in this phase's schema |
| ACCT-06 | User can see all accounts grouped by type | Requires `account_type` enum with `bank_debit`, `credit_card`, `loan` values — the `accountTypeEnum` added in this phase |
| ACCT-07 | User can link an existing statement source to a financial account | Requires the nullable `account_id` FK on `statements` that this phase adds |
| ACCT-08 | Future PDF imports from a linked source auto-assigned to account | Requires `statements.account_id` column to exist for the import pipeline to populate — this phase provides it |

All ACCT requirements are unblocked by this infrastructure phase. None of them are implemented here, but none can be implemented without this schema existing first.
</phase_requirements>

---

## Standard Stack

### Core (what this phase uses)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 (installed) | `pgEnum`, `pgTable`, `uuid`, `varchar`, `decimal`, `integer`, `text`, `boolean`, `timestamp`, `index` column builders; `relations` | Already in project; same `pgEnum` + `pgTable` pattern used for all 10 existing Drizzle migrations |
| drizzle-kit | ^0.31.8 (installed) | `npm run db:generate` generates migration SQL; `npm run db:migrate` applies it | Same workflow used for all prior migrations; no new tooling needed |

### Supporting (already installed, referenced in this phase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PostgreSQL (via Supabase) | — | Target database; the `account_type` enum is a native PostgreSQL enum type | PostgreSQL-native enum is the correct type for a fixed set of account type values |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pgEnum("account_type", [...])` | `varchar` column with app-layer validation | pgEnum gives DB-level constraint + type safety; varchar lets any string in; pgEnum is the established project pattern |
| Single table with nullable type columns | Separate `bank_accounts`, `credit_cards`, `loans` tables | 3x schema + API surface for 3-5 unique fields per type; single table confirmed correct approach in ARCHITECTURE.md |
| Additive nullable FK | NOT NULL FK with auto-backfill in same migration | NOT NULL fails immediately on all existing statement rows; nullable is required; Pitfall 2 in PITFALLS.md |

**Installation:** No new packages needed. All tooling already installed.

---

## Architecture Patterns

### Recommended Project Structure

Only two files change in this phase:

```
src/lib/db/
├── schema.ts              # ADD: accountTypeEnum, financialAccounts table,
│                          #      accountId FK on statements, relations updates,
│                          #      FinancialAccount type exports
└── migrations/
    └── 0011_*.sql         # GENERATED: reviewed before apply
```

### Pattern 1: pgEnum Addition

**What:** Add a new PostgreSQL enum type using `pgEnum` before the table that references it.
**When to use:** Any time a column has a fixed set of valid string values — the project already uses this pattern for 8 enums.

```typescript
// src/lib/db/schema.ts — add near the top of the ENUMS section
// Source: existing schema.ts pattern (e.g., transactionTagStatusEnum line 54-59)
export const accountTypeEnum = pgEnum("account_type", [
  "bank_debit",
  "credit_card",
  "loan",
]);
```

The `pgEnum` call name (`"account_type"`) becomes the PostgreSQL type name in the generated SQL:
```sql
CREATE TYPE "public"."account_type" AS ENUM('bank_debit', 'credit_card', 'loan');
```

This is exactly how `transactionTagStatusEnum`, `billingStatusEnum`, `userRoleEnum`, and the other 5 existing enums are defined.

### Pattern 2: New Table with FK to `users` and Nullable Type-Specific Columns

**What:** Define the `financial_accounts` table with `userId` cascade FK and nullable columns for type-specific fields.
**When to use:** Any new user-owned table. The cascade delete and `userId` index pattern is universal in this codebase.

```typescript
// src/lib/db/schema.ts — add in the TABLES section, after enums, before relations
// Source: ARCHITECTURE.md + STACK.md design; pattern from statements table (line 495-533)
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Core fields — all account types
    name: varchar("name", { length: 100 }).notNull(),
    accountType: accountTypeEnum("account_type").notNull(),
    institution: varchar("institution", { length: 100 }),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),

    // credit_card only (null for bank_debit and loan)
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
    statementClosingDay: integer("statement_closing_day"),  // 1-31

    // loan only (null for bank_debit and credit_card)
    originalBalance: decimal("original_balance", { precision: 12, scale: 2 }),
    interestRate: decimal("interest_rate", { precision: 5, scale: 4 }),  // e.g. 0.0499 = 4.99%
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

**ARCHITECTURE.md vs STACK.md column discrepancy:** Both design documents include the same core fields but differ slightly in type-specific field names. STACK.md uses `originalBalance` and `interestRate` (decimal 5,4); ARCHITECTURE.md uses `principalAmount` and `interestRate` (decimal 5,2) and adds `bankRoutingNumber`. The column names above follow STACK.md (more recent research), which aligns with REQUIREMENTS.md (ACCT-02 says "interest rate and loan term"; ACCT-03 says "credit limit"). Bank-specific fields like routing number are NOT mentioned in any ACCT requirement — leave them out of the initial migration to keep the schema minimal.

### Pattern 3: Nullable FK Column Addition on Existing Table

**What:** Add `account_id uuid REFERENCES financial_accounts(id)` to the existing `statements` table as nullable.
**When to use:** When adding a FK that references a new table to an existing table with live data.

```typescript
// src/lib/db/schema.ts — ADD to the existing statements table column object
// Source: PITFALLS.md Pitfall 2; ARCHITECTURE.md statements modification
accountId: uuid("account_id").references(() => financialAccounts.id, {
  onDelete: "set null",
}),
// Note: NO .notNull() — this is intentionally nullable
```

The `onDelete: "set null"` means deleting a financial account does NOT delete the statement — it just clears the link. This preserves statement history regardless of account lifecycle.

**CRITICAL:** `financialAccounts` must be defined in `schema.ts` BEFORE the `statements` table definition because `statements.accountId` references it. Rearrange the file if needed so `financialAccounts` appears before `statements`.

### Pattern 4: Relations Updates

**What:** Add Drizzle relations for the new table and update the existing `statementsRelations`.

```typescript
// NEW: add after the financialAccounts table definition
export const financialAccountsRelations = relations(
  financialAccounts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [financialAccounts.userId],
      references: [users.id],
    }),
    statements: many(statements),
  })
);

// MODIFY: existing statementsRelations (currently line 824-830)
// Add the financialAccount relation to the existing one
export const statementsRelations = relations(statements, ({ one, many }) => ({
  user: one(users, {
    fields: [statements.userId],
    references: [users.id],
  }),
  financialAccount: one(financialAccounts, {   // ADD THIS
    fields: [statements.accountId],
    references: [financialAccounts.id],
  }),
  transactions: many(transactions),
}));

// Also add financialAccounts to usersRelations
// MODIFY: existing usersRelations (currently line 705-719)
// Add: financialAccounts: many(financialAccounts),
```

### Pattern 5: TypeScript Type Exports

**What:** Export `FinancialAccount` and `NewFinancialAccount` types at the bottom of schema.ts.

```typescript
// Add to the TYPE EXPORTS section at the bottom of schema.ts
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type NewFinancialAccount = typeof financialAccounts.$inferInsert;
export type AccountType = "bank_debit" | "credit_card" | "loan";
```

The `AccountType` union export makes it easy for API routes and form validation in later phases to type-check the discriminant without importing the enum object.

### Anti-Patterns to Avoid

- **Making `accountId` NOT NULL:** Fails immediately — all existing statement rows have no account yet. Must be nullable.
- **Trusting the generated migration SQL without reading it:** Drizzle bug #4147 can corrupt FK references when FK + new column are added in the same migration. Read the `.sql` file before `db:migrate`.
- **Naming the table `accounts`:** The existing NextAuth `accounts` table (schema.ts line 120) would conflict. Must use `financial_accounts`.
- **Adding `financialAccounts` after `statements` in schema.ts:** The FK reference from statements to financialAccounts requires financialAccounts to be defined first in the file.
- **Running `db:push` instead of `db:generate` + `db:migrate`:** `db:push` skips migration file creation; this phase specifically needs a migration file (`0011_*.sql`) for the audit trail and pre-apply SQL review.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Creating the PostgreSQL enum type | Manual `CREATE TYPE` SQL | `pgEnum()` in schema.ts + `db:generate` | Drizzle tracks enum creation in migration journal; hand-rolled SQL is untracked |
| Validating account type at application level | `if (type !== 'bank_debit' && type !== 'credit_card' && type !== 'loan')` | PostgreSQL enum constraint + Zod discriminated union (Phase 37) | DB-level constraint catches corruption from any source including direct DB access |
| Applying the migration | Raw `psql` commands | `npm run db:migrate` | Drizzle's migration runner tracks which migrations have been applied in its journal table |

**Key insight:** Drizzle's value is in keeping the schema definition, generated SQL, and journal in sync. Breaking out of its workflow (hand-rolling SQL, using `db:push`) creates drift that causes future `db:generate` runs to produce incorrect diffs.

---

## Common Pitfalls

### Pitfall 1: Drizzle FK Bug #4147 — Incorrect SQL When FK + New Column in Same Migration

**What goes wrong:** When a new column (like `account_id`) that has a FK reference is added to an existing table in the same `db:generate` run, Drizzle can generate SQL where the FK `REFERENCES` clause points to a temporary internal name rather than the actual table. The migration appears to run successfully but the FK constraint is silently wrong or missing.

**Why it happens:** Drizzle's SQL generation for `ALTER TABLE ... ADD COLUMN` with FK references has a documented bug (GitHub issue #4147) specific to adding FK columns to existing tables. New tables with FK columns are not affected — only `ALTER TABLE ADD COLUMN ... REFERENCES`.

**How to avoid:**
1. After running `npm run db:generate`, open the generated `src/lib/db/migrations/0011_*.sql` file.
2. Find the `ALTER TABLE "statements" ADD COLUMN "account_id" uuid;` statement.
3. Find the corresponding `ALTER TABLE "statements" ADD CONSTRAINT ... FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id")` statement.
4. Verify the `REFERENCES "financial_accounts"("id")` clause is present and points to the correct table name (not a Drizzle internal name like `__drizzle_migrations` or a garbled reference).
5. Only run `npm run db:migrate` after the SQL has been confirmed correct.

**Warning signs:** The generated SQL for the `account_id` column has a malformed or missing `REFERENCES` clause.

**Confidence:** HIGH — Drizzle GitHub issue #4147 is confirmed in PITFALLS.md and STATE.md.

---

### Pitfall 2: `financialAccounts` Defined After `statements` in schema.ts — Circular Reference Error

**What goes wrong:** If `financialAccounts` is appended to the end of schema.ts (after `statements`), the `statements.accountId` column definition that calls `references(() => financialAccounts.id)` will fail TypeScript compilation because `financialAccounts` is not yet defined at that point in the file.

**Why it happens:** JavaScript/TypeScript evaluates module-level expressions in order. Arrow function references (`() => financialAccounts.id`) work if the variable is defined anywhere in the same module due to hoisting, but Drizzle processes the table definitions at module initialization time.

**How to avoid:** Insert the `financialAccounts` table definition in schema.ts BEFORE the `statements` table definition. Suggested insertion point: between the `alerts` table (line 456-491) and the `statements` table (line 495-533).

**Warning signs:** TypeScript error `Cannot access 'financialAccounts' before initialization` or `Block-scoped variable 'financialAccounts' used before its declaration`.

---

### Pitfall 3: Migration Number Collision — 0011 Already Used

**What goes wrong:** The file `0011_backfill_statement_date.sql` already exists in `src/lib/db/migrations/` but is NOT in the Drizzle journal (`_journal.json` only goes to `0010`). When Drizzle generates the next migration, it will name it `0011_*.sql`, which would conflict with the existing manual backfill file.

**Why it happens:** The backfill was applied as a manual SQL file outside Drizzle's migration system. Drizzle does not know it exists.

**How to avoid:** Before running `db:generate`, rename (or move to an archive folder) the existing `0011_backfill_statement_date.sql` file so it does not conflict with the Drizzle-generated `0011_*.sql`. Alternatively, the Drizzle-generated file will have a different suffix (e.g., `0011_some_random_name.sql`) so it may not actually conflict — verify the output filename after generate runs.

**Warning signs:** `db:generate` outputs `0011_*.sql` and a filename collision error, or it silently overwrites the existing manual file.

---

### Pitfall 4: `account_type` Enum Name Conflicts With Existing PostgreSQL Types

**What goes wrong:** If a PostgreSQL enum named `account_type` already exists in the database from a prior experiment or migration, the generated `CREATE TYPE "public"."account_type" AS ENUM(...)` will fail with `type "account_type" already exists`.

**Why it happens:** Manual SQL runs or aborted migration attempts can leave orphaned types in PostgreSQL.

**How to avoid:** Before applying the migration, check the database for existing enum types:
```sql
SELECT typname FROM pg_type WHERE typcategory = 'E';
```
If `account_type` already exists, it either needs to be dropped (`DROP TYPE account_type;`) before re-applying, or the migration must be adjusted to use `CREATE TYPE IF NOT EXISTS` (not natively supported in PostgreSQL — requires a workaround or idempotent migration approach).

**Warning signs:** Migration fails with `ERROR: type "account_type" already exists`.

---

## Code Examples

### Complete schema.ts additions (verified against existing patterns)

```typescript
// 1. Add to ENUMS section (after line 63 — after userRoleEnum)
export const accountTypeEnum = pgEnum("account_type", [
  "bank_debit",
  "credit_card",
  "loan",
]);

// 2. Add new table BEFORE the statements table (insert between alerts and statements)
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Core identity fields
    name: varchar("name", { length: 100 }).notNull(),
    accountType: accountTypeEnum("account_type").notNull(),
    institution: varchar("institution", { length: 100 }),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),

    // credit_card only
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
    statementClosingDay: integer("statement_closing_day"),

    // loan only
    originalBalance: decimal("original_balance", { precision: 12, scale: 2 }),
    interestRate: decimal("interest_rate", { precision: 5, scale: 4 }),
    loanTermMonths: integer("loan_term_months"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("financial_accounts_user_id_idx").on(table.userId),
    index("financial_accounts_type_idx").on(table.accountType),
  ]
);

// 3. Add accountId to the existing statements table columns object
//    (inside the existing pgTable call for statements)
accountId: uuid("account_id").references(() => financialAccounts.id, {
  onDelete: "set null",
}),

// 4. Add index for accountId on statements (inside statements table's index array)
index("statements_account_id_idx").on(table.accountId),

// 5. NEW relations (add after financialAccounts table definition)
export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [financialAccounts.userId],
    references: [users.id],
  }),
  statements: many(statements),
}));

// 6. MODIFY statementsRelations — add financialAccount one() relation
// Inside the existing statementsRelations, add:
financialAccount: one(financialAccounts, {
  fields: [statements.accountId],
  references: [financialAccounts.id],
}),

// 7. MODIFY usersRelations — add financialAccounts many() relation
// Inside the existing usersRelations, add:
financialAccounts: many(financialAccounts),

// 8. Add to TYPE EXPORTS section
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type NewFinancialAccount = typeof financialAccounts.$inferInsert;
export type AccountType = "bank_debit" | "credit_card" | "loan";
```

### Expected generated SQL shape (what to verify after `db:generate`)

```sql
-- Step 1: Create the enum type
CREATE TYPE "public"."account_type" AS ENUM('bank_debit', 'credit_card', 'loan');
--> statement-breakpoint

-- Step 2: Create the new table
CREATE TABLE "financial_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "account_type" "account_type" NOT NULL,
  "institution" varchar(100),
  "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "credit_limit" numeric(12, 2),
  "statement_closing_day" integer,
  "original_balance" numeric(12, 2),
  "interest_rate" numeric(5, 4),
  "loan_term_months" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Step 3: Add FK from financial_accounts to users
ALTER TABLE "financial_accounts"
  ADD CONSTRAINT "financial_accounts_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Step 4: Add nullable accountId column to statements
-- *** THIS IS THE CRITICAL LINE TO CHECK FOR FK BUG #4147 ***
ALTER TABLE "statements" ADD COLUMN "account_id" uuid;
--> statement-breakpoint

-- Step 5: Add FK constraint for the new column
-- *** VERIFY THAT "financial_accounts" IS SPELLED CORRECTLY HERE ***
ALTER TABLE "statements"
  ADD CONSTRAINT "statements_account_id_financial_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Step 6: Indexes
CREATE INDEX "financial_accounts_user_id_idx" ON "financial_accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "financial_accounts_type_idx" ON "financial_accounts" USING btree ("account_type");
--> statement-breakpoint
CREATE INDEX "statements_account_id_idx" ON "statements" USING btree ("account_id");
```

---

## Migration Execution Checklist

The planner should encode this sequence as tasks:

1. **Edit `schema.ts`** — add enum, add table before `statements`, add `accountId` to statements, update relations, add type exports
2. **Run `npm run db:generate`** — generates `src/lib/db/migrations/0011_*.sql`
3. **Read the generated SQL** — open the file, check step 4 and 5 above for FK bug #4147 corruption
4. **Run `npm run db:migrate`** — applies the migration to Supabase PostgreSQL
5. **Verify the table exists** — run a quick SQL check or use Drizzle Studio
6. **TypeScript compile check** — run `tsc --noEmit` or `npm run build` to confirm no type errors from schema changes

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `varchar sourceType` as account identity | `uuid accountId` FK to `financial_accounts` | This phase | First step of migration from string-based to entity-based account identity |
| No account concept | `financial_accounts` table | This phase | Enables typed account management for bank/credit card/loan accounts |

**Not changing in this phase:**
- `statements.sourceType` — retained; remains the display name; removed only after all consumers are migrated (future phase)
- All transaction, vault, coverage, and source APIs — untouched; they still use `sourceType` for grouping

---

## Open Questions

1. **Migration number collision with `0011_backfill_statement_date.sql`**
   - What we know: That file exists in the migrations folder but is NOT tracked in `_journal.json`
   - What's unclear: Whether Drizzle will produce `0011_*.sql` (naming collision) or a higher number based on the journal state (which goes to 0010)
   - Recommendation: The journal is the source of truth for Drizzle — it will generate `0011_*.sql`. Before running `db:generate`, verify whether the filename collision needs to be resolved by renaming or archiving the manual backfill file. After generate, the two files will have different suffixes (`0011_backfill_statement_date.sql` vs `0011_some_generated_name.sql`) so no overwrite occurs, but it is visually confusing to have two `0011_*` files. Rename the manual one to `manual_backfill_statement_date.sql` before generate.

2. **`CHECK` constraint for type-field consistency — this migration or later?**
   - What we know: STATE.md flags this as an open decision; PITFALLS.md recommends adding it; ARCHITECTURE.md says nullable columns + API-layer enforcement is acceptable
   - What's unclear: Whether the constraint would block any legitimate edge cases in Phase 37's account creation logic
   - Recommendation: Skip the `CHECK` constraint in this migration. The Zod discriminated union schema added in Phase 37 enforces type-field consistency at the API boundary. Add the DB-level `CHECK` constraint only after Phase 37 is implemented and the exact field semantics are proven in code. Adding it prematurely risks blocking valid INSERT patterns that haven't been thought through yet.

3. **`statements_account_id_idx` index — include or not?**
   - What we know: ARCHITECTURE.md mentions an index on `accountId` would support the source migration banner query (`SELECT DISTINCT sourceType FROM statements WHERE accountId IS NULL`)
   - What's unclear: Whether Drizzle generates this automatically or it needs to be explicit in the table definition
   - Recommendation: Add `index("statements_account_id_idx").on(table.accountId)` explicitly to the statements table's index array. It's a low-cost add now and prevents a follow-up migration later when Phase 37 starts querying by accountId.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis: `src/lib/db/schema.ts` — all 9 existing enums, all 15 existing tables, all relations patterns; confirmed `accounts` table (line 120) is NextAuth-owned; confirmed `statements` table (lines 495-533) has no `accountId` column yet
- Direct codebase analysis: `src/lib/db/migrations/_journal.json` — confirmed last applied migration is `0010_absurd_nehzno` (user_role enum); next Drizzle-generated migration will be `0011_*`
- Direct codebase analysis: `src/lib/db/migrations/0009_tough_blockbuster.sql` — confirmed FK constraint naming pattern: `tablename_columnname_reftable_refcolumn_fk`
- Direct codebase analysis: `drizzle.config.ts` — confirmed migrations output to `./src/lib/db/migrations`, schema source is `./src/lib/db/schema.ts`
- `.planning/STATE.md` — locked decisions: `financial_accounts` naming, nullable accountId FK, user-driven migration, Drizzle FK bug #4147 read-before-migrate requirement
- `.planning/research/ARCHITECTURE.md` — full `financialAccounts` table design, `accountId` FK design, migration approach rationale
- `.planning/research/STACK.md` — Drizzle ORM patterns, version numbers (`drizzle-orm ^0.45.1`, `drizzle-kit ^0.31.8`), discriminated field design
- `.planning/research/PITFALLS.md` — Drizzle FK bug #4147 detail, NOT NULL constraint failure pattern, naming collision pattern

### Secondary (MEDIUM confidence)

- Drizzle ORM GitHub issue #4147 — FK + column in same migration generates incorrect SQL (referenced in PITFALLS.md; not independently re-fetched since it is a documented known issue in the project)

### Tertiary (LOW confidence)

- None. All findings are based on direct codebase inspection or project planning documents.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — drizzle-orm and drizzle-kit versions confirmed from package.json; patterns confirmed from 10 existing migration files
- Architecture: HIGH — `financialAccounts` table design from ARCHITECTURE.md + STACK.md, cross-checked against actual schema.ts structure
- Pitfalls: HIGH — Drizzle FK bug #4147 is a confirmed known issue; migration number sequence confirmed from journal; naming collision confirmed from codebase

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable Drizzle ORM — low churn; schema design locked in STATE.md)
