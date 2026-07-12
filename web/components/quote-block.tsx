import { quoteOfTheDay } from "@/lib/quotes";

// The centered Prabhupāda quote interlude (DESIGN.md #5.7) - a breathing
// space between sections. One quote per calendar day (lib/quotes.ts), so
// it rotates daily with no backend and never changes mid-day.
export function QuoteBlock() {
  const quote = quoteOfTheDay();
  return (
    <div className="quote">
      <blockquote>“{quote.text}”</blockquote>
      <cite>{quote.source === "Srila Prabhupada" ? "Śrīla Prabhupāda" : quote.source}</cite>
    </div>
  );
}
