# Phase 41: E2E Test Infrastructure - Research

**Researched:** 2026-03-02
**Domain:** Playwright E2E testing, Next.js App Router, auth setup patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test data strategy:**
- Each test creates its own data fresh — no pre-seeded database
- Tests clean up after themselves (delete subscriptions/data created during the test)
- Dedicated test account (e.g., e2e-test@example.com) separate from development data
- Claude's discretion on whether to use API calls or UI for data setup per test — pick the approach that best fits what each test is verifying

**Failure debugging:**
- Screenshots on failure (already configured, keep it)
- Playwright trace files captured on first retry for step-by-step debugging
- Retry failed tests once before marking as failed — catches flaky tests without hiding real bugs
- HTML reporter in playwright-report/ — open with `npx playwright show-report`
- Capture browser console errors/warnings during test runs to diagnose issues where UI looks fine but errors fire underneath

### Claude's Discretion
- Browser scope (which browser projects to keep/remove from config)
- Flow coverage depth per area (how to distribute 25-30 tests across 9 flow areas)
- Whether to use API calls or UI forms for test data setup, per test
- Auth setup implementation approach (how to fix the broken auth.setup.ts)
- data-testid naming conventions and placement strategy

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | Existing E2E tests updated with correct v3.0 URLs and pass cleanly | URL audit documents all broken paths; fix strategy for auth.setup.ts and spec files identified |
| TEST-02 | 25-30 Playwright tests cover all major user flows (auth, subscriptions, vault, analytics, billing, accounts, export, overlap, onboarding) | Flow map identifies exact test count per area; existing 10 tests confirmed as baseline |
| TEST-03 | Interactive elements use data-testid attributes for reliable test selectors | Naming convention defined; target components and elements identified |
</phase_requirements>

---

## Summary

Phase 41 is a test infrastructure repair-and-expand phase. The project already has Playwright 1.57 installed with a working project setup structure (setup project + chromium/firefox/webkit/Mobile Chrome), but the auth setup and all existing spec files reference v1.0 URL paths that no longer exist in the v3.0 app. The root cause is that v3.0 reorganized subscription routes under `/payments/*` — the `auth.setup.ts` waits for `/dashboard` but the login form redirects to `/payments/dashboard` by default (`callbackUrl ?? "/payments/dashboard"`), causing auth setup to time out and cascade failures into all tests.

Three parallel work streams are needed: (1) fix the auth setup URL bug and tune `playwright.config.ts` retries/browser scope, (2) update all existing test URLs and selectors to match v3.0 paths, and (3) write ~20 new spec files covering the 7 flow areas that have zero coverage. A fourth stream adds `data-testid` attributes to interactive elements across the app.

Both `/subscriptions/*` and `/payments/subscriptions/*` routes exist in the codebase — they serve different pages with different post-action redirects. Tests must use the `/payments/subscriptions/*` paths (the v3.0 canonical routes), not the legacy `/subscriptions/*` paths.

**Primary recommendation:** Fix `auth.setup.ts` first (single-line URL change), then verify the auth flow works end-to-end before writing any new tests.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | 1.57.0 (installed) | E2E test runner + browser automation | Already in project; official Microsoft tool; handles auth, network, traces |
| TypeScript | (project standard) | Type-safe test files | Consistent with project; catches locator typos at compile time |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | (installed) | Load .env.local into test process | Already used in playwright.config.ts for TEST_USER_EMAIL / TEST_USER_PASSWORD |
| @playwright/test (request fixture) | built-in | Direct API calls for test data setup/teardown | When creating/deleting test data is faster than driving UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in `page.getByRole()` | CSS selectors / XPath | Role locators are user-facing and resilient; CSS breaks when classes change |
| `data-testid` on interactive elements | text-based locators | Text locators break when copy changes; testid is explicit contract |
| Single chromium project (local) | All 4 browser projects | Running 4 browsers locally is slow; chromium-only for local dev is faster |

**Installation:** Nothing new to install — `@playwright/test@1.57.0` is already present.

---

## Architecture Patterns

