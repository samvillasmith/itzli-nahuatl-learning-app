import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  joinGuidedAnswerTokens,
  orderGuidedAnswerTokens,
  splitGuidedAnswer,
} from "../src/components/GuidedAnswerBuilder";
import {
  buildContextFillBlanks,
  buildSequence,
  type FillBlank,
  type VocabCard,
} from "../src/app/units/[unitId]/LessonFlow";
import {
  getAllPrimerVocab,
  getAllUnits,
  getUnitConstructions,
  getUnitDialogueContent,
  getUnitVocab,
} from "../src/lib/db";
import { getGrammarLabsForUnit } from "../src/data/grammar-labs";

describe("guided sentence learning", () => {
  it("builds a stable word puzzle without losing punctuation or duplicate words", () => {
    const answer = "Tlan tiyāuh, niyāuh niyāuh.";
    const tokens = splitGuidedAnswer(answer);
    const ordered = orderGuidedAnswerTokens(tokens);

    expect(joinGuidedAnswerTokens(tokens)).toBe(answer);
    expect(ordered.map((token) => token.id)).not.toEqual(tokens.map((token) => token.id));
    expect([...ordered].sort((a, b) => a.id - b.id)).toEqual(tokens);
    expect(orderGuidedAnswerTokens(tokens)).toEqual(ordered);
  });

  it("keeps complete dialogue lines out of the vocabulary-card sequence", () => {
    const lessonFlow = readFileSync(
      join(process.cwd(), "src/app/units/[unitId]/LessonFlow.tsx"),
      "utf8",
    );

    expect(lessonFlow).not.toContain("sentenceProduce");
    expect(lessonFlow).not.toContain("buildUnitPhraseCards");
    expect(lessonFlow).not.toContain("Type the Nahuatl sentence");
    expect(lessonFlow).toContain("mergeLearningCards(filteredVocab)");
    expect(lessonFlow).toContain("buildContextFillBlanks");
  });

  it("uses guided assembly for multiword grammar answers in both lesson surfaces", () => {
    const unitLesson = readFileSync(
      join(process.cwd(), "src/app/units/[unitId]/LessonFlow.tsx"),
      "utf8",
    );
    const grammarLesson = readFileSync(
      join(process.cwd(), "src/app/grammar/[topic]/GrammarLesson.tsx"),
      "utf8",
    );

    expect(unitLesson).toContain("<GuidedAnswerBuilder");
    expect(grammarLesson).toContain("<GuidedAnswerBuilder");
    expect(unitLesson).toContain("splitGuidedAnswer(answer).length > 1");
    expect(grammarLesson).toContain("splitGuidedAnswer(answer).length > 1");
  });

  it("places a context puzzle only after the mini-group that teaches its target", () => {
    const cards: VocabCard[] = ["piyali", "tlaskamati", "kwalli", "axkanah"].map(
      (headword, index) => ({
        id: index + 1,
        headword,
        gloss_en: headword,
        part_of_speech: "word",
      }),
    );
    const fill: FillBlank = {
      prompt: "___ kwalli.",
      fullSentence: "Axkanah kwalli.",
      translation: "It is not good.",
      gloss: "no",
      answer: "axkanah",
      baseHeadword: "axkanah",
      options: ["axkanah", "kwalli"],
      targetKey: "axkanah",
      source: "construction",
    };

    const sequence = buildSequence(cards, [0, 1, 2, 3], [fill], [], cards, 3, [], false, cards);
    const fillIndex = sequence.findIndex((step) => step.kind === "fillBlank");
    const targetLearnIndex = sequence.findIndex(
      (step) => step.kind === "learn" && step.wordIdx === 3,
    );

    expect(fillIndex).toBeGreaterThan(targetLearnIndex);
  });

  it("turns reviewed dialogue usage into a targeted missing-word example", () => {
    const card: VocabCard = {
      id: 1,
      headword: "tlaskamati",
      gloss_en: "thank you",
      part_of_speech: "expression",
    };
    const knownCard: VocabCard = {
      id: 2,
      headword: "kwalli",
      gloss_en: "good",
      part_of_speech: "adjective",
    };
    const examples = buildContextFillBlanks(
      [card],
      [card, knownCard],
      [],
      [{
        lesson_dialogue_id: "unit-1-line-1",
        speaker_label: "A",
        utterance_normalized: "Kwalli, tlaskamati.",
        translation_en: "Good, thank you.",
        audio_available: true,
      }],
      [card, knownCard],
      4,
    );

    expect(examples).toHaveLength(1);
    expect(examples[0]).toMatchObject({
      prompt: "Kwalli, ___.",
      fullSentence: "Kwalli, tlaskamati.",
      answer: "tlaskamati",
      baseHeadword: "tlaskamati",
      targetKey: "tlaskamati",
      source: "dialogue",
    });
    expect(examples[0].audioSrc).toContain("unit-1-line-1");
  });

  it("provides reviewed context puzzles throughout the real course", () => {
    const pool = getAllPrimerVocab();
    let contextCount = 0;
    let unitsWithContext = 0;

    for (const unit of getAllUnits()) {
      const cards = getUnitVocab(unit.lesson_number);
      let unitContextCount = 0;
      const maxWords = unit.lesson_number <= 5 ? 4 : unit.lesson_number <= 15 ? 5 : unit.lesson_number <= 30 ? 7 : 9;

      for (let start = 0; start < cards.length; start += 10) {
        const chunk = cards.slice(start, start + 10);
        const introduced = cards.slice(0, start + 10);
        const grammarExamples = getGrammarLabsForUnit(unit.lesson_number).flatMap((lab) =>
          lab.examples.map((example) => ({
            example_original: example.nahuatl,
            construction_label: lab.title,
            translation_en: example.translation,
          })),
        );
        const examples = buildContextFillBlanks(
          chunk,
          introduced,
          [...getUnitConstructions(unit.lesson_number), ...grammarExamples],
          getUnitDialogueContent(unit.lesson_number),
          pool,
          maxWords,
        );
        unitContextCount += examples.length;
      }

      contextCount += unitContextCount;
      if (unitContextCount > 0) unitsWithContext += 1;
    }

    expect(contextCount).toBeGreaterThanOrEqual(60);
    expect(unitsWithContext).toBeGreaterThanOrEqual(20);
  });
});
