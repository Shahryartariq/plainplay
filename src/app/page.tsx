import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { SearchForm } from "@/components/search-form";
import { SettingsMenu } from "@/components/settings-menu";
import { SiteFooter } from "@/components/site-footer";
import { SITE } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="home">
      <div className="home__top">
        <SettingsMenu />
      </div>
      <main id="main" className="home__main">
        <h1 className="home__brand">
          <LogoMark size={44} />
          <span>plainplay</span>
        </h1>
        <p className="home__tagline">Search, watch, done. No feed, no recommendations, no comments.</p>
        <SearchForm size="large" autoFocus />
        <ul className="home__points" aria-label="What Plainplay leaves out">
          <li>No suggested videos, before or after</li>
          <li>No Shorts shelf, no comments</li>
          <li>Paste a playlist link to work through a course</li>
        </ul>
      </main>
      <SiteFooter>
        <Link href="/privacy">Privacy</Link>
        <a href={SITE.repo} target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </SiteFooter>
    </div>
  );
}
