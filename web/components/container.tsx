import type { ReactNode } from "react";

// Shared page width + horizontal padding (DESIGN.md #4: "Max content width
// 1280px, horizontal padding 16/24/48px (sm/md/lg)"). Every page wraps its
// content in this instead of repeating the class list.
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-12 ${className}`}>{children}</div>
  );
}
