"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatClock } from "@/lib/format";
import { youtubeWatchUrl } from "@/lib/youtube-url";
import { EyeIcon, ExternalIcon, NextIcon, PlayIcon, ReplayIcon } from "../icons";
import { startNavigation } from "../nav-progress";
import { read as readPrefs, usePrefs } from "../use-prefs";
import { clearPosition, getPosition, setPosition } from "./positions";
import { STATE, loadYouTubeApi, playerErrorMessage, type YTPlayer } from "./youtube-api";

export const SEEK_EVENT = "plainplay:seek";

/** Lets other components (like description timestamps) move the player. */
export function seekPlayer(seconds: number) {
  window.dispatchEvent(new CustomEvent<number>(SEEK_EVENT, { detail: seconds }));
}

type Status = "loading" | "ready" | "playing" | "paused" | "ended" | "error" | "blocked";

interface Props {
  id: string;
  title: string;
  embeddable: boolean;
  list?: string;
  /** Start time from the link, in seconds. Overrides the saved position. */
  start?: number;
  next?: { href: string; title: string } | null;
  thumbnail: string;
}

const SHIELD_DELAY = 600;
const AUTOPLAY_SECONDS = 5;

export function Player({ id, title, embeddable, list, start, next, thumbnail }: Props) {
  const router = useRouter();
  const [prefs] = usePrefs();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const shieldTimer = useRef<number | undefined>(undefined);
  const [status, setStatus] = useState<Status>(embeddable ? "loading" : "error");
  const [errorText, setErrorText] = useState(embeddable ? "" : playerErrorMessage(101));
  const [peek, setPeek] = useState(false);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const saveNow = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      setPosition(id, p.getCurrentTime(), p.getDuration());
    } catch {
      // Player not ready yet.
    }
  }, [id]);

  // Create the player. Re-created only when the video (or a retry) changes.
  useEffect(() => {
    if (!embeddable) return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const mount = document.createElement("div");
    host.appendChild(mount);

    const startAt = start ?? getPosition(id);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId: id,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            start: startAt,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              e.target.getIframe().setAttribute("title", `${title} (video player)`);
              setStatus("ready");
              if (startAt && start === undefined) setResumedAt(startAt);
            },
            onStateChange: (e) => {
              if (cancelled) return;
              window.clearTimeout(shieldTimer.current);
              switch (e.data) {
                case STATE.PLAYING:
                case STATE.BUFFERING:
                  setStatus("playing");
                  setPeek(false);
                  setCountdown(null);
                  break;
                case STATE.PAUSED:
                  saveNow();
                  // A short delay, so seeking (which pauses for a moment) doesn't flash the cover.
                  shieldTimer.current = window.setTimeout(() => setStatus("paused"), SHIELD_DELAY);
                  break;
                case STATE.ENDED:
                  clearPosition(id);
                  setStatus("ended");
                  setResumedAt(null);
                  if (nextRef.current && readPrefs().autoplayNext) setCountdown(AUTOPLAY_SECONDS);
                  break;
              }
            },
            onError: (e) => {
              if (cancelled) return;
              setErrorText(playerErrorMessage(e.data));
              setStatus("error");
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setStatus("blocked");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(shieldTimer.current);
      try {
        playerRef.current?.destroy();
      } catch {
        // Already gone.
      }
      playerRef.current = null;
      host.replaceChildren();
    };
    // `title` and `start` are read once per video on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, embeddable, attempt]);

  // Save the position every few seconds while playing, and when leaving.
  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(saveNow, 5000);
    window.addEventListener("pagehide", saveNow);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", saveNow);
      saveNow();
    };
  }, [status, saveNow]);

  // Timestamps in the description jump here.
  useEffect(() => {
    const onSeek = (e: Event) => {
      const seconds = (e as CustomEvent<number>).detail;
      const p = playerRef.current;
      if (!p || typeof seconds !== "number") return;
      p.seekTo(seconds, true);
      p.playVideo();
      const rect = hostRef.current?.getBoundingClientRect();
      if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
        hostRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.addEventListener(SEEK_EVENT, onSeek);
    return () => window.removeEventListener(SEEK_EVENT, onSeek);
  }, []);

  // Autoplay countdown for the next video in a playlist.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const target = nextRef.current;
      if (target) {
        startNavigation();
        router.push(target.href);
      }
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, router]);

  // The resume note fades out by itself.
  useEffect(() => {
    if (resumedAt === null) return;
    const timer = window.setTimeout(() => setResumedAt(null), 6000);
    return () => window.clearTimeout(timer);
  }, [resumedAt]);

  const play = () => playerRef.current?.playVideo();
  const replay = () => {
    setCountdown(null);
    playerRef.current?.seekTo(0, true);
    playerRef.current?.playVideo();
  };

  const showShield = status === "paused" && prefs.pauseShield && !peek;
  const youtubeUrl = youtubeWatchUrl(id, list, start);

  return (
    <section className="player" aria-label="Video player" data-status={status}>
      <div className="player__frame">
        <div ref={hostRef} className="player__host" />

        {status === "loading" && (
          <div className="player__overlay player__overlay--loading">
            <span className="spinner" role="status" aria-label="Loading video" />
          </div>
        )}

        {showShield && (
          <div className="player__overlay player__overlay--shield">
            <button type="button" className="player__big-button" onClick={play} aria-label="Resume video">
              <PlayIcon width={30} height={30} />
            </button>
            <p className="player__overlay-title">Paused</p>
            <button type="button" className="text-button" onClick={() => setPeek(true)}>
              <EyeIcon width={16} height={16} /> Show the frame
            </button>
          </div>
        )}

        {status === "ended" && (
          <div className="player__overlay player__overlay--ended">
            <p className="player__overlay-title">That&apos;s the end of the video.</p>
            <div className="player__actions">
              <button type="button" className="button button--ghost" onClick={replay}>
                <ReplayIcon width={18} height={18} /> Watch again
              </button>
              {next && (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setCountdown(null);
                    startNavigation();
                    router.push(next.href);
                  }}
                >
                  <NextIcon width={18} height={18} /> Next in playlist
                </button>
              )}
            </div>
            {next && (
              <p className="player__next" aria-live="polite">
                {countdown !== null ? (
                  <>
                    Up next in {countdown}s: <strong>{next.title}</strong>{" "}
                    <button type="button" className="text-button" onClick={() => setCountdown(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    Next: <strong>{next.title}</strong>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {(status === "error" || status === "blocked") && (
          <div className="player__overlay player__overlay--error">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="player__poster" src={thumbnail} alt="" />
            <div className="player__error-box">
              <p className="player__overlay-title">
                {status === "blocked"
                  ? "The YouTube player didn't load. A content blocker or a weak connection can cause this."
                  : errorText}
              </p>
              <div className="player__actions">
                {status === "blocked" && (
                  <button type="button" className="button" onClick={() => {
                    setStatus("loading");
                    setAttempt((a) => a + 1);
                  }}>
                    Try again
                  </button>
                )}
                <a className="button button--ghost" href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                  Watch on YouTube <ExternalIcon width={16} height={16} />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="player__toast" aria-live="polite" data-visible={resumedAt !== null ? "" : undefined}>
        {resumedAt !== null && (
          <>
            Resumed at {formatClock(resumedAt)}.{" "}
            <button type="button" className="text-button" onClick={() => {
              setResumedAt(null);
              clearPosition(id);
              playerRef.current?.seekTo(0, true);
            }}>
              Start from the beginning
            </button>
          </>
        )}
      </p>
    </section>
  );
}
