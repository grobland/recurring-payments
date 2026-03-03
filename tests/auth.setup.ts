import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  // Validate required environment variables
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing required environment variables for Playwright authentication.\n" +
        "Please set TEST_USER_EMAIL and TEST_USER_PASSWORD in your .env.local file.\n\n" +
        "Steps to create a test user:\n" +
        "1. Start the dev server: npm run dev\n" +
        "2. Navigate to http://localhost:3000/register\n" +
        "3. Create an account with a test email\n" +
        "4. Add the credentials to .env.local:\n" +
        "   TEST_USER_EMAIL=your-test-email@example.com\n" +
        "   TEST_USER_PASSWORD=your-test-password"
    );
  }

  // Navigate to login page
  await page.goto("/login");

  // Wait for the login form to be visible
  await expect(page.locator("#email")).toBeVisible();

  // Fill in credentials
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);

  // Click the Sign in button
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect to dashboard (successful login)
  // Use glob pattern to handle query params (e.g., ?onboarding=true added by Phase 44)
  await page.waitForURL("**/payments/dashboard**", { timeout: 15000 });

  // Save authentication state for reuse in other tests
  await page.context().storageState({ path: authFile });
});
