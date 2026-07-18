import { getAllUnits } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { getRequestLocale } from "@/i18n/server";
import { translateDeep } from "@/i18n/translate";
import ProgressDashboard from "./ProgressDashboard";

export default async function ProgressPage() {
  await requireAuth();
  const locale = await getRequestLocale();
  const units = translateDeep(locale, getAllUnits());
  return <ProgressDashboard units={units} />;
}
