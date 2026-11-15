/**
 * Splits a video description into plain text, links and timestamps,
 * so timestamps can jump the player and links open safely.
 */
export type DescriptionToken =
  | { kind: "text"; value: string }
  | { kind: "link"; value: string; href: string }
  | { kind: "time"; value: string; seconds: number };

const PATTERN = /(https?:\/\/[^\s<>"']+)|(?<![\w:])((?:\d{1,2}:)?\d{1,2}:\d{2})(?![\w:])/g;

export function timestampToSeconds(stamp: string): number | null {
  const parts = stamp.split(":").map(Number);
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) return null;
  if (parts.length === 2) {
    const [m, s] = parts;
    return s < 60 ? m * 60 + s : null;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return m < 60 && s < 60 ? h * 3600 + m * 60 + s : null;
  }
  return null;
}

export function tokenizeDescription(text: string): DescriptionToken[] {
  const tokens: DescriptionToken[] = [];
  let last = 0;
  const push = (value: string) => {
    if (!value) return;
    const prev = tokens[tokens.length - 1];
    if (prev?.kind === "text") prev.value += value;
    else tokens.push({ kind: "text", value });
  };

  for (const match of text.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    push(text.slice(last, index));
    if (match[1]) {
      // Trailing punctuation usually belongs to the sentence, not the URL.
      const url = match[1].replace(/[),.;:!?\]]+$/, "");
      tokens.push({ kind: "link", value: url, href: url });
      push(match[1].slice(url.length));
    } else if (match[2]) {
      const seconds = timestampToSeconds(match[2]);
      if (seconds === null) push(match[2]);
      else tokens.push({ kind: "time", value: match[2], seconds });
    }
    last = index + match[0].length;
  }
  push(text.slice(last));
  return tokens;
}
