# Testing Patterns

**Analysis Date:** 2026-01-24

## Test Framework

**Runner:**
- Vitest v4.0.17 (unit tests)
- Playwright v1.57.0 (E2E tests)
- Config files: `vitest.config.ts`, `playwright.config.ts`

**Assertion Library:**
- Built-in Vitest assertions + `@testing-library/jest-dom` v6.9.1

**Run Commands:**
```bash
npm run test              # Run unit tests with Vitest
npm run test:e2e          # Run E2E tests with Playwright
```

## Test File Organization

**Unit Tests Location:**
- `tests/unit/` directory (currently empty but configured)
- Include pattern: `tests/unit/**/*.test.{ts,tsx}`

**E2E Tests Location:**
- `tests/e2e/` directory (currently empty but configured)
- Test directory configured in Playwright: `testDir: "./tests/e2e"`

**Naming:**
- Unit tests: `[feature].test.ts` or `[component].test.tsx`
- E2E tests: `[feature].spec.ts` or `[flow].spec.ts`

**Structure:**
```
tests/
├── unit/                      # Unit tests directory
│   └── [feature]/
│       └── [name].test.ts     # Unit test file
├── e2e/                       # E2E tests directory
│   └── [flow].spec.ts         # E2E test file
├── fixtures/                  # Test data and fixtures
└── setup.ts                   # Test setup/configuration
```

## Vitest Configuration

**Config File:** `vitest.config.ts`

**Key Settings:**
```typescript
test: {
  environment: "jsdom",          // Browser-like environment
  globals: true,                 // Use global test/describe/expect
  setupFiles: ["./tests/setup.ts"],  // Setup file for all tests
  include: ["tests/unit/**/*.test.{ts,tsx}"],
  coverage: {
    reporter: ["text", "json", "html"],
    exclude: ["node_modules/", "tests/"],
  }
}
```

**Resolution Alias:**
- Path alias `@/` maps to `./src` (matches tsconfig.json)

## Playwright Configuration

**Config File:** `playwright.config.ts`

**Key Settings:**
```typescript
testDir: "./tests/e2e"
fullyParallel: true              // Run tests in parallel
forbidOnly: !!process.env.CI     // Fail in CI if .only() used
retries: process.env.CI ? 2 : 0  // Retry failed tests in CI
workers: process.env.CI ? 1 : undefined  // Use 1 worker in CI
reporter: "html"                 // HTML report output
```

**Browser Coverage:**
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5 device)

**Test Server:**
- Automatically starts dev server: `npm run dev`
- Base URL: `http://localhost:3000`
- Screenshot on failure enabled
- Trace on first retry enabled

## Test Structure

**Setup File:** `tests/setup.ts`

Contains global test mocks and configuration:

```typescript
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
```

## Mocking

**Framework:** Vitest's `vi` module

**Global Mocks:**
- `next/navigation` - useRouter, useSearchParams, usePathname
- `next-themes` - useTheme, ThemeProvider
- Set up in `tests/setup.ts` and applied to all test files

**Mocking Pattern:**
```typescript
vi.mock("module-name", () => ({
  functionName: vi.fn(),
  componentName: ({ children }) => children,
}));
```

**What to Mock:**
- Next.js navigation (useRouter, useSearchParams, usePathname)
- Theme provider and hooks
- External API clients (OpenAI, Stripe, etc.)
- Database connections
- Email sending services
- Any external async dependencies

**What NOT to Mock:**
- Pure utility functions
- Date/time utilities if testing time-based logic
- Zod validation schemas
- React Hook Form validation logic
- Local storage/sessionStorage unless testing persistence specifically

## Fixtures and Factories

**Test Data Location:**
- `tests/fixtures/` directory (currently empty but configured)

**Pattern (recommended for future implementation):**
```typescript
// tests/fixtures/subscription.fixture.ts
export const mockSubscription = {
  id: "sub-123",
  name: "Netflix",
  amount: 15.99,
  currency: "USD",
  frequency: "monthly" as const,
  status: "active" as const,
};

// Usage in tests
const subscription = { ...mockSubscription, name: "Spotify" };
```

## Coverage

**Requirements:** No coverage threshold enforced currently

**View Coverage:**
```bash
npm run test -- --coverage
```

**Coverage Reports:**
- Text format (console output)
- JSON format (for CI/CD)
- HTML format (interactive browser view)
- Excludes: `node_modules/`, `tests/` directory

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, component logic
- Approach: Isolated component/function testing with mocked dependencies
- Location: `tests/unit/`
- Testing Library for React components

**Integration Tests:**
- Not explicitly separated; would live in `tests/unit/` or special `tests/integration/`
- Test interaction between multiple modules/services
- Example: API route testing with database operations

**E2E Tests:**
- Framework: Playwright
- Scope: Full user workflows (login, create subscription, export data, etc.)
- Location: `tests/e2e/`
- Tests real browser interactions and full application flow
- Automatically starts dev server before running

## Common Patterns (Recommended)

**Async Testing:**
```typescript
// Vitest handles async automatically
describe("API Routes", () => {
  it("should fetch subscriptions", async () => {
    const result = await fetchSubscriptions({ status: "active" });
    expect(result).toHaveProperty("subscriptions");
  });
});
```

**Error Testing:**
```typescript
it("should handle validation errors", () => {
  const result = subscriptionSchema.safeParse({ name: "" });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0].message).toContain("required");
});
```

**Component Testing with React Hook Form:**
```typescript
import { render, screen } from "@testing-library/react";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";

it("should render form fields", () => {
  render(
    <SubscriptionForm
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />
  );
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
});
```

**Mocking TanStack Query:**
```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

render(
  <QueryClientProvider client={queryClient}>
    <Component />
  </QueryClientProvider>
);
```

## Current Test Status

**Unit Tests:** No test files currently written
- Framework configured and ready
- Setup file in place with Next.js mocks
- Awaiting test implementation

**E2E Tests:** No test files currently written
- Framework configured and ready
- Browser configurations set up (Chromium, Firefox, WebKit, Mobile)
- Awaiting test implementation

**Recommended First Tests:**
1. Authentication flows (login, register, logout)
2. Subscription CRUD operations
3. Dashboard data display
4. PDF import workflow
5. Email reminders

---

*Testing analysis: 2026-01-24*
