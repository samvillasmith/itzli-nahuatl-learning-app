import { getAllUnits } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import ProgressDashboard from "./ProgressDashboard";

export default async function ProgressPage() {
  await requireAuth();
  const units = getAllUnits();
  return <ProgressDashboard units={units} />;
}
