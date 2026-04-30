#!/usr/bin/env node
/**
 * Phase 1: Expand lesson_vocab by mining unused entries from lexicon_entries.
 *
 * Sources (priority order):
 *   1. Eastern Huasteca Nahuatl (EHN) — highest quality
 *   2. Central Huasteca Nahuatl — very close dialect
 *   3. Central Nahuatl — still intelligible
 *   4. Classical Nahuatl — only high-confidence common words
 *
 * Assigns to thematic units (33–43) with a per-unit cap for balance.
 * Target: ~1,300 new words → total ~2,000.
 */

const { resolveDbPath } = require("./_db-path");
const Database = require("better-sqlite3");
const db = new Database(resolveDbPath());

const PER_UNIT_CAP = 40;

// ── Thematic keyword → unit mapping ──────────────────────────────────────────
const THEME_RULES = [
  { keywords: ["bird", "fish", "animal", "insect", "snake", "dog", "cat", "horse", "pig", "chicken", "turkey", "deer", "rabbit", "frog", "butterfly", "bee", "ant", "worm", "spider", "mouse", "rat", "lizard", "eagle", "hawk", "owl", "duck", "coyote", "jaguar", "monkey", "bat", "turtle", "shrimp", "crab", "fly", "mosquito", "scorpion", "goat", "sheep", "cow", "bull", "donkey", "parrot", "heron", "vulture", "cricket", "grasshopper", "snail", "toad", "salamander", "axolotl", "macaw", "quetzal", "armadillo", "opossum", "skunk", "squirrel", "raccoon", "iguana"], unit: 37 },
  { keywords: ["food", "eat", "cook", "tortilla", "bean", "corn", "maize", "chili", "pepper", "tomato", "squash", "avocado", "fruit", "meat", "salt", "sugar", "honey", "chocolate", "atole", "tamal", "sauce", "dough", "bread", "egg", "milk", "cheese", "oil", "stew", "soup", "broth", "seed", "nut", "potato", "onion", "garlic", "lime", "lemon", "banana", "mango", "pineapple", "cactus", "mushroom", "herb", "spice", "cinnamon", "vanilla", "amaranth", "jicama", "sapote", "guava", "drink", "pulque", "mezcal", "griddle", "comal", "pumpkin", "agave"], unit: 38 },
  { keywords: ["house", "room", "door", "window", "wall", "roof", "floor", "table", "chair", "bed", "blanket", "mat", "pot", "cup", "plate", "bowl", "spoon", "knife", "broom", "basket", "jar", "bucket", "candle", "lamp", "mirror", "soap", "towel", "key", "lock", "rope", "cloth", "thread", "needle", "furniture", "kitchen", "garden", "patio", "fence", "stove", "oven", "hearth", "shelf", "building", "temple", "church", "school", "plaza", "bridge", "road", "path", "street", "town", "village", "city"], unit: 39 },
  { keywords: ["water", "river", "lake", "sea", "ocean", "rain", "cloud", "wind", "sky", "sun", "moon", "star", "earth", "stone", "rock", "mountain", "hill", "valley", "forest", "tree", "wood", "leaf", "flower", "grass", "field", "soil", "sand", "mud", "fire", "smoke", "ash", "snow", "ice", "rainbow", "thunder", "lightning", "cave", "spring", "world", "land", "island", "desert", "volcano", "coast", "creek", "pond", "swamp", "plain", "cliff", "pine", "oak", "cedar", "palm", "root", "branch", "bark", "thorn", "petal", "vine"], unit: 40 },
  { keywords: ["head", "face", "eye", "ear", "nose", "mouth", "lip", "tooth", "tongue", "hair", "neck", "shoulder", "arm", "hand", "finger", "nail", "chest", "stomach", "back", "leg", "knee", "foot", "toe", "skin", "bone", "blood", "heart", "lung", "liver", "body", "elbow", "wrist", "ankle", "chin", "forehead", "cheek", "belly", "rib", "throat"], unit: 10 },
  { keywords: ["mother", "father", "parent", "son", "daughter", "child", "baby", "brother", "sister", "uncle", "aunt", "cousin", "grandfather", "grandmother", "grandchild", "husband", "wife", "family", "relative", "ancestor", "orphan"], unit: 9 },
  { keywords: ["teacher", "student", "doctor", "healer", "priest", "chief", "lord", "king", "warrior", "merchant", "farmer", "worker", "servant", "thief", "hunter", "fisherman", "weaver", "potter", "carpenter", "painter", "musician", "singer", "dancer", "elder", "person", "people", "woman", "man", "noble", "ruler", "governor", "judge", "soldier", "guard", "neighbor", "friend", "enemy", "artisan", "scribe", "midwife", "witch", "sorcerer", "traveler", "messenger"], unit: 41 },
  { keywords: ["color", "red", "blue", "green", "yellow", "white", "black", "brown", "purple", "orange", "pink", "gray", "big", "small", "tall", "short", "long", "wide", "narrow", "thick", "thin", "round", "flat", "straight", "sharp"], unit: 35 },
  { keywords: ["beautiful", "ugly", "good", "bad", "new", "old", "hot", "cold", "warm", "wet", "dry", "clean", "dirty", "heavy", "light", "hard", "soft", "fast", "slow", "strong", "weak", "rich", "poor", "happy", "sad", "angry", "afraid", "sick", "healthy", "tired", "hungry", "thirsty", "full", "empty", "sweet", "bitter", "sour", "salty", "loud", "quiet", "bright", "dark", "deep", "smooth", "rough", "ripe", "raw", "alive", "dead", "true", "false", "sacred", "dangerous", "brave", "lazy", "humble", "wise", "foolish", "gentle", "fierce", "proud", "greedy", "generous"], unit: 36 },
  { keywords: ["number", "count", "first", "second", "third", "half", "twenty", "hundred", "thousand", "pair", "many", "few", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "fifteen"], unit: 34 },
  { keywords: ["month", "year", "week", "day", "hour", "morning", "afternoon", "evening", "night", "dawn", "today", "tomorrow", "yesterday", "season", "spring", "summer", "autumn", "winter", "time", "always", "never", "sometimes", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], unit: 33 },
  { keywords: ["illness", "disease", "pain", "fever", "cough", "wound", "cure", "medicine", "remedy", "heal", "hurt", "swelling", "infection", "vomit", "diarrhea", "headache", "toothache"], unit: 29 },
  { keywords: ["buy", "sell", "price", "money", "market", "trade", "pay", "cost", "cheap", "expensive", "exchange", "store", "shop", "coin", "debt", "profit", "goods"], unit: 27 },
  { keywords: ["hello", "goodbye", "thank", "please", "sorry", "welcome", "greeting", "farewell", "bless"], unit: 11 },
  { keywords: ["walk", "run", "jump", "climb", "fall", "sit", "stand", "sleep", "wake", "bathe", "wash", "dress", "carry", "hold", "grab", "push", "pull", "throw", "catch", "hit", "cut", "break", "build", "sew", "weave", "dig", "plant", "harvest", "grind", "sweep", "sing", "dance", "play", "laugh", "cry", "shout", "breathe", "blow", "burn", "boil", "roast", "fry", "twist", "pierce", "shoot", "sow", "plow", "tie", "untie", "pour", "spill", "scrape", "mend", "open", "close", "enter", "exit", "swim", "fly", "crawl", "scratch", "chop", "graze", "knead", "stir", "squeeze", "stretch", "bend", "fold", "shake", "spin", "wrap", "unwrap", "crush", "smash", "split"], unit: 42 },
  { keywords: ["think", "know", "believe", "remember", "forget", "understand", "learn", "teach", "speak", "say", "tell", "ask", "answer", "listen", "hear", "see", "look", "watch", "feel", "want", "need", "like", "love", "hate", "fear", "hope", "wait", "search", "find", "give", "receive", "send", "bring", "take", "leave", "arrive", "return", "begin", "finish", "stop", "choose", "decide", "promise", "dream", "pray", "wish", "obey", "serve", "rule", "govern", "punish", "reward", "help"], unit: 42 },
  { keywords: ["milpa", "cornfield", "plow", "crop", "irrigate", "weed", "hoe", "axe", "machete", "cultivat"], unit: 21 },
  { keywords: ["very", "much", "little", "also", "too", "still", "already", "just", "only", "almost", "really", "truly", "perhaps", "maybe", "here", "there", "near", "far", "inside", "outside", "above", "below", "behind", "between", "before", "after", "slowly", "quickly", "well", "badly", "again", "now", "then", "soon", "late", "early", "together", "alone", "thus", "therefore", "moreover", "toward", "away", "forward", "around", "completely", "everywhere", "nowhere"], unit: 43 },
];

