"use client"; // the only thing this does is a localStorage write on mount -
// see lib/recently-watched.ts. Renders nothing.

import { useEffect } from "react";

import { recordWatched } from "@/lib/recently-watched";

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

  return null;
}
