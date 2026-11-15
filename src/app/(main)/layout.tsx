import Link from "next/link";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, SiteHeaderFallback } from "@/components/site-header";
import { SITE } from "@/lib/site";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="shell">
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <div id="main" className="shell__content">
        {children}
      </div>
      <SiteFooter>
        <Link href="/">Home</Link>
        <Link href="/privacy">Privacy</Link>
        <a href={SITE.repo} target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </SiteFooter>
    </div>
  );
}
