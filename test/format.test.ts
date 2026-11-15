import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatDate,
  formatSpan,
  normalizeQuery,
  parseIsoDuration,
  spokenDuration,
  timeAgo,
} from "@/lib/format";
import { tokenizeDescription, timestampToSeconds } from "@/lib/text";
import { RateLimiter, clientKey } from "@/lib/rate-limit";
import { DEFAULT_PREFS, sanitizePrefs } from "@/lib/prefs";
import { errorCode, parseLength, parseSort, YouTubeError } from "@/lib/types";

describe("durations", () => {
  it("parses ISO 8601", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("PT10M")).toBe(600);
    expect(parseIsoDuration("P1DT2H")).toBe(93600);
    expect(parseIsoDuration("P0D")).toBe(0);
    expect(parseIsoDuration("PT1.5S")).toBe(1);
    expect(parseIsoDuration("nonsense")).toBeNull();
    expect(parseIsoDuration(undefined)).toBeNull();
  });

  it("formats clocks and spans", () => {
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("0:00");
    expect(formatSpan(59)).toBe("59s");
    expect(formatSpan(600)).toBe("10m");
    expect(formatSpan(3600)).toBe("1h");
    expect(formatSpan(4500)).toBe("1h 15m");
  });

  it("says durations in words", () => {
    expect(spokenDuration(4500)).toBe("1 hour 15 minutes");
    expect(spokenDuration(61)).toBe("1 minute 1 second");
    expect(spokenDuration(0)).toBe("0 seconds");
  });
});

describe("dates", () => {
  const now = Date.parse("2026-11-15T12:00:00Z");
  it("gives relative times", () => {
    expect(timeAgo("2023-11-01T00:00:00Z", now)).toBe("3 years ago");
    expect(timeAgo("2026-11-14T12:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-11-15T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("bad", now)).toBe("");
  });

  it("formats dates in UTC", () => {
    expect(formatDate("2024-03-12T23:30:00Z")).toBe("12 Mar 2024");
    expect(formatDate("")).toBe("");
  });
});

describe("normalizeQuery", () => {
  it("trims, collapses and caps", () => {
    expect(normalizeQuery("  react   hooks \n")).toBe("react hooks");
    expect(normalizeQuery("x".repeat(500))).toHaveLength(120);
    expect(normalizeQuery(undefined)).toBe("");
    expect(normalizeQuery(["a"])).toBe("");
  });
});

describe("tokenizeDescription", () => {
  it("finds links and timestamps", () => {
    const tokens = tokenizeDescription("0:00 Intro\n1:05:30 Deep dive (see https://example.com/a).");
    expect(tokens).toEqual([
      { kind: "time", value: "0:00", seconds: 0 },
      { kind: "text", value: " Intro\n" },
      { kind: "time", value: "1:05:30", seconds: 3930 },
      { kind: "text", value: " Deep dive (see " },
      { kind: "link", value: "https://example.com/a", href: "https://example.com/a" },
      { kind: "text", value: ")." },
    ]);
  });

  it("ignores things that only look like times", () => {
    expect(tokenizeDescription("ratio 16:9 or 1:75")).toEqual([{ kind: "text", value: "ratio 16:9 or 1:75" }]);
    expect(tokenizeDescription("at 1:75").some((t) => t.kind === "time")).toBe(false);
    expect(tokenizeDescription("12:30:45:10").some((t) => t.kind === "time")).toBe(false);
    expect(timestampToSeconds("1:60")).toBeNull();
  });

  it("never turns javascript: into a link", () => {
    expect(tokenizeDescription("javascript:alert(1)").every((t) => t.kind !== "link")).toBe(true);
  });
});

describe("RateLimiter", () => {
  it("allows up to the limit in a window, then recovers", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.check("a", 0).ok).toBe(true);
    expect(limiter.check("a", 100).ok).toBe(true);
    const blocked = limiter.check("a", 200);
    expect(blocked).toEqual({ ok: false, retryAfter: 1 });
    expect(limiter.check("b", 200).ok).toBe(true);
    expect(limiter.check("a", 1001).ok).toBe(true);
  });

  it("forgets the oldest visitors when full", () => {
    const limiter = new RateLimiter(1, 1000, 2);
    limiter.check("a", 0);
    limiter.check("b", 0);
    limiter.check("c", 0);
    expect(limiter.check("a", 1).ok).toBe(true);
  });

  it("reads the client address", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientKey(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientKey(new Headers())).toBe("local");
  });
});

describe("prefs and params", () => {
  it("fills in bad saved settings with defaults", () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ theme: "night", thumbnails: false, pauseShield: "yes" })).toEqual({
      ...DEFAULT_PREFS,
      theme: "night",
      thumbnails: false,
    });
    expect(sanitizePrefs({ theme: "neon" }).theme).toBe("system");
  });

  it("accepts only known filters", () => {
    expect(parseLength("long")).toBe("long");
    expect(parseLength("forever")).toBe("any");
    expect(parseSort("date")).toBe("date");
    expect(parseSort("rating")).toBe("relevance");
  });

  it("reads error codes even when the class is lost", () => {
    expect(errorCode(new YouTubeError("quota"))).toBe("quota");
    expect(errorCode(new Error("youtube:notFound"))).toBe("notFound");
    expect(errorCode(new Error("boom"))).toBe("upstream");
  });
});
