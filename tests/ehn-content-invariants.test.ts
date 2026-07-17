import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GRAMMAR_LESSONS } from "../src/data/grammar-lessons";
import { GRAMMAR_LABS } from "../src/data/grammar-labs";
import { LESSON_FOCUS_CARDS } from "../src/data/lesson-focus-cards";
import {
  isCoreVocabItem,
  SOURCE_VERIFIED_UNLINKED_VOCAB_IDS,
} from "../src/data/excluded-vocab";
import { getAllPrimerVocab } from "../src/lib/db";

const require = createRequire(import.meta.url);
const { validateEhnLine } = require("../scripts/generate-dialogues.js") as {
  validateEhnLine: (text: string) => boolean;
};

function learnerText(value: unknown): string {
  return JSON.stringify(value);
}

const CLASSICAL_PAST_AUGMENT = /\bō(?:ni|ti|qui|mo|tla|an|in)[a-zāēīō]/u;
const DECLARATIVE_AMO = /(^|[\s"“¡¿(])[Āā]mo\b(?!\s+xi)/u;
const LOCATIVE_CAH = /\bnicah\b|\bticah\b/u;

function collectNamedStrings(value: unknown, keys: Set<string>): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectNamedStrings(item, keys));

  return Object.entries(value).flatMap(([key, entry]) => {
    if (keys.has(key) && typeof entry === "string") return entry.split("\n");
    if (keys.has(key) && Array.isArray(entry)) {
      return entry.filter((item): item is string => typeof item === "string");
    }
    return collectNamedStrings(entry, keys);
  });
}

function extractDialogueLines(source: string): string[] {
  return [...source.matchAll(/\behn:\s*"([^"]+)"/gu)].map((match) => match[1]);
}

