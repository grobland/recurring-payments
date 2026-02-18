# Phase 30: Fix URLs & Admin Security - Research

**Researched:** 2026-02-18
**Domain:** Next.js App Router auth/RBAC, Drizzle schema migrations, ESLint config, dead code cleanup
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Admin Role Mechanism
- Add `role` enum column to users table with values `user | admin`
- Default value `'user'` — all existing and new users default to regular user
- Extend NextAuth session to include `session.user.role` — available everywhere session is used
- First admin bootstrapped via SQL migration that reads `ADMIN_EMAIL` env variable
- No admin UI for role management — manage roles via SQL or Drizzle Studio for now
- Admin API routes use inline `session.user.role === 'admin'` checks (not a shared helper)

#### Admin Access Denial
- Non-admin users navigating to admin pages are silently redirected to `/dashboard`
- Admin navigation links completely hidden from non-admins (not shown disabled)
- Admin API routes return 403 Forbidden for non-admin authenticated users
- Admin role check happens at layout level — admin layout component checks role once, protects all `/admin/*` pages automatically

#### Pricing Link Placement
- Add `/pricing` link to marketing site header as main nav item (next to Features)
- Visible to all users regardless of auth state (always visible)
- Also add `/pricing` link to marketing site footer
- No pricing link in dashboard sidebar — dashboard users access via `/settings/billing`

#### Dead Code Cleanup
- Full dead code sweep across entire codebase, not just the 3 listed imports
- Remove both unused imports AND unreferenced exports
- Clean up development artifacts (.bak files, temp files)
- Enable stricter ESLint no-unused-vars/imports lint rules for future prevention

### Claude's Discretion
- Exact ESLint rule configuration for unused imports
- How to structure the admin layout redirect logic
- Migration numbering and SQL syntax

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOOK-02 | User receives email when payment fails | Payment failed webhook handler already sends email. The return_url bug at line 308 of `/src/app/api/webhooks/stripe/route.ts` uses `/dashboard/billing` — must be changed to `/settings/billing`. No `/dashboard/billing` route exists. |
</phase_requirements>

---

## Summary

This phase has four distinct work areas: (1) a one-line URL fix in the Stripe webhook, (2) admin role RBAC via a new DB column + NextAuth session extension, (3) pricing navigation links, and (4) dead code cleanup including stricter ESLint rules.

The URL fix is trivial — line 308 of the webhook route has `return_url: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing` which must be `/settings/billing`. The actual billing page exists at `src/app/(dashboard)/settings/billing/page.tsx`.

The admin role work requires: a Drizzle schema change (new `pgEnum` + column on `users`), a generated SQL migration plus a custom admin-bootstrap migration, NextAuth JWT/session callback updates, TypeScript type declaration updates, admin layout redirect logic, admin API route role check, and sidebar conditional rendering. The existing admin layout (`src/app/(dashboard)/admin/layout.tsx`) already has a commented-out role check ready to activate.

The dead code cleanup is straightforward: one unused import (`TIER_LEVELS` in `feature-comparison-table.tsx`), two unreferenced exports (`getTierDisplayName` and `getTierFeatures` in `products.ts`), one `.bak` file (`src/lib/db/schema.ts.bak`), and ESLint config tightening. The `cn` import in `feature-comparison-table.tsx` is also unused (no `cn()` calls in that file).

**Primary recommendation:** Tackle in task order — URL fix first (fastest, closes HOOK-02), then admin role (most steps), then pricing nav links, then dead code + ESLint.

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | Schema definition + query builder | Already used throughout |
| drizzle-kit | ^0.31.8 | Migration generation | Already used |
| next-auth | ^5.0.0-beta.30 | Auth + JWT/session callbacks | Already used |
| eslint-config-next | 16.1.4 | ESLint rules for Next.js | Already configured |

### No New Packages Required

All work in this phase uses libraries already in the project. No `npm install` steps needed.

---

## Architecture Patterns

### Recommended Project Structure (no changes)

