import AxeBuilder from "@axe-core/playwright";
import { emit, expect, player, setPrefs, test, waitForPlayer } from "./fixtures";

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

async function search(page: import("@playwright/test").Page, text: string) {
  const box = page.getByRole("searchbox", { name: "Search YouTube or paste a link" }).first();
  await box.fill(text);
  await box.press("Enter");
}

test.describe("home", () => {
  test("is just a search box", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("plainplay");
    await expect(page.getByRole("searchbox")).toBeFocused();
    await expect(page.locator("img")).toHaveCount(0);
    await expect(page).toHaveTitle("Plainplay: YouTube without the rabbit hole");
  });

  test("“/” jumps to the search box", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut");
    await page.goto("/privacy");
    await expect(page.getByRole("searchbox")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("/");
    await expect(page.getByRole("searchbox")).toBeFocused();
  });

  test("sends security headers", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("frame-src https://www.youtube-nocookie.com");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});

test.describe("search", () => {
  test("finds videos and shows a loader on the way", async ({ page }) => {
    await page.goto("/");
    await search(page, "typescript");
    await expect(page).toHaveURL(/\/search\?q=typescript$/);
    const results = page.locator(".results .result");
    await expect(results.first()).toContainText("TypeScript generics");
    await expect(page.getByRole("searchbox")).toHaveValue("typescript");
    await expect(page).toHaveTitle("“typescript” · Plainplay");
  });

  test("filters by length", async ({ page }) => {
    await page.goto("/search?q=everything");
    await page.getByRole("link", { name: "Over 20 min" }).click();
    await expect(page).toHaveURL(/length=long/);
    await expect(page.getByRole("link", { name: "Over 20 min" })).toHaveAttribute("aria-current", "true");
    const badges = await page.locator(".results .thumb__badge").allTextContents();
    expect(badges.length).toBeGreaterThan(0);
    for (const b of badges) {
      const parts = b.split(":").map(Number);
      const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
      expect(seconds).toBeGreaterThan(1200);
    }
  });

  test("loads more results until the end", async ({ page }) => {
    await page.goto("/search?q=everything");
    await expect(page.locator(".result")).toHaveCount(20);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(page.locator(".result")).toHaveCount(40);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(page.locator(".result")).toHaveCount(42);
    await expect(page.getByText("That's everything for this search.")).toBeVisible();
  });

  test("says so when nothing matches", async ({ page }) => {
    await page.goto("/search?q=zzqqxx");
    await expect(page.getByRole("heading", { name: "No videos found" })).toBeVisible();
  });

  test("explains a used-up quota", async ({ page }) => {
    await page.goto("/search?q=quota-test");
    await expect(page.getByRole("heading", { name: "Searching is paused for today" })).toBeVisible();
  });

  test("an empty search goes home", async ({ page }) => {
    await page.goto("/search?q=%20%20");
    await expect(page).toHaveURL(/\/$/);
  });

  test("a pasted video link opens the video", async ({ page }) => {
    await page.goto("/");
    await search(page, "https://youtu.be/sampleVid02?t=90");
    await expect(page).toHaveURL(/\/watch\?v=sampleVid02&t=90$/);
    await waitForPlayer(page);
    expect((await player(page)).opts.playerVars.start).toBe(90);
  });

  test("a channel link gets a helpful message", async ({ page }) => {
    await page.goto("/");
    await search(page, "https://www.youtube.com/@someone");
    await expect(page.locator(".search-form__message")).toContainText("Channel links aren't supported");
    await expect(page.getByRole("searchbox")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("watch", () => {
  test("plays in the privacy-enhanced player with suggestions turned off", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    const p = await player(page);
    expect(p.opts.videoId).toBe("sampleVid01");
    expect(p.opts.host).toBe("https://www.youtube-nocookie.com");
    expect(p.opts.playerVars).toMatchObject({ rel: 0, iv_load_policy: 3, playsinline: 1 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("TypeScript generics, explained with real code");
    await expect(page.locator("iframe[data-fake-player]")).toHaveAttribute("title", /video player/);
  });

  test("covers the paused frame and resumes", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    await emit(page, PLAYING);
    await emit(page, PAUSED);
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Resume video" }).click();
    await expect(page.getByText("Paused", { exact: true })).toBeHidden();
    expect((await player(page)).plays).toBe(1);
  });

  test("a quick pause while seeking doesn't flash the cover", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    await emit(page, PLAYING);
    await emit(page, PAUSED);
    await emit(page, 3); // buffering after the seek
    await page.waitForTimeout(800);
    await expect(page.getByText("Paused", { exact: true })).toBeHidden();
  });

  test("“Show the frame” lifts the cover", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    await emit(page, PLAYING);
    await emit(page, PAUSED);
    await page.getByRole("button", { name: "Show the frame" }).click();
    await expect(page.getByText("Paused", { exact: true })).toBeHidden();
  });

  test("the cover can be switched off", async ({ page }) => {
    await setPrefs(page, { pauseShield: false });
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    await emit(page, PLAYING);
    await emit(page, PAUSED);
    await page.waitForTimeout(800);
    await expect(page.getByText("Paused", { exact: true })).toBeHidden();
  });

  test("covers YouTube's end screen", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    await emit(page, PLAYING);
    await emit(page, ENDED);
    await expect(page.getByText("That's the end of the video.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next in playlist" })).toHaveCount(0);
    await page.getByRole("button", { name: "Watch again" }).click();
    expect((await player(page)).seeks).toContain(0);
  });

  test("description timestamps move the player", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    await page.getByText("Description", { exact: true }).click();
    await page.getByRole("button", { name: "4:30" }).click();
    expect((await player(page)).seeks).toContain(270);
    const link = page.getByRole("link", { name: "https://github.com/example/plain-code-samples" });
    await expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
  });

  test("picks up where you left off", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("plainplay:positions", JSON.stringify({ sampleVid01: [125, Date.now()] })),
    );
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    expect((await player(page)).opts.playerVars.start).toBe(125);
    await expect(page.getByText("Resumed at 2:05.")).toBeVisible();
    await page.getByRole("button", { name: "Start from the beginning" }).click();
    expect((await player(page)).seeks).toContain(0);
  });

  test("videos that can't be embedded link to YouTube", async ({ page }) => {
    await page.goto("/watch?v=noEmbedVid1");
    await expect(page.getByText("The owner only allows this video to play on YouTube.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Watch on YouTube" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=noEmbedVid1",
    );
    await expect(page.locator("iframe")).toHaveCount(0);
  });

  test("player errors are explained", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01");
    await waitForPlayer(page);
    await page.evaluate(() => (window as unknown as { __fakePlayer: { error(c: number): void } }).__fakePlayer.error(100));
    await expect(page.getByText("This video was removed or made private.")).toBeVisible();
  });

  test("a blocked player script can be retried", async ({ page }) => {
    let blocked = true;
    await page.route("https://www.youtube.com/iframe_api", (route) => (blocked ? route.abort() : route.fallback()));
    await page.goto("/watch?v=sampleVid01");
    await expect(page.getByText(/The YouTube player didn't load/)).toBeVisible();
    blocked = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await waitForPlayer(page);
  });

  test("unknown videos show a not-found page", async ({ page }) => {
    await page.goto("/watch?v=zzzzzzzzzzz");
    await expect(page.getByRole("heading", { name: "Nothing to watch here" })).toBeVisible();
  });
});

