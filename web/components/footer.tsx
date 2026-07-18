import Link from "next/link";

import { LogoMark } from "@/components/icons/logo-mark";

// The prototype footer (DESIGN.md #5.10): mahā-mantra inscription in
// letter-spaced gold Marcellus, a faint lamp glow rising from behind the
// gold hairline, brand + links, and the existing "index, not a host"
// disclaimer preserved verbatim.
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="lamp-foot" aria-hidden="true" />
      <p className="mantra">
        Hare Kṛṣṇa Hare Kṛṣṇa Kṛṣṇa Kṛṣṇa Hare Hare
        <br />
        Hare Rāma Hare Rāma Rāma Rāma Hare Hare
      </p>
      <div className="foot-grid">
        <div className="foot-brand">
          <span className="wordmark">
            <LogoMark className="size-8" />
            Goloka
          </span>
          <p>
            Eternal abode of divine love. A free, centralized index of ISKCON
            lectures, kirtans and festivals from official channels.
          </p>
        </div>
        <nav className="foot-links" aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/start">Begin Here</Link>
          <Link href="/browse">Browse</Link>
          <Link href="/search">Search</Link>
          <Link href="/leaders">Leaders</Link>
          <Link href="/books">Books</Link>
          <Link href="/temples">Temples</Link>
          <Link href="/library">Library</Link>
          <Link href="/about">About</Link>
          <a href="mailto:nandisanjay.ns@gmail.com?subject=Goloka%20suggestion">
            Suggest a channel
          </a>
        </nav>
      </div>
      <p className="disclaimer">
        Goloka is an index, not a host — every video plays through the official
        YouTube player and links back to its source channel. All content belongs
        to its creators.
      </p>
    </footer>
  );
}
