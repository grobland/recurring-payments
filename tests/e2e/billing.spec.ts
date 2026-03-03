import { test, expect } from "@playwright/test";

test.describe("Billing", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test("billing page loads successfully", async ({ page }) => {
    await page.goto("/settings/billing");

    // The billing page has a "Current Plan" card — assert it loads
    // DashboardHeader renders a title; BillingPage has "Current Plan" card
    await expect(page.getByText("Current Plan")).toBeVisible({ timeout: 15000 });

    // Assert no fatal error
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("current plan tier is displayed", async ({ page }) => {
    await page.goto("/settings/billing");

    // Wait for the billing page to load (API call to /api/billing/prices required)
    await expect(page.getByText("Current Plan")).toBeVisible({ timeout: 15000 });

    // The billing page shows one of: "Free Trial", "Free Plan", or "Pro Plan"
    // depending on user's billing status. All contain "Plan" or "Trial".
    await expect(
      page.getByText(/Free Trial|Free Plan|Pro Plan|Primary|Enhanced|Advanced/i).first()
    ).toBeVisible({ timeout: 15000 });

    // Assert pricing cards section loads (shows "Choose a Plan")
    await expect(page.getByText("Choose a Plan")).toBeVisible({ timeout: 15000 });
  });
});
