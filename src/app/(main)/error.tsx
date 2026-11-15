"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-message">
      <div className="empty-state" role="alert">
        <h1 className="empty-state__title">Something went wrong</h1>
        <p className="empty-state__body">This page didn&apos;t load. Trying again usually fixes it.</p>
        <div className="empty-state__actions">
          <button type="button" className="button" onClick={reset}>
            Try again
          </button>
          <Link className="button button--ghost" href="/">
            Back to search
          </Link>
        </div>
      </div>
    </main>
  );
}
