'use client';

import AudioButton from "@/components/PronunciationAudio";
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { GrammarLesson as GLType, GrammarSection } from '@/data/grammar-lessons';
import { GRAMMAR_LESSONS } from '@/data/learner-grammar';
import {
  getGrammarLab,
  getGrammarLabsForUnit,
  type GrammarLab,
  type GrammarLabDrill,
} from '@/data/grammar-labs';
import { answerMatches } from '@/lib/grammar-engine';
import type { GrammarDialogue } from '@/lib/db';
import { dialogueAudioUrl } from '@/lib/audio';
import { GENERATED_AUDIO_INDEX, resolvePracticeRecording } from '@/lib/generated-audio';
import { displayNahuatl } from '@/lib/orthography';
import { displayGrammarText, displayGrammarComparisonCell } from '@/lib/grammar-display';
import { pronunciationHintFor } from '@/lib/pronunciation';
import { useLocale } from '@/i18n/LocaleProvider';
import { translateDeepClient } from '@/i18n/client-translate';
import { GuidedAnswerBuilder, splitGuidedAnswer } from '@/components/GuidedAnswerBuilder';
import { useLessonAudioWarmup } from '@/components/useLessonAudioWarmup';

// ── Audio play button ──────────────────────────────────────────────────────────


const BAND_STYLES: Record<string, { badge: string; ring: string }> = {
  A1: { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', ring: 'border-emerald-100' },
  A2: { badge: 'bg-sky-50 text-sky-700 border border-sky-200', ring: 'border-sky-100' },
  B1: { badge: 'bg-violet-50 text-violet-700 border border-violet-200', ring: 'border-violet-100' },
};

function renderInline(text: string, sourceReference = false) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return <strong key={i} className="text-stone-800">{displayGrammarText(content, sourceReference)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      const content = part.slice(1, -1);
      return <em key={i}>{displayGrammarText(content, sourceReference)}</em>;
    }
    if (part === '\n') return <br key={i} />;
    return displayGrammarText(part, sourceReference);
  });
}

function PronunciationHint({ value }: { value: string }) {
  const hint = pronunciationHintFor(value);
  const { translate } = useLocale();
  if (!hint) return null;

  return (
    <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
      <p className="text-xs font-bold text-amber-800">{translate(hint.cue)}</p>
      <p className="mt-0.5 text-xs leading-snug text-stone-500">{translate(hint.note)}</p>
    </div>
  );
}

function ProseSection({ section, sourceComparison = false }: { section: Extract<GrammarSection, { kind: 'prose' }>; sourceComparison?: boolean }) {
  return (
    <div className="mb-7">
      {section.heading && <h3 className="font-semibold text-stone-700 mb-2">{displayGrammarText(section.heading)}</h3>}
      <p className="text-stone-600 leading-relaxed">{renderInline(section.text, sourceComparison)}</p>
    </div>
  );
}

function RuleSection({ section, sourceComparison = false }: { section: Extract<GrammarSection, { kind: 'rule' }>; sourceComparison?: boolean }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-7">
      <h3 className="font-bold text-amber-800 mb-2 text-sm uppercase">{displayGrammarText(section.title)}</h3>
      <p className="text-stone-700 leading-relaxed text-sm whitespace-pre-line">{renderInline(section.text, sourceComparison)}</p>
    </div>
  );
}

