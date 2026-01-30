import { test, expect } from "@playwright/test";

test.describe("Subscription CRUD", () => {
  test("can add a new subscription", async ({ page }) => {
    // Navigate to the new subscription page
    await page.goto("/subscriptions/new");

    // Verify the form loaded
    await expect(page.getByRole("heading", { name: "Add New Subscription" })).toBeVisible();

    // Generate unique subscription name
    const uniqueName = `Test Subscription ${Date.now()}`;

    // Fill in the form
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Amount").fill("15.99");

    // Currency defaults to USD and frequency defaults to monthly, so no need to change them

    // Select Next Renewal Date (pick a future date)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Click the date picker button (the button with "Pick a date" text or formatted date)
    // Use more specific locator for Next Renewal Date popover trigger
    const datePickerButton = page.locator('button:has-text("Pick a date")').first();
    await datePickerButton.click();

    // Wait for calendar to appear and select tomorrow
    // The calendar shows current month by default
    // Click on the calendar date button
    await page.getByRole("button", { name: new RegExp(`^${tomorrow.getDate()}$`) }).click();

    // Wait for the API response before submitting
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions") && response.request().method() === "POST"
    );

    // Submit the form
    await page.getByRole("button", { name: "Create Subscription" }).click();

    // Wait for API response
    await responsePromise;

    // Verify toast notification
    await expect(page.getByText("Subscription created successfully")).toBeVisible();

    // Verify redirect to subscriptions list
    await page.waitForURL("/subscriptions");

    // Verify the subscription appears in the list
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test("shows validation error for empty name", async ({ page }) => {
    await page.goto("/subscriptions/new");

    // Fill only the amount, leave name empty
    await page.getByLabel("Amount").fill("10.00");

    // Try to submit
    await page.getByRole("button", { name: "Create Subscription" }).click();

    // Verify error message appears (Zod validation)
    await expect(page.getByText("Name is required")).toBeVisible();

    // Verify we're still on the new subscription page
    await expect(page).toHaveURL(/\/subscriptions\/new/);
  });

  test("shows validation error for invalid amount", async ({ page }) => {
    await page.goto("/subscriptions/new");

    // Fill name but set amount to 0
    await page.getByLabel("Name").fill("Test Invalid Amount");
    await page.getByLabel("Amount").fill("0");

    // Try to submit
    await page.getByRole("button", { name: "Create Subscription" }).click();

    // Verify error message appears
    await expect(page.getByText("Amount must be positive")).toBeVisible();

    // Test negative amount
    await page.getByLabel("Amount").fill("-5.00");
    await page.getByRole("button", { name: "Create Subscription" }).click();

    // Should still show the error
    await expect(page.getByText("Amount must be positive")).toBeVisible();
  });

  test("can edit an existing subscription", async ({ page }) => {
    // First, create a subscription
    await page.goto("/subscriptions/new");
    const uniqueName = `Edit Test ${Date.now()}`;

    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Amount").fill("9.99");

    // Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const datePickerButton = page.locator('button:has-text("Pick a date")').first();
    await datePickerButton.click();
    await page.getByRole("button", { name: new RegExp(`^${tomorrow.getDate()}$`) }).click();

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions") && response.request().method() === "POST"
    );

    await page.getByRole("button", { name: "Create Subscription" }).click();
    await createResponsePromise;
    await page.waitForURL("/subscriptions");

    // Now edit the subscription
    // Find the subscription row and click the actions menu
    const subscriptionRow = page.locator("tr", { has: page.getByText(uniqueName) });
    // Click the MoreHorizontal actions button
    await subscriptionRow.locator('button[role="button"]').last().click();

    // Click Edit from the dropdown
    await page.getByRole("menuitem", { name: "Edit" }).click();

    // Wait for edit page to load
    await expect(page).toHaveURL(/\/subscriptions\/[^/]+\/edit/);

    // Change the amount
    const newAmount = "19.99";
    await page.getByLabel("Amount").clear();
    await page.getByLabel("Amount").fill(newAmount);

    // Wait for update API response
    const updateResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions/") && response.request().method() === "PATCH"
    );

    // Submit the form
    await page.getByRole("button", { name: "Save Changes" }).click();

    await updateResponsePromise;

    // Verify toast notification
    await expect(page.getByText("Subscription updated successfully")).toBeVisible();

    // Verify we're redirected to detail page or subscription list
    await page.waitForURL(/\/subscriptions/);

    // Navigate to subscriptions list to verify the change
    if (!page.url().endsWith("/subscriptions")) {
      await page.goto("/subscriptions");
    }

    // Verify the new amount appears
    const updatedRow = page.locator("tr", { has: page.getByText(uniqueName) });
    await expect(updatedRow.getByText(newAmount)).toBeVisible();
  });

  test("can delete a subscription", async ({ page }) => {
    // First, create a subscription to delete
    await page.goto("/subscriptions/new");
    const uniqueName = `Delete Test ${Date.now()}`;

    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Amount").fill("5.99");

    // Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const datePickerButton = page.locator('button:has-text("Pick a date")').first();
    await datePickerButton.click();
    await page.getByRole("button", { name: new RegExp(`^${tomorrow.getDate()}$`) }).click();

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions") && response.request().method() === "POST"
    );

    await page.getByRole("button", { name: "Create Subscription" }).click();
    await createResponsePromise;
    await page.waitForURL("/subscriptions");

    // Verify subscription exists
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Find the subscription row and click the actions menu
    const subscriptionRow = page.locator("tr", { has: page.getByText(uniqueName) });
    await subscriptionRow.getByRole("button", { name: "" }).click();

    // Wait for DELETE API response
    const deleteResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions/") && response.request().method() === "DELETE"
    );

    // Click Delete from the dropdown
    await page.getByRole("menuitem", { name: "Delete" }).click();

    await deleteResponsePromise;

    // Verify toast shows deleted with Undo option
    await expect(page.getByText(/deleted/i)).toBeVisible();

    // Verify subscription is removed from the list
    await expect(page.getByText(uniqueName)).not.toBeVisible({ timeout: 5000 });
  });

  test("handles special characters in subscription name", async ({ page }) => {
    await page.goto("/subscriptions/new");

    // Use a name with special characters and unicode
    const specialName = "Netflix™ Premium HD 🎬";

    await page.getByLabel("Name").fill(specialName);
    await page.getByLabel("Amount").fill("15.99");

    // Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const datePickerButton = page.locator('button:has-text("Pick a date")').first();
    await datePickerButton.click();
    await page.getByRole("button", { name: new RegExp(`^${tomorrow.getDate()}$`) }).click();

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions") && response.request().method() === "POST"
    );

    await page.getByRole("button", { name: "Create Subscription" }).click();
    await responsePromise;

    // Verify toast notification
    await expect(page.getByText("Subscription created successfully")).toBeVisible();

    await page.waitForURL("/subscriptions");

    // Verify the subscription with special characters displays correctly
    await expect(page.getByText(specialName)).toBeVisible();
  });

  test("can navigate to subscription list from dashboard", async ({ page }) => {
    // Start at dashboard
    await page.goto("/dashboard");

    // Click on subscriptions link/button
    await page.getByRole("link", { name: /subscriptions/i }).click();

    // Verify we're on subscriptions page
    await expect(page).toHaveURL("/subscriptions");
    await expect(page.getByRole("heading", { name: "Subscriptions" })).toBeVisible();
  });
});
