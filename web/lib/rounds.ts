import { useSyncExternalStore } from "react";

// "Rounds today" - the only record Goloka keeps of a devotee's chanting,
// and only for the current calendar day. This is stored ONLY in this
// browser's localStorage and never sent to or read by the server - the
// same no-tracking vow as data-saver.ts / recently-watched.ts. Here it is
// also simple reverence: a devotee's chanting is between them and Krishna,
// not our database. Deliberately NO history, NO streak, NO total-ever -
// counting rounds is a quiet aid to attention, not a ledger to feel judged
// by. At a new local day the count is just gone, silently, with nothing to
// reset by hand and nothing kept to look back on.
const STORAGE_KEY = "goloka:rounds";

type RoundsState = { date: string; count: number };

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

/** useSyncExternalStore subscribe: other-tab writes (the real "storage"
 * event) plus same-tab writes via emit() (a same-tab localStorage write
 * doesn't fire "storage" on its own) - matches lib/data-saver.ts. */
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** Today as a LOCAL (not UTC) YYYY-MM-DD key, so the count resets at local
 * midnight - the moment that matters to the person chanting, not some
 * server's clock on the other side of the world. */
export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isRoundsState(value: unknown): value is RoundsState {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as RoundsState).date === "string" &&
    typeof (value as RoundsState).count === "number"
  );
}

function read(): RoundsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed: unknown = JSON.parse(raw);
    return isRoundsState(parsed) ? parsed : { date: todayKey(), count: 0 };
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

function write(state: RoundsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    emit();
  } catch {
    // Storage unavailable/full - the count just won't persist across a
    // reload, not a broken chanting space.
  }
}

/** Parses a raw snapshot string into today's round count - anything dated
 * before today reads as 0 with no cron job, no cleanup, nothing to
 * remember: a round finished yesterday simply isn't "today" the next time
 * this is read. This is the entire "reset" mechanism. */
export function parseRoundsSnapshot(raw: string): number {
  if (!raw) return 0;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRoundsState(parsed)) return 0;
    if (parsed.date !== todayKey()) return 0;
    return Math.max(0, parsed.count);
  } catch {
    return 0;
  }
}

export function getRoundsSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** SSR/first paint has no localStorage - "" parses to 0, the same value a
 * visitor with no rounds yet today would see, so no special-casing is
 * needed where useRoundsToday is used. */
export function getRoundsServerSnapshot(): string {
  return "";
}

/** Records one completed round (called at the 108th bead). Rolls forward
 * from whatever is stored UNLESS the stored date isn't today, in which
 * case it starts fresh at 1 rather than continuing yesterday's number. */
export function incrementRound(): void {
  const current = read();
  const count = current.date === todayKey() ? current.count : 0;
  write({ date: todayKey(), count: count + 1 });
}

/** The tiny, unobtrusive "reset" - clears today's count back to zero. Not
 * a delete-everything button, because there is no "everything" kept:
 * today's count is all this store ever holds. */
export function resetToday(): void {
  write({ date: todayKey(), count: 0 });
}

/** Today's completed-rounds count, live-updated across tabs. */
export function useRoundsToday(): number {
  const raw = useSyncExternalStore(subscribe, getRoundsSnapshot, getRoundsServerSnapshot);
  return parseRoundsSnapshot(raw);
}
