// "Recent searches" on /search - stored ONLY in the visitor's browser
// (localStorage), never sent to the server, same no-user-data stance as
// Continue Watching. Unlike that one, this store notifies its own subscribers
// on write (a same-tab localStorage write doesn't fire the "storage" event),
// so useSyncExternalStore re-renders the chips the moment a search is recorded.
const STORAGE_KEY = "goloka:recent-searches";
const MAX_ENTRIES = 6;

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

/** useSyncExternalStore subscribe: same-tab writes (via emit) AND other-tab
 * writes (the storage event). */
export function subscribeToRecentSearches(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function getRecentSearchesSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** SSR has no localStorage; "" parses to the same empty list a first-time
 * visitor has, so no hydration mismatch. */
export function getRecentSearchesServerSnapshot(): string {
  return "";
}

export function parseRecentSearches(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Records a committed search (Enter or a result click - not every keystroke),
 * newest first, deduped case-insensitively, capped at MAX_ENTRIES. Ignores
 * trivially short queries so a stray single letter never sticks. */
export function recordSearch(query: string): void {
  const q = query.trim();
  if (q.length < 2) return;
  try {
    const existing = parseRecentSearches(getRecentSearchesSnapshot()).filter(
      (e) => e.toLowerCase() !== q.toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify([q, ...existing].slice(0, MAX_ENTRIES)));
    emit();
  } catch {
    // storage unavailable - recent searches are a nicety, fail silently.
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    emit();
  } catch {
    // ignore
  }
}