### Recommended Project Structure
```
tests/
├── auth.setup.ts          # FIXED: waitForURL("/payments/dashboard")
├── setup.ts               # Vitest unit test setup (unchanged)
├── fixtures/
│   └── bank-statement-sample.png
├── e2e/
│   ├── auth.spec.ts       # NEW: login, register, logout, invalid creds
│   ├── subscriptions.spec.ts  # UPDATED: fix URLs + add edit/delete cleanup
│   ├── vault.spec.ts      # NEW: vault page loads, doc list, empty state
│   ├── analytics.spec.ts  # NEW: analytics page loads, charts visible
│   ├── billing.spec.ts    # NEW: billing page loads, tier display
│   ├── accounts.spec.ts   # NEW: accounts page loads, add account
│   ├── export.spec.ts     # NEW: CSV export from subscriptions page
│   ├── overlap.spec.ts    # NEW: overlap badges appear when >1 sub in category
│   ├── onboarding.spec.ts # NEW: onboarding flow, skip, complete
│   ├── pdf-import.spec.ts # UPDATED: unskip and fix import flow
│   └── email-reminders.spec.ts # UPDATED: fix URL references
└── unit/
    ├── similarity.test.ts  (unchanged)
    └── pattern-detection.test.ts (unchanged)
```

### Pattern 1: Auth Setup — Fixed waitForURL
**What:** The single-line fix that unblocks all downstream tests.
**When to use:** `auth.setup.ts` — runs once before all spec files.

```typescript
// tests/auth.setup.ts — FIXED VERSION
import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) throw new Error("Missing TEST_USER_EMAIL / TEST_USER_PASSWORD");

  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // FIX: v3.0 login redirects to /payments/dashboard, not /dashboard
  await page.waitForURL("/payments/dashboard", { timeout: 15000 });
  await expect(page).toHaveURL("/payments/dashboard");

  await page.context().storageState({ path: authFile });
});
```

**Source:** Login form code confirms `callbackUrl ?? "/payments/dashboard"` — the default redirect target.

### Pattern 2: Console Error Capture
**What:** Captures browser console errors during every test run, per user decision.
**When to use:** Add to `playwright.config.ts` use block OR as a per-test beforeEach in a shared fixture.

```typescript
// In playwright.config.ts use block — or add to each test via beforeEach
use: {
  baseURL: "http://localhost:3000",
  trace: "on-first-retry",       // user decision: traces on first retry
  screenshot: "only-on-failure", // existing, keep
},

// In each spec's describe block — captures console errors for debugging
test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    }
  });
});
```

### Pattern 3: Self-Contained Test Data (Create + Cleanup)
**What:** Each test creates its own subscriptions and deletes them at the end.
**When to use:** All tests that create subscriptions. API-based teardown is faster than UI-based.

```typescript
test("can add a new subscription", async ({ page, request }) => {
  const uniqueName = `Test Sub ${Date.now()}`;
  let createdId: string | null = null;

  // Create via UI (tests UI flow)
  await page.goto("/payments/subscriptions/new");
  await page.getByLabel("Name").fill(uniqueName);
  await page.getByLabel("Amount").fill("9.99");
  const res = page.waitForResponse(r =>
    r.url().includes("/api/subscriptions") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create Subscription" }).click();
  const apiRes = await res;
  const body = await apiRes.json();
  createdId = body?.subscription?.id ?? null;

  // ... test assertions ...

  // Cleanup via API (faster than UI)
  if (createdId) {
    await request.delete(`/api/subscriptions/${createdId}`);
  }
});
```

### Pattern 4: data-testid Placement Strategy
**What:** Add `data-testid` to interactive elements that are hard to locate reliably by role or text.
**When to use:** Actions menus (MoreHorizontal buttons), table rows, form submit buttons that share names across pages.

```typescript
// Naming convention: kebab-case, component-action or component-element format
// Examples:
data-testid="subscription-actions-menu"    // MoreHorizontal dropdown trigger
data-testid="subscription-row"             // <tr> for each subscription
data-testid="create-subscription-submit"  // Submit button on new subscription form
data-testid="subscription-edit-menu-item" // Edit option in dropdown
data-testid="subscription-delete-menu-item" // Delete option in dropdown
data-testid="vault-empty-state"           // Empty state placeholder
data-testid="analytics-category-chart"   // Chart container
data-testid="onboarding-skip-btn"         // Skip setup button
data-testid="onboarding-continue-btn"     // Continue button
data-testid="billing-upgrade-btn"         // Upgrade CTA
```

**Source:** Playwright locator docs recommend `data-testid` when role/text locators aren't viable. The current subscriptions tests use `subscriptionRow.locator('button').last()` — a fragile positional selector that breaks when button count changes. `data-testid="subscription-actions-menu"` is the fix.

