"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bookmark, Check, Download, RotateCcw } from "lucide-react";
import type { AppLocale } from "@/i18n/config";
import SourceAudio from "@/components/SourceAudio";
import { resolvePracticeRecording } from "@/lib/generated-audio";
import SpeakingRecorder from "@/components/SpeakingRecorder";
import { getProgressDeviceId, subscribeProgressChanges } from "@/lib/progress-storage";
import { createExpansionPracticeBrowserStorage } from "@/lib/expansion-state";
import {
  EXPANSION_NOTE_LIMIT, emptyExpansionProgress, expansionMeaning,
  expansionRecognitionChoices, isExpansionBuildingBlock, loadExpansionProgress, mergeExpansionProgress,
  recordExpansionReview, saveExpansionProgress, selectExpansionReview, updateExpansionNotebook,
  type ExpansionPracticeEntry, type ExpansionProgress, type ExpansionScopedStorage, type ExpansionSkill, type ExpansionStorageResult,
} from "@/lib/expansion-practice";


/** Convert the browser's relative event timestamp to epoch milliseconds. */
function clickedAt(event: { timeStamp: number }): number {
  return Math.round(event.timeStamp > 1_000_000_000_000 ? event.timeStamp : performance.timeOrigin + event.timeStamp);
}

/** Account-scoped practice; signed-in learners also synchronize these stores. */
export default function ExpansionPractice({ entries, locale }: {
  entries: readonly ExpansionPracticeEntry[];
  locale: AppLocale;
}) {
  const es = locale === "es";
  const [progress, setProgress] = useState<ExpansionProgress>(emptyExpansionProgress);
  const progressRef = useRef(progress);
  const storageRef = useRef<ExpansionScopedStorage | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState<ExpansionStorageResult["status"]>("ready");
  const [view, setView] = useState<"practice" | "notebook">("practice");
  const [skill, setSkill] = useState<ExpansionSkill>("recall");
  const [queue, setQueue] = useState<ExpansionPracticeEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [completed, setCompleted] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");
  const [notebookEntry, setNotebookEntry] = useState<string | null>(null);
  const answerLock = useRef(false);
  const current = queue[index];
  const notebookCurrent = entries.find((entry) => entry.id === notebookEntry);
  const choices = useMemo(() => current && skill === "recognition"
    ? expansionRecognitionChoices(current, entries, locale) : [], [current, entries, locale, skill]);
  const savedEntries = entries.filter((entry) => progress.items[entry.id]?.bookmarked);
  const practiced = entries.filter((entry) => Boolean(progress.items[entry.id]?.recall.attempts)).length;

  useEffect(() => {
    // The account provider remounts its children when the selected learner changes.
    const browserStorage = createExpansionPracticeBrowserStorage();
    storageRef.current = browserStorage;
    const loaded = loadExpansionProgress(browserStorage);
    progressRef.current = loaded.progress;
    setProgress(loaded.progress);
    setStorageStatus(loaded.status);
    setHydrated(true);
    function receiveStorage(event: StorageEvent) {
      if (event.key !== browserStorage.key) return;
      refreshProgress();
    }
    function refreshProgress() {
      const next = loadExpansionProgress(browserStorage);
      setStorageStatus(next.status);
      if (next.status === "ready") {
        const merged = mergeExpansionProgress(progressRef.current, next.progress);
        progressRef.current = merged;
        setProgress(merged);
      }
    }
    const unsubscribe = subscribeProgressChanges(refreshProgress);
    window.addEventListener("storage", receiveStorage);
    return () => { unsubscribe(); window.removeEventListener("storage", receiveStorage); };
  }, []);

  function persist(next: ExpansionProgress) {
    const result: ExpansionStorageResult = storageRef.current
      ? saveExpansionProgress(storageRef.current, next) : { status: "unavailable", progress: next };
    progressRef.current = result.progress;
    setProgress(result.progress);
    setStorageStatus(result.status);
  }
  function start(nextSkill: ExpansionSkill, single?: ExpansionPracticeEntry) {
    const due = selectExpansionReview(entries, progressRef.current, nextSkill, Date.now(), entries.length);
    const available = due.length ? due : [...entries];
    const selected = single ? [single] : nextSkill === "recall" ? available.slice(0, 8) : [];
    if (!single && nextSkill === "recognition") {
      for (const entry of available) {
        if (expansionRecognitionChoices(entry, entries, locale).length >= 3) selected.push(entry);
        if (selected.length === 8) break;
      }
    }
    if (!selected.length) {
      setNotice(es ? "Todavía no hay suficientes significados distintos para esta práctica. Puedes practicar recordando las palabras."
        : "There are not enough distinct meanings for this practice yet. You can practise word recall.");
      return;
    }
    setView("practice"); setSkill(nextSkill); setQueue(selected); setIndex(0); setRevealed(false);
    setAnswer(null); setCompleted(0); setSuccesses(0);
    setNotice(!single && !due.length ? es
      ? "No tienes repasos pendientes. Esta ronda es práctica adicional; repetir hoy no alarga el intervalo de repaso."
      : "No reviews are due yet. This is extra practice; repeating today does not lengthen the review interval." : "");
    answerLock.current = false;
  }
  function rate(success: boolean, at: number, chosen?: string) {
    if (!current || answerLock.current || (skill === "recall" && !revealed)) return;
    answerLock.current = true;
    persist(recordExpansionReview(progressRef.current, current.id, skill, success, at, getProgressDeviceId()));
    setCompleted((previous) => previous + 1);
    setSuccesses((previous) => previous + Number(success));
    setAnswer(chosen ?? (success ? "remembered" : "again"));
    setRevealed(true);
  }
  function next() {
    setIndex((previous) => previous + 1); setAnswer(null); setRevealed(false); answerLock.current = false;
  }
  function bookmark(entry: ExpansionPracticeEntry, at: number) {
    persist(updateExpansionNotebook(progressRef.current, entry.id,
      { bookmarked: !progressRef.current.items[entry.id]?.bookmarked }, at));
  }
  function exportProgress() {
    const blob = new Blob([JSON.stringify(progressRef.current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "itzli-expansion-practice.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function sourceAndVoice(entry: ExpansionPracticeEntry) {
    return <div className="mt-5 space-y-4 border-t border-stone-200 pt-5">
      {(es ? entry.usageNoteEs : entry.usageNoteEn) && <p className="text-sm leading-6 text-stone-600">
        {es ? entry.usageNoteEs : entry.usageNoteEn}
      </p>}
      <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-700 underline">
        {es ? "Consultar la fuente de esta entrada" : "View this entry’s source"}
      </a>
      <SourceAudio url={entry.audioKind === "source-recording" ? entry.audioUrl ?? null : null} text={entry.display} referenceId={`vocabulary:${entry.id}`} scope={entry.display.includes(" ") ? "utterance" : "isolated-word"} />
      {resolvePracticeRecording({ text: entry.display, url: entry.audioUrl, kind: entry.audioKind, referenceId: `vocabulary:${entry.id}` }).url && <SpeakingRecorder key={entry.id} />}
    </div>;
  }

  if (!entries.length) return <div className="surface p-6 text-sm text-stone-600">
    {es ? "Las nuevas entradas aparecerán aquí después de verificar sus fuentes y significados."
      : "New entries will appear here after their sources and meanings have been verified."}
  </div>;

  return <section className="surface overflow-hidden" aria-label={es ? "Práctica de vocabulario nuevo" : "New vocabulary practice"}>
    <div className="border-b border-stone-200 bg-emerald-50/60 p-5 sm:p-7">
      <p className="eyebrow">{es ? "Recuerda · reconoce · conserva" : "Recall · recognise · keep"}</p>
      <h2 className="mt-3 text-2xl font-bold">{es ? "Haz tuyas las palabras" : "Make the words your own"}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{es
        ? "Intenta decir la palabra antes de ver la respuesta. Guarda las palabras que quieras volver a usar y añade tus propios recordatorios."
        : "Try saying the word before revealing the answer. Save words you want to use again and add your own reminders."}</p>
      <p className="mt-3 text-xs leading-5 text-stone-500">{es
        ? "Al iniciar sesión, esta práctica y tu cuaderno de vocabulario se sincronizan entre dispositivos. La práctica como invitado se guarda en este navegador. Cada cuenta tiene su propio progreso. Tus respuestas al recordar son una autoevaluación."
        : "Signed-in accounts sync this practice and vocabulary notebook across devices. Guest practice stays in this browser. Each account has its own progress. Recall answers are your own self-assessment."}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setView("practice")} aria-pressed={view === "practice"} className={view === "practice" ? "button-primary" : "button-secondary"}>
          {es ? "Practicar" : "Practise"}
        </button>
        <button type="button" onClick={() => setView("notebook")} aria-pressed={view === "notebook"} className={view === "notebook" ? "button-primary" : "button-secondary"}>
          <Bookmark size={15} /> {es ? "Mi cuaderno" : "My notebook"} ({savedEntries.length})
        </button>
        <span className="ml-auto text-xs text-stone-600">{practiced} / {entries.length} {es ? "practicadas al recordar" : "practised in recall"}</span>
      </div>
    </div>

    <div className="p-5 sm:p-7">
      {!hydrated && <p role="status" className="mb-4 text-sm text-stone-500">{es ? "Cargando tu práctica…" : "Loading your practice…"}</p>}
      {storageStatus !== "ready" && <div role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        <p>{storageStatus === "invalid" ? es
          ? "Los datos guardados de esta práctica no se pueden leer. Los hemos conservado sin sobrescribirlos. Puedes continuar en esta sesión y descargar tu progreso nuevo."
          : "Saved data for this practice could not be read. It has been kept without overwriting it. You can continue in this session and download your new progress."
          : es ? "No se pudo guardar o leer la práctica en este navegador. Puedes continuar, pero los cambios de esta sesión podrían perderse al cerrar la página."
            : "Practice could not be saved or read in this browser. You can continue, but this session’s changes may be lost when you close the page."}</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <button type="button" onClick={() => persist(progressRef.current)} className="font-bold underline">{es ? "Reintentar guardado" : "Retry saving"}</button>
          <button type="button" onClick={exportProgress} className="inline-flex items-center gap-1 font-bold underline"><Download size={14} /> {es ? "Descargar progreso" : "Download progress"}</button>
        </div>
      </div>}
      {notice && <p role="status" className="mb-4 text-sm text-stone-600">{notice}</p>}

      {view === "practice" && <>
        <div className="mb-6 flex flex-wrap gap-3">
          <button type="button" disabled={!hydrated} onClick={() => start("recall")} className="button-secondary disabled:opacity-50"><RotateCcw size={15} /> {es ? "Recordar palabras" : "Recall words"}</button>
          <button type="button" disabled={!hydrated} onClick={() => start("recognition")} className="button-secondary disabled:opacity-50">{es ? "Reconocer significados" : "Recognise meanings"}</button>
        </div>
        {!queue.length && <p className="text-sm leading-6 text-stone-500">{es
          ? "Empieza una ronda de hasta ocho palabras. Primero repasarás las que ya necesitan práctica; después conocerás otras nuevas."
          : "Start a round of up to eight words. Words ready for another review come first, followed by new words."}</p>}
        {queue.length > 0 && !current && <div role="status" className="rounded-2xl bg-emerald-50 p-6">
          <h3 className="text-xl font-bold text-emerald-800">{es ? "Ronda terminada" : "Round complete"}</h3>
          <p className="mt-2 text-sm leading-6 text-emerald-800">{es
            ? `${completed} palabras practicadas. ${successes} ${skill === "recall" ? "recordadas según tu autoevaluación" : "respuestas correctas"}.`
            : `${completed} words practised. ${successes} ${skill === "recall" ? "remembered by your self-assessment" : "correct answers"}.`}</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{es
            ? "Las palabras difíciles vuelven a estar disponibles en un minuto. Las recordadas regresan a partir de mañana."
            : "Difficult words are available again in one minute. Remembered words return from tomorrow."}</p>
        </div>}
        {current && <div className="rounded-2xl border border-stone-200 p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
            <span>{index + 1} / {queue.length} · {skill === "recall" ? es ? "Recordar" : "Recall" : es ? "Reconocer" : "Recognise"}</span>
            <button type="button" disabled={!hydrated} onClick={(event) => bookmark(current, clickedAt(event))} aria-pressed={Boolean(progress.items[current.id]?.bookmarked)} className="inline-flex items-center gap-1 font-bold text-emerald-700 disabled:opacity-50"><Bookmark size={15} fill={progress.items[current.id]?.bookmarked ? "currentColor" : "none"} /> {progress.items[current.id]?.bookmarked ? es ? "Guardada" : "Saved" : es ? "Guardar" : "Save"}</button>
          </div>
          {skill === "recall" ? <>
            <p className="mt-5 text-xs text-stone-500">{isExpansionBuildingBlock(current)
              ? es ? "Recuerda la forma que se usa para construir una palabra o expresión." : "Recall the form used to build a word or expression."
              : es ? "¿Cómo lo dirías en náhuatl?" : "How would you say this in Nahuatl?"}</p>
            <h3 className="mt-2 text-3xl font-bold text-stone-900">{expansionMeaning(current, locale)}</h3>
            {!revealed && <button type="button" onClick={() => setRevealed(true)} className="button-primary mt-6">{es ? "Mostrar respuesta" : "Reveal answer"}</button>}
            {revealed && <div className="mt-5 rounded-xl bg-emerald-50 p-5">
              <p lang="nhe" className="text-3xl font-bold text-emerald-800">{current.display}</p>
              {!answer && <><p className="mt-3 text-sm text-stone-600">{es ? "¿La recordaste antes de mostrarla?" : "Did you remember it before revealing it?"}</p>
                <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={(event) => rate(false, clickedAt(event))} className="button-secondary">{es ? "Necesito practicar" : "Need more practice"}</button>
                  <button type="button" onClick={(event) => rate(true, clickedAt(event))} className="button-primary"><Check size={15} /> {es ? "La recordé" : "I remembered"}</button></div></>}
              {answer && <p role="status" className="mt-3 text-sm text-emerald-800">{answer === "remembered" ? es ? "Repaso programado a partir de mañana." : "Scheduled for review from tomorrow." : es ? "Disponible de nuevo en un minuto." : "Available again in one minute."}</p>}
            </div>}
          </> : <>
            <p className="mt-5 text-xs text-stone-500">{es ? "Elige el significado de esta entrada." : "Choose the meaning of this entry."}</p>
            <h3 lang="nhe" className="mt-2 text-3xl font-bold">{current.display}</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{choices.map((choice) => <button type="button" key={choice.id} disabled={answer !== null}
              onClick={(event) => rate(choice.correct, clickedAt(event), choice.id)} className={`rounded-xl border p-4 text-left text-sm font-semibold disabled:cursor-default ${answer && choice.correct
                ? "border-emerald-400 bg-emerald-50 text-emerald-800" : answer === choice.id ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-white enabled:hover:border-emerald-400"}`}>
              {choice.meaning}{answer && choice.correct && <Check size={16} className="mt-2" />}
            </button>)}</div>
            {answer && <p role="status" className="mt-4 text-sm text-stone-600">{answer === current.id ? es ? "Correcto." : "Correct." : es ? `El significado es: ${expansionMeaning(current, locale)}.` : `The meaning is: ${expansionMeaning(current, locale)}.`}</p>}
          </>}
          {revealed && sourceAndVoice(current)}
          {answer && <button type="button" onClick={next} className="button-primary mt-6">{index === queue.length - 1 ? es ? "Terminar ronda" : "Finish round" : es ? "Siguiente palabra" : "Next word"} <ArrowRight size={16} /></button>}
        </div>}
      </>}

      {view === "notebook" && <div className="space-y-4">
        <p className="text-sm leading-6 text-stone-600">{es ? "Guarda una palabra durante la práctica para añadirla aquí. Tus notas son personales; no se evalúa su corrección lingüística."
          : "Save a word during practice to keep it here. Your notes are personal; their language accuracy is not assessed."}</p>
        {!savedEntries.length && <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">{es ? "Tu cuaderno todavía está vacío." : "Your notebook is empty."}</p>}
        {savedEntries.map((entry) => <div key={entry.id} className="rounded-xl border border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p lang="nhe" className="text-lg font-bold">{entry.display}</p><p className="text-sm text-stone-600">{expansionMeaning(entry, locale)}</p></div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={() => start("recall", entry)} className="text-xs font-bold text-emerald-700 underline">{es ? "Practicar" : "Practise"}</button>
              <button type="button" onClick={() => { setNotebookEntry(entry.id); setNote(progressRef.current.items[entry.id]?.note ?? ""); }} className="text-xs font-bold text-emerald-700 underline">{es ? "Editar nota" : "Edit note"}</button>
              <button type="button" onClick={(event) => { bookmark(entry, clickedAt(event)); if (notebookEntry === entry.id) setNotebookEntry(null); }} className="text-xs text-stone-500 underline">{es ? "Quitar del cuaderno" : "Remove from notebook"}</button></div>
          </div>
          {progress.items[entry.id]?.note && <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">{progress.items[entry.id].note}</p>}
        </div>)}
        {notebookCurrent && <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
          <label htmlFor="expansion-note" className="text-sm font-bold">{es ? "Tu nota para" : "Your note for"} <span lang="nhe">{notebookCurrent.display}</span></label>
          <textarea id="expansion-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={EXPANSION_NOTE_LIMIT} rows={4} className="mt-3 block w-full rounded-xl border border-stone-200 bg-white p-3 text-sm" />
          <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-stone-500">{note.length} / {EXPANSION_NOTE_LIMIT}</span>
            <button type="button" onClick={() => { persist(updateExpansionNotebook(progressRef.current, notebookCurrent.id, { note }, Date.now())); setNotebookEntry(null); }} className="button-primary">{es ? "Guardar nota" : "Save note"}</button></div>
          {sourceAndVoice(notebookCurrent)}
        </div>}
        {savedEntries.length > 0 && <button type="button" onClick={exportProgress} className="button-secondary"><Download size={15} /> {es ? "Descargar mi práctica y cuaderno" : "Download my practice and notebook"}</button>}
      </div>}
    </div>
  </section>;
}
