export type CuratedDialogueLine = {
  lesson_dialogue_id: string;
  speaker_label: string;
  utterance_normalized: string;
  translation_en: string | null;
  audio_available?: boolean;
};

/**
 * Short editorial adaptations for lessons where the imported dialogue rows are
 * unusable as learner conversation. These are not verbatim source dialogues.
 * They use forms already introduced by the source course.
 */
export const CURATED_DIALOGUES: Record<number, CuratedDialogueLine[]> = {
  5: [
    {
      lesson_dialogue_id: "CUR-5-001",
      speaker_label: "A",
      utterance_normalized: "Piyali, ¿tlen titekiti ta?",
      translation_en: "Hello, what do you do for work?",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-5-002",
      speaker_label: "B",
      utterance_normalized: "Nitlamachtia nawatl.",
      translation_en: "I teach Nahuatl.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-5-003",
      speaker_label: "A",
      utterance_normalized: "Kwalli. Na nitlahkwiloa.",
      translation_en: "Good. I write.",
      audio_available: false,
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
      utterance_normalized: "Piyali, xipano.",
      translation_en: "Hello, come in.",
      audio_available: false,
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
      utterance_normalized: "Mostlayok.",
      translation_en: "See you tomorrow.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-11-006",
      speaker_label: "B",
      utterance_normalized: "Mostlayok.",
      translation_en: "See you tomorrow.",
      audio_available: false,
    },
  ],
  19: [
    {
      lesson_dialogue_id: "CUR-19-001",
      speaker_label: "A",
      utterance_normalized: "Ximoketsa.",
      translation_en: "Stand up.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-19-002",
      speaker_label: "B",
      utterance_normalized: "Kena.",
      translation_en: "Yes.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-19-003",
      speaker_label: "A",
      utterance_normalized: "Ximosewi wan xitlapowa.",
      translation_en: "Sit down and read.",
      audio_available: false,
    },
    {
      lesson_dialogue_id: "CUR-19-004",
      speaker_label: "B",
      utterance_normalized: "Kwalli, tlaskamati.",
      translation_en: "Good, thank you.",
      audio_available: false,
    },
  ],
};

/**
 * Targeted corrections to synthetic rows in the published database. The source
 * lesson numbers identify the COERLL forms/rules behind each adaptation, not an
 * attestation of the complete generated sentence. Unchanged synthetic dialogue
 * still needs review by a Chicontepec speaker. Changed text cannot use the old
 * recording under the same row ID.
 *
 * Primary source URLs are in nahuatlahtolli-course.json for these lesson numbers.
 */
export type DialogueLineCorrection = Pick<
  CuratedDialogueLine,
  "utterance_normalized" | "translation_en"
> & {
  audio_available: false;
  source_lesson_numbers: number[];
  source_urls?: string[];
};

