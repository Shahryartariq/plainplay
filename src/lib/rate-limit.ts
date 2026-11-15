/**
 * Small sliding-window limiter kept in memory. It is per server instance,
 * which is enough to stop one visitor from burning the shared YouTube quota.
 */
export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 5000,
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + this.windowMs - now) / 1000)) };
    }
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) {
      // Drop the least recently used key.
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    return { ok: true };
  }
}

/** First address in x-forwarded-for, falling back to x-real-ip. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "local";
}

function limitFromEnv(): number {
  const n = Number(process.env.SEARCH_RATE_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 30;
}

/** Searches cost 100 quota units each, so they get a limit (per 10 minutes). */
export const searchLimiter = new RateLimiter(limitFromEnv(), 10 * 60 * 1000);
