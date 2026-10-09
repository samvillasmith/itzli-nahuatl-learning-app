"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import SourceAudio from "./SourceAudio";
import SpeakingRecorder from "./SpeakingRecorder";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizedPathname } from "@/i18n/config";
import { createExpansionCourseBrowserStorage } from "@/lib/expansion-state";
import {
  checkExpansionResponse, expansionMeaning, EXPANSION_COURSE_STORAGE_KEY,
  parseExpansionCourseProgress, withExpansionLessonResult,
  type ExpansionCourse, type ExpansionCourseProgress, type ExpansionUnit,
} from "@/lib/expansion-course";

export default function ExpansionLesson({ course, unit }: { course: ExpansionCourse; unit: ExpansionUnit }) {
  const { locale } = useLocale();
  const es = locale === "es";
  const [phase, setPhase] = useState<"learn" | "practice" | "finished">("learn");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [firstCorrect, setFirstCorrect] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"pending" | "saved" | "blocked" | "failed">("pending");
  const [storageReady, setStorageReady] = useState(false);
  const [prior, setPrior] = useState<ExpansionCourseProgress | null>(null);
  const courseStorage = useRef<ReturnType<typeof createExpansionCourseBrowserStorage> | null>(null);
  const phraseById = new Map(course.phrases.map(phrase => [phrase.id, phrase]));
  const ruleById = new Map(course.rules.map(rule => [rule.id, rule]));
  const sourceById = new Map(course.sources.map(source => [source.id, source]));
  const step = unit.steps[index];
  const answers = step?.answerPhraseIds.map(id => phraseById.get(id)!).filter(Boolean) ?? [];
  const cue = step?.phraseId ? phraseById.get(step.phraseId) : null;

  useEffect(() => {
    try {
      const storage = createExpansionCourseBrowserStorage();
      courseStorage.current = storage;
      const parsed = parseExpansionCourseProgress(storage.getItem(EXPANSION_COURSE_STORAGE_KEY));
      setPrior(parsed);
      if (!parsed) setSaveStatus("blocked");
    } catch { setSaveStatus("failed"); }
    setStorageReady(true);
  }, []);

  function respond(correct: boolean) {
    if (result !== null) return;
    setResult(correct);
    if (correct) setFirstCorrect(total => total + 1);
  }

  function saveResult() {
    try {
      const storage = courseStorage.current;
      if (!storage) { setSaveStatus("blocked"); return; }
      const latest = parseExpansionCourseProgress(storage.getItem(EXPANSION_COURSE_STORAGE_KEY));
      if (!latest) { setSaveStatus("blocked"); return; }
      const next = withExpansionLessonResult(latest, unit, firstCorrect);
      storage.setItem(EXPANSION_COURSE_STORAGE_KEY, JSON.stringify(next));
      setPrior(next);
      setSaveStatus("saved");
    } catch { setSaveStatus("failed"); }
  }

  function next() {
    if (index === unit.steps.length - 1) { setPhase("finished"); saveResult(); return; }
    setIndex(position => position + 1); setAnswer(""); setResult(null);
  }

  function restart() {
    setPhase("learn"); setIndex(0); setAnswer(""); setResult(null); setFirstCorrect(0);
    setSaveStatus(prior ? "pending" : "blocked");
  }

  return <div className="space-y-7">
    <Link href={localizedPathname("/expansion", locale)} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700"><ArrowLeft size={16} />{es ? "Tu camino para conversar" : "Your conversation path"}</Link>
    <header><p className="eyebrow">{es ? "Aprende · recuerda · habla" : "Learn · recall · speak"}</p><h1 className="display-title mt-3 text-4xl sm:text-5xl">{unit.title[locale]}</h1><p className="mt-4 max-w-2xl leading-7 text-stone-600">{unit.goal[locale]}</p></header>
    {saveStatus === "blocked" && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{es ? "El registro de estas lecciones no se pudo leer. Puedes practicar; conservaremos el registro existente sin reemplazarlo." : "The record for these lessons could not be read. You can practice; the existing record will be kept without replacing it."}</p>}
    {phase === "learn" && <>
      <div className="grid gap-5 lg:grid-cols-2">{unit.ruleIds.map(id => ruleById.get(id)).filter(Boolean).map(rule => <section key={rule!.id} className="surface p-6"><h2 className="text-xl font-black">{rule!.title[locale]}</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-stone-600">{rule!.explanation[locale]}</p><p className="mt-4 text-xs leading-6 text-stone-500">{rule!.scope[locale]}</p></section>)}</div>
      <section className="surface p-6 sm:p-8"><h2 className="text-xl font-black">{es ? "Expresiones que usarás" : "Expressions you will use"}</h2><div className="mt-6 grid gap-5 sm:grid-cols-2">{unit.phraseIds.map(id => phraseById.get(id)!).map(phrase => <div key={phrase.id} className="rounded-xl border border-stone-200 p-5"><p className="text-2xl font-black text-emerald-800">{phrase.nahuatl}</p><p className="mt-3 text-sm text-stone-600">{expansionMeaning(phrase, locale)}</p><div className="mt-4"><SourceAudio url={phrase.audioUrl} text={phrase.nahuatl} referenceId={`phrase:${phrase.id}`} kind="source" /></div></div>)}</div><button type="button" onClick={() => setPhase("practice")} className="button-primary mt-7">{es ? "Practicar de memoria" : "Practice from memory"}<ArrowRight size={16} /></button></section>
    </>}
    {phase === "practice" && step && <section className="surface p-6 sm:p-9" aria-live="polite">
      <div className="mb-6 flex justify-between gap-3 text-xs font-bold text-stone-500"><span>{es ? "Paso" : "Step"} {index + 1} / {unit.steps.length}</span><span>{es ? "Recupera lo que aprendiste" : "Recall what you learned"}</span></div>
      <div className="mb-7 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full bg-emerald-700" style={{ width: `${index / unit.steps.length * 100}%` }} /></div>
      <h2 className="text-2xl font-black leading-9">{step.prompt[locale]}</h2>
      {cue && <div className="mt-5 space-y-3 rounded-xl bg-emerald-50 p-5"><p className="text-2xl font-black text-emerald-800">{cue.nahuatl}</p><SourceAudio url={cue.audioUrl} text={cue.nahuatl} referenceId={`phrase:${cue.id}`} /></div>}
      {step.kind === "choice" && <div className="mt-7 grid gap-3 sm:grid-cols-2">{step.choices.map(id => phraseById.get(id)!).map(choice => <button type="button" key={choice.id} disabled={result !== null} onClick={() => respond(step.answerPhraseIds.includes(choice.id))} className="rounded-xl border border-stone-200 p-5 text-left text-xl font-bold text-emerald-900 transition hover:border-emerald-500 disabled:opacity-70">{choice.nahuatl}</button>)}</div>}
      {step.kind === "recall" && <form className="mt-7 space-y-4" onSubmit={event => { event.preventDefault(); respond(checkExpansionResponse(answer, answers)); }}><label className="block"><span className="text-sm font-bold text-stone-600">{es ? "Escribe en náhuatl" : "Write in Nahuatl"}</span><input autoComplete="off" spellCheck={false} disabled={result !== null} value={answer} onChange={event => setAnswer(event.target.value)} className="mt-3 w-full rounded-xl border border-stone-300 p-4 text-xl" /></label><div className="flex flex-wrap gap-3"><button className="button-primary disabled:opacity-40" disabled={!answer.trim() || result !== null}>{es ? "Comprobar respuesta" : "Check answer"}</button><button type="button" onClick={() => respond(false)} disabled={result !== null} className="button-secondary">{es ? "Mostrar una respuesta" : "Show an answer"}</button></div></form>}
      {result !== null && <div className="mt-7 space-y-5 rounded-2xl bg-stone-50 p-5"><p className="font-bold">{result ? (es ? "La recordaste en el primer intento." : "You recalled it on your first attempt.") : (es ? "Practica esta respuesta documentada." : "Practice this documented response.")}</p><p className="text-sm leading-6 text-stone-600">{step.feedback[locale]}</p>{answers.map(phrase => <div key={phrase.id} className="space-y-3 border-t border-stone-200 pt-4"><p className="text-2xl font-black text-emerald-800">{phrase.nahuatl}</p><p className="text-sm text-stone-600">{expansionMeaning(phrase, locale)}</p><SourceAudio url={phrase.audioUrl} text={phrase.nahuatl} referenceId={`phrase:${phrase.id}`} /><SpeakingRecorder /></div>)}<button type="button" onClick={next} className="button-primary">{index === unit.steps.length - 1 ? (es ? "Terminar la sesión" : "Finish session") : (es ? "Siguiente paso" : "Next step")}<ArrowRight size={16} /></button></div>}
    </section>}
    {phase === "finished" && <section className="surface p-7 sm:p-10"><Check className="text-emerald-700" size={32} /><h2 className="mt-4 text-3xl font-black">{es ? "Lleva estas palabras a tu vida" : "Bring these words into your life"}</h2><p className="mt-5 text-lg font-bold text-emerald-800">{firstCorrect} / {unit.steps.length} {es ? "respuestas recordadas en el primer intento" : "answers recalled on the first attempt"}</p><p className="mt-4 leading-7 text-stone-600">{unit.mastery[locale]}</p><p className="mt-4 text-xs text-stone-500">{saveStatus === "saved" ? (es ? "Sesión guardada en este navegador. Practícala de nuevo otro día." : "Session saved in this browser. Practice it again on another day.") : (es ? "La sesión no se ha guardado en este navegador." : "The session has not been saved in this browser.")}</p>{saveStatus === "failed" && <button type="button" onClick={saveResult} className="mt-4 text-sm font-bold text-amber-800 underline">{es ? "Reintentar guardar" : "Retry saving"}</button>}<div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={restart} className="button-secondary"><RotateCcw size={16} />{es ? "Volver a practicar" : "Practice again"}</button><Link href={localizedPathname("/expansion", locale)} className="button-primary">{es ? "Seguir mi camino" : "Continue my path"}<ArrowRight size={16} /></Link></div></section>}
    {!storageReady && <p className="text-xs text-stone-500">{es ? "Cargando tu registro local…" : "Loading your local record…"}</p>}
    <details className="rounded-xl border border-stone-200 p-5 text-xs leading-6 text-stone-500"><summary className="cursor-pointer font-bold text-emerald-700">{es ? "Fuentes de estas expresiones" : "Sources for these expressions"}</summary><p className="mt-3">{es ? "Itzli escribió las explicaciones y organizó estas tareas. Las expresiones documentadas usan INALI en la práctica. Se conserva el audio de la fuente cuando coincide con la expresión." : "Itzli wrote the explanations and arranged these tasks. Documented expressions use INALI in practice. Source audio is retained when it matches the expression."}</p>{[...new Set(unit.phraseIds.map(id => phraseById.get(id)!.sourceId))].map(id => sourceById.get(id)!).map(source => <p key={source.id} className="mt-3"><a className="font-bold text-emerald-700 underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.authors.join(", ")} · {source.license}</p>)}</details>
  </div>;
}