export const DIALOGUE_LINE_CORRECTIONS: Record<string, DialogueLineCorrection> = {
  "FCN-LDG-000223": {
    utterance_normalized: "Āman niyāuh, pampa nicnequi niccuāz āchtopa.",
    translation_en: "I'm going now, because I want to eat first.",
    audio_available: false, source_lesson_numbers: [11, 12, 18, 24],
  },
  "FCN-LDG-000252": {
    utterance_normalized: "Quēna, tlāhuēl nicnequi nimomachtiz nāhuatl.",
    translation_en: "Yes, I really want to learn Nahuatl.",
    audio_available: false, source_lesson_numbers: [11, 12, 24],
  },
  "FCN-LDG-000256": {
    utterance_normalized: "Niātli, ax nitlacua. Nicnequi niccuāz tamalli āxcan.",
    translation_en: "I'm drinking water, not eating. I want to eat tamales today.",
    audio_available: false, source_lesson_numbers: [11, 12, 18, 24],
  },
  "FCN-LDG-000273": {
    utterance_normalized: "¿Tlen ticnequi ticcuāz?",
    translation_en: "What do you want to eat?",
    audio_available: false, source_lesson_numbers: [11, 12, 18, 24],
  },
  "FCN-LDG-000274": {
    utterance_normalized: "Nicnequi niccuāz yēlotl huan camohtli. ¡Huelic!",
    translation_en: "I want to eat corn and sweet potato. Delicious!",
    audio_available: false, source_lesson_numbers: [11, 12, 18, 24],
  },
  "FCN-LDG-000316": {
    utterance_normalized: "Quēna. Nicnequi pāhtli āxcan.",
    translation_en: "Yes. I want medicine today.",
    audio_available: false, source_lesson_numbers: [12, 29],
  },
  "FCN-LDG-000328": {
    utterance_normalized: "Quēna, nicnequi nitemachtiz. Cuālli notequi.",
    translation_en: "Yes, I want to teach people. It's good work.",
    audio_available: false, source_lesson_numbers: [12, 32],
    source_urls: ["https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=292"],
  },
  "FCN-LDG-000355": {
    utterance_normalized: "Nicnequi nicpōhuaz in āmatlahcuilōlli. Huel tlazohtli.",
    translation_en: "I want to read the letter. It is very dear.",
    audio_available: false, source_lesson_numbers: [11, 12],
    source_urls: ["https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=405"],
  },
  "FCN-LDG-000240": {
    utterance_normalized: "¿Ticpiya moconēhuan?",
    translation_en: "Do you have children?",
    audio_available: false,
    source_lesson_numbers: [9, 13],
  },
  "FCN-LDG-000241": {
    utterance_normalized: "Quēna, nicpiya ēyi noconēhuan. ¿Huan ta?",
    translation_en: "Yes, I have three children. And you?",
    audio_available: false,
    source_lesson_numbers: [9, 13],
  },
  "FCN-LDG-000242": {
    utterance_normalized: "Ayamo. Zan nicpiya nomachconēhuan.",
    translation_en: "Not yet. I only have nieces and nephews.",
    audio_available: false,
    source_lesson_numbers: [9, 13],
  },
  "FCN-LDG-000243": {
    utterance_normalized: "Cuālli. Nototatah huan notonanān nicān itztoqueh.",
    translation_en: "Good. My grandfather and grandmother are here.",
    audio_available: false,
    source_lesson_numbers: [9, 24],
  },
  "FCN-LDG-000244": {
    utterance_normalized: "¿Quēniuhqui tiitztoc āxcan?",
    translation_en: "How are you feeling today?",
    audio_available: false,
    source_lesson_numbers: [24],
  },
  "FCN-LDG-000246": {
    utterance_normalized: "Quēna, cuālli tiitztoc.",
    translation_en: "Yes, you are well.",
    audio_available: false,
    source_lesson_numbers: [24],
  },
  "FCN-LDG-000251": {
    utterance_normalized: "¿Huan ticnequi timomachtiz nāhuatl?",
    translation_en: "And do you want to learn Nahuatl?",
    audio_available: false,
    source_lesson_numbers: [11, 12, 24],
  },
  "FCN-LDG-000271": {
    utterance_normalized: "¿Ācquiya mocēhuiz pan cuaciyah?",
    translation_en: "Who will sit in the chair?",
    audio_available: false,
    source_lesson_numbers: [12, 17],
  },
  "FCN-LDG-000272": {
    utterance_normalized: "Nimocēhuiz nicān. Xicalaqui.",
    translation_en: "I will sit here. Come in.",
    audio_available: false,
    source_lesson_numbers: [2, 12, 17],
  },
  "FCN-LDG-000276": {
    utterance_normalized: "Axcanah xococ, nicnequi cōcoc. Tlāhuēl nicnequi cōcoc.",
    translation_en: "Not sour — I want spicy. I really want spicy.",
    audio_available: false,
    source_lesson_numbers: [18],
  },
  "FCN-LDG-000278": {
    utterance_normalized: "In tlacātzin notātatzin. Xipano, ximocēhui.",
    translation_en: "The gentleman is my father. Come in, sit down.",
    audio_available: false,
    source_lesson_numbers: [2],
  },
  "FCN-LDG-000288": {
    utterance_normalized: "Quēna, huan onca xōnacatl. Cuālli nitlacuāz āxcan.",
    translation_en: "Yes, and there is onion. I'll eat well today.",
    audio_available: false,
    source_lesson_numbers: [12],
  },
  "FCN-LDG-000289": {
    utterance_normalized: "¿Tlen onca calihtic?",
    translation_en: "What is inside the house?",
    audio_available: false,
    source_lesson_numbers: [23],
  },
  "FCN-LDG-000292": {
    utterance_normalized: "In pāhtli onca nicān, calihtic. Niquitta.",
    translation_en: "The medicine is here, in the house. I see it.",
    audio_available: false,
    source_lesson_numbers: [23],
  },
  "FCN-LDG-000309": {
    utterance_normalized: "Piyālli! Nipanoyaya mochān.",
    translation_en: "Hello! I was passing by your house.",
    audio_available: false,
    source_lesson_numbers: [28],
  },
  "FCN-LDG-000310": {
    utterance_normalized: "Quēna, xipano!",
    translation_en: "Yes! Come in!",
    audio_available: false,
    source_lesson_numbers: [2],
  },
  "FCN-LDG-000311": {
    utterance_normalized: "Tlazcāmati. ¿Cuālli tiitztoc āxcan?",
    translation_en: "Thank you. Are you well today?",
    audio_available: false,
    source_lesson_numbers: [24],
  },
  "FCN-LDG-000312": {
    utterance_normalized: "Quēna, cuālli niitztoc. Ximocēhui.",
    translation_en: "Yes, I'm well. Sit down.",
    audio_available: false,
    source_lesson_numbers: [2, 24],
  },
  "FCN-LDG-000313": {
    utterance_normalized: "¿Quēniuhqui tiitztoc?",
    translation_en: "How are you feeling?",
    audio_available: false,
    source_lesson_numbers: [24],
  },
  "FCN-LDG-000301": {
    utterance_normalized: "¿Tlen ticcōhuaz nicān tiānquiz?",
    translation_en: "What will you buy here at the market?",
    audio_available: false,
    source_lesson_numbers: [13, 15],
  },
  "FCN-LDG-000302": {
    utterance_normalized: "Niccōhuaz cē pantzi huan ōme lalax. ¿Quēzqui tomi?",
    translation_en: "I'll buy one bread and two oranges. How much money?",
    audio_available: false,
    source_lesson_numbers: [13, 15],
  },
  "FCN-LDG-000305": {
    utterance_normalized: "¡Āxcan tiānquiz! ¿Tlen ticcōhuaz?",
    translation_en: "It's market day! What will you buy?",
    audio_available: false,
    source_lesson_numbers: [13, 15],
  },
  "FCN-LDG-000306": {
    utterance_normalized: "Niccōhuaz nākatl huan michi. ¿Huan ta?",
    translation_en: "I'll buy meat and fish. And you?",
    audio_available: false,
    source_lesson_numbers: [13, 15],
  },
  "FCN-LDG-000307": {
    utterance_normalized: "Na niccōhuaz tzopelatl huan matzāhtli.",
    translation_en: "I'll buy soda and pineapple.",
    audio_available: false,
    source_lesson_numbers: [13, 15],
  },
  "FCN-LDG-000317": {
    utterance_normalized: "¿Tlen ticcōhuazquia?",
    translation_en: "What would you buy?",
    audio_available: false,
    source_lesson_numbers: [15, 30],
  },
  "FCN-LDG-000318": {
    utterance_normalized: "Niccōhuazquia nācatl. ¿Huan ta?",
    translation_en: "I would buy meat. And you?",
    audio_available: false,
    source_lesson_numbers: [15, 30],
  },
  "FCN-LDG-000319": {
    utterance_normalized: "Na niccōhuazquia etl.",
    translation_en: "I would buy beans.",
    audio_available: false,
    source_lesson_numbers: [15, 30],
  },
  "FCN-LDG-000320": {
    utterance_normalized: "Quēna, niccōhuazquia etl.",
    translation_en: "Yes, I would buy beans.",
    audio_available: false,
    source_lesson_numbers: [15, 30],
  },
  "FCN-LDG-000321": {
    utterance_normalized: "¿Ticōnitozquia ātl?",
    translation_en: "Would you have drunk water?",
    audio_available: false,
    source_lesson_numbers: [30, 31],
  },
  "FCN-LDG-000322": {
    utterance_normalized: "Quēna, nicōnitozquia ātl.",
    translation_en: "Yes, I would have drunk water.",
    audio_available: false,
    source_lesson_numbers: [30, 31],
  },
  "FCN-LDG-000323": {
    utterance_normalized: "¿Huan ticōnitozquia cafen?",
    translation_en: "And would you have drunk coffee?",
    audio_available: false,
    source_lesson_numbers: [30, 31],
  },
  "FCN-LDG-000324": {
    utterance_normalized: "Axcanah. Nicōnitozquia ātl.",
    translation_en: "No. I would have drunk water.",
    audio_available: false,
    source_lesson_numbers: [30, 31],
  },
  "FCN-LDG-000326": {
    utterance_normalized: "Cē cihuātl tēmachtia. Tlāhuēl cuālli tlahtōa nāhuatl.",
    translation_en: "A woman teaches. She speaks Nahuatl very well.",
    audio_available: false,
    source_lesson_numbers: [6, 32],
    source_urls: ["https://nahuatl.wired-humanities.org/content/tlahto%C4%81"],
  },
  "FCN-LDG-000327": {
    utterance_normalized: "¿Huan ta, ticnequi titēmachtiz?",
    translation_en: "And you, do you want to teach people?",
    audio_available: false,
    source_lesson_numbers: [12, 32],
    source_urls: ["https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=292"],
  },
  "FCN-LDG-000350": {
    utterance_normalized: "Quēna, nicchīhua eloatolli huan nictlalhuilia chancacah. ¿Ticnequi?",
    translation_en: "Yes, I'm making atole and adding piloncillo. Do you want some?",
    audio_available: false,
    source_lesson_numbers: [19],
    source_urls: ["https://nahuatl.wired-humanities.org/content/%C4%93l%C5%8D%C4%81t%C5%8Dlli-0"],
  },
  "FCN-LDG-000353": {
    utterance_normalized: "¿Cāmpa eltoc in āmatlahcuilōlli?",
    translation_en: "Where is the letter?",
    audio_available: false,
    source_lesson_numbers: [25],
  },
  "FCN-LDG-000354": {
    utterance_normalized: "In āmatlahcuilōlli nicān eltoc ipan folsah. ¿Tlen ticnequi?",
    translation_en: "The letter is here in the bag. What do you want?",
    audio_available: false,
    source_lesson_numbers: [25],
  },
  // Use the attested singular future here while the authored plural-future
  // spelling is awaiting speaker/audio review. Source plural examples remain.
  "FCN-LDG-000372": {
    utterance_normalized: "Huel cuālli. Ocsepa nimomachtiz.",
    translation_en: "Very good. I'll study again.",
    audio_available: false,
    source_lesson_numbers: [12],
  },
};
