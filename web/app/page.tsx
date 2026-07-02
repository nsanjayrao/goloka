import { CategoryRow } from "@/components/category-row";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { FadeUp } from "@/components/fade-up";
import { Hero } from "@/components/hero";
import { getCategoriesByRecency, getLatestVideo, getVideosByCategory } from "@/lib/data";

// Home is a server component: `async function` here means "fetch on the
// server, send finished HTML to the browser" - there's no client-side
// loading state to write for this page.
export default async function HomePage() {
  const [latestVideo, categories] = await Promise.all([getLatestVideo(), getCategoriesByRecency()]);

  if (!latestVideo && categories.length === 0) {
    return (
      <Container>
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </Container>
    );
  }

  // Fetch each row's videos in parallel rather than one category at a time.
  const rows = await Promise.all(
    categories.map(async (category) => ({
      category,
      videos: await getVideosByCategory(category, 10),
    }))
  );

  return (
    <div>
      {latestVideo && <Hero video={latestVideo} />}
      <Container className="flex flex-col gap-10 py-10">
        {rows.map(({ category, videos }) => (
          <FadeUp key={category}>
            <CategoryRow category={category} videos={videos} />
          </FadeUp>
        ))}
      </Container>
    </div>
  );
}
