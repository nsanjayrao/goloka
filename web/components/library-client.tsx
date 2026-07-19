"use client"; // the whole page is per-user: session, saved lists.

import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import { EmptyState } from "@/components/empty-state";
import { ShareButton, WhatsAppShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/video-card";
import { signInWithGoogle, signOut, useSession } from "@/lib/auth";
import {
  createCollection,
  deleteCollection,
  getMyCollections,
  type SharedCollectionSummary,
} from "@/lib/collections";
import { formatRelativeDate } from "@/lib/format";
import { getSavedVideos } from "@/lib/saved";
import type { Video } from "@/lib/types";

type LibraryData = {
  userId: string;
  favourites: Video[];
  watchLater: Video[];
  collections: SharedCollectionSummary[];
};

// One list's "turn this into a link" control: a quiet trigger that opens an
// inline title form (never window.prompt - the design system owns every
// surface), then shows the copyable link once created. Lives right next to
// the grid's heading, only when the grid is non-empty.
function ShareCollectionButton({
  userId,
  videos,
  onCreated,
}: {
  userId: string;
  videos: Video[];
  onCreated: () => void;
}) {
  const t = useTranslations("library");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [link, setLink] = useState<{ id: string; title: string } | null>(null);

  function reset() {
    setOpen(false);
    setTitle("");
    setFailed(false);
    setLink(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setFailed(false);
    const id = await createCollection(
      userId,
      trimmed,
      videos.map((video) => video.youtube_video_id)
    );
    setCreating(false);
    if (!id) {
      setFailed(true);
      return;
    }
    setLink({ id, title: trimmed });
    onCreated();
  }

  if (link) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-text-muted">{t("linkReady")}</span>
        <ShareButton title={link.title} path={`/c/${link.id}`} />
        <WhatsAppShareButton title={link.title} path={`/c/${link.id}`} />
        <button
          type="button"
          onClick={reset}
          className="text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
        >
          {t("done")}
        </button>
      </div>
    );
  }

  if (open) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          placeholder={t("titlePlaceholder")}
          aria-label={t("titleInputAria")}
          className="h-8 w-52 rounded-full border border-border bg-surface px-3 text-[13px] text-text outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-accent"
        />
        <Button type="submit" size="sm" disabled={creating || !title.trim()}>
          {creating ? t("creating") : t("createLink")}
        </Button>
        <button
          type="button"
          onClick={reset}
          className="text-[13px] text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
        >
          {t("cancel")}
        </button>
        {failed && (
          // #E58A8A: the palette's "red on dark surfaces" shade (DESIGN.md
          // #2 - live red is #E05B5B but reads too hot for small body text).
          <span className="text-[13px] text-[#E58A8A]" role="alert">
            {t("createFailed")}
          </span>
        )}
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 text-[13px] text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
    >
      <Link2 className="size-3.5" />
      {t("shareAsLink")}
    </button>
  );
}

export function LibraryClient() {
  const { session, hydrated } = useSession();
  const t = useTranslations("library");
  const tButtons = useTranslations("buttons");
  const tEmpty = useTranslations("emptyState");
  // Fetched data is tagged with the user it belongs to and DERIVED against
  // the live session (never reset-in-effect): sign out, and stale lists are
  // simply ignored; sign in again, and the fetch overwrites them.
  const [data, setData] = useState<LibraryData | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const userId = session.user.id;
    Promise.all([
      getSavedVideos("favourite"),
      getSavedVideos("watch_later"),
      getMyCollections(),
    ]).then(([favourites, watchLater, collections]) => {
      if (!cancelled) setData({ userId, favourites, watchLater, collections });
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const current = session && data?.userId === session.user.id ? data : null;
  const loaded = current !== null;
  const favourites = current?.favourites ?? [];
  const watchLater = current?.watchLater ?? [];
  const collections = current?.collections ?? [];

  // Re-fetches just the shared-links list (after a create or a delete)
  // without disturbing the two grids above it.
  async function refreshCollections() {
    if (!session) return;
    const next = await getMyCollections();
    setData((prev) => (prev && prev.userId === session.user.id ? { ...prev, collections: next } : prev));
  }

  async function handleDelete(id: string) {
    const ok = await deleteCollection(id);
    if (ok) refreshCollections();
  }

  // Before hydration nothing personal can be known - render the neutral
  // heading so there's no layout jump either way.
  if (!hydrated) {
    return <h1 className="font-heading text-3xl text-text sm:text-4xl">{t("title")}</h1>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <h1 className="font-heading text-3xl text-text">{t("title")}</h1>
        <p className="mt-3 text-text-muted">{t("signInPrompt")}</p>
        <button type="button" onClick={signInWithGoogle} className="btn gold mt-6">
          {t("continueWithGoogle")}
        </button>
        <p className="mt-6 text-[13px] leading-relaxed text-text-muted/80">{t("privacyNote")}</p>
      </div>
    );
  }

  const grids: { title: string; videos: Video[]; empty: string }[] = [
    { title: t("favouritesTitle"), videos: favourites, empty: tEmpty("noFavourites") },
    { title: t("watchLaterTitle"), videos: watchLater, empty: tEmpty("noWatchLater") },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-3xl text-text sm:text-4xl">{t("title")}</h1>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-text-muted transition-colors hover:text-flame"
        >
          {tButtons("signOut")}
          {session.user.email ? ` (${session.user.email})` : ""}
        </button>
      </div>

      {loaded && favourites.length === 0 && watchLater.length === 0 ? (
        <EmptyState message={tEmpty("libraryEmpty")} />
      ) : (
        grids.map(({ title, videos, empty }) => (
          <section key={title} className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-2xl text-text">{title}</h2>
              {videos.length > 0 && (
                <ShareCollectionButton
                  userId={session.user.id}
                  videos={videos}
                  onCreated={refreshCollections}
                />
              )}
            </div>
            {videos.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">{loaded ? empty : tButtons("loading")}</p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {videos.map((video) => (
                  <VideoCard key={video.youtube_video_id} video={video} />
                ))}
              </div>
            )}
          </section>
        ))
      )}

      {/* Shared links this devotee has created from either list above - a
          quiet running log, not another grid (DESIGN.md accounts surface:
          two lists plus, now, the links made from them). */}
      {loaded && collections.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-2xl text-text">{t("mySharedLinks")}</h2>
          <ul className="mt-4 divide-y divide-border">
            {collections.map((collection) => (
              <li
                key={collection.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-text" title={collection.title}>
                    {collection.title}
                  </p>
                  <p className="text-[13px] text-text-muted">
                    {formatRelativeDate(collection.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ShareButton title={collection.title} path={`/c/${collection.id}`} />
                  <WhatsAppShareButton title={collection.title} path={`/c/${collection.id}`} />
                  <button
                    type="button"
                    onClick={() => handleDelete(collection.id)}
                    className="text-[13px] text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
                  >
                    {t("delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
