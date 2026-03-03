import { test, expect } from "@playwright/test";

test.describe("CSV Export", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test.skip("subscription CSV export triggers download", async ({ page }) => {
    // Phase 42: EXPRT-01 — un-skip when export button ships
    await page.goto("/payments/subscriptions");
    await expect(page.locator("table")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/subscriptions.*\.csv/i);
  });

  test.skip("export response has CSV content type", async ({ page }) => {
    // Phase 42: EXPRT-01 — un-skip when export API ships
    await page.goto("/payments/subscriptions");

    const responsePromise = page.waitForResponse(r =>
      r.url().includes("/api/") && r.url().includes("export")
    );
    await page.getByRole("button", { name: /export/i }).click();
    const response = await responsePromise;

    expect(response.headers()["content-type"]).toContain("text/csv");
  });

  test.skip("transaction CSV export triggers download", async ({ page }) => {
    // Phase 42: EXPRT-02 — un-skip when transaction export ships
    await page.goto("/payments/transactions");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/transaction.*\.csv/i);
  });
});
