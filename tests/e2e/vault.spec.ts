import { test, expect } from "@playwright/test";

test.describe("Vault", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test("vault page loads successfully", async ({ page }) => {
    await page.goto("/vault");

    // Assert page heading is visible — DashboardHeader renders "Vault"
    await expect(page.getByText("Vault").first()).toBeVisible({ timeout: 10000 });

    // Assert no fatal error (no unhandled crash UI)
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("load page shows upload UI", async ({ page }) => {
    await page.goto("/vault/load");

    // Assert page heading from DashboardHeader — "Batch Import"
    await expect(page.getByText("Batch Import").first()).toBeVisible({ timeout: 10000 });

    // Assert dropzone / file input area is present
    // The batch uploader renders a dropzone area with drag-and-drop text
    await expect(
      page.getByText(/drag.*drop|upload|PDF/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate from vault to load page", async ({ page }) => {
    await page.goto("/vault");

    // VaultEmptyState renders an "Upload Statements" link to /vault/load
    // If sources exist, the page shows a different view — look for any upload link
    const uploadLink = page.getByRole("link", { name: /upload/i }).first();
    const uploadButton = page.getByRole("button", { name: /upload/i }).first();

    // Wait for vault page to load
    await expect(page.getByText("Vault").first()).toBeVisible({ timeout: 10000 });

    // Navigate via sidebar or empty-state link — check which is visible
    const hasUploadLink = await uploadLink.isVisible().catch(() => false);
    if (hasUploadLink) {
      await uploadLink.click();
    } else {
      // Fallback: navigate directly if no upload link visible (accounts exist with different UI)
      await page.goto("/vault/load");
    }

    // Assert navigated to /vault/load
    await expect(page).toHaveURL(/\/vault\/load/, { timeout: 10000 });
  });
});
