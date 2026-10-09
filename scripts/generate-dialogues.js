// Generates A/B dialogues for the 28 units that have no lesson_dialogues data.
// Uses EHN vocabulary, grammar patterns, and the 4 existing real dialogues as models.
// Run once: node scripts/generate-dialogues.js

const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");

const EHN_LINE_REJECTIONS = [
  {
    reason: "Classical ō-augmented past",
    pattern: /(^|[^\p{L}])ō(?:ni|ti|mo|nech|nēch|mits|mitz|tech|mech|qui|ki|k|tla|an|in)[\p{L}]/iu,
  },
  { reason: "declarative āmo", pattern: /(^|[\s"“¡¿(])[Āā]mo\b(?!\s+xi)/u },
  { reason: "Classical aquin", pattern: /\b[Aa]quin\b/u },
  { reason: "Classical intla", pattern: /\bintla\b/iu },
  { reason: "Classical nicah/ticah", pattern: /\bnicah\b|\bticah\b/u },
  { reason: "non-EHN second-person plural marker", pattern: /anmo|amech/iu },
  { reason: "malformed prohibitive", pattern: /\bximolinquih\b/iu },
];

function getEhnLineRejection(text) {
  if (typeof text !== "string" || text.trim().length === 0) return "empty line";
  return EHN_LINE_REJECTIONS.find(({ pattern }) => pattern.test(text))?.reason ?? null;
}

function validateEhnLine(text) {
  return getEhnLineRejection(text) === null;
}

module.exports = { validateEhnLine };

// ── Dialogue data ─────────────────────────────────────────────────────────────
// Each entry: { unitId, lines: [{ speaker, ehn, en }] }
// Synthetic rows are selected by attestation tier, independently of spelling.
// Content lint catches a few known errors; passing it is not speaker review.

const dialogues = [
  {
    unitId: "FCN-LSN-0010", // Unit 1 — The Alphabet
    lines: [
      { s: "A", ehn: "Piyālli! ¿Titlahtōa nāhuatl?", en: "Hello! Do you speak Nahuatl?" },
      { s: "B", ehn: "Ayamo. Āchtopa nimomachtia.", en: "Not yet. I'm beginning to learn." },
      { s: "A", ehn: "Cuālli. ¿Ācquiya mitzmachtia nāhuatl?", en: "Good. Who teaches you Nahuatl?" },
      { s: "B", ehn: "Tlamachtihquetl nicān pan caltlamachticān. Cuālli tlahtoa nāhuatl.", en: "The teacher here at school. The teacher speaks Nahuatl well." },
    ],
  },
  {
    unitId: "FCN-LSN-0011", // Unit 2 — Questions
    lines: [
      { s: "A", ehn: "¿Tlen ticchihua āxcan?", en: "What are you doing today?" },
      { s: "B", ehn: "Āya nimomachtia. ¿Cāmpa tiyāuh ta?", en: "Not yet studying. Where are you going?" },
      { s: "A", ehn: "Niyāuh niquitta nocniuh. ¿Quēmman tiyāuh ta?", en: "I'm going to see my friend. When are you going?" },
      { s: "B", ehn: "Āman niyāuh, pampa nicnequi niccuāz āchtopa.", en: "I'm going now, because I want to eat first." },
    ],
  },
  {
    unitId: "FCN-LSN-0013", // Unit 4 — Colors and Numbers
    lines: [
      { s: "A", ehn: "¿Quēzqui tōmātl ticnequi?", en: "How many tomatoes do you want?" },
      { s: "B", ehn: "Nicnequi ōme tōmātl huan cē chilli.", en: "I want two tomatoes and one chili." },
      { s: "A", ehn: "¿Huan in kōstik chilli, quēzqui?", en: "And the yellow chili, how many?" },
      { s: "B", ehn: "Nāhui kōstik chilli, tlazcāmati.", en: "Four yellow chilies, thank you." },
    ],
  },
  {
    unitId: "FCN-LSN-0016", // Unit 6 — Intransitive Verbs
    lines: [
      { s: "A", ehn: "¿Cāmpa tiyāuh?", en: "Where are you going?" },
      { s: "B", ehn: "Niyāuh tiānquiz. ¿Huan ta, tiyāuh?", en: "I'm going to the market. And you, are you going?" },
      { s: "A", ehn: "Axcanah, āxcan ninēhnemi pan āltepētl. ¿Quēmman tihuāllāz?", en: "No, today I'm walking around town. When will you come back?" },
      { s: "B", ehn: "Tiotlac nihuāllāz. Cuālli ximopāquilti!", en: "I'll come back in the evening. Have a good time!" },
    ],
  },
  {
    unitId: "FCN-LSN-0017", // Unit 7 — Dividing up the day
    lines: [
      { s: "A", ehn: "¿Tlen ticchihua in īhnalpa?", en: "What do you do in the morning?" },
      { s: "B", ehn: "Īhnalpa nicchihua notequi. ¿Huan tiotlac?", en: "In the morning I do my work. And in the evening?" },
      { s: "A", ehn: "Tiotlac nicochi. Cuālli in tōnalli āxcan.", en: "In the evening I sleep. It's a good day today." },
      { s: "B", ehn: "Quēna, in tōnatiuh cuālli. Tlazcāmati.", en: "Yes, the sun is good. Thank you." },
    ],
  },
  {
    unitId: "FCN-LSN-0018", // Unit 8 — Possessive markers
    lines: [
      { s: "A", ehn: "¿Tlein nopa nicān?", en: "What is that here?" },
      { s: "B", ehn: "Nopa noaxca, nicān niccāhua.", en: "That is mine; I leave it here." },
      { s: "A", ehn: "¿Huan neca, iaxca ācquiya?", en: "And that over there, whose is it?" },
      { s: "B", ehn: "Neca iaxca nocniuh. Ax toaxca.", en: "That belongs to my friend. It is not ours." },
    ],
  },
  {
    unitId: "FCN-LSN-0019", // Unit 9 — The Family
    lines: [
      { s: "A", ehn: "¿Ticpiya moconēhuan?", en: "Do you have children?" },
      { s: "B", ehn: "Quēna, nicpiya ēyi noconēhuan. ¿Huan ta?", en: "Yes, I have three children. And you?" },
      { s: "A", ehn: "Ayamo. Zan nicpiya nomachconēhuan.", en: "Not yet. I only have nieces and nephews." },
      { s: "B", ehn: "Cuālli. Nototatah huan notonanān nicān itztoqueh.", en: "Good. My grandfather and grandmother are here." },
    ],
  },
  {
    unitId: "FCN-LSN-0020", // Unit 10 — My Appearance
    lines: [
      { s: "A", ehn: "¿Quēniuhqui tiitztoc āxcan?", en: "How are you feeling today?" },
      { s: "B", ehn: "Cuālli niitztoc, tlazcāmati. Ax nicpiya cocoliztli.", en: "I'm well, thank you. I don't have any illness." },
      { s: "A", ehn: "Quēna, cuālli tiitztoc.", en: "Yes, you are well." },
      { s: "B", ehn: "Tlazcāmati. Na nocca ninēmi cuālli.", en: "Thank you. I also live well." },
    ],
  },
  {
    unitId: "FCN-LSN-0022", // Unit 12 — Future tense and indefinite verbs
    lines: [
      { s: "A", ehn: "¿Tlen ticchīhuaz mōztla?", en: "What will you do tomorrow?" },
      { s: "B", ehn: "Mōztla nitlahtōz nāhuatl īca nocihuāuh.", en: "Tomorrow I will speak Nahuatl with my wife." },
      { s: "A", ehn: "Cuālli. Na nitlahcuilōz pan caltlamachticān.", en: "Good. I will write at school." },
      { s: "B", ehn: "¿Huan ticnequi timomachtiz nāhuatl?", en: "And do you want to learn Nahuatl?" },
      { s: "A", ehn: "Quēna, tlāhuēl nicnequi nimomachtiz nāhuatl.", en: "Yes, I really want to learn Nahuatl." },
    ],
  },
  {
    unitId: "FCN-LSN-0023", // Unit 13 — Verbs with specific object
    lines: [
      { s: "A", ehn: "¿Tlen ticchihua nicān?", en: "What are you making here?" },
      { s: "B", ehn: "Nitlaxcaloa. ¿Huan ta, tlen ticcua?", en: "I'm making tortillas. And you, what are you eating?" },
      { s: "A", ehn: "Niccua tōmātl huan etl. ¿Huan ta?", en: "I'm eating tomato and bean. And you?" },
      { s: "B", ehn: "Niātli, ax nitlacua. Nicnequi niccuāz tamalli āxcan.", en: "I'm drinking water, not eating. I want to eat tamales today." },
    ],
  },
  {
    unitId: "FCN-LSN-0024", // Unit 14 — Past Tense Verbs Part 1
    lines: [
      { s: "A", ehn: "¿Ticpatlac motequi yalhua?", en: "Did you change your work yesterday?" },
      { s: "B", ehn: "Quēna, nicpatlac. ¿Huan ta?", en: "Yes, I changed it. And you?" },
      { s: "A", ehn: "Na axcanah nicpatlac. Zan nichōcac.", en: "I didn't change it. I only cried." },
      { s: "B", ehn: "Āmo xichoca. Āxcan cuālli.", en: "Don't cry. It's fine now." },
    ],
  },
  {
    unitId: "FCN-LSN-0025", // Unit 15 — Past Tense Verbs Part 2
    lines: [
      { s: "A", ehn: "¿Ticpixqui tomi yalhua?", en: "Did you have money yesterday?" },
      { s: "B", ehn: "Quēna, nicpixqui tomi. ¿Huan ta?", en: "Yes, I had money. And you?" },
      { s: "A", ehn: "Na ninehnenqui pan āltepētl.", en: "I walked through town." },
      { s: "B", ehn: "Cuālli. Na nocca nitizqui.", en: "Good. I also ground corn." },
    ],
  },
  {
    unitId: "FCN-LSN-0026", // Unit 16 — Past Tense Verbs Part 3
    lines: [
      { s: "A", ehn: "¿Titlacuāhqui yalhua?", en: "Did you eat yesterday?" },
      { s: "B", ehn: "Quēna, nitlacuāhqui pan nochān.", en: "Yes, I ate at home." },
      { s: "A", ehn: "¿Huan ticmachtihqui nāhuatl?", en: "And did you teach Nahuatl?" },
      { s: "B", ehn: "Quēna, nicmachtihqui nāhuatl.", en: "Yes, I taught Nahuatl." },
    ],
  },
  {
    unitId: "FCN-LSN-0027", // Unit 17 — I Sit in the Chair
    lines: [
      { s: "A", ehn: "¿Tlen onca pan mesa?", en: "What is on the table?" },
      { s: "B", ehn: "Onca cē taza huan ōme comitl.", en: "There is one cup and two pots." },
      { s: "A", ehn: "¿Ācquiya mocēhuiz pan cuaciyah?", en: "Who will sit in the chair?" },
      { s: "B", ehn: "Nimocēhuiz nicān. Xicalaqui.", en: "I will sit here. Come in." },
    ],
  },
  {
    unitId: "FCN-LSN-0028", // Unit 18 — What I Like and Do Not Like
    lines: [
      { s: "A", ehn: "¿Tlen ticnequi ticcuāz?", en: "What do you want to eat?" },
      { s: "B", ehn: "Nicnequi niccuāz yēlotl huan camohtli. ¡Huelic!", en: "I want to eat corn and sweet potato. Delicious!" },
      { s: "A", ehn: "¿Ticnequi cōcoc o xococ?", en: "Do you want spicy or sour?" },
      { s: "B", ehn: "Axcanah xococ, nicnequi cōcoc. Tlāhuēl nicnequi cōcoc.", en: "Not sour — I want spicy. I really want spicy." },
    ],
  },
  {
    unitId: "FCN-LSN-0030", // Unit 20 — Grammar of -pil and -tzin
    lines: [
      { s: "A", ehn: "¿Ācquiya in tlacātzin nicān?", en: "Who is the gentleman here?" },
      { s: "B", ehn: "In tlacātzin notātatzin. Xipano, ximocēhui.", en: "The gentleman is my father. Come in, sit down." },
      { s: "A", ehn: "¿Huan in cihuātzin, ācquiya?", en: "And the lady, who is she?" },
      { s: "B", ehn: "In cihuātzin nonantzin. Tlazcāmati tihuāllahqui.", en: "The lady is my mother. Thank you for coming." },
    ],
  },
  {
    unitId: "FCN-LSN-0031", // Unit 21 — What We Have in the Field
    lines: [
      { s: "A", ehn: "¿Tlen onca pan tomīlli?", en: "What is in our field?" },
      { s: "B", ehn: "Onca elotl huan ōlōtl. Cuālli in tōnalli āxcan.", en: "There are ears of corn and corncobs. Good day today." },
      { s: "A", ehn: "¿Huan in chichi, cāmpa itztoc?", en: "And the dog, where is it?" },
      { s: "B", ehn: "In chichi itztoc nopā, quitemoa in piyo.", en: "The dog is over there, looking for the chicken." },
    ],
  },
  {
    unitId: "FCN-LSN-0032", // Unit 22 — Our Cornfield and Our Food
    lines: [
      { s: "A", ehn: "¿Tlen ticchihua āxcan?", en: "What are you making today?" },
      { s: "B", ehn: "Nictamalohua. Nictemoa iztatl huan chilli.", en: "I'm making tamales. I'm looking for salt and chili." },
      { s: "A", ehn: "¿Nicān onca āhuacatl?", en: "Is there avocado here?" },
      { s: "B", ehn: "Quēna, huan onca xōnacatl. Cuālli nitlacuāz āxcan.", en: "Yes, and there is onion. I'll eat well today." },
    ],
  },
  {
    unitId: "FCN-LSN-0033", // Unit 23 — What is Inside the House
    lines: [
      { s: "A", ehn: "¿Tlen onca calihtic?", en: "What is inside the house?" },
      { s: "B", ehn: "Onca cē metlatl huan ōme libro. ¿Tlen tictemoa?", en: "There's a metate and two books. What are you looking for?" },
      { s: "A", ehn: "Nictemoa in pāhtli. ¿Cāmpa onca?", en: "I'm looking for the medicine. Where is it?" },
      { s: "B", ehn: "In pāhtli onca nicān, calihtic. Niquitta.", en: "The medicine is here, in the house. I see it." },
    ],
  },
  {
    unitId: "FCN-LSN-0034", // Unit 24 — I Had Gone to the City Part 1
    lines: [
      { s: "A", ehn: "¿Cāmpa tiyāhqui yalhua?", en: "Where did you go yesterday?" },
      { s: "B", ehn: "Niyāhqui Mexihco. Niquittac in āltepētl huan tiānquiz.", en: "I went to Mexico. I saw the city and the market." },
      { s: "A", ehn: "¿Huan tiquittac escuela?", en: "And did you see the school?" },
      { s: "B", ehn: "Quēna, huan niquittac in tiopa. Cuālli āltepētl.", en: "Yes, and I saw the church. A fine city." }, // TODO(EHN-verify): niquittac
    ],
  },
  {
    unitId: "FCN-LSN-0035", // Unit 25 — I Had Gone to the City Part 2
    lines: [
      { s: "A", ehn: "¿Cuālli timomachtihqui pan āltepētl?", en: "Did you learn well in the city?" }, // TODO(EHN-verify): timomachtihqui
      { s: "B", ehn: "Quēna, zan axcanah nicpixqui notiempōs. Huēhca niyāhqui.", en: "Yes, but I didn't have enough time. I went far away." },
      { s: "A", ehn: "¿Nōhquiya tiquittac escuela?", en: "Did you also see the school?" }, // TODO(EHN-verify): tiquittac
      { s: "B", ehn: "Quēna, hasta huēhca niquittac. Cuālli āltepētl.", en: "Yes, I saw it all the way over there. A fine city." }, // TODO(EHN-verify): niquittac
    ],
  },
  {
    unitId: "FCN-LSN-0036", // Unit 26 — I Came to Buy a Tortilla Napkin
    lines: [
      { s: "A", ehn: "¿Tlen ticcōhuaz nicān tiānquiz?", en: "What will you buy here at the market?" },
      { s: "B", ehn: "Niccōhuaz cē pantzi huan ōme lalax. ¿Quēzqui tomi?", en: "I'll buy one bread and two oranges. How much money?" },
      { s: "A", ehn: "In pantzi, ōme pesos. In lalax, cē peso achiyoc.", en: "The bread is two pesos. The oranges are one peso more." },
      { s: "B", ehn: "Cuālli, niccui. Tlazcāmati.", en: "OK, I'll take them. Thank you." },
    ],
  },
  {
    unitId: "FCN-LSN-0037", // Unit 27 — It's market day today!
    lines: [
      { s: "A", ehn: "¡Āxcan tiānquiz! ¿Tlen ticcōhuaz?", en: "It's market day! What will you buy?" },
      { s: "B", ehn: "Niccōhuaz nākatl huan michi. ¿Huan ta?", en: "I'll buy meat and fish. And you?" },
      { s: "A", ehn: "Na niccōhuaz tzopelatl huan matzāhtli.", en: "I'll buy soda and pineapple." },
      { s: "B", ehn: "Cuālli! Na nocca nicnequi cē café. Ximopāquilti!", en: "Great! I also want a coffee. Have a good time!" },
    ],
  },
  {
    unitId: "FCN-LSN-0038", // Unit 28 — I Was Passing By Your House
    lines: [
      { s: "A", ehn: "Piyālli! Nipanoyaya mochān.", en: "Hello! I was passing by your house." },
      { s: "B", ehn: "Quēna, xipano!", en: "Yes! Come in!" },
      { s: "A", ehn: "Tlazcāmati. ¿Cuālli tiitztoc āxcan?", en: "Thank you. Are you well today?" },
      { s: "B", ehn: "Quēna, cuālli niitztoc. Ximocēhui.", en: "Yes, I'm well. Sit down." },
    ],
  },
  {
    unitId: "FCN-LSN-0039", // Unit 29 — What Illnesses Do You Know?
    lines: [
      { s: "A", ehn: "¿Quēniuhqui tiitztoc?", en: "How are you feeling?" },
      { s: "B", ehn: "Axcanah cuālli niitztoc. Nicpiya cecuīliztli.", en: "I'm not well. I have a cold." },
      { s: "A", ehn: "¿Ticnequi pāhtli?", en: "Do you want medicine?" },
      { s: "B", ehn: "Quēna. Nicnequi pāhtli āxcan.", en: "Yes. I want medicine today." },
    ],
  },
  {
    unitId: "FCN-LSN-0040", // Unit 30 — The Conditional, Part 1
    lines: [
      { s: "A", ehn: "¿Tlen ticcōhuazquia?", en: "What would you buy?" },
      { s: "B", ehn: "Niccōhuazquia nācatl. ¿Huan ta?", en: "I would buy meat. And you?" },
      { s: "A", ehn: "Na niccōhuazquia etl.", en: "I would buy beans." },
      { s: "B", ehn: "Quēna, niccōhuazquia etl.", en: "Yes, I would buy beans." },
    ],
  },
  {
    unitId: "FCN-LSN-0041", // Unit 31 — Cleansing ceremonies / Conditional Part 2
    lines: [
      { s: "A", ehn: "¿Ticōnitozquia ātl?", en: "Would you have drunk water?" },
      { s: "B", ehn: "Quēna, nicōnitozquia ātl.", en: "Yes, I would have drunk water." },
      { s: "A", ehn: "¿Huan ticōnitozquia cafen?", en: "And would you have drunk coffee?" },
      { s: "B", ehn: "Axcanah. Nicōnitozquia ātl.", en: "No. I would have drunk water." },
    ],
  },
  {
    unitId: "FCN-LSN-0042", // Unit 32 — Tē- and tla- object markers
    lines: [
      { s: "A", ehn: "¿Ācquiya tēmachtia nicān pan caltlamachticān?", en: "Who teaches people here at school?" },
      { s: "B", ehn: "Cē cihuātl tēmachtia. Tlāhuēl cuālli tlahtōa nāhuatl.", en: "A woman teaches. She speaks Nahuatl very well." },
      { s: "A", ehn: "¿Huan ta, ticnequi titēmachtiz?", en: "And you, do you want to teach people?" },
      { s: "B", ehn: "Quēna, nicnequi nitemachtiz. Cuālli notequi.", en: "Yes, I want to teach people. It's good work." },
    ],
  },
];

// ── Insert ────────────────────────────────────────────────────────────────────

function main() {
  const DB_PATH = resolveDbPath();
  const db = new Database(DB_PATH);

  const insert = db.prepare(`
    INSERT INTO lesson_dialogues
      (lesson_dialogue_id, lesson_unit_id, dialogue_order, speaker_label,
       utterance_original, utterance_normalized, translation_en, attestation_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'AI_generated')
    ON CONFLICT(lesson_dialogue_id) DO UPDATE SET
      lesson_unit_id = excluded.lesson_unit_id,
      dialogue_order = excluded.dialogue_order,
      speaker_label = excluded.speaker_label,
      utterance_original = excluded.utterance_original,
      utterance_normalized = excluded.utterance_normalized,
      translation_en = excluded.translation_en,
      attestation_tier = excluded.attestation_tier
  `);

  let idCounter = 216; // next after FCN-LDG-000215
  let totalInserted = 0;

  const run = db.transaction(() => {
    for (const unit of dialogues) {
      for (let i = 0; i < unit.lines.length; i++) {
        const line = unit.lines[i];
        const rejection = getEhnLineRejection(line.ehn);
        if (rejection) {
          console.warn(`Skipped ${unit.unitId} line ${i + 1}: ${rejection}: ${line.ehn}`);
          continue;
        }
        const id = `FCN-LDG-${String(idCounter).padStart(6, "0")}`;
        insert.run(id, unit.unitId, i + 1, line.s, line.ehn, line.ehn, line.en);
        idCounter++;
        totalInserted++;
      }
    }
  });

  run();
  console.log(`Upserted ${totalInserted} dialogue lines across ${dialogues.length} units.`);
  console.log(`IDs: FCN-LDG-000216 → FCN-LDG-${String(idCounter - 1).padStart(6, "0")}`);
  db.close();
}

if (require.main === module) {
  main();
}
