import "server-only";
import type { Playlist, SearchInput, SearchResult, VideoDetail, VideoSummary } from "./types";
import { YouTubeError } from "./types";

/**
 * Made-up data used when PLAINPLAY_SAMPLE_DATA=1 (tests, demos) or when
 * there is no API key in development. Nothing here calls YouTube.
 */

const TOPICS: [string, string, number][] = [
  ["TypeScript generics, explained with real code", "Plain Code", 1342],
  ["Build a REST API with Node.js and Express", "Plain Code", 2710],
  ["React Server Components in 20 minutes", "Frontend Notes", 1205],
  ["CSS grid layouts you will actually use", "Frontend Notes", 845],
  ["How Bitcoin transactions work, step by step", "Chain Basics", 1960],
  ["Ethereum smart contracts for web developers", "Chain Basics", 3125],
  ["Neural networks from scratch in Python", "Learn ML", 4380],
  ["What is a transformer? A visual guide", "Learn ML", 1515],
  ["PostgreSQL indexes: when and why", "Data Desk", 1088],
  ["Git rebase without fear", "Plain Code", 734],
  ["Docker for beginners: images and containers", "Ops Shelf", 1876],
  ["Rust ownership in plain words", "Systems Hour", 2240],
  ["Next.js caching explained", "Frontend Notes", 1650],
  ["Linear algebra for machine learning", "Learn ML", 5400],
  ["Writing clean commit messages", "Plain Code", 412],
  ["Intro to web security: XSS and CSRF", "Safe Web", 1990],
  ["Deploying to Vercel in five minutes", "Ops Shelf", 318],
  ["JavaScript promises and async/await", "Plain Code", 1123],
  ["Tailwind or plain CSS? A calm comparison", "Frontend Notes", 960],
  ["How hash functions keep blockchains honest", "Chain Basics", 1404],
  ["Lo-fi focus music for deep work", "Quiet Room", 10800],
  ["Morning stretch routine (10 minutes)", "Quiet Room", 600],
  ["Python data classes in practice", "Data Desk", 815],
  ["Prompt engineering basics for developers", "Learn ML", 1290],
  ["Understanding HTTP caching headers", "Safe Web", 1037],
  ["Kubernetes in one diagram", "Ops Shelf", 1480],
  ["SQL joins with pictures", "Data Desk", 905],
  ["Zero-knowledge proofs, simply", "Chain Basics", 2105],
  ["Testing React apps with Playwright", "Frontend Notes", 1720],
  ["Quick tip: keyboard shortcuts in VS Code", "Plain Code", 45],
  ["Live: building a side project", "Systems Hour", -1],
  ["System design: a URL shortener", "Systems Hour", 2580],
  ["Regular expressions you can read", "Plain Code", 1150],
  ["Fine-tuning a small language model", "Learn ML", 3320],
  ["Accessible forms: labels, errors, focus", "Frontend Notes", 1260],
  ["Solidity security mistakes to avoid", "Chain Basics", 1845],
  ["Linux command line in 30 minutes", "Ops Shelf", 1800],
  ["Designing a database schema", "Data Desk", 2015],
  ["WebSockets vs Server-Sent Events", "Safe Web", 990],
  ["Clean architecture for frontend apps", "Frontend Notes", 2380],
  ["Gradient descent, visualised", "Learn ML", 1102],
  ["Building a CLI tool in Go", "Systems Hour", 1690],
];

const SNIPPET =
  "A focused walkthrough with examples you can follow along. Chapters below. 0:00 Intro 1:05 The idea 4:30 Example";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const ALL: VideoSummary[] = TOPICS.map(([title, channelTitle, duration], i) => ({
  id: `sampleVid${pad(i + 1)}`,
  title,
  channelTitle,
  publishedAt: new Date(Date.UTC(2026, 9, 28) - i * 9 * 86400000 - i * 3600000).toISOString(),
  durationSec: duration < 0 ? null : duration,
  live: duration < 0,
  thumbnail: `/samples/thumb-${(i % 6) + 1}.svg`,
  snippet: SNIPPET,
}));

const NO_EMBED: VideoSummary = {
  id: "noEmbedVid1",
  title: "A video its owner keeps on YouTube only",
  channelTitle: "Plain Code",
  publishedAt: "2025-04-02T10:00:00Z",
  durationSec: 600,
  live: false,
  thumbnail: "/samples/thumb-2.svg",
  snippet: SNIPPET,
};

export const SAMPLE_PLAYLIST_ID = "PLsampleCourse01";
const PLAYLIST_IDS = [1, 3, 13, 29, 35, 40, 18, 2].map((n) => `sampleVid${pad(n)}`);

const PAGE_SIZE = 20;

const DESCRIPTION = `A focused walkthrough you can follow along with.

Chapters
0:00 Intro
1:05 The idea
4:30 A worked example
12:10 Common mistakes

Code for this video: https://github.com/example/plain-code-samples
Questions? Write them down and try them yourself first.`;

function matches(video: VideoSummary, words: string[]): boolean {
  const haystack = `${video.title} ${video.channelTitle}`.toLowerCase();
  return words.some((w) => haystack.includes(w));
}

export function sampleSearch(input: SearchInput): SearchResult {
  const q = input.q.toLowerCase();
  if (q.includes("quota-test")) throw new YouTubeError("quota");
  if (q.includes("broken-test")) throw new YouTubeError("upstream");

  const words = q.split(/\s+/).filter((w) => w.length > 1);
  let items = q === "everything" ? ALL : ALL.filter((v) => matches(v, words));
  if (input.length !== "any") {
    items = items.filter((v) => {
      if (v.durationSec === null) return false;
      if (input.length === "short") return v.durationSec < 240;
      if (input.length === "medium") return v.durationSec >= 240 && v.durationSec <= 1200;
      return v.durationSec > 1200;
    });
  }
  if (input.sort === "date") items = [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (input.sort === "viewCount") items = [...items].sort((a, b) => a.title.length - b.title.length);

  const page = Math.max(0, Number(/^p(\d+)$/.exec(input.pageToken ?? "")?.[1] ?? 0));
  const slice = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const more = (page + 1) * PAGE_SIZE < items.length;
  return { items: slice, nextPageToken: more ? `p${page + 1}` : null };
}

export function sampleVideo(id: string): VideoDetail {
  const found = id === NO_EMBED.id ? NO_EMBED : ALL.find((v) => v.id === id);
  if (!found) throw new YouTubeError("notFound");
  const { snippet: _snippet, ...rest } = found;
  void _snippet;
  return { ...rest, description: DESCRIPTION, embeddable: found !== NO_EMBED };
}

export function samplePlaylist(id: string): Playlist {
  if (id !== SAMPLE_PLAYLIST_ID) throw new YouTubeError("notFound");
  const items = PLAYLIST_IDS.map((vid) => {
    const { snippet: _snippet, ...rest } = ALL.find((v) => v.id === vid)!;
    void _snippet;
    return rest;
  });
  return {
    id,
    title: "Web development, start to finish",
    channelTitle: "Plain Code",
    items,
    totalSec: items.reduce((sum, v) => sum + (v.durationSec ?? 0), 0),
    truncated: false,
  };
}
