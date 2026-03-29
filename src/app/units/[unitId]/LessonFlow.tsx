"use client";

import { useState, useMemo } from "react";

const CHUNK_SIZE = 10;

// ── Types ──────────────────────────────────────────────────────────────────────

type VocabCard = { headword: string; gloss_en: string; part_of_speech: string };
type DialogueLine = {
  speaker_label: string;
  utterance_normalized: string;
  translation_en: string | null;
};
type ConstructionItem = { example_original: string };
type LessonBlockItem = { text_normalized: string };

type FillBlank = {
  prompt: string;
  gloss: string;
  answer: string;
  options: string[];
};

// A token-level match within a conversation line: the full inflected word is
// blanked so answer tiles are in the same form as the surrounding text.
type DialogueMatch = {
  vocabCard: VocabCard;
  answer: string;
  before: string;
  after: string;
  options: string[];
} | null;

// Per-chunk conversation block produced by buildChunkConversations.
type ConvBlock = { lines: DialogueLine[]; matches: DialogueMatch[] };

type Props = {
  unitNum: number;
  themeEn: string;
  communicativeGoal: string;
  targetBand: string;
  vocab: VocabCard[];
  dialogues: DialogueLine[];
  constructions: ConstructionItem[];
  lessonBlocks: LessonBlockItem[];
  allVocabPool: VocabCard[];
  prevUnit: { num: number; themeEn: string } | null;
  nextUnit: { num: number; themeEn: string } | null;
};

type Phase =
  | { kind: "intro" }
  | { kind: "learn"; idx: number; revealed: boolean }
  | { kind: "quizFwd"; idx: number; chosen: string | null; checked: boolean }
  | { kind: "quizRev"; idx: number; chosen: string | null; checked: boolean }
  | { kind: "fillBlank"; idx: number; chosen: string | null; checked: boolean }
  | { kind: "chunkDone"; correct: number; total: number }
  // pendingChunkDone: score to show in chunkDone after conversation; null if last chunk (→ done)
  | { kind: "dialogue"; idx: number; match: DialogueMatch; chosen: string | null; checked: boolean; pendingChunkDone: { correct: number; total: number } | null }
  | { kind: "done" };

// ── Helpers ────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Strip audit-annotation suffixes from gloss_en before display.
// DB stores correction notes like "[❌ CORRECTED: ...]" or "[⚠️ NOTE: ...]" appended to
// glosses; these must never appear in quiz options, learn cards, or hints.
function displayGloss(gloss: string): string {
  const cleaned = gloss.replace(/\s*\[(?:❌|⚠️)[^\]]*\].*$/, "").trim();
  return cleaned.length > 0 ? cleaned : "—";
}

function buildFwdOptions(correct: VocabCard, pool: VocabCard[]): string[] {
  const distractors = shuffle(pool.filter((v) => v.headword !== correct.headword))
    .slice(0, 3)
    .map((v) => displayGloss(v.gloss_en));
  return shuffle([displayGloss(correct.gloss_en), ...distractors]);
}

function buildRevOptions(correct: VocabCard, pool: VocabCard[]): string[] {
  const distractors = shuffle(pool.filter((v) => v.headword !== correct.headword))
    .slice(0, 3)
    .map((v) => v.headword);
  return shuffle([correct.headword, ...distractors]);
}

function buildFillBlanks(
  chunk: VocabCard[],
  constructions: ConstructionItem[],
  pool: VocabCard[]
): FillBlank[] {
  const results: FillBlank[] = [];
  const usedWords = new Set<string>();

  for (const c of constructions) {
    const ex = c.example_original?.trim();
    if (!ex || ex.length < 8) continue;

    for (const card of chunk) {
      if (card.headword.length < 3) continue;
      if (usedWords.has(card.headword)) continue;

      const pos = ex.toLowerCase().indexOf(card.headword.toLowerCase());
      if (pos === -1) continue;

      const blanked = ex.slice(0, pos) + "___" + ex.slice(pos + card.headword.length);

      const distractors = shuffle(
        pool.filter((v) => v.headword !== card.headword && v.headword.length >= 2)
      )
        .slice(0, 3)
        .map((v) => v.headword);

      results.push({
        prompt: blanked,
        gloss: displayGloss(card.gloss_en),
        answer: card.headword,
        options: shuffle([card.headword, ...distractors]),
      });
      usedWords.add(card.headword);
      break;
    }

    if (results.length >= 3) break;
  }
  return results;
}

