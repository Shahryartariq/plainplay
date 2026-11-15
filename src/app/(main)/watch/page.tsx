import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CopyLink } from "@/components/copy-link";
import { Description } from "@/components/description";
import { ErrorState } from "@/components/error-state";
import { ExternalIcon } from "@/components/icons";
import { Player } from "@/components/player/player";
import { PlaylistPanel } from "@/components/playlist-panel";
import { formatDate, formatSpan } from "@/lib/format";
import { errorCode, type Playlist, type VideoDetail } from "@/lib/types";
import { getPlaylist, getVideo } from "@/lib/youtube";
import { isPlayableListId, isVideoId, parseStart, watchHref, youtubeWatchUrl } from "@/lib/youtube-url";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function readParams(searchParams: PageProps<"/watch">["searchParams"]) {
  const sp = await searchParams;
  const v = first(sp.v);
  const list = first(sp.list);
  return {
    id: isVideoId(v) ? v : undefined,
    list: isPlayableListId(list) ? list : undefined,
    start: parseStart(first(sp.t) ?? first(sp.start)),
  };
}

export async function generateMetadata({ searchParams }: PageProps<"/watch">): Promise<Metadata> {
  const { id } = await readParams(searchParams);
  const robots = { index: false, follow: false };
  if (!id) return { title: "Watch", robots };
  try {
    const video = await getVideo(id);
    return { title: video.title, robots };
  } catch {
    return { title: "Video not found", robots };
  }
}

async function loadPlaylist(list: string): Promise<Playlist | null> {
  try {
    return await getPlaylist(list);
  } catch {
    return null;
  }
}

export default async function WatchPage({ searchParams }: PageProps<"/watch">) {
  const { id, list, start } = await readParams(searchParams);

  // A playlist link without a video starts at the first video.
  if (!id && list) {
    let playlist: Playlist;
    try {
      playlist = await getPlaylist(list);
    } catch (error) {
      return <ErrorState code={errorCode(error)} retryHref={watchHref({ list })} />;
    }
    redirect(watchHref({ id: playlist.items[0].id, list }));
  }
  if (!id) notFound();

  const [videoResult, playlist] = await Promise.all([
    getVideo(id).then(
      (video): { video: VideoDetail } => ({ video }),
      (error: unknown) => ({ error }),
    ),
    list ? loadPlaylist(list) : Promise.resolve(null),
  ]);
  if ("error" in videoResult) {
    if (errorCode(videoResult.error) === "notFound") notFound();
    return <ErrorState code={errorCode(videoResult.error)} retryHref={watchHref({ id, list, start })} />;
  }
  const { video } = videoResult;

  const index = playlist ? playlist.items.findIndex((v) => v.id === id) : -1;
  const nextItem = playlist && index >= 0 ? playlist.items[index + 1] : undefined;
  const next = nextItem ? { href: watchHref({ id: nextItem.id, list }), title: nextItem.title } : null;

  const meta = [
    video.channelTitle,
    video.publishedAt && formatDate(video.publishedAt),
    video.live ? "Live" : video.durationSec ? formatSpan(video.durationSec) : "",
  ].filter(Boolean);

  return (
    <main className={`watch${playlist ? " watch--with-list" : ""}`}>
      <div className="watch__main">
        <Player
          key={video.id}
          id={video.id}
          title={video.title}
          embeddable={video.embeddable}
          list={playlist ? list : undefined}
          start={start}
          next={next}
          thumbnail={video.thumbnail}
        />
        <div className="watch__info">
          <h1 className="watch__title">{video.title}</h1>
          <div className="watch__row">
            <p className="watch__meta">
              {meta.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </p>
            <div className="watch__actions">
              <CopyLink />
              <a
                className="button button--ghost button--small"
                href={youtubeWatchUrl(video.id, playlist ? list : undefined)}
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube <ExternalIcon width={16} height={16} />
                <span className="visually-hidden">(opens in a new tab)</span>
              </a>
            </div>
          </div>
          {list && !playlist && (
            <p className="notice">This playlist couldn&apos;t be loaded, so only this video is shown.</p>
          )}
          <Description text={video.description} />
        </div>
      </div>
      {playlist && <PlaylistPanel playlist={playlist} currentId={video.id} />}
    </main>
  );
}
