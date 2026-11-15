/** Remembers where you stopped in each video (this browser only). */

const KEY = "plainplay:positions";
const MAX_ENTRIES = 200;
const MIN_SECONDS = 30;
const END_MARGIN = 20;

type Store = Record<string, [seconds: number, savedAt: number]>;

function load(): Store {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function save(store: Store) {
  try {
    const entries = Object.entries(store).sort((a, b) => b[1][1] - a[1][1]).slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Storage full or blocked: resuming is a nice-to-have.
  }
}

export function getPosition(id: string): number | undefined {
  const entry = load()[id];
  if (!Array.isArray(entry) || typeof entry[0] !== "number") return undefined;
  return entry[0] >= MIN_SECONDS ? Math.floor(entry[0]) : undefined;
}

export function setPosition(id: string, seconds: number, duration: number) {
  const store = load();
  const nearEnd = duration > 0 && duration - seconds < END_MARGIN;
  if (seconds < MIN_SECONDS || nearEnd) delete store[id];
  else store[id] = [Math.floor(seconds), Date.now()];
  save(store);
}

export function clearPosition(id: string) {
  const store = load();
  if (id in store) {
    delete store[id];
    save(store);
  }
}
