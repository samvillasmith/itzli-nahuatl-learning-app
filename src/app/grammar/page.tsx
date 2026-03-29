import Link from 'next/link';
import { GRAMMAR_LESSONS } from '@/data/grammar-lessons';

const BAND_STYLES: Record<string, string> = {
  A1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  A2: 'bg-sky-50 text-sky-700 border-sky-200',
  B1: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function GrammarPage() {
  const byBand = {
    A1: GRAMMAR_LESSONS.filter((l) => l.band === 'A1'),
    A2: GRAMMAR_LESSONS.filter((l) => l.band === 'A2'),
    B1: GRAMMAR_LESSONS.filter((l) => l.band === 'B1'),
  };

  return (
    <div>
      <div className="mb-10">
        <p className="text-xs font-bold text-emerald-600 mb-3 uppercase tracking-widest">
          Grammar · Tlahtoltēcpānalitzli
        </p>
        <h1 className="text-3xl font-bold text-stone-900 mb-3">
          EHN Grammar Lessons
        </h1>
        <p className="text-stone-500 max-w-xl leading-relaxed">
          Structured explanations of how Eastern Huasteca Nahuatl works — word formation, verb conjugation, and conversation patterns. Each lesson includes paradigm tables, worked examples, and authentic dialogue.
        </p>
      </div>

      {(['A1', 'A2', 'B1'] as const).map((band) =>
        byBand[band].length > 0 && (
          <div key={band} className="mb-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">
              {band === 'A1' ? 'A1 · Beginner' : band === 'A2' ? 'A2 · Elementary' : 'B1 · Intermediate'}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {byBand[band].map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/grammar/${lesson.id}`}
                  className="group bg-white border border-stone-200 rounded-2xl p-5 hover:border-stone-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors leading-snug">
                      {lesson.title}
                    </h3>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${BAND_STYLES[lesson.band]}`}>
                      {lesson.band}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mb-1 italic">{lesson.nahuatlTitle}</p>
                  <p className="text-sm text-stone-500 leading-snug">{lesson.shortDesc}</p>
                </Link>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
