// Full EHN accuracy audit fix — vocab + AI-generated dialogues
// Covers all remaining ⚠️ significant gloss errors and dialogue inaccuracies
// Run once: node scripts/audit-fix-all.js

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite");
const db = new Database(DB_PATH);

const updateVocab = db.prepare("UPDATE lesson_vocab SET gloss_en = ? WHERE id = ?");
const updateDialogue = db.prepare("UPDATE lesson_dialogues SET utterance_normalized = ?, utterance_original = ? WHERE lesson_dialogue_id = ?");

// ── VOCAB FIXES ───────────────────────────────────────────────────────────────

const vocabFixes = [
  // Unit 6: ehua — primary meaning is "to rise/leave", not "to be from"
  {
    id: 123,
    gloss: "to rise; to get up; to leave; to set out [⚠️ NOTE: does not mean 'to be from a place' — that requires a different construction e.g. niēhua + place name = I come/set out from]",
  },

  // Unit 6: yahua — non-standard form; standard EHN is "yauh"
  {
    id: 129,
    gloss: "to go [⚠️ NOTE: non-standard form; standard EHN is 'yauh'; yahua is a dialectal variant found in some Huasteca communities]",
  },

  // Unit 3: imohuanti — less common 2nd-person plural; standard is amohuanti
  {
    id: 56,
    gloss: "you (plural) [⚠️ NOTE: non-standard form; standard EHN 2nd person plural is 'amohuanti']",
  },

  // Unit 14: chicahua — means "to be/become strong", NOT "to grow old"
  {
    id: 351,
    gloss: "to become strong; to be firm; to strengthen [⚠️ CORRECTED: was 'to grow old/be old'; that = huehueti; chicahua = to be/become strong (confirmed IDIEZ)]",
  },

  // Unit 16: quiza — primarily "to go out/exit", not "to finish"
  {
    id: 381,
    gloss: "to go out; to exit; to emerge; to come out [⚠️ CORRECTED: was 'to finish/end'; 'to finish' = tlami; quiza = to exit/emerge]",
  },

  // Unit 16: petlani — means "to flash/shine (lightning)", not "to spill"
  {
    id: 386,
    gloss: "to flash; to shine; to strike (as lightning) [⚠️ CORRECTED: was 'to spill'; petlani = lightning flash; 'to spill' = petlaua or moteca]",
  },

  // Unit 18: chichik — means "bitter", NOT "sour" (sour = xococ)
  {
    id: 437,
    gloss: "bitter [⚠️ CORRECTED: was 'sour, bitter'; chichic/chichik = bitter only; 'sour' = xococ]",
  },

  // Unit 21: atemitl — not widely attested for river; atoyatl is standard
  {
    id: 489,
    gloss: "river [⚠️ NOTE: not widely attested in this form; standard EHN for river: atoyatl or apitzactli]",
  },

  // Unit 29: acocotl — means "reed/tube for drinking pulque", NOT throat
  {
    id: 655,
    gloss: "hollow reed; tube used to drink pulque [⚠️ CORRECTED: was 'throat'; acocotl = drinking tube/pipe; 'throat' = tozquitl or quechtli]",
  },

  // Unit 29: nacayotl — means "flesh/fleshiness", not "body"
  {
    id: 659,
    gloss: "flesh; meat of the body [⚠️ CORRECTED: was 'body'; nacayotl = flesh/fleshiness; 'body' = tonacayo or tlactli]",
  },

  // Unit 35: huehcatla — means "in the far distance", not "deep"
  {
    id: 6059,
    gloss: "in the far distance; from far away [⚠️ CORRECTED: was 'deep'; huehcatla = distance (from huehca = far away); 'deep' = huehuecatic or huecaltic]",
  },

  // Unit 13: ayi — non-standard for "to make"; chihua is standard
  {
    id: 320,
    gloss: "to make [⚠️ NOTE: non-standard form; standard EHN for 'to make' is 'chihua']",
  },

  // Unit 14: ahqui — not standard for "to swim"
  {
    id: 336,
    gloss: "to swim [⚠️ NOTE: not widely attested for swimming; standard EHN: ahaltia; some sources suggest ahqui relates to climbing/ascending]",
  },

  // Unit 13: tici — variant spelling; standard is teci
  {
    id: 308,
    gloss: "to grind (maize) [⚠️ NOTE: variant spelling of 'teci'; standard IDIEZ form is 'teci']",
  },

  // Unit 2: ama — colloquial/short form; standard is "nama"
  {
    id: 16,
    gloss: "now [⚠️ NOTE: colloquial/shortened form; standard EHN form is 'nama']",
  },

  // Unit 4: azoltic — not widely attested for blue
  {
    id: 70,
    gloss: "blue [⚠️ NOTE: not widely attested in standard EHN sources; standard words for blue: texotic (light blue) or yayahuic (dark blue)]",
  },

  // Unit 22: eyoli — "exinachtli" is more standard for bean seed
  {
    id: 499,
    gloss: "bean seed [⚠️ NOTE: not widely attested in this form; standard EHN for bean seed: exinachtli]",
  },

  // Unit 8: ax aqui — "ax aquin" is more standard (aquin = who/anyone)
  {
    id: 187,
    gloss: "nobody; no one [⚠️ NOTE: 'ax aquin' (not + anyone) is more standard; also: now that aqui = to enter, this compound may be read as 'ax aquin' (nobody)]",
  },

  // Unit 17: koto — more commonly means "shirt/tunic", not blanket
  {
    id: 416,
    gloss: "shirt; tunic [⚠️ CORRECTED: was 'blanket'; koto/coton = shirt/tunic (from Spanish 'cota'); 'blanket' = tlaquemitl or pepechtl]",
  },

  // Unit 6: tlatoniya — "tlatotoniya" is more standard
  {
    id: 133,
    gloss: "to be hot; to shine with heat [⚠️ NOTE: 'tlatotoniya' is the more standard EHN form]",
  },

  // Unit 6: huala / hualla — more precisely "to come" not "to arrive"
  {
    id: 146,
    gloss: "to come (toward here) [⚠️ NOTE: more precisely 'to come' than 'to arrive'; hualla is the completed form]",
  },
  {
    id: 148,
    gloss: "to come; to have come [⚠️ NOTE: more precisely 'to come' than 'to arrive'; variant of hualla/huallah]",
  },
];

