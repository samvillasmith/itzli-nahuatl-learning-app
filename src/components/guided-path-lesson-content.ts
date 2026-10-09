import type { AppLocale } from "@/i18n/config";
import type { UnifiedVocabularyEntry } from "@/lib/unified-course-path";
import { expansionMeaning, normalizeExpansionResponse, type ExpansionCourse, type ExpansionUnit } from "@/lib/expansion-course";
import { expansionRecognitionChoices, isExpansionBuildingBlock } from "@/lib/expansion-practice";
import { interactiveLessonContent, type GuidedInteractiveBlueprint, type GuidedInteractiveContent } from "./guided-interactive-lesson";
import { resolvePracticeRecording } from "@/lib/generated-audio";
export type { GuidedInteractiveBlueprint } from "./guided-interactive-lesson";

export type GuidedForm = {
  id: string; display: string; meaning: string; audioUrl: string | null;
  audioReferenceId?: string;
  usage: string; variety: string; sourceUrl: string; sourceTitle: string;
  sourceCredit: string; buildingBlock: boolean;
  supplementalSources?: { title: string; url: string }[];
};
export type GuidedLearnCard = { kind: "rule"; id: string; title: string; explanation: string; scope: string }
  | { kind: "form"; form: GuidedForm };
export type GuidedPracticeCard = {
  id: string; kind: "choice" | "recall"; prompt: string; cue: GuidedForm | null;
  choices: { id: string; label: string; audioForm?: GuidedForm }[]; answers: GuidedForm[];
  feedback: string; entryId: string | null; hint: string | null; reviewActivityId?: string;
};
export type GuidedLessonContent = { learn: GuidedLearnCard[]; practice: GuidedPracticeCard[] };

/** Only an explicit catalog identity can join the app's existing review loop. */
export function guidedReviewAttempt(task: GuidedPracticeCard): { activityId: string; skill: "recognition" | "production" } | null {
  return task.reviewActivityId ? { activityId: task.reviewActivityId, skill: task.kind === "choice" ? "recognition" : "production" } : null;
}

/** Source spelling is accepted only through the established INALI conversion,
 * never by treating unverified aliases or pronunciation corrections as synonyms. */
export function guidedAnswerMatches(value: string, answers: readonly GuidedForm[]): boolean {
  const normalized = normalizeExpansionResponse(value);
  return Boolean(normalized) && answers.some(answer => normalizeExpansionResponse(answer.display) === normalized);
}

function learnerRuleScope(ruleId: string, original: string, locale: AppLocale): string {
  if (ruleId === "bones-rule-respect") return locale === "es"
    ? "Practica estas palabras respetuosas documentadas y el contraste singular/plural de mariposa. Aprende otras formas honoríficas por separado; no añadas estos sufijos libremente a palabras nuevas."
    : "Practice these documented respectful words and the singular/plural contrast for butterfly. Learn other honorific forms separately; do not attach these suffixes freely to new words.";
  return original;
}

/** Two approved learner-display repairs; labeled source comparisons keep their spelling. */
export function learnerRuleExplanation(ruleId: string, original: string): string {
  if (ruleId === "bones-rule-past-process") return original.replace("Nipano, Nipanqui, Nipanoyaya", "Nipano, Nipanki, Nipanoyaya");
  if (ruleId === "v3-mechanic-embedded-questions-rule") return original.replace("Ya kimati tlen kichwas wan kenihki", "Ya kimati tlen kichiwas wan kenihki");
  return original;
}

/** Adapt reviewed material without generating phrases or widening meanings. */
export function expressionLessonContent(course: ExpansionCourse, unit: ExpansionUnit, locale: AppLocale): GuidedLessonContent {
  const phrases = new Map(course.phrases.map(phrase => [phrase.id, phrase]));
  const rules = new Map(course.rules.map(rule => [rule.id, rule]));
  const sources = new Map(course.sources.map(source => [source.id, source]));
  function form(id: string): GuidedForm {
    const phrase = phrases.get(id);
    if (!phrase) throw new Error(`Missing reviewed expression: ${id}`);
    const source = sources.get(phrase.sourceId);
    if (!source) throw new Error(`Missing expression source: ${phrase.sourceId}`);
    return { id, display: phrase.nahuatl, meaning: expansionMeaning(phrase, locale),
      audioUrl: resolvePracticeRecording({ text: phrase.nahuatl, url: phrase.audioKind === "source-recording" ? phrase.audioUrl : null,
        kind: phrase.audioKind, referenceId: `phrase:${id}` }).url, audioReferenceId: `phrase:${id}`,
      usage: phrase.usageNote?.[locale] ?? "", variety: source.variety, sourceUrl: source.url, sourceTitle: source.title,
      supplementalSources: phrase.supplementalSources?.map(source => ({ ...source })),
      sourceCredit: `${source.authors.join(", ")} · ${source.license}`, buildingBlock: false };
  }
  const learn: GuidedLearnCard[] = unit.ruleIds.map(id => {
    const rule = rules.get(id);
    if (!rule) throw new Error(`Missing reviewed grammar: ${id}`);
    return { kind: "rule", id, title: rule.title[locale], explanation: learnerRuleExplanation(id, rule.explanation[locale]), scope: learnerRuleScope(id, rule.scope[locale], locale) };
  });
  learn.push(...unit.phraseIds.map(id => ({ kind: "form" as const, form: form(id) })));
  return { learn, practice: unit.steps.map(step => ({ id: step.id, kind: step.kind,
    prompt: step.prompt[locale], cue: step.phraseId ? form(step.phraseId) : null,
    choices: step.choices.map(id => ({ id, label: form(id).display, audioForm: form(id) })),
    answers: step.answerPhraseIds.map(form), feedback: step.feedback[locale], entryId: null, hint: null })) };
}