### Anti-Patterns to Avoid
- **`subscriptionRow.locator('button').last()`**: Positional selectors break when new buttons are added. Use `data-testid="subscription-actions-menu"` instead.
- **Hard-coded delay (`page.waitForTimeout`)**: Use `waitForResponse`, `waitForURL`, or `expect(...).toBeVisible()` instead.
- **Testing at `/subscriptions/*`**: Both the old and new routes exist. Tests MUST use `/payments/subscriptions/*` — the old routes redirect to themselves, not the v3.0 equivalents.
- **Running all 4 browser projects locally**: Mobile Chrome + WebKit add ~3x test time with zero extra coverage for a Next.js web app. Trim to chromium for local dev; keep multi-browser for CI.

---

## V3.0 URL Reference (Critical for TEST-01)

All existing test URLs are wrong. Here is the complete mapping:

| Old URL (in tests) | Correct v3.0 URL | Notes |
|--------------------|------------------|-------|
| `/dashboard` | `/payments/dashboard` | Auth setup waitForURL fix |
| `/subscriptions/new` | `/payments/subscriptions/new` | Old page still exists but redirects to `/subscriptions` after save |
| `/subscriptions` | `/payments/subscriptions` | Old page exists as separate route |
| `/subscriptions/:id/edit` | `/payments/subscriptions/:id/edit` | |
| `/import` | `/vault/load` | Import/upload route in v3.0 |

**Pages that exist in BOTH old and new paths (test MUST use new):**
- `/subscriptions` → legacy route, redirects to `/subscriptions` after save (self-referential)
- `/payments/subscriptions` → v3.0 route, redirects to `/payments/subscriptions` after save

**New v3.0 pages with zero test coverage:**
| URL | Content |
|-----|---------|
| `/payments/dashboard` | Main dashboard with analytics |
| `/payments/analytics` | Category pie + spending trends |
| `/payments/forecast` | Forecasting view |
| `/payments/transactions` | Transaction selector/subs |
| `/payments/suggestions` | AI subscription suggestions |
| `/payments/reminders` | Reminder settings |
| `/vault` | Document vault list |
| `/vault/load` | Upload bank statement (PDF import) |
| `/accounts` | Financial accounts list |
| `/onboarding` | 4-step onboarding wizard |
| `/settings` | Profile settings |
| `/settings/billing` | Billing/upgrade page |

---

## Test Distribution (TEST-02: 25-30 tests across 9 areas)

Recommended allocation based on risk and existing coverage:

| Flow Area | Count | Test Names |
|-----------|-------|------------|
| Auth (auth.spec.ts) | 4 | login success, login invalid creds, register new account, logout |
| Subscriptions (subscriptions.spec.ts) | 7 | create, validation empty name, validation invalid amount, edit, delete, special chars, navigate from dashboard — UPDATE existing 7 tests |
| Vault (vault.spec.ts) | 3 | vault page loads, load page loads (upload UI visible), navigate vault→load |
| Analytics (analytics.spec.ts) | 2 | analytics page loads with charts, category breakdown visible |
| Billing (billing.spec.ts) | 2 | billing page loads, tier display shows current plan |
| Accounts (accounts.spec.ts) | 2 | accounts page loads, add account flow |
| Export (export.spec.ts) | 3 | CSV export download triggers, response is CSV content-type, filename contains "subscriptions" |
| Overlap (overlap.spec.ts) | 3 | overlap badge appears when 2+ subs in same category, dismiss works, re-surfaces after add |
| Onboarding (onboarding.spec.ts) | 3 | skip setup flow, complete all 4 steps, step navigation back/forward |

**Total: 29 tests** (within 25-30 target)

**Note on existing tests:** The existing 7 subscriptions tests (subscriptions.spec.ts) and 3 email-reminders tests count toward TEST-02 once URLs are fixed. The pdf-import tests are all `test.skip()` — unskipping and fixing them adds 3 more if desired, but they require OpenAI API and are slow (90s timeout). Recommend keeping them skipped and adding separate file import UI smoke test instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth reuse across tests | Global beforeEach login | storageState + setup project | Already in place; login once, reuse across 25+ tests — avoids 25x login overhead |
| Test data isolation | Shared database seed | Per-test create + API delete | Seeds create ordering dependencies; per-test is fully isolated |
| Browser console capture | Custom reporter | `page.on("console", ...)` in beforeEach | Built into Playwright's Page API |
| Multi-browser coverage | Custom cross-browser harness | Playwright projects array | Already configured; just trim to chromium for local |

