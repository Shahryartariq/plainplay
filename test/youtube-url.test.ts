import { describe, expect, it } from "vitest";
import {
  hrefForInput,
  isPlayableListId,
  parseStart,
  parseYouTubeInput,
  watchHref,
  youtubeWatchUrl,
} from "@/lib/youtube-url";

const ID = "dQw4w9WgXcQ";
const LIST = "PLhQjrBD2T381WAHyx1pq-sBfykqMBI7V4";

describe("parseYouTubeInput", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&feature=share`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}`,
    `youtube.com/watch?v=${ID}`,
    `www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `  https://www.youtube.com/watch?v=${ID}  `,
  ])("reads a video from %s", (input) => {
    expect(parseYouTubeInput(input)).toEqual({ type: "video", id: ID });
  });

  it("keeps the playlist and start time", () => {
    expect(parseYouTubeInput(`https://www.youtube.com/watch?v=${ID}&list=${LIST}&t=1m30s`)).toEqual({
      type: "video",
      id: ID,
      list: LIST,
      start: 90,
    });
    expect(parseYouTubeInput(`https://youtu.be/${ID}?t=42`)).toEqual({ type: "video", id: ID, start: 42 });
  });

  it("reads playlist links", () => {
    expect(parseYouTubeInput(`https://www.youtube.com/playlist?list=${LIST}`)).toEqual({ type: "playlist", list: LIST });
    expect(parseYouTubeInput(`https://www.youtube.com/watch?list=${LIST}`)).toEqual({ type: "playlist", list: LIST });
  });

  it("drops YouTube mixes, which are recommendations", () => {
    expect(parseYouTubeInput(`https://www.youtube.com/watch?v=${ID}&list=RD${ID}`)).toEqual({ type: "video", id: ID });
    expect(parseYouTubeInput(`https://www.youtube.com/playlist?list=RDCLAK5uy_abc`)).toEqual({
      type: "unsupported",
      reason: "other",
    });
  });

  it("flags channel links", () => {
    for (const url of [
      "https://www.youtube.com/@3blue1brown",
      "https://www.youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw",
      "https://www.youtube.com/c/Fireship",
      "https://www.youtube.com/user/someone",
    ]) {
      expect(parseYouTubeInput(url)).toEqual({ type: "unsupported", reason: "channel" });
    }
  });

  it("flags YouTube links it can't open", () => {
    expect(parseYouTubeInput("https://www.youtube.com/watch?v=short")).toEqual({ type: "unsupported", reason: "other" });
    expect(parseYouTubeInput("https://www.youtube.com/")).toEqual({ type: "unsupported", reason: "other" });
    expect(parseYouTubeInput("https://www.youtube.com/feed/trending")).toEqual({ type: "unsupported", reason: "other" });
  });

  it("treats words and other sites as a search", () => {
    for (const text of ["typescript generics", "dQw4w9WgXcQ", "https://vimeo.com/123", "notyoutube.com/watch?v=x", ""]) {
      expect(parseYouTubeInput(text)).toBeNull();
    }
    expect(parseYouTubeInput("https://evil.com/?u=https://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(parseYouTubeInput("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("parseStart", () => {
  it.each([
    ["90", 90],
    ["90s", 90],
    ["1m30s", 90],
    ["1h2m3s", 3723],
    ["2m", 120],
  ])("%s → %d", (input, expected) => {
    expect(parseStart(input)).toBe(expected);
  });

  it.each(["", "0", "-5", "abc", "1x", null, undefined])("ignores %s", (input) => {
    expect(parseStart(input as string | null | undefined)).toBeUndefined();
  });

  it("caps very large values", () => {
    expect(parseStart("99999999")).toBe(86400);
  });
});

describe("isPlayableListId", () => {
  it("accepts normal playlists and rejects private or generated ones", () => {
    expect(isPlayableListId(LIST)).toBe(true);
    expect(isPlayableListId("OLAK5uy_kxyz123456")).toBe(true);
    for (const bad of ["WL", "LL", "LM", `RD${ID}`, "short", "has space here!", 42, undefined]) {
      expect(isPlayableListId(bad)).toBe(false);
    }
  });
});

describe("hrefs", () => {
  it("builds Plainplay and YouTube links", () => {
    expect(watchHref({ id: ID, list: LIST, start: 30 })).toBe(`/watch?v=${ID}&list=${LIST}&t=30`);
    expect(hrefForInput({ type: "playlist", list: LIST })).toBe(`/watch?list=${LIST}`);
    expect(youtubeWatchUrl(ID, LIST, 30)).toBe(`https://www.youtube.com/watch?v=${ID}&list=${LIST}&t=30s`);
  });
});