export function vocabularyLessonContent(entries: readonly UnifiedVocabularyEntry[], locale: AppLocale): GuidedLessonContent {
  const es = locale === "es";
  const practiceEntries = entries.map(entry => ({ ...entry, audioUrl: entry.audioUrl ?? undefined }));
  const forms = entries.map(entry => ({ id: entry.id, display: entry.display,
    meaning: es ? entry.meaningEs : entry.meaningEn,
    audioUrl: resolvePracticeRecording({ text: entry.display, url: entry.audioKind === "source-recording" ? entry.audioUrl : null,
      kind: entry.audioKind, referenceId: `vocabulary:${entry.id}` }).url, audioReferenceId: `vocabulary:${entry.id}`,
    usage: (es ? entry.usageNoteEs : entry.usageNoteEn) ?? "", variety: entry.variety,
    sourceUrl: entry.sourceUrl, sourceTitle: entry.sourceTitle,
    sourceCredit: `${entry.sourceAuthors.join(", ")} · ${entry.sourceLicense}`,
    supplementalSources: entry.supplementalSources?.map(source => ({ title: source.title, url: source.url })),
    buildingBlock: isExpansionBuildingBlock(entry) }));
  const practice: GuidedPracticeCard[] = [];
  for (const form of forms) {
    const entry = practiceEntries.find(item => item.id === form.id)!;
    const choices = expansionRecognitionChoices(entry, practiceEntries, locale);
    if (choices.length >= 3) practice.push({ id: `recognition-${form.id}`, kind: "choice",
      prompt: es ? "Elige el significado que acabas de aprender." : "Choose the meaning you just learned.",
      cue: form, choices: choices.map(choice => ({ id: choice.id, label: choice.meaning })),
      answers: [form], feedback: form.usage, entryId: form.id, hint: null,
      reviewActivityId: form.buildingBlock ? undefined : entry.reviewActivityId });
  }
  for (const form of forms) {
    const sameMeaning = forms.filter(other => other.id !== form.id &&
      other.meaning.normalize("NFC").trim().toLocaleLowerCase() === form.meaning.normalize("NFC").trim().toLocaleLowerCase() &&
      normalizeExpansionResponse(other.display) !== normalizeExpansionResponse(form.display));
    let hint: string | null = null;
    if (sameMeaning.length) {
      let length = 1;
      while (length < form.display.length && sameMeaning.some(other => other.display.toLocaleLowerCase().startsWith(form.display.slice(0, length).toLocaleLowerCase()))) length += 1;
      const prefix = form.display.slice(0, length);
      hint = es ? `Esta tarjeta empieza con «${prefix}${length < form.display.length ? "…" : ""}».` : `This card begins with “${prefix}${length < form.display.length ? "…" : ""}”.`;
      if (form.usage) hint += ` ${form.usage}`;
      if (sameMeaning.some(other => other.variety !== form.variety)) hint += ` ${form.variety}.`;
    }
    practice.push({ id: `recall-${form.id}`, kind: "recall",
      prompt: es ? `Escribe la forma que aprendiste para: ${form.meaning}` : `Write the form you learned for: ${form.meaning}`,
      cue: null, choices: [], answers: [form], feedback: form.usage, entryId: form.id, hint,
      reviewActivityId: form.buildingBlock ? undefined : entries.find(entry => entry.id === form.id)?.reviewActivityId });
  }
  return { learn: forms.map(form => ({ kind: "form", form })), practice };
}

/** Contextual lessons receive only the selected source records and explicit authored tasks. */
export function guidedInteractiveContent(course: ExpansionCourse, entries: readonly UnifiedVocabularyEntry[], blueprint: GuidedInteractiveBlueprint, locale: AppLocale): GuidedInteractiveContent {
  const words = new Map(vocabularyLessonContent(entries, locale).learn.flatMap(card => card.kind === "form" ? [[card.form.id, card.form] as const] : []));
  const phrases = new Map(course.phrases.map(phrase => [phrase.id, phrase]));
  const sources = new Map(course.sources.map(source => [source.id, source]));
  const rules = new Map(course.rules.map(rule => [rule.id, rule]));
  const form = (id: string): GuidedForm => {
    const word = words.get(id);
    if (word) return word;
    const phrase = phrases.get(id);
    if (!phrase) throw new Error(`Missing selected lesson form: ${id}`);
    const source = sources.get(phrase.sourceId);
    if (!source) throw new Error(`Missing selected lesson source: ${phrase.sourceId}`);
    return { id, display: phrase.nahuatl, meaning: expansionMeaning(phrase, locale),
      audioUrl: resolvePracticeRecording({ text: phrase.nahuatl, url: phrase.audioKind === "source-recording" ? phrase.audioUrl : null,
        kind: phrase.audioKind, referenceId: `phrase:${id}` }).url, audioReferenceId: `phrase:${id}`,
      usage: phrase.usageNote?.[locale] ?? "", variety: source.variety, sourceUrl: source.url, sourceTitle: source.title,
      supplementalSources: phrase.supplementalSources?.map(source => ({ ...source })),
      sourceCredit: `${source.authors.join(", ")} · ${source.license}`, buildingBlock: false };
  };
  const rule = (id: string): Extract<GuidedLearnCard, { kind: "rule" }> => {
    const reviewed = rules.get(id);
    if (!reviewed) throw new Error(`Missing selected grammar: ${id}`);
    return { kind: "rule", id, title: reviewed.title[locale], explanation: learnerRuleExplanation(id, reviewed.explanation[locale]),
      scope: learnerRuleScope(id, reviewed.scope[locale], locale) };
  };
  return interactiveLessonContent(course, entries, blueprint, locale, form, rule);
}
