import type { Metadata } from "next";
import Link from "next/link";
import { TUTOR_FEATURE_ENABLED } from "@/lib/features";
import TutorClient from "./TutorClient";

export const metadata: Metadata = {
  title: "Tutor",
};

export default function TutorPage() {
  if (TUTOR_FEATURE_ENABLED) return <TutorClient />;

  return (
    <section className="mx-auto max-w-2xl py-16 text-center">
      <div className="mb-6 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
        Temporarily unavailable
      </div>
      <h1 className="text-3xl font-black text-stone-950">The AI tutor is offline for review.</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-stone-600">
        We are pausing the chatbot while we review safety, privacy, moderation, and audit controls.
        The curriculum, vocabulary, grammar, audio, and practice units remain available.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/units"
          className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Continue lessons
        </Link>
        <Link
          href="/grammar"
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
        >
          Study grammar
        </Link>
      </div>
    </section>
  );
}
