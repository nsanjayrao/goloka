import { useTranslations } from "next-intl";

import { DataSaverToggle } from "@/components/data-saver-toggle";
import { LogoMark } from "@/components/icons/logo-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";

// The prototype footer (DESIGN.md #5.10): mahā-mantra inscription in
// letter-spaced gold Marcellus, a faint lamp glow rising from behind the
// gold hairline, brand + links, and the existing "index, not a host"
// disclaimer preserved verbatim. The mahā-mantra itself is never translated
// (i18n goal #4 - it stays the same sacred sound in every locale), and
// `Link` comes from i18n/navigation so every footer link carries the
// current locale automatically.
export function Footer() {
  const t = useTranslations("footer");
  const tLandmarks = useTranslations("landmarks");

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
          <p>{t("tagline")}</p>
        </div>
        <nav className="foot-links" aria-label={tLandmarks("footer")}>
          <Link href="/">{t("home")}</Link>
          <Link href="/start">{t("beginHere")}</Link>
          <Link href="/chant">{t("chant")}</Link>
          <Link href="/browse">{t("browse")}</Link>
          <Link href="/search">{t("search")}</Link>
          <Link href="/leaders">{t("leaders")}</Link>
          <Link href="/books">{t("books")}</Link>
          <Link href="/temples">{t("temples")}</Link>
          <Link href="/library">{t("library")}</Link>
          <Link href="/about">{t("about")}</Link>
          <a href="mailto:nandisanjay.ns@gmail.com?subject=Goloka%20suggestion">{t("suggestChannel")}</a>
          <DataSaverToggle />
        </nav>
      </div>
      <LanguageSwitcher />
      <p className="disclaimer">{t("disclaimer")}</p>
    </footer>
  );
}
