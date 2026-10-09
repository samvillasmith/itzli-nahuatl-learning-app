"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { initializeProgressSync, retryProgressSync, subscribeSyncStatus, getSyncStatus } from "@/lib/cloudSync";
import { useLocale } from "@/i18n/LocaleProvider";

type Account = { isLoaded: boolean; isSignedIn: boolean; user: { id: string } | null; localReview: boolean };
const Context = createContext<Account>({ isLoaded: false, isSignedIn: false, user: null, localReview: false });

function SyncBoundary({ account, children, waitForProgress }: { account: Account; children: ReactNode; waitForProgress: boolean }) {
  const accountKey = account.localReview ? "local-review" : account.user?.id ?? "guest";
  const [readyAccount, setReadyAccount] = useState<string|null>(null);
  useEffect(() => {
    if (!account.isLoaded) return;
    let active = true;
    void initializeProgressSync(account.localReview ? "local-review" : account.user?.id ?? null).finally(() => { if (active) setReadyAccount(accountKey); });
    const retry = () => { if (document.visibilityState === "visible") void retryProgressSync(); };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", retry);
    return () => { active = false; window.removeEventListener("online", retry); document.removeEventListener("visibilitychange", retry); };
  }, [account.isLoaded, account.user?.id, account.localReview, accountKey]);
  const { locale } = useLocale();
  return <Context.Provider value={account}>{!waitForProgress || account.isLoaded && readyAccount===accountKey ? <div key={accountKey}>{children}</div> : <div className="mx-auto min-h-80 max-w-7xl px-6 py-20 text-stone-500" role="status">{locale === "es" ? "Preparando tu aprendizaje…" : "Preparing your learning…"}</div>}</Context.Provider>;
}

function SignedAccount({ children, waitForProgress }: { children: ReactNode; waitForProgress: boolean }) {
  const { isLoaded, isSignedIn, user } = useUser();
  return <SyncBoundary waitForProgress={waitForProgress} account={{ isLoaded, isSignedIn: !!isSignedIn, user: user ? { id: user.id } : null, localReview: false }}>{children}</SyncBoundary>;
}

export default function LearningAccountProvider({ localReview, children, waitForProgress=true }: { localReview: boolean; children: ReactNode; waitForProgress?:boolean }) {
  return localReview ? <SyncBoundary waitForProgress={waitForProgress} account={{ isLoaded: true, isSignedIn: false, user: null, localReview: true }}>{children}</SyncBoundary> : <SignedAccount waitForProgress={waitForProgress}>{children}</SignedAccount>;
}
export function useLearningAccount() { return useContext(Context); }
export function AccountShow({ when, children }: { when: "signed-in" | "signed-out"; children: ReactNode }) {
  const { isSignedIn, localReview } = useLearningAccount();
  return (when === "signed-in" ? isSignedIn || localReview : !isSignedIn && !localReview) ? children : null;
}
export function SyncIndicator() {
  const [status, setStatus] = useState(getSyncStatus());
  const { localReview } = useLearningAccount();
  const { locale } = useLocale();
  useEffect(() => subscribeSyncStatus(setStatus), []);
  const labels = locale === "es" ? {
    local: "Progreso en este dispositivo", hydrating: "Recuperando tu progreso…", synced: "Progreso sincronizado",
    pending: "Progreso guardado aquí · sincronización pendiente", error: "Progreso guardado aquí · reintentar sincronización",
  } : {
    local: "Progress stays on this device", hydrating: "Restoring your progress…", synced: "Progress synced",
    pending: "Progress saved here · sync pending", error: "Progress saved here · retry sync",
  };
  return <span className="inline-flex flex-wrap items-center gap-2 text-xs text-stone-500"><span role="status">{localReview ? (locale === "es" ? "Revisión local · progreso en este dispositivo" : "Local review · progress stays on this device") : labels[status.status]}</span>{!localReview && (status.status === "error" || status.status === "pending") && <button type="button" onClick={() => void retryProgressSync()} className="font-bold text-emerald-700 underline">{locale === "es" ? "Reintentar" : "Retry"}</button>}</span>;
}
