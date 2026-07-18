import { notFound } from 'next/navigation';
import { getGrammarLesson, GRAMMAR_LESSONS } from '@/data/grammar-lessons';
import { getGrammarDialogues } from '@/lib/db';
import { requireAuth } from '@/lib/require-auth';
import GrammarLesson from './GrammarLesson';
import { getRequestLocale } from '@/i18n/server';
import { translateDeep } from '@/i18n/translate';

export function generateStaticParams() {
  return GRAMMAR_LESSONS.map((l) => ({ topic: l.id }));
}

export default async function GrammarLessonPage({ params }: { params: Promise<{ topic: string }> }) {
  await requireAuth();
  const { topic } = await params;
  const lesson = getGrammarLesson(topic);
  if (!lesson) notFound();
  const locale = await getRequestLocale();

  const dialogues = getGrammarDialogues(lesson.relatedUnits);

  return <GrammarLesson lesson={translateDeep(locale, lesson)} dialogues={translateDeep(locale, dialogues)} />;
}
