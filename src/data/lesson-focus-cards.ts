export type LessonFocusCard = {
  labId: string;
  unit: number;
  headword: string;
  gloss_en: string;
  part_of_speech: "form" | "phrase" | "sentence" | "word";
};

export const LESSON_FOCUS_CARDS: LessonFocusCard[] = [
  { labId: "name-exchange", unit: 3, headword: "notōcah", gloss_en: "my name", part_of_speech: "form" },
  { labId: "name-exchange", unit: 3, headword: "motōcah", gloss_en: "your name", part_of_speech: "form" },
  { labId: "name-exchange", unit: 3, headword: "ītōcah", gloss_en: "her/his name", part_of_speech: "form" },
  { labId: "name-exchange", unit: 3, headword: "¿Quēniuhqui motōcah?", gloss_en: "What is your name?", part_of_speech: "sentence" },
  { labId: "name-exchange", unit: 3, headword: "Na notōcah Paty.", gloss_en: "My name is Paty.", part_of_speech: "sentence" },
  { labId: "name-exchange", unit: 3, headword: "Na notōcah Juana.", gloss_en: "My name is Juana.", part_of_speech: "sentence" },
  { labId: "name-exchange", unit: 3, headword: "Huan ta, ¿quēniuhqui motōcah?", gloss_en: "And you, what is your name?", part_of_speech: "sentence" },

  { labId: "identity-words-introductions", unit: 5, headword: "nimomachtiani", gloss_en: "I am a student", part_of_speech: "form" },
  { labId: "identity-words-introductions", unit: 5, headword: "titlamachtihquetl", gloss_en: "you are a teacher", part_of_speech: "form" },
  { labId: "identity-words-introductions", unit: 5, headword: "tequitini", gloss_en: "she/he is a worker", part_of_speech: "word" },
  { labId: "identity-words-introductions", unit: 5, headword: "nitlamachtia", gloss_en: "I teach", part_of_speech: "form" },
  { labId: "identity-words-introductions", unit: 5, headword: "Nitlamachtia nāhuatl.", gloss_en: "I teach Nahuatl.", part_of_speech: "sentence" },
  { labId: "identity-words-introductions", unit: 5, headword: "¿Tlen titequiti ta?", gloss_en: "What do you do for work?", part_of_speech: "sentence" },

  { labId: "subject-prefixes", unit: 6, headword: "nitequiti", gloss_en: "I work", part_of_speech: "form" },
  { labId: "subject-prefixes", unit: 6, headword: "titequiti", gloss_en: "you work", part_of_speech: "form" },
  { labId: "subject-prefixes", unit: 6, headword: "tequiti", gloss_en: "she/he works", part_of_speech: "form" },
  { labId: "subject-prefixes", unit: 6, headword: "titequitih", gloss_en: "we work", part_of_speech: "form" },
  { labId: "subject-prefixes", unit: 6, headword: "antequitih", gloss_en: "you all work", part_of_speech: "form" },
  { labId: "subject-prefixes", unit: 6, headword: "tequitih", gloss_en: "they work", part_of_speech: "form" },

  { labId: "present-tense-verbs", unit: 6, headword: "nitlamachtia", gloss_en: "I teach", part_of_speech: "form" },
  { labId: "present-tense-verbs", unit: 6, headword: "nicōchi", gloss_en: "I sleep", part_of_speech: "form" },
  { labId: "present-tense-verbs", unit: 6, headword: "timomachtiah", gloss_en: "we study", part_of_speech: "form" },
  { labId: "present-tense-verbs", unit: 6, headword: "cōchih", gloss_en: "they sleep", part_of_speech: "form" },
  { labId: "present-tense-verbs", unit: 6, headword: "antlamachtiah", gloss_en: "you all teach", part_of_speech: "form" },

  { labId: "noun-endings", unit: 8, headword: "cīntli", gloss_en: "ear of corn", part_of_speech: "word" },
  { labId: "noun-endings", unit: 8, headword: "calli", gloss_en: "house", part_of_speech: "word" },
  { labId: "noun-endings", unit: 8, headword: "xōchitl", gloss_en: "flower", part_of_speech: "word" },
  { labId: "noun-endings", unit: 8, headword: "āmoxtli", gloss_en: "book", part_of_speech: "word" },
  { labId: "noun-endings", unit: 8, headword: "cal-", gloss_en: "house stem", part_of_speech: "form" },

  { labId: "possession-prefixes", unit: 8, headword: "notōcah", gloss_en: "my name", part_of_speech: "form" },
  { labId: "possession-prefixes", unit: 8, headword: "motōcah", gloss_en: "your name", part_of_speech: "form" },
  { labId: "possession-prefixes", unit: 8, headword: "nocal", gloss_en: "my house", part_of_speech: "form" },
  { labId: "possession-prefixes", unit: 8, headword: "tomīllah", gloss_en: "our milpa", part_of_speech: "form" },
  { labId: "possession-prefixes", unit: 8, headword: "intōcah", gloss_en: "their name", part_of_speech: "form" },

  { labId: "family-possession", unit: 9, headword: "nonana", gloss_en: "my mother", part_of_speech: "form" },
  { labId: "family-possession", unit: 9, headword: "motata", gloss_en: "your father", part_of_speech: "form" },
  { labId: "family-possession", unit: 9, headword: "iicni", gloss_en: "her/his sibling", part_of_speech: "form" },
  { labId: "family-possession", unit: 9, headword: "inana", gloss_en: "her/his mother", part_of_speech: "form" },

  { labId: "future-tense", unit: 12, headword: "nitequitiz", gloss_en: "I will work", part_of_speech: "form" },
  { labId: "future-tense", unit: 12, headword: "titequitizqueh", gloss_en: "we will work", part_of_speech: "form" },
  { labId: "future-tense", unit: 12, headword: "nitlahtōz", gloss_en: "I will speak", part_of_speech: "form" },
  { labId: "future-tense", unit: 12, headword: "tequitizqueh", gloss_en: "they will work", part_of_speech: "form" },
  { labId: "future-tense", unit: 12, headword: "Mōztla nitlahtōz nāhuatl īca nocihuāuh.", gloss_en: "Tomorrow I will speak Nahuatl with my wife.", part_of_speech: "sentence" },

  { labId: "object-prefixes", unit: 13, headword: "niccua", gloss_en: "I eat it", part_of_speech: "form" },
  { labId: "object-prefixes", unit: 13, headword: "ticcua", gloss_en: "you eat it", part_of_speech: "form" },
  { labId: "object-prefixes", unit: 13, headword: "quicua", gloss_en: "she/he eats it", part_of_speech: "form" },
  { labId: "object-prefixes", unit: 13, headword: "ticchīhua", gloss_en: "you make it", part_of_speech: "form" },
  { labId: "object-prefixes", unit: 13, headword: "nictlaxcaloa", gloss_en: "I am making tortillas", part_of_speech: "form" },
  { labId: "object-prefixes", unit: 13, headword: "Niccua tōmātl huan etl.", gloss_en: "I eat tomato and beans.", part_of_speech: "sentence" },

  { labId: "past-tense", unit: 14, headword: "ōnihuetz", gloss_en: "I fell", part_of_speech: "form" },
  { labId: "past-tense", unit: 14, headword: "ōtihuetz", gloss_en: "you fell", part_of_speech: "form" },
  { labId: "past-tense", unit: 14, headword: "ōnicuēp", gloss_en: "I came back", part_of_speech: "form" },
  { labId: "past-tense", unit: 14, headword: "ōquicuac", gloss_en: "she/he ate it", part_of_speech: "form" },
  { labId: "past-tense", unit: 14, headword: "¿Tlen ōmochiuh?", gloss_en: "What happened?", part_of_speech: "sentence" },

  { labId: "respect-affection", unit: 20, headword: "cihuātzin", gloss_en: "respected woman; ma'am", part_of_speech: "form" },
  { labId: "respect-affection", unit: 20, headword: "tlacātzin", gloss_en: "gentleman; respected man", part_of_speech: "form" },
  { labId: "respect-affection", unit: 20, headword: "nopiltzin", gloss_en: "my dear child", part_of_speech: "form" },
  { labId: "respect-affection", unit: 20, headword: "calpil", gloss_en: "little house", part_of_speech: "form" },
  { labId: "respect-affection", unit: 20, headword: "notātatzin", gloss_en: "my respected/dear father", part_of_speech: "form" },
  { labId: "respect-affection", unit: 20, headword: "nonantzin", gloss_en: "my respected/dear mother", part_of_speech: "form" },

  { labId: "conditionals", unit: 30, headword: "intla", gloss_en: "if", part_of_speech: "word" },
  { labId: "conditionals", unit: 30, headword: "Intla nitequiti, nitlacua.", gloss_en: "If I work, I eat.", part_of_speech: "sentence" },
  { labId: "conditionals", unit: 30, headword: "Intla tiyāuh, niyāuh.", gloss_en: "If you go, I go.", part_of_speech: "sentence" },
  { labId: "conditionals", unit: 30, headword: "Intla tequitih, titequitih.", gloss_en: "If they work, we work.", part_of_speech: "sentence" },
  { labId: "conditionals", unit: 30, headword: "Intla āmo tomi, ¿tlen ticchīhuaz?", gloss_en: "If there is no money, what will you do?", part_of_speech: "sentence" },
];

export function getLessonFocusCardsForUnit(unit: number, labIds: string[]): LessonFocusCard[] {
  const allowedLabs = new Set(labIds);
  return LESSON_FOCUS_CARDS.filter((card) => card.unit === unit && allowedLabs.has(card.labId));
}

export function getLessonFocusCardsForLab(labId: string): LessonFocusCard[] {
  return LESSON_FOCUS_CARDS.filter((card) => card.labId === labId);
}
