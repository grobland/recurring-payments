import { test, expect } from "@playwright/test";

test.describe("Overlap Detection", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test.skip("overlap badge appears when 2+ subscriptions share a category", async ({ page }) => {
    // Phase 43: OVRLP-01 — un-skip when overlap detection ships
    // Requires: 2 subscriptions in the same category
    // Assert: amber/warning badge visible on subscription rows
    await page.goto("/payments/subscriptions");
  });

  test.skip("overlap badge can be dismissed per group", async ({ page }) => {
    // Phase 43: OVRLP-02 — un-skip when dismissal ships
    await page.goto("/payments/subscriptions");
  });

  test.skip("dismissed overlap badge re-surfaces after subscription change", async ({ page }) => {
    // Phase 43: OVRLP-03 — un-skip when re-surface logic ships
    await page.goto("/payments/subscriptions");
  });
});
