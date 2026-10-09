"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizedPathname } from "@/i18n/config";
import { SyncIndicator } from "./LearningAccount";
import { TEACHING_STANDARD } from "@/lib/teaching-standard";

export default function LearningShell({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={localizedPathname("/units", locale)} className="inline-flex items-center gap-2 text-xs font-bold text-stone-500"><ArrowLeft size={14} />{locale === "es" ? "Volver al curso" : "Back to the course"}</Link><SyncIndicator /></div>
    {children}
    <div className="space-y-2 border-t border-stone-200 pt-5 text-xs leading-5 text-stone-500"><p><a href={TEACHING_STANDARD.alphabetUrl} target="_blank" rel="noreferrer" className="font-bold text-emerald-700 underline">{locale === "es" ? "Ortografía de enseñanza: INALI" : "Teaching orthography: INALI"}</a>{locale === "es" ? " · náhuatl de la Huasteca veracruzana." : " · Eastern Huasteca Nahuatl."}</p><p>{locale === "es" ? "Las fuentes regionales, incluido el curso de Chicontepec de COERLL, documentan las palabras y la gramática. Sus escrituras originales se conservan como referencias; la práctica usa la ortografía de INALI." : "Regional sources, including COERLL’s Chicontepec course, document vocabulary and grammar. Original spellings are retained as references; practice uses INALI orthography."}</p></div>
  </div>;
}
