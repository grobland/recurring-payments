import { test, expect } from "@playwright/test";

test.describe("Accounts", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test("accounts page loads successfully", async ({ page }) => {
    await page.goto("/accounts");

    // DashboardHeader renders "data Vault" heading on the accounts page
    await expect(page.getByRole("heading", { name: /data vault/i })).toBeVisible({
      timeout: 10000,
    });

    // Assert no fatal error
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("add account button is accessible", async ({ page }) => {
    await page.goto("/accounts");

    // Wait for heading to confirm page loaded
    await expect(page.getByRole("heading", { name: /data vault/i })).toBeVisible({
      timeout: 10000,
    });

    // AccountList renders different states based on existing accounts:
    // - Empty state: "Add your first account" button
    // - Has accounts: "Add Account" button
    // Either way, there should be an "Add" button
    const addButton = page.getByRole("button", { name: /add.*account|add your first/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });

  test("account form has required fields", async ({ page }) => {
    await page.goto("/accounts");

    // Wait for heading to confirm page loaded
    await expect(page.getByRole("heading", { name: /data vault/i })).toBeVisible({
      timeout: 10000,
    });

    // Click the add account button to open the modal form
    const addButton = page.getByRole("button", { name: /add.*account|add your first/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // AccountForm opens as a dialog/sheet
    await expect(
      page.locator("[role='dialog']").first()
    ).toBeVisible({ timeout: 5000 });

    // The form should have a name input field
    await expect(
      page.getByLabel(/name/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
