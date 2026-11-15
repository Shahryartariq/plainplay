import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: () => {} }));

const { getPlaylist, getVideo, searchVideos, toSummary } = await import("@/lib/youtube");

type Handler = (url: URL) => { status?: number; body: unknown };

function mockFetch(handler: Handler) {
  const calls: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      calls.push(url);
      const { status = 200, body } = handler(url);
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    }),
  );
  return calls;
}

function apiVideo(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    snippet: {
      title: `Video ${id}`,
      channelTitle: "Channel",
      publishedAt: "2025-01-01T00:00:00Z",
      description: "Line one\nLine two",
      liveBroadcastContent: "none",
      thumbnails: { medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } },
    },
    contentDetails: { duration: "PT4M5S" },
    status: { embeddable: true, privacyStatus: "public" },
    ...extra,
  };
}

const ids = ["aaaaaaaaaa1", "aaaaaaaaaa2", "aaaaaaaaaa3", "aaaaaaaaaa4"];

beforeEach(() => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key");
  vi.stubEnv("PLAINPLAY_SAMPLE_DATA", "");
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("toSummary", () => {
  it("maps API fields and skips premieres", () => {
    expect(toSummary(apiVideo("aaaaaaaaaa1"))).toMatchObject({
      id: "aaaaaaaaaa1",
      title: "Video aaaaaaaaaa1",
      durationSec: 245,
      live: false,
      snippet: "Line one Line two",
    });
    expect(
      toSummary(apiVideo("aaaaaaaaaa1", { snippet: { title: "x", liveBroadcastContent: "upcoming" } })),
    ).toBeNull();
    const live = toSummary(apiVideo("aaaaaaaaaa1", { snippet: { title: "x", liveBroadcastContent: "live" }, contentDetails: { duration: "P0D" } }));
    expect(live).toMatchObject({ live: true, durationSec: null, thumbnail: "https://i.ytimg.com/vi/aaaaaaaaaa1/mqdefault.jpg" });
  });
});

describe("searchVideos", () => {
  it("searches, then fetches details in the same order, dropping unplayable videos", async () => {
    const calls = mockFetch((url) => {
      if (url.pathname.endsWith("/search")) {
        return { body: { nextPageToken: "NEXT", items: ids.map((videoId) => ({ id: { videoId } })) } };
      }
      return {
        body: {
          items: [
            apiVideo(ids[3]),
            apiVideo(ids[0]),
            apiVideo(ids[1], { status: { embeddable: false } }),
            // ids[2] missing: deleted between search and details
          ],
        },
      };
    });

    const result = await searchVideos({ q: "React Hooks", length: "long", sort: "date" });
    expect(result.items.map((v) => v.id)).toEqual([ids[0], ids[3]]);
    expect(result.nextPageToken).toBe("NEXT");

    const search = calls[0];
    expect(search.searchParams.get("q")).toBe("react hooks");
    expect(search.searchParams.get("videoDuration")).toBe("long");
    expect(search.searchParams.get("order")).toBe("date");
    expect(search.searchParams.get("videoEmbeddable")).toBe("true");
    expect(search.searchParams.get("key")).toBe("test-key");
    expect(calls[1].searchParams.get("id")).toBe(ids.join(","));
  });

  it("turns quota errors into a clear code", async () => {
    mockFetch(() => ({ status: 403, body: { error: { errors: [{ reason: "quotaExceeded" }] } } }));
    await expect(searchVideos({ q: "x", length: "any", sort: "relevance" })).rejects.toThrow(/youtube:quota/);
  });

  it("reports a bad key as a setup problem", async () => {
    mockFetch(() => ({ status: 400, body: { error: { errors: [{ reason: "keyInvalid" }] } } }));
    await expect(searchVideos({ q: "x", length: "any", sort: "relevance" })).rejects.toThrow(/youtube:config/);
  });

  it("fails clearly without a key in production", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    await expect(searchVideos({ q: "x", length: "any", sort: "relevance" })).rejects.toThrow(/youtube:config/);
  });
});

describe("getVideo", () => {
  it("returns details", async () => {
    mockFetch(() => ({ body: { items: [apiVideo(ids[0], { status: { embeddable: false, privacyStatus: "public" } })] } }));
    const video = await getVideo(ids[0]);
    expect(video).toMatchObject({ id: ids[0], embeddable: false, description: "Line one\nLine two", durationSec: 245 });
  });

  it("says not found for missing or private videos", async () => {
    mockFetch(() => ({ body: { items: [] } }));
    await expect(getVideo(ids[0])).rejects.toThrow(/youtube:notFound/);
    mockFetch(() => ({ body: { items: [apiVideo(ids[0], { status: { privacyStatus: "private" } })] } }));
    await expect(getVideo(ids[0])).rejects.toThrow(/youtube:notFound/);
  });

  it("falls back to oEmbed when the API quota is used up", async () => {
    mockFetch((url) => {
      if (url.hostname === "www.youtube.com") return { body: { title: "From oEmbed", author_name: "Someone" } };
      return { status: 403, body: { error: { errors: [{ reason: "quotaExceeded" }] } } };
    });
    expect(await getVideo(ids[0])).toMatchObject({ title: "From oEmbed", channelTitle: "Someone", partial: true, embeddable: true });
  });

  it("still plays when both the API and oEmbed fail", async () => {
    mockFetch(() => ({ status: 500, body: {} }));
    expect(await getVideo(ids[0])).toMatchObject({ id: ids[0], title: "YouTube video", partial: true });
  });
});

describe("getPlaylist", () => {
  it("pages through items, skips deleted and duplicate videos, and totals the time", async () => {
    mockFetch((url) => {
      if (url.pathname.endsWith("/playlists")) return { body: { items: [{ snippet: { title: "Course", channelTitle: "Teacher" } }] } };
      if (url.pathname.endsWith("/playlistItems")) {
        const second = url.searchParams.get("pageToken") === "P2";
        return {
          body: second
            ? { items: [{ contentDetails: { videoId: ids[2] } }, { contentDetails: { videoId: ids[0] } }] }
            : { nextPageToken: "P2", items: [{ contentDetails: { videoId: ids[0] } }, { contentDetails: { videoId: ids[1] } }] },
        };
      }
      const wanted = (url.searchParams.get("id") ?? "").split(",");
      return { body: { items: wanted.filter((id) => id !== ids[1]).map((id) => apiVideo(id)) } };
    });

    const playlist = await getPlaylist("PLabcdefghij");
    expect(playlist.title).toBe("Course");
    expect(playlist.items.map((v) => v.id)).toEqual([ids[0], ids[2]]);
    expect(playlist.totalSec).toBe(490);
    expect(playlist.truncated).toBe(false);
  });

  it("says not found for unknown playlists", async () => {
    mockFetch(() => ({ body: { items: [] } }));
    await expect(getPlaylist("PLabcdefghij")).rejects.toThrow(/youtube:notFound/);
  });
});
