import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const NO_KEY_PORT = PORT + 1;
// Locally you can point at an installed Chrome; CI installs Playwright's Chromium.
const executablePath = process.env.PW_CHROME_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /no-key/,
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
    },
    { name: "mobile", testIgnore: /no-key/, use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
    // A production server with no YouTube key and no sample data, like a fresh deploy.
    {
      name: "no-key",
      testMatch: /no-key/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${NO_KEY_PORT}`, launchOptions: { executablePath } },
    },
  ],
  // Servers start one after another, so the second reuses the first one's build.
  webServer: [
    {
      command: `npm run build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { PLAINPLAY_SAMPLE_DATA: "1", SEARCH_RATE_LIMIT: "100000" },
    },
    {
      command: `npx next start -p ${NO_KEY_PORT}`,
      url: `http://localhost:${NO_KEY_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { YOUTUBE_API_KEY: "", PLAINPLAY_SAMPLE_DATA: "" },
    },
  ],
});
