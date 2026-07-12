"use client"; // the visitor's LOCAL hour decides the label, and the server
// can't know their timezone - so the server renders a sensible default and
// the client corrects it on hydration.

import { useSyncExternalStore } from "react";

// Time-aware temple period (DESIGN.md #5.4) - the hero eyebrow follows the
// temple day: Maṅgala-ārati 4-8, Śṛṅgāra-darśana 8-12, Rāja-bhoga 12-16,
// Sandhyā-ārati 16-21, Śayana otherwise.
const DEFAULT_PERIOD = "Sandhyā-ārati · evening lamps";

function periodForHour(hour: number): string {
  if (hour >= 4 && hour < 8) return "Maṅgala-ārati · the day begins";
  if (hour >= 8 && hour < 12) return "Śṛṅgāra-darśana · morning worship";
  if (hour >= 12 && hour < 16) return "Rāja-bhoga · midday offering";
  if (hour >= 16 && hour < 21) return "Sandhyā-ārati · evening lamps";
  return "Śayana · the temple rests";
}

// A client-only snapshot, not useEffect+setState: useSyncExternalStore's
// server snapshot (the default) and client snapshot (the real local-hour
// label) is exactly the "value the server can't know" pattern the codebase
// already uses for localStorage (lib/recently-watched.ts). The empty
// subscribe is fine - the label only needs to be right at render time, and
// the snapshot string is stable within an hour (Object.is on equal strings).
const subscribeNever = () => () => {};

export function AartiPeriod() {
  const period = useSyncExternalStore(
    subscribeNever,
    () => periodForHour(new Date().getHours()),
    () => DEFAULT_PERIOD
  );

  return <p className="eyebrow rise">{period}</p>;
}
