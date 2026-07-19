"use client"; // the "More"/"Less" toggle is local UI state.

import { useTranslations } from "next-intl";
import { useState } from "react";

export function VideoDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("buttons");

  return (
    <div>
      <p className={`whitespace-pre-line text-[15px] leading-relaxed text-text-muted ${expanded ? "" : "line-clamp-3"}`}>
        {description}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-2 text-sm font-medium text-accent-strong hover:underline"
      >
        {expanded ? t("less") : t("more")}
      </button>
    </div>
  );
}
