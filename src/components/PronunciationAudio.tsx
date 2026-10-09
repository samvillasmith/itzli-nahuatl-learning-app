"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Volume2 } from "lucide-react";
import { playAudio } from "@/lib/audio";
import { useLocale } from "@/i18n/LocaleProvider";
import { resolvePracticeRecording } from "@/lib/generated-audio";
import { useAudioWarmup } from "./useAudioWarmup";

export default function PronunciationAudio({
  src,
  size = "md",
  text,
  referenceId,
  held,
}: {
  src: string | null;
  size?: "sm" | "md" | "lg";
  text?: string;
  referenceId?: string;
  held?: boolean;
}) {
  const recording = resolvePracticeRecording({ text, url: src, referenceId, held });
  return <PronunciationPlayback key={recording.url ?? "unavailable"} src={recording.url} size={size} kind={recording.kind} />;
}

function PronunciationPlayback({ src, size, kind }: {
  src: string | null;
  size: "sm" | "md" | "lg";
  kind: "source" | "synthetic";
}) {
  useAudioWarmup(src);
  const { locale, translate } = useLocale();
  const [playing, setPlaying] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src !== null && failedSrc === src;
  const cancel = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancel.current?.(); };
  }, []);

  if (!src) {
    return (
      <p className="max-w-44 text-xs leading-relaxed text-stone-500">
        {locale === "es" ? "Grabación no disponible." : "Recording unavailable."}
      </p>
    );
  }

  const sourceRecording = kind === "source";
  const sizeClasses = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
  const iconClasses = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };

  function handlePlay(event: React.MouseEvent) {
    event.stopPropagation();
    if (playing || !src) return;
    setPlaying(true);
    setFailedSrc(null);
    cancel.current = playAudio(src, (played, reason) => {
      if (!mounted.current) return;
      setPlaying(false);
      if (!played && reason !== "interrupted") setFailedSrc(src);
    });
  }

  return (
    <div className="flex max-w-44 flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handlePlay}
        disabled={playing}
        title={translate("Play pronunciation")}
        aria-label={translate("Play pronunciation")}
        className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-colors ${sizeClasses[size]} ${
          playing
            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
            : "border-stone-200 bg-white text-stone-500 shadow-sm hover:border-emerald-300 hover:text-emerald-700"
        }`}
      >
        {playing ? (
          <LoaderCircle className={`${iconClasses[size]} animate-spin`} aria-hidden="true" />
        ) : (
          <Volume2 className={iconClasses[size]} aria-hidden="true" />
        )}
      </button>
      {size === "lg" && (
        <p className="text-center text-[10px] leading-snug text-stone-500">
          {sourceRecording
            ? locale === "es" ? "Grabación de la fuente" : "Source recording"
            : locale === "es" ? "Voz sintética de práctica" : "Synthetic practice voice"}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-center text-xs leading-relaxed text-amber-800">
          {locale === "es"
            ? "No se pudo reproducir el audio. Pulsa para reintentar."
            : "Audio could not play. Press to retry."}
        </p>
      )}
    </div>
  );
}
