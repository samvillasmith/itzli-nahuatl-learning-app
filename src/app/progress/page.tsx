import { getAllUnits } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { getRequestLocale } from "@/i18n/server";
import { trChoice } from "@/i18n/translate";
import OfflinePack from "@/components/OfflinePack";
import ProgressDashboard from "./ProgressDashboard";
import { getLearningCatalog } from "@/lib/learning-catalog";
import { getUnifiedCoursePath } from "@/lib/unified-course-path";

export default async function ProgressPage() {
  await requireAuth();
  const locale = await getRequestLocale();
  const units = getUnifiedCoursePath(getAllUnits());
  return <>
    <ProgressDashboard units={units} reviewableIds={getLearningCatalog().map(c=>c.id)} />
    <details className="mt-10 border-t border-stone-200 pt-5">
      <summary className="w-fit cursor-pointer text-sm font-semibold text-stone-600 hover:text-emerald-800">{trChoice(locale, "Offline practice", "Práctica sin conexión")}</summary>
      <div className="mt-5"><OfflinePack /></div>
    </details>
  </>;
}
