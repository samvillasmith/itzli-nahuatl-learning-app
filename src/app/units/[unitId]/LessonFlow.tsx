"use client";

import { useState, useMemo } from "react";
import { displayGloss } from "@/lib/gloss";
import { vocabAudioUrl, dialogueAudioUrl } from "@/lib/audio";
import { markChunkDone, recordWordResult, srsOrder } from "@/lib/progress";
import { getWordImage } from "@/data/word-images";

const CHUNK_SIZE = 10;

// ── Types ──────────────────────────────────────────────────────────────────────

type VocabCard = { id: number; headword: string; gloss_en: string; part_of_speech: string };
type DialogueLine = {
  lesson_dialogue_id: string;
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

type DialogueMatch = {
  vocabCard: VocabCard;
  answer: string;
  before: string;
  after: string;
  options: string[];
} | null;

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
  | { kind: "learn"; srsIdx: number; revealed: boolean }
  | { kind: "quizFwd"; srsIdx: number; chosen: string | null; checked: boolean }
  | { kind: "quizRev"; srsIdx: number; chosen: string | null; checked: boolean }
  | { kind: "fillBlank"; idx: number; chosen: string | null; checked: boolean }
  | { kind: "chunkDone"; correct: number; total: number }
  | {
      kind: "dialogue";
      idx: number;
      match: DialogueMatch;
      chosen: string | null;
      checked: boolean;
      pendingChunkDone: { correct: number; total: number } | null;
    }
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

// Strip Unicode combining diacritics for matching.
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Split an utterance into clean tokens.
function dialogueTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^[¿¡.,;:?!"'()[\]]+|[¿¡.,;:?!"'()[\]]+$/g, ""))
    .filter((t) => t.length >= 2);
}

// Common EHN verb prefixes to strip before stem matching.
// Order: longer first to avoid partial-stripping.
const EHN_PREFIXES = [
  "ōtiquitt", "ōtimom", "ōniqu", "ōnim", "nimom", "timom",
  "nimo", "timo", "ni", "ti", "mo", "no", "to", "on",
  "qui", "ki", "mi", "in ",
];

// Common EHN suffixes to strip.
const EHN_SUFFIXES = [
  "tzin", "tzintli", "tztli", "tli", "tic", "toc", "teh",
  "huah", "queh", "meh", "neh", "iah", "tiah",
  "lia", "ltia", "ia", "ah", "h",
];

/**
 * Improved stem matching: strip common EHN prefixes/suffixes from both token
 * and vocab headword before comparing. Returns true if either direction
 * contains the other (for stems ≥ 3 chars).
 */
function stemMatch(token: string, headword: string): boolean {
  const plain = stripDiacritics(token.toLowerCase());
  const stem = stripDiacritics(headword.toLowerCase());

  // Direct substring match
  if (stem.length >= 3 && plain.includes(stem)) return true;
  if (stem.length >= 3 && stem.includes(plain)) return true;

  // Strip prefixes from token, then compare
  let stripped = plain;
  for (const pfx of EHN_PREFIXES) {
    if (plain.startsWith(pfx) && plain.length - pfx.length >= 3) {
      stripped = plain.slice(pfx.length);
      break;
    }
  }

  // Strip suffixes from token
  let stemFromToken = stripped;
  for (const sfx of EHN_SUFFIXES) {
    if (stripped.endsWith(sfx) && stripped.length - sfx.length >= 3) {
      stemFromToken = stripped.slice(0, stripped.length - sfx.length);
      break;
    }
  }

  // Strip suffixes from headword too
  let stemFromHead = stem;
  for (const sfx of EHN_SUFFIXES) {
    if (stem.endsWith(sfx) && stem.length - sfx.length >= 3) {
      stemFromHead = stem.slice(0, stem.length - sfx.length);
      break;
    }
  }

  if (stemFromHead.length >= 3 && stemFromToken.includes(stemFromHead)) return true;
  if (stemFromToken.length >= 3 && stemFromHead.includes(stemFromToken)) return true;
  return false;
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.min(100, Math.round(value * 100));
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1.5">
        {label && <span className="text-xs font-medium text-stone-400">{label}</span>}
        <span className="text-xs font-semibold text-emerald-600 ml-auto">{pct}%</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Answer tile ────────────────────────────────────────────────────────────────

function AnswerTile({
  word,
  onClick,
  state,
}: {
  word: string;
  onClick: () => void;
  state: "idle" | "selected" | "correct" | "wrong" | "dim";
}) {
  const styles: Record<string, string> = {
    idle: "border-2 border-stone-200 bg-white text-stone-800 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900",
    selected: "border-2 border-stone-700 bg-stone-50 text-stone-900 shadow-sm",
    correct: "border-2 border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm",
    wrong: "border-2 border-red-300 bg-red-50 text-red-700",
    dim: "border-2 border-stone-100 bg-stone-50 text-stone-300",
  };
  return (
    <button
      className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 text-center cursor-pointer w-full ${styles[state]}`}
      onClick={onClick}
    >
      {word}
    </button>
  );
}

// ── Feedback banner ────────────────────────────────────────────────────────────

function FeedbackBanner({
  correct,
  message,
}: {
  correct: boolean;
  message: string;
}) {
  return (
    <div
      className={`rounded-2xl px-5 py-4 mb-4 flex items-start gap-3 ${
        correct
          ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
          : "bg-red-50 border border-red-200 text-red-800"
      }`}
    >
      <span className="text-lg shrink-0">{correct ? "✓" : "✗"}</span>
      <p className="text-sm font-semibold leading-snug">{message}</p>
    </div>
  );
}

// ── Audio play button ──────────────────────────────────────────────────────────

function AudioButton({
  src,
  size = "md",
}: {
  src: string;
  size?: "sm" | "md" | "lg";
}) {
  const [playing, setPlaying] = useState(false);

  function handlePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (playing) return;
    const audio = new Audio(src);
    setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play().catch(() => setPlaying(false));
  }

  const sizeClasses = {
    sm: "p-1.5 rounded-lg",
    md: "p-2.5 rounded-xl",
    lg: "p-3 rounded-2xl",
  };
  const iconSize = { sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-5 h-5" };

  return (
    <button
      onClick={handlePlay}
      title="Play pronunciation"
      className={`flex items-center justify-center transition-all ${sizeClasses[size]} ${
        playing
          ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
          : "bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600 border border-stone-200"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={iconSize[size]}
      >
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
      </svg>
    </button>
  );
}

// ── Step counter ───────────────────────────────────────────────────────────────

function StepLabel({
  current,
  total,
  kind,
  chunkIndex,
  totalChunks,
}: {
  current: number;
  total: number;
  kind: string;
  chunkIndex: number;
  totalChunks: number;
}) {
  const kindLabel: Record<string, string> = {
    learn: "Learn",
    quizFwd: "Meaning quiz",
    quizRev: "Word recall",
    fillBlank: "Fill in the blank",
    dialogue: "Conversation",
  };
  const prefix = totalChunks > 1 ? `Lesson ${chunkIndex + 1}/${totalChunks} · ` : "";
  return (
    <p className="text-xs font-semibold text-stone-400 text-center mb-5 uppercase tracking-widest">
      {prefix}
      {kindLabel[kind] ?? kind} · {current}/{total}
    </p>
  );
}

// ── Band badge ─────────────────────────────────────────────────────────────────

function BandBadge({ band }: { band: string }) {
  const colors: Record<string, string> = {
    A1: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    A2: "bg-sky-100 text-sky-700 border border-sky-200",
    B1: "bg-violet-100 text-violet-700 border border-violet-200",
  };
  return (
    <span
      className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
        colors[band] ?? "bg-stone-100 text-stone-500"
      }`}
    >
      {band}
    </span>
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
  const chunkStartIdx = chunkIndex * CHUNK_SIZE;

  // SRS-ordered indices for this chunk (worst words first)
  const srsIndices = useMemo(
    () => srsOrder(unitNum, chunkStartIdx, currentChunk.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  // Resolve word from srs position
  function wordAt(srsIdx: number): VocabCard {
    return currentChunk[srsIndices[srsIdx]];
  }
  function globalIdx(srsIdx: number): number {
    return chunkStartIdx + srsIndices[srsIdx];
  }

  // ── Per-chunk exercise options (memoized per chunk) ──────────────────────────

  const pool =
    allVocabPool.length >= 4 ? allVocabPool : currentChunk.concat(allVocabPool);

  const fwdOptions = useMemo(
    () => srsIndices.map((wi) => buildFwdOptions(currentChunk[wi], pool)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  const revOptions = useMemo(
    () => srsIndices.map((wi) => buildRevOptions(currentChunk[wi], pool)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  const fillBlanks = useMemo(
    () => buildFillBlanks(currentChunk, constructions, pool),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  // ── Per-chunk conversation blocks ─────────────────────────────────────────────

  const chunkConversations = useMemo((): ConvBlock[] => {
    function buildMatch(
      line: DialogueLine,
      chunk: VocabCard[],
      allTokens: string[]
    ): DialogueMatch {
      const tokens = dialogueTokens(line.utterance_normalized);
      for (const token of tokens) {
        const matchedCard = chunk.find((v) => stemMatch(token, v.headword));
        if (!matchedCard) continue;
        const pos = line.utterance_normalized.indexOf(token);
        if (pos === -1) continue;
        const before = line.utterance_normalized.slice(0, pos);
        const after = line.utterance_normalized.slice(pos + token.length);
        const tokenCandidates = allTokens.filter(
          (t) =>
            stripDiacritics(t.toLowerCase()) !==
              stripDiacritics(token.toLowerCase()) && t.length >= 2
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

    return chunks.map((chunk) => {
      const lines = dialogues.length > 0 ? dialogues : [];
      const allTokens = [
        ...new Set(lines.flatMap((l) => dialogueTokens(l.utterance_normalized))),
      ];
      return { lines, matches: lines.map((l) => buildMatch(l, chunk, allTokens)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitNum]);

  // ── Progress calculation ──────────────────────────────────────────────────────

  const totalVocabSteps = vocab.length * 2; // fwd + rev per word (learn is free)
  const totalConvSteps = chunkConversations.reduce((s, c) => s + c.lines.length, 0);
  const totalSteps = 1 + vocab.length + totalVocabSteps + totalConvSteps + 1;
  const wordsBeforeChunk = chunkIndex * CHUNK_SIZE;
  const convStepsBeforeChunk = chunkConversations
    .slice(0, chunkIndex)
    .reduce((s, c) => s + c.lines.length, 0);

  function progress(): number {
    if (phase.kind === "intro") return 0;
    if (phase.kind === "learn")
      return (1 + wordsBeforeChunk + phase.srsIdx) / totalSteps;
    if (phase.kind === "quizFwd")
      return (1 + vocab.length + wordsBeforeChunk + phase.srsIdx) / totalSteps;
    if (phase.kind === "quizRev")
      return (1 + vocab.length + vocab.length + wordsBeforeChunk + phase.srsIdx) / totalSteps;
    if (phase.kind === "fillBlank")
      return (1 + vocab.length + totalVocabSteps + phase.idx) / totalSteps;
    if (phase.kind === "chunkDone" || phase.kind === "dialogue")
      return (1 + vocab.length + totalVocabSteps + convStepsBeforeChunk +
        (phase.kind === "dialogue" ? phase.idx : chunkConversations[chunkIndex]?.lines.length ?? 0)) /
        totalSteps;
    return 1;
  }

  // ── finishChunk ───────────────────────────────────────────────────────────────

  function finishChunk(correct: number) {
    const total = currentChunk.length * 2 + fillBlanks.length;
    markChunkDone(unitNum, chunkIndex, totalChunks, correct, total);
    const conv = chunkConversations[chunkIndex];
    if (conv && conv.lines.length > 0) {
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
    setPhase({ kind: "learn", srsIdx: 0, revealed: false });
  }

  // ── INTRO ─────────────────────────────────────────────────────────────────────

  if (phase.kind === "intro") {
    const totalConv = chunkConversations.filter((c) => c.lines.length > 0).length;
    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={0} />

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 text-center">
          <div className="flex justify-center gap-2 mb-6">
            <BandBadge band={targetBand} />
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
              Unit {unitNum}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-stone-900 mb-3 leading-tight">{themeEn}</h1>
          <p className="text-stone-500 text-sm mb-8 max-w-sm mx-auto">{communicativeGoal}</p>

          {/* Lesson stats */}
          <div className="flex justify-center gap-8 mb-8">
            {vocab.length > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-stone-900">{vocab.length}</div>
                <div className="text-xs text-stone-400 mt-0.5">words</div>
              </div>
            )}
            {totalChunks > 1 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-stone-900">{totalChunks}</div>
                <div className="text-xs text-stone-400 mt-0.5">lessons</div>
              </div>
            )}
            {totalConv > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-stone-900">{totalConv}</div>
                <div className="text-xs text-stone-400 mt-0.5">dialogues</div>
              </div>
            )}
          </div>

          {vocab.length > 0 ? (
            <button
              onClick={() => setPhase({ kind: "learn", srsIdx: 0, revealed: false })}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors shadow-sm"
            >
              Start Lesson →
            </button>
          ) : (
            <p className="text-stone-400 text-sm">No content available yet.</p>
          )}
        </div>

        {(prevUnit || nextUnit) && (
          <div className="flex justify-between mt-6 text-sm text-stone-400">
            {prevUnit ? (
              <a href={`/units/${prevUnit.num}`} className="hover:text-stone-700 transition-colors">
                ← {prevUnit.themeEn}
              </a>
            ) : (
              <span />
            )}
            {nextUnit && (
              <a href={`/units/${nextUnit.num}`} className="hover:text-stone-700 transition-colors">
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
    const { srsIdx, revealed } = phase;
    const word = wordAt(srsIdx);
    const isLast = srsIdx === currentChunk.length - 1;

    function advanceLearn() {
      if (isLast) {
        setChunkCorrect(0);
        setPhase({ kind: "quizFwd", srsIdx: 0, chosen: null, checked: false });
      } else {
        setPhase({ kind: "learn", srsIdx: srsIdx + 1, revealed: false });
      }
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <StepLabel
          current={srsIdx + 1}
          total={currentChunk.length}
          kind="learn"
          chunkIndex={chunkIndex}
          totalChunks={totalChunks}
        />

        <button
          onClick={() =>
            !revealed
              ? setPhase({ kind: "learn", srsIdx, revealed: true })
              : advanceLearn()
          }
          className="w-full bg-white rounded-3xl shadow-sm border border-stone-100 text-center hover:shadow-md transition-all cursor-pointer select-none overflow-hidden"
          style={{ minHeight: "240px" }}
        >
          {!revealed ? (
            (() => {
              const img = getWordImage(word.headword);
              return (
                <div className="flex flex-col h-full">
                  {img && (
                    <div className="relative h-44 w-full overflow-hidden rounded-t-3xl bg-stone-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={word.headword}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                      <a
                        href={img.pexels_url ?? "https://www.pexels.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-0 right-0 bg-black/40 text-white text-[9px] px-1.5 py-0.5 rounded-tl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {img.author ? `${img.author.slice(0, 20)} · Pexels` : "Pexels"}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-col items-center justify-center gap-4 p-8 flex-1">
                    <p className="text-4xl font-bold text-stone-900 leading-tight">{word.headword}</p>
                    {word.part_of_speech && (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">
                        {word.part_of_speech}
                      </span>
                    )}
                    <p className="text-stone-300 text-xs mt-2 uppercase tracking-widest">
                      tap to reveal meaning
                    </p>
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              const img = getWordImage(word.headword);
              return (
                <div className="flex flex-col h-full">
                  {img && (
                    <div className="relative h-44 w-full overflow-hidden rounded-t-3xl bg-stone-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={word.headword}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                      <a
                        href={img.pexels_url ?? "https://www.pexels.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-0 right-0 bg-black/40 text-white text-[9px] px-1.5 py-0.5 rounded-tl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {img.author ? `${img.author.slice(0, 20)} · Pexels` : "Pexels"}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-col items-center justify-center gap-4 p-8 flex-1">
                    <p className="text-stone-400 text-sm font-medium">{word.headword}</p>
                    <p className="text-3xl font-bold text-emerald-600 leading-tight">
                      {displayGloss(word.gloss_en)}
                    </p>
                    {word.part_of_speech && (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                        {word.part_of_speech}
                      </span>
                    )}
                    <p className="text-stone-300 text-xs mt-2 uppercase tracking-widest">
                      tap to continue
                    </p>
                  </div>
                </div>
              );
            })()
          )}
        </button>

        {/* Pronunciation */}
        <div className="flex justify-center mt-4">
          <AudioButton src={vocabAudioUrl(word.id)} size="lg" />
        </div>
      </div>
    );
  }

  // ── QUIZ FORWARD — "What does this mean?" ─────────────────────────────────────

  if (phase.kind === "quizFwd") {
    const { srsIdx, chosen, checked } = phase;
    const word = wordAt(srsIdx);
    const options = fwdOptions[srsIdx] ?? [displayGloss(word.gloss_en)];
    const isLast = srsIdx === currentChunk.length - 1;
    const correctGloss = displayGloss(word.gloss_en);
    const isCorrect = chosen === correctGloss;

    function check(choice: string) {
      if (checked) return;
      const correct = choice === correctGloss;
      recordWordResult(unitNum, globalIdx(srsIdx), correct);
      if (correct) setChunkCorrect((c) => c + 1);
      setPhase({ kind: "quizFwd", srsIdx, chosen: choice, checked: true });
    }

    function advance() {
      if (isLast) {
        setPhase({ kind: "quizRev", srsIdx: 0, chosen: null, checked: false });
      } else {
        setPhase({ kind: "quizFwd", srsIdx: srsIdx + 1, chosen: null, checked: false });
      }
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <StepLabel
          current={srsIdx + 1}
          total={currentChunk.length}
          kind="quizFwd"
          chunkIndex={chunkIndex}
          totalChunks={totalChunks}
        />

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 mb-5 text-center">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
            What does this mean?
          </p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-3xl font-bold text-stone-900">{word.headword}</p>
            <AudioButton src={vocabAudioUrl(word.id)} size="sm" />
          </div>
          {word.part_of_speech && (
            <p className="text-stone-400 text-xs mt-2 font-mono">{word.part_of_speech}</p>
          )}
        </div>

        <div className="space-y-2.5 mb-5">
          {options.map((opt) => {
            let cls =
              "w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-150 ";
            if (!checked) {
              cls +=
                chosen === opt
                  ? "border-stone-700 bg-stone-50 text-stone-900"
                  : "border-stone-200 bg-white text-stone-700 hover:border-emerald-400 hover:bg-emerald-50";
            } else {
              if (opt === correctGloss)
                cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
              else if (opt === chosen) cls += "border-red-300 bg-red-50 text-red-700";
              else cls += "border-stone-100 bg-white text-stone-300";
            }
            return (
              <button key={opt} className={cls} onClick={() => check(opt)}>
                {opt}
              </button>
            );
          })}
        </div>

        {checked && (
          <>
            <FeedbackBanner
              correct={isCorrect}
              message={
                isCorrect
                  ? `Correct! "${word.headword}" means "${correctGloss}"`
                  : `"${word.headword}" means "${correctGloss}"`
              }
            />
            <button
              onClick={advance}
              className="w-full bg-stone-900 hover:bg-stone-700 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors"
            >
              Continue →
            </button>
          </>
        )}
      </div>
    );
  }

  // ── QUIZ REVERSE — "How do you say this?" ─────────────────────────────────────

  if (phase.kind === "quizRev") {
    const { srsIdx, chosen, checked } = phase;
    const word = wordAt(srsIdx);
    const options = revOptions[srsIdx] ?? [word.headword];
    const isLast = srsIdx === currentChunk.length - 1;
    const isCorrect = chosen === word.headword;

    function check(choice: string) {
      if (checked) return;
      const correct = choice === word.headword;
      recordWordResult(unitNum, globalIdx(srsIdx), correct);
      if (correct) setChunkCorrect((c) => c + 1);
      setPhase({ kind: "quizRev", srsIdx, chosen: choice, checked: true });
    }

    function advance() {
      if (isLast) {
        if (fillBlanks.length > 0) {
          setPhase({ kind: "fillBlank", idx: 0, chosen: null, checked: false });
        } else {
          finishChunk(chunkCorrect);
        }
      } else {
        setPhase({ kind: "quizRev", srsIdx: srsIdx + 1, chosen: null, checked: false });
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
        <StepLabel
          current={srsIdx + 1}
          total={currentChunk.length}
          kind="quizRev"
          chunkIndex={chunkIndex}
          totalChunks={totalChunks}
        />

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 mb-5 text-center">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
            How do you say this?
          </p>
          <p className="text-3xl font-bold text-stone-900">{displayGloss(word.gloss_en)}</p>
          {word.part_of_speech && (
            <p className="text-stone-400 text-xs mt-2 font-mono">{word.part_of_speech}</p>
          )}
          {checked && (
            <div className="flex justify-center mt-3">
              <AudioButton src={vocabAudioUrl(word.id)} size="sm" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {options.map((opt) => (
            <AnswerTile
              key={opt}
              word={opt}
              state={tileState(opt)}
              onClick={() => check(opt)}
            />
          ))}
        </div>

        {checked && (
          <>
            <FeedbackBanner
              correct={isCorrect}
              message={
                isCorrect
                  ? `Correct! "${displayGloss(word.gloss_en)}" = "${word.headword}"`
                  : `The answer is "${word.headword}"`
              }
            />
            <button
              onClick={advance}
              className="w-full bg-stone-900 hover:bg-stone-700 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors"
            >
              Continue →
            </button>
          </>
        )}
      </div>
    );
  }

  // ── FILL IN THE BLANK ─────────────────────────────────────────────────────────

  if (phase.kind === "fillBlank") {
    const { idx, chosen, checked } = phase;
    const ex = fillBlanks[idx];
    const isLast = idx === fillBlanks.length - 1;
    const isCorrect = chosen === ex.answer;

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
        <StepLabel
          current={idx + 1}
          total={fillBlanks.length}
          kind="fillBlank"
          chunkIndex={chunkIndex}
          totalChunks={totalChunks}
        />

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 mb-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
            Complete the phrase
          </p>
          <p className="text-lg font-bold text-stone-900 leading-snug mb-3">{ex.prompt}</p>
          {ex.gloss && (
            <p className="text-xs text-stone-400 font-medium">
              Hint: <span className="text-emerald-600">{ex.gloss}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {ex.options.map((opt) => (
            <AnswerTile
              key={opt}
              word={opt}
              state={tileState(opt)}
              onClick={() => check(opt)}
            />
          ))}
        </div>

        {checked && (
          <>
            <FeedbackBanner
              correct={isCorrect}
              message={isCorrect ? `Correct! "${ex.answer}"` : `The answer is "${ex.answer}"`}
            />
            <button
              onClick={advance}
              className="w-full bg-stone-900 hover:bg-stone-700 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors"
            >
              Continue →
            </button>
          </>
        )}
      </div>
    );
  }

  // ── CHUNK DONE ────────────────────────────────────────────────────────────────

  if (phase.kind === "chunkDone") {
    const pct = phase.total > 0 ? phase.correct / phase.total : 1;
    const star = pct === 1 ? "🌟" : pct >= 0.7 ? "✓" : "📖";
    const msg =
      pct === 1
        ? "Perfect score!"
        : pct >= 0.7
        ? "Great work!"
        : "Keep practicing — you'll get it!";

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-10 text-center">
          <div className="text-5xl mb-5">{star}</div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">
            Lesson {chunkIndex + 1} of {totalChunks} done!
          </h2>
          <p className="text-stone-400 text-sm mb-3">{themeEn}</p>
          <p className="text-emerald-600 font-bold text-lg mb-1">
            {phase.correct}/{phase.total} correct
          </p>
          <p className="text-stone-400 text-sm mb-8">{msg}</p>
          <button
            onClick={startNextChunk}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors shadow-sm"
          >
            Next lesson →
          </button>
          <a
            href="/units"
            className="block text-center text-xs text-stone-400 hover:text-stone-600 py-2 mt-3"
          >
            ← Back to all units
          </a>
        </div>
      </div>
    );
  }

  // ── DIALOGUE ──────────────────────────────────────────────────────────────────

  if (phase.kind === "dialogue") {
    const { idx, match, chosen, checked, pendingChunkDone } = phase;
    const conv = chunkConversations[chunkIndex];
    const line = conv.lines[idx];
    const isLast = idx === conv.lines.length - 1;
    const isPassive = match === null;
    const options = match?.options ?? [];

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

    const convLabel =
      totalChunks > 1 ? `Conversation · after lesson ${chunkIndex + 1}` : "Conversation";

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progress()} />
        <StepLabel
          current={idx + 1}
          total={conv.lines.length}
          kind="dialogue"
          chunkIndex={chunkIndex}
          totalChunks={totalChunks}
        />
        <p className="text-xs text-stone-400 text-center -mt-3 mb-4">{convLabel}</p>

        {/* Chat history */}
        <div className="flex flex-col gap-2.5 mb-3">
          {conv.lines.slice(0, idx).map((pastLine, i) => {
            const right = isRight(pastLine.speaker_label);
            return (
              <div
                key={i}
                className={`flex flex-col gap-0.5 ${right ? "items-end" : "items-start"}`}
              >
                <p className="text-[10px] text-stone-400 px-1">{pastLine.speaker_label}</p>
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                    right
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-stone-100 text-stone-800 rounded-bl-sm"
                  }`}
                >
                  {pastLine.utterance_normalized}
                  {pastLine.translation_en && (
                    <p className="text-xs mt-1 opacity-60 italic">{pastLine.translation_en}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current line */}
        <div
          className={`flex flex-col gap-0.5 mb-4 ${
            isRight(line.speaker_label) ? "items-end" : "items-start"
          }`}
        >
          <div className={`flex items-center gap-1.5 px-1 ${isRight(line.speaker_label) ? "flex-row-reverse" : ""}`}>
            <p className="text-[10px] text-stone-400">{line.speaker_label}</p>
            <AudioButton src={dialogueAudioUrl(line.lesson_dialogue_id)} size="sm" />
          </div>
          <div
            className={`max-w-[82%] px-4 py-3 rounded-2xl text-base font-semibold leading-snug shadow-sm ${
              isRight(line.speaker_label)
                ? "bg-emerald-600 text-white rounded-br-sm"
                : "bg-stone-100 text-stone-900 rounded-bl-sm"
            }`}
          >
            {utteranceDisplay()}
            {line.translation_en && (
              <p className="text-xs mt-1.5 opacity-60 italic font-normal">
                {line.translation_en}
              </p>
            )}
          </div>
          {!isPassive && !checked && match && (
            <p
              className={`text-xs text-emerald-600 mt-1 px-1 font-medium ${
                isRight(line.speaker_label) ? "self-end" : "self-start"
              }`}
            >
              Hint: {displayGloss(match.vocabCard.gloss_en)}
            </p>
          )}
        </div>

        {/* Word tiles */}
        {!isPassive && !checked && (
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {options.map((opt) => (
              <AnswerTile key={opt} word={opt} state={tileState(opt)} onClick={() => pickTile(opt)} />
            ))}
          </div>
        )}

        {/* Feedback */}
        {!isPassive && checked && (
          <FeedbackBanner
            correct={chosen === match?.answer}
            message={
              chosen === match?.answer
                ? `Correct! "${match.answer}" — ${displayGloss(match.vocabCard.gloss_en)}`
                : `The answer is "${match?.answer}" — ${displayGloss(match?.vocabCard?.gloss_en ?? "")}`
            }
          />
        )}

        {(isPassive || checked) && (
          <button
            onClick={advanceDialogue}
            className="w-full bg-stone-900 hover:bg-stone-700 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors"
          >
            {isLast && !pendingChunkDone ? "Finish →" : "Continue →"}
          </button>
        )}
      </div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto">
      <ProgressBar value={1} />
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-10 text-center">
        <div className="text-5xl mb-5">🎉</div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Unit complete!</h2>
        <p className="text-stone-500 mb-2">{themeEn}</p>
        <p className="text-emerald-600 text-sm font-semibold mb-8">All lessons finished</p>

        <div className="flex flex-col gap-3">
          {nextUnit && (
            <a
              href={`/units/${nextUnit.num}`}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl text-sm font-bold text-center transition-colors shadow-sm"
            >
              Next: {nextUnit.themeEn} →
            </a>
          )}
          <a
            href={`/practice/${unitNum}`}
            className="w-full border-2 border-stone-200 hover:border-emerald-300 text-stone-600 hover:text-emerald-700 py-3 rounded-2xl text-sm font-semibold text-center transition-colors"
          >
            Review flashcards
          </a>
          <button
            onClick={() => {
              setChunkIndex(0);
              setChunkCorrect(0);
              setPhase({ kind: "intro" });
            }}
            className="w-full border border-stone-200 text-stone-400 hover:text-stone-600 py-2.5 rounded-2xl text-sm transition-colors"
          >
            Repeat unit
          </button>
          <a
            href="/units"
            className="block text-center text-xs text-stone-400 hover:text-stone-600 py-1"
          >
            ← Back to all units
          </a>
        </div>
      </div>
    </div>
  );
}