The existing structure is maintained. Key files touched:

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── layout.tsx          # Add role check + redirect
│   ├── (marketing)/
│   │   └── layout.tsx              # Add /pricing nav link
│   └── api/
│       ├── webhooks/stripe/route.ts # Fix return_url
│       └── admin/trial-extensions/route.ts  # Add role check
├── lib/
│   ├── auth/
│   │   └── config.ts               # Add role to JWT + session callbacks
│   ├── db/
│   │   ├── schema.ts               # Add roleEnum + role column to users
│   │   └── migrations/             # New migration files
│   └── features/
│       └── config.ts               # TIER_LEVELS still used internally — keep
├── types/
│   └── next-auth.d.ts              # Add role to Session, User, JWT types
└── components/
    ├── layout/
    │   └── app-sidebar.tsx         # Conditionally render admin nav item
    └── pricing/
        └── feature-comparison-table.tsx  # Remove unused TIER_LEVELS import
```

### Pattern 1: Drizzle pgEnum + Column Addition

**What:** Add a new PostgreSQL enum type and column to an existing table.

**When to use:** When adding a constrained-value column to an existing table.

**Example (based on existing patterns in schema.ts):**
```typescript
// In schema.ts — add before users table definition
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// In users table definition — add field
role: userRoleEnum("role").default("user").notNull(),
```

**Migration flow:**
1. Edit `schema.ts` — add `userRoleEnum` and `role` field
2. Run `npm run db:generate` — Drizzle generates `0010_*.sql`
3. Create a separate custom SQL file `0010_seed_admin.sql` (or name it `0011_seed_admin.sql` if Drizzle takes 0010) that sets the admin role from `ADMIN_EMAIL`

**Migration numbering:** Current highest migration is `0009_tough_blockbuster.sql`. Next auto-generated will be `0010_*`. The admin-bootstrap custom migration should NOT be auto-generated by Drizzle — it's a manually created SQL file that runs after, or it can be embedded in the same migration.

**IMPORTANT:** The custom admin bootstrap SQL cannot read `ADMIN_EMAIL` env variable at migration time directly in a SQL file. Options:
- Option A (recommended): The admin bootstrap migration is a separate SQL statement appended to the Drizzle-generated file manually, using a `DO $$` block with a literal email hardcoded, OR
- Option B: Create a seed script (like `src/scripts/seed-admin.ts`) that reads the env var and runs the UPDATE query — analogous to `src/scripts/seed-stripe-prices.ts`
- Option C: Add to the Drizzle migration SQL as a conditional UPDATE: `UPDATE users SET role = 'admin' WHERE email = current_setting('app.admin_email', true);` — requires the setting to be passed at migration time

Research verdict: **Option B (seed script)** is the cleanest approach given this project already uses `src/scripts/seed-stripe-prices.ts` as a precedent. The Drizzle migration handles the schema; the seed script handles the data.

### Pattern 2: NextAuth v5 JWT + Session Extension

**What:** Add custom fields to the JWT token and session object.

**Based on existing pattern in `src/lib/auth/config.ts` (lines 78–119):**

```typescript
// In JWT callback — after existing fields:
token.role = dbUser.role; // "user" | "admin"

// In session callback — after existing fields:
user.role = token.role;
```

**TypeScript declaration file update (`src/types/next-auth.d.ts`):**
```typescript
interface Session {
  user: {
    // existing fields...
    role: "user" | "admin";
  };
}
interface JWT {
  // existing fields...
  role: "user" | "admin";
}
```

The `trigger === "update"` branch also needs `token.role = dbUser.role` for session refresh to work.

### Pattern 3: Admin Layout Role Guard

**What:** Server component layout that reads session and redirects non-admins.

**Existing admin layout (`src/app/(dashboard)/admin/layout.tsx`) already has the commented-out check.** Activate it:

```typescript
export default async function AdminLayout({ children }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-8">
      {/* existing JSX */}
    </div>
  );
}
```

**Key:** `session.user.role` is available here because the JWT callback populates it and the session callback exposes it. No DB query needed at layout level.

### Pattern 4: Admin API Route Role Check

**Existing pattern (`src/app/api/admin/trial-extensions/route.ts` line 21):**
```typescript
// Note: No admin role check - session auth only (MVP tradeoff)
// Admin role gating can be added later if needed
```

**New pattern (inline check per decision):**
```typescript
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ... rest of handler
}
```

### Pattern 5: Conditional Admin Nav Rendering

**The `app-sidebar.tsx` is a `"use client"` component that uses `useSession()`.**

```typescript
const { data: session } = useSession();
const isAdmin = session?.user?.role === "admin";

