"use client";

import { useId, useSyncExternalStore } from "react";
import { Sparkles, X } from "lucide-react";
import type { AppLocale } from "@/i18n/config";
const trChoice = (locale: AppLocale, english: string, spanish: string) => locale === "es" ? spanish : english;

const DISMISSAL_KEY = "itzli:announcement:3.0:dismissed";
const DISMISSAL_EVENT = "itzli:announcement:3.0:change";
let dismissedThisSession = false;

function readDismissal(): boolean {
  if (dismissedThisSession) return true;
  try {
    return window.localStorage.getItem(DISMISSAL_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribeToDismissal(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DISMISSAL_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(DISMISSAL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DISMISSAL_EVENT, onChange);
  };
}

function serverDismissal(): null {
  return null;
}

function dismissAnnouncement() {
  dismissedThisSession = true;
  try {
    window.localStorage.setItem(DISMISSAL_KEY, "true");
  } catch {
    // The banner still dismisses for this session when storage is unavailable.
  }
  window.dispatchEvent(new Event(DISMISSAL_EVENT));
}

type VersionAnnouncementProps = {
  locale: AppLocale;
  lessonCount: number;
  vocabularyCount: number;
  audioClipCount: number;
};

export default function VersionAnnouncement({
  locale,
  lessonCount,
  vocabularyCount,
  audioClipCount,
}: VersionAnnouncementProps) {
  const headingId = useId();
  const dismissed = useSyncExternalStore(subscribeToDismissal, readDismissal, serverDismissal);
  if (dismissed === null || dismissed) return null;

  const numberLocale = locale === "es" ? "es-MX" : "en-US";
  const lessons = lessonCount.toLocaleString(numberLocale);
  const vocabulary = vocabularyCount.toLocaleString(numberLocale);
  const audioClips = audioClipCount.toLocaleString(numberLocale);

  return (
    <aside aria-labelledby={headingId} className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-[#fffdf8] p-4 shadow-[0_8px_25px_rgba(39,36,31,.035)] sm:mb-8 sm:gap-4 sm:px-5">
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 sm:flex" aria-hidden="true"><Sparkles size={19} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.1em] text-emerald-800">{trChoice(locale, "Version 3.0", "Versión 3.0")}</span>
          <h2 id={headingId} className="text-sm font-black text-stone-950">{trChoice(locale, "More Nahuatl. Improved pronunciation practice.", "Más náhuatl. Mejor práctica de pronunciación.")}</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {trChoice(locale,
            `Our free course now has ${lessons} lessons and ${vocabulary} words and forms, with more sentence building and conversations. Practice pronunciation with ${audioClips} refreshed synthetic clips and refined Nahuatl sound rules. Original recordings and your existing progress are preserved.`,
            `Nuestro curso gratuito ahora tiene ${lessons} lecciones y ${vocabulary} palabras y formas, con más construcción de oraciones y conversaciones. Practica la pronunciación con ${audioClips} audios sintéticos renovados y reglas adaptadas al náhuatl. Se conservan las grabaciones originales y tu progreso.`)}
        </p>
      </div>
      <button type="button" onClick={dismissAnnouncement} aria-label={trChoice(locale, "Dismiss the Version 3.0 announcement", "Cerrar el anuncio de la versión 3.0")} className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-500 transition hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
