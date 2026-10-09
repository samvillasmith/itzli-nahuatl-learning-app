"use client";

import ReactDOM from "react-dom";
import { useEffect } from "react";
import { getLessonImagePreloadQueue } from "@/lib/lesson-image-preload";

const WORD_IMAGE_ORIGINS = [
  "https://nahuatl-language.s3.us-east-1.amazonaws.com",
  "https://mero-mero-app.s3.us-east-1.amazonaws.com",
];

export function WordImageOriginHints() {
  for (const origin of WORD_IMAGE_ORIGINS) {
    ReactDOM.preconnect(origin);
    ReactDOM.prefetchDNS(origin);
  }
  return null;
}

export function WordImagePreloads({
  urls,
  limit = 3,
}: {
  urls: Array<string | null | undefined>;
  limit?: number;
}) {
  const uniqueUrls = [...new Set(urls.filter((url): url is string => Boolean(url)))].slice(0, limit);
  const firstUrl = uniqueUrls[0];
  useEffect(() => {
    if (!firstUrl) return;
    const abort = new AbortController();
    void getLessonImagePreloadQueue().preload(firstUrl, 0, abort.signal);
    return () => abort.abort();
  }, [firstUrl]);

  for (const [index, url] of uniqueUrls.entries()) {
    ReactDOM.preload(url, {
      as: "image",
      fetchPriority: index === 0 ? "high" : "low",
    });
  }

  return null;
}
