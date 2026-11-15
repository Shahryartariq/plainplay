import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Plainplay stores and what it sends to YouTube.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="prose">
      <h1>Privacy</h1>
      <p>Plainplay has no accounts, no analytics and no ads.</p>

      <h2>What stays in your browser</h2>
      <ul>
        <li>Your settings: theme, thumbnails, the paused-video cover and playlist autoplay.</li>
        <li>Where you stopped in each video, so you can pick up later. Up to 200 videos are kept.</li>
      </ul>
      <p>Both live in your browser&apos;s local storage. Clearing site data removes them.</p>

      <h2>What goes to YouTube</h2>
      <ul>
        <li>
          Your searches go from Plainplay&apos;s server to the YouTube Data API. Results are cached for about an hour
          so the same search isn&apos;t sent again.
        </li>
        <li>
          Videos play in YouTube&apos;s privacy-enhanced player (youtube-nocookie.com). YouTube&apos;s own{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            privacy policy
          </a>{" "}
          applies to the player.
        </li>
      </ul>

      <h2>What the server keeps</h2>
      <p>
        To stop one visitor from using up the shared search allowance, the server counts searches per network address
        for ten minutes, in memory only. Nothing is written to a database.
      </p>

      <p>
        Plainplay is open source: <a href={SITE.repo}>read the code on GitHub</a>. <Link href="/">Back to search</Link>.
      </p>
    </main>
  );
}
