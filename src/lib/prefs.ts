/**
 * Viewer preferences, kept in localStorage. Shared by the inline theme
 * script (which runs before paint) and the React settings menu.
 */
export type ThemePref = "system" | "light" | "dark" | "night";

export interface Prefs {
  theme: ThemePref;
  thumbnails: boolean;
  pauseShield: boolean;
  autoplayNext: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  thumbnails: true,
  pauseShield: true,
  autoplayNext: true,
};

export const PREFS_KEY = "plainplay:prefs";

export const THEME_COLORS = { light: "#f6f6f2", dark: "#111214", night: "#000000" } as const;

export function sanitizePrefs(value: unknown): Prefs {
  const v = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof Prefs, unknown>>;
  return {
    theme: ["system", "light", "dark", "night"].includes(v.theme as string) ? (v.theme as ThemePref) : DEFAULT_PREFS.theme,
    thumbnails: typeof v.thumbnails === "boolean" ? v.thumbnails : DEFAULT_PREFS.thumbnails,
    pauseShield: typeof v.pauseShield === "boolean" ? v.pauseShield : DEFAULT_PREFS.pauseShield,
    autoplayNext: typeof v.autoplayNext === "boolean" ? v.autoplayNext : DEFAULT_PREFS.autoplayNext,
  };
}

/**
 * Runs in <head> before the page paints, so there is no light flash in
 * dark or night mode. Kept dependency-free on purpose.
 */
export const THEME_SCRIPT = `(function(){try{var p={};try{p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFS_KEY,
)})||"{}")||{}}catch(e){}var t=p.theme;if(t!=="light"&&t!=="dark"&&t!=="night"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var d=document.documentElement;d.dataset.theme=t;d.dataset.thumbs=p.thumbnails===false?"off":"on";var c=${JSON.stringify(
  THEME_COLORS,
)};document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c[t])})}catch(e){}})();`;
