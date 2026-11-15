export type LengthFilter = "any" | "short" | "medium" | "long";
export type SortOrder = "relevance" | "date" | "viewCount";

export const LENGTH_FILTERS: { value: LengthFilter; label: string }[] = [
  { value: "any", label: "Any length" },
  { value: "short", label: "Under 4 min" },
  { value: "medium", label: "4–20 min" },
  { value: "long", label: "Over 20 min" },
];

export const SORT_ORDERS: { value: SortOrder; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "date", label: "Newest" },
  { value: "viewCount", label: "Most viewed" },
];

export function parseLength(value: unknown): LengthFilter {
  return LENGTH_FILTERS.some((f) => f.value === value) ? (value as LengthFilter) : "any";
}

export function parseSort(value: unknown): SortOrder {
  return SORT_ORDERS.some((s) => s.value === value) ? (value as SortOrder) : "relevance";
}

export interface VideoSummary {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  /** null for live streams. */
  durationSec: number | null;
  live: boolean;
  thumbnail: string;
  /** First line or two of the description. */
  snippet: string;
}

export interface VideoDetail extends Omit<VideoSummary, "snippet"> {
  description: string;
  embeddable: boolean;
  /** True when YouTube's API was unavailable and only oEmbed data is shown. */
  partial?: boolean;
}

export interface SearchInput {
  q: string;
  length: LengthFilter;
  sort: SortOrder;
  pageToken?: string;
}

export interface SearchResult {
  items: VideoSummary[];
  nextPageToken: string | null;
}

export interface Playlist {
  id: string;
  title: string;
  channelTitle: string;
  items: Omit<VideoSummary, "snippet">[];
  totalSec: number;
  /** True when the playlist is longer than Plainplay loads. */
  truncated: boolean;
}

export type YouTubeErrorCode = "quota" | "config" | "notFound" | "upstream" | "rateLimited";

export class YouTubeError extends Error {
  constructor(
    readonly code: YouTubeErrorCode,
    message?: string,
    readonly retryAfter?: number,
  ) {
    // The code is kept in the message too, because errors thrown inside
    // cached functions can lose their class on the way out.
    super(`youtube:${code}${message ? ` ${message}` : ""}`);
    this.name = "YouTubeError";
  }
}

const CODES: YouTubeErrorCode[] = ["quota", "config", "notFound", "upstream", "rateLimited"];

export function errorCode(error: unknown): YouTubeErrorCode {
  if (error instanceof YouTubeError) return error.code;
  const message = error instanceof Error ? error.message : String(error);
  const match = /youtube:(\w+)/.exec(message);
  return match && CODES.includes(match[1] as YouTubeErrorCode) ? (match[1] as YouTubeErrorCode) : "upstream";
}
