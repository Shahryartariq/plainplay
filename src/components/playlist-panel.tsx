"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatClock, formatSpan } from "@/lib/format";
import type { Playlist } from "@/lib/types";
import { watchHref } from "@/lib/youtube-url";
import { ListIcon } from "./icons";

export function PlaylistPanel({ playlist, currentId }: { playlist: Playlist; currentId: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const index = playlist.items.findIndex((v) => v.id === currentId);

  // Keep the current video in view inside the list (without moving the page).
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>("[aria-current='true']");
    if (list && current) list.scrollTop = current.offsetTop - list.clientHeight / 2 + current.clientHeight / 2;
  }, [currentId]);

  return (
    <aside className="playlist" aria-label={`Playlist: ${playlist.title}`}>
      <div className="playlist__head">
        <ListIcon width={18} height={18} />
        <div>
          <h2 className="playlist__title">{playlist.title}</h2>
          <p className="playlist__meta">
            {index >= 0 ? `${index + 1} of ${playlist.items.length}` : `${playlist.items.length} videos`}
            {playlist.totalSec > 0 && ` · ${formatSpan(playlist.totalSec)} total`}
            {playlist.truncated && " · first 500 shown"}
          </p>
        </div>
      </div>
      <ol ref={listRef} className="playlist__items">
        {playlist.items.map((v, i) => {
          const current = v.id === currentId;
          return (
            <li key={v.id}>
              <Link
                href={watchHref({ id: v.id, list: playlist.id })}
                className="playlist__item"
                aria-current={current ? "true" : undefined}
              >
                <span className="playlist__index" aria-hidden>
                  {current ? "▶" : i + 1}
                </span>
                <span className="playlist__thumb thumb">
                  <Image src={v.thumbnail} alt="" width={120} height={68} unoptimized />
                </span>
                <span className="playlist__text">
                  <span className="playlist__item-title">{v.title}</span>
                  <span className="playlist__item-meta">
                    {v.live ? "Live" : v.durationSec !== null ? formatClock(v.durationSec) : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
