"use client"; // the whole page is per-user: session, saved lists.

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { signInWithGoogle, signOut, useSession } from "@/lib/auth";
import { getSavedVideos } from "@/lib/saved";
import type { Video } from "@/lib/types";

type LibraryData = { userId: string; favourites: Video[]; watchLater: Video[] };

export function LibraryClient() {
  const { session, hydrated } = useSession();
  // Fetched data is tagged with the user it belongs to and DERIVED against
  // the live session (never reset-in-effect): sign out, and stale lists are
  // simply ignored; sign in again, and the fetch overwrites them.
  const [data, setData] = useState<LibraryData | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const userId = session.user.id;
    Promise.all([getSavedVideos("favourite"), getSavedVideos("watch_later")]).then(
      ([favourites, watchLater]) => {
        if (!cancelled) setData({ userId, favourites, watchLater });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [session]);

  const current = session && data?.userId === session.user.id ? data : null;
  const loaded = current !== null;
  const favourites = current?.favourites ?? [];
  const watchLater = current?.watchLater ?? [];

  // Before hydration nothing personal can be known - render the neutral
  // heading so there's no layout jump either way.
  if (!hydrated) {
    return <h1 className="font-heading text-3xl text-text sm:text-4xl">My Library</h1>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <h1 className="font-heading text-3xl text-text">My Library</h1>
        <p className="mt-3 text-text-muted">
          Sign in to keep favourites and a watch-later list that follow you
          across devices.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="btn gold mt-6"
        >
          Continue with Google
        </button>
        <p className="mt-6 text-[13px] leading-relaxed text-text-muted/80">
          Your account stores only these two lists — what you watch is never
          sent to the server, signed in or not. Deleting your account deletes
          everything.
        </p>
      </div>
    );
  }

  const grids: { title: string; videos: Video[]; empty: string }[] = [
    {
      title: "Favourites",
      videos: favourites,
      empty: "Nothing favourited yet — tap the heart on any video.",
    },
    {
      title: "Watch later",
      videos: watchLater,
      empty: "Nothing saved for later yet — tap the bookmark on any video.",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-3xl text-text sm:text-4xl">My Library</h1>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-text-muted transition-colors hover:text-flame"
        >
          Sign out{session.user.email ? ` (${session.user.email})` : ""}
        </button>
      </div>

      {loaded && favourites.length === 0 && watchLater.length === 0 ? (
        <EmptyState message="Your library is empty — the heart and bookmark on any video fill it." />
      ) : (
        grids.map(({ title, videos, empty }) => (
          <section key={title} className="mt-10">
            <h2 className="font-heading text-2xl text-text">{title}</h2>
            {videos.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">{loaded ? empty : "Loading…"}</p>
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
    </div>
  );
}
