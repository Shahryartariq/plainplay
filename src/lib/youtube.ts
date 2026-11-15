import "server-only";
import { cacheLife } from "next/cache";
import { parseIsoDuration } from "./format";
import { samplePlaylist, sampleSearch, sampleVideo } from "./samples";
import type { Playlist, SearchInput, SearchResult, VideoDetail, VideoSummary } from "./types";
import { YouTubeError } from "./types";

const API = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 20;
const MAX_PLAYLIST_PAGES = 10; // 500 videos

let warnedAboutSamples = false;

/** Sample data in tests, or in development when no key is set. */
export function usingSampleData(): boolean {
  if (process.env.PLAINPLAY_SAMPLE_DATA === "1") return true;
  if (!process.env.YOUTUBE_API_KEY && process.env.NODE_ENV !== "production") {
    if (!warnedAboutSamples) {
      warnedAboutSamples = true;
      console.warn("[plainplay] YOUTUBE_API_KEY is not set, so sample data is used.");
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- API calls

interface ApiErrorBody {
  error?: { code?: number; message?: string; errors?: { reason?: string }[] };
}

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("config", "YOUTUBE_API_KEY is not set");

  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new YouTubeError("upstream", "YouTube did not answer");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    const reason = body.error?.errors?.[0]?.reason ?? "";
    if (/quotaExceeded|dailyLimitExceeded|rateLimitExceeded|userRateLimitExceeded/.test(reason)) {
      throw new YouTubeError("quota");
    }
    if (/keyInvalid|keyExpired|accessNotConfigured|forbidden|ipRefererBlocked/.test(reason) || res.status === 401) {
      throw new YouTubeError("config", reason || `HTTP ${res.status}`);
    }
    if (res.status === 404 || /NotFound/.test(reason)) throw new YouTubeError("notFound");
    throw new YouTubeError("upstream", reason || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

interface ApiVideo {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    description?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
}

const VIDEO_FIELDS =
  "items(id,snippet(title,channelTitle,publishedAt,description,liveBroadcastContent,thumbnails(medium/url,high/url)),contentDetails/duration,status(embeddable,privacyStatus))";

function firstLines(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 180 ? `${flat.slice(0, 177).trimEnd()}…` : flat;
}

export function toSummary(v: ApiVideo): VideoSummary | null {
  const s = v.snippet;
  if (!s?.title) return null;
  // Scheduled premieres have nothing to watch yet.
  if (s.liveBroadcastContent === "upcoming") return null;
  const live = s.liveBroadcastContent === "live";
  const duration = parseIsoDuration(v.contentDetails?.duration);
  return {
    id: v.id,
    title: s.title,
    channelTitle: s.channelTitle ?? "",
    publishedAt: s.publishedAt ?? "",
    durationSec: live || !duration ? null : duration,
    live,
    thumbnail: s.thumbnails?.medium?.url ?? s.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
    snippet: firstLines(s.description ?? ""),
  };
}

async function videosById(ids: string[]): Promise<ApiVideo[]> {
  if (ids.length === 0) return [];
  const data = await api<{ items?: ApiVideo[] }>("/videos", {
    part: "snippet,contentDetails,status",
    id: ids.join(","),
    maxResults: "50",
    fields: VIDEO_FIELDS,
  });
  return data.items ?? [];
}

// ------------------------------------------------------------------ search

async function searchCached(
  q: string,
  length: SearchInput["length"],
  sort: SearchInput["sort"],
  pageToken: string,
): Promise<SearchResult> {
  "use cache: remote";
  cacheLife("hours");

  const params: Record<string, string> = {
    part: "id",
    type: "video",
    videoEmbeddable: "true",
    q,
    maxResults: String(PAGE_SIZE),
    order: sort,
    fields: "nextPageToken,items/id/videoId",
  };
  if (length !== "any") params.videoDuration = length;
  if (pageToken) params.pageToken = pageToken;

  const found = await api<{ nextPageToken?: string; items?: { id?: { videoId?: string } }[] }>("/search", params);
  const ids = (found.items ?? []).map((i) => i.id?.videoId).filter((id): id is string => !!id);
  const details = await videosById(ids);
  const byId = new Map(details.map((v) => [v.id, v]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((v): v is ApiVideo => !!v && v.status?.embeddable !== false)
    .map(toSummary)
    .filter((v): v is VideoSummary => v !== null);

  return { items, nextPageToken: found.nextPageToken ?? null };
}

export async function searchVideos(input: SearchInput): Promise<SearchResult> {
  if (usingSampleData()) return sampleSearch(input);
  return searchCached(input.q.toLowerCase(), input.length, input.sort, input.pageToken ?? "");
}

// ------------------------------------------------------------------- video

async function videoCached(id: string): Promise<VideoDetail> {
  "use cache: remote";
  cacheLife("hours");

  const [v] = await videosById([id]);
  if (!v || v.status?.privacyStatus === "private") throw new YouTubeError("notFound");
  const summary = toSummary({ ...v, snippet: { ...v.snippet, liveBroadcastContent: v.snippet?.liveBroadcastContent === "upcoming" ? "none" : v.snippet?.liveBroadcastContent } });
  if (!summary) throw new YouTubeError("notFound");
  const { snippet: _snippet, ...rest } = summary;
  void _snippet;
  return {
    ...rest,
    thumbnail: v.snippet?.thumbnails?.high?.url ?? rest.thumbnail,
    description: v.snippet?.description ?? "",
    embeddable: v.status?.embeddable !== false,
  };
}

/** oEmbed needs no API key or quota, so it backs up the API. */
async function videoFromOEmbed(id: string): Promise<VideoDetail | null> {
  "use cache: remote";
  cacheLife("hours");

  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    if (!data.title) return null;
    return {
      id,
      title: data.title,
      channelTitle: data.author_name ?? "",
      publishedAt: "",
      durationSec: null,
      live: false,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      description: "",
      embeddable: true,
      partial: true,
    };
  } catch {
    return null;
  }
}

/**
 * Video details. If the API fails for reasons other than "not found",
 * falls back to oEmbed, then to a bare record, so the video still plays.
 */
export async function getVideo(id: string): Promise<VideoDetail> {
  if (usingSampleData()) return sampleVideo(id);
  try {
    return await videoCached(id);
  } catch (error) {
    if (error instanceof Error && /youtube:notFound/.test(error.message)) throw error;
    const fallback = await videoFromOEmbed(id);
    return (
      fallback ?? {
        id,
        title: "YouTube video",
        channelTitle: "",
        publishedAt: "",
        durationSec: null,
        live: false,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        description: "",
        embeddable: true,
        partial: true,
      }
    );
  }
}

// ---------------------------------------------------------------- playlist

async function playlistCached(id: string): Promise<Playlist> {
  "use cache: remote";
  cacheLife("hours");

  const meta = await api<{ items?: { snippet?: { title?: string; channelTitle?: string } }[] }>("/playlists", {
    part: "snippet",
    id,
    fields: "items/snippet(title,channelTitle)",
  });
  const info = meta.items?.[0]?.snippet;
  if (!info) throw new YouTubeError("notFound");

  const ids: string[] = [];
  let pageToken = "";
  let truncated = false;
  for (let page = 0; page < MAX_PLAYLIST_PAGES; page++) {
    const params: Record<string, string> = {
      part: "contentDetails",
      playlistId: id,
      maxResults: "50",
      fields: "nextPageToken,items/contentDetails/videoId",
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await api<{ nextPageToken?: string; items?: { contentDetails?: { videoId?: string } }[] }>(
      "/playlistItems",
      params,
    );
    for (const item of data.items ?? []) {
      const vid = item.contentDetails?.videoId;
      if (vid) ids.push(vid);
    }
    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
    if (page === MAX_PLAYLIST_PAGES - 1) truncated = true;
  }

  const details: ApiVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) details.push(...(await videosById(ids.slice(i, i + 50))));
  const byId = new Map(details.map((v) => [v.id, v]));

  const items: Playlist["items"] = [];
  const seen = new Set<string>();
  for (const vid of ids) {
    const v = byId.get(vid);
    // Deleted and private videos come back without details; skip them.
    if (!v || seen.has(vid) || v.status?.privacyStatus === "private") continue;
    const summary = toSummary(v);
    if (!summary) continue;
    seen.add(vid);
    const { snippet: _snippet, ...rest } = summary;
    void _snippet;
    items.push(rest);
  }
  if (items.length === 0) throw new YouTubeError("notFound");

  return {
    id,
    title: info.title ?? "Playlist",
    channelTitle: info.channelTitle ?? "",
    items,
    totalSec: items.reduce((sum, v) => sum + (v.durationSec ?? 0), 0),
    truncated,
  };
}

export async function getPlaylist(id: string): Promise<Playlist> {
  if (usingSampleData()) return samplePlaylist(id);
  return playlistCached(id);
}
