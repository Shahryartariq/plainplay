"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const EVENT = "plainplay:navstart";

/** Call before router.push so the top bar shows straight away. */
export function startNavigation() {
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Thin loading bar at the top of the page while a new page loads.
 * Starts on internal link clicks and form searches, ends when the URL changes.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams.toString()}`;
  const [state, setState] = useState<{ phase: "idle" | "loading" | "done"; from: string }>({
    phase: "idle",
    from: url,
  });

  // The URL changed: finish the bar (state is adjusted during render, per React's guidance).
  if (state.phase === "loading" && state.from !== url) {
    setState({ phase: "done", from: url });
  }

  useEffect(() => {
    const begin = () => setState((s) => ({ phase: "loading", from: s.phase === "loading" ? s.from : currentUrl() }));
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const next = new URL(a.href, location.href);
      if (next.origin !== location.origin) return;
      if (next.pathname === location.pathname && next.search === location.search) return;
      begin();
    };
    window.addEventListener(EVENT, begin);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener(EVENT, begin);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (state.phase === "done") {
      const t = setTimeout(() => setState((s) => (s.phase === "done" ? { ...s, phase: "idle" } : s)), 400);
      return () => clearTimeout(t);
    }
    if (state.phase === "loading") {
      // Never leave the bar stuck if a navigation is cancelled.
      const t = setTimeout(() => setState((s) => (s.phase === "loading" ? { ...s, phase: "idle" } : s)), 15000);
      return () => clearTimeout(t);
    }
  }, [state.phase]);

  return <div className="nav-progress" data-phase={state.phase} aria-hidden />;
}

function currentUrl() {
  return `${location.pathname}?${new URLSearchParams(location.search).toString()}`;
}
