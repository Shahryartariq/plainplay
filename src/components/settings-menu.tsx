"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Prefs, ThemePref } from "@/lib/prefs";
import { SettingsIcon } from "./icons";
import { usePrefs } from "./use-prefs";

const THEMES: { value: ThemePref; label: string; hint: string }[] = [
  { value: "system", label: "Auto", hint: "Follows your device" },
  { value: "light", label: "Light", hint: "Bright and clean" },
  { value: "dark", label: "Dark", hint: "Easy on the eyes" },
  { value: "night", label: "Night", hint: "True black, warm text" },
];

const TOGGLES: { key: keyof Omit<Prefs, "theme">; label: string; hint: string }[] = [
  { key: "thumbnails", label: "Thumbnails", hint: "Turn off to choose by title, not by picture." },
  { key: "pauseShield", label: "Cover paused videos", hint: "Hides YouTube's “more videos” panel when you pause." },
  { key: "autoplayNext", label: "Autoplay playlists", hint: "Plays the next video of a playlist you opened." },
];

export function SettingsMenu() {
  const [prefs, update] = usePrefs();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    panelRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="settings">
      <button
        ref={buttonRef}
        type="button"
        className="icon-button settings__button"
        aria-label="Settings"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
      >
        <SettingsIcon />
      </button>
      <div
        ref={panelRef}
        id={`${id}-panel`}
        className="settings__panel"
        role="dialog"
        aria-label="Settings"
        hidden={!open}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (next && !panelRef.current?.contains(next) && !buttonRef.current?.contains(next)) setOpen(false);
        }}
      >
        <fieldset className="settings__group">
          <legend>Appearance</legend>
          <div className="theme-picker">
            {THEMES.map((t) => (
              <label key={t.value} className="theme-picker__option" data-theme-option={t.value}>
                <input
                  type="radio"
                  name={`${id}-theme`}
                  value={t.value}
                  checked={prefs.theme === t.value}
                  onChange={() => update({ theme: t.value })}
                />
                <span className="theme-picker__swatch" aria-hidden />
                <span className="theme-picker__label">{t.label}</span>
                <span className="visually-hidden">: {t.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="settings__group">
          <legend>Focus</legend>
          {TOGGLES.map((t) => (
            <label key={t.key} className="switch-row">
              <span className="switch-row__text">
                <span className="switch-row__label">{t.label}</span>
                <span className="switch-row__hint">{t.hint}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={prefs[t.key]}
                onChange={(e) => update({ [t.key]: e.target.checked })}
              />
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
