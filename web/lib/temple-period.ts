import { useSyncExternalStore } from "react";

// The temple day, by local hour (DESIGN.md #5.4/#5.13) - the single source
// of truth for every time-of-day-aware surface: the hero eyebrow's label
// (components/aarti-period.tsx), the āratī lamp's light quality, and the
// ember canvas's intensity (components/temple-lamp.tsx, components/embers.tsx).
// One hook, one hour computation - each consumer just reads the same key.
export type PeriodKey = "mangala" | "shringara" | "rajabhoga" | "sandhya" | "shayana";

export function keyForHour(hour: number): PeriodKey {
  if (hour >= 4 && hour < 8) return "mangala";
  if (hour >= 8 && hour < 12) return "shringara";
  if (hour >= 12 && hour < 16) return "rajabhoga";
  if (hour >= 16 && hour < 21) return "sandhya";
  return "shayana";
}

// Sandhyā-ārati - evening lamps - as the default: a visitor arriving with
// JS disabled, or a crawler, sees the temple as it is most photographed,
// and it's a fair mid-intensity light quality to bake into the server
// render before the client corrects to the real local hour.
export const DEFAULT_PERIOD_KEY: PeriodKey = "sandhya";

// A client-only snapshot, not useEffect+setState: the server can't know the
// visitor's timezone, so it renders DEFAULT_PERIOD_KEY and the client
// corrects after mount (lib/recently-watched.ts's localStorage pattern,
// applied to the clock instead of storage). The empty subscribe is
// intentional - the key only needs to be right at render time, and it's
// stable within an hour (Object.is on equal strings never re-renders
// needlessly).
const subscribeNever = () => () => {};

export function useTemplePeriod(): PeriodKey {
  return useSyncExternalStore(
    subscribeNever,
    () => keyForHour(new Date().getHours()),
    () => DEFAULT_PERIOD_KEY
  );
}
