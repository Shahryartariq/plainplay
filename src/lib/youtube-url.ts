/**
 * Turns whatever someone pastes into the search box into a Plainplay target.
 * Only links are recognised; plain words are a search.
 */

export type ParsedInput =
  | { type: "video"; id: string; list?: string; start?: number }
  | { type: "playlist"; list: string }
  | { type: "unsupported"; reason: "channel" | "other" };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const LIST_ID = /^[A-Za-z0-9_-]{2,64}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);

export function isVideoId(value: unknown): value is string {
  return typeof value === "string" && VIDEO_ID.test(value);
}

/**
 * Playlists Plainplay will open. Mixes ("RD…") are YouTube's own
 * recommendations, and WL/LL/LM are private lists the API can't read.
 */
export function isPlayableListId(value: unknown): value is string {
  if (typeof value !== "string" || !LIST_ID.test(value)) return false;
  if (value.startsWith("RD")) return false;
  if (value === "WL" || value === "LL" || value === "LM") return false;
  return value.length >= 10;
}

/** "90", "90s", "1m30s", "1h2m3s" → seconds. */
export function parseStart(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (/^\d+$/.test(v)) return clampStart(Number(v));
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v);
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined;
  return clampStart(Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0));
}

function clampStart(n: number): number | undefined {
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.floor(n), 24 * 3600);
}

function toUrl(raw: string): URL | null {
  let text = raw.trim();
  if (!text || /\s/.test(text)) return null;
  if (!/^https?:\/\//i.test(text)) {
    if (!/^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i.test(text)) {
      return null;
    }
    text = `https://${text}`;
  }
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

export function parseYouTubeInput(raw: string): ParsedInput | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const isShort = SHORT_HOSTS.has(host);
  if (!isShort && !YOUTUBE_HOSTS.has(host)) return null;

  const params = url.searchParams;
  const list = params.get("list") ?? undefined;
  const start = parseStart(params.get("t") ?? params.get("start"));
  const segments = url.pathname.split("/").filter(Boolean);

  const video = (id: string | undefined): ParsedInput | null => {
    if (!isVideoId(id)) return { type: "unsupported", reason: "other" };
    const result: ParsedInput = { type: "video", id };
    if (isPlayableListId(list)) result.list = list;
    if (start) result.start = start;
    return result;
  };

  if (isShort) return video(segments[0]);

  const [first, second] = segments;
  if (!first) return { type: "unsupported", reason: "other" };

  switch (first.toLowerCase()) {
    case "watch": {
      const v = params.get("v");
      if (v) return video(v);
      if (isPlayableListId(list)) return { type: "playlist", list };
      return { type: "unsupported", reason: "other" };
    }
    case "playlist":
      return isPlayableListId(list) ? { type: "playlist", list } : { type: "unsupported", reason: "other" };
    case "shorts":
    case "embed":
    case "live":
    case "v":
    case "e":
      return video(second);
    case "channel":
    case "c":
    case "user":
      return { type: "unsupported", reason: "channel" };
    default:
      if (first.startsWith("@")) return { type: "unsupported", reason: "channel" };
      return { type: "unsupported", reason: "other" };
  }
}

export function watchHref(target: { id?: string; list?: string; start?: number }): string {
  const params = new URLSearchParams();
  if (target.id) params.set("v", target.id);
  if (target.list) params.set("list", target.list);
  if (target.start) params.set("t", String(target.start));
  return `/watch?${params.toString()}`;
}

export function hrefForInput(parsed: Exclude<ParsedInput, { type: "unsupported" }>): string {
  return parsed.type === "playlist"
    ? watchHref({ list: parsed.list })
    : watchHref({ id: parsed.id, list: parsed.list, start: parsed.start });
}

export function youtubeWatchUrl(id: string, list?: string, start?: number): string {
  const params = new URLSearchParams({ v: id });
  if (list) params.set("list", list);
  if (start) params.set("t", `${start}s`);
  return `https://www.youtube.com/watch?${params.toString()}`;
}
