import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ErrorState } from "@/components/error-state";
import { LoadMore } from "@/components/load-more";
import { ResultItem } from "@/components/result-item";
import { normalizeQuery } from "@/lib/format";
import { clientKey, searchLimiter } from "@/lib/rate-limit";
import { LENGTH_FILTERS, SORT_ORDERS, errorCode, parseLength, parseSort, type LengthFilter, type SortOrder } from "@/lib/types";
import { searchVideos } from "@/lib/youtube";
import { hrefForInput, parseYouTubeInput } from "@/lib/youtube-url";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const q = normalizeQuery(first((await searchParams).q));
  return {
    title: q ? `“${q}”` : "Search",
    robots: { index: false, follow: false },
  };
}

function searchHref(q: string, length: LengthFilter, sort: SortOrder) {
  const params = new URLSearchParams({ q });
  if (length !== "any") params.set("length", length);
  if (sort !== "relevance") params.set("sort", sort);
  return `/search?${params.toString()}`;
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp: SearchParams = await searchParams;
  const q = normalizeQuery(first(sp.q));
  if (!q) redirect("/");

  // A pasted link submitted without JavaScript still goes to the video.
  const parsed = parseYouTubeInput(q);
  if (parsed && parsed.type !== "unsupported") redirect(hrefForInput(parsed));

  const length = parseLength(first(sp.length));
  const sort = parseSort(first(sp.sort));
  const self = searchHref(q, length, sort);

  // Everything below depends on the clock and the visitor, so render it per request.
  await connection();
  const limit = searchLimiter.check(clientKey(await headers()));
  if (!limit.ok) return <ErrorState code="rateLimited" retryHref={self} />;

  let result;
  try {
    result = await searchVideos({ q, length, sort });
  } catch (error) {
    return <ErrorState code={errorCode(error)} retryHref={self} />;
  }

  return (
    <main className="search-page">
      <div className="search-page__bar">
        <h1 className="search-page__heading">
          Results for <span className="search-page__query">“{q}”</span>
        </h1>
        <nav className="filters" aria-label="Filter results">
          <ul className="chips" aria-label="Length">
            {LENGTH_FILTERS.map((f) => (
              <li key={f.value}>
                <Link
                  className="chip"
                  href={searchHref(q, f.value, sort)}
                  aria-current={f.value === length ? "true" : undefined}
                  replace
                >
                  {f.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="chips chips--sort" aria-label="Sort">
            {SORT_ORDERS.map((s) => (
              <li key={s.value}>
                <Link
                  className="chip chip--quiet"
                  href={searchHref(q, length, s.value)}
                  aria-current={s.value === sort ? "true" : undefined}
                  replace
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {result.items.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-state__title">No videos found</h2>
          <p className="empty-state__body">
            {length !== "any" ? (
              <>
                Try <Link href={searchHref(q, "any", sort)}>any length</Link>, or different words.
              </>
            ) : (
              "Try different or fewer words."
            )}
          </p>
        </div>
      ) : (
        <>
          <ol className="results" aria-label="Results">
            {result.items.map((v, i) => (
              <ResultItem key={v.id} video={v} priority={i < 2} />
            ))}
          </ol>
          <LoadMore
            key={self}
            q={q}
            length={length}
            sort={sort}
            nextPageToken={result.nextPageToken}
            startIndex={result.items.length}
            initialIds={result.items.map((v) => v.id)}
          />
        </>
      )}
    </main>
  );
}