// Strip Unicode combining diacritics so plain-ASCII vocab stems match
// accented dialogue text (e.g. "toca" finds "motōcah").
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Split an utterance into clean tokens, stripping leading/trailing punctuation.
function dialogueTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^[¿¡.,;:?!"'()[\]]+|[¿¡.,;:?!"'()[\]]+$/g, ""))
    .filter((t) => t.length >= 2);
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

// ── Word tile button ───────────────────────────────────────────────────────────

function WordTile({
  word,
  onClick,
  state,
}: {
  word: string;
  onClick: () => void;
  state: "idle" | "selected" | "correct" | "wrong" | "dim";
}) {
  const base =
    "px-4 py-3 rounded-xl border-2 text-sm font-bold transition-colors text-center cursor-pointer ";
  const styles: Record<string, string> = {
    idle: "border-stone-200 bg-white text-stone-800 hover:border-stone-400",
    selected: "border-stone-800 bg-stone-50 text-stone-900",
    correct: "border-emerald-400 bg-emerald-50 text-emerald-800",
    wrong: "border-red-300 bg-red-50 text-red-700",
    dim: "border-stone-100 bg-white text-stone-300",
  };
  return (
    <button className={base + styles[state]} onClick={onClick}>
      {word}
    </button>
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
  constructions,
  allVocabPool,
  prevUnit,
  nextUnit,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [chunkIndex, setChunkIndex] = useState(0);
  const [chunkCorrect, setChunkCorrect] = useState(0);

  // ── Chunk split ──────────────────────────────────────────────────────────────

  const chunks = useMemo(() => {
    const result: VocabCard[][] = [];
    for (let i = 0; i < vocab.length; i += CHUNK_SIZE) {
      result.push(vocab.slice(i, i + CHUNK_SIZE));
    }
    return result.length > 0 ? result : [[]];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitNum]);

  const currentChunk = chunks[chunkIndex] ?? [];
  const totalChunks = chunks.length;
  const isLastChunk = chunkIndex === totalChunks - 1;

  // ── Per-chunk exercise options (memoized per chunk) ──────────────────────────

  const fwdOptions = useMemo(
    () =>
      currentChunk.map((v) =>
        buildFwdOptions(v, allVocabPool.length >= 4 ? allVocabPool : currentChunk.concat(allVocabPool))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  const revOptions = useMemo(
    () =>
      currentChunk.map((v) =>
        buildRevOptions(v, allVocabPool.length >= 4 ? allVocabPool : currentChunk.concat(allVocabPool))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  const fillBlanks = useMemo(
    () =>
      buildFillBlanks(
        currentChunk,
        constructions,
        allVocabPool.length >= 4 ? allVocabPool : currentChunk.concat(allVocabPool)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  // ── Per-chunk conversation blocks ─────────────────────────────────────────────
  //
  // Only real A/B dialogue from lesson_dialogues is used (4 units have data).
  // Dialogue lines are distributed evenly across chunks.  If a unit has no
  // real dialogue, the conversation phase is skipped for all its chunks.
  //
  // For each line we find the first token whose stripped form contains a vocab
  // stem; that full token becomes the blank.  Distractors come from the pool of
  // tokens appearing in that chunk's conversation lines, topped up with vocab
  // headwords so there are always 4 tile choices.

  const chunkConversations = useMemo((): ConvBlock[] => {
    const pool = allVocabPool.length >= 4 ? allVocabPool : vocab.concat(allVocabPool);

    function buildMatch(line: DialogueLine, chunk: VocabCard[], allTokens: string[]): DialogueMatch {
      const tokens = dialogueTokens(line.utterance_normalized);
      for (const token of tokens) {
        const tokenStripped = stripDiacritics(token.toLowerCase());
        const matchedCard = chunk.find((v) => {
          const stem = stripDiacritics(v.headword.toLowerCase());
          return stem.length >= 3 && tokenStripped.includes(stem);
        });
        if (!matchedCard) continue;
        const pos = line.utterance_normalized.indexOf(token);
        if (pos === -1) continue;
        const before = line.utterance_normalized.slice(0, pos);
        const after = line.utterance_normalized.slice(pos + token.length);
        // Distractors: real tokens first, vocab headwords as fallback
        const tokenCandidates = allTokens.filter(
          (t) => stripDiacritics(t.toLowerCase()) !== tokenStripped && t.length >= 2
        );
        const vocabCandidates = pool
          .filter((v) => v.headword !== matchedCard.headword && v.headword.length >= 2)
          .map((v) => v.headword);
        const combined = [...new Set([...tokenCandidates, ...vocabCandidates])];
        const distractors = shuffle(combined).slice(0, 3);
        return {
          vocabCard: matchedCard,
          answer: token,
          before,
          after,
          options: shuffle([token, ...distractors]),
        };
      }
      return null;
    }

    return chunks.map((chunk, ci) => {
      let lines: DialogueLine[] = [];

      // Show the full dialogue after every chunk so the flow is always:
      // Learn → Quiz → Dialogue → Completion screen
      if (dialogues.length > 0) {
        lines = dialogues;
      }

      const allTokens = [
        ...new Set(lines.flatMap((l) => dialogueTokens(l.utterance_normalized))),
      ];
      return { lines, matches: lines.map((l) => buildMatch(l, chunk, allTokens)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitNum]);

  // ── Progress ─────────────────────────────────────────────────────────────────

  const totalVocabSteps = vocab.length * 3; // learn + fwd + rev per word
  const totalConvSteps = chunkConversations.reduce((s, c) => s + c.lines.length, 0);
  const totalSteps = 1 + totalVocabSteps + totalConvSteps + 1;
  const wordsBeforeChunk = chunkIndex * CHUNK_SIZE;
  const convStepsBeforeChunk = chunkConversations
    .slice(0, chunkIndex)
    .reduce((s, c) => s + c.lines.length, 0);

  function progress(): number {
    if (phase.kind === "intro") return 0;
    if (phase.kind === "learn")
      return (1 + wordsBeforeChunk + phase.idx) / totalSteps;
    if (phase.kind === "quizFwd")
      return (1 + vocab.length + wordsBeforeChunk + phase.idx) / totalSteps;
    if (phase.kind === "quizRev")
      return (1 + vocab.length * 2 + wordsBeforeChunk + phase.idx) / totalSteps;
    if (phase.kind === "fillBlank")
      return (1 + totalVocabSteps + phase.idx) / totalSteps;
    if (phase.kind === "chunkDone")
      return (1 + vocab.length * 2 + wordsBeforeChunk + currentChunk.length) / totalSteps;
    if (phase.kind === "dialogue")
      return (1 + totalVocabSteps + convStepsBeforeChunk + phase.idx) / totalSteps;
    return 1;
  }

  // ── Step label ────────────────────────────────────────────────────────────────

  function stepLabel(current: number, total: number) {
    const prefix =
      totalChunks > 1 ? `Lesson ${chunkIndex + 1} of ${totalChunks} · ` : "";
    return `${prefix}${current} / ${total}`;
  }

  // ── Advance helpers ───────────────────────────────────────────────────────────

  function finishChunk(correct: number) {
    const total = currentChunk.length * 2 + fillBlanks.length;
    const conv = chunkConversations[chunkIndex];
    if (conv && conv.lines.length > 0) {
      // Conversation after every chunk; carry the score so chunkDone can show it
      setPhase({
        kind: "dialogue",
        idx: 0,
        match: conv.matches[0] ?? null,
        chosen: null,
        checked: false,
        pendingChunkDone: isLastChunk ? null : { correct, total },
      });
    } else if (isLastChunk) {
      setPhase({ kind: "done" });
    } else {
      setPhase({ kind: "chunkDone", correct, total });
    }
  }

  function startNextChunk() {
    setChunkIndex((i) => i + 1);
    setChunkCorrect(0);
    setPhase({ kind: "learn", idx: 0, revealed: false });
  }

  // ── INTRO ─────────────────────────────────────────────────────────────────────

  if (phase.kind === "intro") {
    const totalConv = chunkConversations.filter((c) => c.lines.length > 0).length;
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
              <span>
                {totalChunks} lesson{totalChunks !== 1 ? "s" : ""} ·{" "}
                {chunks[0]?.length ?? vocab.length} words each
              </span>
            )}
            {totalConv > 0 && (
              <span>
                {totalConv} conversation exercise{totalConv !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {vocab.length > 0 ? (
            <button
              onClick={() => setPhase({ kind: "learn", idx: 0, revealed: false })}
              className="bg-stone-900 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              Start Lesson →
            </button>
          ) : (
            <p className="text-stone-400 text-sm">No content available yet.</p>
          )}
        </div>
        {(prevUnit || nextUnit) && (
          <div className="flex justify-between mt-8 text-sm text-stone-400">
            {prevUnit ? (
              <a href={`/units/${prevUnit.num}`} className="hover:text-stone-700">
                ← {prevUnit.themeEn}
              </a>
            ) : (
              <span />
            )}
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

  // ── LEARN ─────────────────────────────────────────────────────────────────────

  if (phase.kind === "learn") {
    const { idx, revealed } = phase;
    const word = currentChunk[idx];
    const isLast = idx === currentChunk.length - 1;

    function advanceLearn() {
      if (isLast) {
        setChunkCorrect(0);
        setPhase({ kind: "quizFwd", idx: 0, chosen: null, checked: false });
      } else {
        setPhase({ kind: "learn", idx: idx + 1, revealed: false });
      }
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <p className="text-xs text-stone-400 text-center mb-6 uppercase tracking-widest">
          {stepLabel(idx + 1, currentChunk.length)} · New word
        </p>
        <button
          onClick={() =>
            !revealed
              ? setPhase({ kind: "learn", idx, revealed: true })
              : advanceLearn()
          }
          className="w-full bg-white border-2 border-stone-200 rounded-2xl p-10 text-center hover:border-stone-300 transition-all shadow-sm hover:shadow-md cursor-pointer select-none"
          style={{ minHeight: "220px" }}
        >
          {!revealed ? (
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
              <p className="text-3xl font-semibold text-stone-900 mb-4">{displayGloss(word.gloss_en)}</p>
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

  // ── QUIZ FORWARD — "What does this mean?" ─────────────────────────────────────

  if (phase.kind === "quizFwd") {
    const { idx, chosen, checked } = phase;
    const word = currentChunk[idx];
    const options = fwdOptions[idx] ?? [displayGloss(word.gloss_en)];
    const isLast = idx === currentChunk.length - 1;

    function check(choice: string) {
      if (checked) return;
      if (choice === displayGloss(word.gloss_en)) setChunkCorrect((c) => c + 1);
      setPhase({ kind: "quizFwd", idx, chosen: choice, checked: true });
    }

    function advance() {
      if (isLast) {
        setPhase({ kind: "quizRev", idx: 0, chosen: null, checked: false });
      } else {
        setPhase({ kind: "quizFwd", idx: idx + 1, chosen: null, checked: false });
      }
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <p className="text-xs text-stone-400 text-center mb-6 uppercase tracking-widest">
          {stepLabel(idx + 1, currentChunk.length)} · Select the meaning
        </p>
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-6 text-center shadow-sm">
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">
            What does this mean?
          </p>
          <p className="text-3xl font-bold text-stone-900">{word.headword}</p>
        </div>
        <div className="space-y-3 mb-6">
          {options.map((opt) => {
            let cls =
              "w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-colors ";
            if (!checked) {
              cls +=
                chosen === opt
                  ? "border-stone-800 bg-stone-50 text-stone-900"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-400";
            } else {
              if (opt === displayGloss(word.gloss_en)) cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
              else if (opt === chosen) cls += "border-red-300 bg-red-50 text-red-700";
              else cls += "border-stone-100 bg-white text-stone-400";
            }
            return (
              <button key={opt} className={cls} onClick={() => check(opt)}>
                {opt}
              </button>
            );
          })}
        </div>
        {checked && (
          <button
            onClick={advance}
            className="w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
    );
  }

  // ── QUIZ REVERSE — "How do you say this?" (word tiles) ────────────────────────

  if (phase.kind === "quizRev") {
    const { idx, chosen, checked } = phase;
    const word = currentChunk[idx];
    const options = revOptions[idx] ?? [word.headword];
    const isLast = idx === currentChunk.length - 1;

    function check(choice: string) {
      if (checked) return;
      if (choice === word.headword) setChunkCorrect((c) => c + 1);
      setPhase({ kind: "quizRev", idx, chosen: choice, checked: true });
    }

    function advance() {
      if (isLast) {
        if (fillBlanks.length > 0) {
          setPhase({ kind: "fillBlank", idx: 0, chosen: null, checked: false });
        } else {
          finishChunk(chunkCorrect);
        }
      } else {
        setPhase({ kind: "quizRev", idx: idx + 1, chosen: null, checked: false });
      }
    }

    function tileState(opt: string): "idle" | "selected" | "correct" | "wrong" | "dim" {
      if (!checked) return chosen === opt ? "selected" : "idle";
      if (opt === word.headword) return "correct";
      if (opt === chosen) return "wrong";
      return "dim";
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <p className="text-xs text-stone-400 text-center mb-6 uppercase tracking-widest">
          {stepLabel(idx + 1, currentChunk.length)} · Fill in the blank
        </p>
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-6 text-center shadow-sm">
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">
            How do you say this?
          </p>
          <p className="text-3xl font-semibold text-stone-900">{displayGloss(word.gloss_en)}</p>
          {word.part_of_speech && (
            <p className="text-stone-400 text-sm font-mono mt-2">{word.part_of_speech}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {options.map((opt) => (
            <WordTile
              key={opt}
              word={opt}
              state={tileState(opt)}
              onClick={() => check(opt)}
            />
          ))}
        </div>
        {checked && (
          <button
            onClick={advance}
            className="w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
    );
  }

  // ── FILL IN THE BLANK — sentence from constructions ───────────────────────────

  if (phase.kind === "fillBlank") {
    const { idx, chosen, checked } = phase;
    const ex = fillBlanks[idx];
    const isLast = idx === fillBlanks.length - 1;

    function check(choice: string) {
      if (checked) return;
      if (choice === ex.answer) setChunkCorrect((c) => c + 1);
      setPhase({ kind: "fillBlank", idx, chosen: choice, checked: true });
    }

    function advance() {
      if (isLast) {
        finishChunk(chunkCorrect);
      } else {
        setPhase({ kind: "fillBlank", idx: idx + 1, chosen: null, checked: false });
      }
    }

    function tileState(opt: string): "idle" | "selected" | "correct" | "wrong" | "dim" {
      if (!checked) return chosen === opt ? "selected" : "idle";
      if (opt === ex.answer) return "correct";
      if (opt === chosen) return "wrong";
      return "dim";
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <p className="text-xs text-stone-400 text-center mb-6 uppercase tracking-widest">
          {stepLabel(idx + 1, fillBlanks.length)} · Complete the phrase
        </p>
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-4 shadow-sm">
          <p className="text-lg font-semibold text-stone-900 leading-snug mb-3">
            {ex.prompt}
          </p>
          {ex.gloss && (
            <p className="text-xs text-stone-400 uppercase tracking-widest">
              Hint: {ex.gloss}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {ex.options.map((opt) => (
            <WordTile
              key={opt}
              word={opt}
              state={tileState(opt)}
              onClick={() => check(opt)}
            />
          ))}
        </div>
        {checked && (
          <button
            onClick={advance}
            className="w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
    );
  }

  // ── CHUNK DONE ────────────────────────────────────────────────────────────────

  if (phase.kind === "chunkDone") {
    const pct = phase.total > 0 ? phase.correct / phase.total : 1;
    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-sm">
          <div className="text-4xl mb-6">{pct === 1 ? "🎉" : "✓"}</div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">
            Lesson {chunkIndex + 1} of {totalChunks} complete!
          </h2>
          <p className="text-stone-500 mb-2">{themeEn}</p>
          <p className="text-stone-800 font-semibold mb-8">
            {phase.correct} / {phase.total} correct
          </p>
          <button
            onClick={startNextChunk}
            className="w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Keep going →
          </button>
          <a
            href="/units"
            className="block w-full text-center text-sm text-stone-400 hover:text-stone-600 py-2 mt-2"
          >
            ← Back to all units
          </a>
        </div>
      </div>
    );
  }

  // ── DIALOGUE (conversation after each chunk) ──────────────────────────────────

  if (phase.kind === "dialogue") {
    const { idx, match, chosen, checked, pendingChunkDone } = phase;
    const conv = chunkConversations[chunkIndex];
    const line = conv.lines[idx];
    const isLast = idx === conv.lines.length - 1;
    const isPassive = match === null;
    const options = match?.options ?? [];

    // First unique speaker → left bubble; second → right bubble.
    const allSpeakers = [...new Set(conv.lines.map((l) => l.speaker_label))];
    const isRight = (speaker: string) => allSpeakers.indexOf(speaker) === 1;

    function advanceDialogue() {
      if (!isLast) {
        const next = idx + 1;
        setPhase({
          kind: "dialogue",
          idx: next,
          match: conv.matches[next] ?? null,
          chosen: null,
          checked: false,
          pendingChunkDone,
        });
      } else if (pendingChunkDone) {
        setPhase({ kind: "chunkDone", ...pendingChunkDone });
      } else {
        setPhase({ kind: "done" });
      }
    }

    function pickTile(word: string) {
      if (checked) return;
      setPhase({ kind: "dialogue", idx, match, chosen: word, checked: true, pendingChunkDone });
    }

    function tileState(opt: string): "idle" | "selected" | "correct" | "wrong" | "dim" {
      if (!checked) return chosen === opt ? "selected" : "idle";
      if (opt === match?.answer) return "correct";
      if (opt === chosen) return "wrong";
      return "dim";
    }

    function utteranceDisplay(): string {
      if (!match || checked) return line.utterance_normalized;
      return match.before + "___" + match.after;
    }

    const bubbleRight = isRight(line.speaker_label);

    // Label: "Conversation after lesson X" for multi-chunk units, or just "Conversation"
    const convLabel =
      totalChunks > 1
        ? `Conversation · after lesson ${chunkIndex + 1}`
        : "Conversation";

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <p className="text-xs text-stone-400 text-center mb-4 uppercase tracking-widest">
          {convLabel} · {idx + 1} of {conv.lines.length}
        </p>

        {/* ── Chat history ── */}
        <div className="flex flex-col gap-3 mb-4">
          {conv.lines.slice(0, idx).map((pastLine, i) => {
            const right = isRight(pastLine.speaker_label);
            return (
              <div key={i} className={`flex flex-col gap-0.5 ${right ? "items-end" : "items-start"}`}>
                <p className="text-[10px] text-stone-400 px-1">{pastLine.speaker_label}</p>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                  right
                    ? "bg-stone-800 text-white rounded-br-sm"
                    : "bg-stone-100 text-stone-800 rounded-bl-sm"
                }`}>
                  {pastLine.utterance_normalized}
                  {pastLine.translation_en && (
                    <p className="text-xs mt-1 opacity-50 italic">{pastLine.translation_en}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Current line bubble ── */}
        <div className={`flex flex-col gap-0.5 mb-5 ${bubbleRight ? "items-end" : "items-start"}`}>
          <p className="text-[10px] text-stone-400 px-1">{line.speaker_label}</p>
          <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-base font-semibold leading-snug ${
            bubbleRight
              ? "bg-stone-800 text-white rounded-br-sm"
              : "bg-stone-100 text-stone-900 rounded-bl-sm"
          }`}>
            {utteranceDisplay()}
            {line.translation_en && (
              <p className="text-xs mt-1.5 opacity-60 italic font-normal">{line.translation_en}</p>
            )}
          </div>
          {!isPassive && !checked && match && (
            <p className={`text-xs text-stone-400 mt-1 px-1 ${bubbleRight ? "self-end" : "self-start"}`}>
              Hint: {displayGloss(match.vocabCard.gloss_en)}
            </p>
          )}
        </div>

        {/* ── Word tiles ── */}
        {!isPassive && !checked && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {options.map((opt) => (
              <WordTile key={opt} word={opt} state={tileState(opt)} onClick={() => pickTile(opt)} />
            ))}
          </div>
        )}

        {/* ── Feedback banner ── */}
        {!isPassive && checked && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-semibold text-center border ${
            chosen === match?.answer
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}>
            {chosen === match?.answer
              ? `Correct! "${match.answer}" — ${displayGloss(match.vocabCard.gloss_en)}`
              : `The answer is "${match?.answer}" — ${displayGloss(match?.vocabCard?.gloss_en ?? "")}`}
          </div>
        )}

        {/* ── Continue / Next lesson / Finish ── */}
        {(isPassive || checked) && (
          <button
            onClick={advanceDialogue}
            className="w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            {isLast && !pendingChunkDone ? "Finish" : "Continue →"}
          </button>
        )}
      </div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto">
      <ProgressBar value={1} />
      <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-sm">
        <div className="text-5xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Unit complete!</h2>
        <p className="text-stone-500 mb-8">{themeEn}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setChunkIndex(0);
              setChunkCorrect(0);
              setPhase({ kind: "intro" });
            }}
            className="w-full border border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm hover:bg-stone-50 transition-colors"
          >
            Repeat unit
          </button>
          {nextUnit && (
            <a
              href={`/units/${nextUnit.num}`}
              className="w-full bg-stone-900 text-white py-2.5 rounded-xl text-sm font-medium text-center hover:bg-stone-700 transition-colors"
            >
              Next: {nextUnit.themeEn} →
            </a>
          )}
          <a
            href="/units"
            className="block w-full text-center text-sm text-stone-400 hover:text-stone-600 py-1"
          >
            ← Back to all units
          </a>
        </div>
      </div>
    </div>
  );
}
