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
  5: [
    {
      lesson_dialogue_id: "CUR-5-001",
      speaker_label: "A",
      utterance_normalized: "Piyali, ¿tlen titekiti ta?",
      translation_en: "Hello, what do you do for work?",
    },
    {
      lesson_dialogue_id: "CUR-5-002",
      speaker_label: "B",
      utterance_normalized: "Nitlamachtia nawatl.",
      translation_en: "I teach Nahuatl.",
    },
    {
      lesson_dialogue_id: "CUR-5-003",
      speaker_label: "A",
      utterance_normalized: "Kwalli. Na nitlahkwiloa.",
      translation_en: "Good. I write.",
    },
  ],
  11: [
    {
      lesson_dialogue_id: "CUR-11-001",
      speaker_label: "A",
      utterance_normalized: "Piyali.",
      translation_en: "Hello.",
    },
    {
      lesson_dialogue_id: "CUR-11-002",
      speaker_label: "B",
      utterance_normalized: "Piyali, ximopanolti.",
      translation_en: "Hello, welcome in.",
    },
    {
      lesson_dialogue_id: "CUR-11-003",
      speaker_label: "A",
      utterance_normalized: "Tlaskamati.",
      translation_en: "Thank you.",
    },
    {
      lesson_dialogue_id: "CUR-11-004",
      speaker_label: "B",
      utterance_normalized: "Axtlen.",
      translation_en: "You're welcome.",
    },
    {
      lesson_dialogue_id: "CUR-11-005",
      speaker_label: "A",
      utterance_normalized: "Asta mostlaj.",
      translation_en: "See you tomorrow.",
    },
    {
      lesson_dialogue_id: "CUR-11-006",
      speaker_label: "B",
      utterance_normalized: "Asta mostlaj.",
      translation_en: "See you tomorrow.",
    },
  ],
  19: [
    {
      lesson_dialogue_id: "CUR-19-001",
      speaker_label: "A",
      utterance_normalized: "Ximoketsa.",
      translation_en: "Stand up.",
    },
    {
      lesson_dialogue_id: "CUR-19-002",
      speaker_label: "B",
      utterance_normalized: "Kena.",
      translation_en: "Yes.",
    },
    {
      lesson_dialogue_id: "CUR-19-003",
      speaker_label: "A",
      utterance_normalized: "Ximotlali wan xitlapowa.",
      translation_en: "Sit down and read.",
    },
    {
      lesson_dialogue_id: "CUR-19-004",
      speaker_label: "B",
      utterance_normalized: "Kwalli, tlaskamati.",
      translation_en: "Good, thank you.",
    },
  ],
};
