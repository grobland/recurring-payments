# Coding Conventions

**Analysis Date:** 2026-01-24

## Naming Patterns

**Files:**
- Components: PascalCase with descriptive names (e.g., `DashboardHeader.tsx`, `SubscriptionForm.tsx`)
- Pages: lowercase with hyphens (e.g., `page.tsx`, `layout.tsx`)
- Utilities/Hooks: camelCase (e.g., `use-subscriptions.ts`, `normalize.ts`)
- API routes: lowercase with hyphens in file paths (e.g., `/api/subscriptions/route.ts`)
- Types/Interfaces: separate `.d.ts` or `.ts` files in `src/types/` directory

**Functions:**
- Exported functions: camelCase (e.g., `getCurrentUser()`, `calculateNormalizedMonthly()`)
- React components: PascalCase (e.g., `DashboardHeader`, `SubscriptionForm`)
- Internal utilities: camelCase with descriptive verb prefixes (e.g., `parseDocumentForSubscriptions()`, `getTrialDaysRemaining()`)
- Custom hooks: camelCase with `use` prefix (e.g., `useSubscriptions()`, `useCategoryOptions()`)

**Variables:**
- Constants: SCREAMING_SNAKE_CASE (e.g., `TRIAL_DAYS`, `APP_NAME`, `SUPPORTED_CURRENCIES`)
- Variables: camelCase (e.g., `normalizedEmail`, `isLoggedIn`, `passwordHash`)
- Boolean variables: camelCase with `is` prefix (e.g., `isLoading`, `isAuthRoute`, `emailRemindersEnabled`)

**Types:**
- Interfaces: PascalCase with descriptive names (e.g., `DashboardHeaderProps`, `SubscriptionFormProps`)
- Type aliases: PascalCase (e.g., `SubscriptionWithCategory`, `CreateSubscriptionInput`)
- Enum values: lowercase or SCREAMING_SNAKE_CASE depending on context (e.g., `subscription_status` enum has lowercase values)

## Code Style

**Formatting:**
- Tailwind CSS v4 with `cn()` utility from `@/lib/utils` for className merging
- No Prettier config found; ESLint enforces formatting
- Consistent indentation and spacing

**Linting:**
- ESLint v9 with Next.js v16 presets
- Config: `eslint.config.mjs`
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Run with: `npm run lint`

## Import Organization

**Order:**
1. External packages/dependencies (React, Next.js, third-party libraries)
2. Internal absolute imports using `@/` path alias
3. Type imports (using `import type { ... }`)
4. Side effects (if needed)

**Examples:**
```typescript
// External
import { useQuery, useMutation } from "@tanstack/react-query";
import { NextResponse } from "next/server";
import { format } from "date-fns";

// Internal
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types
import type { DashboardHeaderProps } from "@/types/dashboard";
import type { UseQueryOptions } from "@tanstack/react-query";
```

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Used consistently throughout the codebase for all internal imports

## Error Handling

**Patterns:**
- Try-catch blocks in API routes with generic error responses
- Console.error() for logging errors (e.g., in `src/app/api/auth/register/route.ts`)
- Graceful error handling with `.safeParse()` from Zod for validation
- Non-critical failures (like email sending) don't block main operations; caught and logged separately
- API routes return NextResponse with appropriate HTTP status codes:
  - 400 for validation errors
  - 401 for unauthorized
  - 409 for conflicts (e.g., user already exists)
  - 500 for server errors

**Example:**
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }
    // Process valid data
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
```

## Logging

**Framework:** Native `console` object (console.error, console.warn, etc.)

**Patterns:**
- Console.error() for critical failures: `console.error("Registration error:", error)`
- Include context in error messages (operation name or file context)
- Non-blocking operations log errors but don't propagate (e.g., email failures)
- No structured logging framework in use

**When to Log:**
- Errors in catch blocks
- Failed async operations with try-catch fallbacks
- External service failures (email, OpenAI API)

## Comments

**When to Comment:**
- Explain "why" not "what" for non-obvious logic
- Document complex algorithms or business logic
- Route-related comments (e.g., in middleware for protected/auth routes)
- Enum/constant groupings with section headers (e.g., `// ============ ENUMS ============`)

**JSDoc/TSDoc:**
- Used for exported hook functions with brief descriptions
- Format: Multi-line comments with leading `/**`
- Example from `use-subscriptions.ts`:
```typescript
/**
 * Fetch subscriptions with filters
 */
export function useSubscriptions(
  filters: SubscriptionFilters = {},
  options?: Omit<UseQueryOptions<SubscriptionsResponse, Error>, "queryKey" | "queryFn">
)
```

**No Complex Comment Style:**
- Single-line comments use `//`
- Section dividers use `// ============ SECTION ============` in schema files

## Function Design

**Size:**
- Functions kept reasonably focused, typically 50-100 lines for route handlers
- API routes combine validation, business logic, and response in single handler
- Utility functions are short and single-purpose (5-30 lines)

**Parameters:**
- Named parameters/destructuring for complex functions
- Type annotations required for all parameters
- Optional parameters use `?` syntax
- Props passed as interfaces (e.g., `SubscriptionFormProps`)

**Return Values:**
- API routes return `NextResponse` or `Response`
- Hooks return typed objects with data and metadata
- Async functions explicitly return `Promise<T>`
- Optional returns typed as `T | null` or `T | undefined`

**Example:**
```typescript
export async function parseDocumentForSubscriptions(
  base64Images: string[],
  mimeType: string = "image/png"
): Promise<ParseResult> {
  // Function body
  return { subscriptions, pageCount, processingTime };
}
```

## Module Design

**Exports:**
- Use named exports throughout (`export function`, `export const`)
- Default exports rare; only used for page components in Next.js
- Consistent export style across related modules

**Barrel Files:**
- Used strategically in some directories (e.g., `src/lib/hooks/index.ts`)
- Example: `src/components/layout/index.ts` re-exports layout components
- Reduces nested import paths

**Index Files Organization:**
```typescript
// src/lib/hooks/index.ts - Aggregates and exports hooks
export { useSubscriptions, useCreateSubscription, useDeleteSubscription } from "./use-subscriptions";
export { useCategories } from "./use-categories";
export { useUser } from "./use-user";
```

## Special Patterns

**Zod Validation Schemas:**
- Located in `src/lib/validations/[feature].ts`
- Separate schemas for form vs. API (form schema for react-hook-form, API schema with coercion)
- Type inference with `z.infer<typeof schema>`
- Example from `subscription.ts`: `createSubscriptionFormSchema` vs `createSubscriptionSchema` with different validation rules

**React Hook Form Integration:**
- Used with `zodResolver` from `@hookform/resolvers/zod`
- Props interface pattern for form components
- Consistent form field rendering pattern using `FormField`, `FormControl`, `FormItem`

**Database Schema:**
- Drizzle ORM used with PostgreSQL
- Schema file: `src/lib/db/schema.ts`
- Organized with section comments (e.g., `// ============ ENUMS ============`)
- Foreign key relationships defined via Drizzle `relations()`

**API Route Patterns:**
- Auth check first: `const session = await auth(); if (!session?.user?.id) return 401`
- Query building with Drizzle: `db.query.[table].findMany({ where: and(...conditions) })`
- Query string parsing: `const { searchParams } = new URL(request.url)`

---

*Convention analysis: 2026-01-24*
