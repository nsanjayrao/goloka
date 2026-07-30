"use client"; // a canvas particle system is pure browser territory.

import { useEffect, useRef } from "react";

import { useTemplePeriod, type PeriodKey } from "@/lib/temple-period";

// The embers' intensity by temple period (DESIGN.md #5.13, 2026-07-22) -
// the SAME day-arc as the lamp's --lamp-mult in globals.css (kept in sync
// by value, not by import: one is CSS, one is a canvas draw loop, so the
// numbers are duplicated deliberately rather than sharing a token that
// only one of the two systems could actually consume). Hue is left alone
// here - unlike the lamp, the embers don't already blend two tokens, so
// only reaching for MORE change (a new hue split) than the lamp's own
// precedent justifies would be exactly the ornament-for-its-own-sake this
// whole system argues against.
const PERIOD_EMBER_SCALE: Record<PeriodKey, number> = {
  mangala: 0.6,
  shringara: 1,
  rajabhoga: 1.15,
  sandhya: 1.1,
  shayana: 0.5,
};

type Ember = {
  x: number;
  y: number;
  r: number;
  s: number;
  drift: number;
  a: number;
  tw: number;
};

// Diya embers (DESIGN.md #5.3): gold sparks drifting up through the hero.
// Ported from the prototype's canvas loop: ~42 particles desktop, ~22
// mobile, twinkling via a sine on each ember's own phase. Disabled under
// prefers-reduced-motion; the rAF loop is cancelled on unmount.
export function Embers() {
  const ref = useRef<HTMLCanvasElement>(null);
  const period = useTemplePeriod();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = PERIOD_EMBER_SCALE[period];

    let w = 0;
    let h = 0;
    let raf = 0;

    // A canvas has TWO sizes: its CSS box (offsetWidth/Height) and its backing
    // store (width/height, in device pixels). Setting the backing store to the
    // CSS size meant every ember was drawn at 1x and stretched by the display
    // - soft blobs on every retina phone and Mac, which is most of the
    // difference between "expensive" and "approximate". setTransform then lets
    // the draw loop below keep thinking in CSS pixels.
    // Capped at 2: fill cost scales with AREA, so 3x would be 2.25x the work
    // of 2x for a difference nobody can see on a speck under 2.3px.
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size, { passive: true });

    const count = window.innerWidth < 600 ? 22 : 42;
    const spawn = (): Ember => ({
      x: Math.random() * w,
      y: h + Math.random() * h * 0.3,
      r: 0.6 + Math.random() * 1.7,
      s: 0.18 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 0.3,
      a: 0.25 + Math.random() * 0.5,
      tw: Math.random() * Math.PI * 2,
    });
    const embers: Ember[] = [];
    for (let i = 0; i < count; i++) {
      const ember = spawn();
      ember.y = Math.random() * h; // first frame: scattered, not a bottom row
      embers.push(ember);
    }

    // Particle colour comes from the theme, not from this file (2026-07-23).
    // On the midnight canvas embers are bright specks ADDED to a dark room;
    // on a light canvas the same specks are invisible, so the Aruṇa theme
    // hands us rose-gold pollen and a "multiply" blend, which darkens the
    // page instead of lighting it. Read once per effect run, not per frame.
    const styles = getComputedStyle(canvas);
    const fill = styles.getPropertyValue("--ember-fill").trim() || "245,201,123";
    const halo = styles.getPropertyValue("--ember-halo").trim() || "rgba(232,163,61,.8)";
    const blend = styles.getPropertyValue("--ember-blend").trim() || "source-over";

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = blend as GlobalCompositeOperation;
      for (const p of embers) {
        p.y -= p.s;
        p.x += p.drift + Math.sin(p.y * 0.01) * 0.15;
        p.tw += 0.05;
        if (p.y < -10) Object.assign(p, spawn());
        const glow = p.a * (0.6 + 0.4 * Math.sin(p.tw)) * scale;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fillStyle = `rgba(${fill},${glow})`;
        ctx.shadowColor = halo;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // The hero canvas kept drawing at 60fps while the devotee was thousands of
    // pixels down the page. Each frame is 42 arc fills with shadowBlur - a
    // software blur per draw call, the most expensive thing in the app's frame
    // budget - so this was a sustained battery cost for pixels nobody could
    // see. (A hidden TAB is throttled by the browser; scrolled-past is not.)
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return;
      visible = entry.isIntersecting;
      if (visible) raf = requestAnimationFrame(tick);
      else cancelAnimationFrame(raf);
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", size);
    };
    // `period` changes at most once an hour (useTemplePeriod is stable
    // within it), so this restarts the whole particle loop only that
    // rarely - a cheap, honest way to pick up the new scale rather than
    // threading a ref through the closure for a change this infrequent.
  }, [period]);

  return <canvas ref={ref} className="embers" aria-hidden="true" />;
}
