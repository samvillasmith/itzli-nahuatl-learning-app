'use client';

import Link from 'next/link';
import { GrammarLesson as GLType, GrammarSection, GRAMMAR_LESSONS } from '@/data/grammar-lessons';
import type { GrammarDialogue } from '@/lib/db';

const BAND_STYLES: Record<string, { badge: string; ring: string }> = {
  A1: { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', ring: 'border-emerald-100' },
  A2: { badge: 'bg-sky-50 text-sky-700 border border-sky-200', ring: 'border-sky-100' },
  B1: { badge: 'bg-violet-50 text-violet-700 border border-violet-200', ring: 'border-violet-100' },
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-stone-800">{part.slice(2, -2)}</strong>;
    }
    if (part === '\n') return <br key={i} />;
    return part;
  });
}

function ProseSection({ section }: { section: Extract<GrammarSection, { kind: 'prose' }> }) {
  return (
    <div className="mb-7">
      {section.heading && <h3 className="font-semibold text-stone-700 mb-2">{section.heading}</h3>}
      <p className="text-stone-600 leading-relaxed">{section.text}</p>
    </div>
  );
}

function RuleSection({ section }: { section: Extract<GrammarSection, { kind: 'rule' }> }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-7">
      <h3 className="font-bold text-amber-800 mb-2 text-sm uppercase tracking-wide">{section.title}</h3>
      <p className="text-stone-700 leading-relaxed text-sm whitespace-pre-line">{renderInline(section.text)}</p>
    </div>
  );
}

function ParadigmSection({ section }: { section: Extract<GrammarSection, { kind: 'paradigm' }> }) {
  return (
    <div className="mb-7">
      <h3 className="font-semibold text-stone-700 mb-1">{section.heading}</h3>
      {section.caption && <p className="text-xs text-stone-400 mb-3">{section.caption}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-stone-50 border-y border-stone-200">
              {section.headers.map((h, i) => (
                <th key={i} className="text-left px-3 py-2 text-xs font-bold text-stone-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, i) => (
              <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50">
                <td className="px-3 py-2.5 text-stone-500 text-xs font-medium">{row.person}</td>
                <td className="px-3 py-2.5 font-mono text-stone-900 font-medium">{row.form}</td>
                <td className="px-3 py-2.5 text-stone-500">{row.gloss}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExamplesSection({ section }: { section: Extract<GrammarSection, { kind: 'examples' }> }) {
  return (
    <div className="mb-7">
      <h3 className="font-semibold text-stone-700 mb-3">{section.heading}</h3>
      <div className="space-y-3">
        {section.items.map((item, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-base font-semibold text-stone-900 mb-0.5">{item.nahuatl}</p>
            {item.breakdown !== item.nahuatl && (
              <p className="text-xs font-mono text-emerald-700 mb-1">{item.breakdown}</p>
            )}
            <p className="text-sm text-stone-500 mb-1 italic">&ldquo;{item.translation}&rdquo;</p>
            {item.note && <p className="text-xs text-stone-400 leading-snug">{item.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ section }: { section: GrammarSection }) {
  if (section.kind === 'prose') return <ProseSection section={section} />;
  if (section.kind === 'rule') return <RuleSection section={section} />;
  if (section.kind === 'paradigm') return <ParadigmSection section={section} />;
  if (section.kind === 'examples') return <ExamplesSection section={section} />;
  return null;
}

interface Props {
  lesson: GLType;
  dialogues: GrammarDialogue[];
}

export default function GrammarLesson({ lesson, dialogues }: Props) {
  const idx = GRAMMAR_LESSONS.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? GRAMMAR_LESSONS[idx - 1] : null;
  const next = idx < GRAMMAR_LESSONS.length - 1 ? GRAMMAR_LESSONS[idx + 1] : null;
  const bandStyle = BAND_STYLES[lesson.band];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-stone-400 mb-6">
        <Link href="/grammar" className="hover:text-stone-600 transition-colors">Grammar</Link>
        <span>›</span>
        <span className="text-stone-600">{lesson.title}</span>
      </div>

      {/* Header */}
      <div className={`bg-white border ${bandStyle.ring} rounded-2xl p-6 mb-8`}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold text-stone-900 leading-tight">{lesson.title}</h1>
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${bandStyle.badge}`}>
            {lesson.band}
          </span>
        </div>
        <p className="text-sm text-stone-400 italic mb-2">{lesson.nahuatlTitle}</p>
        <p className="text-stone-500 text-sm leading-relaxed">{lesson.shortDesc}</p>
      </div>

      {/* Sections */}
      <div>
        {lesson.sections.map((section, i) => (
          <Section key={i} section={section} />
        ))}
      </div>

      {/* Real dialogue examples from the DB */}
      {dialogues.length > 0 && (
        <div className="mt-8 mb-8">
          <h2 className="font-semibold text-stone-700 mb-3">
            From the course dialogues
          </h2>
          <div className="space-y-2">
            {dialogues.map((d, i) => (
              <div key={i} className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-stone-400 mt-0.5 w-4 shrink-0">{d.speaker_label}</span>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{d.utterance_normalized}</p>
                    {d.translation_en && (
                      <p className="text-xs text-stone-400 italic mt-0.5">{d.translation_en}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related units */}
      <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 mb-8">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Practice in context</p>
        <p className="text-sm text-stone-500 mb-3">
          See these patterns in the course lessons:
        </p>
        <div className="flex flex-wrap gap-2">
          {lesson.relatedUnits.map((n) => (
            <Link
              key={n}
              href={`/units/${n}`}
              className="text-xs font-medium bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
            >
              Unit {n} →
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
            <p className="text-xs text-stone-400 mb-1">← Previous</p>
            <p className="text-sm font-semibold text-stone-700">{prev.title}</p>
          </Link>
        ) : <div className="flex-1" />}
        {next ? (
          <Link
            href={`/grammar/${next.id}`}
            className="flex-1 bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors text-right"
          >
            <p className="text-xs text-stone-400 mb-1">Next →</p>
            <p className="text-sm font-semibold text-stone-700">{next.title}</p>
          </Link>
        ) : <div className="flex-1" />}
      </div>
    </div>
  );
}
