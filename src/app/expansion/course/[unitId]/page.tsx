import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/require-auth";
import { getUnifiedCoursePath } from "@/lib/unified-course-path";
import { localizedPathname } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";

export default async function Page({ params }: { params: Promise<{ unitId: string }> }) {
  await requireAuth();
  const { unitId } = await params;
  const lesson = getUnifiedCoursePath().find(item => item.sourceLessonId === unitId);
  if (!lesson) notFound();
  redirect(localizedPathname(`/units/${lesson.lessonNumber}`, await getRequestLocale()));
}
