import { expect, test } from "@playwright/test";

/**
 * E2E for the /daily Daily Mixed Challenge page.
 *
 * Validates the static-exported artifact (out/daily/index.html) — not the dev
 * server — so production behavior is exercised (P2-33). These tests run on
 * CI/Linux where `next build` with `output: 'export'` succeeds; on Windows the
 * phantom-file bug prevents local `out/` generation (see scripts/build.mjs).
 */
test.describe("Daily Mixed Challenge page", () => {
  test("renders a server-rendered H1 and 4 mode cards", async ({ page }) => {
    await page.goto("/daily/");
    // H1 present in initial HTML (SEO + a11y baseline).
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText("Daily Mixed Challenge");

    // The 4 mode cards are present in the server-rendered HTML (before
    // hydration fills in progress-dependent values). Each card is a link to
    // /play/{mode}.
    const cards = page.getByLabel("Daily challenge puzzles").getByRole("link");
    await expect(cards).toHaveCount(4);

    // Each card links to the correct mode page.
    await expect(cards.nth(0)).toHaveAttribute("href", "/play/keywords");
    await expect(cards.nth(1)).toHaveAttribute("href", "/play/emoji");
    await expect(cards.nth(2)).toHaveAttribute("href", "/play/screenshot");
    await expect(cards.nth(3)).toHaveAttribute("href", "/play/timeline");
  });

  test("keyboard can reach a mode card and follow it", async ({ page }) => {
    await page.goto("/daily/");
    // Tab through to the first mode card link and follow it with Enter.
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus").first();
      const text = (await focused.textContent()) ?? "";
      if (/keywords/i.test(text)) {
        await page.keyboard.press("Enter");
        break;
      }
    }
    await expect(page).toHaveURL(/\/play\/keywords/);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows the 'complete all four' hint when no progress exists", async ({
    page,
  }) => {
    await page.goto("/daily/");
    // Fresh browser context → no localStorage → no progress → hint visible.
    await expect(
      page.getByText("Complete all four puzzles to unlock your final score"),
    ).toBeVisible();
    // No share button before completion.
    await expect(
      page.getByRole("button", { name: /Share/i }),
    ).not.toBeVisible();
  });

  test("is linked from the homepage CTA", async ({ page }) => {
    await page.goto("/");
    // The homepage has a prominent Daily Mixed Challenge CTA card.
    const cta = page.getByLabel("Daily Mixed Challenge").getByRole("link");
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/daily/);
  });
});
