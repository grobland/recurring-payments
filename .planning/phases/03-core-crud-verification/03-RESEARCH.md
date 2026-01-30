# Phase 3: Core CRUD Verification - Research

**Researched:** 2026-01-30
**Domain:** Playwright E2E Testing for CRUD operations with NextAuth authentication
**Confidence:** HIGH

## Summary

This phase focuses on verifying existing CRUD functionality for subscriptions through E2E tests and manual verification. The codebase already has complete CRUD implementation:

- **API Routes:** `POST /api/subscriptions` (create), `GET /api/subscriptions` (list), `GET /api/subscriptions/[id]` (read), `PATCH /api/subscriptions/[id]` (update), `DELETE /api/subscriptions/[id]` (soft delete), `POST /api/subscriptions/[id]/restore` (restore)
- **UI Pages:** `/subscriptions/new` (create form), `/subscriptions` (list), `/subscriptions/[id]` (detail), `/subscriptions/[id]/edit` (edit form)
- **Validation:** Zod schemas in `src/lib/validations/subscription.ts` with clear error messages
- **State Management:** TanStack Query hooks in `src/lib/hooks/use-subscriptions.ts` with cache invalidation

The primary work is setting up Playwright authentication (the missing `auth.setup.ts`) and writing comprehensive E2E tests that verify these flows work correctly, including edge cases for special characters, validation errors, and dashboard updates.

**Primary recommendation:** Create `tests/auth.setup.ts` using credentials-based login flow, then write CRUD E2E tests that use Playwright's `waitForResponse` to verify API calls complete before asserting UI state.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | ^1.57.0 | E2E testing framework | Already installed, official Playwright test runner |
| next-auth | ^5.0.0-beta.30 | Authentication | Already implemented, Credentials provider available |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| path | (built-in) | File path handling for storageState | Auth setup file paths |

### Testing Structure Already Present
| Component | Location | Purpose |
|-----------|----------|---------|
| Playwright config | `playwright.config.ts` | Test runner configuration |
| E2E test directory | `tests/e2e/` | E2E test files |
| Test fixtures | `tests/fixtures/` | Test data files |
| Unit test setup | `tests/setup.ts` | Vitest mocking |

**No new packages needed.**

## Architecture Patterns

### Recommended Test Directory Structure
```
tests/
├── auth.setup.ts           # NEW: Authentication setup (login + save state)
├── e2e/
│   ├── pdf-import.spec.ts  # Existing (skipped, needs auth)
│   └── subscriptions.spec.ts  # NEW: CRUD verification tests
├── fixtures/
│   └── bank-statement-sample.png  # Existing
└── setup.ts                # Existing: Vitest mocking
playwright/
└── .auth/
    └── user.json           # NEW: Saved auth state (gitignored)
```

### Pattern 1: Authentication Setup with Storage State
**What:** Save authenticated browser state to reuse across tests
**When to use:** All authenticated E2E tests
**Example:**
```typescript
// Source: https://playwright.dev/docs/auth
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');

  // Fill credentials (use test account)
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);

  // Submit and wait for redirect
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');

  // Verify logged in
  await expect(page.getByText('Dashboard')).toBeVisible();

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
```