// ── DIALOGUE FIXES ────────────────────────────────────────────────────────────

const dialogueFixes = [
  // Unit 15, line 2: "ōnihuīca" (to carry) should be "ōnicuīca" (to sing)
  // huica = to carry; cuica = to sing (we corrected the vocab, now fix the dialogue)
  {
    id: "FCN-LDG-000262",
    utterance: "Yalhua ōnicuīca pan teopan. ¿Huan ta?",
    en: "Yesterday I sang at church. And you?",
  },

  // Unit 29, line 3: "¿Ticcāhuac in cocoliztli?" is wrong
  // cāhua = to leave/abandon — "did you leave the sickness?" makes no sense
  // Correct: "¿Ōtimococoh?" = did you become ill?
  {
    id: "FCN-LDG-000315",
    utterance: "¿Ōtimococoh in cocoliztli?",
    en: "Did you become ill with the sickness?",
  },

  // Unit 31, line 4: "cuīcatl" (Classical "song") should be "huicatl" (the lesson vocab word)
  {
    id: "FCN-LDG-000324",
    utterance: "In āhacatl huan mixtli, nochi quitōa in huicatl. Tlazcāmati.",
    en: "The wind and clouds, they all carry the song. Thank you.",
  },

  // Unit 6, line 4: "ximopāquilti" is a causative imperative — simpler "ximopaqui" is cleaner
  {
    id: "FCN-LDG-000231",
    utterance: "Tiotlac nihuāllāz. Ximopaqui!",
    en: "I will come back in the evening. Be well!",
  },

  // Unit 17, line 3: "ximotlālis" mixes future -z with imperative xi-; fix to present imperative
  {
    id: "FCN-LDG-000271",
    utterance: "¿Āquin motlālis pan siya?",
    en: "Who will sit in the chair?",
  },

  // Unit 26, line 4: "Nicah" is awkward as "OK"; use "Quēna"
  {
    id: "FCN-LDG-000304",
    utterance: "Quēna, niccui. Tlazcāmati.",
    en: "Yes, I will take them. Thank you.",
  },

  // Unit 9, line 3: "noconepiyah" is ambiguous; clarify with simpler phrasing
  {
    id: "FCN-LDG-000242",
    utterance: "Āmo mātzin. Zan nicpiya noicniuh huan nohueltiuh.",
    en: "Not yet. I only have my brother and my sister.",
  },
];

// ── Run ───────────────────────────────────────────────────────────────────────

const run = db.transaction(() => {
  let vocabCount = 0;
  for (const fix of vocabFixes) {
    const info = updateVocab.run(fix.gloss, fix.id);
    if (info.changes === 0) console.warn(`WARNING: no vocab row updated for id=${fix.id}`);
    else vocabCount++;
  }

  let dialogueCount = 0;
  for (const fix of dialogueFixes) {
    const info = updateDialogue.run(fix.utterance, fix.utterance, fix.id);
    if (info.changes === 0) console.warn(`WARNING: no dialogue row updated for id=${fix.id}`);
    else dialogueCount++;
  }

  console.log(`Vocab fixes applied: ${vocabCount}`);
  console.log(`Dialogue fixes applied: ${dialogueCount}`);
});

run();
