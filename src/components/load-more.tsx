"use client";

import { useRef, useState } from "react";
import type { LengthFilter, SearchResult, SortOrder, VideoSummary } from "@/lib/types";
import { ResultItem } from "./result-item";

interface Props {
  q: string;
  length: LengthFilter;
  sort: SortOrder;
  nextPageToken: string | null;
  startIndex: number;
  /** Ids already on the page, so repeats from YouTube are skipped. */
  initialIds: string[];
}

const MESSAGES: Record<string, string> = {
  quota: "YouTube's daily limit for searches has been reached. Try again tomorrow.",
  rateLimited: "That's a lot of searches. Wait a minute and try again.",
};

export function LoadMore({ q, length, sort, nextPageToken, startIndex, initialIds }: Props) {
  const [items, setItems] = useState<VideoSummary[]>([]);
  const [token, setToken] = useState(nextPageToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const seen = useRef(new Set<string>(initialIds));

  async function load() {
    if (!token || loading) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q, length, sort, pageToken: token });
      const res = await fetch(`/api/search?${params.toString()}`, { headers: { Accept: "application/json" } });
      const data = (await res.json().catch(() => null)) as (SearchResult & { error?: string }) | null;
      if (!res.ok || !data || data.error) {
        setError(MESSAGES[data?.error ?? ""] ?? "Couldn't load more videos. Try again.");
        return;
      }
      // YouTube sometimes repeats a video across pages.
      const fresh = data.items.filter((v) => !seen.current.has(v.id));
      fresh.forEach((v) => seen.current.add(v.id));
      const firstNew = items.length;
      setItems((prev) => [...prev, ...fresh]);
      setToken(data.nextPageToken);
      // Move keyboard focus to the first new result.
      requestAnimationFrame(() => {
        listRef.current?.querySelectorAll<HTMLAnchorElement>(".result__link")[firstNew]?.focus();
      });
    } catch {
      setError("Couldn't load more videos. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {items.length > 0 && (
        <ol ref={listRef} className="results" start={startIndex + 1} aria-label="More results">
          {items.map((v) => (
            <ResultItem key={v.id} video={v} />
          ))}
        </ol>
      )}
      <div className="load-more">
        {error && (
          <p className="load-more__error" role="alert">
            {error}
          </p>
        )}
        {token ? (
          <button type="button" className="button button--ghost" onClick={load} disabled={loading} aria-busy={loading}>
            {loading && <span className="spinner spinner--small" aria-hidden />}
            {loading ? "Loading…" : "Load more"}
          </button>
        ) : (
          <p className="load-more__end">That&apos;s everything for this search.</p>
        )}
      </div>
    </>
  );
}
