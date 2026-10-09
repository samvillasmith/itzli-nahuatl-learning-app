"use client";

import { useEffect } from "react";
import { preloadLessonImages } from "@/lib/lesson-image-preload";

export function useLessonImageWarmup(urls: readonly (string | null | undefined)[]) {
  useEffect(() => {
    const abort = new AbortController();
    void preloadLessonImages(urls, { signal: abort.signal, priority: 1 });
    return () => abort.abort();
  }, [urls]);
}
