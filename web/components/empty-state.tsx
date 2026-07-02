import type { ReactNode } from "react";

import { LotusIcon } from "@/components/icons/lotus";

// Shared "nothing here yet" state (DESIGN.md #6: warm, devotional copy,
// never a crash). Used whenever a query comes back empty - the database
// has no videos yet, a category has none, or a search matches nothing.
export function EmptyState({
  message,
  children,
}: {
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <LotusIcon className="h-8 w-16 text-text-muted" />
      <p className="max-w-sm text-[15px] text-text-muted">{message}</p>
      {children}
    </div>
  );
}
