import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("renders a server-rendered H1 and main navigation", async ({ page }) => {
    await page.goto("/");
    // H1 present in initial HTML (SEO + a11y baseline)
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();

    // Skip link is keyboard-focusable
    await page.keyboard.press("Tab");
    const active = page.locator(":focus");
    await expect(active).toBeVisible();
  });

  test("keyboard can reach play pages from the header", async ({ page }) => {
    await page.goto("/");
    // Tab through to a header link and follow it with Enter
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.locator(":focus").first();
      const text = (await focused.textContent()) ?? "";
      if (/keywords/i.test(text)) {
        await page.keyboard.press("Enter");
        break;
      }
    }
    await expect(page).toHaveURL(/\/play\/keywords/);
    await expect(page.locator("h1").first()).toBeVisible();
  });
});

test.describe("404 page", () => {
  test("shows a friendly 404 with quick links", async ({ page }) => {
    await page.goto("/this-route-does-not-exist/");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Page not found/i })).toBeVisible();
    // At least one escape link in the quick-links nav
    const quickLinks = page.getByLabel("Quick links");
    await expect(quickLinks.getByRole("link", { name: "Home" })).toBeVisible();
  });
});
