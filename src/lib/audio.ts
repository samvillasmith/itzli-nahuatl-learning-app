import { getDialogueSourceRecording } from "@/data/recording-reuse";
import { GENERATED_AUDIO_INDEX, getGeneratedRecording, isGeneratedAudioUrl, isOriginalSourceAudio } from "./generated-audio";

const BASE = trimBase(process.env.NEXT_PUBLIC_AUDIO_BASE_URL || "/audio-google");
const FALLBACK_BASE = trimBase(
  process.env.NEXT_PUBLIC_AUDIO_FALLBACK_BASE_URL || ""
);
const DIALOGUE_AUDIO_REVISION = "20260718-3";
let activePlayback: { element: HTMLAudioElement; interrupt?: () => void } | null = null;

/** Buttons create Audio objects outside the DOM; native controls and buttons
 * share this slot so selecting another cue always stops the previous voice. */
export function activateCourseAudio(element: HTMLAudioElement, interrupt?: () => void) {
  const previous = activePlayback;
  activePlayback = { element, interrupt };
  if (previous && previous.element !== element) {
    if (previous.interrupt) previous.interrupt();
    else previous.element.pause();
  }
  if (typeof document !== "undefined") document.querySelectorAll("audio").forEach(other => {
    if (other !== element && other !== previous?.element) other.pause();
  });
}
export function releaseCourseAudio(element: HTMLAudioElement) {
  if (activePlayback?.element === element) activePlayback = null;
}
export function isPlaybackInterruption(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "name" in error && error.name === "AbortError");
}

function trimBase(value: string): string {
  return value.replace(/\/+$/, "");
}

function audioUrl(kind: "vocab" | "dialogue", id: number | string): string {
  return `${BASE}/${kind}/${id}.wav`;
}

function fallbackFor(src: string): string | null {
  if (isGeneratedAudioUrl(src) || isOriginalSourceAudio(src)) return null;
  if (!FALLBACK_BASE || FALLBACK_BASE === BASE) return null;
  const prefix = `${BASE}/`;
  return src.startsWith(prefix) ? `${FALLBACK_BASE}/${src.slice(prefix.length)}` : null;
}

export function playAudio(src: string, onDone: (played: boolean, reason?: "interrupted") => void): () => void {
  const fallback = fallbackFor(src);
  const sources = fallback && fallback !== src ? [src, fallback] : [src];
  let index = 0;
  let completed = false;
  let current: HTMLAudioElement | null = null;

  function finish(played: boolean, reason?: "interrupted") {
    if (completed) return;
    completed = true;
    if (current) releaseCourseAudio(current);
    if (reason) onDone(played, reason);
    else onDone(played);
  }
  function interrupt() {
    if (completed) return;
    const element = current;
    if (element) { element.onended = null; element.onerror = null; }
    finish(false, "interrupted");
    element?.pause();
  }

  function tryNext() {
    if (completed) return;
    const next = sources[index];
    index += 1;

    if (!next) {
      finish(false);
      return;
    }

    let failed = false;
    const audio = new Audio(next);
    current = audio;
    activateCourseAudio(audio, interrupt);
    const fail = () => {
      if (failed || completed) return;
      failed = true;
      audio.onended = null;
      audio.onerror = null;
      releaseCourseAudio(audio);
      tryNext();
    };
    audio.onended = () => finish(true);
    audio.onerror = fail;
    try {
      void audio.play().catch(fail);
    } catch {
      fail();
    }
  }

  tryNext();
  return interrupt;
}

export const vocabAudioUrl = (id: number | string, currentText?: string) =>
  (currentText && getGeneratedRecording(currentText, `core-vocab:${id}`)?.url) || audioUrl("vocab", id);
export const dialogueAudioUrl = (id: string | number, currentText?: string) => {
  const key = String(id);
  const original = getDialogueSourceRecording(key, currentText);
  if (original) return original.url;
  const generated = currentText && getGeneratedRecording(currentText, `core-dialogue:${key}`);
  if (generated) return generated.url;
  const src = audioUrl("dialogue", key);
  return `${src}?v=${DIALOGUE_AUDIO_REVISION}`;
};

export function vocabCardAudioUrl(id: number, explicit?: string | null, currentText?: string): string | null {
  const referenceId = `core-vocab:${id}`;
  if (GENERATED_AUDIO_INDEX.isHeld(referenceId) || GENERATED_AUDIO_INDEX.isSourceUrlHeld(explicit) || (currentText && !GENERATED_AUDIO_INDEX.allowsText(currentText, referenceId))) return null;
  if (explicit && isOriginalSourceAudio(explicit)) return explicit;
  const generated = currentText && getGeneratedRecording(currentText, `core-vocab:${id}`);
  if (generated) return generated.url;
  // Explicit null withholds a stale or unverified recording after a text correction.
  if (explicit === null) return null;
  if (explicit) return explicit;
  return id > 0 ? vocabAudioUrl(id) : null;
}
