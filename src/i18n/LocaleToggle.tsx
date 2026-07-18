"use client";

import { Languages } from "lucide-react";
import { useLocale } from "./LocaleProvider";
import type { AppLocale } from "./config";

const OPTIONS: Array<{ locale: AppLocale; flag: string; label: string; shortLabel: string }> = [
  { locale: "en", flag: "🇺🇸", label: "English", shortLabel: "EN" },
  { locale: "es", flag: "🇲🇽", label: "Español", shortLabel: "ES" },
];

export default function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-stone-300 bg-white p-1 shadow-sm"
      role="group"
      aria-label={locale === "es" ? "Idioma de la aplicación" : "Application language"}
    >
      <span className="hidden items-center gap-1 pl-1.5 text-[10px] font-black uppercase text-stone-500 2xl:inline-flex">
        <Languages size={14} aria-hidden="true" />
        {locale === "es" ? "Idioma" : "Language"}
      </span>
      {OPTIONS.map((option) => {
        const selected = option.locale === locale;
        return (
          <button
            key={option.locale}
            type="button"
            aria-label={option.label}
            aria-pressed={selected}
            title={option.label}
            onClick={() => setLocale(option.locale)}
            className={`${compact ? "h-8 px-1.5 sm:px-2" : "h-9 px-2.5"} flex min-w-0 items-center justify-center gap-1 rounded-md text-xs font-black transition-colors ${
              selected
                ? "bg-stone-950 text-white shadow-sm"
                : "bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-950"
            }`}
          >
            <span className="text-sm leading-none" aria-hidden="true">{option.flag}</span>
            <span className="sm:hidden">{option.shortLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
