import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { DurationBucket } from "@/lib/types";

type SortOption = "recent" | "popular";

// Duration bucket labels ("<15m") are locale-neutral shorthand, left as-is.
const DURATION_OPTIONS: { value: DurationBucket; label: string }[] = [
  { value: "short", label: "<15m" },
  { value: "medium", label: "15–45m" },
  { value: "long", label: ">45m" },
];

// A category page used to greet a devotee with every possible filter
// flattened into one wall of pills - sort, ~15 teachers, 3 durations, N
// languages - all before a single video (Design Manifesto, "The Courtyard",
// 2026-07-22: "Six filter pills before a single video... That is not wrong
// engineering. It is the one screen still wearing borrowed clothes"). The
// fix keeps only what deserves to be always visible:
//   - SORT stays a primary, two-option toggle - choosing recency vs.
//     popularity is a lens on the whole category, not a narrowing filter.
//   - Any ACTIVE narrowing (a teacher/duration/language already chosen)
//     stays visible as a removable tag, so a devotee is never one click
//     away from forgetting what's filtered.
//   - Everything NOT yet chosen - the full list of teachers, languages,
//     durations - waits behind one quiet "Refine" disclosure: a native
//     <details>/<summary> (no client JS, no click-outside handling to
//     write, keyboard- and screen-reader-native for free).
// Every control here is still a plain link that sets/clears a URL search
// param - the server re-renders in the new order/filter, same as before.
export function FilterChips({
  category,
  channels,
  languages,
  activeChannelId,
  activeDuration,
  activeLanguage,
  activeSort = "recent",
}: {
  category: string;
  channels: { id: number; title: string }[];
  /** Languages present in this category (lib/data.ts's getLanguagesInCategory) -
   * omitted (empty array) until the worker's Groq classification has
   * populated `language` for enough videos to be worth a filter row. */
  languages: string[];
  activeChannelId?: number;
  activeDuration?: DurationBucket;
  activeLanguage?: string;
  activeSort?: SortOption;
}) {
  const t = useTranslations("filterChips");
  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "recent", label: t("newest") },
    { value: "popular", label: t("mostWatched") },
  ];
  const basePath = `/browse/${encodeURIComponent(category)}`;
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const hasRefinements = channels.length > 0 || languages.length > 0;

  // Build a URL from the FULL next filter state, so changing one control
  // never silently drops the others. "recent" is the default, so it's left
  // out of the query to keep the canonical URL clean.
  function hrefFor(next: {
    channel?: number;
    duration?: DurationBucket;
    language?: string;
    sort: SortOption;
  }) {
    const params = new URLSearchParams();
    if (next.channel) params.set("channel", String(next.channel));
    if (next.duration) params.set("duration", next.duration);
    if (next.language) params.set("language", next.language);
    if (next.sort !== "recent") params.set("sort", next.sort);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {SORT_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={hrefFor({
              channel: activeChannelId,
              duration: activeDuration,
              language: activeLanguage,
              sort: option.value,
            })}
            className={chipClass(activeSort === option.value)}
          >
            {option.label}
          </Link>
        ))}

        {/* Active narrowing, always visible as a removable tag - each one
            drops just itself and keeps the rest of the filter state. */}
        {activeChannel && (
          <ActiveTag
            label={activeChannel.title}
            href={hrefFor({ duration: activeDuration, language: activeLanguage, sort: activeSort })}
          />
        )}
        {activeDuration && (
          <ActiveTag
            label={DURATION_OPTIONS.find((d) => d.value === activeDuration)!.label}
            href={hrefFor({ channel: activeChannelId, language: activeLanguage, sort: activeSort })}
          />
        )}
        {activeLanguage && (
          <ActiveTag
            label={activeLanguage}
            href={hrefFor({ channel: activeChannelId, duration: activeDuration, sort: activeSort })}
          />
        )}
      </div>

      {hasRefinements && (
        <details className="group">
          <summary
            className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-text-muted transition-colors duration-200 ease-out hover:text-text [&::-webkit-details-marker]:hidden"
          >
            {t("refine")}
            <svg viewBox="0 0 10 6" className="size-2.5 transition-transform duration-200 group-open:rotate-180">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>

          <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:max-w-sm">
            {channels.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">{t("teacher")}</span>
                <div className="flex flex-wrap gap-2">
                  {channels.map((channel) => {
                    const active = activeChannelId === channel.id;
                    return (
                      <Link
                        key={channel.id}
                        href={hrefFor({
                          channel: active ? undefined : channel.id,
                          duration: activeDuration,
                          language: activeLanguage,
                          sort: activeSort,
                        })}
                        className={chipClass(active)}
                      >
                        {channel.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">{t("duration")}</span>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((option) => {
                  const active = activeDuration === option.value;
                  return (
                    <Link
                      key={option.value}
                      href={hrefFor({
                        channel: activeChannelId,
                        duration: active ? undefined : option.value,
                        language: activeLanguage,
                        sort: activeSort,
                      })}
                      className={chipClass(active)}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {languages.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">{t("language")}</span>
                <div className="flex flex-wrap gap-2">
                  {languages.map((language) => {
                    const active = activeLanguage === language;
                    return (
                      <Link
                        key={language}
                        href={hrefFor({
                          channel: activeChannelId,
                          duration: activeDuration,
                          language: active ? undefined : language,
                          sort: activeSort,
                        })}
                        className={chipClass(active)}
                      >
                        {language}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

/** A currently-active narrowing, shown as its own quiet tag with a small ×
 * - the href already carries that ONE filter removed (see the call sites
 * above), so this is a plain link, not a button with onClick logic. */
function ActiveTag({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-surface-2 px-3 py-1.5 text-[13px] text-accent-strong transition-colors duration-200 ease-out hover:border-flame hover:text-flame"
    >
      {label}
      <span aria-hidden="true" className="text-[15px] leading-none">
        ×
      </span>
    </Link>
  );
}

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-200 ease-out",
    active
      ? "border-accent bg-surface-2 text-accent-strong"
      : "border-border bg-surface text-text-muted hover:text-text"
  );
}
