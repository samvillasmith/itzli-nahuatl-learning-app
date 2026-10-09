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
  if (!image) return null;
  return <WordCardImage key={image.url} image={image} alt={alt} />;
}

function WordCardImage({ image, alt }: { image: WordImage; alt: string }) {
  const { locale } = useLocale();
  const es = locale === "es";
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const frameAspect = image.source === "itzli" ? "aspect-[5/4]" : "aspect-[4/3]";
  // Direct delivery keeps the existing reviewed asset URL and browser cache.
  // eslint-disable-next-line @next/next/no-img-element
  const artwork = <img
    key={retryCount}
    src={image.url}
    alt={alt}
    loading="eager"
    fetchPriority="high"
    decoding="async"
    className="h-full w-full object-cover object-top"
    onError={() => setFailed(true)}
  />;

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
          {failed ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
            <p role="status" className="text-sm text-stone-600">{es ? "No se pudo cargar la imagen." : "The image could not load."}</p>
            <button type="button" onClick={() => { setRetryCount(count => count + 1); setFailed(false); }}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:border-emerald-500">
              {es ? "Volver a cargar la imagen" : "Retry image"}
            </button>
          </div> : artwork}
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
