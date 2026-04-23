"use client";

import { useState, useMemo, useCallback } from "react";
import { displayGloss } from "@/lib/gloss";
import { vocabAudioUrl, dialogueAudioUrl } from "@/lib/audio";
import { markChunkDone, recordWordResult, srsOrder } from "@/lib/progress";
import { pushToCloud } from "@/lib/cloudSync";
import { getWordImage } from "@/data/word-images";
import { ALL_VARIANT_IDS, collapseVariants } from "@/data/variant-groups";
import { EXCLUDED_VOCAB_IDS } from "@/data/excluded-vocab";

// ── Constants ─────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 10;
const MINI_GROUP = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

type VocabCard = { id: number; headword: string; gloss_en: string; part_of_speech: string };
type DialogueLine = {
  lesson_dialogue_id: string;
  speaker_label: string;
  utterance_normalized: string;
  translation_en: string | null;
};
type ConstructionItem = { example_original: string; construction_label?: string; translation_en?: string | null };
type LessonBlockItem = { text_normalized: string };

type FillBlank = {
  prompt: string;
  translation?: string;
  gloss: string;
  answer: string;
  options: string[];
  patternLabel?: string;
};

type DialogueMatch = {
  vocabCard: VocabCard;
  answer: string;
  before: string;
  after: string;
  options: string[];
} | null;

type TipData = { icon: string; title: string; body: string };

type LessonStep =
  | { kind: "learn"; wordIdx: number }
  | { kind: "matchPairs"; wordIndices: number[] }
  | { kind: "quizFwd"; wordIdx: number }
  | { kind: "quizRev"; wordIdx: number }
  | { kind: "fillBlank"; fillIdx: number }
  | { kind: "tipCard"; tip: TipData }
  | { kind: "dialogue"; lineIdx: number; match: DialogueMatch };

type FlowMode =
  | { screen: "intro" }
  | { screen: "step"; stepIdx: number }
  | { screen: "chunkDone"; correct: number; total: number }
  | { screen: "done" };

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

// ── Cultural & grammar tips ───────────────────────────────────────────────────

