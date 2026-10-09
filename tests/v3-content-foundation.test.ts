import { describe, expect, it } from "vitest";
import course from "../src/data/nahuatlahtolli-course.json";
import curatedSpecs from "../src/data/curated-unit-vocab.json";
import identities from "../src/data/source-vocab-identity.json";
import { buildCuratedUnitVocab, CURATED_UNIT_VOCAB, type CuratedUnitVocabSpec } from "../src/data/curated-unit-vocab";
import { buildSourceVocabPromotions, SOURCE_VOCAB_PROMOTIONS } from "../src/data/source-vocab-promotions";
import { getExpansionEntries, getExpansionPacks, getLexicalEntry, getLexicalRegistry } from "../src/data/lexical-expansion";
import { getLegacyCardIdentity, getLexicalReviewQueue } from "../src/data/lexical-registry";
import { getConversationScenarios, getSentencePatterns, renderSentenceTemplate } from "../src/data/conversation-scenarios";
import { getAllPrimerVocab, getUnitVocab } from "../src/lib/db";
import { toInaliOrthography } from "../src/lib/orthography";
import { getExistingPhraseRecording } from "../src/data/recording-reuse";

const textKey = (value: string) => value.toLowerCase().replace(/[¿¡?!.,:;“”"/]/g, "").replace(/\s+/g, " ").trim();

describe("V3 source-backed content foundation", () => {
  it("preserves the pre-V3 curated and promoted identities explicitly", () => {
    const originalIndexes = new Map<number, number>();
    for (const spec of curatedSpecs) {
      const unitIndex = (originalIndexes.get(spec.unit) ?? 0) + 1;
      originalIndexes.set(spec.unit, unitIndex);
      expect(spec.id).toBe(900000 + spec.unit * 100 + unitIndex);
      expect(spec.entry_id).toBe(`curated-${spec.unit}-${unitIndex}`);
      expect(CURATED_UNIT_VOCAB.find((item) => item.id === spec.id)?.headword).toBeDefined();
    }
    expect(curatedSpecs).toHaveLength(75);
    expect(identities).toHaveLength(240);
    for (const identity of identities) {
      expect(identity.id).toBe(800000 + identity.sourceLesson * 1000 + identity.sourceIndex);
      expect(identity.entry_id).toBe(`source-${identity.sourceLesson}-${identity.sourceIndex}`);
      expect(SOURCE_VOCAB_PROMOTIONS.find((item) => item.id === identity.id)?.entry_id).toBe(identity.entry_id);
      expect(getLegacyCardIdentity(identity.id).sourceSpelling).toBe(identity.sourceSpelling);
    }
    expect(getLegacyCardIdentity(35).cardId).toBe(35);
    expect(getLegacyCardIdentity(35).lemmaStatus).toBe("unmapped");
    expect(buildCuratedUnitVocab([...curatedSpecs].reverse() as CuratedUnitVocabSpec[]).sort((a, b) => a.id - b.id))
      .toEqual([...CURATED_UNIT_VOCAB].sort((a, b) => a.id - b.id));
    expect(buildSourceVocabPromotions([...identities].reverse()).sort((a, b) => a.id - b.id))
      .toEqual([...SOURCE_VOCAB_PROMOTIONS].sort((a, b) => a.id - b.id));
    expect(() => buildSourceVocabPromotions([{ ...identities[0], sourceSpelling: "invented" }]))
      .toThrow("Source identity changed");
  });

  it("adds 73 immutable source forms in separate packs without altering legacy unit cards", () => {
    const entries = getExpansionEntries();
    expect(entries).toHaveLength(73);
    expect(new Set(entries.map((item) => item.id)).size).toBe(73);
    for (const field of ["cardId", "lexemeId", "senseId", "formId"] as const) {
      expect(new Set(entries.map((item) => item[field])).size).toBe(73);
    }
    const legacyIds = new Set([...CURATED_UNIT_VOCAB, ...SOURCE_VOCAB_PROMOTIONS].map((item) => item.id));
    for (const entry of entries) {
      expect(legacyIds.has(entry.cardId)).toBe(false);
      expect(getLexicalEntry(entry.formId)?.cardId).toBe(entry.cardId);
      const source = course.lessons.find((lesson) => lesson.number === entry.source.lessonNumber)!;
      const word = source.vocabulary[entry.source.vocabularyIndex! - 1];
      expect(entry.sourceSpelling).toBe(word.headword);
      expect(entry.audio.url).toBe(word.audioUrl);
      expect(entry.audio.scope).toBe("isolated-word");
      expect(entry.source.url).toBe(source.originalUrl);
      expect(entry.source.license).toBe("CC BY-SA (publisher listing; version unspecified)");
      expect(entry.source.authors).toEqual(course.source.authors);
      expect(entry.english.length).toBeGreaterThan(0);
      expect(entry.spanish.length).toBeGreaterThan(0);
      expect(entry.review.status).toBe("source-supported");
      expect(entry.formKind).toBe("source-headword");
    }
    expect(getExpansionPacks().flatMap((pack) => pack.entryIds).sort()).toEqual(entries.map((entry) => entry.id).sort());
    expect(entries.some((entry) => entry.sourceSpelling === "nextli")).toBe(false);
    expect(entries.some((entry) => /zceh|zqueh/.test(entry.headword))).toBe(false);
  });

  it("keeps the expansion genuinely separate from all current unit forms", () => {
    const key = (value: string) => toInaliOrthography(value.replace(/\(ø\)/g, ""))
      .toLowerCase().replace(/^[\/]+|[\/]+$/g, "").replace(/[¿¡!?.,;:"()]/g, "").replace(/\s+/g, " ").trim();
    const current = new Set(Array.from({ length: 43 }, (_, index) => getUnitVocab(index + 1)).flat().map((word) => key(word.headword)));
    expect(getAllPrimerVocab()).toHaveLength(460);
    for (const entry of getExpansionEntries()) expect(current.has(key(entry.headword))).toBe(false);
    expect(new Set(getExpansionEntries().map((entry) => key(entry.headword))).size).toBe(73);
  });

  it("has six reachable complete conversation graphs with repetition and real reply branches", () => {
    const scenarios = getConversationScenarios();
    expect(scenarios.map((item) => item.id)).toEqual(["introductions", "family", "food-market", "directions-visiting", "daily-plans", "experiences"]);
    for (const scenario of scenarios) {
      const reachable = new Set<string>();
      const queue = [scenario.startTurnId];
      while (queue.length) {
        const id = queue.pop()!;
        if (reachable.has(id)) continue;
        reachable.add(id);
        const turn = scenario.turns.find((item) => item.id === id)!;
        expect(turn).toBeDefined();
        for (const option of turn.options.filter((item) => item.correct && item.nextTurnId)) queue.push(option.nextTurnId!);
      }
      expect(reachable.size).toBe(scenario.turns.length);
      expect(scenario.turns.some((turn) => turn.options.length === 0)).toBe(true);
      expect(scenario.review.status).toBe("source-adaptation");
      for (const turn of scenario.turns) {
        if (turn.options.length) {
          expect(turn.options.some((option) => option.correct && option.intent === "reply")).toBe(true);
          const repeat = turn.options.find((option) => option.intent === "repeat")!;
          expect(repeat.nextTurnId).toBe(turn.id);
          expect(repeat.nahuatl).toBe("Zampa xiquihto");
        }
        expect(turn.prompt.en).toBeTruthy();
        expect(turn.prompt.es).toBeTruthy();
        for (const value of [turn, ...turn.options]) {
          const source = value.sources[0];
          const lesson = course.lessons.find((item) => item.number === source.lessonNumber)!;
          const sourceText = [...lesson.sections.flatMap((section) => section.body), ...lesson.vocabulary.map((item) => item.headword)].join(" ");
          expect(textKey(sourceText)).toContain(textKey(value.nahuatl));
          if (value.audioUrl) {
            if (value.audioKind === "source") {
              const sourceWord = lesson.vocabulary.find((item) => textKey(item.headword) === textKey(value.nahuatl));
              expect(sourceWord?.audioUrl).toBe(value.audioUrl);
            } else {
              const recording = getExistingPhraseRecording(value.nahuatl, value.english);
              expect(recording?.url).toBe(value.audioUrl);
              expect(recording?.pronunciationStatus).toBe("not-certified");
            }
          }
          expect(value.english).toBeTruthy();
          expect(value.spanish).toBeTruthy();
        }
      }
    }
    const branches = scenarios.flatMap((item) => item.turns).filter((turn) => new Set(turn.options.filter((option) => option.correct && option.intent === "reply").map((option) => option.nextTurnId)).size > 1);
    expect(branches.length).toBeGreaterThanOrEqual(3);
  });

  it("separates lexical identities, senses, and attested forms without certifying legacy lemmas", () => {
    const registry = getLexicalRegistry();
    expect(registry.lexemes).toHaveLength(73);
    expect(registry.senses).toHaveLength(73);
    expect(registry.forms).toHaveLength(73);
    for (const form of registry.forms) {
      const lexeme = registry.lexemes.find((item) => item.id === form.lexemeId)!;
      expect(lexeme.citationStatus).toBe("source-headword");
      expect(lexeme.formIds).toContain(form.id);
      for (const id of form.senseIds) expect(registry.senses.find((sense) => sense.id === id)?.lexemeId).toBe(lexeme.id);
    }
  });

  it("keeps whole-passage audio distinct from exact utterance audio and avoids a false market total", () => {
    const directions = getConversationScenarios().find((item) => item.id === "directions-visiting")!;
    expect(directions.sourceAudio[0].scope).toBe("whole-passage");
    expect(directions.turns.find((item) => item.id === "welcome")?.audioUrl).toBeNull();
    const market = getConversationScenarios().find((item) => item.id === "food-market")!;
    expect(market.turns.flatMap((item) => [item.nahuatl, ...item.options.map((option) => option.nahuatl)]).join(" ")).not.toContain("120");
  });

  it("personalizes only the attested name and origin frames and rejects grammar-bearing slots", () => {
    expect(renderSentenceTemplate("my-name", { name: "María Elena" })).toEqual({ nahuatl: "Na notōcah María Elena.", en: "My name is María Elena.", es: "Me llamo María Elena." });
    expect(renderSentenceTemplate("my-origin", { place: "Chicontepec" })?.nahuatl).toBe("Na niēhua Chicontepec.");
    expect(renderSentenceTemplate("my-name", { name: "Juana. Nitequitiz" })).toBeNull();
    expect(renderSentenceTemplate("my-name", { name: "" })).toBeNull();
    expect(renderSentenceTemplate("my-name", { name: "a".repeat(61) })).toBeNull();
    expect(renderSentenceTemplate("my-name", { name: "Juana", verb: "tequiti" })).toBeNull();
    expect(renderSentenceTemplate("singular-plans", { verb: "invented" })).toBeNull();
    expect(getSentencePatterns().filter((item) => item.template).map((item) => item.id)).toEqual(["my-name", "my-origin"]);
  });

  it("keeps unresolved source and legacy lemma questions in a disabled review queue", () => {
    expect(getLexicalReviewQueue().length).toBeGreaterThanOrEqual(3);
    for (const review of getLexicalReviewQueue()) {
      expect(review.learnerRecallEnabled).toBe(false);
      expect(review.reason.en).toBeTruthy();
      expect(review.reason.es).toBeTruthy();
    }
  });
});
