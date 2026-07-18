"use client"; // sessionStorage, load timing, and self-removal are all
// browser-only. The veil is server-rendered so it covers the page from the
// very first paint (no flash of unveiled content), then the client opens it.

import { useEffect, useRef, useState } from "react";

import { LogoMark } from "@/components/icons/logo-mark";

const SESSION_KEY = "goloka-veil";

// Darshan curtain preloader (DESIGN.md #5.1): two indigo panels part from a
// glowing gold seam. First visit per session only; auto-opens within 2.6s
// even if the page load stalls; removes itself from the DOM afterwards;
// skipped entirely under prefers-reduced-motion.
export function Veil() {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem(SESSION_KEY) === "1";
    if (reduced || seen) {
      // The inline script below already hid the element pre-paint; this
      // just unmounts it. Deferred to a frame callback (not a sync setState
      // in the effect body) per the react-hooks/set-state-in-effect rule.
      const id = requestAnimationFrame(() => setGone(true));
      return () => cancelAnimationFrame(id);
    }
    sessionStorage.setItem(SESSION_KEY, "1");

    let opened = false;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      if (opened) return;
      opened = true;
      el.classList.add("open");
      // Panel transition: 1.1s glide after a .35s delay (globals.css) -
      // remove from the DOM right after it has played out.
      removeTimer = setTimeout(() => setGone(true), 1600);
    };

    // Shortened theatre (owner decision 2026-07-18): the original ~2.6s
    // curtain dominated first-visit LCP on every page. 150ms after load /
    // 1.5s failsafe keeps the darshan moment without taxing the reveal.
    const onLoad = () => setTimeout(open, 150);
    if (document.readyState === "complete") {
      setTimeout(open, 150);
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }
    // Never trap the user behind the curtain.
    const failsafe = setTimeout(open, 1500);

    return () => {
      window.removeEventListener("load", onLoad);
      clearTimeout(failsafe);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={ref} className="veil" aria-hidden="true" suppressHydrationWarning>
      {/* Pre-hydration guard: on a repeat load in the same session (or with
          reduced motion), hide the server-rendered veil BEFORE first paint -
          the React effect above then removes it for real. Without this,
          every hard reload would flash the curtain until hydration. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem('${SESSION_KEY}')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches){document.currentScript.parentElement.style.display='none'}}catch(e){}`,
        }}
      />
      <div className="panel l" />
      <div className="panel r" />
      <div className="seam" />
      <span className="v-mark">
        <LogoMark style={{ width: "0.85em", height: "0.85em" }} />
        Goloka
      </span>
    </div>
  );
}
