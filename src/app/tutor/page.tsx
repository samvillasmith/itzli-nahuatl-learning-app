import type { Metadata } from "next";
import Link from "next/link";
import { TUTOR_FEATURE_ENABLED } from "@/lib/features";
import { requireAuth } from "@/lib/require-auth";
import TutorClient from "./TutorClient";
import { getRequestLocale } from "@/i18n/server";
import { tr } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return { title: tr(locale, "Tutor") };
}

export default async function TutorPage() {
  await requireAuth();
  const locale = await getRequestLocale();
  if (TUTOR_FEATURE_ENABLED) return <TutorClient />;

  return (
    <section className="mx-auto max-w-2xl py-16 text-center">
      <div className="mb-6 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
        {tr(locale, "Temporarily unavailable")}
      </div>
      <h1 className="text-3xl font-black text-stone-950">{tr(locale, "The AI tutor is offline for review.")}</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-stone-600">
        {tr(locale, "We are pausing the chatbot while we review safety, privacy, moderation, and audit controls. The curriculum, vocabulary, grammar, audio, and practice units remain available.")}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/units"
          className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          {tr(locale, "Continue lessons")}
        </Link>
        <Link
          href="/grammar"
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
        >
          {tr(locale, "Study grammar")}
        </Link>
      </div>
    </section>
  );
}
