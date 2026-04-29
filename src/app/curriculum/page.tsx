import Link from "next/link";
import { getAllUnits } from "@/lib/db";
import { getCurriculumAudit } from "@/lib/curriculum";

const BAND_STYLE: Record<string, string> = {
  A1: "border-emerald-200 bg-emerald-50 text-emerald-800",
  A2: "border-sky-200 bg-sky-50 text-sky-800",
  B1: "border-violet-200 bg-violet-50 text-violet-800",
};

export default function CurriculumPage() {
  const units = getAllUnits();
  const audit = getCurriculumAudit();
  const stages = [...new Set(units.map((unit) => unit.stage_title))].map((stage) => ({
    title: stage,
    units: units.filter((unit) => unit.stage_title === stage),
  }));

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div>
          <p className="mb-3 text-xs font-bold uppercase text-emerald-700">
            Curriculum Map
          </p>
          <h1 className="text-4xl font-black text-stone-950">
            A1 to B1, organized as a learner path.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            This map is the audited presentation order for the source lessons. It prioritizes
            communicative readiness first, then expands grammar, vocabulary, dialogue, narration,
            and B1 control.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-stone-500">Coverage</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["A1", "A2", "B1"] as const).map((band) => (
              <div key={band} className={`rounded-lg border p-3 text-center ${BAND_STYLE[band]}`}>
                <div className="text-xs font-bold">{band}</div>
                <div className="text-2xl font-black">{audit.byBand[band]}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            {audit.totalUnits} units across {audit.stages} stages.
          </p>
        </div>
      </section>

      <section className="space-y-8">
        {stages.map((stage, stageIndex) => (
          <div key={stage.title}>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-950 text-sm font-black text-white">
                {stageIndex + 1}
              </span>
              <div>
                <h2 className="font-bold text-stone-950">{stage.title}</h2>
                <p className="text-xs text-stone-500">{stage.units.length} units</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stage.units.map((unit) => (
                <Link
                  key={unit.lesson_number}
                  href={`/units/${unit.lesson_number}`}
                  className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="rounded-md bg-stone-950 px-2 py-1 text-xs font-bold text-white">
                      {unit.path_code}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${BAND_STYLE[unit.target_band]}`}>
                      {unit.target_band}
                    </span>
                  </div>
                  <h3 className="font-bold leading-snug text-stone-950">{unit.theme_en}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{unit.communicative_goal}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-stone-500">
                    <span>{unit.english_vocab_count} words</span>
                    <span>{unit.english_dialogue_count} lines</span>
                    <span>{unit.english_construction_count} patterns</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
