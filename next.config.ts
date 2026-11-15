import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next.js inline bootstrap + the theme script; the IFrame API loads from youtube.com.
  `script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com https://*.ytimg.com https://yt3.ggpht.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // `BUILD_STANDALONE=1 next build` makes the small server the Dockerfile uses.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // YouTube's player needs the page origin as the referrer.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
