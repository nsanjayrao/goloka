import type { ReactNode } from "react";

import { LotusIcon } from "@/components/icons/lotus";

// Shared "nothing here yet" state (DESIGN.md #6: warm, devotional copy,
// never a crash). Used whenever a query comes back empty - the database
// has no videos yet, a category has none, or a search matches nothing.
// `title` is optional (Fraunces heading above the message) - the full-page
// states (404, offline) use it; the inline empty states omit it.
export function EmptyState({
  title,
  message,
  children,
}: {
  title?: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <LotusIcon className="h-8 w-16 text-text-muted" />
      {title && (
        <h1 className="font-heading text-2xl font-medium text-text sm:text-3xl">{title}</h1>
      )}
      <p className="max-w-sm text-[15px] text-text-muted">{message}</p>
      {children}
    </div>
  );
}