**Key insight:** The infrastructure is already 80% correct. The setup project pattern, storageState save location, HTML reporter, and trace-on-first-retry are all already configured. This phase is primarily URL fixes + new test files, not infrastructure overhaul.

---

## Common Pitfalls

### Pitfall 1: waitForURL Exact String vs Pattern
**What goes wrong:** `waitForURL("/payments/dashboard")` fails if the app appends query params (e.g., `/payments/dashboard?onboarding=true`). Tests silently time out.
**Why it happens:** Playwright's `waitForURL(string)` requires exact match by default.
**How to avoid:** Use glob or regex: `waitForURL("**/payments/dashboard**")` or `waitForURL(/\/payments\/dashboard/)`.
**Warning signs:** Tests pass locally but fail after onboarding feature ships (which may add query params to dashboard URL).

### Pitfall 2: Both /subscriptions and /payments/subscriptions Routes Exist
**What goes wrong:** Tests that navigate to `/subscriptions/new` appear to work (page loads) but after saving, the redirect goes to `/subscriptions` (old list), not `/payments/subscriptions` (new list). Assertions against the new list fail.
**Why it happens:** Both route trees exist in the app. The old tree (`src/app/(dashboard)/subscriptions/`) redirects to `/subscriptions` after save. The new tree (`src/app/(dashboard)/payments/subscriptions/`) redirects to `/payments/subscriptions` after save.
**How to avoid:** Always use `/payments/subscriptions/*` paths in tests. Never use `/subscriptions/*` paths.
**Warning signs:** `waitForURL("/subscriptions")` passes but data from test is not visible in the v3.0 subscription list.

### Pitfall 3: Actions Menu Button Positional Selector
**What goes wrong:** `subscriptionRow.locator('button').last()` breaks when new buttons are added to subscription rows (e.g., a quick-delete button or status badge).
**Why it happens:** Positional selectors (`first()`, `last()`, nth index) are coupled to DOM order.
**How to avoid:** Add `data-testid="subscription-actions-menu"` to the MoreHorizontal trigger button and use `page.getByTestId("subscription-actions-menu")`.
**Warning signs:** Edit/delete tests fail after any UI change to subscription table rows.

### Pitfall 4: Auth State Stale After Server Restart
**What goes wrong:** Tests fail with auth errors after restarting the dev server, even though `playwright/.auth/user.json` exists.
**Why it happens:** NextAuth session tokens are invalidated when NEXTAUTH_SECRET changes or when the server restarts with a new process (JWT re-signing).
**How to avoid:** Delete `playwright/.auth/user.json` and re-run setup when auth errors appear after server restart. Document this in the test README section.
**Warning signs:** All tests fail with redirect-to-login despite storageState being present.

### Pitfall 5: Parallel Tests Creating Race Conditions
**What goes wrong:** Two parallel tests both check "subscription appears in list" — test A's subscription appears in test B's list check, causing false positives or unstable assertions.
**Why it happens:** `fullyParallel: true` is enabled in `playwright.config.ts`.
**How to avoid:** Use `Date.now()` unique name suffix on all test data (already done in existing tests). Assert by exact name, not just presence of any subscription.
**Warning signs:** Subscription count assertions (`toHaveCount`) are flaky.

---

## Code Examples

### Example 1: Fixed auth.setup.ts
```typescript
// Source: playwright.dev/docs/auth + login-form.tsx (callbackUrl ?? "/payments/dashboard")
import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in .env.local"
    );
  }

  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // v3.0 fix: login-form.tsx defaults callbackUrl to "/payments/dashboard"
  await page.waitForURL("**/payments/dashboard**", { timeout: 15000 });

  await page.context().storageState({ path: authFile });
});
```

