"use client";

import { useState, useMemo } from "react";

type VocabCard = { headword: string; gloss_en: string; part_of_speech: string };
type DialogueLine = {
  speaker_label: string;
  utterance_normalized: string;
  translation_en: string | null;
};

type Props = {
  unitNum: number;
  themeEn: string;
  communicativeGoal: string;
  targetBand: string;
  vocab: VocabCard[];
  dialogues: DialogueLine[];
  allVocabPool: VocabCard[];
  prevUnit: { num: number; themeEn: string } | null;
  nextUnit: { num: number; themeEn: string } | null;
};

// ── Phase types ────────────────────────────────────────────────────────────────

type Phase =
  | { kind: "intro" }
  | { kind: "learn"; idx: number; revealed: boolean }
  | { kind: "quiz"; idx: number; chosen: string | null; checked: boolean }
  | { kind: "dialogue"; idx: number; revealed: boolean }
  | { kind: "done" };

// Shuffle helper (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build MCQ options: correct + 3 distractors
function buildOptions(correct: VocabCard, pool: VocabCard[]): string[] {
  const distractors = shuffle(
    pool.filter((v) => v.headword !== correct.headword)
  )
    .slice(0, 3)
    .map((v) => v.gloss_en);
  return shuffle([correct.gloss_en, ...distractors]);
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-stone-100 rounded-full h-2 mb-8">
      <div
        className="bg-stone-800 h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LessonFlow({
  unitNum,
  themeEn,
  communicativeGoal,
  targetBand,
  vocab,
  dialogues,
  allVocabPool,
  prevUnit,
  nextUnit,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [correct, setCorrect] = useState(0);

  // Pre-generate quiz questions so they don't re-shuffle on re-render
  const quizOptions = useMemo(
    () => vocab.map((v) => buildOptions(v, allVocabPool.length >= 4 ? allVocabPool : vocab.concat(allVocabPool))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum]
  );

  const totalSteps =
    1 + // intro
    vocab.length + // learn
    vocab.length + // quiz
    (dialogues.length > 0 ? 1 : 0) + // dialogue
    1; // done

  function progress(): number {
    if (phase.kind === "intro") return 0;
    if (phase.kind === "learn") return (1 + phase.idx) / totalSteps;
    if (phase.kind === "quiz") return (1 + vocab.length + phase.idx) / totalSteps;
    if (phase.kind === "dialogue") return (1 + 2 * vocab.length) / totalSteps;
    return 1;
  }

  // ── Intro ──────────────────────────────────────────────────────────────────

  if (phase.kind === "intro") {
    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={0} />
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-sm">
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-500 mb-6">
            Unit {unitNum} · {targetBand}
          </span>
          <h1 className="text-3xl font-bold text-stone-900 mb-3">{themeEn}</h1>
          <p className="text-stone-500 mb-8">{communicativeGoal}</p>
          <div className="flex justify-center gap-6 text-sm text-stone-400 mb-10">
            {vocab.length > 0 && (
              <span>{vocab.length} word{vocab.length !== 1 ? "s" : ""}</span>
            )}
            {dialogues.length > 0 && (
              <span>{dialogues.length} dialogue line{dialogues.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          {vocab.length > 0 ? (
            <button
              onClick={() => setPhase({ kind: "learn", idx: 0, revealed: false })}
              className="bg-stone-900 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              Start Lesson →
            </button>
          ) : dialogues.length > 0 ? (
            <button
              onClick={() => setPhase({ kind: "dialogue", idx: 0, revealed: false })}
              className="bg-stone-900 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              Read Dialogue →
            </button>
          ) : (
            <p className="text-stone-400 text-sm">No content available for this unit yet.</p>
          )}
        </div>
        {(prevUnit || nextUnit) && (
          <div className="flex justify-between mt-8 text-sm text-stone-400">
            {prevUnit ? (
              <a href={`/units/${prevUnit.num}`} className="hover:text-stone-700">
                ← {prevUnit.themeEn}
              </a>
            ) : <span />}
            {nextUnit && (
              <a href={`/units/${nextUnit.num}`} className="hover:text-stone-700">
                {nextUnit.themeEn} →
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Learn: word introduction ───────────────────────────────────────────────

  if (phase.kind === "learn") {
    const learnIdx = phase.idx;
    const learnRevealed = phase.revealed;
    const word = vocab[learnIdx];
    const isLast = learnIdx === vocab.length - 1;

    function advanceLearn() {
      if (isLast) {
        setPhase({ kind: "quiz", idx: 0, chosen: null, checked: false });
      } else {
        setPhase({ kind: "learn", idx: learnIdx + 1, revealed: false });
      }
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <p className="text-xs text-stone-400 text-center mb-6 uppercase tracking-widest">
          New word {learnIdx + 1} of {vocab.length}
        </p>
        <button
          onClick={() =>
            !learnRevealed
              ? setPhase({ kind: "learn", idx: learnIdx, revealed: true })
              : advanceLearn()
          }
          className="w-full bg-white border-2 border-stone-200 rounded-2xl p-10 text-center hover:border-stone-300 transition-all shadow-sm hover:shadow-md cursor-pointer select-none"
          style={{ minHeight: "220px" }}
        >
          {!learnRevealed ? (
            <>
              <p className="text-4xl font-bold text-stone-900 mb-4">{word.headword}</p>
              {word.part_of_speech && (
                <p className="text-stone-400 text-sm font-mono">{word.part_of_speech}</p>
              )}
              <p className="text-stone-300 text-sm mt-8">tap to see meaning</p>
            </>
          ) : (
            <>
              <p className="text-stone-400 text-sm mb-2">{word.headword}</p>
              <p className="text-3xl font-semibold text-stone-900 mb-4">{word.gloss_en}</p>
              {word.part_of_speech && (
                <p className="text-stone-400 text-sm font-mono">{word.part_of_speech}</p>
              )}
              <p className="text-stone-300 text-sm mt-8">tap to continue</p>
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Quiz: multiple choice ──────────────────────────────────────────────────

  if (phase.kind === "quiz") {
    const quizIdx = phase.idx;
    const quizChosen = phase.chosen;
    const quizChecked = phase.checked;
    const word = vocab[quizIdx];
    const options = quizOptions[quizIdx] ?? [word.gloss_en];
    const isLast = quizIdx === vocab.length - 1;

    function check(choice: string) {
      if (quizChecked) return;
      const isCorrect = choice === word.gloss_en;
      if (isCorrect) setCorrect((c) => c + 1);
      setPhase({ kind: "quiz", idx: quizIdx, chosen: choice, checked: true });
    }

    function advanceQuiz() {
      if (isLast) {
        if (dialogues.length > 0) {
          setPhase({ kind: "dialogue", idx: 0, revealed: false });
        } else {
          setPhase({ kind: "done" });
        }
      } else {
        setPhase({ kind: "quiz", idx: quizIdx + 1, chosen: null, checked: false });
      }
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <p className="text-xs text-stone-400 text-center mb-6 uppercase tracking-widest">
          Question {phase.idx + 1} of {vocab.length}
        </p>
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-6 text-center shadow-sm">
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">What does this mean?</p>
          <p className="text-3xl font-bold text-stone-900">{word.headword}</p>
        </div>
        <div className="space-y-3 mb-6">
          {options.map((opt) => {
            let cls =
              "w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-colors ";
            if (!quizChecked) {
              cls +=
                quizChosen === opt
                  ? "border-stone-800 bg-stone-50 text-stone-900"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-400";
            } else {
              if (opt === word.gloss_en) {
                cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
              } else if (opt === quizChosen) {
                cls += "border-red-300 bg-red-50 text-red-700";
              } else {
                cls += "border-stone-100 bg-white text-stone-400";
              }
            }
            return (
              <button key={opt} className={cls} onClick={() => check(opt)}>
                {opt}
              </button>
            );
          })}
        </div>
        {quizChecked && (
          <button
            onClick={advanceQuiz}
            className="w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            {isLast && dialogues.length === 0 ? "See results →" : "Continue →"}
          </button>
        )}
      </div>
    );
  }

  // ── Dialogue ───────────────────────────────────────────────────────────────

  if (phase.kind === "dialogue") {
    const dlgIdx = phase.idx;
    const dlgRevealed = phase.revealed;
    const line = dialogues[dlgIdx];
    const isLast = dlgIdx === dialogues.length - 1;

    function advanceDialogue() {
      if (isLast) {
        setPhase({ kind: "done" });
      } else {
        setPhase({ kind: "dialogue", idx: dlgIdx + 1, revealed: false });
      }
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <p className="text-xs text-stone-400 text-center mb-6 uppercase tracking-widest">
          Dialogue · line {dlgIdx + 1} of {dialogues.length}
        </p>
        <button
          onClick={() =>
            !dlgRevealed
              ? setPhase({ kind: "dialogue", idx: dlgIdx, revealed: true })
              : advanceDialogue()
          }
          className="w-full bg-white border-2 border-stone-200 rounded-2xl p-8 text-center hover:border-stone-300 transition-all shadow-sm hover:shadow-md cursor-pointer select-none"
          style={{ minHeight: "200px" }}
        >
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">
            {line.speaker_label}
          </p>
          <p className="text-xl font-semibold text-stone-900 mb-4 leading-snug">
            {line.utterance_normalized}
          </p>
          {!dlgRevealed ? (
            <p className="text-stone-300 text-sm mt-6">tap to see translation</p>
          ) : (
            <>
              {line.translation_en && (
                <p className="text-stone-500 italic mt-2">{line.translation_en}</p>
              )}
              <p className="text-stone-300 text-sm mt-6">tap to continue</p>
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto">
      <ProgressBar value={1} />
      <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-sm">
        <div className="text-5xl mb-6">
          {correct === vocab.length && vocab.length > 0 ? "🎉" : "✓"}
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Lesson complete!</h2>
        <p className="text-stone-500 mb-6">{themeEn}</p>
        {vocab.length > 0 && (
          <p className="text-lg font-semibold text-stone-800 mb-8">
            {correct} / {vocab.length} correct
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setCorrect(0);
              setPhase({ kind: "intro" });
            }}
            className="w-full border border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm hover:bg-stone-50 transition-colors"
          >
            Repeat lesson
          </button>
          {nextUnit && (
            <a
              href={`/units/${nextUnit.num}`}
              className="w-full bg-stone-900 text-white py-2.5 rounded-xl text-sm font-medium text-center hover:bg-stone-700 transition-colors"
            >
              Next: {nextUnit.themeEn} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
