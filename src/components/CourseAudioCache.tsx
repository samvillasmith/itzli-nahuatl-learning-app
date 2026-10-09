"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { GENERATED_AUDIO_ASSETS, GENERATED_AUDIO_INDEX } from "@/lib/generated-audio";
import { audioGroupsForPath, isLearningAudioPath, precacheGeneratedAudio, type AudioCacheProgress } from "@/lib/audio-cache";
import { preloadSourceAudio } from "@/lib/source-audio-preload";

const packBytes = GENERATED_AUDIO_ASSETS.reduce((total, asset) => total + (asset.byte_length ?? 0), 0);
const packMegabytes = Math.round(packBytes / 1_000_000);

export default function CourseAudioCache() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const es = locale === "es";
  const learningPath = isLearningAudioPath(pathname);
  const [progress, setProgress] = useState<AudioCacheProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  useEffect(() => {
    const groups = audioGroupsForPath(pathname);
    const abort = new AbortController();
    // Current lesson has first priority; only its actual next path lesson follows.
    groups.forEach((group, index) => {
      // Register every current-lesson clip now, before the adjacent lesson or
      // optional audio pack. The queues still bound actual concurrent requests.
      void precacheGeneratedAudio(GENERATED_AUDIO_INDEX.lessonAssets(group), { priority: index + 1, signal: abort.signal, enqueueAll: true });
      void preloadSourceAudio(GENERATED_AUDIO_INDEX.lessonSourceUrls(group), { priority: index + 1, signal: abort.signal, enqueueAll: true });
    });
    return () => abort.abort();
  }, [pathname]);

  const saveAll = useCallback(async () => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setDownloadStarted(true);
    setRunning(true);
    const result = await precacheGeneratedAudio(GENERATED_AUDIO_ASSETS, { priority: 10, signal: abort.signal, onProgress: setProgress });
    if (controller.current === abort) {
      controller.current = null;
      setProgress(result);
      setRunning(false);
    }
  }, []);
  useEffect(() => {
    const pause = () => controller.current?.abort();
    // Only an explicit learner action starts or resumes the optional pack.
    // Keep it running across routes, while going offline pauses it safely.
    window.addEventListener("offline", pause);
    return () => {
      controller.current?.abort();
      window.removeEventListener("offline", pause);
    };
  }, []);
  useEffect(() => {
    const requested = () => { if (learningPath) void saveAll(); };
    window.addEventListener("itzli-course-audio-download", requested);
    return () => window.removeEventListener("itzli-course-audio-download", requested);
  }, [saveAll, learningPath]);

  if ((!learningPath && !downloadStarted) || !GENERATED_AUDIO_ASSETS.length) return null;
  const complete = progress?.saved === GENERATED_AUDIO_ASSETS.length;
  const actionLabel = running ? (es ? "Pausar descarga" : "Pause download")
    : progress?.paused ? (es ? "Continuar descarga" : "Resume download")
    : progress?.failed ? (es ? "Reintentar descarga" : "Retry download")
    : (es ? "Descargar todo el audio de práctica" : "Download all practice audio");
  return <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500">
    {!downloadStarted && <span>{es ? "El audio de tus lecciones se prepara mientras aprendes." : "Your lesson audio prepares while you learn."}</span>}
    <span>{es ? `Opcional para escuchar sin conexión. Usa datos y espacio en tu dispositivo${packBytes ? ` (aprox. ${packMegabytes} MB)` : ""}.`
      : `Optional for offline listening. Uses data and device storage${packBytes ? ` (about ${packMegabytes} MB)` : ""}.`}</span>
    {downloadStarted && <span role="status">{complete ? (es ? "Audio de práctica guardado para escuchar sin conexión en este dispositivo." : "Practice audio saved for offline listening on this device.")
      : progress ? (es ? `${progress.saved} de ${progress.total} grabaciones de práctica guardadas.` : `${progress.saved} of ${progress.total} practice recordings saved.`)
      : (es ? "Preparando tu descarga de audio de práctica…" : "Preparing your practice audio download…")}</span>}
    {!complete && <button type="button" className="font-semibold text-emerald-700 underline" onClick={() => {
      if (running) controller.current?.abort();
      else void saveAll();
    }}>{actionLabel}</button>}
    {downloadStarted && progress?.paused && !running && <span>{es ? "Puedes continuar la descarga cuando tengas conexión y espacio." : "Resume when you have a connection and storage space."}</span>}
  </div>;
}
