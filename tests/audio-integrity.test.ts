import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import course from "@/data/nahuatlahtolli-course.json";
import { EXISTING_SYNTHETIC_PHRASE_RECORDINGS, SOURCE_DIALOGUE_RECORDINGS, getDialogueSourceRecording, getExistingPhraseRecording } from "@/data/recording-reuse";
import { getConversationScenarios } from "@/data/conversation-scenarios";
import { activateCourseAudio, dialogueAudioUrl, isPlaybackInterruption, playAudio, releaseCourseAudio, vocabCardAudioUrl } from "@/lib/audio";
import { getUnitDialogueContent } from "@/lib/db";
import { toInaliOrthography } from "@/lib/orthography";

afterEach(() => vi.unstubAllGlobals());

describe("recording integrity", () => {
  it("uses original exact source alternatives while retaining held legacy files", () => {
    const key = (text: string) => toInaliOrthography(text).toLowerCase().replace(/[.!?¿¡]/g, "").trim();
    expect(SOURCE_DIALOGUE_RECORDINGS).toHaveLength(4);
    for (const recording of SOURCE_DIALOGUE_RECORDINGS) {
      const lesson = course.lessons.find((item) => item.number === recording.sourceLesson)!;
      const word = lesson.vocabulary[recording.sourceIndex - 1];
      expect(word.headword).toBe(recording.sourceText);
      expect(word.audioUrl).toBe(recording.url);
      expect(key(recording.runtimeText)).toBe(key(word.headword));
      const lines = getUnitDialogueContent(recording.id.startsWith("CUR-11") ? 11 : 19);
      expect(lines.find((line) => line.lesson_dialogue_id === recording.id)).toMatchObject({
        utterance_normalized: recording.runtimeText, audio_available: true,
      });
      expect(dialogueAudioUrl(recording.id)).toBe(recording.url);
      expect(getDialogueSourceRecording(recording.id, "Changed phrase.")).toBeNull();
    }
    expect(vocabCardAudioUrl(35, null)).toBeNull();
  });

  it("reuses only existing exact text and meaning, with synthetic provenance", () => {
    expect(EXISTING_SYNTHETIC_PHRASE_RECORDINGS).toHaveLength(3);
    const unit3 = getUnitDialogueContent(3);
    for (const recording of EXISTING_SYNTHETIC_PHRASE_RECORDINGS) {
      expect(unit3.find((line) => line.lesson_dialogue_id === recording.id)).toMatchObject({
        utterance_normalized: recording.text, translation_en: recording.translation, audio_available: true,
      });
      const bytes = readFileSync(join(process.cwd(), "public", recording.url));
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WAVE");
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(recording.sha256);
      expect(recording.pronunciationStatus).toBe("not-certified");
      expect(getExistingPhraseRecording(recording.text, "A different meaning")).toBeNull();
      expect(getExistingPhraseRecording(`${recording.text} Extra words.`, recording.translation)).toBeNull();
    }
    const phrases = getConversationScenarios().flatMap((scenario) => scenario.turns.flatMap((turn) => [turn, ...turn.options]));
    const reused = phrases.filter((phrase) => phrase.audioKind === "synthetic");
    expect(reused.length).toBeGreaterThan(0);
    for (const phrase of reused) expect(getExistingPhraseRecording(phrase.nahuatl, phrase.english)?.url).toBe(phrase.audioUrl);
  });

  it("reports playback failure exactly once without silently trying an old same-ID recording", async () => {
    const instances: Array<{ onerror: (() => void) | null; onended: (() => void) | null }> = [];
    vi.stubGlobal("Audio", class {
      onerror: (() => void) | null = null;
      onended: (() => void) | null = null;
      constructor(public src: string) { instances.push(this); }
      play() { return Promise.reject(new Error("Unavailable")); }
    });
    const done = vi.fn();
    playAudio("/audio-google/vocab/35.wav", done);
    const staleError = instances[0].onerror!;
    staleError();
    staleError();
    await Promise.resolve();
    expect(instances).toHaveLength(1);
    expect(done).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("reports completion exactly once even when ended is repeated", () => {
    let ended: (() => void) | null = null;
    vi.stubGlobal("Audio", class {
      onerror: (() => void) | null = null;
      set onended(callback: (() => void) | null) { ended = callback; }
      play() { return Promise.resolve(); }
    });
    const done = vi.fn();
    playAudio("/audio-google/vocab/24.wav", done);
    ended!();
    ended!();
    expect(done).toHaveBeenCalledExactlyOnceWith(true);
  });
  it("interrupts the previous button cue once without reporting a playback error", async () => {
    const instances: Array<{ onerror: (() => void) | null; onended: (() => void) | null; pause: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal("Audio", class {
      onerror: (() => void) | null = null;
      onended: (() => void) | null = null;
      pause = vi.fn();
      constructor() { instances.push(this); }
      play() { return Promise.resolve(); }
    });
    const first = vi.fn(), second = vi.fn();
    playAudio("/audio-google/vocab/24.wav", first);
    const staleEnded = instances[0].onended!, staleError = instances[0].onerror!;
    playAudio("/audio-google/vocab/25.wav", second);
    expect(instances[0].pause).toHaveBeenCalledOnce();
    expect(first).toHaveBeenCalledExactlyOnceWith(false, "interrupted");
    staleEnded(); staleError(); await Promise.resolve();
    expect(first).toHaveBeenCalledTimes(1);
    instances[1].onended!();
    expect(second).toHaveBeenCalledExactlyOnceWith(true);
  });
  it("shares interruption between native controls and button Audio objects", () => {
    const native = { pause: vi.fn() } as unknown as HTMLAudioElement;
    const instances: Array<{ onended: (() => void) | null; pause: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal("Audio", class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      constructor() { instances.push(this); }
      play() { return Promise.resolve(); }
    });
    activateCourseAudio(native);
    const button = vi.fn();
    playAudio("/audio-google/vocab/24.wav", button);
    expect(native.pause).toHaveBeenCalledOnce();
    activateCourseAudio(native);
    expect(instances[0].pause).toHaveBeenCalledOnce();
    expect(button).toHaveBeenCalledExactlyOnceWith(false, "interrupted");
    releaseCourseAudio(native);
    expect(isPlaybackInterruption(new DOMException("Interrupted", "AbortError"))).toBe(true);
    expect(isPlaybackInterruption(new Error("Network failed"))).toBe(false);
  });
});
