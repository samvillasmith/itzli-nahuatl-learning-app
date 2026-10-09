"use client";
import { useEffect } from "react";
import { GENERATED_AUDIO_INDEX } from "@/lib/generated-audio";
import { getAudioCacheQueue } from "@/lib/audio-cache";
import { getSourceAudioPreloadQueue } from "@/lib/source-audio-preload";

/** Visible cues move ahead of the full background pack, sharing the same
 * bounded queues so dozens of dictionary buttons cannot create a fetch burst. */
export function useAudioWarmup(url: string | null) {
  useEffect(() => {
    if (!url) return;
    const abort = new AbortController();
    const asset = GENERATED_AUDIO_INDEX.assetForUrl(url);
    if (asset) void getAudioCacheQueue().cache(asset, 0, abort.signal);
    else if (GENERATED_AUDIO_INDEX.hasSourceUrl(url)) void getSourceAudioPreloadQueue().preload(url, 0, abort.signal);
    return () => abort.abort();
  }, [url]);
}
