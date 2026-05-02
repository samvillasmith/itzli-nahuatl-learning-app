export type CuratedDialogueLine = {
  lesson_dialogue_id: string;
  speaker_label: string;
  utterance_normalized: string;
  translation_en: string | null;
  audio_available?: boolean;
};

/**
 * Small, reviewed replacements for lessons where the source dialogue rows are
 * unusable as learner conversation. These stay intentionally conservative:
 * only words already introduced in the lesson should appear here.
 */
export const CURATED_DIALOGUES: Record<number, CuratedDialogueLine[]> = {
  11: [
    {
      lesson_dialogue_id: "CUR-11-001",
      speaker_label: "A",
      utterance_normalized: "Pialli.",
      translation_en: "Hello.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-11-002",
      speaker_label: "B",
      utterance_normalized: "Pialli, ximopanolti.",
      translation_en: "Hello, welcome in.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-11-003",
      speaker_label: "A",
      utterance_normalized: "Tlazohcamati.",
      translation_en: "Thank you.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-11-004",
      speaker_label: "B",
      utterance_normalized: "Axtlen.",
      translation_en: "You're welcome.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-11-005",
      speaker_label: "A",
      utterance_normalized: "Asta mostlaj.",
      translation_en: "See you tomorrow.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-11-006",
      speaker_label: "B",
      utterance_normalized: "Asta mostlaj.",
      translation_en: "See you tomorrow.",
      audio_available: false,
    },
  ],
};
