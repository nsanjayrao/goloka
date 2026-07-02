"use client"; // controlled input + router.push on submit needs the browser.

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

// Desktop search box in the sticky top bar. It doesn't show live results
// itself (that's the /search page's job) - submitting just navigates there
// with the query, keeping this component tiny.
export function TopBarSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden w-full max-w-xs items-center gap-2 rounded-full border border-border
        bg-surface px-3 py-1.5 transition-colors focus-within:border-accent sm:flex"
    >
      <Search className="size-4 shrink-0 text-text-muted" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        placeholder="Search lectures, kirtans…"
        aria-label="Search Goloka"
        className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
      />
    </form>
  );
}