test.describe("playlists", () => {
  test("a playlist link starts at the first video and shows only that playlist", async ({ page }) => {
    await page.goto("/watch?list=PLsampleCourse01");
    await expect(page).toHaveURL(/v=sampleVid01&list=PLsampleCourse01/);
    const panel = page.getByRole("complementary", { name: /Playlist/ });
    await expect(panel).toContainText("1 of 8");
    await expect(panel.locator(".playlist__item")).toHaveCount(8);
    await expect(panel.locator("[aria-current='true']")).toContainText("TypeScript generics");
  });

  test("plays the next video when one ends", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01&list=PLsampleCourse01");
    await waitForPlayer(page);
    await emit(page, PLAYING);
    await emit(page, ENDED);
    await expect(page.getByText(/Up next in \d+s/)).toBeVisible();
    await expect(page).toHaveURL(/v=sampleVid03&list=PLsampleCourse01/, { timeout: 10_000 });
    await expect(page.getByRole("complementary", { name: /Playlist/ })).toContainText("2 of 8");
  });

  test("autoplay can be cancelled or turned off", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01&list=PLsampleCourse01");
    await waitForPlayer(page);
    await emit(page, ENDED);
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(6000);
    await expect(page).toHaveURL(/v=sampleVid01/);

    await setPrefs(page, { autoplayNext: false });
    await page.reload();
    await waitForPlayer(page);
    await emit(page, ENDED);
    await expect(page.getByText("Next: React Server Components in 20 minutes")).toBeVisible();
    await expect(page.getByText(/Up next in/)).toHaveCount(0);
  });

  test("YouTube mixes are ignored", async ({ page }) => {
    await page.goto("/watch?v=sampleVid01&list=RDsampleVid01");
    await waitForPlayer(page);
    await expect(page.getByRole("complementary")).toHaveCount(0);
  });
});

test.describe("settings", () => {
  test("themes apply at once and survive a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("radio", { name: /Night/ }).check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    const metas = page.locator('meta[name="theme-color"]');
    for (let i = 0; i < (await metas.count()); i++) await expect(metas.nth(i)).toHaveAttribute("content", "#000000");
  });

  test("auto follows the device", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("thumbnails can be hidden", async ({ page }) => {
    await page.goto("/search?q=react");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("switch", { name: /Thumbnails/ }).uncheck();
    await expect(page.locator(".result .thumb").first()).toBeHidden();
    await expect(page.locator(".result__meta-clock").first()).toBeVisible();
  });
});

test.describe("accessibility", () => {
  for (const theme of ["light", "dark", "night"] as const) {
    test(`no axe violations in ${theme}`, async ({ page }) => {
      await setPrefs(page, { theme });
      for (const path of ["/", "/search?q=everything", "/watch?v=sampleVid01&list=PLsampleCourse01", "/privacy"]) {
        await page.goto(path);
        if (path.startsWith("/watch")) await waitForPlayer(page);
        const results = await new AxeBuilder({ page }).exclude("iframe").analyze();
        expect(results.violations, `${path}: ${results.violations.map((v) => v.id).join(", ")}`).toEqual([]);
      }
    });
  }
});

test("nothing loads from outside except the YouTube player", async ({ page, external }) => {
  for (const path of ["/", "/search?q=everything", "/watch?v=sampleVid01"]) {
    await page.goto(path);
  }
  await waitForPlayer(page);
  expect(external).toEqual([]);
});
