import recordings from "./audio-recording-reuse.json";

export type RecordingKind = "source" | "synthetic";

/** These bindings replace a held file, never release or overwrite that file. */
export function getDialogueSourceRecording(id: string, currentText?: string) {
  return recordings.sourceDialogues.find((recording) => recording.id === id &&
    (currentText === undefined || recording.runtimeText === currentText)) ?? null;
}

/** Exact source spelling only: no search aliases, shortened names or inflections. */
export function getExistingPhraseRecording(text: string, translation: string) {
  return recordings.syntheticPhrases.find((recording) =>
    recording.text === text && recording.translation === translation) ?? null;
}

export const SOURCE_DIALOGUE_RECORDINGS = recordings.sourceDialogues;
export const EXISTING_SYNTHETIC_PHRASE_RECORDINGS = recordings.syntheticPhrases;