function assignUnit(glossEn) {
  const g = glossEn.toLowerCase();
  for (const rule of THEME_RULES) {
    for (const kw of rule.keywords) {
      if (g.includes(kw)) return rule.unit;
    }
  }
  return null;
}

// ── Skip patterns ─────────────────────────────────────────────────────────────
const SKIP_PATTERNS = [
  /obsolete spelling/i, /variant of/i, /alternate spelling/i,
  /alternative spelling/i, /\bsee\s/i, /plural of/i, /possessed form/i,
  /third-person/i, /first-person/i, /second-person/i,
  /singular.*form/i, /preterit of/i, /past tense of/i,
  /applicative of/i, /causative of/i, /reflexive of/i,
  /\bcountry\b/i, /\bcity in\b/i, /\blanguage\b/i, /\ba people\b/i,
  /\bstate in\b/i, /\bprovince\b/i, /\bmunicipality\b/i,
  /\bshit\b/i, /\bexcrement\b/i, /\bfeces\b/i, /\banus\b/i,
  /\bbuttock\b/i, /\bflatulence\b/i,
];

function shouldSkip(gloss) {
  return SKIP_PATTERNS.some((p) => p.test(gloss));
}

// ── Quality filters ───────────────────────────────────────────────────────────
function isHighQuality(form, gloss) {
  if (form.length > 25) return false;
  if (form.length < 3) return false;
  if (/[0-9]/.test(form)) return false;
  if (/^[A-Z]/.test(form)) return false; // proper nouns
  if (gloss.length < 3) return false;
  return true;
}

