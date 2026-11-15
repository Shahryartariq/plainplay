"use client";

import { useMemo } from "react";
import { tokenizeDescription } from "@/lib/text";
import { seekPlayer } from "./player/player";

/** Collapsed description: links open in a new tab, timestamps move the player. */
export function Description({ text }: { text: string }) {
  const tokens = useMemo(() => tokenizeDescription(text), [text]);
  if (!text.trim()) return null;

  return (
    <details className="description">
      <summary>Description</summary>
      <div className="description__body">
        {tokens.map((t, i) => {
          if (t.kind === "link") {
            return (
              <a key={i} href={t.href} target="_blank" rel="noopener noreferrer nofollow ugc">
                {t.value}
              </a>
            );
          }
          if (t.kind === "time") {
            return (
              <button key={i} type="button" className="timestamp" onClick={() => seekPlayer(t.seconds)}>
                {t.value}
              </button>
            );
          }
          return <span key={i}>{t.value}</span>;
        })}
      </div>
    </details>
  );
}
