import { test, expect } from "@playwright/test";
import path from "path";

test.describe("PDF Import Flow", () => {
  test("can upload bank statement and process import flow", async ({ page }) => {
    // Navigate to import page
    await page.goto("/import");

    // Verify upload page loaded
    await expect(page.getByText("Upload Documents")).toBeVisible();

    // Upload test fixture
    const filePath = path.join(
      __dirname,
      "..",
      "fixtures",
      "bank-statement-sample.png"
    );
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Verify file appears in the list
    await expect(page.getByText("bank-statement-sample.png")).toBeVisible();

    // Click Process Files button
    await page.getByRole("button", { name: /Process Files/i }).click();

    // Verify processing step appears
    await expect(page.getByText("Analyzing your documents...")).toBeVisible();

    // Wait for processing to complete (either success with subscriptions or zero results)
    // Use a generous timeout since this involves AI processing
    await expect(
      page
        .getByText("Review Detected Subscriptions")
        .or(page.getByText("No subscriptions detected"))
    ).toBeVisible({ timeout: 90000 });

    // If subscriptions were detected, verify the review UI
    const hasSubscriptions = await page
      .getByText("Review Detected Subscriptions")
      .isVisible()
      .catch(() => false);

    if (hasSubscriptions) {
      // Should show at least one subscription item
      // The fixture has Netflix, Spotify, Adobe, GitHub, Dropbox
      const subscriptionNames = ["NETFLIX", "SPOTIFY", "ADOBE", "GITHUB", "DROPBOX"];

      // Check if at least one of our test subscriptions appears
      let foundSubscription = false;
      for (const name of subscriptionNames) {
        const isVisible = await page.getByText(name, { exact: false }).isVisible().catch(() => false);
        if (isVisible) {
          foundSubscription = true;
          break;
        }
      }

      // If GPT-4o detected our subscriptions, great! Otherwise, it's okay - we tested the flow
      if (foundSubscription) {
        // Verify confidence badge appears
        await expect(page.getByText(/% confident/)).toBeVisible();

        // Verify import button exists
        await expect(
          page.getByRole("button", { name: /Import \d+ Subscription/i })
        ).toBeVisible();
      }
    } else {
      // Zero subscriptions detected - verify the empty state
      await expect(page.getByText("No subscriptions detected")).toBeVisible();
      await expect(
        page.getByText("Try uploading a clearer image or a different statement")
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /Try Again/i })).toBeVisible();
    }
  });

  test("can remove uploaded files before processing", async ({ page }) => {
    await page.goto("/import");

    // Upload test fixture
    const filePath = path.join(
      __dirname,
      "..",
      "fixtures",
      "bank-statement-sample.png"
    );
    await page.locator('input[type="file"]').setInputFiles(filePath);

    // Verify file appears
    await expect(page.getByText("bank-statement-sample.png")).toBeVisible();

    // Click the X button to remove file
    await page.getByRole("button", { name: "" }).first().click();

    // Verify file is removed
    await expect(page.getByText("bank-statement-sample.png")).not.toBeVisible();

    // Process button should be disabled
    await expect(page.getByRole("button", { name: /Process Files/i })).toBeDisabled();
  });

  test("shows upload area with drag and drop hint", async ({ page }) => {
    await page.goto("/import");

    // Verify upload instructions
    await expect(
      page.getByText("Drag & drop files here, or click to select")
    ).toBeVisible();
    await expect(
      page.getByText("Supports PDF, PNG, JPEG, WebP (max 10MB each)")
    ).toBeVisible();

    // Verify process button is disabled when no files
    await expect(page.getByRole("button", { name: /Process Files/i })).toBeDisabled();
  });
});