// In the render — after secondaryNavItems section:
{isAdmin && (
  <SidebarGroup>
    <SidebarGroupLabel>Admin</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")}>
            <Link href="/admin/trial-extensions">
              <Shield className="size-4" />
              <span>Trial Extensions</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname === "/admin/webhooks"}>
            <Link href="/admin/webhooks">
              <Webhook className="size-4" />
              <span>Webhooks</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
)}
```

**Icon choices:** `Shield` and `Webhook` are available in `lucide-react` (already imported library). Add to the existing import list.

### Pattern 6: Pricing Link in Marketing Layout

**Existing marketing layout (`src/app/(marketing)/layout.tsx`) — add nav links:**

```tsx
// Header — add between logo link and auth buttons:
<nav className="flex items-center gap-6">
  <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
    Pricing
  </Link>
</nav>

// Footer — add to the existing flex gap-4 links div:
<Link href="/pricing" className="hover:underline">Pricing</Link>
```

The decision says "next to Features" — but the current header has no Features link. There's just logo + auth buttons. The pricing link goes between logo and auth buttons, consistent with the layout's structure.

### Pattern 7: ESLint Unused Imports Rule

**Current config (`eslint.config.mjs`):**
```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
```

**ESLint v9 flat config — add `no-unused-vars` rules:**
```javascript
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);
```

**NOTE:** `eslint-config-next` already includes `@typescript-eslint/no-unused-vars` as a warning by default. The explicit override makes it more visible and configurable. Do NOT use `"error"` severity — it will break existing build output. Use `"warn"` to flag without breaking.

**For unused imports specifically:** `@typescript-eslint/no-unused-vars` catches import bindings automatically when they're not referenced. No separate plugin needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin role check middleware | Custom middleware with regex matching | Layout-level server component `auth()` + `redirect()` | App Router best practice; middleware adds complexity |
| Role persistence | Custom JWT signing | NextAuth JWT callback | NextAuth handles token integrity |
| Migration SQL | Manual PostgreSQL ALTER TABLE | Drizzle `db:generate` + manual migration | Drizzle generates correct dialect-specific SQL |
| Unused import detection | Manual code review | ESLint `@typescript-eslint/no-unused-vars` | Automated, catches new regressions |

**Key insight:** Every problem in this phase has an existing solution already in the project. The work is configuration and wiring, not novel development.

---

## Common Pitfalls

### Pitfall 1: Session Not Having Role After Migration

**What goes wrong:** Admin user logs in but `session.user.role` is `undefined` because their existing JWT token was issued before the role field was added.

**Why it happens:** JWTs are cached in the browser. Existing sessions don't automatically refresh token contents.

**How to avoid:** The `trigger === "update"` branch in the JWT callback already handles re-fetching user data on token refresh. Existing sessions will update on next page navigation that triggers session update, or after logout/login.

**Warning signs:** Admin layout still redirects you to `/dashboard` even after setting role in DB.

**Resolution:** Sign out and sign back in after the migration runs.

### Pitfall 2: TypeScript Type Errors After Adding Role to Session

**What goes wrong:** `session.user.role` causes TypeScript error `Property 'role' does not exist on type...`

**Why it happens:** `src/types/next-auth.d.ts` must be updated alongside the auth config changes.

**How to avoid:** Update `next-auth.d.ts` in the same task as the auth config change. The type declaration uses module augmentation — add `role: "user" | "admin"` to `Session.user`, `User`, and `JWT` interfaces.

**Warning signs:** Build succeeds (type errors suppressed by `// eslint-disable @typescript-eslint/no-unused-vars` at top of the file) but IDE shows red squiggles.

