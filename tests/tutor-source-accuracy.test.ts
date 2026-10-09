import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import course from "../src/data/nahuatlahtolli-course.json";
import { getSystemPrompt, refusalForLocale } from "../src/lib/chat-system-prompt";
import { normalizeAnswer } from "../src/lib/grammar-engine";

const require = createRequire(import.meta.url);
type Chunk = {
  kind: string;
  content: string;
  metadata: {
    phrase?: string;
    headword?: string;
    source_urls?: string[];
    source_lesson_numbers?: number[];
    source_url?: string;
    evidence_scope: string;
    source_license?: string;
    source_license_url?: string;
    source_license_listing_url?: string;
    source_license_version_confirmed?: boolean;
    contribution_license?: string;
    contribution_license_url?: string;
  };
};
const rag = require("../scripts/rag-populate.js") as {
  buildVocabChunks: (rows: Array<Record<string, unknown>>) => Chunk[];
  loadPhrases: () => Chunk[];
  loadGrammar: () => Chunk[];
  loadMorphology: () => Chunk[];
};

function sourceText(numbers: number[]) {
  return normalizeAnswer(course.lessons
    .filter((lesson) => numbers.includes(lesson.number))
    .flatMap((lesson) => lesson.sections.flatMap((section) => section.body))
    .join(" "));
}

describe("source-first tutor and local retrieval content", () => {
  it("keeps accuracy limits in both modes and both explanation languages", () => {
    for (const mode of ["tutor", "practice"] as const) {
      for (const locale of ["en", "es"] as const) {
        const prompt = getSystemPrompt(mode, locale);
        expect(prompt).toContain(refusalForLocale(locale));
        expect(prompt).toContain("Retrieval is not proof of accuracy");
        expect(prompt).toContain("Do not freely conjugate, pluralize, possess, or derive");
        expect(prompt).toContain("withhold unsupported forms");
        expect(prompt).toContain("not permission to generate arbitrary words");
        expect(prompt).toContain(locale === "es"
          ? "All explanations, glosses, corrections, interface-facing prose, and translation lines MUST be in natural Mexican Spanish"
          : "## OUTPUT LANGUAGE: ENGLISH");
      }
    }
  });

  it("does not retain obsolete tutor rules and personal examples", () => {
    const prompt = getSystemPrompt("practice");
    expect(prompt).toContain("imperfect -yaya");
    expect(prompt).toContain("-toya is not a suffix to append to every action verb");
    expect(prompt).toContain("inmo- (your plural), inin- (their)");
    expect(prompt).toContain("Do not claim personal residence, lived experience, or native-speaker authority");
    expect(prompt).not.toMatch(/Nicha ipan Huasteca|Kenihki tiistok|When in doubt, leave object prefixes off|on[i]?tequitic/iu);
    expect(prompt).toContain("transcription/pronunciation question needs review");
    for (const form of ["nichōcac", "niccōuhqui", "nitlacuāhqui"]) {
      expect(sourceText([14, 15, 16])).toContain(normalizeAnswer(form));
      expect(prompt).toContain(form);
    }
  });

  it("retrieves only the selected phrases with traceable course references", () => {
    const phrases = rag.loadPhrases();
    expect(phrases).toHaveLength(10);
    for (const chunk of phrases) {
      expect(chunk.metadata.source_urls?.length).toBeGreaterThan(0);
      expect(chunk.metadata.evidence_scope).toContain("not universal EHN certification");
      expect(sourceText(chunk.metadata.source_lesson_numbers!))
        .toContain(normalizeAnswer(chunk.metadata.phrase!));
    }
    expect(phrases.map((chunk) => chunk.content).join(" "))
      .not.toMatch(/nicha|tiistok|niistok/iu);
  });

  it("separates the verified publisher label from original Itzli contribution licensing", () => {
    for (const chunk of [...rag.loadPhrases(), ...rag.loadGrammar()]) {
      expect(chunk.metadata.source_license).toBe("CC BY-SA (publisher listing; version unspecified)");
      expect(chunk.metadata.source_license_version_confirmed).toBe(false);
      expect(chunk.metadata.source_license_url).toBe(course.source.oerListingUrl);
      expect(chunk.metadata.source_license_listing_url).toBe(course.source.oerListingUrl);
      expect(chunk.metadata.contribution_license).toBe("CC BY-SA 4.0");
      expect(chunk.metadata.contribution_license_url).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
    }
    // Frozen historical import remains evidence, rather than being rewritten to
    // disguise the importer's unconfirmed source-license version.
    expect(course.source.license.shortName).toBe("CC BY-SA 4.0");
  });

  it("applies learner exclusions and source replacements without erasing warnings", () => {
    const base = { entry_id: null, part_of_speech: "noun", semantic_domain: "family", lesson_number: 9, rank: 1 };
    const rows = [
      { ...base, id: 206, headword: "nonana", display_form: "nonana", gloss_en: "my mother" },
      { ...base, id: 99901, headword: "chichi", display_form: "chichi", gloss_en: "dog [⚠️ uncertain]" },
      { ...base, id: 99902, headword: "chichi", display_form: "chichi", gloss_en: "dog", entry_id: "dictionary-candidate" },
      { ...base, id: 99903, headword: "chichi", display_form: "chichi", gloss_en: "dog", semantic_domain: "Classical_citation" },
      { ...base, id: 103, headword: "yaotl", display_form: "yaotl", gloss_en: "soldier" },
    ];
    const chunks = rag.buildVocabChunks(rows);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].metadata.headword).toBe("nonanān");
    expect(chunks[0].metadata.source_url).toBe(course.lessons.find((lesson) => lesson.number === 9)!.originalUrl);
    expect(chunks[0].content).toContain("my mother");
  });

  it("withholds unreviewed morphology and narrows grammar retrieval to learned examples", () => {
    expect(rag.loadMorphology()).toEqual([]);
    const grammar = rag.loadGrammar();
    for (const chunk of grammar) {
      expect(chunk.metadata.source_lesson_numbers?.length).toBeGreaterThan(0);
      expect(chunk.metadata.evidence_scope).toContain("not universal EHN certification");
    }
    const text = grammar.map((chunk) => chunk.content).join(" ");
    expect(text).toContain("imperfect -yaya and plural -yayah");
    expect(text).toContain("inmo- (your plural), inin- (their)");
    expect(text).toContain("-zceh");
    expect(text).toContain("remains under review");
    expect(text).not.toMatch(/onitequitic|imperfect uses -ya |Nichan|possesses no native verb|tahuan|amohuan|yahuan/iu);
  });
});