### Example 2: Updated playwright.config.ts
```typescript
// Source: playwright.dev/docs/test-configuration + CONTEXT.md decisions
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const authFile = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,  // CHANGED: 1 retry locally per user decision
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",       // kept per user decision
    screenshot: "only-on-failure", // kept per user decision
  },
  projects: [
    { name: "setup", testMatch: "**/auth.setup.ts" },
    {
      name: "chromium",            // primary local browser
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
      testMatch: "**/*.spec.ts",
    },
    // Firefox and WebKit: keep for CI, consider removing from local run
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], storageState: authFile },
      dependencies: ["setup"],
      testMatch: "**/*.spec.ts",
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Example 3: data-testid on SubscriptionRow actions button
```tsx
// Source: src/app/(dashboard)/payments/subscriptions/page.tsx (MoreHorizontal trigger)
// Current fragile selector: subscriptionRow.locator('button').last()
// Fix: add data-testid to the DropdownMenuTrigger

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      className="h-8 w-8 p-0"
      data-testid="subscription-actions-menu"  // ADD THIS
    >
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem data-testid="subscription-edit-menu-item">
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem data-testid="subscription-delete-menu-item">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Example 4: New auth.spec.ts pattern
```typescript
// Source: derived from existing auth.setup.ts + login-form.tsx structure
import { test, expect } from "@playwright/test";

// Auth tests run WITHOUT saved auth state — need unauthenticated context
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("login with valid credentials redirects to dashboard", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/payments\/dashboard/);
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("wrong@example.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("logout redirects to login page", async ({ page }) => {
    // Starts with saved auth state (storageState default from config)
    await page.goto("/payments/dashboard");
    // ... trigger logout via user menu
    await expect(page).toHaveURL("/login");
  });
});
```

