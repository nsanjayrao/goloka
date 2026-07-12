"use client"; // a canvas particle system is pure browser territory.

import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;

    const size = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
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

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of embers) {
        p.y -= p.s;
        p.x += p.drift + Math.sin(p.y * 0.01) * 0.15;
        p.tw += 0.05;
        if (p.y < -10) Object.assign(p, spawn());
        const glow = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fillStyle = `rgba(245,201,123,${glow})`;
        ctx.shadowColor = "rgba(232,163,61,.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={ref} className="embers" aria-hidden="true" />;
}
