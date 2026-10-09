"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { GENERATED_AUDIO_ASSETS, GENERATED_AUDIO_INDEX, ORIGINAL_SOURCE_AUDIO_URLS } from "@/lib/generated-audio";
import { audioGroupsForPath, backgroundAudioAllowed, isLearningAudioPath, precacheGeneratedAudio, type AudioCacheProgress } from "@/lib/audio-cache";
import { preloadSourceAudio, type SourceAudioProgress } from "@/lib/source-audio-preload";

export default function CourseAudioCache() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const es = locale === "es";
  const learningPath = isLearningAudioPath(pathname);
  const [progress, setProgress] = useState<AudioCacheProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [sourceProgress, setSourceProgress] = useState<SourceAudioProgress | null>(null);
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
      // background pack. The queues still bound actual concurrent requests.
      void precacheGeneratedAudio(GENERATED_AUDIO_INDEX.lessonAssets(group), { priority: index + 1, signal: abort.signal, enqueueAll: true });
      void preloadSourceAudio(GENERATED_AUDIO_INDEX.lessonSourceUrls(group), { priority: index + 1, signal: abort.signal, enqueueAll: true });
    });
    return () => abort.abort();
  }, [pathname]);

  const saveAll = useCallback(async () => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    const [result, originals] = await Promise.all([
      precacheGeneratedAudio(GENERATED_AUDIO_ASSETS, { priority: 10, signal: abort.signal, onProgress: setProgress }),
      preloadSourceAudio(ORIGINAL_SOURCE_AUDIO_URLS, { priority: 10, signal: abort.signal, onProgress: setSourceProgress }),
    ]);
    if (controller.current === abort) {
      controller.current = null;
      setProgress(result);
      setSourceProgress(originals);
      setRunning(false);
    }
  }, []);
  useEffect(() => {
    const begin = () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      if (learningPath && (GENERATED_AUDIO_ASSETS.length || ORIGINAL_SOURCE_AUDIO_URLS.length) && document.visibilityState !== "hidden" && backgroundAudioAllowed(connection, navigator.onLine)) void saveAll();
    };
    const pause = () => controller.current?.abort();
    // Fill the course gradually after the page settles. Slow/metered connections
    // keep lesson preloading and expose the same explicit resumable download.
    const timer = setTimeout(begin, 4_000);
    window.addEventListener("online", begin);
    window.addEventListener("offline", pause);
    document.addEventListener("visibilitychange", begin);
    return () => {
      clearTimeout(timer); controller.current?.abort();
      window.removeEventListener("online", begin); window.removeEventListener("offline", pause);
      document.removeEventListener("visibilitychange", begin);
    };
  }, [saveAll, learningPath]);
  useEffect(() => {
    const requested = () => { if (learningPath) void saveAll(); };
    window.addEventListener("itzli-course-audio-download", requested);
    return () => window.removeEventListener("itzli-course-audio-download", requested);
  }, [saveAll, learningPath]);

  if (!learningPath || (!GENERATED_AUDIO_ASSETS.length && !ORIGINAL_SOURCE_AUDIO_URLS.length)) return null;
  const complete = progress?.saved === GENERATED_AUDIO_ASSETS.length;
  const allPrepared = complete && (!ORIGINAL_SOURCE_AUDIO_URLS.length || sourceProgress?.prepared === ORIGINAL_SOURCE_AUDIO_URLS.length);
  return <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500">
    <span role="status">{complete ? (es ? "Voces de práctica guardadas en este dispositivo." : "Practice voices saved on this device.")
      : progress ? (es ? `${progress.saved} de ${progress.total} grabaciones guardadas.` : `${progress.saved} of ${progress.total} recordings saved.`)
      : (es ? "El audio de tus lecciones se prepara mientras aprendes." : "Your lesson audio prepares while you learn.")}</span>
    {sourceProgress && <span>{es ? `${sourceProgress.prepared} de ${sourceProgress.total} grabaciones originales preparadas para escuchar en línea. El navegador controla cuánto tiempo las conserva.`
      : `${sourceProgress.prepared} of ${sourceProgress.total} original recordings prepared for online playback. Your browser controls how long it keeps them.`}</span>}
    {!allPrepared && <button type="button" className="font-semibold text-emerald-700 underline" onClick={() => {
      if (running) controller.current?.abort();
      else void saveAll();
    }}>{running ? (es ? "Pausar descarga de audio" : "Pause audio download")
      : (es ? "Guardar todo el audio del curso" : "Save all course audio")}</button>}
    {progress?.paused && !running && <span>{es ? "Puedes continuar la descarga cuando tengas conexión y espacio." : "Resume when you have a connection and storage space."}</span>}
  </div>;
}