const UNIT_TIPS: Record<number, TipData[]> = {
  1: [
    { icon: "🗣️", title: "A Living Language", body: "Eastern Huasteca Nahuatl is spoken by about 200,000 people in the Huasteca region of Veracruz, Hidalgo, and San Luis Potosí. It's not an ancient relic — it's spoken in homes, markets, and schools every day." },
    { icon: "✏️", title: "The IDIEZ Spelling", body: "This course uses IDIEZ orthography — the academic standard. Long vowels get macrons (ā, ē, ī, ō), and the glottal stop (saltillo) is written \"h\". You'll see Nahuatl spelled differently elsewhere — that's normal." },
  ],
  2: [
    { icon: "❓", title: "Asking Questions", body: "In EHN, questions often keep the same word order as statements. The question word (tlen, aqui, canin) goes at the beginning, and your voice rises at the end." },
  ],
  3: [
    { icon: "👤", title: "Pronouns Are Optional", body: "In everyday speech, people usually drop the pronoun (na, ta, ya) because the verb prefix already shows who's acting. Pronouns are added for emphasis: \"NA nitequiti\" = \"I work\" (not someone else). Not sure what \"first person\" or \"second person\" means? Check the grammar lesson \"Who's Talking? Person & Number Explained\" under Grammar." },
    { icon: "🌸", title: "Nahua Names", body: "Traditional names come from nature and qualities: Xochitl (flower), Cuauhtli (eagle), Citlali (star). Today many speakers use Spanish first names with Nahuatl family names." },
  ],
  4: [
    { icon: "🔢", title: "Base-20 Numbers", body: "The Aztec counting system was vigesimal (base 20), not decimal. The word for 20 is cempohualli — literally \"one count.\" Numbers 1–10 are the building blocks." },
    { icon: "🎨", title: "Colors in Culture", body: "Colors carried deep meaning: turquoise (xihuitl) symbolized fire and time; red (tlapalli) meant writing and knowledge — \"red and black ink\" was a metaphor for wisdom." },
  ],
  5: [
    { icon: "🌿", title: "The Healer (Ticitl)", body: "The ticitl combined herbal medicine, massage, and spiritual practice. This was a sophisticated medical tradition with detailed knowledge of hundreds of plants." },
  ],
  6: [
    { icon: "📝", title: "Verb Prefixes", body: "Every Nahuatl verb starts with a subject prefix: ni- (I), ti- (you), nothing (he/she). Plurals add -h at the end. Master these prefixes and you can conjugate any verb." },
  ],
  7: [
    { icon: "📅", title: "Two Calendars", body: "The Aztecs used two interlocking calendars: the 365-day xiuhpohualli for agriculture and the 260-day tonalpohualli for divination. Together they created a 52-year cycle." },
  ],
  8: [
    { icon: "📝", title: "Possession = Prefixes", body: "\"My house\" isn't two words — it's one: nocal (no- + calli). The possessive prefix replaces the -tl/-tli ending. Simple and elegant." },
  ],
  9: [
    { icon: "👨‍👩‍👧‍👦", title: "Family Words", body: "Nahuatl family terms are more specific than English. There are different words for older vs. younger siblings, and for relatives on your mother's vs. father's side." },
  ],
  10: [
    { icon: "👁️", title: "Adjectives Are Verbs", body: "Many Nahuatl adjectives are actually stative verbs — \"to be tall,\" \"to be red.\" They take the same subject prefixes as regular verbs." },
  ],
  11: [
    { icon: "🤝", title: "Greetings Matter", body: "Proper greeting is deeply important in Nahua communities. The word pialli (hello) sets the tone for respectful interaction." },
  ],
  12: [
    { icon: "📝", title: "Future Tense", body: "To say what will happen, add -z (singular) or -zqueh (plural) to the verb stem: nitequitiz = I will work. Simple and regular!" },
  ],
  13: [
    { icon: "📝", title: "Object Prefixes", body: "When a verb has a specific object, it gets an object prefix: nic- (I…it), tic- (you…it), qui- (he/she…it). Think of it as \"I-it-eat\" → niccua." },
  ],
  14: [
    { icon: "📝", title: "Past Tense", body: "The ō- prefix marks completed actions: ōnitequitih (I worked). One of the most recognizable features of Nahuatl speech." },
  ],
  15: [
    { icon: "🎵", title: "Song & Poetry", body: "Nahuatl has a long tradition of poetry (cuicatl). \"Flower and Song\" (in xochitl in cuicatl) was a metaphor for art, beauty, and truth." },
  ],
  16: [
    { icon: "🏠", title: "The Nahua Home", body: "Traditional Nahua houses were built around a central patio. The kitchen (tlecuilli — \"fire place\") was the heart of the home." },
  ],
  17: [
    { icon: "🪑", title: "Everyday Objects", body: "Many everyday objects in Nahuatl are compound words: tlecuilli (fire-place = hearth), ichpamitl (broom-arrow = dustpan). The language builds meaning from parts." },
  ],
  18: [
    { icon: "🌶️", title: "Nahua Cuisine", body: "Nahua cuisine gave the world chocolate (xocolātl), chili (chīlli), tomato (tomatl), and avocado (āhuacatl). These words entered Spanish, then every European language." },
  ],
  20: [
    { icon: "📝", title: "Diminutives & Respect", body: "The suffixes -tzin (respect/affection) and -pil (smallness) change a word's tone: cihuatl (woman) → cihuatzin (respected woman, ma'am)." },
  ],
  21: [
    { icon: "🌽", title: "Milpa Farming", body: "The milpa — growing corn, beans, and squash together — is one of the oldest agricultural systems in the Americas. Each plant helps the others grow." },
  ],
  24: [
    { icon: "🏛️", title: "Sacred Architecture", body: "The teopan (temple) was the spiritual center of every Nahua community. The word combines teo- (sacred) + -pan (place)." },
  ],
  27: [
    { icon: "🏪", title: "The Tianguis", body: "The tianguis (open-air market) predates the Spanish conquest by centuries. The Tlatelolco market amazed Cortés's soldiers — it was larger than any market in Europe." },
  ],
  30: [
    { icon: "📝", title: "The Conditional", body: "Nahuatl uses intla (if) to start conditional sentences. The verb forms stay mostly regular — a welcome break from the irregular conditionals in European languages." },
  ],
  31: [
    { icon: "🌀", title: "Cleansing Ceremonies", body: "The temazcal (sweat lodge) tradition continues today. It combines physical cleansing with spiritual renewal — the word means \"house of steam.\"" },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function extractTranslation(text: string): { nahuatl: string; translation?: string } {
  const parenMatch = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) return { nahuatl: parenMatch[1].trim(), translation: parenMatch[2].trim() };

  const colonMatch = text.match(/^([A-Z]):\s*(.+)/);
  if (colonMatch) return { nahuatl: text, translation: undefined };

  return { nahuatl: text, translation: undefined };
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

    const { nahuatl, translation: parenTranslation } = extractTranslation(ex);
    const translation = c.translation_en || parenTranslation;

    for (const card of chunk) {
      if (card.headword.length < 3 || usedWords.has(card.headword)) continue;

      const pos = nahuatl.toLowerCase().indexOf(card.headword.toLowerCase());
      if (pos === -1) continue;

      const blanked = nahuatl.slice(0, pos) + "___" + nahuatl.slice(pos + card.headword.length);
      const distractors = shuffle(
        pool.filter((v) => v.headword !== card.headword && v.headword.length >= 2)
      )
        .slice(0, 3)
        .map((v) => v.headword);

      results.push({
        prompt: blanked,
        translation,
        gloss: displayGloss(card.gloss_en),
        answer: card.headword,
        options: shuffle([card.headword, ...distractors]),
        patternLabel: c.construction_label,
      });
      usedWords.add(card.headword);
      break;
    }

    if (results.length >= 6) break;
  }
  return results;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function dialogueTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^[¿¡.,;:?!"'()[\]]+|[¿¡.,;:?!"'()[\]]+$/g, ""))
    .filter((t) => t.length >= 2);
}

const EHN_PREFIXES = [
  "ōtiquitt", "ōtimom", "ōniqu", "ōnim", "nimom", "timom",
  "nimo", "timo", "ni", "ti", "mo", "no", "to", "on",
  "qui", "ki", "mi", "in ",
];

const EHN_SUFFIXES = [
  "tzin", "tzintli", "tztli", "tli", "tic", "toc", "teh",
  "huah", "queh", "meh", "neh", "iah", "tiah",
  "lia", "ltia", "ia", "ah", "h",
];

function stemMatch(token: string, headword: string): boolean {
  const plain = stripDiacritics(token.toLowerCase());
  const stem = stripDiacritics(headword.toLowerCase());

  if (stem.length >= 3 && plain.includes(stem)) return true;
  if (stem.length >= 3 && stem.includes(plain)) return true;

  let stripped = plain;
  for (const pfx of EHN_PREFIXES) {
    if (plain.startsWith(pfx) && plain.length - pfx.length >= 3) {
      stripped = plain.slice(pfx.length);
      break;
    }
  }

  let stemFromToken = stripped;
  for (const sfx of EHN_SUFFIXES) {
    if (stripped.endsWith(sfx) && stripped.length - sfx.length >= 3) {
      stemFromToken = stripped.slice(0, stripped.length - sfx.length);
      break;
    }
  }

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

// ── Sequence builder ──────────────────────────────────────────────────────────

function buildDialogueMatch(
  line: DialogueLine,
  chunk: VocabCard[],
  allTokens: string[],
  pool: VocabCard[]
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

function buildSequence(
  chunk: VocabCard[],
  srsIndices: number[],
  fillBlanks: FillBlank[],
  dialogues: DialogueLine[],
  pool: VocabCard[],
  unitNum: number,
): LessonStep[] {
  const steps: LessonStep[] = [];
  if (chunk.length === 0) return steps;

  const miniGroups: number[][] = [];
  for (let i = 0; i < srsIndices.length; i += MINI_GROUP) {
    miniGroups.push(srsIndices.slice(i, i + MINI_GROUP));
  }

  const tips = UNIT_TIPS[unitNum] ?? [];
  let fillIdx = 0;
  let tipIdx = 0;

  for (let g = 0; g < miniGroups.length; g++) {
    const group = miniGroups[g];

    for (const wi of group) {
      steps.push({ kind: "learn", wordIdx: wi });
    }

    if (group.length >= 2) {
      steps.push({ kind: "matchPairs", wordIndices: group });
    }

    for (let i = 0; i < group.length; i++) {
      steps.push({
        kind: (g + i) % 2 === 0 ? "quizFwd" : "quizRev",
        wordIdx: group[i],
      });
    }

    if (fillIdx < fillBlanks.length) {
      steps.push({ kind: "fillBlank", fillIdx: fillIdx++ });
    }

    if (tipIdx < tips.length && g < miniGroups.length - 1) {
      steps.push({ kind: "tipCard", tip: tips[tipIdx++] });
    }
  }

  if (dialogues.length > 0) {
    const allTokens = [
      ...new Set(dialogues.flatMap((l) => dialogueTokens(l.utterance_normalized))),
    ];
    for (let i = 0; i < dialogues.length; i++) {
      steps.push({
        kind: "dialogue",
        lineIdx: i,
        match: buildDialogueMatch(dialogues[i], chunk, allTokens, pool),
      });
    }
  }

  return steps;
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function FeedbackBanner({ correct, message }: { correct: boolean; message: string }) {
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

function AudioButton({ src, size = "md" }: { src: string; size?: "sm" | "md" | "lg" }) {
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

  const sizeClasses = { sm: "p-1.5 rounded-lg", md: "p-2.5 rounded-xl", lg: "p-3 rounded-2xl" };
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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={iconSize[size]}>
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
      </svg>
    </button>
  );
}

function StepLabel({ text }: { text: string }) {
  return (
    <p className="text-xs font-semibold text-stone-400 text-center mb-5 uppercase tracking-widest">
      {text}
    </p>
  );
}

function BandBadge({ band }: { band: string }) {
  const colors: Record<string, string> = {
    A1: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    A2: "bg-sky-100 text-sky-700 border border-sky-200",
    B1: "bg-violet-100 text-violet-700 border border-violet-200",
  };
  return (
    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${colors[band] ?? "bg-stone-100 text-stone-500"}`}>
      {band}
    </span>
  );
}

function ContinueButton({ onClick, label = "Continue →" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-stone-900 hover:bg-stone-700 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors"
    >
      {label}
    </button>
  );
}

// ── Match Pairs Exercise ──────────────────────────────────────────────────────

function MatchPairsExercise({
  pairs,
  onComplete,
}: {
  pairs: { nahuatl: string; english: string; audioSrc: string }[];
  onComplete: () => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [shuffledRight] = useState(() => shuffle(pairs.map((_, i) => i)));

  function handleLeft(idx: number) {
    if (matched.has(idx) || wrongPair) return;
    setSelectedLeft(idx);
  }

  function handleRight(originalIdx: number) {
    if (selectedLeft === null || matched.has(originalIdx) || wrongPair) return;

    if (originalIdx === selectedLeft) {
      const next = new Set(matched);
      next.add(originalIdx);
      setMatched(next);
      setSelectedLeft(null);
      if (next.size === pairs.length) {
        setTimeout(onComplete, 500);
      }
    } else {
      setWrongPair([selectedLeft, originalIdx]);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
      }, 600);
    }
  }

  function leftStyle(idx: number) {
    if (matched.has(idx)) return "border-emerald-400 bg-emerald-50 text-emerald-700 opacity-60";
    if (wrongPair && wrongPair[0] === idx) return "border-red-300 bg-red-50 text-red-700";
    if (selectedLeft === idx) return "border-stone-700 bg-stone-50 text-stone-900 shadow-sm";
    return "border-stone-200 bg-white text-stone-800 hover:border-emerald-400 hover:bg-emerald-50";
  }

  function rightStyle(origIdx: number) {
    if (matched.has(origIdx)) return "border-emerald-400 bg-emerald-50 text-emerald-700 opacity-60";
    if (wrongPair && wrongPair[1] === origIdx) return "border-red-300 bg-red-50 text-red-700";
    return "border-stone-200 bg-white text-stone-700 hover:border-sky-400 hover:bg-sky-50";
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2.5">
          {pairs.map((p, i) => (
            <button
              key={i}
              onClick={() => handleLeft(i)}
              className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm font-bold transition-all duration-150 ${leftStyle(i)}`}
            >
              {p.nahuatl}
            </button>
          ))}
        </div>
        <div className="space-y-2.5">
          {shuffledRight.map((origIdx) => (
            <button
              key={origIdx}
              onClick={() => handleRight(origIdx)}
              className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all duration-150 ${rightStyle(origIdx)}`}
            >
              {pairs[origIdx].english}
            </button>
          ))}
        </div>
      </div>
      {matched.size === pairs.length && (
        <div className="mt-4 text-center">
          <p className="text-emerald-600 font-bold text-sm">All matched!</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const [flow, setFlow] = useState<FlowMode>({ screen: "intro" });
  const [chunkIndex, setChunkIndex] = useState(0);
  const [chunkCorrect, setChunkCorrect] = useState(0);
  const [chunkTotal, setChunkTotal] = useState(0);

  // Per-step state
  const [revealed, setRevealed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  // ── Variant collapsing ──────────────────────────────────────────────────────

  const { filteredVocab, variantNotes } = useMemo(() => {
    const afterExclusions = vocab.filter((v) => !EXCLUDED_VOCAB_IDS.has(v.id));
    const { cards, notes } = collapseVariants(afterExclusions, unitNum);
    return { filteredVocab: cards, variantNotes: notes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitNum]);

  // ── Chunk split ─────────────────────────────────────────────────────────────

  const chunks = useMemo(() => {
    const result: VocabCard[][] = [];
    for (let i = 0; i < filteredVocab.length; i += CHUNK_SIZE) {
      result.push(filteredVocab.slice(i, i + CHUNK_SIZE));
    }
    return result.length > 0 ? result : [[]];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitNum]);

  const currentChunk = chunks[chunkIndex] ?? [];
  const totalChunks = chunks.length;
  const isLastChunk = chunkIndex === totalChunks - 1;
  const chunkStartIdx = chunkIndex * CHUNK_SIZE;

  const srsIndices = useMemo(
    () => srsOrder(unitNum, chunkStartIdx, currentChunk.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  const cleanPool = allVocabPool.filter(
    (v) => !ALL_VARIANT_IDS.has(v.id) && !EXCLUDED_VOCAB_IDS.has(v.id)
  );
  const pool = cleanPool.length >= 4 ? cleanPool : currentChunk.concat(cleanPool);

  // ── Pre-build fill blanks ───────────────────────────────────────────────────

  const fillBlanks = useMemo(
    () => buildFillBlanks(currentChunk, constructions, pool),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  // ── Build per-word quiz options ─────────────────────────────────────────────

  const fwdOptions = useMemo(
    () => currentChunk.map((w) => buildFwdOptions(w, pool)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  const revOptions = useMemo(
    () => currentChunk.map((w) => buildRevOptions(w, pool)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  // ── Build sequence ──────────────────────────────────────────────────────────

  const sequence = useMemo(
    () => buildSequence(currentChunk, srsIndices, fillBlanks, dialogues, pool, unitNum),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitNum, chunkIndex]
  );

  // ── Progress ────────────────────────────────────────────────────────────────

  const stepIdx = flow.screen === "step" ? flow.stepIdx : -1;
  const progressValue = sequence.length > 0
    ? Math.max(0, (stepIdx + 1) / (sequence.length + 1))
    : 0;

  // ── Navigation ──────────────────────────────────────────────────────────────

  function resetStep() {
    setRevealed(false);
    setChosen(null);
    setChecked(false);
  }

  const advance = useCallback(() => {
    if (flow.screen !== "step") return;
    const next = flow.stepIdx + 1;
    resetStep();

    if (next >= sequence.length) {
      const total = chunkTotal;
      const correct = chunkCorrect;
      markChunkDone(unitNum, chunkIndex, totalChunks, correct, total);
      pushToCloud();
      if (isLastChunk) {
        setFlow({ screen: "done" });
      } else {
        setFlow({ screen: "chunkDone", correct, total });
      }
    } else {
      setFlow({ screen: "step", stepIdx: next });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, sequence.length, chunkCorrect, chunkTotal, unitNum, chunkIndex, totalChunks, isLastChunk]);

  function startLesson() {
    resetStep();
    setChunkCorrect(0);
    setChunkTotal(0);
    setFlow({ screen: "step", stepIdx: 0 });
  }

  function startNextChunk() {
    setChunkIndex((i) => i + 1);
    resetStep();
    setChunkCorrect(0);
    setChunkTotal(0);
    setFlow({ screen: "step", stepIdx: 0 });
  }

  // ── Chunk label helper ──────────────────────────────────────────────────────

  const chunkLabel = totalChunks > 1 ? `Lesson ${chunkIndex + 1} of ${totalChunks} · ` : "";

  // ── INTRO ───────────────────────────────────────────────────────────────────

  if (flow.screen === "intro") {
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

          <div className="flex justify-center gap-8 mb-8">
            {filteredVocab.length > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-stone-900">{filteredVocab.length}</div>
                <div className="text-xs text-stone-400 mt-0.5">words</div>
              </div>
            )}
            {totalChunks > 1 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-stone-900">{totalChunks}</div>
                <div className="text-xs text-stone-400 mt-0.5">lessons</div>
              </div>
            )}
          </div>

          {filteredVocab.length > 0 ? (
            <button
              onClick={startLesson}
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

  // ── CHUNK DONE ──────────────────────────────────────────────────────────────

  if (flow.screen === "chunkDone") {
    const pct = flow.total > 0 ? flow.correct / flow.total : 1;
    const star = pct === 1 ? "🌟" : pct >= 0.7 ? "✓" : "📖";
    const msg = pct === 1 ? "Perfect score!" : pct >= 0.7 ? "Great work!" : "Keep practicing — you'll get it!";

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={1} />
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-10 text-center">
          <div className="text-5xl mb-5">{star}</div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">
            Lesson {chunkIndex + 1} of {totalChunks} done!
          </h2>
          <p className="text-stone-400 text-sm mb-3">{themeEn}</p>
          <p className="text-emerald-600 font-bold text-lg mb-1">
            {flow.correct}/{flow.total} correct
          </p>
          <p className="text-stone-400 text-sm mb-8">{msg}</p>
          <button
            onClick={startNextChunk}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors shadow-sm"
          >
            Next lesson →
          </button>
          <a href="/units" className="block text-center text-xs text-stone-400 hover:text-stone-600 py-2 mt-3">
            ← Back to all units
          </a>
        </div>
      </div>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────────

  if (flow.screen === "done") {
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
                resetStep();
                setChunkCorrect(0);
                setChunkTotal(0);
                setFlow({ screen: "intro" });
              }}
              className="w-full border border-stone-200 text-stone-400 hover:text-stone-600 py-2.5 rounded-2xl text-sm transition-colors"
            >
              Repeat unit
            </button>
            <a href="/units" className="block text-center text-xs text-stone-400 hover:text-stone-600 py-1">
              ← Back to all units
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP RENDERER ───────────────────────────────────────────────────────────

  const step = sequence[flow.stepIdx];
  if (!step) {
    advance();
    return null;
  }

  // ── LEARN ─────────────────────────────────────────────────────────────────

  if (step.kind === "learn") {
    const word = currentChunk[step.wordIdx];
    const img = getWordImage(word.headword);

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progressValue} />
        <StepLabel text={`${chunkLabel}New word`} />

        <button
          onClick={() => {
            if (!revealed) {
              setRevealed(true);
            } else {
              advance();
            }
          }}
          className="w-full bg-white rounded-3xl shadow-sm border border-stone-100 text-center hover:shadow-md transition-all cursor-pointer select-none overflow-hidden"
          style={{ minHeight: "240px" }}
        >
          {!revealed ? (
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
                <p className="text-stone-300 text-xs mt-2 uppercase tracking-widest">tap to reveal meaning</p>
              </div>
            </div>
          ) : (
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
                {variantNotes[word.id] && variantNotes[word.id].length > 0 && (
                  <p className="text-xs text-stone-400 text-center">
                    Also written:{" "}
                    <span className="font-medium text-stone-500">{variantNotes[word.id].join(", ")}</span>
                  </p>
                )}
                <p className="text-stone-300 text-xs mt-2 uppercase tracking-widest">tap to continue</p>
              </div>
            </div>
          )}
        </button>

        <div className="flex justify-center mt-4">
          <AudioButton src={vocabAudioUrl(word.id)} size="lg" />
        </div>
      </div>
    );
  }

  // ── MATCH PAIRS ─────────────────────────────────────────────────────────────

  if (step.kind === "matchPairs") {
    const pairs = step.wordIndices.map((wi) => ({
      nahuatl: currentChunk[wi].headword,
      english: displayGloss(currentChunk[wi].gloss_en),
      audioSrc: vocabAudioUrl(currentChunk[wi].id),
    }));

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progressValue} />
        <StepLabel text={`${chunkLabel}Match the pairs`} />

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 mb-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1 text-center">
            Tap a Nahuatl word, then its English meaning
          </p>
          <div className="grid grid-cols-2 gap-2 text-center text-xs text-stone-400 mb-4">
            <span>Nahuatl</span>
            <span>English</span>
          </div>
          <MatchPairsExercise pairs={pairs} onComplete={advance} />
        </div>
      </div>
    );
  }

  // ── QUIZ FORWARD ──────────────────────────────────────────────────────────

  if (step.kind === "quizFwd") {
    const wordIdx = step.wordIdx;
    const word = currentChunk[wordIdx];
    const options = fwdOptions[wordIdx] ?? [displayGloss(word.gloss_en)];
    const correctGloss = displayGloss(word.gloss_en);
    const isCorrect = chosen === correctGloss;

    function check(choice: string) {
      if (checked) return;
      const correct = choice === correctGloss;
      recordWordResult(unitNum, chunkStartIdx + wordIdx, correct);
      setChunkTotal((t) => t + 1);
      if (correct) setChunkCorrect((c) => c + 1);
      setChosen(choice);
      setChecked(true);
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progressValue} />
        <StepLabel text={`${chunkLabel}What does this mean?`} />

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 mb-5 text-center">
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
            let cls = "w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-150 ";
            if (!checked) {
              cls += chosen === opt
                ? "border-stone-700 bg-stone-50 text-stone-900"
                : "border-stone-200 bg-white text-stone-700 hover:border-emerald-400 hover:bg-emerald-50";
            } else {
              if (opt === correctGloss) cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
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
              message={isCorrect ? `Correct! "${word.headword}" means "${correctGloss}"` : `"${word.headword}" means "${correctGloss}"`}
            />
            <ContinueButton onClick={advance} />
          </>
        )}
      </div>
    );
  }

  // ── QUIZ REVERSE ──────────────────────────────────────────────────────────

  if (step.kind === "quizRev") {
    const wordIdx = step.wordIdx;
    const word = currentChunk[wordIdx];
    const options = revOptions[wordIdx] ?? [word.headword];
    const isCorrect = chosen === word.headword;

    function check(choice: string) {
      if (checked) return;
      const correct = choice === word.headword;
      recordWordResult(unitNum, chunkStartIdx + wordIdx, correct);
      setChunkTotal((t) => t + 1);
      if (correct) setChunkCorrect((c) => c + 1);
      setChosen(choice);
      setChecked(true);
    }

    function tileState(opt: string): "idle" | "selected" | "correct" | "wrong" | "dim" {
      if (!checked) return chosen === opt ? "selected" : "idle";
      if (opt === word.headword) return "correct";
      if (opt === chosen) return "wrong";
      return "dim";
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progressValue} />
        <StepLabel text={`${chunkLabel}How do you say this?`} />

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 mb-5 text-center">
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
            <AnswerTile key={opt} word={opt} state={tileState(opt)} onClick={() => check(opt)} />
          ))}
        </div>

        {checked && (
          <>
            <FeedbackBanner
              correct={isCorrect}
              message={isCorrect ? `Correct! "${displayGloss(word.gloss_en)}" = "${word.headword}"` : `The answer is "${word.headword}"`}
            />
            <ContinueButton onClick={advance} />
          </>
        )}
      </div>
    );
  }

  // ── FILL IN THE BLANK ─────────────────────────────────────────────────────

  if (step.kind === "fillBlank") {
    const ex = fillBlanks[step.fillIdx];
    const isCorrect = chosen === ex.answer;

    function check(choice: string) {
      if (checked) return;
      setChunkTotal((t) => t + 1);
      if (choice === ex.answer) setChunkCorrect((c) => c + 1);
      setChosen(choice);
      setChecked(true);
    }

    function tileState(opt: string): "idle" | "selected" | "correct" | "wrong" | "dim" {
      if (!checked) return chosen === opt ? "selected" : "idle";
      if (opt === ex.answer) return "correct";
      if (opt === chosen) return "wrong";
      return "dim";
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progressValue} />
        <StepLabel text={`${chunkLabel}Complete the sentence`} />

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 mb-5">
          {ex.patternLabel && !ex.patternLabel.startsWith("Construction ") && (
            <p className="text-xs font-medium text-sky-600 mb-2 uppercase tracking-wide">
              {ex.patternLabel}
            </p>
          )}
          <p className="text-lg font-bold text-stone-900 leading-snug mb-2">{ex.prompt}</p>
          {ex.translation && (
            <p className="text-sm text-stone-400 italic mb-2">{ex.translation}</p>
          )}
          <p className="text-sm text-stone-500">
            The missing word means: <span className="font-semibold text-emerald-600">{ex.gloss}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {ex.options.map((opt) => (
            <AnswerTile key={opt} word={opt} state={tileState(opt)} onClick={() => check(opt)} />
          ))}
        </div>

        {checked && (
          <>
            <FeedbackBanner
              correct={isCorrect}
              message={isCorrect ? `Correct! The word is "${ex.answer}"` : `The answer is "${ex.answer}"`}
            />
            <ContinueButton onClick={advance} />
          </>
        )}
      </div>
    );
  }

  // ── TIP CARD ──────────────────────────────────────────────────────────────

  if (step.kind === "tipCard") {
    const { icon, title, body } = step.tip;

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progressValue} />

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 p-8 mb-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl shrink-0">{icon}</span>
            <div>
              <h3 className="font-bold text-stone-900 text-lg mb-2">{title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{body}</p>
            </div>
          </div>
        </div>

        <ContinueButton onClick={advance} />
      </div>
    );
  }

  // ── DIALOGUE ──────────────────────────────────────────────────────────────

  if (step.kind === "dialogue") {
    const line = dialogues[step.lineIdx];
    const match = step.match;
    const isPassive = match === null;
    const options = match?.options ?? [];

    const allSpeakers = [...new Set(dialogues.map((l) => l.speaker_label))];
    const isRight = (speaker: string) => allSpeakers.indexOf(speaker) === 1;

    function utteranceDisplay(): string {
      if (!match || checked) return line.utterance_normalized;
      return match.before + "___" + match.after;
    }

    function pickTile(word: string) {
      if (checked) return;
      setChosen(word);
      setChecked(true);
    }

    function tileState(opt: string): "idle" | "selected" | "correct" | "wrong" | "dim" {
      if (!checked) return chosen === opt ? "selected" : "idle";
      if (opt === match?.answer) return "correct";
      if (opt === chosen) return "wrong";
      return "dim";
    }

    return (
      <div className="max-w-lg mx-auto">
        <ProgressBar value={progressValue} />
        <StepLabel text={`${chunkLabel}Conversation`} />

        {/* Chat history */}
        <div className="flex flex-col gap-2.5 mb-3">
          {dialogues.slice(0, step.lineIdx).map((pastLine, i) => {
            const right = isRight(pastLine.speaker_label);
            return (
              <div key={i} className={`flex flex-col gap-0.5 ${right ? "items-end" : "items-start"}`}>
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
                    <p className={`text-xs mt-1 italic ${right ? "text-white/60" : "text-stone-400"}`}>
                      {pastLine.translation_en}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current line */}
        <div className={`flex flex-col gap-0.5 mb-4 ${isRight(line.speaker_label) ? "items-end" : "items-start"}`}>
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
              <p className={`text-xs mt-1.5 italic font-normal ${
                isRight(line.speaker_label) ? "text-white/60" : "text-stone-400"
              }`}>
                {line.translation_en}
              </p>
            )}
          </div>
          {!isPassive && !checked && match && (
            <p className={`text-xs text-emerald-600 mt-1 px-1 font-medium ${isRight(line.speaker_label) ? "self-end" : "self-start"}`}>
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
          <ContinueButton
            onClick={advance}
            label={step.lineIdx === dialogues.length - 1 ? "Finish →" : "Continue →"}
          />
        )}
      </div>
    );
  }

  return null;
}
