import { getAllUnits } from "@/lib/db";
import ProgressDashboard from "./ProgressDashboard";

export default function ProgressPage() {
  const units = getAllUnits();
  return <ProgressDashboard units={units} />;
}