// ── Fetch existing ────────────────────────────────────────────────────────────
const existingForms = new Set(
  db.prepare("SELECT LOWER(display_form) as f FROM lesson_vocab").all().map((r) => r.f)
);
const existingEntryIds = new Set(
  db.prepare("SELECT entry_id FROM lesson_vocab WHERE entry_id IS NOT NULL").all().map((r) => r.entry_id)
);

console.log(`Existing lesson_vocab: ${existingForms.size} unique forms`);

// ── Query and filter ──────────────────────────────────────────────────────────
const varietyPriority = [
  "Eastern Huasteca Nahuatl",
  "Central Huasteca Nahuatl",
  "Central Nahuatl",
  "Classical Nahuatl",
];

let maxId = db.prepare("SELECT MAX(id) as m FROM lesson_vocab").get().m || 0;
const unitRankCounters = {};
db.prepare("SELECT lesson_number, MAX(rank) as mr FROM lesson_vocab GROUP BY lesson_number").all()
  .forEach((r) => { unitRankCounters[r.lesson_number] = r.mr || 0; });

const unitNewCount = {};
const toInsert = [];
const usedForms = new Set();

for (const variety of varietyPriority) {
  const candidates = db.prepare(`
    SELECT entry_id,
           COALESCE(ehn_spoken_form, msn_headword) as form,
           gloss_en,
           part_of_speech,
           source_confidence
    FROM lexicon_entries
    WHERE is_active = 1
      AND variety = ?
      AND gloss_en IS NOT NULL AND length(gloss_en) > 3
      AND part_of_speech IN ('noun', 'verb', 'adj', 'adv', 'num', 'intj', 'pron', 'det', 'prep')
      AND COALESCE(ehn_spoken_form, msn_headword) IS NOT NULL
      AND length(COALESCE(ehn_spoken_form, msn_headword)) > 2
    ORDER BY source_confidence DESC, COALESCE(ehn_spoken_form, msn_headword)
  `).all(variety);

  let added = 0;
  for (const c of candidates) {
    if (!c.form) continue;
    const formLower = c.form.toLowerCase();
    if (existingForms.has(formLower)) continue;
    if (existingEntryIds.has(c.entry_id)) continue;
    if (usedForms.has(formLower)) continue;
    if (shouldSkip(c.gloss_en)) continue;
    if (!isHighQuality(c.form, c.gloss_en)) continue;
    if (c.form.includes(" ")) continue;

    let gloss = c.gloss_en.split(/[.;]/)[0].trim();
    if (gloss.length < 2) gloss = c.gloss_en.trim();
    if (gloss.length > 60) gloss = gloss.slice(0, 57) + "...";

    const unit = assignUnit(c.gloss_en);
    if (!unit) continue;

    unitNewCount[unit] = (unitNewCount[unit] || 0) + 1;
    if (unitNewCount[unit] > PER_UNIT_CAP) continue;

    maxId++;
    unitRankCounters[unit] = (unitRankCounters[unit] || 0) + 1;

    toInsert.push({
      id: maxId,
      lesson_number: unit,
      rank: unitRankCounters[unit],
      entry_id: c.entry_id,
      display_form: c.form,
      ehn_spoken_form: c.form,
      gloss_en: gloss,
      part_of_speech: c.part_of_speech,
      semantic_domain: `lexicon_${variety.replace(/\s/g, "_").toLowerCase()}`,
      pedagogical_score: 0,
    });

    usedForms.add(formLower);
    existingForms.add(formLower);
    added++;
  }
  console.log(`  ${variety}: +${added} words (${candidates.length} candidates)`);
}

console.log(`\nTotal new words from lexicon: ${toInsert.length}`);

// ── Distribution ──────────────────────────────────────────────────────────────
const byUnit = {};
toInsert.forEach((r) => { byUnit[r.lesson_number] = (byUnit[r.lesson_number] || 0) + 1; });
console.log("\nDistribution by unit:");
Object.entries(byUnit)
  .sort(([a], [b]) => Number(a) - Number(b))
  .forEach(([u, n]) => console.log(`  Unit ${u}: +${n} words`));

// ── Insert ────────────────────────────────────────────────────────────────────
const insert = db.prepare(`
  INSERT INTO lesson_vocab (id, lesson_number, rank, entry_id, display_form, ehn_spoken_form, gloss_en, part_of_speech, semantic_domain, pedagogical_score)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const txn = db.transaction(() => {
  for (const r of toInsert) {
    insert.run(r.id, r.lesson_number, r.rank, r.entry_id, r.display_form, r.ehn_spoken_form, r.gloss_en, r.part_of_speech, r.semantic_domain, r.pedagogical_score);
  }
});
txn();

const newTotal = db.prepare("SELECT COUNT(*) as n FROM lesson_vocab").get().n;
console.log(`\nDone. lesson_vocab: ${newTotal} (was 671, added ${toInsert.length})`);

db.close();
