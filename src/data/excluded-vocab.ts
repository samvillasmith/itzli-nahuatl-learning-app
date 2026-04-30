/**
 * Vocab IDs excluded from lesson quizzes and learn cards.
 *
 * These words remain in the database (for lexicon search) but are suppressed
 * from the structured lesson flow. Two categories:
 *
 * 1. Off-topic — clearly misplaced relative to their unit's theme.
 * 2. Inappropriate — content not suitable for a general-audience learning app.
 *    (Note: vulgar glosses on remaining words have been corrected in the DB.)
 */

export const EXCLUDED_VOCAB_IDS: Set<number> = new Set([
  // Unit 7: How to divide up the day
  168,  // chocolatl - food word in time/daypart unit

  // Unit 8: Possessive markers
  194,  // cipactli - alligator, off-topic in a possession unit

  // Unit 11: Greetings and farewells
  264,  // achtontli - great-grandfather, belongs to advanced kinship/reference
  270,  // yalhua - yesterday, belongs to time/calendar work
  274,  // mintontli - great-great-grandchild, too specialized for greetings
  275,  // piptontli - great-grandmother / great-grandfather's sister, too specialized
  276,  // teoxihuitl - fine turquoise, off-topic
  277,  // hueyicayotl - greatness, abstract noun off-topic
  278,  // tlalalacatl - specialized zoological term, off-topic

  // ── Unit 23: What is Inside the House ──────────────────────────────────
  525,  // zacacalli — hay storehouse (outbuilding, not inside a house)
  531,  // acalli — canoe/boat (not inside a house)
  539,  // pachtli — hay (not inside a house)

  // ── Unit 25: I Had Gone to the City Part 2 ─────────────────────────────
  573,  // chikome — seven (stray number word, off-topic)
  581,  // olin — 17th Aztec day sign (calendar concept, off-topic)
  583,  // mazatl — 7th Aztec day sign (calendar concept, off-topic)
  584,  // iyelli — flatulence (variant of 588; also off-topic)
  588,  // ihyelli — flatulence (off-topic in city travel unit)

  // ── Unit 30: The conditional, Part 1 ───────────────────────────────────
  669,  // tsimpa — buttock (off-topic in grammar unit; canonical of variant group)
  671,  // tzintamalli — buttock (variant of tsimpa)
  678,  // tzintli — buttocks/rump (off-topic in grammar unit)
  // Rows corrected during the audit but unsuitable for core lesson cards.
  665,   // tlachiacayotl - not an attested butter word
  682,   // tecotli - not a standard word for god
  700,   // yacametl - not attested as insect
  702,   // iyaquemetl - not attested as insect
  6068,  // tlatzehtzeloltic - not attested as holy
  6059,  // huehcatla - distance word, misplaced in shape/size unit
  6081,  // koajtli - likely corruption for eagle
  6083,  // kuatochin - non-standard wood-rabbit compound
  6110,  // tecciztli - conch shell, not an egg/food item
  6139,  // elhuicac ehquetl - angel, off-path in community unit
  6142,  // ojtatl - bamboo, off-path in community unit
  6237,  // kuitlatl - vulgar/off-topic noun in action-word unit
  6273,  // quema - mis-glossed as when; already taught as yes elsewhere
  7240,  // teotlacatl - specialized religious/cosmological term
  7248,  // teziuhtekatl - overly specialized role
  7724,  // tilmahtli - clothing word in conditions/evaluations unit
]);

const CORE_GLOSS_OVERRIDES: Record<number, string> = {
  6845: "you're welcome",
};

export const CORE_VOCAB_LIMITS: Record<number, number> = {
  9: 28,
  10: 28,
  21: 30,
  27: 30,
  29: 28,
  33: 24,
  34: 28,
  35: 28,
  36: 28,
  37: 32,
  38: 32,
  39: 28,
  40: 32,
  41: 28,
  42: 32,
  43: 28,
};

const FOCUSED_SEMANTIC_DOMAINS: Record<number, Set<string>> = {
  33: new Set(["months"]),
  34: new Set(["numbers", "curated_expansion"]),
  35: new Set(["colors", "sizes_shapes"]),
  36: new Set(["qualities", "curated_expansion"]),
  37: new Set(["animals"]),
  38: new Set(["food_extra", "curated_expansion"]),
  39: new Set(["household"]),
  40: new Set(["nature", "curated_expansion"]),
  41: new Set(["community"]),
  42: new Set(["verbs_extra"]),
  43: new Set(["adverbs", "curated_expansion"]),
};

