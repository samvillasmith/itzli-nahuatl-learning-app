"use client";

import { useEffect, useState } from "react";

export default function DisclaimerBanner() {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("itzli_disclaimer_dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("itzli_disclaimer_dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="leading-relaxed">
            <span className="font-semibold">Work in progress</span> - audio is machine-generated
            with a Nahuatl-specific model, images are being added from the S3 catalog, and
            more features are coming.{" "}
            <button
              onClick={() => setModalOpen(true)}
              className="font-medium underline underline-offset-2 transition-colors hover:text-amber-700"
            >
              Learn more
            </button>
          </p>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 text-base leading-none text-amber-500 transition-colors hover:text-amber-800"
          >
            x
          </button>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-8 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-lg leading-none text-stone-400 transition-colors hover:text-stone-700"
              aria-label="Close"
            >
              x
            </button>

            <h2 className="mb-1 text-lg font-bold text-stone-900">About Itzli</h2>
            <p className="mb-5 text-xs font-semibold uppercase text-stone-500">Work in progress</p>

            <div className="space-y-5 text-sm leading-relaxed text-stone-600">
              <section>
                <h3 className="mb-1 font-semibold text-stone-800">Audio pronunciations</h3>
                <p>
                  The voice you hear is machine-generated. Itzli prioritizes the public
                  Eastern Huasteca Nahuatl MMS model over general Spanish or English TTS.
                </p>
                <ul className="mt-2 space-y-1.5 pl-0">
                  <li className="flex gap-2">
                    <span className="shrink-0 text-amber-500">-</span>
                    <span>
                      <strong>Pure vowels:</strong> a, e, i, o, u are prompted as steady
                      Nahuatl vowels, so short words like <em>na</em> and <em>ta</em> are
                      not treated as English-style glides.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 text-amber-500">-</span>
                    <span>
                      <strong>Nahuatl digraphs:</strong> ll, x, tl, tz, ch, hu, cu, and qu
                      are handled with language-specific cues.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 text-amber-500">-</span>
                    <span>
                      <strong>Quality review:</strong> generated clips should be sampled
                      and regenerated when the model drops sounds or misreads a form.
                    </span>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-stone-500">
                  Generated audio is educational support, not a substitute for community
                  instruction or formal linguistic review.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-stone-800">Images</h3>
                <p>
                  Vocabulary images are being connected from the app&apos;s S3 word-image
                  catalog. Abstract words, function words, and some verbs may not have
                  useful images yet.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-stone-800">Coming soon</h3>
                <p>
                  User accounts, cloud progress sync, spaced repetition, and richer
                  pronunciation tools are planned for future releases.
                </p>
              </section>

              <section className="border-t border-stone-100 pt-5">
                <h3 className="mb-1 font-semibold text-stone-800">Why this app exists</h3>
                <p>
                  The Nahua people have endured centuries of colonization and cultural
                  erasure. Nahuatl was systematically suppressed, and generations of
                  Indigenous Mexicans were made to feel ashamed of their mother tongue.
                </p>
                <p className="mt-2">
                  Itzli was created by <strong>Sam Villa-Smith, PhD</strong>, a person of
                  Indigenous Mexican ancestry, as an act of cultural recovery. Its goal is
                  Indigenous visibility, language revitalization, and making Nahuatl
                  learnable for more people.
                </p>
              </section>
            </div>

            <button
              onClick={() => {
                setModalOpen(false);
                dismiss();
              }}
              className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
