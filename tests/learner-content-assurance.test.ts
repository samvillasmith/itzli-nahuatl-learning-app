import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import rawSource from "../src/data/nahuatlahtolli-course.json";
import rawLexicon from "../src/data/v3-verified-lexicon.json";
import exclusions from "../src/data/app-content-exclusions.json";
import sourceAudioHolds from "../src/data/audio-learner-exclusions.json";
import instructional from "../src/data/instructional-lesson-blueprints.json";
import { getLearnerSenseExclusionReason, isAppContentExcluded } from "../src/lib/app-content-safety";
import { getAllPrimerVocab, searchVocab } from "../src/lib/db";
import { getInstructionalLessonPayload } from "../src/lib/instructional-lessons";
import { NAHUATLAHTOLLI_COURSE, sanitizeSourceLesson } from "../src/lib/nahuatlahtolli";
import { getUnifiedVocabulary } from "../src/lib/unified-vocabulary";
import { TUTOR_FEATURE_ENABLED } from "../src/lib/features";

describe("independent current learner content assurance", () => {
  it("gives prohibited meanings and exact record identities precedence over educational exceptions", () => {
    for (const [word, meaning] of [
      ["tepol", "vulgar term for penis"], ["xillantli", "vagina (possessed noun reference)"],
      ["kixtilia", "take something from someone; undress"], ["pantalonkixtia", "remove someone’s trousers"],
      ["pepestik", "unclothed; naked"], ["xolohtik", "unclothed person"],
      ["motla", "shoot someone"], ["teleksa", "kick someone"], ["tewia", "hit someone; fight with others"],
      ["wilana", "fight with someone"], ["miktilia", "kill an animal belonging to someone"],
      ["ihsotla", "vomit on someone"], ["mihsotla", "vomit"], ["espoloa", "smear blood on something"],
      ["xipewa", "skin an animal; peel fruit; shuck corn"],
      ["nechyolkokoa", "he or she causes pain in my heart"], ["pechia", "fall onto and crush someone or something"],
    ]) expect(isAppContentExcluded(word, meaning), word).toBe(true);
    for (const held of exclusions.learnerSenseExclusions) {
      expect(isAppContentExcluded("safe display", JSON.stringify({ lexicalEntryId: held.entryId })), held.entryId).toBe(true);
      expect(rawLexicon.entries.some(entry => entry.id === held.entryId)).toBe(true);
    }
  });

  it("preserves target practice, requested care and separately attested everyday meanings", () => {
    for (const meaning of ["shoot at an inanimate target", "to shoot", "firearm shooter", "gun", "bow and arrow",
      "look after someone", "have labor pains", "deceased person", "inject someone", "pour a liquid", "worn-out clothing",
      "bathe", "bath", "peel fruit; cut someone’s hair", "to cut something", "María's foot hurts because she hit herself."])
      expect(getLearnerSenseExclusionReason([meaning]), meaning).toBeNull();
    const words = getUnifiedVocabulary(getAllPrimerVocab());
    for (const display of ["tlamotla", "tlamotlaketl", "mokwitlawia", "kwahkwalo", "mikkatsin", "tsopinia", "teka", "pestetl", "xima", "altia", "maltia"])
      expect(words.some(word => word.display === display), display).toBe(true);
    expect(words.find(word => word.display === "ihtikokoa")).toMatchObject({
      meaningEn: "food causes stomach pain", meaningEs: "un alimento causa dolor de estómago",
    });
    const food = getInstructionalLessonPayload("v3-vocab-body-001")!;
    expect(food.course.phrases.some(phrase => phrase.id === "body-current-model-word-v3rf-050f218449bc3c32-1")).toBe(false);
    expect(food.course.phrases.find(phrase => phrase.id === "body-current-model-word-v3rf-050f218449bc3c32-2")?.english)
      .toBe("The mole dish caused me stomach pain.");
  });

  it("checks actual bilingual lesson phrases, cues, answers and feedback without using the policy regex as its oracle", () => {
    const forbiddenMeaning = /\b(?:rape|intercourse|semen|cum|defecat\w*|feces|urine|urinat\w*|shit|fart|penis|vagina|unclothed|naked|undress\w*|vomit\w*|otomitl)\b|remove (?:someone’s|the identified adult’s) trousers|(?:kick|kicked|hit|shoot|shot) (?:someone|another adult|the identified adult)|kill(?:ed)? (?:another|the known owner’s|another person’s)\b|mató a otra/iu;
    function visibleText(value: unknown, field = ""): string[] {
      if (typeof value === "string") return /source|attribution|license|audio|url|hash|locator|id$/iu.test(field) ? [] : [value];
      if (Array.isArray(value)) return value.flatMap(item => visibleText(item, field));
      if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => /sourceLocator|sources|supplementalSources/iu.test(key) ? [] : visibleText(item, key));
      return [];
    }
    for (const spec of instructional.lessons) {
      const payload = getInstructionalLessonPayload(spec.unitId)!;
      for (const text of visibleText(payload)) expect(forbiddenMeaning.test(text), `${spec.unitId}: ${text}`).toBe(false);
      const phraseIds = new Set(payload.course.phrases.map(phrase => phrase.id));
      const ruleIds = new Set(payload.course.rules.map(rule => rule.id));
      expect(ruleIds.has("v3-vocab-reference-006-final-straggler-rule")).toBe(false);
      for (const id of payload.blueprint.grammarRuleIds) expect(ruleIds.has(id)).toBe(true);
      for (const rule of payload.course.rules) for (const id of rule.phraseIds) expect(phraseIds.has(id)).toBe(true);
      for (const dialogue of payload.blueprint.dialogues) for (const turn of dialogue.turns) {
        expect(phraseIds.has(turn.phraseId)).toBe(true);
        for (const gap of turn.gaps) for (const id of gap.answerPhraseIds ?? []) expect(phraseIds.has(id)).toBe(true);
      }
      for (const dialogue of payload.blueprint.dialogues) {
        const original = spec.blueprint.dialogues.find(candidate => candidate.id === dialogue.id);
        if (original && original.turns.length !== dialogue.turns.length) {
          const projection = exclusions.learnerDialogueContextProjections.find(item => item.dialogueId === dialogue.id);
          expect(dialogue.context.en).toBe(projection?.after.en ??
            "Two adults ask and answer the questions shown in this exchange. Each reply concerns the person or item named by its cue.");
        }
      }
    }
    const retainedIllness = getInstructionalLessonPayload("v3-vocab-conversation-009")!.blueprint.dialogues
      .find(dialogue => dialogue.id === "v3-vocab-conversation-009-conversation-exchange-4")!;
    expect(retainedIllness.context).toEqual({
      en: "Two adults read a fictional account of B working despite illness-related weakness.",
      es: "Dos personas adultas leen un relato ficticio en el que B trabaja pese a la debilidad por una enfermedad.",
    });
    const retainedWork = getInstructionalLessonPayload("v3-vocab-conversation-010")!.blueprint.dialogues
      .find(dialogue => dialogue.id === "v3-vocab-conversation-010-conversation-exchange-0")!;
    expect(retainedWork.context.en).toBe("Two adults discuss B personally taking over work previously assigned to someone else.");
    expect(retainedWork.context.es).toBe("Dos personas adultas hablan de que B se encargue personalmente de un trabajo antes asignado a alguien más.");
    const alcohol = getInstructionalLessonPayload("v3-vocab-conversation-005")!.blueprint.dialogues
      .find(dialogue => dialogue.id === "v3-vocab-conversation-005-conversation-exchange-0")!;
    expect(alcohol.context.en).toContain("made another adult drunk yesterday");
    expect(alcohol.context.en).not.toContain("harmful event");
  });

  it("removes both the child-hitting lines and the graphic native paragraph while preserving source coordinates", () => {
    const original13 = rawSource.lessons.find(lesson => lesson.number === 13)!;
    const selected13 = NAHUATLAHTOLLI_COURSE.lessons.find(lesson => lesson.number === 13)!;
    expect(original13.sections[2].body[48]).toBe("Inmohuantin ahachica inquimāquiliah inmoconēuh.");
    expect(original13.sections[2].body[49]).toBe("“You all hit your child all the time.”");
    const selectedSection = selected13.sections.find(section => section.sourceSectionIndex === 2)!;
    expect(selectedSection.sourceBodyIndices).not.toContain(48);
    expect(selectedSection.sourceBodyIndices).not.toContain(49);
    const original31 = rawSource.lessons.find(lesson => lesson.number === 31)!;
    expect(createHash("sha256").update(original31.sections[2].body[11]).digest("hex"))
      .toBe("2a3b6a75fa9a4b3ff0ae3a4badd4deb769f4a0ef9acccdfd02c046c525a609ba");
    const selected31 = NAHUATLAHTOLLI_COURSE.lessons.find(lesson => lesson.number === 31)!;
    expect(selected31.sections.find(section => section.sourceSectionIndex === 2)!.sourceBodyIndices).not.toContain(11);
    for (const lesson of NAHUATLAHTOLLI_COURSE.lessons) {
      const original = rawSource.lessons.find(candidate => candidate.number === lesson.number)!;
      for (const section of lesson.sections) for (const [index, line] of section.body.entries()) {
        expect(line).toBe(original.sections[section.sourceSectionIndex!].body[section.sourceBodyIndices![index]]);
      }
      expect(sanitizeSourceLesson(lesson)).toEqual(lesson);
      for (const link of lesson.mediaLinks) expect(sourceAudioHolds.excluded_source_urls).not.toContain(link.url);
    }
  });

  it("cannot recover excluded meanings through dictionary lookup or the currently disabled tutor", () => {
    for (const query of ["rape", "sex", "cum", "semen", "defecate", "shit", "urinate", "kill someone", "xiktli", "awiltia",
      "tepol", "xillantli", "motla", "wilana", "otomitl", "mihsotla", "xipewa", "noxillan"])
      expect(searchVocab(query), query).toEqual([]);
    expect(TUTOR_FEATURE_ENABLED).toBe(false);
  });
});
