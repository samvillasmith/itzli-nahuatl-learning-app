import { notFound } from "next/navigation";
import LessonFlow from "@/app/units/[unitId]/LessonFlow";
import CultureModuleContent from "@/app/culture/CultureModuleContent";
import CultureTrack from "@/app/culture/CultureTrack";
import { getCultureModule } from "@/data/culture-lessons";

export default async function DesignPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; slug?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const preview = await searchParams;
  if (preview.view === "culture") {
    const cultureModule = preview.slug ? getCultureModule(preview.slug) : undefined;
    return cultureModule ? (
      <CultureModuleContent cultureModule={cultureModule} />
    ) : (
      <CultureTrack />
    );
  }

  const vocab = [
    { id: 260, headword: "piyali", gloss_en: "hello; greeting", part_of_speech: "interjection" },
    { id: 261, headword: "axtlen", gloss_en: "you're welcome", part_of_speech: "interjection" },
    { id: 266, headword: "tlaskamati", gloss_en: "thank you", part_of_speech: "interjection" },
    { id: 268, headword: "asta mostlaj", gloss_en: "see you tomorrow", part_of_speech: "phrase" },
  ];

  return (
    <LessonFlow
      unitNum={11}
      pathCode="A1.11"
      themeEn="Greetings and farewells"
      communicativeGoal="Greet someone, respond politely, and say goodbye."
      cefrDescriptor="Use a short, everyday exchange with familiar words."
      capstoneTask="Complete a polite greeting and farewell."
      targetBand="A1"
      vocab={vocab}
      dialogues={[
        { lesson_dialogue_id: "CUR-11-001", speaker_label: "A", utterance_normalized: "Piyali.", translation_en: "Hello.", audio_available: true },
        { lesson_dialogue_id: "CUR-11-003", speaker_label: "B", utterance_normalized: "Tlaskamati.", translation_en: "Thank you.", audio_available: true },
        { lesson_dialogue_id: "CUR-11-004", speaker_label: "A", utterance_normalized: "Axtlen.", translation_en: "You're welcome.", audio_available: true },
      ]}
      constructions={[]}
      lessonBlocks={[]}
      grammarLabs={[]}
      allVocabPool={vocab}
      prevUnit={null}
      nextUnit={null}
    />
  );
}
