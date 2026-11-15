import Link from "next/link";
import type { YouTubeErrorCode } from "@/lib/types";

const COPY: Record<YouTubeErrorCode, { title: string; body: string }> = {
  quota: {
    title: "Searching is paused for today",
    body: "Plainplay has used its daily allowance from YouTube. Pasting a link to a video or playlist still works, and searching comes back tomorrow.",
  },
  rateLimited: {
    title: "That's a lot of searches",
    body: "Take a breath and try again in a minute.",
  },
  config: {
    title: "Search isn't set up yet",
    body: "This copy of Plainplay is missing its YouTube API key. Pasting a video link still works.",
  },
  notFound: {
    title: "Nothing here",
    body: "This video or playlist doesn't exist, or it's private.",
  },
  upstream: {
    title: "YouTube didn't answer",
    body: "This is usually brief. Try again in a moment.",
  },
};

export function ErrorState({ code, retryHref }: { code: YouTubeErrorCode; retryHref?: string }) {
  const copy = COPY[code];
  return (
    <main className="page-message">
    <div className="empty-state" role="alert">
      <h1 className="empty-state__title">{copy.title}</h1>
      <p className="empty-state__body">{copy.body}</p>
      <div className="empty-state__actions">
        {retryHref && (code === "upstream" || code === "rateLimited") && (
          <Link className="button" href={retryHref}>
            Try again
          </Link>
        )}
        <Link className="button button--ghost" href="/">
          Back to Plainplay
        </Link>
      </div>
    </div>
    </main>
  );
}