const FOCUSED_THEME_PATTERNS: Record<number, RegExp> = {
  33: /\b(month|week|day|year|morning|night|dawn|today|tomorrow|yesterday|time|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  34: /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|hundred|first|second|third|times|count|number)\b/i,
  35: /\b(color|colour|red|blue|green|yellow|white|black|brown|pink|grey|gray|orange|purple|big|small|tall|short|long|wide|round|flat|straight|thick|thin)\b/i,
  36: /\b(good|bad|new|old|hard|difficult|easy|expensive|cheap|pure|dirty|clean|cooked|hot|cold|warm|dry|wet|heavy|light|strong|weak|happy|sad|sick|healthy|hungry|thirsty|sweet|bitter|sour|tasty|dark|bright)\b/i,
  37: /\b(animal|bird|fish|snake|dog|cat|horse|pig|chicken|turkey|deer|rabbit|frog|bee|ant|spider|duck|sheep|turtle|donkey|grasshopper|worm|dove|heron)\b/i,
  38: /\b(food|eat|corn|maize|bean|chili|tortilla|atole|sugar|squash|fruit|guava|jicama|milk|pineapple|avocado|pumpkin|drink|sauce|dough|tamal|honey|meat|salt)\b/i,
  39: /\b(house|home|room|door|table|chair|mat|blanket|pot|cup|bowl|basket|letter|writing|mirror|soap|stairs|garden|kitchen|hearth|tool|trap|sack|book)\b/i,
  40: /\b(water|river|lake|rain|cloud|wind|sky|sun|moon|star|earth|stone|rock|mountain|field|sand|tree|leaf|root|flower|grass|ice|fire|cave|thorn|rainbow|flame)\b/i,
  41: /\b(person|city|village|town|community|friend|doctor|man|woman|sir|soldier|hunter|priest|musician|traveler|festival|hospital|humanity|worker|teacher)\b/i,
  42: /\bto\s+[a-z]/i,
  43: /\b(again|always|never|often|much|little|very|more|also|still|already|just|only|here|there|near|where|how|when|suddenly|slowly|quickly|well|thus|together|first|later|afterwards|beforehand)\b/i,
};

const FOCUSED_BLOCK_PATTERNS: Record<number, RegExp> = {
  40: /\bice cream\b/i,
  41: /\b(german|spaniard|guatemalan|blouse|skirt)\b/i,
  43: /\b(bag|cub|puma)\b/i,
};

type CurriculumVocabItem = {
  id: number;
  rank?: number;
  first_lesson_number?: number;
  lesson_number?: number;
  gloss_en?: string | null;
  part_of_speech?: string | null;
  semantic_domain?: string | null;
};

function hasExcludedGloss(gloss: string): boolean {
  const normalized = gloss.toLowerCase();
  return (
    normalized.includes("misplaced") ||
    normalized.includes("off-theme") ||
    normalized.includes("not widely attested") ||
    normalized.includes("not a core") ||
    normalized.includes("not attested") ||
    normalized.includes("likely corruption")
  );
}

function isFocusedLexiconMatch(item: CurriculumVocabItem, lessonNumber: number): boolean {
  const pattern = FOCUSED_THEME_PATTERNS[lessonNumber];
  if (!pattern) return true;

  const gloss = item.gloss_en ?? "";
  const blocked = FOCUSED_BLOCK_PATTERNS[lessonNumber];
  if (blocked?.test(gloss)) return false;

  if (lessonNumber === 34) {
    const pos = item.part_of_speech?.toLowerCase() ?? "";
    return /^(num|number|adv|adverb)$/.test(pos) && pattern.test(gloss);
  }

  if (lessonNumber === 35) {
    const pos = item.part_of_speech?.toLowerCase() ?? "";
    return (pos === "adj" || pos === "adjective") && pattern.test(gloss);
  }

  if (lessonNumber === 36) {
    const pos = item.part_of_speech?.toLowerCase() ?? "";
    return (pos === "adj" || pos === "adjective" || pos === "verb") && pattern.test(gloss);
  }

  if (lessonNumber === 42) {
    const pos = item.part_of_speech?.toLowerCase() ?? "";
    return pos === "verb" && pattern.test(gloss);
  }

  if (lessonNumber === 43) {
    const pos = item.part_of_speech?.toLowerCase() ?? "";
    return /^(adv|adverb|particle|conj|conjunction|prep|preposition)$/.test(pos) && pattern.test(gloss);
  }

  return pattern.test(gloss);
}

export function isCoreVocabItem(
  item: CurriculumVocabItem,
  lessonNumber = item.lesson_number ?? item.first_lesson_number ?? 0,
): boolean {
  if (EXCLUDED_VOCAB_IDS.has(item.id)) return false;
  if (hasExcludedGloss(item.gloss_en ?? "")) return false;

  const focusedDomains = FOCUSED_SEMANTIC_DOMAINS[lessonNumber];
  if (!focusedDomains) return true;

  const domain = item.semantic_domain ?? "";
  if (focusedDomains.has(domain)) return true;
  if (domain.startsWith("lexicon_")) return isFocusedLexiconMatch(item, lessonNumber);
  return true;
}

export function filterCoreVocab<T extends CurriculumVocabItem>(
  items: T[],
  lessonNumber: number,
): T[] {
  const filtered = items.filter((item) => isCoreVocabItem(item, lessonNumber));
  const limit = CORE_VOCAB_LIMITS[lessonNumber];
  const limited = typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  return limited.map((item) => {
    const gloss = CORE_GLOSS_OVERRIDES[item.id];
    return gloss ? ({ ...item, gloss_en: gloss } as T) : item;
  });
}