### Example 5: Export test pattern
```typescript
// Source: playwright.dev/docs/downloads + REQUIREMENTS.md EXPRT-01
import { test, expect } from "@playwright/test";

test("CSV export downloads file with subscription data", async ({ page }) => {
  await page.goto("/payments/subscriptions");

  // Wait for subscriptions to load
  await expect(page.locator("table")).toBeVisible();

  // Trigger CSV download
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/subscriptions.*\.csv/i);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global setup file for auth | Setup project with storageState | Playwright 1.20+ | Auth runs once, reused by all projects |
| CSS/XPath selectors | Role-based locators + getByTestId | Playwright 1.x → current | Tests resilient to style changes |
| `page.waitForSelector` | `expect(locator).toBeVisible()` | Playwright 1.14+ | Auto-retry built in, better error messages |
| `page.waitForNavigation` | `page.waitForURL` | Playwright 1.x | Clearer intent for URL-based assertions |

**Deprecated/outdated in existing tests:**
- `page.waitForURL("/dashboard")` with exact string: works but fragile — prefer glob pattern `"**/dashboard**"` to survive query params
- `subscriptionRow.locator('button').last()`: positional, should be `getByTestId("subscription-actions-menu")`
- `test.skip(...)` in pdf-import.spec.ts: these were skipped because auth wasn't set up — with Phase 41 auth fixed, they could be re-enabled (but still slow due to OpenAI dependency)

---

## Open Questions

1. **Should `/subscriptions/*` old routes be removed or kept?**
   - What we know: Both `/subscriptions/*` and `/payments/subscriptions/*` route trees exist with separate page components. The old routes have their own pages that redirect back to `/subscriptions` after save.
   - What's unclear: Whether the old routes are intentionally kept for backward compatibility or are leftover from migration.
   - Recommendation: Tests should use `/payments/subscriptions/*` exclusively. Whether to clean up old routes is out of scope for Phase 41.

2. **How to test logout in auth.spec.ts?**
   - What we know: Logout is in the sidebar footer user menu dropdown (`signOut({ callbackUrl: "/login" })`). No `data-testid` exists on the logout button.
   - What's unclear: The user menu is inside a shadcn Sidebar — the DropdownMenuTrigger is the avatar button. Locating it by role ("button") may be ambiguous.
   - Recommendation: Add `data-testid="user-menu-trigger"` to the SidebarMenuButton in app-sidebar.tsx and `data-testid="user-menu-logout"` to the Log out DropdownMenuItem.

3. **Overlap tests — Phase 41 vs Phase 43 coordination?**
   - What we know: OVRLP-01/02/03 are Phase 43 requirements. Phase 41 TEST-02 says "overlap" is a flow area to cover.
   - What's unclear: If overlap UI doesn't exist yet, overlap tests will fail when written in Phase 41.
   - Recommendation: Write overlap test file as skeleton with `test.skip("overlap badge appears", ...)` — no placeholder stub, just the file and test names defined. Phase 43 un-skips them when the feature ships.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.57.0 |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test --project=chromium tests/e2e/auth.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | auth.setup.ts uses correct v3.0 URL | E2E smoke | `npx playwright test tests/auth.setup.ts` | ✅ (needs fix) |
| TEST-01 | subscriptions.spec.ts uses /payments/* URLs | E2E | `npx playwright test tests/e2e/subscriptions.spec.ts` | ✅ (needs fix) |
| TEST-01 | email-reminders.spec.ts uses /payments/* URLs | E2E | `npx playwright test tests/e2e/email-reminders.spec.ts` | ✅ (needs fix) |
| TEST-02 | auth flow tests (login/logout/register) | E2E | `npx playwright test tests/e2e/auth.spec.ts` | ❌ Wave 0 |
| TEST-02 | vault flow tests | E2E | `npx playwright test tests/e2e/vault.spec.ts` | ❌ Wave 0 |
| TEST-02 | analytics flow tests | E2E | `npx playwright test tests/e2e/analytics.spec.ts` | ❌ Wave 0 |
| TEST-02 | billing flow tests | E2E | `npx playwright test tests/e2e/billing.spec.ts` | ❌ Wave 0 |
| TEST-02 | accounts flow tests | E2E | `npx playwright test tests/e2e/accounts.spec.ts` | ❌ Wave 0 |
| TEST-02 | export flow tests | E2E | `npx playwright test tests/e2e/export.spec.ts` | ❌ Wave 0 |
| TEST-02 | overlap flow tests (skeleton) | E2E | `npx playwright test tests/e2e/overlap.spec.ts` | ❌ Wave 0 |
| TEST-02 | onboarding flow tests | E2E | `npx playwright test tests/e2e/onboarding.spec.ts` | ❌ Wave 0 |
| TEST-03 | data-testid on subscription actions menu | Manual verify | Covered by updated subscriptions.spec.ts | ❌ Wave 0 |
| TEST-03 | data-testid on user menu trigger/logout | Manual verify | Covered by auth.spec.ts logout test | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test --project=chromium tests/e2e/[file-being-changed].spec.ts`
- **Per wave merge:** `npx playwright test --project=chromium`
- **Phase gate:** `npm run test:e2e` (all projects) — full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/auth.spec.ts` — covers TEST-02 auth flow + TEST-01 (unauthenticated test setup)
- [ ] `tests/e2e/vault.spec.ts` — covers TEST-02 vault flow
- [ ] `tests/e2e/analytics.spec.ts` — covers TEST-02 analytics flow
- [ ] `tests/e2e/billing.spec.ts` — covers TEST-02 billing flow
- [ ] `tests/e2e/accounts.spec.ts` — covers TEST-02 accounts flow
- [ ] `tests/e2e/export.spec.ts` — covers TEST-02 export flow (also TEST-02 once EXPRT-01 ships in Phase 42)
- [ ] `tests/e2e/overlap.spec.ts` — skeleton for TEST-02 overlap (tests skipped until Phase 43)
- [ ] `tests/e2e/onboarding.spec.ts` — covers TEST-02 onboarding flow

---

## Sources

### Primary (HIGH confidence)
- Codebase audit (`tests/auth.setup.ts`, `src/app/(auth)/login/login-form.tsx`) — root cause of URL bug confirmed from source code: `callbackUrl ?? "/payments/dashboard"` + `waitForURL("/dashboard")`
- Codebase audit (page.tsx file listing) — complete v3.0 URL map verified from filesystem
- Codebase audit (`playwright.config.ts`) — existing config structure documented
- Playwright official docs (playwright.dev/docs/auth) — setup project pattern, storageState best practices
- Playwright official docs (playwright.dev/docs/locators) — locator priority, testIdAttribute configuration

### Secondary (MEDIUM confidence)
- WebSearch + playwright.dev/docs verification — `waitForURL` glob pattern recommendation for query-param resilience
- WebSearch — data-testid naming convention (kebab-case, component-action format) — matches Playwright docs guidance

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Playwright 1.57 already installed; version confirmed from node_modules
- Architecture: HIGH — URL bug root cause traced to source code; both old+new routes confirmed from filesystem
- Pitfalls: HIGH — Positional selector bug visible in existing test code; duplicate routes confirmed by file listing
- Test count distribution: MEDIUM — 29 tests across 9 areas is an estimate; actual count may shift during implementation

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (stable — Playwright releases are infrequent, URL structure won't change during v3.1)
