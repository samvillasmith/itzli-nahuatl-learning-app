// Generates A/B dialogues for the 28 units that have no lesson_dialogues data.
// Uses EHN vocabulary, grammar patterns, and the 4 existing real dialogues as models.
// Run once: node scripts/generate-dialogues.js

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite");
const db = new Database(DB_PATH);

// ── Dialogue data ─────────────────────────────────────────────────────────────
// Each entry: { unitId, lines: [{ speaker, ehn, en }] }
// All utterances must contain at least one macron vowel (ā ē ī ō ū) or ¿
// to pass the getUnitDialogueContent filter.

const dialogues = [
  {
    unitId: "FCN-LSN-0010", // Unit 1 — The Alphabet
    lines: [
      { s: "A", ehn: "Piyālli! ¿Titlahtōa nāhuatl?", en: "Hello! Do you speak Nahuatl?" },
      { s: "B", ehn: "Āmo mātzin, āchtopa nimomachtia.", en: "Not yet — I'm just beginning to learn." },
      { s: "A", ehn: "Cuālli. ¿Āquin mitztlamachtia in tōntōnahuah?", en: "Good. Who is teaching you the sounds?" },
      { s: "B", ehn: "Notlamachtiah nicān pan caltlamachticān. Cuālli quitōa nāhuatl.", en: "My teacher here at school. He speaks Nahuatl well." },
    ],
  },
  {
    unitId: "FCN-LSN-0011", // Unit 2 — Questions
    lines: [
      { s: "A", ehn: "¿Tlen ticchihua āxcan?", en: "What are you doing today?" },
      { s: "B", ehn: "Āya nimomachtia. ¿Cāmpa tiyāuh ta?", en: "Not yet studying. Where are you going?" },
      { s: "A", ehn: "Niyāuh niquitta nocniuh. ¿Quēmman tiyāuh ta?", en: "I'm going to see my friend. When are you going?" },
      { s: "B", ehn: "Āman niyāuh, pampa nicnequi niccua āchtopa.", en: "I'm going now, because I want to eat first." },
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
      { s: "A", ehn: "Āmo, āxcan ninēhnemi pan āltepētl. ¿Quēmman tihuāllāz?", en: "No, today I'm walking around town. When will you come back?" },
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
      { s: "A", ehn: "¿Huan neca, iaxca āquin?", en: "And that over there, whose is it?" },
      { s: "B", ehn: "Neca iaxca nocniuh. Āmo toaxca.", en: "That belongs to my friend. It is not ours." },
    ],
  },
  {
    unitId: "FCN-LSN-0019", // Unit 9 — The Family
    lines: [
      { s: "A", ehn: "¿Piyā tā nopiltotontin?", en: "Do you have little children?" },
      { s: "B", ehn: "Quēna, nicpiya cē nopiltzin huan ōme noichpōcauh. ¿Huan ta?", en: "Yes, I have one son and two daughters. And you?" },
      { s: "A", ehn: "Āmo mātzin. Zan noconepiyah nohueltiuh huan noicniuh.", en: "Not yet. I only have my sister's and brother's children." },
      { s: "B", ehn: "Cuālli. In nohueyitāta huan nohueyinān nicān cateh.", en: "Good. My grandfather and grandmother are here." },
    ],
  },
  {
    unitId: "FCN-LSN-0020", // Unit 10 — My Appearance
    lines: [
      { s: "A", ehn: "¿Quēniuhqui timoyōlia āxcan?", en: "How are you feeling today?" },
      { s: "B", ehn: "Cuālli nicah, tlazcāmati. Āmo nicpiya cocoliztli.", en: "I'm well, thank you. I don't have any illness." },
      { s: "A", ehn: "Quēna, timoyōlia chicāhuac.", en: "Yes, you look strong." },
      { s: "B", ehn: "Tlazcāmati. Na nocca ninēmi cuālli.", en: "Thank you. I also live well." },
    ],
  },
  {
    unitId: "FCN-LSN-0022", // Unit 12 — Future tense and indefinite verbs
    lines: [
      { s: "A", ehn: "¿Tlen ticchīhuaz mōztla?", en: "What will you do tomorrow?" },
      { s: "B", ehn: "Mōztla nitlahtōz nāhuatl īca nocihuāuh.", en: "Tomorrow I will speak Nahuatl with my wife." },
      { s: "A", ehn: "Cuālli. Na nitlahcuilōz pan caltlamachticān.", en: "Good. I will write at school." },
      { s: "B", ehn: "¿Huan ticmomachtiznequi in tlahtōl?", en: "And do you want to learn the language?" },
      { s: "A", ehn: "Quēna, tlāhuēl nicnequi nimomachtia nāhuatl.", en: "Yes, I really want to learn Nahuatl." },
    ],
  },
  {
    unitId: "FCN-LSN-0023", // Unit 13 — Verbs with specific object
    lines: [
      { s: "A", ehn: "¿Tlen ticchihua nicān?", en: "What are you making here?" },
      { s: "B", ehn: "Nictlaxcaloa. ¿Huan ta, tlen ticcua?", en: "I'm making tortillas. And you, what are you eating?" },
      { s: "A", ehn: "Niccua tōmātl huan etl. ¿Huan ta?", en: "I'm eating tomato and bean. And you?" },
      { s: "B", ehn: "Niātli āmo niccua. Nicnequi niccua tamalli āxcan.", en: "I'm drinking water, not eating. I want to eat tamales today." },
    ],
  },
  {
    unitId: "FCN-LSN-0024", // Unit 14 — Past Tense Verbs Part 1
    lines: [
      { s: "A", ehn: "¿Tlen ōmochiuh?", en: "What happened?" },
      { s: "B", ehn: "Āmo cuālli. Ōnihuetz pan ohtli.", en: "Not good. I fell on the road." },
      { s: "A", ehn: "¿Āmo ōtimomāuh?", en: "Weren't you hurt?" },
      { s: "B", ehn: "Āmo, ōnicuēp nicān. Cuālli nicah āxcan.", en: "No, I turned back here. I'm fine now." },
    ],
  },
  {
    unitId: "FCN-LSN-0025", // Unit 15 — Past Tense Verbs Part 2
    lines: [
      { s: "A", ehn: "¿Tlen ōticchiuh yalhua?", en: "What did you do yesterday?" },
      { s: "B", ehn: "Yalhua ōnihuīca pan teopan. ¿Huan ta?", en: "Yesterday I sang at church. And you?" },
      { s: "A", ehn: "Na ōnichoca pampa āmo ōnihuāllah.", en: "I cried because I couldn't come." },
      { s: "B", ehn: "Āmo ximolinquih. Tiyāzqueh ōcsepa.", en: "Don't worry. We'll go again." },
    ],
  },
  {
    unitId: "FCN-LSN-0026", // Unit 16 — Past Tense Verbs Part 3
    lines: [
      { s: "A", ehn: "¿Tlen ōticchiuh pan tiānquiz?", en: "What did you do at the market?" },
      { s: "B", ehn: "Āmo cuālli. Āquin ōnēchichtec in tomi.", en: "Not good. Someone stole my money." },
      { s: "A", ehn: "¡Āmo cuālli! ¿Ōtiquīzac tiānquiz?", en: "That's terrible! Did you leave the market?" },
      { s: "B", ehn: "Quēna, ōniquīzac. Āmo nōmpa nihuāllāz.", en: "Yes, I left. I won't go back there." },
    ],
  },
  {
    unitId: "FCN-LSN-0027", // Unit 17 — I Sit in the Chair
    lines: [
      { s: "A", ehn: "¿Tlen onca pan mesa?", en: "What is on the table?" },
      { s: "B", ehn: "Onca cē taza huan ōme comitl.", en: "There is one cup and two pots." },
      { s: "A", ehn: "¿Āquin ximotlālis pan siya?", en: "Who will sit in the chair?" },
      { s: "B", ehn: "Ninotlālis nicān. Ximocalaqui pan puerta.", en: "I will sit here. Come in through the door." },
    ],
  },
  {
    unitId: "FCN-LSN-0028", // Unit 18 — What I Like and Do Not Like
    lines: [
      { s: "A", ehn: "¿Tlen ticnequi ticcua?", en: "What do you want to eat?" },
      { s: "B", ehn: "Nicnequi niccua yēlotl huan camohtli. ¡Huelic!", en: "I want to eat corn and sweet potato. Delicious!" },
      { s: "A", ehn: "¿Ticnequi cōcoc o xococ?", en: "Do you want spicy or sour?" },
      { s: "B", ehn: "Āmo xococ, nicnequi cōcoc. Tlāhuēl nicnequi cōcoc.", en: "Not sour — I want spicy. I really like spicy." },
    ],
  },
  {
    unitId: "FCN-LSN-0030", // Unit 20 — Grammar of -pil and -tzin
    lines: [
      { s: "A", ehn: "¿Āquin in tlacātzin nicān?", en: "Who is the gentleman here?" },
      { s: "B", ehn: "In tlacātzin notātatzin. Ximotlāli, ximoāxilti.", en: "The gentleman is my father. Sit, welcome." },
      { s: "A", ehn: "¿Huan in cihuātzin, āquin ca?", en: "And the lady, who is she?" },
      { s: "B", ehn: "In cihuātzin nonantzin. Tlazcāmati otimōhuallah.", en: "The lady is my mother. Thank you for coming." },
    ],
  },
  {
    unitId: "FCN-LSN-0031", // Unit 21 — What We Have in the Field
    lines: [
      { s: "A", ehn: "¿Tlen onca pan tomīlli?", en: "What is in our field?" },
      { s: "B", ehn: "Onca elotl huan ōlōtl. Cuālli in tōnalli āxcan.", en: "There are ears of corn and corncobs. Good day today." },
      { s: "A", ehn: "¿Huan in chichi, cāmpa cateh?", en: "And the dog, where is it?" },
      { s: "B", ehn: "In chichi onca nopā, quitemoa in piyo.", en: "The dog is over there, looking for the chicken." },
    ],
  },
  {
    unitId: "FCN-LSN-0032", // Unit 22 — Our Cornfield and Our Food
    lines: [
      { s: "A", ehn: "¿Tlen ticchihua āxcan?", en: "What are you making today?" },
      { s: "B", ehn: "Nictamalohua. Nictemoa iztatl huan chilli.", en: "I'm making tamales. I'm looking for salt and chili." },
      { s: "A", ehn: "¿Nicān onca āhuacatl?", en: "Is there avocado here?" },
      { s: "B", ehn: "Quēna, huan onca xōnacatl. Cuālli ticcuazqueh āxcan.", en: "Yes, and there is onion. We'll eat well today." },
    ],
  },
  {
    unitId: "FCN-LSN-0033", // Unit 23 — What is Inside the House
    lines: [
      { s: "A", ehn: "¿Tlen onca ītech calli?", en: "What is inside the house?" },
      { s: "B", ehn: "Onca cē metlatl huan ōme libro. ¿Tlen tictemoa?", en: "There's a metate and two books. What are you looking for?" },
      { s: "A", ehn: "Nictemoa in pāhtli. ¿Cāmpa onca?", en: "I'm looking for the medicine. Where is it?" },
      { s: "B", ehn: "In pāhtli onca nicān, pan calli. Niquitta.", en: "The medicine is here, in the house. I see it." },
    ],
  },
  {
    unitId: "FCN-LSN-0034", // Unit 24 — I Had Gone to the City Part 1
    lines: [
      { s: "A", ehn: "¿Cāmpa ōtiyāh yalhua?", en: "Where did you go yesterday?" },
      { s: "B", ehn: "Ōniyāh Mexco. Ōniquitta in āltepētl huan tiānquiz.", en: "I went to Mexico. I saw the city and the market." },
      { s: "A", ehn: "¿Huan ōticalac escuela?", en: "And did you enter the school?" },
      { s: "B", ehn: "Quēna, huan ōniquitta in tiopa. Cuālli āltepētl.", en: "Yes, and I saw the church. A fine city." },
    ],
  },
  {
    unitId: "FCN-LSN-0035", // Unit 25 — I Had Gone to the City Part 2
    lines: [
      { s: "A", ehn: "¿Cuālli ōtimomachti pan āltepētl?", en: "Did you learn well in the city?" },
      { s: "B", ehn: "Quēna, zan āmo ōnicpiyah notiempōs. Huēhca ōniyāuh.", en: "Yes, but I didn't have enough time. I went far away." },
      { s: "A", ehn: "¿Nōhquiya ōtiquitta escuela?", en: "Did you also see the school?" },
      { s: "B", ehn: "Quēna, hasta huēhca ōniquitta. Cuālli āltepētl.", en: "Yes, I saw it all the way over there. A fine city." },
    ],
  },
  {
    unitId: "FCN-LSN-0036", // Unit 26 — I Came to Buy a Tortilla Napkin
    lines: [
      { s: "A", ehn: "¿Tlen ticōhuaz nicān tiānquiz?", en: "What will you buy here at the market?" },
      { s: "B", ehn: "Nicōhuaz cē pantzi huan ōme lalax. ¿Quēzqui tomi?", en: "I'll buy one bread and two oranges. How much money?" },
      { s: "A", ehn: "In pantzi, ōme pesos. In lalax, cē peso ciyoc.", en: "The bread, two pesos. The oranges, one more peso." },
      { s: "B", ehn: "Nicah, niccui. Tlazcāmati.", en: "OK, I'll take them. Thank you." },
    ],
  },
  {
    unitId: "FCN-LSN-0037", // Unit 27 — It's market day today!
    lines: [
      { s: "A", ehn: "¡Āxcan tiānquiz! ¿Tlen ticōhuaz?", en: "It's market day! What will you buy?" },
      { s: "B", ehn: "Nicōhuaz nākatl huan michi. ¿Huan ta?", en: "I'll buy meat and fish. And you?" },
      { s: "A", ehn: "Na nicōhuaz tzopelatl huan matzāhtli.", en: "I'll buy soda and pineapple." },
      { s: "B", ehn: "Cuālli! Na nocca nicnequi cē café. Ximopāquilti!", en: "Great! I also want a coffee. Have a good time!" },
    ],
  },
  {
    unitId: "FCN-LSN-0038", // Unit 28 — I Was Passing By Your House
    lines: [
      { s: "A", ehn: "Piyālli! ¿Nipaxalōtoh moichan?", en: "Hello! Am I passing by your house?" },
      { s: "B", ehn: "Quēna, ximocalaqui! Ximoāxilti!", en: "Yes! Come in! Welcome!" },
      { s: "A", ehn: "Tlazcāmati. ¿Cuālli timoyōlia āxcan?", en: "Thank you. Are you well today?" },
      { s: "B", ehn: "Quēna, cuālli nicah. Ximotlāli, ximoāxilti.", en: "Yes, I'm well. Sit down, be welcome." },
    ],
  },
  {
    unitId: "FCN-LSN-0039", // Unit 29 — What Illnesses Do You Know?
    lines: [
      { s: "A", ehn: "¿Quēniuhqui timoyōlia?", en: "How are you feeling?" },
      { s: "B", ehn: "Āmo cuālli nicah. Nicpiya cecuīliztli.", en: "I'm not well. I have a cold." },
      { s: "A", ehn: "¿Ticcāhuac in cocoliztli?", en: "Did you catch the sickness?" },
      { s: "B", ehn: "Quēna. Nicnequi niccua pāhtli āxcan.", en: "Yes. I want to take medicine today." },
    ],
  },
  {
    unitId: "FCN-LSN-0040", // Unit 30 — The Conditional, Part 1
    lines: [
      { s: "A", ehn: "Intlā tiyāuh tiānquiz, ¿ticcuīz nākatl?", en: "If you go to the market, will you buy meat?" },
      { s: "B", ehn: "Intlā onca tomi, quēna. Āmo mātzin nicpiya.", en: "If there is money, yes. I don't have any yet." },
      { s: "A", ehn: "Intlā āmo tomi, ¿tlen ticchīhuaz?", en: "If there's no money, what will you do?" },
      { s: "B", ehn: "Nēlia āmo niccuīz nākatl. Aic niccuīz.", en: "Truly I won't buy meat. I'll never buy it." },
    ],
  },
  {
    unitId: "FCN-LSN-0041", // Unit 31 — Cleansing ceremonies / Conditional Part 2
    lines: [
      { s: "A", ehn: "¿Tlen titlahtōz intlā tiquittaz in sitlālli?", en: "What will you say if you see the stars?" },
      { s: "B", ehn: "Intlā niquittaz sitlālli, nitlahtōz īhuaya in tēōtl.", en: "If I see the stars, I will speak with God." },
      { s: "A", ehn: "¿Huan in āhacatl huan mixtli, quēniuhqui?", en: "And the wind and clouds, what about them?" },
      { s: "B", ehn: "In āhacatl huan mixtli, nochi quitōa in cuīcatl. Tlazcāmati.", en: "The wind and clouds — they all carry the song. Thank you." },
    ],
  },
  {
    unitId: "FCN-LSN-0042", // Unit 32 — Tē- and tla- object markers
    lines: [
      { s: "A", ehn: "¿Āquin tēmachtia nicān pan caltlamachticān?", en: "Who teaches people here at school?" },
      { s: "B", ehn: "Cē cihuātl tēmachtia. Tlāhuēl cuālli quitlahtōa nāhuatl.", en: "A woman teaches. She speaks Nahuatl very well." },
      { s: "A", ehn: "¿Huan ta, ticnequi tēmachtia?", en: "And you, do you want to teach people?" },
      { s: "B", ehn: "Quēna, nicnequi tlātlamachtia huan tēmachtia. Cuālli notequi.", en: "Yes, I want to teach things and people. It's good work." },
    ],
  },
];

// ── Insert ────────────────────────────────────────────────────────────────────

const insert = db.prepare(`
  INSERT INTO lesson_dialogues
    (lesson_dialogue_id, lesson_unit_id, dialogue_order, speaker_label,
     utterance_original, utterance_normalized, translation_en, attestation_tier)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'AI_generated')
`);

let idCounter = 216; // next after FCN-LDG-000215
let totalInserted = 0;

const run = db.transaction(() => {
  for (const unit of dialogues) {
    for (let i = 0; i < unit.lines.length; i++) {
      const line = unit.lines[i];
      const id = `FCN-LDG-${String(idCounter).padStart(6, "0")}`;
      insert.run(id, unit.unitId, i + 1, line.s, line.ehn, line.ehn, line.en);
      idCounter++;
      totalInserted++;
    }
  }
});

run();
console.log(`Inserted ${totalInserted} dialogue lines across ${dialogues.length} units.`);
console.log(`IDs: FCN-LDG-000216 → FCN-LDG-${String(idCounter - 1).padStart(6, "0")}`);
