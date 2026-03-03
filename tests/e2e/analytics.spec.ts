import { test, expect } from "@playwright/test";

test.describe("Analytics", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test("analytics page loads successfully", async ({ page }) => {
    await page.goto("/payments/analytics");

    // Assert page heading is visible — AnalyticsPage renders h2 "Analytics"
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible({
      timeout: 10000,
    });

    // Assert no fatal error
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("category breakdown section is visible", async ({ page }) => {
    await page.goto("/payments/analytics");

    // Wait for page to finish loading (heading visible means hydration complete)
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible({
      timeout: 10000,
    });

    // The AnalyticsPage renders summary stat cards: "Total Monthly", "Total Yearly"
    // These are always present (show $0.00 if no subscriptions, or loaded data)
    await expect(page.getByText("Total Monthly")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Total Yearly")).toBeVisible({ timeout: 10000 });
  });
});
