"use client";

import { useEffect } from "react";
import { applyPrefs, read, usePrefs } from "./use-prefs";

/** Keeps <html> in step with saved settings, other tabs and the system theme. */
export function ThemeSync() {
  const [prefs] = usePrefs();

  useEffect(() => {
    // Read storage directly: during hydration `prefs` briefly holds the
    // defaults, and applying those would flash the wrong theme.
    const saved = read();
    applyPrefs(saved);
    if (saved.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyPrefs(read());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [prefs]);

  return null;
}
