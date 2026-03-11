import { test, expect } from "@playwright/test";

test.describe("Subscription CRUD", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test("can add a new subscription", async ({ page }) => {
    // Navigate to the new subscription page
    await page.goto("/payments/subscriptions/new");

    // Verify the form loaded - "Add New Subscription" is a div, not a heading
    await expect(page.getByText("Add New Subscription")).toBeVisible();

    // Generate unique subscription name
    const uniqueName = `Test Subscription ${Date.now()}`;

    // Fill in the form
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Amount").fill("15.99");

    // Currency defaults to USD and frequency defaults to monthly, so no need to change them

    // The Next Renewal Date already has a default date, so we can skip selecting one
    // Just proceed to submit - the date picker is optional since it defaults to today

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
    await page.waitForURL("**/payments/subscriptions");

    // Verify the subscription appears in the list
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test("shows validation error for empty name", async ({ page }) => {
    await page.goto("/payments/subscriptions/new");

    // Fill only the amount, leave name empty
    await page.getByLabel("Amount").fill("10.00");

    // Try to submit
    await page.getByRole("button", { name: "Create Subscription" }).click();

    // Verify error message appears (form validation)
    await expect(page.getByText("This field is required")).toBeVisible();

    // Verify we're still on the new subscription page
    await expect(page).toHaveURL(/\/payments\/subscriptions\/new/);
  });

  test("shows validation error for invalid amount", async ({ page }) => {
    await page.goto("/payments/subscriptions/new");

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
    await page.goto("/payments/subscriptions/new");
    const uniqueName = `Edit Test ${Date.now()}`;

    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Amount").fill("9.99");

    // Next Renewal Date has a default, no need to change it

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions") && response.request().method() === "POST"
    );

    await page.getByRole("button", { name: "Create Subscription" }).click();
    await createResponsePromise;
    await page.waitForURL("**/payments/subscriptions");

    // Now edit the subscription
    // Find the subscription row and click the actions menu using data-testid
    const subscriptionRow = page.locator("tr", { has: page.getByText(uniqueName) });
    await subscriptionRow.getByTestId("subscription-actions-menu").click();

    // Click Edit from the dropdown
    await page.getByRole("menuitem", { name: "Edit" }).click();

    // Wait for edit page to load
    await expect(page).toHaveURL(/\/payments\/subscriptions\/[^/]+\/edit/);

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
    await page.waitForURL(/\/payments\/subscriptions/);

    // Navigate to subscriptions list to verify the change
    if (!page.url().includes("/payments/subscriptions") || page.url().includes("/edit")) {
      await page.goto("/payments/subscriptions");
    }

    // Verify the new amount appears
    const updatedRow = page.locator("tr", { has: page.getByText(uniqueName) });
    await expect(updatedRow.getByText(newAmount)).toBeVisible();
  });

  test("can delete a subscription", async ({ page }) => {
    // First, create a subscription to delete
    await page.goto("/payments/subscriptions/new");
    const uniqueName = `Delete Test ${Date.now()}`;

    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Amount").fill("5.99");

    // Next Renewal Date has a default, no need to change it

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions") && response.request().method() === "POST"
    );

    await page.getByRole("button", { name: "Create Subscription" }).click();
    await createResponsePromise;
    await page.waitForURL("**/payments/subscriptions");

    // Verify subscription exists
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Find the subscription row and click the actions menu using data-testid
    const subscriptionRow = page.locator("tr", { has: page.getByText(uniqueName) });
    await subscriptionRow.getByTestId("subscription-actions-menu").click();

    // Wait for DELETE API response
    const deleteResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions/") && response.request().method() === "DELETE"
    );

    // Click Delete from the dropdown
    await page.getByRole("menuitem", { name: "Delete" }).click();

    await deleteResponsePromise;

    // Verify toast shows deleted with Undo option
    await expect(page.getByText(/deleted/i)).toBeVisible();

    // Verify subscription is removed from the table (not just the page - toast still shows it)
    await expect(page.locator("table").getByText(uniqueName)).not.toBeVisible({ timeout: 5000 });
  });

  test("handles special characters in subscription name", async ({ page }) => {
    await page.goto("/payments/subscriptions/new");

    // Use a name with special characters and unicode
    const specialName = "Netflix™ Premium HD 🎬";

    await page.getByLabel("Name").fill(specialName);
    await page.getByLabel("Amount").fill("15.99");

    // Next Renewal Date has a default, no need to change it

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/subscriptions") && response.request().method() === "POST"
    );

    await page.getByRole("button", { name: "Create Subscription" }).click();
    await responsePromise;

    // Verify toast notification
    await expect(page.getByText("Subscription created successfully")).toBeVisible();

    await page.waitForURL("**/payments/subscriptions");

    // Verify the subscription with special characters displays correctly (use first() in case duplicates exist from previous runs)
    await expect(page.getByText(specialName).first()).toBeVisible();
  });

  test("can navigate to subscription list from dashboard", async ({ page }) => {
    // Start at dashboard
    await page.goto("/payments/dashboard");

    // Click on subscriptions link in the sidebar (use exact match to avoid "Subscriptions Manager" logo)
    await page.getByRole("link", { name: "Subscriptions", exact: true }).click();

    // Verify we're on subscriptions page
    await expect(page).toHaveURL(/\/payments\/subscriptions/);
  });
});
