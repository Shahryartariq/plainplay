/** ISO 8601 duration ("PT1H2M3S", "P1DT2H") → seconds. Unknown → null. */
export function parseIsoDuration(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value);
  if (!m) return null;
  const [, w, d, h, min, s] = m;
  return (
    Number(w ?? 0) * 604800 +
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(min ?? 0) * 60 +
    Math.floor(Number(s ?? 0))
  );
}

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** 4500 → "1h 15m", 59 → "59s", 600 → "10m". */
export function formatSpan(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  if (t < 60) return `${t}s`;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Words a screen reader can say: 4500 → "1 hour 15 minutes". */
export function spokenDuration(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (s && !h) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 seconds";
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["week", 7 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 years ago", "yesterday". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Math.round((then - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return relative.format(Math.trunc(diff / size), unit);
  }
  return "just now";
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "12 Mar 2024" (UTC, so server and browser agree). */
export function formatDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : dateFormat.format(t);
}

/** Collapse whitespace and cap length so a search is a sane cache key. */
export function normalizeQuery(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}
