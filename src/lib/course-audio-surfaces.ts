import type { ConversationScenario } from "@/data/conversation-scenarios";
import type { ConversationHistoryStep } from "./conversation-checkpoint";
import { createGeneratedAudioIndex, GENERATED_AUDIO_INDEX, GENERATED_AUDIO_MANIFEST, type GeneratedAudioIndex, type GeneratedAudioManifest } from "./generated-audio";
import { displayNahuatl } from "./orthography";

/** Source prose is not classified as Nahuatl at runtime. Only exact published
 * source-body identities and their registered text can receive playback. */
export function createSourceBrowserAudioLookup(manifest: GeneratedAudioManifest, index: GeneratedAudioIndex = createGeneratedAudioIndex(manifest)) {
  const texts = new Map<string, Set<string>>();
  for (const binding of [...manifest.bindings, ...(manifest.source_bindings ?? [])]) {
    if (!binding.reference_id.startsWith("source-body:")) continue;
    const current = texts.get(binding.reference_id) ?? new Set<string>();
    current.add(binding.runtime_text);
    texts.set(binding.reference_id, current);
  }
  return (line: string, referenceId: string) => {
    const registered = texts.get(referenceId);
    if (!registered || index.isHeld(referenceId)) return null;
    const speaker = line.match(/^(?:[ABCD]|[A-Z][a-z]+):\s*(.+)$/u);
    const quote = line.match(/^([^“”"]+)\s*[“"]([^“”"]+)[”"]\s*$/u);
    const spoken = (speaker?.[1] || quote?.[1] || line).trim();
    const text = [spoken, displayNahuatl(spoken)].find(value => registered.has(value));
    if (!text) return null;
    const original = index.sourceLookup(text, referenceId);
    const generated = index.lookup(text, referenceId);
    if (!original && !generated) return null;
    return { text, url: original ?? generated!.url, referenceId };
  };
}

export const sourceBrowserLineAudio = createSourceBrowserAudioLookup(GENERATED_AUDIO_MANIFEST, GENERATED_AUDIO_INDEX);

export type ConversationPlaybackLine = {
  nahuatl: string;
  translation: string;
  speaker: string;
  audioUrl: string | null;
  referenceId: string;
};

/** Reconstruct playback from existing source IDs; no new progress identity,
 * typed learner answer or guessed phrase association is introduced. */
export function conversationPlaybackHistory(scenario: ConversationScenario, history: readonly ConversationHistoryStep[], locale: "en" | "es"): ConversationPlaybackLine[] {
  return history.flatMap(step => {
    const turn = scenario.turns.find(value => value.id === step.turnId);
    const option = turn?.options.find(value => value.id === step.optionId && value.correct && value.intent !== "repeat");
    if (!turn || !option) return [];
    return [
      { nahuatl: turn.nahuatl, translation: locale === "es" ? turn.spanish : turn.english, speaker: turn.speaker,
        audioUrl: turn.audioUrl, referenceId: `conversation:${scenario.id}:${turn.id}:model` },
      { nahuatl: option.nahuatl, translation: locale === "es" ? option.spanish : option.english, speaker: locale === "es" ? "Tú" : "You",
        audioUrl: option.audioUrl, referenceId: `conversation:${scenario.id}:${turn.id}:${option.id}` },
    ];
  });
}
