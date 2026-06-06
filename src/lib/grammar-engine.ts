import { toInaliOrthography } from "@/lib/orthography";

const ANSWER_EQUIVALENTS: Record<string, string[]> = {
  axkana: ["axtle"],
  axtle: ["axkana"],
  piyali: ["pialli"],
  pialli: ["piyali"],
  tlaskamati: ["tlazcamati", "tlazohcamati", "tlasohkamati", "tlaxkamati"],
  tlazcamati: ["tlaskamati", "tlazohcamati", "tlasohkamati", "tlaxkamati"],
  tlazohcamati: ["tlaskamati", "tlazcamati", "tlasohkamati", "tlaxkamati"],
  tlasohkamati: ["tlaskamati", "tlazcamati", "tlazohcamati", "tlaxkamati"],
  tlaxkamati: ["tlaskamati", "tlazcamati", "tlazohcamati", "tlasohkamati"],
  kenihki: ["kenijki", "keniki", "kenin", "kenikatsa", "queniuhqui", "quehatza"],
  kenijki: ["kenihki", "keniki", "kenin", "kenikatsa", "queniuhqui", "quehatza"],
  keniki: ["kenihki", "kenijki", "kenin", "kenikatsa", "queniuhqui", "quehatza"],
  kenin: ["kenihki", "kenijki", "keniki", "kenikatsa", "queniuhqui", "quehatza"],
  "kenihki motoka": ["kenijki motoka", "keniki motoka", "kenin motoka", "tlen motoka", "kenikatsa motoka", "queniuhqui motocah", "queniuhqui motokah", "queniuhqui motoca"],
  "kenijki motoka": ["kenihki motoka", "keniki motoka", "kenin motoka", "tlen motoka", "kenikatsa motoka", "queniuhqui motocah", "queniuhqui motokah", "queniuhqui motoca"],
  "keniki motoka": ["kenihki motoka", "kenijki motoka", "kenin motoka", "tlen motoka", "kenikatsa motoka", "queniuhqui motocah", "queniuhqui motokah", "queniuhqui motoca"],
  "kenin motoka": ["kenihki motoka", "kenijki motoka", "keniki motoka", "tlen motoka", "kenikatsa motoka", "queniuhqui motocah", "queniuhqui motokah", "queniuhqui motoca"],
  "tlen motoka": ["kenihki motoka", "kenijki motoka", "keniki motoka", "kenin motoka", "kenikatsa motoka", "queniuhqui motocah", "queniuhqui motokah", "queniuhqui motoca"],
  notoka: ["notocah", "notokah", "notocaj", "notōcah"],
  motoka: ["motocah", "motokah", "motocaj", "motōcah"],
  itoka: ["itocah", "itokah", "itocaj", "ītōcah"],
  intoka: ["intocah", "intokah", "intocaj", "intōcah"],
};

export function normalizeAnswer(input: string): string {
  return toInaliOrthography(input)
    .toLowerCase()
    .trim()
    .replace(/l{2,}/g, "l")
    .replace(/^[¿¡.,;:?!"'“”‘’()[\]{}]+|[¿¡.,;:?!"'“”‘’()[\]{}]+$/g, "")
    .replace(/\s+/g, " ");
}

export function answerMatches(input: string, expected: string, accepted: string[] = []): boolean {
  const normalizedInput = normalizeAnswer(input);
  return [expected, ...accepted].some((answer) => {
    const normalizedAnswer = normalizeAnswer(answer);
    return (
      normalizedAnswer === normalizedInput ||
      (ANSWER_EQUIVALENTS[normalizedAnswer] ?? []).some(
        (equivalent) => normalizeAnswer(equivalent) === normalizedInput
      )
    );
  });
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