function ParadigmSection({ section, sourceComparison = false, audioContext }: { section: Extract<GrammarSection, { kind: 'paradigm' }>; sourceComparison?: boolean; audioContext: string }) {
  const cellText = (text: string, column: number) => sourceComparison ? displayGrammarComparisonCell(text, section.headers[column]) : displayGrammarText(text);
  function cellAudio(text: string, row: number, column: number) {
    const referenceId = `${audioContext}:${row}:${column}`;
    // The inventory explicitly identifies Nahuatl cells in every column;
    // translated labels and English glosses never infer a pronunciation cue.
    return GENERATED_AUDIO_INDEX.hasReference(referenceId)
      ? <AudioButton src={null} text={cellText(text, column)} referenceId={referenceId} size="sm" /> : null;
  }
  return (
    <div className="mb-7">
      <h3 className="font-semibold text-stone-700 mb-1">{displayGrammarText(section.heading)}</h3>
      {section.caption && <p className="text-xs text-stone-400 mb-3">{sourceComparison ? section.caption : displayGrammarText(section.caption)}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-stone-50 border-y border-stone-200">
              {section.headers.map((h, i) => (
                <th key={i} className="text-left px-3 py-2 text-xs font-bold text-stone-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, i) => (
              <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50">
                <td className="px-3 py-2.5 text-stone-500 text-xs font-medium">{cellText(row.person, 0)}{cellAudio(row.person, i, 0)}</td>
                <td className="px-3 py-2.5 font-mono text-stone-900 font-medium">{cellText(row.form, 1)}{cellAudio(row.form, i, 1)}</td>
                <td className="px-3 py-2.5 text-stone-500">{cellText(row.gloss, 2)}{cellAudio(row.gloss, i, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExamplesSection({ section, sourceComparison, audioContext }: { section: Extract<GrammarSection, { kind: 'examples' }>; sourceComparison: boolean; audioContext: string }) {
  return (
    <div className="mb-7">
      <h3 className="font-semibold text-stone-700 mb-3">{displayGrammarText(section.heading)}</h3>
      <div className="space-y-3">
        {section.items.map((item, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-base font-semibold text-stone-900 mb-0.5">{displayNahuatl(item.nahuatl)}</p>
            {item.breakdown !== item.nahuatl && (
              <p className="text-xs font-mono text-emerald-700 mb-1">{displayNahuatl(item.breakdown)}</p>
            )}
            <PronunciationHint value={item.nahuatl} />
            {!sourceComparison && <AudioButton src={null} text={displayNahuatl(item.nahuatl)} referenceId={`${audioContext}:${i}`} />}
            <p className="text-sm text-stone-500 mb-1 italic">&ldquo;{item.translation}&rdquo;</p>
            {item.note && <p className="text-xs text-stone-400 leading-snug">{displayGrammarText(item.note)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ section, sourceComparison = false, topic, sectionIndex }: { section: GrammarSection; sourceComparison?: boolean; topic: string; sectionIndex: number }) {
  if (section.kind === 'prose') return <ProseSection section={section} sourceComparison={sourceComparison} />;
  if (section.kind === 'rule') return <RuleSection section={section} sourceComparison={sourceComparison} />;
  if (section.kind === 'paradigm') return <ParadigmSection section={section} sourceComparison={sourceComparison} audioContext={`grammar-table:${topic}:${sectionIndex}`} />;
  if (section.kind === 'examples') return <ExamplesSection section={section} sourceComparison={sourceComparison} audioContext={`grammar-reference-example:${topic}:${sectionIndex}`} />;
  return null;
}

type LessonWithLabIds = GLType & { relatedGrammarLabIds?: string[] };

function getRelatedGrammarLabs(lesson: GLType): GrammarLab[] {
  const labIds = (lesson as LessonWithLabIds).relatedGrammarLabIds;
  if (labIds?.length) {
    return labIds.flatMap((id) => {
      const lab = getGrammarLab(id);
      return lab ? [lab] : [];
    });
  }

  const labs = new Map<string, GrammarLab>();
  for (const unit of lesson.relatedUnits) {
    for (const lab of getGrammarLabsForUnit(unit)) {
      labs.set(lab.id, lab);
    }
  }
  return [...labs.values()];
}

function GrammarLabExampleList({ lab }: { lab: GrammarLab }) {
  return (
    <div className="space-y-3">
      {lab.examples.map((item, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-base font-semibold text-stone-900">{displayNahuatl(item.nahuatl)}</p>
          <p className="mt-1 text-xs font-mono text-emerald-700">{displayNahuatl(item.breakdown)}</p>
          <PronunciationHint value={item.nahuatl} />
          <AudioButton src={null} text={displayNahuatl(item.nahuatl)} referenceId={`grammar-example:${lab.id}:${i}`} />
          <p className="mt-1 text-sm italic text-stone-500">&ldquo;{item.translation}&rdquo;</p>
          {item.note && <p className="mt-2 text-xs leading-snug text-stone-400">{displayGrammarText(item.note)}</p>}
        </div>
      ))}
    </div>
  );
}

function DrillAnswerPanel({
  answer,
  breakdown,
  explanation,
  audioReferenceId,
}: {
  answer: string;
  breakdown?: string;
  explanation: string;
  audioReferenceId?: string;
}) {
  const { translate } = useLocale();

  return (
    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
      <p className="text-xs font-bold uppercase text-emerald-700">{translate('Answer')}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-stone-900">{displayNahuatl(answer)}</p>
      {breakdown && <p className="mt-1 text-xs font-mono text-emerald-700">{displayNahuatl(breakdown)}</p>}
      <PronunciationHint value={answer} />
      {audioReferenceId && <AudioButton src={null} text={displayNahuatl(answer)} referenceId={audioReferenceId} />}
      <p className="mt-2 text-xs leading-relaxed text-stone-600">{displayGrammarText(explanation)}</p>
    </div>
  );
}

function DrillAnswerControl({
  answer,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  answer: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
}) {
  if (splitGuidedAnswer(answer).length > 1) {
    return <GuidedAnswerBuilder answer={answer} onChange={onChange} disabled={disabled} />;
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-50 disabled:text-stone-500"
      placeholder={placeholder}
    />
  );
}

function IdentifyItem({
  item,
}: {
  item: Extract<GrammarLabDrill, { kind: 'identify' }>['items'][number];
}) {
  const { translate } = useLocale();
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = answerMatches(input, item.answer);
  const showAnswer = checked || revealed;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-semibold text-stone-800">{displayGrammarText(item.prompt)}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setChecked(false);
          }}
          className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          placeholder={translate('Type your answer')}
        />
        <button
          onClick={() => setChecked(true)}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-700"
        >
          {translate('Check')}
        </button>
        <button
          onClick={() => setRevealed(true)}
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-emerald-200 hover:text-emerald-700"
        >
          {translate('Reveal answer')}
        </button>
      </div>
      {checked && (
        <p className={`mt-2 text-xs font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
          {isCorrect ? translate('Correct.') : translate('Not quite yet.')}
        </p>
      )}
      {showAnswer && (
        <DrillAnswerPanel answer={item.answer} explanation={item.explanation} />
      )}
    </div>
  );
}

function TransformItem({
  item,
  audioReferenceId,
}: {
  item: Extract<GrammarLabDrill, { kind: 'transform' }>['items'][number];
  audioReferenceId: string;
}) {
  const { translate } = useLocale();
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = answerMatches(input, item.answer, item.accepted);
  const showAnswer = checked || revealed;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-bold uppercase text-stone-400">{displayGrammarText(item.target)}</p>
      <p className="mt-1 text-sm font-semibold text-stone-800">{displayNahuatl(item.input)}</p><AudioButton src={null} text={displayNahuatl(item.input)} referenceId={audioReferenceId.replace("grammar-answer:", "grammar-input:")} />
      <div className="mt-3 flex flex-col gap-2">
        <DrillAnswerControl
          answer={item.answer}
          value={input}
          onChange={(value) => {
            setInput(value);
            setChecked(false);
          }}
          placeholder={translate('Type the transformed form')}
          disabled={revealed || (checked && isCorrect)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setChecked(true)}
            className="flex-1 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-700"
          >
            {translate('Check')}
          </button>
          <button
            onClick={() => setRevealed(true)}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-emerald-200 hover:text-emerald-700"
          >
            {translate('Reveal answer')}
          </button>
        </div>
      </div>
      {checked && (
        <p className={`mt-2 text-xs font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
          {isCorrect ? translate('Correct.') : translate('Not quite yet.')}
        </p>
      )}
      {showAnswer && (
        <DrillAnswerPanel
          answer={item.answer}
          audioReferenceId={audioReferenceId}
          breakdown={item.breakdown}
          explanation={item.explanation}
        />
      )}
    </div>
  );
}

function ProduceItem({
  item,
  audioReferenceId,
}: {
  item: Extract<GrammarLabDrill, { kind: 'produce' }>['items'][number];
  audioReferenceId: string;
}) {
  const { translate } = useLocale();
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = answerMatches(input, item.answer, item.accepted);
  const showAnswer = checked || revealed;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-bold uppercase text-stone-400">{translate('Produce')}</p>
      <p className="mt-1 text-sm font-semibold text-stone-800">{displayGrammarText(item.english)}</p>
      <div className="mt-3 flex flex-col gap-2">
        <DrillAnswerControl
          answer={item.answer}
          value={input}
          onChange={(value) => {
            setInput(value);
            setChecked(false);
          }}
          placeholder={translate('Type the Nahuatl form')}
          disabled={revealed || (checked && isCorrect)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setChecked(true)}
            className="flex-1 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-700"
          >
            {translate('Check')}
          </button>
          <button
            onClick={() => setRevealed(true)}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-emerald-200 hover:text-emerald-700"
          >
            {translate('Reveal answer')}
          </button>
        </div>
      </div>
      {checked && (
        <p className={`mt-2 text-xs font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
          {isCorrect ? translate('Correct.') : translate('Not quite yet.')}
        </p>
      )}
      {showAnswer && (
        <DrillAnswerPanel
          answer={item.answer}
          audioReferenceId={audioReferenceId}
          breakdown={item.breakdown}
          explanation={item.explanation}
        />
      )}
    </div>
  );
}

function IdentifyDrill({ drill }: { drill: Extract<GrammarLabDrill, { kind: 'identify' }> }) {
  return (
    <div className="space-y-3">
      {drill.items.map((item, i) => <IdentifyItem key={i} item={item} />)}
    </div>
  );
}

function TransformDrill({ drill, audioReferencePrefix }: { drill: Extract<GrammarLabDrill, { kind: 'transform' }>; audioReferencePrefix: string }) {
  return (
    <div className="space-y-3">
      {drill.items.map((item, i) => <TransformItem key={i} item={item} audioReferenceId={`${audioReferencePrefix}:${i}`} />)}
    </div>
  );
}

function ProduceDrill({ drill, audioReferencePrefix }: { drill: Extract<GrammarLabDrill, { kind: 'produce' }>; audioReferencePrefix: string }) {
  return (
    <div className="space-y-3">
      {drill.items.map((item, i) => <ProduceItem key={i} item={item} audioReferenceId={`${audioReferencePrefix}:${i}`} />)}
    </div>
  );
}

function ParadigmDrill({ drill, audioReferencePrefix }: { drill: Extract<GrammarLabDrill, { kind: 'paradigm' }>; audioReferencePrefix: string }) {
  const { translate } = useLocale();

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-stone-500">{translate('Cue')}</th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-stone-500">{translate('Answer')}</th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-stone-500">{translate('Breakdown')}</th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-stone-500">{translate('Meaning')}</th>
          </tr>
        </thead>
        <tbody>
          {drill.rows.map((row, i) => (
            <tr key={i} className="border-b border-stone-100 last:border-b-0">
              <td className="px-3 py-2.5 text-xs font-medium text-stone-500">{displayGrammarText(row.cue)}</td>
              <td className="px-3 py-2.5 font-mono font-semibold text-stone-900">{displayNahuatl(row.answer)}<AudioButton src={null} text={displayNahuatl(row.answer)} referenceId={`${audioReferencePrefix}:${i}`} size="sm" /></td>
              <td className="px-3 py-2.5 font-mono text-xs text-emerald-700">{displayNahuatl(row.breakdown)}</td>
              <td className="px-3 py-2.5 text-stone-500">{displayGrammarText(row.translation)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GrammarDrillRenderer({ drill, audioReferencePrefix }: { drill: GrammarLabDrill; audioReferencePrefix: string }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
      <h4 className="font-semibold text-stone-800">{displayGrammarText(drill.heading)}</h4>
      <p className="mb-4 mt-1 text-xs leading-relaxed text-stone-500">{displayGrammarText(drill.prompt)}</p>
      {drill.kind === 'identify' && <IdentifyDrill drill={drill} />}
      {drill.kind === 'transform' && <TransformDrill drill={drill} audioReferencePrefix={audioReferencePrefix} />}
      {drill.kind === 'paradigm' && <ParadigmDrill drill={drill} audioReferencePrefix={audioReferencePrefix} />}
      {drill.kind === 'produce' && <ProduceDrill drill={drill} audioReferencePrefix={audioReferencePrefix} />}
    </div>
  );
}

function GrammarLabCard({ lab }: { lab: GrammarLab }) {
  const { translate } = useLocale();

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-700">{translate('Grammar lab')}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-stone-900">{displayGrammarText(lab.title)}</h3>
          <p className="mt-1 text-sm text-stone-500">{displayGrammarText(lab.shortDesc)}</p>
        </div>
        <span className={`w-fit shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${BAND_STYLES[lab.band].badge}`}>
          {lab.band}
        </span>
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold uppercase text-amber-800">{translate('Build it like this')}</p>
        <p className="mt-1 font-mono text-sm font-semibold text-stone-900">{displayGrammarText(lab.pattern)}</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{displayGrammarText(lab.explanation)}</p>
      </div>

      <div className="mb-5">
        <h4 className="mb-3 font-semibold text-stone-700">{translate('Worked examples')}</h4>
        <GrammarLabExampleList lab={lab} />
      </div>

      <div className="space-y-4">
        {lab.drills.map((drill, i) => (
          <GrammarDrillRenderer key={i} drill={drill} audioReferencePrefix={`grammar-answer:${lab.id}:${i}`} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  lesson: GLType;
  dialogues: GrammarDialogue[];
}

export default function GrammarLesson({ lesson, dialogues }: Props) {
  const { locale, translate } = useLocale();
  const idx = GRAMMAR_LESSONS.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? GRAMMAR_LESSONS[idx - 1] : null;
  const next = idx < GRAMMAR_LESSONS.length - 1 ? GRAMMAR_LESSONS[idx + 1] : null;
  const bandStyle = BAND_STYLES[lesson.band];
  const relatedLabs = translateDeepClient(locale, getRelatedGrammarLabs(lesson));
  const labAudioGroups = useMemo(() => getRelatedGrammarLabs(lesson).map(lab => `grammar-lab:${lab.id}`), [lesson]);
  useLessonAudioWarmup(labAudioGroups);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-stone-400 mb-6">
        <Link href="/grammar" className="hover:text-stone-600 transition-colors">{translate('Grammar')}</Link>
        <span>›</span>
        <span className="text-stone-600">{displayGrammarText(lesson.title)}</span>
      </div>

      {/* Header */}
      <div className={`bg-white border ${bandStyle.ring} rounded-2xl p-6 mb-8`}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold text-stone-900 leading-tight">{displayGrammarText(lesson.title)}</h1>
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${bandStyle.badge}`}>
            {lesson.band}
          </span>
        </div>
        <p className="text-sm text-stone-400 italic mb-2">{displayNahuatl(lesson.nahuatlTitle)}</p>
        {lesson.nahuatlTitle.trim() && <AudioButton src={null} text={displayNahuatl(lesson.nahuatlTitle)} referenceId={`grammar-title:${lesson.id}`} size="sm" />}
        <p className="text-stone-500 text-sm leading-relaxed">{displayGrammarText(lesson.shortDesc)}</p>
      </div>

      {/* Sections */}
      <div>
        {lesson.sections.map((section, i) => (
          <Section key={i} section={section} topic={lesson.id} sectionIndex={i} sourceComparison={lesson.id === 'orthographic-systems'} />
        ))}
      </div>

      {relatedLabs.length > 0 && (
        <div className="mt-8 mb-8 space-y-5">
          <div>
            <h2 className="font-semibold text-stone-700">{translate('Grammar production labs')}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {translate('Type short Nahuatl answers, check them, and read the explanation for each form.')}
            </p>
          </div>
          {relatedLabs.map((lab) => (
            <GrammarLabCard key={lab.id} lab={lab} />
          ))}
        </div>
      )}

      {/* Selected course dialogue examples */}
      {dialogues.length > 0 && (
        <div className="mt-8 mb-8">
          <h2 className="font-semibold text-stone-700 mb-3">
            {translate('From the course dialogues')}
          </h2>
          <div className="space-y-2">
            {dialogues.map((d) => (
              <div key={d.lesson_dialogue_id} className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-stone-400 mt-0.5 w-4 shrink-0">{d.speaker_label}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">{displayNahuatl(d.utterance_normalized)}</p>
                    {d.translation_en && (
                      <p className="text-xs text-stone-400 italic mt-0.5">{d.translation_en}</p>
                    )}
                    {!resolvePracticeRecording({ text: displayNahuatl(d.utterance_normalized), referenceId: `core-dialogue:${d.lesson_dialogue_id}`,
                      url: d.audio_available ? dialogueAudioUrl(d.lesson_dialogue_id, displayNahuatl(d.utterance_normalized)) : null }).url && (
                      <p className="text-xs text-stone-500 mt-1">{translate('Audio awaiting review')}</p>
                    )}
                  </div>
                  <AudioButton text={displayNahuatl(d.utterance_normalized)} referenceId={`core-dialogue:${d.lesson_dialogue_id}`} src={d.audio_available ? dialogueAudioUrl(d.lesson_dialogue_id, displayNahuatl(d.utterance_normalized)) : null} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related units */}
      <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 mb-8">
        <p className="text-xs font-bold text-stone-400 uppercase mb-2">{translate('Practice in context')}</p>
        <p className="text-sm text-stone-500 mb-3">
          {translate('See these patterns in the course lessons:')}
        </p>
        <div className="flex flex-wrap gap-2">
          {lesson.relatedUnits.map((n) => (
            <Link
              key={n}
              href={`/units/${n}`}
              className="text-xs font-medium bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
            >
              {translate('Unit')} {n} →
            </Link>
          ))}
        </div>
      </div>

      {/* Prev / Next navigation */}
      <div className="flex gap-3 justify-between">
        {prev ? (
          <Link
            href={`/grammar/${prev.id}`}
            className="flex-1 bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors text-left"
          >
            <p className="text-xs text-stone-400 mb-1">← {translate('Previous')}</p>
            <p className="text-sm font-semibold text-stone-700">{translate(prev.title)}</p>
          </Link>
        ) : <div className="flex-1" />}
        {next ? (
          <Link
            href={`/grammar/${next.id}`}
            className="flex-1 bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors text-right"
          >
            <p className="text-xs text-stone-400 mb-1">{translate('Next')} →</p>
            <p className="text-sm font-semibold text-stone-700">{translate(next.title)}</p>
          </Link>
        ) : <div className="flex-1" />}
      </div>
    </div>
  );
}
