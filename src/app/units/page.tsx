import { getAllUnits } from "@/lib/db";
import UnitsListWithProgress from "./UnitsListWithProgress";

export default function UnitsPage() {
  const units = getAllUnits();

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">All Units</h1>
      <p className="text-stone-500 mb-8">
        {units.length} units covering A1–B1. Each unit is split into
        bite-sized lessons of up to 10 words.
      </p>
      <UnitsListWithProgress units={units} />
    </div>
  );
}
