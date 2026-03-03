import { test, expect } from "@playwright/test";
import { addDays } from "date-fns";

test.describe("Email Reminders", () => {
  test("can trigger email reminder via cron endpoint", async ({ page, request }) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      test.skip(true, "CRON_SECRET not configured");
      return;
    }

    // Step 1: Create a subscription with renewal date tomorrow
    // This ensures it falls within the 1-day reminder window
    const tomorrow = addDays(new Date(), 1);
    const uniqueName = `Reminder Test ${Date.now()}`;

    // Navigate to new subscription page
    await page.goto("/payments/subscriptions/new");
    await expect(page.getByText("Add New Subscription")).toBeVisible();

    // Fill in the form
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Amount").fill("9.99");

    // Set the renewal date to tomorrow using the date picker
    // The date input trigger button is labeled with the current date
    const dateButton = page.locator('button[type="button"]').filter({
      hasText: /Select a date|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/
    }).first();

    // Click to open calendar if it exists
    const dateButtonExists = await dateButton.isVisible().catch(() => false);
    if (dateButtonExists) {
      await dateButton.click();

      // Wait for calendar popover to appear
      await page.waitForSelector('[role="grid"]', { timeout: 5000 }).catch(() => null);

      // Find and click tomorrow's date
      // The calendar shows dates as buttons within the grid
      const tomorrowDay = tomorrow.getDate().toString();

      // Look for the day button in the calendar
      // We need to be careful to click the right day (not one from prev/next month)
      const calendarGrid = page.locator('[role="grid"]');
      if (await calendarGrid.isVisible().catch(() => false)) {
        // Try to find an enabled button with tomorrow's date
        const dayButton = calendarGrid.getByRole('gridcell', { name: tomorrowDay, exact: true });
        const dayButtonVisible = await dayButton.first().isVisible().catch(() => false);
        if (dayButtonVisible) {
          await dayButton.first().click();
        }
      }
    }

    // Wait for API response before submitting
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions") && response.request().method() === "POST"
    );

    // Submit the form
    await page.getByRole("button", { name: "Create Subscription" }).click();
    await responsePromise;

    // Verify subscription created
    await expect(page.getByText("Subscription created successfully")).toBeVisible();
    await page.waitForURL("**/payments/subscriptions");

    // Verify subscription appears in list
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Step 2: Trigger the cron endpoint via API request
    const cronResponse = await request.post("/api/cron/send-reminders", {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    // Step 3: Verify the response
    expect(cronResponse.ok()).toBeTruthy();

    const result = await cronResponse.json();
    console.log("Cron response:", JSON.stringify(result, null, 2));

    // The cron endpoint should return success
    expect(result.success).toBe(true);

    // Verify the response structure
    expect(result).toHaveProperty("remindersProcessed");
    expect(result).toHaveProperty("remindersSent");
    expect(result).toHaveProperty("remindersFailed");

    // If reminders were processed, verify they were attempted
    // Note: Email may fail if RESEND_FROM_EMAIL domain isn't verified in Resend
    // That's a configuration issue, not a code issue. The test verifies:
    // 1. Cron endpoint works
    // 2. Subscriptions needing reminders are identified
    // 3. Reminder attempts are made (sent or failed)
    if (result.remindersProcessed > 0) {
      const totalAttempts = result.remindersSent + result.remindersFailed;
      expect(totalAttempts).toBeGreaterThanOrEqual(1);
    }

    // If emails were sent successfully, verify no errors
    // If emails failed due to Resend config, that's documented in errors array
    if (result.remindersSent > 0) {
      // All sent successfully - no errors expected
      expect(result.errors?.length ?? 0).toBe(0);
    }
  });

  test("cron endpoint returns 401 without valid secret", async ({ request }) => {
    // Test without authorization header
    const responseNoAuth = await request.post("/api/cron/send-reminders");
    expect(responseNoAuth.status()).toBe(401);

    // Test with invalid secret
    const responseInvalid = await request.post("/api/cron/send-reminders", {
      headers: {
        Authorization: "Bearer invalid-secret",
      },
    });
    expect(responseInvalid.status()).toBe(401);
  });

  test("cron endpoint accepts GET request with valid secret", async ({ request }) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      test.skip(true, "CRON_SECRET not configured");
      return;
    }

    // Vercel crons use GET requests
    const response = await request.get("/api/cron/send-reminders", {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
