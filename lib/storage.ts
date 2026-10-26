// Thin, failure-tolerant wrapper around localStorage. Never store secrets or audio here.

export const KEYS = {
  prefs: "vo:prefs",
  history: "vo:history",
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be full, blocked or unavailable; the app works without it */
  }
}
