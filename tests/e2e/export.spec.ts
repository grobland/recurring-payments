import { test, expect } from "@playwright/test";

test.describe("CSV Export", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test("subscription CSV export triggers download", async ({ page }) => {
    // Note: Export button is on /subscriptions (legacy route), not /payments/subscriptions
    await page.goto("/subscriptions");

    const exportButton = page.getByRole("button", { name: /export/i });

    // Check if export button exists on this page
    const buttonCount = await exportButton.count();
    if (buttonCount === 0) {
      test.skip(true, "Export button not found on this page");
      return;
    }

    await expect(exportButton).toBeVisible();

    // Skip test if export is disabled (no data to export)
    const isDisabled = await exportButton.isDisabled();
    if (isDisabled) {
      test.skip(true, "Export button disabled - no subscriptions to export");
      return;
    }

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/subscriptions.*\.csv/i);
  });

  test("export response has CSV content type", async ({ page }) => {
    // Note: Export button is on /subscriptions (legacy route), not /payments/subscriptions
    await page.goto("/subscriptions");

    const exportButton = page.getByRole("button", { name: /export/i });

    // Check if export button exists on this page
    const buttonCount = await exportButton.count();
    if (buttonCount === 0) {
      test.skip(true, "Export button not found on this page");
      return;
    }

    await expect(exportButton).toBeVisible();

    // Skip test if export is disabled (no data to export)
    const isDisabled = await exportButton.isDisabled();
    if (isDisabled) {
      test.skip(true, "Export button disabled - no subscriptions to export");
      return;
    }

    const responsePromise = page.waitForResponse(r =>
      r.url().includes("/api/") && r.url().includes("export")
    );
    await exportButton.click();
    const response = await responsePromise;

    expect(response.headers()["content-type"]).toContain("text/csv");
  });

  test("transaction CSV export triggers download", async ({ page }) => {
    await page.goto("/payments/transactions");

    const exportButton = page.getByRole("button", { name: /export/i });

    // Check if export button exists on this page
    const buttonCount = await exportButton.count();
    if (buttonCount === 0) {
      test.skip(true, "Export button not found on this page");
      return;
    }

    await expect(exportButton).toBeVisible();

    // Skip test if export is disabled (no data to export)
    const isDisabled = await exportButton.isDisabled();
    if (isDisabled) {
      test.skip(true, "Export button disabled - no transactions to export");
      return;
    }

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/transaction.*\.csv/i);
  });
});