### Pitfall 3: Drizzle Migration Conflicts with Custom SQL

**What goes wrong:** Running `db:generate` after the manual admin seed SQL was added to the migration file causes Drizzle to try to re-generate and override it.

**Why it happens:** Drizzle tracks its own migration files via `_journal.json`. If the migration file is modified after generation, Drizzle may detect drift.

**How to avoid:** Keep the admin bootstrap as a **separate script** (`src/scripts/seed-admin.ts`) rather than embedded in the Drizzle migration SQL. Run it as a one-off after migration, similar to `seed-stripe-prices.ts`.

**Warning signs:** `npm run db:migrate` fails with checksum mismatch errors.

### Pitfall 4: Admin Layout Bypassed by Direct API Access

**What goes wrong:** Admin layout protects `/admin/*` pages but not the API routes under `/api/admin/*`.

**Why it happens:** Layout components only run for page renders, not API route requests.

**How to avoid:** Add inline role check to `src/app/api/admin/trial-extensions/route.ts` as a separate task. Both protections are needed: layout for page security, API route check for data security.

**Warning signs:** Non-admin user can still call `POST /api/admin/trial-extensions` via fetch/curl.

### Pitfall 5: `TIER_LEVELS` Removal Breaks `canTierAccessFeature`

**What goes wrong:** Removing `TIER_LEVELS` from `features/config.ts` breaks the `canTierAccessFeature` function which uses it internally.

**Why it happens:** `TIER_LEVELS` is exported AND used internally. Only the export is unused externally (in `feature-comparison-table.tsx`).

