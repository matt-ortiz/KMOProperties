const { test, expect } = require("@playwright/test");

test("home page renders and mobile menu opens", async ({ page, isMobile }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.addInitScript(() => {
    window.__openedUrls = [];
    window.open = (url) => {
      window.__openedUrls.push(String(url));
      return { close: () => {} };
    };
  });

  await page.route("https://kellieortiz.samsonproperties.net/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Kellie Ortiz widget</title><main>Widget loaded</main>"
    });
  });

  await page.route("https://d36xftgacqn2p.cloudfront.net/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/gif",
      body: Buffer.from("R0lGODlhAQABAIAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64")
    });
  });

  let submittedContactRequest = {};
  await page.route("https://submit-form.com/gq3zCCD9Z", async (route) => {
    submittedContactRequest = {
      body: route.request().postData() || "",
      contentType: route.request().headers()["content-type"] || ""
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(/Kellie Ortiz \| Northern Virginia, DC & Maryland Realtor/);
  await expect(page.getByRole("heading", { name: /Guiding your move across VA, DC & MD/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Your Move" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fresh homes across the DMV" })).toBeVisible();
  await expect(page.locator("[data-listing-card]").first()).toBeVisible();
  await expect(page.locator("[data-listing-card]")).toHaveCount(6);

  await page.getByRole("button", { name: "Open Houses" }).click();
  await expect(page.getByRole("button", { name: "Open Houses" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-listing-card]").first()).toContainText("Open House");

  await expect(page.getByRole("heading", { name: "Get a home value starting point" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Instant Estimate" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View Alexandria listings" })).toHaveAttribute("href", /city%3AAlexandria/);
  await expect(page.getByRole("link", { name: "View Springfield listings" })).toHaveAttribute("href", /city%3ASpringfield/);
  await expect(page.getByRole("link", { name: "View Lorton listings" })).toHaveAttribute("href", /city%3ALorton/);
  await expect(page.getByRole("link", { name: "View Falls Church listings" })).toHaveAttribute("href", /city%3AFalls\+Church/);
  await expect(page.getByRole("link", { name: "View Fairfax listings" })).toHaveAttribute("href", /city%3AFairfax/);

  await page.getByLabel("Street address").fill("5721 Glamis Dr");
  await page.getByLabel("City").fill("Alexandria");
  await page.getByLabel("State").fill("VA");
  await page.getByLabel("ZIP").fill("22315");

  await page.getByRole("button", { name: "Open Instant Estimate" }).click();
  const openedUrls = await page.evaluate(() => window.__openedUrls);
  expect(openedUrls).toHaveLength(1);
  const estimateUrl = new URL(openedUrls[0]);
  expect(estimateUrl.pathname).toBe("/sell.php");
  expect(estimateUrl.searchParams.get("geolocate")).toBe("5721 Glamis Dr Alexandria VA 22315");
  expect(estimateUrl.searchParams.get("number")).toBe("5721");
  expect(estimateUrl.searchParams.get("street")).toBe("Glamis Dr");

  await page.getByRole("button", { name: "Ask Kellie for a Personal CMA" }).click();
  await expect(page.locator('textarea[name="message"]')).toHaveValue(
    "I'd like a personal home valuation for 5721 Glamis Dr Alexandria VA 22315."
  );

  await page.getByPlaceholder("Full name").fill("Taylor Client");
  await page.getByPlaceholder("Phone number").fill("703-555-0199");
  await page.getByPlaceholder("Email address").fill("taylor@example.com");
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.locator("[data-form-note]")).toContainText("Thank you. Your message was sent");
  await expect(page).toHaveURL(/\/$/);
  expect(submittedContactRequest.contentType).toContain("application/json");
  expect(JSON.parse(submittedContactRequest.body)).toEqual({
    email: "taylor@example.com",
    message: "I'd like a personal home valuation for 5721 Glamis Dr Alexandria VA 22315.",
    move_type: "Selling",
    name: "Taylor Client",
    phone: "703-555-0199"
  });
  await expect(page.getByRole("button", { name: "Send Message" })).toBeEnabled();

  if (isMobile) {
    const menuButton = page.getByRole("button", { name: "Menu" });
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  }

  expect(consoleErrors).toEqual([]);
});
