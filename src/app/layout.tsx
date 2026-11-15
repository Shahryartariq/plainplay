import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { NavProgress } from "@/components/nav-progress";
import { ThemeSync } from "@/components/theme-sync";
import { THEME_COLORS, THEME_SCRIPT } from "@/lib/prefs";
import { SITE } from "@/lib/site";
import "./globals.css";

const figtree = localFont({
  src: "../../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
  variable: "--font-sans",
  weight: "300 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: "website", siteName: SITE.name, title: `${SITE.name}: ${SITE.tagline}`, description: SITE.description, url: "/" },
  twitter: { card: "summary_large_image", title: `${SITE.name}: ${SITE.tagline}`, description: SITE.description },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLORS.light,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={figtree.variable} data-theme="light" data-thumbs="on" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
