import { test as base, expect, type Page } from "@playwright/test";

/**
 * A stand-in for YouTube's IFrame API, so tests never touch the network
 * and can drive the player (play, pause, end, errors) directly.
 */
const FAKE_IFRAME_API = `
(function () {
  function FakePlayer(el, opts) {
    var self = this;
    var iframe = document.createElement("iframe");
    iframe.setAttribute("data-fake-player", opts.videoId);
    iframe.srcdoc = '<body style="margin:0;height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#1d2b26,#35524a);color:#cfe;font:600 20px system-ui">' + opts.videoId + '</body>';
    el.replaceWith(iframe);
    var state = { opts: opts, state: -1, time: (opts.playerVars && opts.playerVars.start) || 0, seeks: [], plays: 0,
      emit: function (s) { this.state = s; opts.events.onStateChange && opts.events.onStateChange({ target: self, data: s }); },
      error: function (code) { opts.events.onError && opts.events.onError({ target: self, data: code }); } };
    window.__fakePlayer = state;
    this.playVideo = function () { state.plays++; state.emit(1); };
    this.pauseVideo = function () { state.emit(2); };
    this.seekTo = function (s) { state.time = s; state.seeks.push(s); };
    this.getCurrentTime = function () { return state.time; };
    this.getDuration = function () { return 1342; };
    this.getIframe = function () { return iframe; };
    this.destroy = function () { iframe.remove(); };
    setTimeout(function () { opts.events.onReady && opts.events.onReady({ target: self, data: null }); }, 30);
  }
  window.YT = { Player: FakePlayer };
  if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady();
})();
`;

export interface FakePlayerState {
  state: number;
  time: number;
  seeks: number[];
  plays: number;
  opts: { videoId: string; host: string; playerVars: Record<string, unknown> };
}

export const test = base.extend<{ external: string[] }>({
  external: [
    async ({ page }, use) => {
      const external: string[] = [];
      // Later routes run first, so the fake player API (added second) wins over the blocker.
      await page.route(/^https?:\/\/(?!localhost[:/])/, (route) => {
        external.push(route.request().url());
        return route.abort();
      });
      await page.route("https://www.youtube.com/iframe_api", (route) =>
        route.fulfill({ contentType: "text/javascript", body: FAKE_IFRAME_API }),
      );
      await use(external);
    },
    { auto: true },
  ],
});

export { expect };

export async function player(page: Page): Promise<FakePlayerState> {
  return page.evaluate(() => (window as unknown as { __fakePlayer: FakePlayerState }).__fakePlayer);
}

export async function emit(page: Page, state: number) {
  await page.evaluate((s) => (window as unknown as { __fakePlayer: { emit(n: number): void } }).__fakePlayer.emit(s), state);
}

export async function waitForPlayer(page: Page) {
  await expect(page.locator("iframe[data-fake-player]")).toBeAttached();
  await expect(page.locator(".player")).not.toHaveAttribute("data-status", "loading");
}

export async function setPrefs(page: Page, prefs: Record<string, unknown>) {
  await page.addInitScript((p) => localStorage.setItem("plainplay:prefs", JSON.stringify(p)), prefs);
}
