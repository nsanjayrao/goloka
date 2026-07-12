import type { ReactNode } from "react";

// Shared page width + the ONE horizontal gutter (--pad, DESIGN.md #4): the
// same clamp() the fixed header, home rows, and footer use, so inner-page
// content lines up with the wordmark above it. The max-width only engages
// on very wide screens; below it, .gutter keeps everything on the shared
// gutter line.
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`gutter mx-auto w-full max-w-[1600px] ${className}`}>{children}</div>;
}
