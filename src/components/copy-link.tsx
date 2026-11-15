"use client";

import { useEffect, useState } from "react";
import { CheckIcon, LinkIcon } from "./icons";

export function CopyLink() {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      className="button button--ghost button--small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied("ok");
        } catch {
          setCopied("fail");
        }
      }}
    >
      {copied === "ok" ? <CheckIcon width={16} height={16} /> : <LinkIcon width={16} height={16} />}
      <span aria-live="polite">{copied === "ok" ? "Copied" : copied === "fail" ? "Couldn't copy" : "Copy link"}</span>
    </button>
  );
}
