"use client"; // IntersectionObserver only exists in the browser. The
// children (e.g. a CategoryRow built from server data) stay server
// components - only this thin wrapper opts into the client.

import { useEffect, useRef, type ReactNode } from "react";

// The prototype's scroll reveal (DESIGN.md #5.7): the section rises 26px as
// it enters the viewport, and any .card children stagger in after it via
// CSS nth-child transition delays (globals.css .reveal rules). One observer
// per section, unobserved after firing. Under prefers-reduced-motion the
// CSS forces everything visible with no transition - so this observer
// firing late (or never) can't hide content.
export function FadeUp({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal">
      {children}
    </div>
  );
}
