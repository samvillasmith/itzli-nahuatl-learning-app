import { readFileSync } from "node:fs";
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

function learnerText(value: unknown): string {
  return JSON.stringify(value);
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

  it("does not teach Classical ō-augmented past paradigms", () => {
    for (const text of [lessons, labs, focusCards, tutorPrompt]) {
      expect(text).not.toMatch(/ōnihuetz|ōnitequitic|ōniquicōhuac|ōniihhuia/iu);
    }
    expect(tutorPrompt).not.toMatch(/o- prefix \+ -k\/|-ki → oni/iu);
  });

  it("uses EHN second-person plural and object markers", () => {
    for (const text of [lessons, labs, tutorPrompt]) {
      expect(text).not.toMatch(/antequit|amechmaka|amo- \(your pl/iu);
    }
    expect(lessons).toContain("intequitih");
    expect(tutorPrompt).toContain("mech- (you all)");
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
    expect(imageMetadata).toContain("pāquiliztli: party");
    expect(imageMetadata).toContain("tzahtzi: to cry");
    expect(imageMetadata).toContain("Nichīlmola: I grind chili peppers");
    expect(imageMetadata).not.toMatch(/fourten|kneed chilli|salty salt|mi pequeña tía/iu);
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
