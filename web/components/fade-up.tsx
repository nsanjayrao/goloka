"use client"; // framer-motion needs the browser to animate, so this wraps
// server-rendered children in a client boundary. The children themselves
// (e.g. a CategoryRow built from server data) stay server components -
// only this thin wrapper opts into the client.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// The section-entrance motion (DESIGN.md #5): fade up 12px, once, 250ms.
// Under prefers-reduced-motion the whole thing is skipped - children render
// in place with no initial hidden state and no animation.
export function FadeUp({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
