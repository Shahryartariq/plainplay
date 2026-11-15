"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogoMark } from "./icons";
import { SearchForm } from "./search-form";
import { SettingsMenu } from "./settings-menu";

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = pathname === "/search" ? (searchParams.get("q") ?? "") : "";

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Plainplay home">
        <LogoMark />
        <span className="brand__name">plainplay</span>
      </Link>
      <div className="site-header__search">
        {/* Keyed by the query so the box updates when you go back/forward. */}
        <SearchForm key={q} defaultValue={q} />
      </div>
      <SettingsMenu />
    </header>
  );
}

/** Same height as the header, shown while it waits for the URL. */
export function SiteHeaderFallback() {
  return (
    <header className="site-header" aria-hidden>
      <span className="brand">
        <LogoMark />
        <span className="brand__name">plainplay</span>
      </span>
      <div className="site-header__search">
        <div className="search-form search-form--compact search-form--placeholder" />
      </div>
      <span className="icon-button" />
    </header>
  );
}
