"use client";

import { useEffect } from "react";
import { GENERATED_AUDIO_INDEX } from "@/lib/generated-audio";
import { precacheGeneratedAudio } from "@/lib/audio-cache";
import { preloadSourceAudio } from "@/lib/source-audio-preload";

/** Some lesson pages contain additional grammar labs. Register their complete
 * approved media groups before answers are revealed, sharing the route queues. */
export function useLessonAudioWarmup(groups: readonly string[]) {
  useEffect(() => {
    const abort = new AbortController();
    for (const group of groups) {
      void precacheGeneratedAudio(GENERATED_AUDIO_INDEX.lessonAssets(group), { priority: 1, signal: abort.signal, enqueueAll: true });
      void preloadSourceAudio(GENERATED_AUDIO_INDEX.lessonSourceUrls(group), { priority: 1, signal: abort.signal, enqueueAll: true });
    }
    return () => abort.abort();
  }, [groups]);
}