### Pattern 2: Project-Based Setup Dependencies
**What:** Configure Playwright projects to run setup first
**When to use:** `playwright.config.ts` to ensure auth runs before tests
**Example:**
```typescript
// Source: https://playwright.dev/docs/auth
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  projects: [
    // Setup project - runs auth.setup.ts first
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Chromium with auth
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Additional browsers...
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Pattern 3: Wait for API Response Before Asserting
**What:** Use `waitForResponse` to ensure CRUD operations complete
**When to use:** After clicking submit/delete buttons
**Example:**
```typescript
// Source: https://playwright.dev/docs/network
test('can add subscription', async ({ page }) => {
  await page.goto('/subscriptions/new');

  // Fill form
  await page.getByLabel('Name').fill('Netflix');
  await page.getByLabel('Amount').fill('15.99');

  // Wait for API response when submitting
  const responsePromise = page.waitForResponse('**/api/subscriptions');
  await page.getByRole('button', { name: 'Create Subscription' }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(201);

  // Now verify UI updated
  await expect(page.getByText('Subscription created successfully')).toBeVisible();
});
```

### Pattern 4: Role-Based Locators
**What:** Use accessibility-friendly selectors
**When to use:** All element interactions
**Example:**
```typescript
// Source: https://playwright.dev/docs/best-practices
// Good: Uses ARIA roles and accessible names
await page.getByRole('button', { name: 'Add Subscription' }).click();
await page.getByLabel('Name').fill('Spotify');
await page.getByRole('combobox', { name: 'Category' }).click();
await page.getByRole('option', { name: 'Entertainment' }).click();

// Avoid: CSS selectors or implementation details
// await page.locator('.submit-btn').click();
// await page.locator('input[name="name"]').fill('Spotify');
```

### Anti-Patterns to Avoid
- **Hard-coded waits:** Don't use `page.waitForTimeout(1000)`. Use `waitForResponse` or `waitForURL` instead
- **Testing implementation details:** Don't assert on internal state. Assert on visible UI changes
- **Shared test state:** Each test should create its own data. Don't rely on data from previous tests
- **Flaky selectors:** Don't use generated class names. Use roles, labels, and test IDs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth state persistence | Manual cookie manipulation | `storageState` | Handles all cookies, localStorage, sessionStorage |
| Waiting for API calls | `setTimeout` or polling | `waitForResponse` | Built-in retry, proper timing |
| Form field interaction | `.locator('input[name=x]')` | `getByLabel()`, `getByRole()` | More stable, accessibility-friendly |
| Multiple assertions | Sequential expects | `expect.soft()` | Reports all failures, not just first |

**Key insight:** Playwright's built-in methods handle timing and flakiness automatically. Custom solutions introduce race conditions.

## Common Pitfalls

### Pitfall 1: Auth State Not Saved Correctly
**What goes wrong:** Tests fail with "Unauthorized" despite auth.setup.ts running
**Why it happens:** Storage state path mismatch or auth file not created
**How to avoid:**
- Verify paths match exactly between auth.setup.ts and config
- Add `.gitignore` entry for `playwright/.auth/`
- Add assertion in auth.setup.ts to verify login succeeded
**Warning signs:** All tests redirect to /login

### Pitfall 2: Race Conditions with Dashboard Updates
**What goes wrong:** Test asserts before UI reflects the change
**Why it happens:** TanStack Query invalidation is async
**How to avoid:**
- Use `waitForResponse` to wait for API call
- Use `expect(locator).toHaveText()` which auto-retries
- Avoid manual assertions on immediate values
**Warning signs:** Tests pass locally but fail in CI

### Pitfall 3: Test Isolation Issues with Subscriptions
**What goes wrong:** Tests interfere with each other via shared data
**Why it happens:** Tests create real data in the database
**How to avoid:**
- Each test should clean up its own data OR
- Use unique names with timestamps/UUIDs
- Consider API calls for cleanup in `afterEach`
**Warning signs:** Tests fail when run in different order

### Pitfall 4: Special Characters Breaking Tests
**What goes wrong:** Emojis or unicode in subscription names cause failures
**Why it happens:** Encoding issues or selector escaping problems
**How to avoid:**
- Use `page.fill()` which handles encoding
- Use text matchers with `exact: false` for partial matching
- Test special characters explicitly as edge cases
**Warning signs:** Tests work with ASCII but fail with unicode

### Pitfall 5: Soft Delete Verification
**What goes wrong:** Deleted subscription still appears in tests
**Why it happens:** Testing wrong endpoint or filter state
**How to avoid:**
- DELETE sets `deletedAt`, subscription is filtered by default
- Verify subscription NOT visible in main list
- Could test with `includeDeleted=true` to verify it exists but is marked deleted
**Warning signs:** Count doesn't decrease after delete

## Code Examples

Verified patterns from official sources:

### Auth Setup File
```typescript
// tests/auth.setup.ts
// Source: https://playwright.dev/docs/auth
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  // Fill login form (matching the LoginForm component structure)
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD || 'testpassword');

  // Click sign in button
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for navigation to dashboard (login success)
  await page.waitForURL('/dashboard');

  // Verify we're logged in
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
```

### CRUD Test Structure
```typescript
// tests/e2e/subscriptions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Subscription CRUD', () => {
  test('can add a new subscription', async ({ page }) => {
    await page.goto('/subscriptions/new');

    // Fill required fields
    await page.getByLabel('Name').fill('Test Netflix');
    await page.getByLabel('Amount').fill('15.99');

    // Select from dropdowns
    await page.getByRole('combobox', { name: 'Currency' }).click();
    await page.getByRole('option', { name: /USD/ }).click();

    await page.getByRole('combobox', { name: 'Frequency' }).click();
    await page.getByRole('option', { name: 'Monthly' }).click();

    // Submit and wait for API
    const responsePromise = page.waitForResponse('**/api/subscriptions');
    await page.getByRole('button', { name: 'Create Subscription' }).click();
    const response = await responsePromise;

    expect(response.status()).toBe(201);

    // Verify toast and navigation
    await expect(page.getByText('Subscription created successfully')).toBeVisible();
    await expect(page).toHaveURL('/subscriptions');
    await expect(page.getByText('Test Netflix')).toBeVisible();
  });

  test('shows validation errors for empty name', async ({ page }) => {
    await page.goto('/subscriptions/new');

    // Try to submit without filling name
    await page.getByRole('button', { name: 'Create Subscription' }).click();

    // Verify validation message (from Zod schema: "Name is required")
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('can edit an existing subscription', async ({ page }) => {
    // First create a subscription via API (faster setup)
    // Or navigate to an existing one

    await page.goto('/subscriptions');

    // Click edit on first subscription
    await page.getByRole('row').first().getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    // Modify amount
    await page.getByLabel('Amount').clear();
    await page.getByLabel('Amount').fill('19.99');

    // Save and verify
    const responsePromise = page.waitForResponse('**/api/subscriptions/**');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await responsePromise;

    await expect(page.getByText('Subscription updated successfully')).toBeVisible();
  });

  test('can delete a subscription', async ({ page }) => {
    await page.goto('/subscriptions');

    // Get initial count
    const initialRows = await page.getByRole('row').count();

    // Delete first subscription
    await page.getByRole('row').first().getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // Wait for DELETE API call
    const responsePromise = page.waitForResponse(resp =>
      resp.url().includes('/api/subscriptions/') && resp.request().method() === 'DELETE'
    );
    await responsePromise;

    // Verify toast with undo option
    await expect(page.getByText('deleted')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();

    // Verify row count decreased
    await expect(page.getByRole('row')).toHaveCount(initialRows - 1);
  });
});
```

### Special Characters Test
```typescript
test('handles special characters in subscription name', async ({ page }) => {
  await page.goto('/subscriptions/new');

  // Test with emojis and unicode
  const specialName = 'Netflix Premium HD';
  await page.getByLabel('Name').fill(specialName);
  await page.getByLabel('Amount').fill('15.99');

  // Complete form and submit
  const responsePromise = page.waitForResponse('**/api/subscriptions');
  await page.getByRole('button', { name: 'Create Subscription' }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(201);

  // Navigate to list and verify
  await page.goto('/subscriptions');
  await expect(page.getByText(specialName)).toBeVisible();
});
```

### Dashboard Verification
```typescript
test('dashboard updates after adding subscription', async ({ page }) => {
  // Check initial count
  await page.goto('/dashboard');
  const initialCountText = await page.getByText(/Active Subscriptions/).locator('..').getByRole('heading').textContent();
  const initialCount = parseInt(initialCountText || '0');

  // Add new subscription
  await page.goto('/subscriptions/new');
  await page.getByLabel('Name').fill('Test Service');
  await page.getByLabel('Amount').fill('9.99');

  const responsePromise = page.waitForResponse('**/api/subscriptions');
  await page.getByRole('button', { name: 'Create Subscription' }).click();
  await responsePromise;

  // Navigate back to dashboard and verify count increased
  await page.goto('/dashboard');

  await expect(page.getByText(/Active Subscriptions/).locator('..').getByRole('heading'))
    .toHaveText(String(initialCount + 1));
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global setup functions | Project-based setup with dependencies | Playwright 1.30+ | Better control, parallel execution |
| Manual cookie handling | `storageState` | Playwright 1.0+ | Handles all browser state |
| `waitForTimeout` | `waitForResponse`, `waitForURL` | Best practice | Eliminates flakiness |
| CSS selectors | Role-based locators | Playwright 1.27+ | More stable, accessibility |

**Deprecated/outdated:**
- `page.type()` for simple fills: Use `page.fill()` instead (faster, more reliable)
- `page.waitForNavigation()`: Prefer `page.waitForURL()` (more explicit)

## Open Questions

Things that couldn't be fully resolved:

1. **Test User Creation Strategy**
   - What we know: Need a test user with email/password for Credentials login
   - What's unclear: Should we seed the database with a test user or create one via registration in setup?
   - Recommendation: Use existing Credentials provider with seeded test user via environment variables. Add `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` to `.env.local`

2. **Test Data Cleanup**
   - What we know: Tests create real subscriptions in the database
   - What's unclear: Should we clean up after each test, use unique names, or reset database?
   - Recommendation: Use unique names with `Date.now()` suffix. Clean up specific test data in `afterEach` hooks via API calls

3. **Currency Display in Dashboard**
   - What we know: Dashboard uses `user.displayCurrency` which may differ from subscription currency
   - What's unclear: How currency conversion is tested
   - Recommendation: Test with matching currencies first (USD), currency conversion is a separate concern

## Sources

### Primary (HIGH confidence)
- [Playwright Authentication Docs](https://playwright.dev/docs/auth) - auth.setup.ts pattern, storageState
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) - locator strategies, test isolation
- [Playwright Network Docs](https://playwright.dev/docs/network) - waitForResponse patterns

### Secondary (MEDIUM confidence)
- [Auth.js Testing Guide](https://authjs.dev/guides/testing) - Credentials provider for testing
- [BrowserStack Playwright Best Practices](https://www.browserstack.com/guide/playwright-best-practices) - CRUD testing patterns

### Tertiary (LOW confidence)
- Community examples for special character handling

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using already-installed Playwright, following official docs
- Architecture: HIGH - Official Playwright patterns, verified against codebase structure
- Pitfalls: HIGH - Based on official docs and verified against existing code patterns

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (Playwright is actively developed, check for updates)
