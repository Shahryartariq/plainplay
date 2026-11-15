import { normalizeQuery } from "@/lib/format";
import { clientKey, searchLimiter } from "@/lib/rate-limit";
import { errorCode, parseLength, parseSort } from "@/lib/types";
import { searchVideos } from "@/lib/youtube";

const STATUS = { quota: 503, config: 503, notFound: 404, upstream: 502, rateLimited: 429 } as const;

/** Next page of search results, for the "Load more" button. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = normalizeQuery(url.searchParams.get("q"));
  const pageToken = (url.searchParams.get("pageToken") ?? "").slice(0, 200);
  if (!q || !/^[\w-]+$/.test(pageToken)) {
    return Response.json({ error: "badRequest" }, { status: 400 });
  }

  const limit = searchLimiter.check(clientKey(request.headers));
  if (!limit.ok) {
    return Response.json(
      { error: "rateLimited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  try {
    const result = await searchVideos({
      q,
      length: parseLength(url.searchParams.get("length")),
      sort: parseSort(url.searchParams.get("sort")),
      pageToken,
    });
    return Response.json(result, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    const code = errorCode(error);
    return Response.json({ error: code }, { status: STATUS[code], headers: { "Cache-Control": "no-store" } });
  }
}
