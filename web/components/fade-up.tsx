"use client"; // framer-motion needs the browser to animate, so this wraps
// server-rendered children in a client boundary. The children themselves
// (e.g. a CategoryRow built from server data) stay server components -
// only this thin wrapper opts into the client.

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// The one motion pattern DESIGN.md #5 allows for section entrances:
// fade up 12px, once, 250ms.
export function FadeUp({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