**How to avoid:** Do NOT remove `TIER_LEVELS` from `config.ts`. Only remove the **import** of `TIER_LEVELS` in `feature-comparison-table.tsx` (line 13). The export in `config.ts` and re-export in `index.ts` stay as-is (they're used by `canTierAccessFeature` internally).

### Pitfall 6: Marketing Header "Features" Nav Item Doesn't Exist

**What goes wrong:** CONTEXT.md says "next to Features" but there is no Features link in the current marketing header.

**Why it happens:** The marketing layout only has logo + auth buttons. No main nav items exist yet.

**How to avoid:** Add `/pricing` as the first main nav item in the header, between logo and auth buttons. The absence of a Features link is expected — don't create it unless separately planned.

---

## Code Examples

### Admin Role in Drizzle Schema

```typescript
// Source: src/lib/db/schema.ts (existing pattern — other enums defined same way)

// Add before users table:
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// Inside users pgTable definition — add after onboardingCompleted:
role: userRoleEnum("role").default("user").notNull(),
```

### Admin Bootstrap Seed Script

```typescript
// Source: src/scripts/seed-stripe-prices.ts (existing pattern)
// File: src/scripts/seed-admin.ts

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("ADMIN_EMAIL env var not set");
  process.exit(1);
}

const result = await db
  .update(users)
  .set({ role: "admin" })
  .where(eq(users.email, adminEmail));

console.log(`Set admin role for: ${adminEmail}`);
process.exit(0);
```

### NextAuth JWT Callback Update

```typescript
// Source: src/lib/auth/config.ts (existing jwt callback pattern)

async jwt({ token, user, trigger }) {
  if (user) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id!),
    });
    if (dbUser) {
      token.id = dbUser.id;
      token.billingStatus = dbUser.billingStatus;
      token.trialEndDate = dbUser.trialEndDate?.toISOString() ?? null;
      token.onboardingCompleted = dbUser.onboardingCompleted;
      token.displayCurrency = dbUser.displayCurrency;
      token.role = dbUser.role; // ADD THIS
    }
  }

  if (trigger === "update") {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, token.id as string),
    });
    if (dbUser) {
      token.billingStatus = dbUser.billingStatus;
      token.trialEndDate = dbUser.trialEndDate?.toISOString() ?? null;
      token.onboardingCompleted = dbUser.onboardingCompleted;
      token.displayCurrency = dbUser.displayCurrency;
      token.role = dbUser.role; // ADD THIS
    }
  }

  return token;
},
```

### NextAuth Session Callback Update

```typescript
// Source: src/lib/auth/config.ts (existing session callback pattern)

async session({ session, token }) {
  if (token && session.user) {
    const user = session.user as unknown as Record<string, unknown>;
    user.id = token.id;
    user.billingStatus = token.billingStatus;
    user.trialEndDate = token.trialEndDate;
    user.onboardingCompleted = token.onboardingCompleted;
    user.displayCurrency = token.displayCurrency;
    user.role = token.role; // ADD THIS
  }
  return session;
},
```

### TypeScript Declaration File Update

```typescript
// Source: src/types/next-auth.d.ts (extend existing declarations)

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      billingStatus: string;
      trialEndDate: string | null;
      onboardingCompleted: boolean;
      displayCurrency: string;
      role: "user" | "admin"; // ADD THIS
    };
  }

  interface User {
    // ... existing fields
    role?: "user" | "admin"; // ADD THIS
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    billingStatus: string;
    trialEndDate: string | null;
    onboardingCompleted: boolean;
    displayCurrency: string;
    role: "user" | "admin"; // ADD THIS
  }
}
```

### Dead Code: Remove Unused Import in feature-comparison-table.tsx

```typescript
// BEFORE (line 13):
import { TIER_LEVELS } from "@/lib/features/config";
import { cn } from "@/lib/utils";

// AFTER (both removed — neither is used in the file):
// (neither import appears — cn() is never called in this file,
//  and TIER_LEVELS is never referenced)
```

### Dead Code: Remove Unreferenced Exports in products.ts

```typescript
// BEFORE — src/lib/stripe/products.ts (lines 57-66):
export function getTierDisplayName(tier: Tier): string {
  return TIER_CONFIG[tier].name;
}

export function getTierFeatures(tier: Tier): string[] {
  return TIER_CONFIG[tier].features;
}

// AFTER: Delete both functions entirely.
// They are only defined here and never imported anywhere else.
```

### Webhook URL Fix

```typescript
// BEFORE — src/app/api/webhooks/stripe/route.ts line 308:
return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,

// AFTER:
return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
```

---

## Current State Assessment

### What Exists (Don't Re-build)

| Item | File | State |
|------|------|-------|
| Admin layout | `src/app/(dashboard)/admin/layout.tsx` | Auth check exists, role check commented out — activate it |
| Admin API route | `src/app/api/admin/trial-extensions/route.ts` | Comment says "MVP tradeoff" — add role check |
| Admin pages | `admin/webhooks/page.tsx`, `admin/trial-extensions/page.tsx` | Fully built, just need protection |
| Payment failed webhook | `src/app/api/webhooks/stripe/route.ts` | Working, just wrong URL on line 308 |
| Pricing page | `src/app/(marketing)/pricing/page.tsx` | Fully built, just needs nav link |
| Marketing layout | `src/app/(marketing)/layout.tsx` | Has header/footer, needs pricing link |
| Sidebar | `src/components/layout/app-sidebar.tsx` | Client component with session, needs admin section |

### Dead Code Inventory

| Item | File | Action |
|------|------|--------|
| `import { TIER_LEVELS }` | `src/components/pricing/feature-comparison-table.tsx` line 13 | Remove import |
| `import { cn }` | `src/components/pricing/feature-comparison-table.tsx` line 14 | Remove import (not used) |
| `getTierDisplayName` export | `src/lib/stripe/products.ts` lines 57-59 | Remove function |
| `getTierFeatures` export | `src/lib/stripe/products.ts` lines 64-66 | Remove function |
| `schema.ts.bak` | `src/lib/db/schema.ts.bak` | Delete file |
| `_ul` | Project root | Delete artifact file |
| `_ul-CORSAIRONEPRO` | Project root | Delete artifact file |
| `_ul-CORSAIRONEPRO-2` | Project root | Delete artifact file |

**Note on `TIER_LEVELS` in `config.ts`:** The export in `src/lib/features/config.ts` is used by `canTierAccessFeature()` internally on line 87–88. The re-export in `src/lib/features/index.ts` is safe to keep since `TIER_LEVELS` is also a useful utility. The only problem is the unused import in `feature-comparison-table.tsx`.

**Note on `_ul` files:** These are in the git untracked list (status shows `?? _ul`, `?? _ul-CORSAIRONEPRO`, `?? _ul-CORSAIRONEPRO-2`). These look like development artifacts and should be deleted/gitignored.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Middleware-based admin gating | Layout-level `auth()` + redirect | Next.js 13+ App Router | Simpler, less edge cases, sufficient for non-high-traffic admin |
| Separate admin JWT field | `session.user.role` via JWT callback | NextAuth v5 | One consistent auth pattern |
| `.eslintrc.json` | `eslint.config.mjs` (flat config) | ESLint v9 | Project already on flat config — use `rules` override block |

---

## Open Questions

1. **Should `ADMIN_EMAIL` be added to `.env.example`?**
   - What we know: The bootstrap script reads `process.env.ADMIN_EMAIL`. No such variable exists in `.env.example` currently.
   - What's unclear: Whether adding it to `.env.example` is in scope.
   - Recommendation: Yes, add `ADMIN_EMAIL=""` to `.env.example` as part of the seed script task. Low-effort documentation.

2. **Should `_ul` files be deleted or gitignored?**
   - What we know: They're listed in git status as untracked (`?? _ul`, etc.). They look like editor/tool artifacts.
   - What's unclear: Whether they're actively needed for any local tooling.
   - Recommendation: Delete them. If needed, they can be regenerated. Alternatively add to `.gitignore`.

3. **Does the ESLint rule override affect build time?**
   - What we know: Next.js runs ESLint during `next build` by default.
   - What's unclear: Whether `"warn"` vs `"error"` matters for CI.
   - Recommendation: Use `"warn"` not `"error"`. The project likely has existing warnings; `"error"` would fail the build for any currently-unused variable.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `src/lib/auth/config.ts`, `src/types/next-auth.d.ts`, `src/app/(dashboard)/admin/layout.tsx`, `src/app/api/admin/trial-extensions/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/lib/db/schema.ts`, `src/lib/stripe/products.ts`, `src/components/pricing/feature-comparison-table.tsx`, `src/app/(marketing)/layout.tsx`
- Migration journal: `src/lib/db/migrations/meta/_journal.json` — confirms next migration index is 0010
- `eslint.config.mjs` — confirms ESLint v9 flat config, no existing rules override block
- `package.json` — confirms all required libraries are installed

### Secondary (MEDIUM confidence)

- NextAuth v5 JWT/session callback patterns — verified against existing working implementation in this codebase

---

## Metadata

**Confidence breakdown:**
- URL fix: HIGH — single line identified, correct URL confirmed from settings billing page existence
- Admin role schema: HIGH — Drizzle pgEnum pattern is used 8 times in existing schema
- NextAuth session extension: HIGH — existing pattern is clear and working for 5 other fields
- Admin layout guard: HIGH — boilerplate already written and commented out
- Admin API role check: HIGH — inline pattern explicitly decided, one file to change
- Sidebar admin nav: HIGH — client component with useSession, conditional render is standard React
- Pricing nav link: HIGH — straightforward JSX addition to existing layout
- Dead code removal: HIGH — all dead code precisely identified with file + line numbers
- ESLint config: MEDIUM — ESLint v9 flat config `rules` override is standard but verify rule name with `@typescript-eslint`
- Admin bootstrap script: HIGH — follows exact same pattern as `src/scripts/seed-stripe-prices.ts`

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable tech, 30 days)
