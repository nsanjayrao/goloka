"use client"; // the rotation (active index, crossfade, pause-on-hover) is
// runtime state. The component still server-renders its first feature's
// full markup (h1 included), so SEO and no-JS visitors get real content.

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { AartiPeriod } from "@/components/aarti-period";
import { HeroImage } from "@/components/hero-image";
import { Link } from "@/i18n/navigation";
import { useDataSaver } from "@/lib/data-saver";

// The embers canvas is pure decoration and renders nothing server-side -
// loading it lazily keeps its code out of the critical hero bundle
// (Lighthouse TBT was 550ms with everything eager). In data-saver mode it's
// skipped entirely (see the `!dataSaver &&` gate below) so the dynamic
// import is never even requested - real bytes saved, not just deferred.
const Embers = dynamic(() => import("@/components/embers").then((m) => m.Embers), {
  ssr: false,
});

// One featured item, serialized by the server (app/[locale]/page.tsx) from
// real data - the hand-curated `featured` videos, falling back to the
// newest.
export type HeroFeature = {
  videoId: string;
  title: string;
  channel: string | null;
  subtitle: string | null;
};

const ROTATE_MS = 8000;
const FADE_MS = 500;

// Rotating hero (DESIGN.md #5.5): 3 features, 8s each, thin gold progress
// bars that fill like incense burning, clickable, paused on hover, 500ms
// fade-out/swap/fade-in. Behind it: the drifting artwork, the breathing
// āratī lamp (pure CSS), and the ember canvas.
export function Hero({ features }: { features: HeroFeature[] }) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const dataSaver = useDataSaver();
  const t = useTranslations("hero");
  // `generation` bumps on every manual jump so the active progress bar
  // remounts (key change) and its fill animation restarts from zero.
  const [generation, setGeneration] = useState(0);

  const single = features.length <= 1;

  function show(next: number) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = next % features.length;
    setGeneration((g) => g + 1);
    if (reduced) {
      setActive(target);
      return;
    }
    setFading(true);
    setTimeout(() => {
      setActive(target);
      setFading(false);
    }, FADE_MS);
  }

  // Auto-advance. Depends on `active`/`generation` so any jump (auto or
  // click) restarts the full 8s countdown, matching the progress bar.
  useEffect(() => {
    if (single || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => show(active + 1), ROTATE_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused, generation, single]);

  const feature = features[active];
  if (!feature) return null;

  return (
    <div
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={`hero-media hero-swap${fading ? " fading" : ""}`}>
        {/* Keyed by videoId so the swap is a fresh maxresdefault load with
            its own hqdefault fallback (see HeroImage). */}
        <HeroImage key={feature.videoId} videoId={feature.videoId} alt="" priority />
      </div>
      <div className="lamp" aria-hidden="true" />
      {!dataSaver && <Embers />}

      <AartiPeriod />
      {/* No .rise on the h1: it's the page's LCP element, and an opacity-0
          entrance held LCP ~1s past first paint (Lighthouse round 2). The
          eyebrow/sub/actions still rise around it, so the composition keeps
          its motion without taxing the metric. */}
      <h1 className={`hero-swap${fading ? " fading" : ""}`}>{feature.title}</h1>
      <p className={`sub rise d2 hero-swap${fading ? " fading" : ""}`}>
        {feature.channel ? (
          <>
            {t.rich("fromChannel", { channel: feature.channel, b: (chunks) => <b>{chunks}</b> })}
            {feature.subtitle ? <>. {feature.subtitle}</> : null}
          </>
        ) : (
          feature.subtitle
        )}
      </p>
      <div className="hero-actions rise d3">
        <Link className="btn gold" href={`/watch/${feature.videoId}`}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
          {t("watchNow")}
        </Link>
        <Link className="btn ghost" href="/browse">
          {t("browseEverything")}
        </Link>
      </div>

      {!single && (
        <div
          className={`hero-progress rise d3${paused ? " paused" : ""}`}
          role="tablist"
          aria-label={t("featuredAria")}
        >
          {features.map((f, index) => (
            <button
              key={index === active ? `${index}-${generation}` : index}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={t("featuredItemAria", { index: index + 1, total: features.length, title: f.title })}
              className={index === active ? "active" : undefined}
              onClick={() => show(index)}
            />
          ))}
        </div>
      )}

      <div className="scroll-cue" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
