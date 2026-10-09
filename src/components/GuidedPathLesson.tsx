"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import SourceAudio from "@/components/SourceAudio";
import AudioButton from "@/components/PronunciationAudio";
import SpeakingRecorder from "@/components/SpeakingRecorder";
import ReportIssueButton from "@/components/ReportIssueButton";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizedPathname } from "@/i18n/config";
import type { UnifiedVocabularyEntry } from "@/lib/unified-course-path";
import { storageKey, getProgressDeviceId, readScopedStorage } from "@/lib/progress-storage";
import { createExpansionCourseBrowserStorage, createExpansionPracticeBrowserStorage } from "@/lib/expansion-state";
import { recordAttempt } from "@/lib/learning-state";
import { parseLearningState } from "@/lib/learning-schema";
import { EXPANSION_COURSE_STORAGE_KEY, parseExpansionCourseProgress, withExpansionLessonResult,
  type ExpansionCourse, type ExpansionText, type ExpansionUnit } from "@/lib/expansion-course";
import { EXPANSION_STORAGE_KEY, loadExpansionProgress,
  recordExpansionReview, saveExpansionProgress, type ExpansionScopedStorage } from "@/lib/expansion-practice";
import { expressionLessonContent, vocabularyLessonContent, guidedAnswerMatches, guidedReviewAttempt,
  guidedInteractiveContent, type GuidedForm, type GuidedPracticeCard, type GuidedInteractiveBlueprint } from "./guided-path-lesson-content";
import { builderSelectionText, guidedBuilderMatches, gradeGuidedDialogue, recordGuidedFirstAttempt,
  type GuidedAttemptLedger } from "./guided-interactive-lesson";
import type { GuidedBuilder, GuidedTile } from "./guided-interactive-lesson";
import { guidedLessonImage } from "@/lib/guided-lesson-images";
import { guidedPracticeImage } from "@/lib/guided-practice-images";
import { useLessonImageWarmup } from "./useLessonImageWarmup";
import { WordCardMedia, WordImageCredit } from "./WordCardMedia";
import { WordImagePreloads } from "./WordImageResourceHints";
import type { WordImage } from "@/data/word-images";
import LessonWordImagePreview from "./LessonWordImagePreview";

type PathNeighbor = { num: number; title: ExpansionText };
type Props = {
  unitNum: number; lessonNumber: number; title: ExpansionText; goal: ExpansionText; durationMinutes: number;
  progressId: string; course: ExpansionCourse; unit?: ExpansionUnit;
  entries?: readonly UnifiedVocabularyEntry[]; interactiveBlueprint?: GuidedInteractiveBlueprint;
  previewImages?: Record<string, WordImage>;
  formImages?: Record<string, WordImage>;
  prevUnit: PathNeighbor | null; nextUnit: PathNeighbor | null;
};
type LearningPhase = "vocabulary" | "context" | "grammar" | "practice" | "builder" | "dialogue";
type Phase = "intro" | LearningPhase | "finished";
const EMPTY_ENTRIES: readonly UnifiedVocabularyEntry[] = [];
const EMPTY_PREVIEW_IMAGES: Record<string, WordImage> = {};
function attemptedAt(event: { timeStamp: number }): number {
  return Math.round(event.timeStamp > 1_000_000_000_000 ? event.timeStamp : performance.timeOrigin + event.timeStamp);
}
function builderWordReference(progressId: string, builder: GuidedBuilder, tile: GuidedTile) {
  const label = tile.label;
  if (builder.kind === "chunks") return `builder-tile:${progressId}:${builder.id}:0:${tile.id.split(":").at(-1)}`;
  const variant = builder.answers.findIndex(answer => answer.display.trim().split(/\s+/).includes(label));
  const position = variant >= 0 ? builder.answers[variant].display.trim().split(/\s+/).indexOf(label) : -1;
  return variant >= 0 && position >= 0 ? `builder-tile:${progressId}:${builder.id}:${variant}:${position}` : undefined;
}

