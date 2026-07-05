import { CategoryPoster } from "@/components/category-poster";
import { Shelf } from "@/components/shelf";
import { categorySubtitle } from "@/lib/category-meta";

// Apple's vertical-poster "Browse by category" row on the home page
// (DESIGN.md #4). The poster itself - duotone artwork, gradient, scrim -
// lives in <CategoryPoster>, shared with the /browse index grid; this
// component only arranges posters into a snap-scrolling shelf.
export function BrowseShelf({
  categories,
  thumbnails,
}: {
  categories: string[];
  thumbnails: Record<string, string | null>;
}) {
  if (categories.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="font-heading text-[26px] font-medium tracking-tight text-text sm:text-[28px]">
          Browse by Category
        </h2>
      </div>
      <Shelf>
        {categories.map((category) => (
          <CategoryPoster
            key={category}
            category={category}
            thumbnail={thumbnails[category] ?? null}
            // The home shelf shows the category's personality line; the
            // /browse grid uses the same `meta` slot for the video count.
            meta={categorySubtitle(category)}
            className="snap-item w-[150px] shrink-0 sm:w-[200px]"
            sizes="(min-width: 640px) 200px, 150px"
          />
        ))}
      </Shelf>
    </section>
  );
}
