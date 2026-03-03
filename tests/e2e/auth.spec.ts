import { test, expect } from "@playwright/test";

// Auth tests need unauthenticated context — override storageState
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test("login with valid credentials redirects to dashboard", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();

    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Assert redirected to /payments/dashboard (glob handles query params)
    await page.waitForURL("**/payments/dashboard**", { timeout: 15000 });
    await expect(page).toHaveURL(/\/payments\/dashboard/);
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();

    await page.locator("#email").fill("wrong@example.com");
    await page.locator("#password").fill("wrongpassword123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Assert error message visible (NextAuth returns "Invalid credentials" or similar)
    await expect(
      page.getByText(/invalid|incorrect|credentials|wrong/i)
    ).toBeVisible({ timeout: 10000 });

    // Assert still on /login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("register page loads with form fields", async ({ page }) => {
    await page.goto("/register");

    // Assert name, email, password fields visible
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // Assert "Create account" button visible
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();
  });

  test("logout redirects to login page", async ({ page }) => {
    // Auth state is empty (test.use above) — must log in via UI first
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/payments/dashboard**", { timeout: 15000 });

    // Trigger logout via user menu (data-testid from Plan 01)
    await page.getByTestId("user-menu-trigger").click();
    await page.getByTestId("user-menu-logout").click();

    // Assert redirected to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
