import { expect, test } from "./fixtures";

// Runs against a production server with no YOUTUBE_API_KEY (see playwright.config.ts).
// Production builds hide error messages from cached functions, so this is the
// only place that proves the right message reaches the page.

test("search explains that it isn't set up", async ({ page }) => {
  await page.goto("/search?q=typescript");
  await expect(page.getByRole("heading", { name: "Search isn't set up yet" })).toBeVisible();
});

test("load more reports the setup problem", async ({ request }) => {
  const res = await request.get("/api/search?q=typescript&pageToken=CBQQAA");
  expect(res.status()).toBe(503);
  expect(await res.json()).toEqual({ error: "config" });
});

test("a pasted video link still plays", async ({ page }) => {
  await page.goto("/watch?v=dQw4w9WgXcQ");
  await expect(page.locator("iframe[data-fake-player]")).toBeAttached();
  await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
});

test("a playlist link explains the setup problem", async ({ page }) => {
  await page.goto("/watch?list=PLhQjrBD2T381WAHyx1pq-sBfykqMBI7V4");
  await expect(page.getByRole("heading", { name: "Search isn't set up yet" })).toBeVisible();
});
