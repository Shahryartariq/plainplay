import Link from "next/link";
import Image from "next/image";
import { formatClock, spokenDuration, timeAgo } from "@/lib/format";
import type { VideoSummary } from "@/lib/types";
import { watchHref } from "@/lib/youtube-url";

/** One search result. Used by the server-rendered page and by "Load more". */
export function ResultItem({ video, priority = false }: { video: VideoSummary; priority?: boolean }) {
  const duration = video.live ? "Live" : video.durationSec !== null ? formatClock(video.durationSec) : null;
  const spoken = video.live ? "Live" : video.durationSec !== null ? spokenDuration(video.durationSec) : null;
  const ago = video.publishedAt ? timeAgo(video.publishedAt) : "";

  return (
    <li className="result">
      <Link href={watchHref({ id: video.id })} className="result__link">
        <span className="result__thumb thumb">
          <Image
            src={video.thumbnail}
            alt=""
            width={320}
            height={180}
            sizes="(max-width: 640px) 100vw, 260px"
            priority={priority}
            unoptimized
          />
          {duration && (
            <span className="thumb__badge" data-live={video.live ? "" : undefined} aria-hidden>
              {duration}
            </span>
          )}
        </span>
        <span className="result__body">
          <span className="result__title">{video.title}</span>
          <span className="result__meta">
            <span>{video.channelTitle}</span>
            {spoken && (
              <span className="result__meta-duration">
                <span className="result__meta-clock" aria-hidden>{duration}</span>
                <span className="visually-hidden">{spoken}</span>
              </span>
            )}
            {ago && <span>{ago}</span>}
          </span>
          {video.snippet && <span className="result__snippet">{video.snippet}</span>}
        </span>
      </Link>
    </li>
  );
}
