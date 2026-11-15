export const SITE = {
  name: "Plainplay",
  tagline: "YouTube without the rabbit hole",
  description:
    "Search and watch YouTube with no feed, no recommendations, no comments and no autoplaying suggestions. Just the video you came for.",
  url: (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  repo: "https://github.com/Shahryartariq/plainplay",
} as const;
