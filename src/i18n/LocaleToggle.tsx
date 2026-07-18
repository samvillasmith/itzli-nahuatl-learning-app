"use client";

import { useLocale } from "./LocaleProvider";
import type { AppLocale } from "./config";

const OPTIONS: Array<{ locale: AppLocale; flag: string; label: string }> = [
  { locale: "es", flag: "🇲🇽", label: "Español de México" },
  { locale: "en", flag: "🇺🇸", label: "English (United States)" },
];

export default function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-stone-200 bg-white/90 p-0.5 shadow-sm"
      role="group"
      aria-label={locale === "es" ? "Idioma de la aplicación" : "Application language"}
    >
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
            className={`${compact ? "h-7 w-7 text-base" : "h-8 w-8 text-lg"} flex items-center justify-center rounded-md transition-colors ${
              selected
                ? "bg-stone-950 shadow-sm"
                : "bg-transparent opacity-55 hover:bg-stone-100 hover:opacity-100"
            }`}
          >
            <span aria-hidden="true">{option.flag}</span>
          </button>
        );
      })}
    </div>
  );
}