export default function GuidedPathLesson({ unitNum, lessonNumber, title, goal, durationMinutes, progressId,
  course, unit, entries = EMPTY_ENTRIES, interactiveBlueprint, previewImages = EMPTY_PREVIEW_IMAGES,
  formImages = EMPTY_PREVIEW_IMAGES, prevUnit, nextUnit }: Props) {
  const { locale } = useLocale();
  const es = locale === "es";
  const content = useMemo(() => unit && !interactiveBlueprint?.contextCoverage ? expressionLessonContent(course, unit, locale)
    : vocabularyLessonContent(entries, locale), [course, unit, entries, interactiveBlueprint, locale]);
  const interactive = useMemo(() => interactiveBlueprint ? guidedInteractiveContent(course, entries, interactiveBlueprint, locale) : null,
    [course, entries, interactiveBlueprint, locale]);
  const vocabulary = interactive?.vocabulary ?? content.learn.flatMap(card => card.kind === "form" ? [card.form] : []);
  const context = interactive?.context ?? [];
  const grammar = interactive?.grammar ?? content.learn.filter(card => card.kind === "rule");
  const builders = interactive?.builders ?? [];
  const dialogues = interactive?.dialogues ?? [];
  const lessonImages = useMemo(() => {
    const images = new Map<string, WordImage | null>(entries.map(entry => [entry.id, previewImages[entry.id] ?? guidedLessonImage(entry)]));
    const forms = [...content.learn.flatMap(card => card.kind === "form" ? [card.form] : []),
      ...content.practice.flatMap(task => [...(task.cue ? [task.cue] : []), ...task.answers]),
      ...(interactive?.vocabulary ?? []), ...(interactive?.context ?? []),
      ...(interactive?.builders.flatMap(builder => builder.answers) ?? []),
      ...(interactive?.dialogues.flatMap(dialogue => dialogue.turns.map(turn => turn.form)) ?? [])];
    for (const form of forms) if (formImages[form.id]) images.set(form.id, formImages[form.id]);
    return images;
  }, [entries, previewImages, formImages, content, interactive]);
  const lessonImageUrls = useMemo(() => [...lessonImages.values()].map(image => image?.url), [lessonImages]);
  useLessonImageWarmup(lessonImageUrls);
  const contextCoverage = interactive?.contextCoverage;
  const fullContextReady = Boolean(interactive && !contextCoverage?.pendingEntryIds.length);
  const phaseCounts: Record<LearningPhase, number> = { vocabulary: vocabulary.length, context: context.length, grammar: grammar.length,
    practice: content.practice.length, builder: builders.length, dialogue: dialogues.length };
  const stages = (Object.keys(phaseCounts) as LearningPhase[]).filter(stage => phaseCounts[stage] > 0);
  const assessmentTotal = content.practice.length + builders.length + dialogues.length;
  const activityTotal = Object.values(phaseCounts).reduce((sum, count) => sum + count, 0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [dialogueAnswers, setDialogueAnswers] = useState<Record<string, string>>({});
  const [dialogueGrade, setDialogueGrade] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"pending" | "saved" | "blocked" | "failed">("pending");
  const [ready, setReady] = useState(false);
  const courseStorage = useRef<ReturnType<typeof createExpansionCourseBrowserStorage> | null>(null);
  const practiceStorage = useRef<ExpansionScopedStorage | null>(null);
  const answerLock = useRef(false);
  const ledger = useRef<GuidedAttemptLedger>({ firstAnswers: {}, correct: 0 });
  const task = content.practice[index];
  const practiceImage = task ? guidedPracticeImage(task, lessonImages) : null;
  const builder = builders[index];
  const dialogue = dialogues[index];
  const dialogueUsage = dialogue ? [...new Set(dialogue.turns.map(turn => turn.form.usage).filter(Boolean))] : [];
  const stageLabels: Record<LearningPhase, string> = es ? { vocabulary: "Conoce las palabras", context: "En contexto", grammar: "Descubre el patrón", practice: "Recuerda lo aprendido", builder: "Construye", dialogue: "Conversa" }
    : { vocabulary: "Meet the words", context: "In context", grammar: "Notice the pattern", practice: "Recall what you learned", builder: "Build it", dialogue: "Have a conversation" };

  useEffect(() => {
    try {
      const storage = createExpansionCourseBrowserStorage();
      courseStorage.current = storage;
      if (!parseExpansionCourseProgress(storage.getItem(EXPANSION_COURSE_STORAGE_KEY))) setSaveStatus("blocked");
      const practice = createExpansionPracticeBrowserStorage();
      practiceStorage.current = practice;
      if (loadExpansionProgress(practice).status !== "ready") setSaveStatus("blocked");
    } catch { setSaveStatus("failed"); }
    setReady(true);
  }, []);

  function saveLesson() {
    try {
      const storage = courseStorage.current;
      if (!storage) { setSaveStatus("blocked"); return; }
      const latest = parseExpansionCourseProgress(storage.getItem(EXPANSION_COURSE_STORAGE_KEY));
      if (!latest) { setSaveStatus("blocked"); return; }
      const steps = content.practice.map(item => ({ id: item.id, kind: item.kind,
        prompt: { en: item.prompt, es: item.prompt }, phraseId: null,
        choices: item.choices.map(choice => choice.id), answerPhraseIds: item.answers.map(form => form.id),
        feedback: { en: item.feedback, es: item.feedback } }));
      for (const item of builders) steps.push({ id: item.id, kind: "recall", prompt: { en: item.prompt, es: item.prompt },
        phraseId: null, choices: [], answerPhraseIds: item.answers.map(form => form.id), feedback: { en: item.feedback, es: item.feedback } });
      for (const item of dialogues) steps.push({ id: item.id, kind: "recall", prompt: { en: item.context, es: item.context },
        phraseId: null, choices: [], answerPhraseIds: item.turns.map(turn => turn.form.id), feedback: { en: item.feedback, es: item.feedback } });
      const resultUnit: ExpansionUnit = { ...(unit ?? { title, goal, durationMinutes, ruleIds: [], phraseIds: [], mastery: goal }), id: progressId, steps };
      storage.setItem(EXPANSION_COURSE_STORAGE_KEY, JSON.stringify(withExpansionLessonResult(latest, resultUnit, ledger.current.correct, undefined, interactive?.revision ?? "reference-v1")));
      setSaveStatus("saved");
    } catch { setSaveStatus("failed"); }
  }

  function respond(taskId: string, success: boolean, at: number, reviewTask?: GuidedPracticeCard) {
    if (answerLock.current) return;
    answerLock.current = true; setResult(success);
    const attempt = recordGuidedFirstAttempt(ledger.current, taskId, success);
    ledger.current = attempt.ledger; setCorrect(attempt.ledger.correct);
    if (!attempt.firstAttempt || !reviewTask?.entryId || !practiceStorage.current) return;
    const storage = practiceStorage.current;
    if (storage.key !== storageKey(EXPANSION_STORAGE_KEY)) { setSaveStatus("blocked"); return; }
    const latest = loadExpansionProgress(storage);
    if (latest.status !== "ready") { setSaveStatus("blocked"); return; }
    const saved = saveExpansionProgress(storage,
      recordExpansionReview(latest.progress, reviewTask.entryId, reviewTask.kind === "choice" ? "recognition" : "recall", success, at, getProgressDeviceId()));
    if (saved.status !== "ready") setSaveStatus(saved.status === "invalid" ? "blocked" : "failed");
    if (saved.status === "ready") {
      const review = guidedReviewAttempt(reviewTask);
      if (review) {
        try {
          const raw = readScopedStorage("itzli_learning_v1");
          if (raw !== null && !parseLearningState(JSON.parse(raw))) { setSaveStatus("blocked"); return; }
          recordAttempt(review.activityId, review.skill, success);
        } catch { setSaveStatus("blocked"); }
      }
    }
  }
  function resetAnswer() {
    setAnswer(""); setSelectedTiles([]); setDialogueAnswers({}); setDialogueGrade({}); setResult(null); answerLock.current = false;
  }
  function advance() {
    if (phase === "intro" || phase === "finished") return;
    resetAnswer();
    if (index + 1 < phaseCounts[phase]) { setIndex(index + 1); return; }
    const next = stages[stages.indexOf(phase) + 1];
    setIndex(0);
    if (next) setPhase(next); else { saveLesson(); setPhase("finished"); }
  }
  function retry() {
    setAnswer(""); setSelectedTiles([]);
    setDialogueAnswers(current => Object.fromEntries(Object.entries(current).filter(([id]) => dialogueGrade[id])));
    setDialogueGrade({}); setResult(null); answerLock.current = false;
  }
  function restart() {
    setPhase("intro"); setIndex(0); resetAnswer(); setCorrect(0); ledger.current = { firstAnswers: {}, correct: 0 };
    if (saveStatus === "saved") setSaveStatus("pending");
  }
  function moveTile(position: number, delta: number) {
    setSelectedTiles(current => {
      const target = position + delta;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current]; [copy[position], copy[target]] = [copy[target], copy[position]]; return copy;
    });
  }
  function formDetails(form: GuidedForm) {
    const image = lessonImages.get(form.id) ?? null;
    return <div className="mt-5 space-y-4">
      {image && <div className="overflow-hidden rounded-lg"><WordCardMedia image={image} alt={form.meaning} /><WordImageCredit image={image} /></div>}
      {form.buildingBlock && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">{es ? "Forma de referencia: aprende su significado y sus límites de uso. Por sí sola no se presenta como una oración completa." : "Reference form: learn its meaning and usage limits. It is not presented here as a complete sentence on its own."}</p>}
      {form.usage && <p className="text-sm leading-6 text-stone-600">{form.usage}</p>}
      <SourceAudio key={`audio-${form.id}`} url={form.audioUrl} text={form.display} referenceId={form.audioReferenceId} scope={form.display.includes(" ") ? "utterance" : "isolated-word"} />
      {form.variety && <p className="text-xs text-stone-500">{form.variety}</p>}
      <ReportIssueButton key={`report-${form.id}`} category="word" label={es ? "Reportar esta palabra o frase" : "Report this word or phrase"}
        context={{ pagePath: localizedPathname(`/units/${lessonNumber}`, locale), lessonNumber, lessonId: progressId,
          lessonTitle: title[locale], itemId: form.id, form: form.display, meaning: form.meaning, sourceUrl: form.sourceUrl }} />
    </div>;
  }
  function continueButton() {
    const last = phase !== "intro" && phase !== "finished" && stages.at(-1) === phase && index === phaseCounts[phase] - 1;
    return <button type="button" onClick={advance} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-950 py-3.5 text-sm font-bold text-white hover:bg-stone-800">{last ? (es ? "Terminar lección" : "Finish lesson") : (es ? "Continuar" : "Continue")}<ArrowRight size={16} /></button>;
  }
  function retryButton() {
    return result === false ? <button type="button" onClick={retry} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white py-3 text-sm font-bold text-amber-900"><RotateCcw size={15} />{es ? "Intentar otra vez" : "Try again"}</button> : null;
  }
  const completedStages = phase === "intro" ? 0 : phase === "finished" ? activityTotal
    : stages.slice(0, stages.indexOf(phase)).reduce((sum, stage) => sum + phaseCounts[stage], 0) + index;
  const percent = completedStages / Math.max(1, activityTotal) * 100;
  const forms = [...vocabulary, ...context, ...builders.flatMap(item => item.answers), ...dialogues.flatMap(item => item.turns.map(turn => turn.form))];
  const sourceCredits = [...new Map(forms.map(form => [form.sourceUrl, form])).values()];
  const primarySourceUrls = new Set(sourceCredits.map(source => source.sourceUrl));
  const supplementalCredits = [...new Map(forms.flatMap(form => form.supplementalSources ?? []).filter(source => !primarySourceUrls.has(source.url)).map(source => [source.url, source])).values()];
  const sectionClass = "rounded-lg border border-stone-200 bg-white p-7 shadow-sm sm:p-9";
  const stageHeading = phase !== "intro" && phase !== "finished" ? <p className="mb-7 text-xs font-semibold uppercase tracking-wider text-stone-400">{stageLabels[phase]} · {index + 1} / {phaseCounts[phase]}</p> : null;
  const displayedForm = phase === "vocabulary" ? vocabulary[index] : context[index];

  return <div className="mx-auto max-w-lg">
    <WordImagePreloads urls={lessonImageUrls} />
    <div className="mb-6 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={es ? "Progreso de la lección" : "Lesson progress"}><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} /></div>
    {saveStatus === "blocked" && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">{es ? "No se pudo leer el registro existente. Puedes practicar; no lo reemplazaremos." : "The existing record could not be read. You can practice; it will be kept without replacement."}</p>}
    {saveStatus === "failed" && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">{es ? "No se pudo guardar en este navegador. Puedes continuar practicando." : "This browser could not save the result. You can continue practicing."}</p>}

    {phase === "intro" && <>
      <section className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-6 inline-block rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold text-white">{es ? "Lección" : "Lesson"} {unitNum}</p>
        <h1 className="mb-3 font-serif text-3xl font-bold leading-tight text-stone-900">{title[locale]}</h1><p className="mx-auto mb-8 max-w-sm text-sm leading-6 text-stone-600">{goal[locale]}</p>
        <LessonWordImagePreview items={vocabulary.map(form => ({ id: form.id, display: form.display,
          meaning: form.meaning, image: lessonImages.get(form.id) ?? null }))} />
        {interactive ? <ol className="mb-7 space-y-2 text-left text-sm text-stone-600">{(["vocabulary", "context", "grammar", "builder", "dialogue"] as const).map((stage, position) => <li key={stage}><span className="mr-2 font-bold text-emerald-800">{position + 1}.</span>{stageLabels[stage]}</li>)}</ol>
          : <p className="mb-7 rounded-lg bg-amber-50 p-4 text-left text-xs leading-6 text-amber-900">{es ? "Aprende estas palabras y cuándo usarlas. La práctica con oraciones y conversaciones todavía está en revisión; por ahora, esta parada del camino ofrece práctica de palabras." : "Learn these words and when to use them. Sentence and conversation practice is still being reviewed; this stop on the path currently offers word practice."}</p>}
        {contextCoverage && !fullContextReady && <p className="mb-7 rounded-lg bg-amber-50 p-4 text-left text-xs leading-6 text-amber-900">{es
          ? `${contextCoverage.coveredEntryIds.length} de ${entries.length} palabras tienen ejemplos y práctica de conversación revisados. Las otras ${contextCoverage.pendingEntryIds.length} siguen en revisión para ese uso; también las aprenderás y repasarás aquí.`
          : `${contextCoverage.coveredEntryIds.length} of ${entries.length} words have reviewed examples and conversation practice. The other ${contextCoverage.pendingEntryIds.length} are still being reviewed for that use; you will learn and review them here too.`}</p>}
        <div className="mb-8 flex justify-center gap-8"><div><p className="text-2xl font-bold text-stone-900">{vocabulary.length}</p><p className="mt-1 text-xs text-stone-400">{es ? "formas" : "words and forms"}</p></div><div><p className="text-2xl font-bold text-stone-900">{assessmentTotal}</p><p className="mt-1 text-xs text-stone-400">{es ? "actividades" : "activities"}</p></div><div><p className="text-2xl font-bold text-stone-900">{durationMinutes}</p><p className="mt-1 text-xs text-stone-400">{es ? "minutos" : "minutes"}</p></div></div>
        <button type="button" disabled={!ready || !stages.length || !assessmentTotal} onClick={() => { setPhase(stages[0]); setIndex(0); }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40">{fullContextReady ? (es ? "Empezar la lección" : "Start lesson") : (es ? "Practicar las palabras" : "Practice words")}<ArrowRight size={16} /></button>
      </section>
      <div className="mt-6 flex justify-between gap-4 text-xs text-stone-400">{prevUnit ? <Link href={localizedPathname(`/units/${prevUnit.num}`, locale)} className="hover:text-stone-700">← {prevUnit.title[locale]}</Link> : <span />}{nextUnit && <Link href={localizedPathname(`/units/${nextUnit.num}`, locale)} className="text-right hover:text-stone-700">{nextUnit.title[locale]} →</Link>}</div>
    </>}
    {(phase === "vocabulary" || phase === "context") && displayedForm && <section className={sectionClass} aria-live="polite">{stageHeading}<h1 lang="nhe" className="text-3xl font-bold leading-snug text-stone-900">{displayedForm.display}</h1><p className="mt-4 text-lg font-semibold text-emerald-800">{displayedForm.meaning}</p>{formDetails(displayedForm)}{continueButton()}</section>}
    {phase === "grammar" && grammar[index] && <section className={sectionClass} aria-live="polite">{stageHeading}<h1 className="font-serif text-2xl font-bold text-stone-900">{grammar[index].title}</h1><p className="mt-5 whitespace-pre-line text-sm leading-7 text-stone-600">{grammar[index].explanation}</p><p className="mt-5 text-xs leading-6 text-stone-500">{grammar[index].scope}</p><ReportIssueButton key={grammar[index].id} category="grammar" context={{ pagePath: localizedPathname(`/units/${lessonNumber}`, locale), lessonNumber, lessonId: progressId, lessonTitle: title[locale], itemId: grammar[index].id, activityId: grammar[index].title }} />{continueButton()}</section>}

    {phase === "practice" && task && <section className={sectionClass} aria-live="polite">
      {stageHeading}<h1 className="text-xl font-bold leading-8 text-stone-900">{task.prompt}</h1>{task.hint && <p className="mt-3 text-sm leading-6 text-stone-600">{task.hint}</p>}
      {practiceImage && <div className="mt-5 overflow-hidden rounded-lg"><WordCardMedia image={practiceImage} alt={es ? "Imagen de esta palabra" : "Image for this word"} /><WordImageCredit image={practiceImage} /></div>}
      {task.cue && <div className="mt-5 rounded-lg bg-stone-50 p-5"><p lang="nhe" className="text-2xl font-bold text-stone-900">{task.cue.display}</p><div className="mt-4"><SourceAudio url={task.cue.audioUrl} text={task.cue.display} referenceId={task.cue.audioReferenceId} /></div></div>}
      {task.kind === "choice" ? <div className="mt-6 grid gap-3">{task.choices.map(choice => <div key={choice.id} className="flex items-center gap-2"><button type="button" disabled={result !== null} onClick={event => respond(`practice:${task.id}`, task.answers.some(value => value.id === choice.id), attemptedAt(event), task)} className="flex-1 rounded-lg border border-stone-200 p-4 text-left text-base font-semibold text-stone-700 transition hover:border-emerald-500 disabled:opacity-70">{choice.label}</button>{choice.audioForm && <AudioButton src={choice.audioForm.audioUrl} text={choice.audioForm.display} referenceId={choice.audioForm.audioReferenceId} size="sm" />}</div>)}</div>
        : <form className="mt-6" onSubmit={event => { event.preventDefault(); respond(`practice:${task.id}`, guidedAnswerMatches(answer, task.answers), attemptedAt(event), task); }}><label className="block text-sm font-semibold text-stone-600">{es ? "Escribe en náhuatl" : "Write in Nahuatl"}<input autoComplete="off" spellCheck={false} disabled={result !== null} value={answer} onChange={event => setAnswer(event.target.value)} className="mt-3 w-full rounded-lg border border-stone-300 p-4 text-xl text-stone-900" /></label><button type="submit" disabled={!answer.trim() || result !== null} className="mt-4 w-full rounded-lg bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">{es ? "Comprobar" : "Check answer"}</button><button type="button" disabled={result !== null} onClick={event => respond(`practice:${task.id}`, false, attemptedAt(event), task)} className="mt-3 w-full text-xs font-semibold text-stone-400 underline disabled:opacity-40">{es ? "Mostrar respuesta" : "Show answer"}</button></form>}
      {result !== null && <div className={`mt-7 rounded-lg border p-5 ${result ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className="font-bold text-stone-900">{result ? (es ? "¡Correcto!" : "Correct!") : (es ? "Practica esta respuesta" : "Practice this answer")}</p>{task.feedback && <p className="mt-3 text-sm leading-6 text-stone-600">{task.feedback}</p>}{task.answers.map(form => <div key={form.id} className="mt-5 border-t border-stone-200 pt-4"><p lang="nhe" className="text-2xl font-bold text-emerald-900">{form.display}</p><p className="mt-2 text-sm text-stone-600">{form.meaning}</p>{formDetails({ ...form, usage: form.usage === task.feedback ? "" : form.usage })}{form.audioUrl && <div className="mt-4"><SpeakingRecorder /></div>}</div>)}{retryButton()}{continueButton()}</div>}
    </section>}

    {phase === "builder" && builder && <section className={sectionClass} aria-live="polite">
      {stageHeading}<h1 className="text-xl font-bold leading-8 text-stone-900">{builder.prompt}</h1><p className="mt-3 text-sm leading-6 text-stone-600">{builder.answers[0].meaning}</p>
      <p className="mt-4 text-xs leading-5 text-stone-500">{builder.kind === "chunks" ? (es ? "Une las partes de esta forma documentada." : "Join the parts of this documented form.") : (es ? "Ordena las palabras para practicar esta expresión documentada." : "Arrange the words to practice this documented expression.")}</p>
      <div className="mt-5 min-h-24 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-4" aria-label={es ? "Tu construcción" : "Your construction"}>{selectedTiles.length ? <ol className="flex flex-wrap gap-2">{selectedTiles.map((id, position) => { const tile = builder.tiles.find(item => item.id === id)!; return <li key={id} className="flex items-center rounded-lg border border-emerald-200 bg-white"><button type="button" disabled={result !== null} onClick={() => setSelectedTiles(current => current.filter(item => item !== id))} className="px-3 py-2 font-semibold text-emerald-950" aria-label={`${es ? "Quitar" : "Remove"} ${tile.label}`}>{tile.label}</button><button type="button" disabled={result !== null || position === 0} onClick={() => moveTile(position, -1)} className="px-1.5 text-xs text-stone-500 disabled:opacity-30" aria-label={`${es ? "Mover a la izquierda" : "Move left"}: ${tile.label}`}>←</button><button type="button" disabled={result !== null || position === selectedTiles.length - 1} onClick={() => moveTile(position, 1)} className="pr-2 text-xs text-stone-500 disabled:opacity-30" aria-label={`${es ? "Mover a la derecha" : "Move right"}: ${tile.label}`}>→</button></li>; })}</ol> : <p className="text-sm text-stone-400">{es ? "Elige las fichas de abajo." : "Choose tiles below."}</p>}{selectedTiles.length > 0 && <p lang="nhe" className="mt-4 text-lg font-semibold text-emerald-900">{builderSelectionText(builder, selectedTiles)}</p>}</div>
      <div className="mt-5 flex flex-wrap gap-3">{builder.tiles.map(tile => <div key={tile.id} className="flex items-center gap-1"><button type="button" disabled={result !== null || selectedTiles.includes(tile.id)} onClick={() => setSelectedTiles(current => [...current, tile.id])} className="rounded-lg border border-stone-300 bg-white px-4 py-3 font-semibold text-stone-800 hover:border-emerald-500 disabled:opacity-30">{tile.label}</button><AudioButton src={null} text={tile.label} referenceId={builderWordReference(progressId, builder, tile)} size="sm" /></div>)}</div>
      <button type="button" disabled={!selectedTiles.length || result !== null} onClick={event => respond(`builder:${builder.id}`, guidedBuilderMatches(builder, selectedTiles), attemptedAt(event))} className="mt-6 w-full rounded-lg bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">{es ? "Comprobar" : "Check construction"}</button>
      <div className="mt-3 flex justify-between text-xs font-semibold text-stone-400"><button type="button" disabled={result !== null || !selectedTiles.length} onClick={() => setSelectedTiles([])} className="underline disabled:opacity-40">{es ? "Empezar de nuevo" : "Clear tiles"}</button><button type="button" disabled={result !== null} onClick={event => respond(`builder:${builder.id}`, false, attemptedAt(event))} className="underline disabled:opacity-40">{es ? "Mostrar respuesta" : "Show answer"}</button></div>
      {result !== null && <div className={`mt-7 rounded-lg border p-5 ${result ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className="font-bold text-stone-900">{result ? (es ? "¡Correcto!" : "Correct!") : (es ? "Revisa las partes y prueba otra vez" : "Review the parts and try again")}</p><p className="mt-3 text-sm leading-6 text-stone-600">{builder.feedback}</p>{builder.answers.map(form => <div key={form.id} className="mt-5"><p lang="nhe" className="text-2xl font-bold text-emerald-900">{form.display}</p>{formDetails(form)}</div>)}<p className="mt-4 text-xs leading-5 text-stone-500">{es ? "Esta actividad practica las formas revisadas que se muestran; no establece un único orden de palabras para todo el náhuatl." : "This activity practices the reviewed wordings shown here; it does not set one word order for all Nahuatl."}</p>{retryButton()}{continueButton()}</div>}
    </section>}

    {phase === "dialogue" && dialogue && <section className={sectionClass} aria-live="polite">
      {stageHeading}<h1 className="font-serif text-2xl font-bold text-stone-900">{dialogue.title}</h1><p className="mt-4 text-sm leading-7 text-stone-600">{dialogue.context}</p><p className="mt-3 text-xs text-stone-500">{es ? "Completa las palabras que faltan en los turnos de los hablantes." : "Complete the missing words in the speakers’ turns."}</p>
      {dialogueUsage.map(note => <p key={note} className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-stone-600">{note}</p>)}
      <form onSubmit={event => { event.preventDefault(); const graded = gradeGuidedDialogue(dialogue, dialogueAnswers); setDialogueGrade(graded.gaps); respond(`dialogue:${dialogue.id}`, graded.correct, attemptedAt(event)); }}>
        <ol className="mt-6 space-y-4">{dialogue.turns.map((turn, turnIndex) => <li key={turn.id} className={`rounded-xl border p-5 ${turnIndex % 2 ? "border-emerald-100 bg-emerald-50/50" : "border-stone-200 bg-stone-50"}`}><p className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-800">{turn.speaker}</p>{turn.cue && <p className="mb-3 text-sm leading-6 text-stone-600">{turn.cue}</p>}<div lang="nhe" className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-lg font-semibold leading-8 text-stone-900">{turn.tokens.map((token, tokenIndex) => { const gap = turn.gaps.find(item => item.tokenIndexes.includes(tokenIndex)); if (gap && gap.tokenIndexes[0] !== tokenIndex) return null; return gap ? <label key={gap.id} className="inline-flex max-w-full"><span className="sr-only">{turn.speaker}: {es ? "palabras que faltan" : "missing words"} {turn.gaps.indexOf(gap) + 1}</span><input autoComplete="off" spellCheck={false} disabled={result !== null} value={dialogueAnswers[gap.id] ?? ""} onChange={event => setDialogueAnswers(current => ({ ...current, [gap.id]: event.target.value }))} aria-invalid={result !== null && !dialogueGrade[gap.id]} style={{ width: `${Math.max(7, Math.min(24, gap.answer.length + 2))}ch` }} className={`max-w-full rounded border-b-2 bg-white px-2 py-1 text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500 ${result !== null ? dialogueGrade[gap.id] ? "border-emerald-600" : "border-amber-600" : "border-emerald-400"}`} /></label> : <span key={`${turn.id}:${tokenIndex}`}>{token}</span>; })}</div>{turn.cue?.trim() !== turn.form.meaning.trim() && <p className="mt-3 text-xs leading-5 text-stone-500">{turn.form.meaning}</p>}{!turn.gaps.length && <div className="mt-3"><SourceAudio url={turn.form.audioUrl} text={turn.form.display} referenceId={turn.form.audioReferenceId} scope="utterance" /></div>}</li>)}</ol>
        <button type="submit" disabled={result !== null || dialogue.turns.some(turn => turn.gaps.some(gap => !(dialogueAnswers[gap.id] ?? "").trim()))} className="mt-6 w-full rounded-lg bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">{es ? "Comprobar conversación" : "Check conversation"}</button><button type="button" disabled={result !== null} onClick={event => { setDialogueGrade(gradeGuidedDialogue(dialogue, dialogueAnswers).gaps); respond(`dialogue:${dialogue.id}`, false, attemptedAt(event)); }} className="mt-3 w-full text-xs font-semibold text-stone-400 underline disabled:opacity-40">{es ? "Mostrar conversación completa" : "Show complete conversation"}</button>
      </form>
      {result !== null && <div className={`mt-7 rounded-lg border p-5 ${result ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className="font-bold text-stone-900">{result ? (es ? "¡La conversación está completa!" : "Conversation complete!") : (es ? "Revisa los turnos y prueba otra vez" : "Review the turns and try again")}</p><p className="mt-3 text-sm leading-6 text-stone-600">{dialogue.feedback}</p>{dialogue.turns.filter(turn => turn.gaps.length).map(turn => <div key={turn.id} className="mt-5 border-t border-stone-200 pt-4"><p className="text-xs font-bold text-stone-500">{turn.speaker}</p><p lang="nhe" className="mt-2 text-xl font-bold text-emerald-900">{turn.form.display}</p>{formDetails(turn.form)}<div className="mt-3 flex flex-wrap gap-3">{turn.gaps.map(gap => <div key={gap.id} className="flex items-center gap-2"><span lang="nhe" className="text-sm font-semibold">{gap.answer}</span><AudioButton src={null} text={gap.answer} referenceId={`dialogue-gap:${progressId}:${dialogue.id}:${turn.id}:${gap.id}`} size="sm" /></div>)}</div></div>)}{retryButton()}{continueButton()}</div>}
    </section>}

    {phase === "finished" && <section className="rounded-3xl border border-stone-100 bg-white p-10 text-center shadow-sm">
      <Check size={42} className="mx-auto text-emerald-600" />
      <h1 className="mb-3 mt-5 font-serif text-2xl font-bold text-stone-900">{fullContextReady ? (es ? "¡Lección terminada!" : "Lesson complete!") : (es ? "¡Práctica de palabras terminada!" : "Word practice complete!")}</h1>
      <p className="text-stone-500">{title[locale]}</p>
      <p className="mb-6 mt-3 font-semibold text-emerald-700">{correct} / {assessmentTotal} {es ? "correctas en el primer intento" : "correct on the first attempt"}</p>
      {contextCoverage && !fullContextReady && <p className="mb-6 text-xs leading-6 text-stone-500">{es
        ? `Practicaste las ${entries.length} palabras. ${contextCoverage.coveredEntryIds.length} tienen ejemplos de uso y conversación revisados; faltan esos ejemplos para ${contextCoverage.pendingEntryIds.length}.`
        : `You practiced all ${entries.length} words. ${contextCoverage.coveredEntryIds.length} have reviewed usage examples and conversation practice; those examples are still needed for ${contextCoverage.pendingEntryIds.length}.`}</p>}
      <p className="mb-6 text-xs leading-5 text-stone-500">{saveStatus === "saved" ? (es ? "Tu progreso se guardó en este navegador." : "Your progress was saved in this browser.") : (es ? "Tu progreso no se guardó en este navegador." : "Your progress was not saved in this browser.")}</p>
      {saveStatus === "failed" && <button type="button" onClick={saveLesson} className="mb-5 text-sm font-bold text-amber-800 underline">{es ? "Reintentar guardar" : "Retry saving"}</button>}
      {nextUnit && <Link href={localizedPathname(`/units/${nextUnit.num}`, locale)} className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 p-4 text-sm font-bold text-white hover:bg-emerald-700">{es ? "Siguiente" : "Next"}: {nextUnit.title[locale]}<ArrowRight size={16} /></Link>}
      <button type="button" onClick={restart} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 p-3 text-sm font-semibold text-stone-500 hover:border-emerald-300"><RotateCcw size={15} />{es ? "Repetir lección" : "Repeat lesson"}</button>
      <Link href={localizedPathname("/units", locale)} className="mt-5 block text-xs text-stone-400 hover:text-stone-600">← {es ? "Volver al camino" : "Back to the path"}</Link>
    </section>}
    {sourceCredits.length > 0 && <details className="mt-7 rounded-lg border border-stone-200 p-4 text-xs leading-5 text-stone-500"><summary className="cursor-pointer font-semibold">{es ? "Fuentes de la lección" : "Lesson sources"}</summary>{sourceCredits.map(source => <p key={source.sourceUrl} className="mt-3"><a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{source.sourceTitle}</a><br />{source.sourceCredit}</p>)}{supplementalCredits.map(source => <p key={source.url} className="mt-3"><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{source.title}</a></p>)}</details>}
  </div>;
}
