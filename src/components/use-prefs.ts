"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PREFS, PREFS_KEY, THEME_COLORS, sanitizePrefs, type Prefs } from "@/lib/prefs";

let cache: { raw: string | null; prefs: Prefs } | null = null;
const listeners = new Set<() => void>();

/** Current saved settings, read straight from storage. */
export function read(): Prefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFS_KEY);
  } catch {
    // Storage can be blocked (private mode, strict settings).
  }
  if (cache && cache.raw === raw) return cache.prefs;
  let parsed: unknown = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }
  cache = { raw, prefs: sanitizePrefs(parsed) };
  return cache.prefs;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PREFS_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function resolveTheme(theme: Prefs["theme"]): "light" | "dark" | "night" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyPrefs(prefs: Prefs) {
  const root = document.documentElement;
  const theme = resolveTheme(prefs.theme);
  root.dataset.theme = theme;
  root.dataset.thumbs = prefs.thumbnails ? "on" : "off";
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", THEME_COLORS[theme]));
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
  const update = useCallback((patch: Partial<Prefs>) => {
    const next = sanitizePrefs({ ...read(), ...patch });
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      cache = { raw: null, prefs: next };
    }
    applyPrefs(next);
    listeners.forEach((l) => l());
  }, []);
  return [prefs, update];
}
