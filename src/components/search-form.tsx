"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { hrefForInput, parseYouTubeInput } from "@/lib/youtube-url";
import { normalizeQuery } from "@/lib/format";
import { CloseIcon, SearchIcon } from "./icons";
import { startNavigation } from "./nav-progress";

interface Props {
  defaultValue?: string;
  size?: "large" | "compact";
  autoFocus?: boolean;
}

export function SearchForm({ defaultValue = "", size = "compact", autoFocus = false }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [message, setMessage] = useState("");
  const hintId = useId();

  // "/" jumps to the search box from anywhere, like on most sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = normalizeQuery(value);
    if (!text) {
      inputRef.current?.focus();
      return;
    }
    const parsed = parseYouTubeInput(text);
    if (parsed?.type === "unsupported") {
      setMessage(
        parsed.reason === "channel"
          ? "Channel links aren't supported. Paste a link to a video or a playlist."
          : "That YouTube link isn't one Plainplay can open. Paste a link to a video or a playlist.",
      );
      return;
    }
    setMessage("");
    const href = parsed ? hrefForInput(parsed) : `/search?q=${encodeURIComponent(text)}`;
    inputRef.current?.blur();
    if (href === `${location.pathname}${location.search}`) {
      router.refresh();
      return;
    }
    startNavigation();
    router.push(href);
  }

  return (
    <form
      role="search"
      action="/search"
      method="get"
      onSubmit={onSubmit}
      className={`search-form search-form--${size}`}
      data-invalid={message ? "" : undefined}
    >
      <label htmlFor={`${hintId}-input`} className="visually-hidden">
        Search YouTube or paste a link
      </label>
      <div className="search-form__field">
      <SearchIcon className="search-form__icon" />
      <input
        ref={inputRef}
        id={`${hintId}-input`}
        name="q"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        maxLength={300}
        placeholder={size === "large" ? "Search, or paste a YouTube link" : "Search or paste a link"}
        value={value}
        autoFocus={autoFocus}
        aria-describedby={message ? `${hintId}-msg` : undefined}
        aria-invalid={message ? true : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          if (message) setMessage("");
        }}
      />
      {value && (
        <button
          type="button"
          className="icon-button search-form__clear"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            setMessage("");
            inputRef.current?.focus();
          }}
        >
          <CloseIcon width={18} height={18} />
        </button>
      )}
      <kbd className="search-form__kbd" aria-hidden>
        /
      </kbd>
      <button type="submit" className="search-form__submit">
        <span className="search-form__submit-text">Search</span>
        <SearchIcon className="search-form__submit-icon" width={18} height={18} />
      </button>
      </div>
      {message && (
        <p id={`${hintId}-msg`} className="search-form__message" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
