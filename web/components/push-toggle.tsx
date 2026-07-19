"use client"; // toggles the browser's own Notification/Push API state.

import { useState, useSyncExternalStore } from "react";

import {
  getNotificationPermission,
  isPushSupported,
  setPushTopic,
  usePushTopics,
  type PushTopic,
} from "@/lib/push";
import { cn } from "@/lib/utils";

const OPTIONS: { topic: PushTopic; label: string; hint: string }[] = [
  {
    topic: "festivals",
    label: "🔔 Festival reminders",
    hint: "One quiet ping on ekādaśī mornings.",
  },
  {
    topic: "live",
    label: "🔴 Live darshan alerts",
    hint: "The moment a temple goes live.",
  },
];

// A quiet, sign-in-independent row for /library: notifications are
// anonymous by design (lib/push.ts), so they don't belong to the account
// section above - anyone can turn these on, signed in or not. Two
// independent switches; each calls setPushTopic, which subscribes/
// resubscribes/unsubscribes the browser's real Push API state to match.
// A no-op external store whose snapshot differs between server and client -
// the standard useSyncExternalStore trick for "has this mounted in the
// browser yet" without an effect+setState (which would cause an extra
// render pass ESLint's react-hooks rules flag). React re-renders once with
// the client snapshot right after hydration, same timing an effect would
// give, with none of the cascading-render cost.
function subscribeNever() {
  return () => {};
}

export function PushToggle() {
  // isPushSupported()/getNotificationPermission() read navigator/Notification,
  // which don't exist during SSR - deferring the read until after hydration
  // avoids a mismatch (the same reasoning as lib/auth.ts's `hydrated` flag,
  // or lib/data-saver.ts's neutral server snapshot).
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
  const [pending, setPending] = useState<PushTopic | null>(null);
  const topics = usePushTopics();

  if (!mounted) return null;

  if (!isPushSupported()) {
    return (
      <div className="rounded-feature border border-border bg-surface px-5 py-4 text-[13px] text-text-muted">
        Notifications aren&apos;t available on this browser — try Chrome or
        Firefox, or add Goloka to your home screen first.
      </div>
    );
  }

  const blocked = getNotificationPermission() === "denied";

  async function handleToggle(topic: PushTopic, next: boolean) {
    setPending(topic);
    await setPushTopic(topic, next);
    setPending(null);
  }

  return (
    <div className="rounded-feature border border-border bg-surface px-5 py-4">
      <h2 className="font-heading text-lg text-text">Notifications</h2>
      <p className="mt-1 text-[13px] text-text-muted">
        Anonymous and opt-in — no account, no tracking, unsubscribe anytime.
      </p>
      {blocked && (
        <p className="mt-3 text-[13px] text-lotus">
          Notifications are blocked for this site in your browser settings —
          allow them there first.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-3">
        {OPTIONS.map(({ topic, label, hint }) => {
          const on = topics.includes(topic);
          return (
            <div key={topic} className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] text-text">{label}</div>
                <div className="text-[13px] text-text-muted">{hint}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={blocked || pending === topic}
                onClick={() => handleToggle(topic, !on)}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
                  on ? "bg-accent text-accent-ink" : "bg-shyama-2 text-text-muted"
                )}
              >
                {on ? "On" : "Off"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
