import { notFound } from 'next/navigation';
import { getGrammarLesson, GRAMMAR_LESSONS } from '@/data/grammar-lessons';
import { getGrammarDialogues } from '@/lib/db';
import GrammarLesson from './GrammarLesson';

export function generateStaticParams() {
  return GRAMMAR_LESSONS.map((l) => ({ topic: l.id }));
}

export default async function GrammarLessonPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const lesson = getGrammarLesson(topic);
  if (!lesson) notFound();

  const dialogues = getGrammarDialogues(lesson.relatedUnits);

  return <GrammarLesson lesson={lesson} dialogues={dialogues} />;
}
