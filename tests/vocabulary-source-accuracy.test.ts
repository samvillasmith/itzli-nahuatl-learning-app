import { describe, expect, it } from "vitest";
import sourceCourse from "../src/data/nahuatlahtolli-course.json";
import { getUnitVocab } from "../src/lib/db";
import { vocabCardAudioUrl } from "../src/lib/audio";
import { toInaliOrthography } from "../src/lib/orthography";
import { isLearnerCardSelected } from "../src/data/course-vocab-selection";

describe("source vocabulary corrections", () => {
  it("withholds disputed plural-future spellings from active card recall", () => {
    for (const id of [811008, 812007, 812008, 812009, 812013, 812014, 812015]) {
      expect(isLearnerCardSelected(Math.floor((id - 800000) / 1000), id)).toBe(false);
    }
    expect(isLearnerCardSelected(12, 812004)).toBe(true);
  });
  it("teaches the source's plural pronouns with the corresponding native recordings", () => {
    const lesson = sourceCourse.lessons.find((item) => item.number === 3)!;
    const cards = getUnitVocab(3);
    for (const [id, index] of [[54, 4], [55, 6], [57, 5]]) {
      const card = cards.find((item) => item.id === id)!;
      const source = lesson.vocabulary[index - 1];
      expect(card.headword).toBe(source.headword);
      expect(card.gloss_en).toBe(source.gloss);
      expect(vocabCardAudioUrl(card.id, card.audioSrc)).toBe(source.audioUrl);
    }
  });

  it("uses full source kinship forms and does not narrow sibling to brother", () => {
    const cards = getUnitVocab(9);
    expect(cards.find((card) => card.id === 203)?.gloss_en).toBe("sibling");
    expect(toInaliOrthography(cards.find((card) => card.id === 206)!.headword)).toBe("nonanan");
    expect(toInaliOrthography(cards.find((card) => card.id === 207)!.headword)).toBe("notatah");
    expect(cards.find((card) => card.id === 204)?.gloss_en).toBe("my grandchild");
  });

  it("keeps corrected conditional and song cards from playing the old word", () => {
    const greeting = getUnitVocab(11).find((card) => card.id === 35)!;
    const conditional = getUnitVocab(30).find((card) => card.id === 661)!;
    const song = getUnitVocab(31).find((card) => card.id === 680)!;
    expect(conditional.headword).toBe("tlan");
    expect(greeting.headword).toBe("Kenihki tiitstok?");
    expect(vocabCardAudioUrl(greeting.id, greeting.audioSrc)).toBeNull();
    expect(song.id).toBe(680);
    expect(song.first_lesson_number).toBe(31);
    expect(song.headword).toBe("huicatl");
    expect(toInaliOrthography(song.headword)).toBe("wikatl");
    expect(song.gloss_en).toBe("song");
    expect(song.sourceUrl).toBe("https://ebible.org/nheNT/MAT11.htm#V17");
    expect(vocabCardAudioUrl(conditional.id, conditional.audioSrc)).toBeNull();
    expect(vocabCardAudioUrl(song.id, song.audioSrc)).toBeNull();
  });
});
