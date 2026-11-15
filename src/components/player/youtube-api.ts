/** Just the parts of the YouTube IFrame Player API that Plainplay uses. */

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

export interface YTEvent<T = unknown> {
  target: YTPlayer;
  data: T;
}

export interface YTPlayerOptions {
  host?: string;
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number | undefined>;
  events?: {
    onReady?: (e: YTEvent) => void;
    onStateChange?: (e: YTEvent<number>) => void;
    onError?: (e: YTEvent<number>) => void;
  };
}

export interface YTNamespace {
  Player: new (el: HTMLElement, options: YTPlayerOptions) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

let loading: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(timeoutMs = 15000): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YTNamespace>((resolve, reject) => {
    const fail = () => {
      loading = null;
      script.remove();
      reject(new Error("The YouTube player could not be loaded."));
    };
    const timer = window.setTimeout(fail, timeoutMs);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else fail();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      fail();
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Player error codes → what to tell the viewer. */
export function playerErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return "This video link looks broken.";
    case 5:
      return "Your browser couldn't play this video.";
    case 100:
      return "This video was removed or made private.";
    case 101:
    case 150:
    case 152:
      return "The owner only allows this video to play on YouTube.";
    case 153:
      return "YouTube refused to play this video here.";
    default:
      return "Something went wrong while playing this video.";
  }
}
