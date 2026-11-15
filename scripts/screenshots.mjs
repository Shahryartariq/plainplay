// Renders README screenshots from sample data: `node scripts/screenshots.mjs` (server on :3100).
import { chromium, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = new URL("../docs/screenshots/", import.meta.url);
const fake = readFileSync(new URL("../e2e/fixtures.ts", import.meta.url), "utf8").match(/const FAKE_IFRAME_API = `([\s\S]*?)`;/)[1];

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME_PATH || undefined });

async function shot(name, path, { theme = "light", mobile = false, thumbnails = true, act } = {}) {
  const context = await browser.newContext(
    mobile ? { ...devices["Pixel 7"] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  );
  const page = await context.newPage();
  await page.route("https://www.youtube.com/iframe_api", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.addInitScript((p) => localStorage.setItem("plainplay:prefs", JSON.stringify(p)), { theme, thumbnails });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (act) await act(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: new URL(`${name}.png`, OUT).pathname });
  await context.close();
  console.log("saved", name);
}

const emit = (s) => (page) => page.evaluate((x) => window.__fakePlayer.emit(x), s);

await shot("home-light", "/");
await shot("search-light", "/search?q=everything");
await shot("watch-playlist-dark", "/watch?v=sampleVid03&list=PLsampleCourse01", { theme: "dark" });
await shot("watch-paused-night", "/watch?v=sampleVid01", { theme: "night", act: async (p) => { await emit(1)(p); await emit(2)(p); await p.waitForTimeout(900); } });
await shot("watch-ended-light", "/watch?v=sampleVid01&list=PLsampleCourse01", { act: async (p) => { await emit(1)(p); await emit(0)(p); await p.getByRole("button", { name: "Cancel" }).click(); } });
await shot("search-text-only-dark", "/search?q=everything", { theme: "dark", thumbnails: false });
await shot("settings-light", "/search?q=react", { act: (p) => p.getByRole("button", { name: "Settings" }).click() });
await shot("mobile-search-night", "/search?q=everything", { theme: "night", mobile: true });
await shot("mobile-watch-light", "/watch?v=sampleVid03&list=PLsampleCourse01", { mobile: true });
await shot("home-night", "/", { theme: "night" });
await browser.close();
