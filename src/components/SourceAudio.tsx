"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { resolvePracticeRecording } from "@/lib/generated-audio";
import { useAudioWarmup } from "./useAudioWarmup";
import { activateCourseAudio, isPlaybackInterruption, releaseCourseAudio } from "@/lib/audio";
export default function SourceAudio({ url: suppliedUrl, scope = "utterance", kind: suppliedKind = "source", replayToken = 0, text, referenceId, held }: {
  url: string | null; scope?: string; kind?: "source" | "synthetic"; replayToken?: number;
  text?: string; referenceId?: string; held?: boolean;
}) {
  const recording = resolvePracticeRecording({ text, url: suppliedUrl, kind: suppliedKind, referenceId, held });
  const { url, kind } = recording;
  useAudioWarmup(url);
  const { locale } = useLocale();
  const es = locale === "es";
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const error = Boolean(url && errors[url]);
  const setError = (failed: boolean) => {
    if (url) setErrors((current) => ({ ...current, [url]: failed }));
  };
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = audio.current;
    return () => { if (element) { element.pause(); releaseCourseAudio(element); } };
  }, [url]);
  useEffect(() => {
    if (replayToken && audio.current) {
      audio.current.currentTime = 0;
      void audio.current.play().catch(error => {
        if (url && !isPlaybackInterruption(error)) setErrors((current) => ({ ...current, [url]: true }));
      });
    }
  }, [replayToken, url]);
  function retry() {
    if (!audio.current) return;
    setError(false);
    audio.current.load();
    void audio.current.play().catch(error => { if (!isPlaybackInterruption(error)) setError(true); });
  }
  if (!url) return <p className="text-xs text-stone-500">{es
    ? "Práctica escrita; todavía no hay una grabación que coincida con este texto."
    : "Text practice; a matching recording is not available yet."}</p>;
  return <div className="space-y-2">
    <audio key={url} ref={audio} controls preload={recording.generated ? "auto" : "none"} src={url}
      onLoadStart={() => setError(false)} onLoadedData={() => setError(false)}
      onPlay={(event) => {
        activateCourseAudio(event.currentTarget);
      }} onPause={event => releaseCourseAudio(event.currentTarget)}
      onEnded={event => releaseCourseAudio(event.currentTarget)} className="w-full" onError={event => {
        releaseCourseAudio(event.currentTarget);
        if (event.currentTarget.error?.code !== 1) setError(true);
      }} />
    <p className="text-[11px] text-stone-500">{kind === "synthetic"
      ? (es ? "Audio sintético · pronunciación no certificada" : "Synthetic audio · pronunciation not certified")
      : (es ? "Grabación de la fuente" : "Source recording")}{scope === "isolated-word"
        ? (es ? " · palabra aislada" : " · isolated word") : scope === "whole-passage"
          ? (es ? " · pasaje completo" : " · whole passage") : ""}</p>
    {error && <div role="alert" className="space-y-2 text-xs text-amber-800">
      <p>{es ? "No se pudo reproducir la grabación. Puedes continuar con el texto."
        : "The recording could not play. You can continue with the text."}</p>
      <button type="button" onClick={retry} className="font-bold underline">{es ? "Reintentar audio" : "Retry audio"}</button>
    </div>}
  </div>;
}
