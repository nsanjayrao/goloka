import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

// Two quiet doorways on the home page, in Śrīmatī Rādhārāṇī's mood: one for
// the soul who has just arrived and doesn't yet know Kṛṣṇa (→ /start), one
// for calling out the holy name (→ /chant). Deliberately gentle, not a
// shouting call-to-action: a slim gold-hairline band a newcomer will notice
// and a returning devotee's eye passes over softly. Server component (static
// links, labels through next-intl so the invitation is warm in every tongue).
export function HomeDoorways() {
  const t = useTranslations("homeDoorways");

  return (
    <div className="doorways gutter">
      <Link href="/start" className="doorway">
        <span className="doorway-label">{t("newLabel")}</span>
        <span className="doorway-hint">{t("newHint")} →</span>
      </Link>
      <Link href="/chant" className="doorway">
        <span className="doorway-label">{t("chantLabel")}</span>
        <span className="doorway-hint">{t("chantHint")} →</span>
      </Link>
    </div>
  );
}
