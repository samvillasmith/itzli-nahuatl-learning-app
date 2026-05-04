export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAnswer(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .trim()
    .replace(/^[¿¡.,;:?!"'“”‘’()[\]{}]+|[¿¡.,;:?!"'“”‘’()[\]{}]+$/g, "")
    .replace(/\s+/g, " ");
}

export function answerMatches(input: string, expected: string, accepted: string[] = []): boolean {
  const normalizedInput = normalizeAnswer(input);
  return [expected, ...accepted].some((answer) => normalizeAnswer(answer) === normalizedInput);
}

export type Person = "1sg" | "2sg" | "3sg" | "1pl" | "2pl" | "3pl";

export type KnownNoun = {
  canonical: string;
  stem: string;
  gloss: string;
  animate?: boolean;
  absolutive?: "-tl" | "-tli" | "-li" | "-n" | "none";
};

export type KnownVerb = {
  stem: string;
  gloss: string;
};

const PRESENT_SUBJECTS: Record<Person, { prefix: string; suffix: string }> = {
  "1sg": { prefix: "ni", suffix: "" },
  "2sg": { prefix: "ti", suffix: "" },
  "3sg": { prefix: "", suffix: "" },
  "1pl": { prefix: "ti", suffix: "h" },
  "2pl": { prefix: "an", suffix: "h" },
  "3pl": { prefix: "", suffix: "h" },
};

const NOUN_PREDICATE_SUBJECTS: Record<Person, string> = {
  "1sg": "ni",
  "2sg": "ti",
  "3sg": "",
  "1pl": "ti",
  "2pl": "in",
  "3pl": "",
};

const POSSESSIVE_PREFIXES: Record<Person, string> = {
  "1sg": "no",
  "2sg": "mo",
  "3sg": "i",
  "1pl": "to",
  "2pl": "amo",
  "3pl": "in",
};

function buildAnimatePlural(noun: KnownNoun): string | null {
  if (!noun.animate) return null;
  if (!noun.stem) return null;
  return `${noun.stem}meh`;
}

export function buildNounPredicate(noun: KnownNoun, person: Person): string | null {
  const isPlural = person.endsWith("pl");
  const nounForm = isPlural ? buildAnimatePlural(noun) : noun.canonical;
  if (!nounForm) return null;

  const prefix = NOUN_PREDICATE_SUBJECTS[person];
  return `${prefix}${nounForm}`;
}

export function buildPresentVerb(verb: KnownVerb, person: Person): string | null {
  if (!verb.stem) return null;
  const affixes = PRESENT_SUBJECTS[person];
  return `${affixes.prefix}${verb.stem}${affixes.suffix}`;
}

export function buildPossessedNoun(noun: KnownNoun, possessor: Person): string | null {
  if (!noun.stem) return null;
  return `${POSSESSIVE_PREFIXES[possessor]}${noun.stem}`;
}
