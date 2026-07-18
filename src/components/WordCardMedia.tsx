"use client";

import { useState } from "react";
import type { WordImage } from "@/data/word-images";
import { useLocale } from "@/i18n/LocaleProvider";
import { WordImagePreloads } from "@/components/WordImageResourceHints";

export function WordCardMedia({
  image,
  alt,
}: {
  image: WordImage | null;
  alt: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!image || failedUrl === image.url) return null;

  const frameAspect = image.source === "itzli" ? "aspect-[5/4]" : "aspect-[4/3]";

  return (
    <>
      <WordImagePreloads urls={[image.url]} limit={1} />
      <div
        data-testid="word-card-media"
        className="border-b border-stone-200 bg-[#fbf1d8] px-3 py-3 sm:px-5 sm:py-4"
      >
        <div
          className={`relative mx-auto w-full max-w-lg overflow-hidden bg-[#fbf1d8] ${frameAspect}`}
        >
          {/* Direct S3 delivery avoids image-optimization cold starts and Vercel image charges. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={alt}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-top"
            onError={() => setFailedUrl(image.url)}
          />
        </div>
      </div>
    </>
  );
}

export function WordImageCredit({ image }: { image: WordImage | null }) {
  const { translate } = useLocale();
  if (
    !image ||
    image.source === "openai" ||
    image.source === "s3" ||
    image.source === "itzli"
  ) return null;

  const href = image.pexels_url ?? image.author_url ?? image.source;
  const label = `${image.author} · ${image.license}`;
  return href?.startsWith("http") ? (
    <p className="mt-2 text-center text-[11px] text-stone-400">
      {translate("Image")}: {" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-stone-600"
      >
        {label}
      </a>
    </p>
  ) : (
    <p className="mt-2 text-center text-[11px] text-stone-400">{translate("Image")}: {label}</p>
  );
}