describe("Eastern Huasteca content invariants", () => {
  const lessons = learnerText(GRAMMAR_LESSONS);
  const labs = learnerText(GRAMMAR_LABS);
  const focusCards = learnerText(LESSON_FOCUS_CARDS);
  const dialogueGenerator = readFileSync(
    join(process.cwd(), "scripts/generate-dialogues.js"),
    "utf8",
  );
  const tutorPrompt = readFileSync(
    join(process.cwd(), "src/lib/chat-system-prompt.ts"),
    "utf8",
  );
  const curatedVocab = readFileSync(
    join(process.cwd(), "scripts/add-curated-vocab.js"),
    "utf8",
  );
  const imageMetadata = readFileSync(
    join(process.cwd(), "src/data/openai-word-images.json"),
    "utf8",
  );
  const lessonNahuatl = collectNamedStrings(GRAMMAR_LESSONS, new Set(["nahuatl", "breakdown"]));
  const labNahuatl = collectNamedStrings(
    GRAMMAR_LABS,
    new Set(["nahuatl", "breakdown", "answer", "accepted"]),
  );
  const focusCardNahuatl = LESSON_FOCUS_CARDS.map((card) => card.headword);
  const dialogueNahuatl = extractDialogueLines(dialogueGenerator);

  it("does not teach Classical ō-augmented past paradigms", () => {
    for (const text of [lessons, labs, focusCards, tutorPrompt]) {
      expect(text).not.toMatch(/ōnihuetz|ōnitequitic|ōniquicōhuac|ōniihhuia/iu);
    }
    expect(dialogueNahuatl.filter((line) => CLASSICAL_PAST_AUGMENT.test(line))).toEqual([]);
    expect(tutorPrompt).not.toMatch(/o- prefix \+ -k\/|-ki → oni/iu);
    expect(CLASSICAL_PAST_AUGMENT.test("ōme")).toBe(false);
    expect(CLASSICAL_PAST_AUGMENT.test("ōlōtl")).toBe(false);
    expect(CLASSICAL_PAST_AUGMENT.test("ōcsepa")).toBe(false);
  });

  it("does not teach declarative āmo outside prohibitives", () => {
    const nahuatlLines = [...lessonNahuatl, ...labNahuatl, ...focusCardNahuatl, ...dialogueNahuatl];
    expect(nahuatlLines.filter((line) => DECLARATIVE_AMO.test(line))).toEqual([]);
    expect(DECLARATIVE_AMO.test("Āmo xichoca")).toBe(false);
    expect(DECLARATIVE_AMO.test("ayamo")).toBe(false);
    expect(DECLARATIVE_AMO.test("Āmo cuālli")).toBe(true);
  });

  it("uses EHN second-person plural and object markers", () => {
    for (const text of [lessons, labs, tutorPrompt]) {
      expect(text).not.toMatch(/antequit|amechmaka|amo- \(your pl|anmomachtiah|\banmo/iu);
    }
    expect(lessons).toContain("intequitih");
    expect(tutorPrompt).toContain("mech- (you all)");
  });

  it("uses itztoc rather than Classical nicah or ticah", () => {
    const nahuatlLines = [...lessonNahuatl, ...labNahuatl, ...focusCardNahuatl, ...dialogueNahuatl];
    expect(nahuatlLines.filter((line) => LOCATIVE_CAH.test(line))).toEqual([]);
  });

  it("uses tlan, akkia/acquiya, and axcanah in authored examples", () => {
    expect(lessons).not.toMatch(/\bIntla\b/u);
    expect(labs).not.toMatch(/\bIntla\b/u);
    expect(dialogueGenerator).not.toMatch(/\bIntlā\b/u);
    expect(dialogueGenerator).not.toMatch(/¿Āquin/iu);
    expect(lessons).toContain("Tlan nitequiti");
    expect(focusCards).not.toMatch(/\bintla\b/iu);
  });

  it("keeps known meaning-changing errors out of grammar", () => {
    expect(lessons).not.toMatch(/kikkwa|Ximonechilhui|ticcuahcuepaāh/iu);
    expect(lessons).not.toMatch(/makilia.{0,80}give/iu);
  });

  it("does not teach broader morning expressions as core Chicontepec greetings", () => {
    expect(isCoreVocabItem({ id: 164, gloss_en: "good morning" }, 7)).toBe(false);
    expect(isCoreVocabItem({ id: 7697, gloss_en: "good morning" }, 11)).toBe(false);
    expect(curatedVocab).not.toContain("dawn-time greeting");
  });

  it("quarantines secondary imports unless matched to the native course", () => {
    expect(isCoreVocabItem({ id: 7000, entry_id: "kaikki:test", gloss_en: "test" }, 40)).toBe(false);
    expect(isCoreVocabItem({ id: 6110, entry_id: "native:tecciztli", gloss_en: "egg" }, 38)).toBe(true);
  });

  it("keeps corrected vocabulary metadata and native EHN senses", () => {
    const metadata = JSON.parse(imageMetadata) as Record<string, { alt: string }>;
    expect(metadata["pāquiliztli"].alt).toBe("Illustration for pāquiliztli: joy, happiness");
    expect(metadata.tzahtzi.alt).toBe("Illustration for tzahtzi: to shout, to yell");
    expect(metadata.tlakemitl.alt).toBe("Illustration for tlakemitl: garment, clothing");
    expect(metadata.achiyok.alt).toBe("Illustration for achiyok: a little more, still more");
    expect(metadata.anihueliti.alt).toBe("Illustration for anihueliti: I cannot (ax + nihueliti)");
    expect(metadata.molōni.alt).toBe("Illustration for molōni: to boil, to bubble up (intransitive)");
    expect(metadata.Nichīlmola.alt).toBe("Illustration for Nichīlmola: I grind chiles into salsa");
    expect(metadata["mahtlactli huan nahui"].alt).toContain("fourteen");
    expect(metadata.nopilahui.alt).toBe("Illustration for nopilahui: my dear little aunt");
    expect(metadata["pāquiliztli"].alt).not.toContain("party");
    expect(imageMetadata).not.toMatch(/I want anymore|To can not|To be suffer pain|fourten|mi pequeña tía/iu);
  });

  it("quarantines malformed and unsupported image-vocabulary headwords", () => {
    const quarantined = [
      "tlalteuhnemitia",
      "lalakatik",
      "quechpechin",
      "ceboiz",
      "altepet",
      "conē – tl",
      "momachti – hquetl",
      "Ni – momachtia",
    ];
    for (const headword of quarantined) {
      expect(isCoreVocabItem({ id: 999_999, headword, gloss_en: "test" })).toBe(false);
    }
  });

  it("quarantines every unsupported form found in the final vocabulary audit", () => {
    const excluded = [103, 169, 220, 221, 542, 575, 632, 689];
    for (const id of excluded) {
      expect(isCoreVocabItem({ id, gloss_en: "test" })).toBe(false);
    }
  });

  it("allows comparative or Classical labels only when primary-source verified", () => {
    const vocab = getAllPrimerVocab();
    const widerDialectRows = vocab.filter((entry) =>
      ["Comparative_only", "Classical_citation"].includes(entry.semantic_domain),
    );
    expect(widerDialectRows.length).toBeGreaterThan(0);
    for (const entry of widerDialectRows) {
      expect(SOURCE_VERIFIED_UNLINKED_VOCAB_IDS.has(entry.id)).toBe(true);
    }
  });

  it("publishes the final primary-source gloss corrections", () => {
    const byId = new Map(getAllPrimerVocab().map((entry) => [entry.id, entry.gloss_en]));
    expect(byId.get(97)).toBe("tortilla maker; woman who makes tortillas");
    expect(byId.get(100)).toBe("counting; account; number");
    expect(byId.get(228)).toBe("sister-in-law; female in-law");
    expect(byId.get(413)).toBe("poncho");
    expect(byId.get(449)).toBe("dead person; deceased person");
    expect(byId.get(457)).toBe("mandarin orange; tangerine");
  });
});

describe("generated Eastern Huasteca line validation", () => {
  const oldFewShots = [
    "Āmo mātzin. Zan noconepiyah nohueltiuh huan noicniuh.",
    "Āmo cuālli. Ōnihuetz pan ohtli.",
    "¿Āmo ōtimomāuh?",
    "Āmo, ōnicuēp nicān. Cuālli nicah āxcan.",
    "Āmo ximolinquih. Tiyāzqueh ōcsepa.",
    "¡Āmo cuālli! ¿Ōtiquīzac tiānquiz?",
  ];
  const correctedFewShots = [
    "Ayamo. Zan noconepiyah nohueltiuh huan noicniuh.",
    "Axcanah cuālli. Nihuetzqui pan ohtli.",
    "¿Axcanah timomauhtihqui?",
    "Axcanah, nimocuapqui nicān. Cuālli niitztoc āxcan.",
    "Āmo ximotequipacho. Tiyāzqueh ōcsepa.",
    "¡Axcanah cuālli! ¿Tiquīzqui tiānquiz?",
  ];

  it("rejects the superseded few-shots and accepts their corrected EHN replacements", () => {
    for (const line of oldFewShots) expect(validateEhnLine(line)).toBe(false);
    for (const line of correctedFewShots) expect(validateEhnLine(line)).toBe(true);
  });

  it("rejects other banned Classical and second-person plural markers", () => {
    for (const line of ["Aquin tlahtoa?", "Intla tiyāuh", "Cuālli nicah", "anmomachtiah", "amechmaca"]) {
      expect(validateEhnLine(line)).toBe(false);
    }
    expect(validateEhnLine("Āmo xichoca")).toBe(true);
    expect(validateEhnLine("Ayamo")).toBe(true);
  });
});
