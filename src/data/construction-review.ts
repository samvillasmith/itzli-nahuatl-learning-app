/**
 * Explicit review of the deployed primer rows for COERLL source lessons 1–9.
 * This reviews individual text/meaning pairs, not every row imported from a page.
 * Unknown IDs and changed upstream content require a new review and stay out of exercises.
 * English instructions, headings/captions, templates, blanks and incomplete narrative
 * translations are omitted. Uncertain source typos/lexical conflicts are also withheld.
 * Source spelling is retained; this is not a claim of universal EHN orthography.
 */
export interface ConstructionReview {
  first_lesson_number: number;
  expected_example_original: string;
  expected_translation_en: string | null;
  example_original: string;
  translation_en: string;
  source_lesson_number: number;
  source_url: string;
  review_status: "source-backed-example";
}

export const CONSTRUCTION_REVIEWS: Readonly<Record<string, ConstructionReview>> = {
  "FCN-CP-00009": {
    "first_lesson_number": 3,
    "expected_example_original": "A: Na notōcah Juana. ¿Cānin tiēhua?",
    "expected_translation_en": "A: My name is Juana. Where are you from?",
    "example_original": "Na notōcah Juana. ¿Cānin tiēhua?",
    "translation_en": "My name is Juana. Where are you from?",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00010": {
    "first_lesson_number": 3,
    "expected_example_original": "A: Ohh, cualtitoc, teipan timoittazceh.",
    "expected_translation_en": "A: Oh, that's good, we'll see each other later.",
    "example_original": "Ohh, cualtitoc, teipan timoittazceh.",
    "translation_en": "Oh, that's good, we'll see each other later.",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00011": {
    "first_lesson_number": 3,
    "expected_example_original": "A: Piyalli, ¿quēniuhqui motōcah?",
    "expected_translation_en": "A: Hello, what is your name?",
    "example_original": "Piyalli, ¿quēniuhqui motōcah?",
    "translation_en": "Hello, what is your name?",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00013": {
    "first_lesson_number": 3,
    "expected_example_original": "B: Na nimomachtia huan nitlamachtia pan caltlamachticān tlen UNAM.",
    "expected_translation_en": "B: I study and I teach at the school of UNAM.",
    "example_original": "Na nimomachtia huan nitlamachtia pan caltlamachticān tlen UNAM.",
    "translation_en": "I study and I teach at the school of UNAM.",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00014": {
    "first_lesson_number": 3,
    "expected_example_original": "B: Na nitlamachtia Nahuatl.",
    "expected_translation_en": "B: I teach Nahuatl.",
    "example_original": "Na nitlamachtia Nahuatl.",
    "translation_en": "I teach Nahuatl.",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00015": {
    "first_lesson_number": 3,
    "expected_example_original": "B: Na niēhua Tecomate, Chicōntepēc.",
    "expected_translation_en": "B: I am from Tecomate, Chicontepec.",
    "example_original": "Na niēhua Tecomate, Chicōntepēc.",
    "translation_en": "I am from Tecomate, Chicontepec.",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00016": {
    "first_lesson_number": 3,
    "expected_example_original": "B: Piyalli, na notōcah Paty. ¿Huan ta?",
    "expected_translation_en": "B: Hello, my name is Paty. And you?",
    "example_original": "Piyalli, na notōcah Paty. ¿Huan ta?",
    "translation_en": "Hello, my name is Paty. And you?",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00017": {
    "first_lesson_number": 3,
    "expected_example_original": "(ø)Cihuāmeh “They are women”",
    "expected_translation_en": "\"They are women\"",
    "example_original": "Cihuāmeh",
    "translation_en": "They are women",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00018": {
    "first_lesson_number": 3,
    "expected_example_original": "(ø)Cihuātl “He/she is a woman”",
    "expected_translation_en": "\"He/she is a woman\"",
    "example_original": "Cihuātl",
    "translation_en": "She is a woman.",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00023": {
    "first_lesson_number": 3,
    "expected_example_original": "Incihuāmeh “You all are women”",
    "expected_translation_en": "\"You all are women\"",
    "example_original": "Incihuāmeh",
    "translation_en": "You all are women",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00024": {
    "first_lesson_number": 3,
    "expected_example_original": "Inmācēhualmeh “You all are indigenous”",
    "expected_translation_en": "\"You all are indigenous\"",
    "example_original": "Inmācēhualmeh",
    "translation_en": "You all are indigenous",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00025": {
    "first_lesson_number": 3,
    "expected_example_original": "(ø)Mācēhualli “He/she is indigenous”",
    "expected_translation_en": "\"He/she is indigenous\"",
    "example_original": "Mācēhualli",
    "translation_en": "He/she is indigenous",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00026": {
    "first_lesson_number": 3,
    "expected_example_original": "(ø)mācēhualmeh “indigenous person”",
    "expected_translation_en": "\"indigenous person\" (mācēhualmeh)",
    "example_original": "mācēhualmeh",
    "translation_en": "Indigenous people",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00027": {
    "first_lesson_number": 3,
    "expected_example_original": "(ø)Mācēhualmeh “They are indigenous”",
    "expected_translation_en": "\"They are indigenous\"",
    "example_original": "Mācēhualmeh",
    "translation_en": "They are indigenous",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00029": {
    "first_lesson_number": 3,
    "expected_example_original": "Nimācēhualli “I am indigenous”",
    "expected_translation_en": "\"I am indigenous\"",
    "example_original": "Nimācēhualli",
    "translation_en": "I am indigenous",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00033": {
    "first_lesson_number": 3,
    "expected_example_original": "Ticihuāmeh “We are women”",
    "expected_translation_en": "\"We are women\"",
    "example_original": "Ticihuāmeh",
    "translation_en": "We are women",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00034": {
    "first_lesson_number": 3,
    "expected_example_original": "Ticihuātl “You are a woman”",
    "expected_translation_en": "\"You are a woman\"",
    "example_original": "Ticihuātl",
    "translation_en": "You are a woman",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00035": {
    "first_lesson_number": 3,
    "expected_example_original": "Timācēhualli “You are indigenous”",
    "expected_translation_en": "\"You are indigenous\"",
    "example_original": "Timācēhualli",
    "translation_en": "You are indigenous",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00036": {
    "first_lesson_number": 3,
    "expected_example_original": "Timācēhualmeh “We are indigenous”",
    "expected_translation_en": "\"We are indigenous\"",
    "example_original": "Timācēhualmeh",
    "translation_en": "We are indigenous",
    "source_lesson_number": 3,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-3-lesson-3-na-niehua-tecomate-chicontepec-i-am-from-tecomate-chicontepec/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00040": {
    "first_lesson_number": 4,
    "expected_example_original": "Eltoc chiucnahui āmoxtli.",
    "expected_translation_en": "There are nine books.",
    "example_original": "Eltoc chiucnahui āmoxtli.",
    "translation_en": "There are nine books.",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00041": {
    "first_lesson_number": 4,
    "expected_example_original": "Eltoc mācuilli cuaxilotl huan īīxnēzca cōztic.",
    "expected_translation_en": "There are five bananas and they are yellow.",
    "example_original": "Eltoc mācuilli cuaxilotl huan īīxnēzca cōztic.",
    "translation_en": "There are five bananas and they are yellow.",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00042": {
    "first_lesson_number": 4,
    "expected_example_original": "Eltoc ēyi tēcciztli, cē īīxnēzca tzictic",
    "expected_translation_en": "There are three seashells, one is shiny.",
    "example_original": "Eltoc ēyi tēcciztli, cē īīxnēzca tzictic",
    "translation_en": "There are three eggs; one is blue.",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00045": {
    "first_lesson_number": 4,
    "expected_example_original": "Oncah chicuacē alaxox huan īīxnēzca āchīlcōz.",
    "expected_translation_en": "There are six oranges and they are orange-colored.",
    "example_original": "Oncah chicuacē alaxox huan īīxnēzca āchīlcōz.",
    "translation_en": "There are six oranges and they are orange-colored.",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00046": {
    "first_lesson_number": 4,
    "expected_example_original": "Oncah chicuēyi chalchocotl huan īīxnēzca cōztic.",
    "expected_translation_en": "There are eight sapotes and they are yellow.",
    "example_original": "Oncah chicuēyi chalchocotl huan īīxnēzca cōztic.",
    "translation_en": "There are eight guavas and they are yellow.",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00048": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Quezqui ahāhuilli eltoc?",
    "expected_translation_en": "How many toys are there?",
    "example_original": "¿Quezqui ahāhuilli eltoc?",
    "translation_en": "How many toys are there?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00049": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Quezqui alaxox oncah huan tlen īīxnezca?",
    "expected_translation_en": "How many oranges are there and what color are they?",
    "example_original": "¿Quezqui alaxox oncah huan tlen īīxnezca?",
    "translation_en": "How many oranges are there and what color are they?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00052": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Quezqui tlaxcalli etloc pan cōmalli?",
    "expected_translation_en": "How many tortillas are there on the pan?",
    "example_original": "¿Quezqui tlaxcalli eltoc pan cōmalli?",
    "translation_en": "How many tortillas are there on the griddle?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00053": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Quezqui tēcciztli eltoc huan tlen īīxnēzca?",
    "expected_translation_en": "How many seashells are there and what color are they?",
    "example_original": "¿Quezqui tēcciztli eltoc huan tlen īīxnēzca?",
    "translation_en": "How many eggs are there and what color are they?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00055": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Quēzqui chalchocotl oncah huan tlen īīxnēzca?",
    "expected_translation_en": "How many sapotes are there and what color are they?",
    "example_original": "¿Quēzqui chalchocotl oncah huan tlen īīxnēzca?",
    "translation_en": "How many guavas are there and what color are they?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00056": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Quēzqui cuaxilotl eltoc huan tlen īīxnezca?",
    "expected_translation_en": "How many bananas are there and what color are they?",
    "example_original": "¿Quēzqui cuaxilotl eltoc huan tlen īīxnezca?",
    "translation_en": "How many bananas are there and what color are they?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00057": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Quēzqui manzanaz eltoc pan cuamezah?",
    "expected_translation_en": "How many apples are there on the table?",
    "example_original": "¿Quēzqui manzanaz eltoc pan cuamezah?",
    "translation_en": "How many apples are there on the table?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00059": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Quēzqui āmoxtli eltoc pan īxcopincayōtl?",
    "expected_translation_en": "How many books are there in the picture?",
    "example_original": "¿Quēzqui āmoxtli eltoc pan īxcopincayōtl?",
    "translation_en": "How many books are there in the picture?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00064": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Tlen īxnēzcayōtl ticāmati?",
    "expected_translation_en": "What color do you like?",
    "example_original": "¿Tlen īxnēzcayōtl ticāmati?",
    "translation_en": "What color do you like?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00065": {
    "first_lesson_number": 4,
    "expected_example_original": "¿Tlen īīxnēzca mopantalon?",
    "expected_translation_en": "What color are your pants?",
    "example_original": "¿Tlen īīxnēzca mopantalon?",
    "translation_en": "What color are your pants?",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00067": {
    "first_lesson_number": 4,
    "expected_example_original": "ōmpōhualli “fourty” (2 x 20)",
    "expected_translation_en": "\"forty\" (2 × 20)",
    "example_original": "ōmpōhualli",
    "translation_en": "forty",
    "source_lesson_number": 4,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-4-lesson-4-ixnezcayotl-huan-tlapohualiztli-colors-and-numbers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00090": {
    "first_lesson_number": 6,
    "expected_example_original": "Na nicōchi pan mahtlactli huan ōme cāhuitl.”",
    "expected_translation_en": "I sleep at twelve o'clock.",
    "example_original": "Na nicōchi pan mahtlactli huan ōme cāhuitl.",
    "translation_en": "I sleep at twelve o'clock.",
    "source_lesson_number": 6,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-6-lesson-6-tlachihualiztli-verbs/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00091": {
    "first_lesson_number": 6,
    "expected_example_original": "Nimomachtia nāhuatl. “I study Nahuatl.”",
    "expected_translation_en": "\"I study Nahuatl.\"",
    "example_original": "Nimomachtia nāhuatl.",
    "translation_en": "I study Nahuatl.",
    "source_lesson_number": 6,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-6-lesson-6-tlachihualiztli-verbs/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00092": {
    "first_lesson_number": 6,
    "expected_example_original": "Nitequiti caltlamachtiloyan. “I work at school.”",
    "expected_translation_en": "\"I work at school.\"",
    "example_original": "Nitequiti caltlamachtiloyan.",
    "translation_en": "I work at school.",
    "source_lesson_number": 6,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-6-lesson-6-tlachihualiztli-verbs/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00093": {
    "first_lesson_number": 6,
    "expected_example_original": "Nitlamachtia nāhuatl īcā yāhuatzinco. “I teach Nahuatl in the morning.”",
    "expected_translation_en": "\"I teach Nahuatl in the morning.\"",
    "example_original": "Nitlamachtia nāhuatl īcā yāhuatzinco.",
    "translation_en": "I teach Nahuatl in the morning.",
    "source_lesson_number": 6,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-6-lesson-6-tlachihualiztli-verbs/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00094": {
    "first_lesson_number": 6,
    "expected_example_original": "Niēhua Mexco. “I am from Mexico.”",
    "expected_translation_en": "\"I am from Mexico.\"",
    "example_original": "Niēhua Mexco.",
    "translation_en": "I am from Mexico.",
    "source_lesson_number": 6,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-6-lesson-6-tlachihualiztli-verbs/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00122": {
    "first_lesson_number": 8,
    "expected_example_original": "Felipe yohui mīllah huanya īchichi.",
    "expected_translation_en": "Felipe goes to the field with his dog.",
    "example_original": "Felipe yohui mīllah huanya īchichi.",
    "translation_en": "Felipe goes to the cornfield with his dog.",
    "source_lesson_number": 8,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-8-lesson-8-noyollo-possessive-markers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00126": {
    "first_lesson_number": 8,
    "expected_example_original": "María quicocōa īicxi pampa momāquilih.",
    "expected_translation_en": "María's foot hurts because she bumped it.",
    "example_original": "María quicocōa īicxi pampa momāquilih.",
    "translation_en": "María's foot hurts because she hit herself.",
    "source_lesson_number": 8,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-8-lesson-8-noyollo-possessive-markers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00131": {
    "first_lesson_number": 8,
    "expected_example_original": "Noconēhuan mohmōztlah yohuih caltlamachtiloyan.",
    "expected_translation_en": "My children go to school every day.",
    "example_original": "Noconēhuan mohmōztlah yohuih caltlamachtiloyan.",
    "translation_en": "My children go to school every day.",
    "source_lesson_number": 8,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-8-lesson-8-noyollo-possessive-markers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00132": {
    "first_lesson_number": 8,
    "expected_example_original": "Nopitzohuan quicuāh miac cīntli.",
    "expected_translation_en": "My pigs eat a lot of corn.",
    "example_original": "Nopitzohuan quicuāh miac cīntli.",
    "translation_en": "My pigs eat a lot of corn.",
    "source_lesson_number": 8,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-8-lesson-8-noyollo-possessive-markers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00133": {
    "first_lesson_number": 8,
    "expected_example_original": "2. Quēniuhqui ītōcah tlamantli tlen eltoc tlatlahco moihti?",
    "expected_translation_en": "What is the name of the thing in the middle of your face?",
    "example_original": "Quēniuhqui ītōcah tlamantli tlen eltoc tlatlahco moihti?",
    "translation_en": "What is the name of the thing in the middle of your stomach?",
    "source_lesson_number": 8,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-8-lesson-8-noyollo-possessive-markers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00134": {
    "first_lesson_number": 8,
    "expected_example_original": "1. Quēniuhqui ītōcah tlen īcā tinehnemi?",
    "expected_translation_en": "What do you walk with?",
    "example_original": "Quēniuhqui ītōcah tlen īcā tinehnemi?",
    "translation_en": "What do you walk with?",
    "source_lesson_number": 8,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-8-lesson-8-noyollo-possessive-markers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00138": {
    "first_lesson_number": 8,
    "expected_example_original": "5. Tlen itōcah tlen īcā titlacuāh?",
    "expected_translation_en": "What is the name of what you eat with?",
    "example_original": "Tlen itōcah tlen īcā titlacuāh?",
    "translation_en": "What is the name of what we eat with?",
    "source_lesson_number": 8,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-8-lesson-8-noyollo-possessive-markers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00140": {
    "first_lesson_number": 8,
    "expected_example_original": "3. Tlen ītōcah tlen eltoc īixco toquechcuayo?",
    "expected_translation_en": "What is on top of your neck?",
    "example_original": "Tlen ītōcah tlen eltoc īixco toquechcuayo?",
    "translation_en": "What is the name of what is on top of our neck?",
    "source_lesson_number": 8,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-8-lesson-8-noyollo-possessive-markers/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00144": {
    "first_lesson_number": 9,
    "expected_example_original": "ininchochohuan “their younger siblings”",
    "expected_translation_en": "\"their younger siblings\"",
    "example_original": "ininchochohuan",
    "translation_en": "their younger siblings",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00145": {
    "first_lesson_number": 9,
    "expected_example_original": "ininicnihuan “their siblings”",
    "expected_translation_en": "\"their siblings\"",
    "example_original": "ininicnihuan",
    "translation_en": "their siblings",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00146": {
    "first_lesson_number": 9,
    "expected_example_original": "ininmachicnihuan “their cousins”",
    "expected_translation_en": "\"their cousins\"",
    "example_original": "ininmachicnihuan",
    "translation_en": "their cousins",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00147": {
    "first_lesson_number": 9,
    "expected_example_original": "inintlayihuan “their uncles”",
    "expected_translation_en": "\"their uncles\"",
    "example_original": "inintlayihuan",
    "translation_en": "their uncles",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00148": {
    "first_lesson_number": 9,
    "expected_example_original": "inmochochohuan “your (plural) younger siblings”",
    "expected_translation_en": "\"your (plural) younger siblings\"",
    "example_original": "inmochochohuan",
    "translation_en": "your (plural) younger siblings",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00149": {
    "first_lesson_number": 9,
    "expected_example_original": "inmoicnihuan “you all’s siblings”",
    "expected_translation_en": "\"you all's siblings\"",
    "example_original": "inmoicnihuan",
    "translation_en": "your (plural) siblings",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00150": {
    "first_lesson_number": 9,
    "expected_example_original": "inmomachicnihuan “your (plural) cousins”",
    "expected_translation_en": "\"your (plural) cousins\"",
    "example_original": "inmomachicnihuan",
    "translation_en": "your (plural) cousins",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00151": {
    "first_lesson_number": 9,
    "expected_example_original": "inmotlayihuan “your (plural) uncles”",
    "expected_translation_en": "\"your (plural) uncles\"",
    "example_original": "inmotlayihuan",
    "translation_en": "your (plural) uncles",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00152": {
    "first_lesson_number": 9,
    "expected_example_original": "mochocho “your younger sibling”",
    "expected_translation_en": "\"your younger sibling\"",
    "example_original": "mochocho",
    "translation_en": "your younger sibling",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00153": {
    "first_lesson_number": 9,
    "expected_example_original": "momachicniuh “your cousin”",
    "expected_translation_en": "\"your cousin\"",
    "example_original": "momachicniuh",
    "translation_en": "your cousin",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00154": {
    "first_lesson_number": 9,
    "expected_example_original": "nochocho “my younger sibling”",
    "expected_translation_en": "\"my younger sibling\"",
    "example_original": "nochocho",
    "translation_en": "my younger sibling",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00156": {
    "first_lesson_number": 9,
    "expected_example_original": "Quezqui mochochohuan ticpiya?",
    "expected_translation_en": "How many younger siblings do you have?",
    "example_original": "Quezqui mochochohuan ticpiya?",
    "translation_en": "How many younger siblings do you have?",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00157": {
    "first_lesson_number": 9,
    "expected_example_original": "Quezqui momimihuan ticpiya?",
    "expected_translation_en": "How many dead relatives do you have?",
    "example_original": "Quezqui momimihuan ticpiya?",
    "translation_en": "How many older brothers do you have?",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00158": {
    "first_lesson_number": 9,
    "expected_example_original": "Quezqui mopipihuan ticpiya?",
    "expected_translation_en": "How many children do you have?",
    "example_original": "Quezqui mopipihuan ticpiya?",
    "translation_en": "How many older sisters do you have?",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00163": {
    "first_lesson_number": 9,
    "expected_example_original": "tochochohuan “our younger siblings”",
    "expected_translation_en": "\"our younger siblings\"",
    "example_original": "tochochohuan",
    "translation_en": "our younger siblings",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00164": {
    "first_lesson_number": 9,
    "expected_example_original": "toicnihuan “our siblings”",
    "expected_translation_en": "\"our siblings\"",
    "example_original": "toicnihuan",
    "translation_en": "our siblings",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00165": {
    "first_lesson_number": 9,
    "expected_example_original": "tomachicnihuan “our cousins”",
    "expected_translation_en": "\"our cousins\"",
    "example_original": "tomachicnihuan",
    "translation_en": "our cousins",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00166": {
    "first_lesson_number": 9,
    "expected_example_original": "īchocho “his/her younger sibling”",
    "expected_translation_en": "\"his/her younger sibling\"",
    "example_original": "īchocho",
    "translation_en": "his/her younger sibling",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00167": {
    "first_lesson_number": 9,
    "expected_example_original": "īicniuh “his/her sibling”",
    "expected_translation_en": "\"his/her sibling\"",
    "example_original": "īicniuh",
    "translation_en": "his/her sibling",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00168": {
    "first_lesson_number": 9,
    "expected_example_original": "īmachicniuh “his/her cousin”",
    "expected_translation_en": "\"his/her cousin\"",
    "example_original": "īmachicniuh",
    "translation_en": "his/her cousin",
    "source_lesson_number": 9,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-9-lesson-9-teixmatcacuahuitl-the-family/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00068": {
    "first_lesson_number": 5,
    "expected_example_original": "A: Na nocca nimomachtihquetl. Nimomachtia tlapōhualiztli.",
    "expected_translation_en": "A: I am also a student. I study mathematics.",
    "example_original": "Na nocca nimomachtihquetl. Nimomachtia tlapōhualiztli.",
    "translation_en": "I am still a student. I study accounting.",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00069": {
    "first_lesson_number": 5,
    "expected_example_original": "A: Piyali Catalina, ¿tlen titequiti ta?",
    "expected_translation_en": "A: Hello Catalina, what do you do for work?",
    "example_original": "Piyali Catalina, ¿tlen titequiti ta?",
    "translation_en": "Hello Catalina, what do you do for work?",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00072": {
    "first_lesson_number": 5,
    "expected_example_original": "B: Nitlamachtia nāhuatl. ¿Huan ta?",
    "expected_translation_en": "B: I teach Nahuatl. And you?",
    "example_original": "Nitlamachtia nāhuatl. ¿Huan ta?",
    "translation_en": "I teach Nahuatl. And you?",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00074": {
    "first_lesson_number": 5,
    "expected_example_original": "inmomachtianih “you all are students”",
    "expected_translation_en": "\"you all are students\"",
    "example_original": "inmomachtianih",
    "translation_en": "you all are students",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00075": {
    "first_lesson_number": 5,
    "expected_example_original": "intlachpānanih “you all are street sweepers”",
    "expected_translation_en": "\"you all are street sweepers\"",
    "example_original": "intlachpānanih",
    "translation_en": "you all are street sweepers",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00076": {
    "first_lesson_number": 5,
    "expected_example_original": "momachtianih “they are students”",
    "expected_translation_en": "\"they are students\"",
    "example_original": "momachtianih",
    "translation_en": "they are students",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00077": {
    "first_lesson_number": 5,
    "expected_example_original": "momachtihquetl “he/she is a student”",
    "expected_translation_en": "\"he/she is a student\"",
    "example_original": "momachtihquetl",
    "translation_en": "he/she is a student",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00078": {
    "first_lesson_number": 5,
    "expected_example_original": "nimomachtihquetl “I am a student”",
    "expected_translation_en": "\"I am a student\"",
    "example_original": "nimomachtihquetl",
    "translation_en": "I am a student",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00079": {
    "first_lesson_number": 5,
    "expected_example_original": "nitlachpānquetl “I am a street sweeper”",
    "expected_translation_en": "\"I am a street sweeper\"",
    "example_original": "nitlachpānquetl",
    "translation_en": "I am a street sweeper",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00080": {
    "first_lesson_number": 5,
    "expected_example_original": "timomachtianih “we are students”",
    "expected_translation_en": "\"we are students\"",
    "example_original": "timomachtianih",
    "translation_en": "we are students",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00081": {
    "first_lesson_number": 5,
    "expected_example_original": "timomachtihquetl “you are a student”",
    "expected_translation_en": "\"you are a student\"",
    "example_original": "timomachtihquetl",
    "translation_en": "you are a student",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00082": {
    "first_lesson_number": 5,
    "expected_example_original": "titlachpānanih “we are street sweepers”",
    "expected_translation_en": "\"we are street sweepers\"",
    "example_original": "titlachpānanih",
    "translation_en": "we are street sweepers",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00083": {
    "first_lesson_number": 5,
    "expected_example_original": "titlachpānquetl “you are a street sweeper”",
    "expected_translation_en": "\"you are a street sweeper\"",
    "example_original": "titlachpānquetl",
    "translation_en": "you are a street sweeper",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00085": {
    "first_lesson_number": 5,
    "expected_example_original": "tlachpānanih “they are street sweepers”",
    "expected_translation_en": "\"they are street sweepers\"",
    "example_original": "tlachpānanih",
    "translation_en": "they are street sweepers",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00086": {
    "first_lesson_number": 5,
    "expected_example_original": "tlachpānquetl “he/she is a street sweeper”",
    "expected_translation_en": "\"he/she is a street sweeper\"",
    "example_original": "tlachpānquetl",
    "translation_en": "he/she is a street sweeper",
    "source_lesson_number": 5,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-5-lesson-5-cehcen-inintequiuh-the-professions/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00106": {
    "first_lesson_number": 7,
    "expected_example_original": "nelyāhuatzinco “very early”",
    "expected_translation_en": "\"very early\"",
    "example_original": "nelyāhuatzinco",
    "translation_en": "very early",
    "source_lesson_number": 7,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-7-lesson-7-queniuhqui-moxeloa-tonatiuh-how-to-break-up-the-day/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00114": {
    "first_lesson_number": 7,
    "expected_example_original": "tlapoyauhcan “it is evening”",
    "expected_translation_en": "\"it is evening\"",
    "example_original": "tlapoyauhcan",
    "translation_en": "it is evening",
    "source_lesson_number": 7,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-7-lesson-7-queniuhqui-moxeloa-tonatiuh-how-to-break-up-the-day/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00116": {
    "first_lesson_number": 7,
    "expected_example_original": "Tlen cāhuitl mēhua Juana?",
    "expected_translation_en": "What time does Juana get up?",
    "example_original": "Tlen cāhuitl mēhua Juana?",
    "translation_en": "What time does Juana get up?",
    "source_lesson_number": 7,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-7-lesson-7-queniuhqui-moxeloa-tonatiuh-how-to-break-up-the-day/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00118": {
    "first_lesson_number": 7,
    "expected_example_original": "Tlen quichīhua Juana achtohui?",
    "expected_translation_en": "What does Juana do first?",
    "example_original": "Tlen quichīhua Juana achtohui?",
    "translation_en": "What does Juana do first?",
    "source_lesson_number": 7,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-7-lesson-7-queniuhqui-moxeloa-tonatiuh-how-to-break-up-the-day/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00119": {
    "first_lesson_number": 7,
    "expected_example_original": "Tlen quichīhua Ramón para quimatiz tlen cāhuitl?",
    "expected_translation_en": "What does Ramón do to know what time it is?",
    "example_original": "Tlen quichīhua Ramón para quimatiz tlen cāhuitl?",
    "translation_en": "What does Ramón do to know what time it is?",
    "source_lesson_number": 7,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-7-lesson-7-queniuhqui-moxeloa-tonatiuh-how-to-break-up-the-day/",
    "review_status": "source-backed-example"
  },
  "FCN-CP-00120": {
    "first_lesson_number": 7,
    "expected_example_original": "Tlen quiitta Ramón quēmman quinequi mocuapaz īchān?",
    "expected_translation_en": "What does Ramón see when he wants to go home?",
    "example_original": "Tlen quiitta Ramón quēmman quinequi mocuapaz īchān?",
    "translation_en": "What does Ramón see when he wants to go home?",
    "source_lesson_number": 7,
    "source_url": "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-7-lesson-7-queniuhqui-moxeloa-tonatiuh-how-to-break-up-the-day/",
    "review_status": "source-backed-example"
  }
};

export function reviewConstruction<
  T extends {
    priority_id: number | string;
    first_lesson_number: number;
    example_original: string;
    translation_en: string | null;
  },
>(row: T): T | null {
  const review = CONSTRUCTION_REVIEWS[String(row.priority_id)];
  if (
    !review ||
    row.first_lesson_number < 1 ||
    row.first_lesson_number > 9 ||
    review.first_lesson_number !== row.first_lesson_number ||
    review.expected_example_original !== row.example_original ||
    review.expected_translation_en !== row.translation_en
  ) {
    return null;
  }
  return {
    ...row,
    example_original: review.example_original,
    translation_en: review.translation_en,
    source_lesson_number: review.source_lesson_number,
    source_url: review.source_url,
    review_status: review.review_status,
  };
}
