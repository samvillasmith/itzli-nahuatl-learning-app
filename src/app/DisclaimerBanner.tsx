"use client";

import { useEffect, useState } from "react";

export default function DisclaimerBanner() {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("itzli_v2_announcement_dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("itzli_v2_announcement_dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div className="border-b border-emerald-200/80 bg-[linear-gradient(100deg,#ecfdf5_0%,#f0fdfa_55%,#fffbeb_100%)] px-4 py-2.5 text-xs text-emerald-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="leading-relaxed sm:text-[13px]">
            <span className="mr-2 inline-flex rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-white">
              Itzli 2.0
            </span>
            <span className="font-semibold">A sweeping course-wide upgrade is here:</span>{" "}
            a sharper Eastern Huasteca focus, clearer lessons, reviewed vocabulary, richer practice,
            and a beautifully redesigned experience.{" "}
            <button
              onClick={() => setModalOpen(true)}
              className="font-bold text-emerald-800 underline decoration-emerald-400 underline-offset-2 transition-colors hover:text-emerald-950"
            >
              See what changed
            </button>
          </p>
          <button
            onClick={dismiss}
            aria-label="Dismiss Version 2.0 announcement"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base leading-none text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-950"
          >
            ×
          </button>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/70 bg-[#fffdf8] p-7 shadow-2xl sm:p-9"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-lg leading-none text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-800"
              aria-label="Close"
            >
              ×
            </button>

            <div className="mb-6 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
              Now available
            </div>
            <h2 className="pr-10 text-3xl font-black tracking-[-0.035em] text-stone-950">Welcome to Itzli 2.0</h2>
            <p className="mt-2 text-sm font-semibold text-emerald-800">A major course-wide upgrade</p>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              We rebuilt Itzli to make learning Eastern Huasteca Nahuatl clearer, more focused,
              and more enjoyable from the first sound to the final unit.
            </p>

            <div className="mt-7 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="mb-3 text-lg">✦</div>
                <h3 className="font-black text-stone-900">Eastern Huasteca, clearly</h3>
                <p>
                  The course now consistently centers the living variety spoken in and around
                  Chicontepec, Veracruz.
                </p>
              </section>

              <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <div className="mb-3 text-lg">◎</div>
                <h3 className="font-black text-stone-900">A stronger course</h3>
                <p>
                  A broad accuracy review corrected many mistranslations, damaged forms,
                  and confusing lesson entries.
                </p>
              </section>

              <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <div className="mb-3 text-lg">→</div>
                <h3 className="font-black text-stone-900">A smoother path</h3>
                <p>
                  Lessons, navigation, progress, and practice now work together as one
                  guided learning experience.
                </p>
              </section>

              <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <div className="mb-3 text-lg">◈</div>
                <h3 className="font-black text-stone-900">Made to be memorable</h3>
                <p>
                  A redesigned interface and richer visual vocabulary make every session
                  calmer, clearer, and more inviting.
                </p>
              </section>
            </div>

            <div className="mt-5 rounded-2xl border border-stone-200 bg-white/80 p-4 text-xs leading-5 text-stone-600">
              <strong className="text-stone-900">Keeping Itzli sustainable:</strong> the paid AI tutor is
              paused. All lessons, grammar, vocabulary, audio, and practice activities remain available.
              Pronunciation audio is machine-generated educational support and may not reproduce every
              community pronunciation perfectly.
            </div>

            <button
              onClick={() => {
                setModalOpen(false);
                dismiss();
              }}
              className="mt-6 w-full rounded-xl bg-stone-950 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-800"
            >
              Start exploring Version 2.0
            </button>
          </div>
        </div>
      )}
    </>
  );
}
