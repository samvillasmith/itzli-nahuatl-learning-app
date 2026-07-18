"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  htmlLang,
  localizedPathname,
  LOCALE_COOKIE,
  type AppLocale,
} from "./config";
import { trClient } from "./client-translate";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  translate: (english: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export default function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      if (nextLocale === locale) return;
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
      document.documentElement.lang = htmlLang(nextLocale);
      setLocaleState(nextLocale);
      const nextPathname = localizedPathname(window.location.pathname, nextLocale);
      window.location.assign(`${nextPathname}${window.location.search}${window.location.hash}`);
    },
    translate: (english) => trClient(locale, english),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
