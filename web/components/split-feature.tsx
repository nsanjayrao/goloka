import { useTranslations } from "next-intl";
import Image from "next/image";

import { HeroImage } from "@/components/hero-image";
import { SectionHeader } from "@/components/section-header";
import { Link } from "@/i18n/navigation";
import { cleanTitle, formatDuration } from "@/lib/format";
import type { Video } from "@/lib/types";

// The feature-split layout (DESIGN.md #5.7): one large cinematic card plus
// three stacked mini cards - the "varied section rhythm" that keeps the
// home page from flattening into identical rows. Needs 4 videos; with
// fewer it returns null and the page composition skips it.
export function SplitFeature({
  kicker,
  title,
  href,
  videos,
  tag,
}: {
  kicker?: string;
  title: string;
  href?: string;
  videos: Video[];
  /** Small uppercase tag inside the big card (e.g. "Featured kirtan").
   * Defaults to the translated "Featured". */
  tag?: string;
}) {
  const t = useTranslations("splitFeature");
  if (videos.length < 4) return null;
  const [feature, ...rest] = videos;
  const minis = rest.slice(0, 3);
  const featureTitle = cleanTitle(feature.title);
  const displayTag = tag ?? t("featuredTag");

  return (
    <section className="home-section cv">
      <SectionHeader title={title} kicker={kicker} href={href} />
      <div className="split">
        <Link className="feature" href={`/watch/${feature.youtube_video_id}`}>
          {/* HeroImage, not the DB thumbnail_url: the stored thumb is the
              320px mqdefault, which stretched over this ~800px card looked
              blurry and pale (owner feedback 2026-07-18). maxresdefault
              with hqdefault fallback keeps the artwork crisp. */}
          <HeroImage videoId={feature.youtube_video_id} alt="" className="bg" />
          <div className="f-body">
            <span className="f-tag">{displayTag}</span>
            <h3 title={featureTitle}>{featureTitle}</h3>
            {feature.channel?.title && <p className="meta">{feature.channel.title}</p>}
          </div>
        </Link>
        <div className="side">
          {minis.map((video) => {
            const miniTitle = cleanTitle(video.title);
            const miniMeta = [video.channel?.title, formatDuration(video.duration_seconds)]
              .filter(Boolean)
              .join(" · ");
            return (
              <Link key={video.id} className="mini" href={`/watch/${video.youtube_video_id}`}>
                {video.thumbnail_url && (
                  <Image src={video.thumbnail_url} alt="" width={236} height={133} loading="lazy" />
                )}
                <div className="m-body">
                  <h4 title={miniTitle}>{miniTitle}</h4>
                  {miniMeta && <p className="meta">{miniMeta}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
