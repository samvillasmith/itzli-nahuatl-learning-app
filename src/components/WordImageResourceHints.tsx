"use client";

import ReactDOM from "react-dom";

const WORD_IMAGE_ORIGIN = "https://nahuatl-language.s3.us-east-1.amazonaws.com";

export function WordImageOriginHints() {
  ReactDOM.preconnect(WORD_IMAGE_ORIGIN);
  ReactDOM.prefetchDNS(WORD_IMAGE_ORIGIN);
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

  for (const [index, url] of uniqueUrls.entries()) {
    ReactDOM.preload(url, {
      as: "image",
      fetchPriority: index === 0 ? "high" : "low",
    });
  }

  return null;
}
