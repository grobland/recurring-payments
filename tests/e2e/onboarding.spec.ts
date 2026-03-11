import { test, expect } from "@playwright/test";

test.describe("Onboarding", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test("onboarding page loads successfully", async ({ page }) => {
    await page.goto("/onboarding");
    // The onboarding wizard shows "Welcome to Subscription Manager" on step 1
    await expect(page.getByText("Welcome to Subscription Manager")).toBeVisible();
    // Progress bar is visible (4-step wizard)
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    // Continue button is available
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("can navigate between onboarding steps", async ({ page }) => {
    await page.goto("/onboarding");
    // Verify we're on step 1 (Welcome)
    await expect(page.getByText("Welcome to Subscription Manager")).toBeVisible();

    // Click Continue to advance to step 2
    await page.getByRole("button", { name: "Continue" }).click();

    // Assert step 2 content appears - look for the form field unique to step 2
    await expect(page.getByLabel("Your Name")).toBeVisible();
    await expect(page.getByLabel("Display Currency")).toBeVisible();

    // Click Back to return to step 1
    await page.getByRole("button", { name: "Back" }).click();

    // Assert we're back on step 1
    await expect(page.getByText("Welcome to Subscription Manager")).toBeVisible();
  });

  test("skip setup navigates to dashboard", async ({ page }) => {
    await page.goto("/onboarding");
    // Verify Skip setup button is visible on step 1
    await expect(page.getByRole("button", { name: "Skip setup" })).toBeVisible();

    // Click Skip setup
    await page.getByRole("button", { name: "Skip setup" }).click();

    // Assert redirected to /payments/dashboard (handle query params with glob)
    await page.waitForURL("**/payments/dashboard**", { timeout: 10000 });
    await expect(page).toHaveURL(/\/payments\/dashboard/);
  });
});
