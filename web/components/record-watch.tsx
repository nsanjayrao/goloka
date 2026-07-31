"use client"; // a localStorage write on mount, plus - when signed in - the
// same watch recorded to the account. Renders nothing.

import { useEffect } from "react";

import { useSession } from "@/lib/auth";
import { recordWatched } from "@/lib/recently-watched";
import { recordWatchRemote } from "@/lib/watch-history";

export function RecordWatch({
  youtubeVideoId,
  title,
  thumbnailUrl,
  channelTitle,
  durationSeconds,
  category = null,
}: {
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  durationSeconds: number | null;
  /** Feeds the "Because you watched" affinity - see lib/affinity.ts. */
  category?: string | null;
}) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  // The LOCAL write is unconditional and unchanged. It is what makes Continue
  // Watching work for the vast majority of devotees, who never sign in, and
  // it stays the source of truth on this device.
  useEffect(() => {
    recordWatched({
      youtube_video_id: youtubeVideoId,
      title,
      thumbnail_url: thumbnailUrl,
      channel_title: channelTitle,
      duration_seconds: durationSeconds,
      category,
    });
  }, [youtubeVideoId, title, thumbnailUrl, channelTitle, durationSeconds, category]);

  // The REMOTE write happens only when signed in, and only carries the video
  // id and a timestamp - title, thumbnail and channel are JOINed from the
  // catalogue at read time, so the account never becomes a second copy of it.
  // Separate effect on purpose: it must re-run when a devotee signs in while
  // already sitting on a watch page, and must not re-run when a prop that
  // only the local write cares about changes.
  useEffect(() => {
    if (!userId) return;
    void recordWatchRemote(userId, youtubeVideoId);
  }, [userId, youtubeVideoId]);

  return null;
}
