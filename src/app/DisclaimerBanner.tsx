"use client";

import { useState, useEffect } from "react";

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
      {/* Banner */}
      <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="leading-relaxed">
            <span className="font-semibold">Work in progress</span> — audio is machine-generated and has known limitations, not all words have images yet, and more features are coming.{" "}
            <button
              onClick={() => setModalOpen(true)}
              className="underline underline-offset-2 hover:text-amber-700 font-medium transition-colors"
            >
              Learn more
            </button>
          </p>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 text-amber-400 hover:text-amber-700 transition-colors text-base leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-stone-900 mb-1">About Itzli</h2>
            <p className="text-xs text-stone-400 mb-5 uppercase tracking-widest font-semibold">Work in progress</p>

            <div className="space-y-5 text-sm text-stone-600 leading-relaxed">
              <section>
                <h3 className="font-semibold text-stone-800 mb-1">Audio pronunciations</h3>
                <p>
                  All audio is machine-generated — there is currently no large corpus of studio-recorded Eastern Huasteca Nahuatl available for training a native-quality model. We use the best open-source tools available, but limitations exist:
                </p>
                <ul className="mt-2 space-y-1.5 list-none pl-0">
                  <li className="flex gap-2">
                    <span className="text-amber-500 shrink-0">•</span>
                    <span><strong>&#8220;ll&#8221; sounds like &#8220;y&#8221;</strong> — In EHN, <em>ll</em> is a true double-L. The Spanish-based phonemizer incorrectly renders it as /j/ (like the Spanish <em>yo</em>). This is a known error.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 shrink-0">•</span>
                    <span><strong>Phoneme dropping</strong> — Isolated words occasionally have dropped or blurred sounds (e.g., <em>intla</em>, <em>nelia</em>). The model was trained on connected speech.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 shrink-0">•</span>
                    <span><strong>Long vowels not preserved</strong> — Vowel length (ā, ē, ī, ō, ū) is stripped before synthesis.</span>
                  </li>
                </ul>
                <p className="mt-2 text-stone-400 text-xs">Contributing native speaker recordings is a future goal of this project.</p>
              </section>

              <section>
                <h3 className="font-semibold text-stone-800 mb-1">Images</h3>
                <p>Not all vocabulary words have images yet — abstract words, function words, and verbs are especially sparse. Images are being added progressively.</p>
              </section>

              <section>
                <h3 className="font-semibold text-stone-800 mb-1">Coming soon</h3>
                <p>User accounts, cloud progress sync, spaced repetition, and native speaker audio are all planned for future releases.</p>
              </section>

              <section className="border-t border-stone-100 pt-5">
                <h3 className="font-semibold text-stone-800 mb-1">Why this app exists</h3>
                <p>
                  The Nahua people have endured centuries of colonization and cultural erasure. Nahuatl — once the <em>lingua franca</em> of Mesoamerica — was systematically suppressed. Generations of indigenous Mexicans were made to feel ashamed of their mother tongue.
                </p>
                <p className="mt-2">
                  Itzli was created by <strong>Sam Villa-Smith, PhD</strong>, a person of indigenous Mexican ancestry, as an act of cultural recovery — to make Nahuatl learnable for anyone, and especially for the millions in the Mexican diaspora who want to explore their heritage. Its goal is indigenous visibility, language revitalization, and making Nahuatl a global language again.
                </p>
              </section>
            </div>

            <button
              onClick={() => { setModalOpen(false); dismiss(); }}
              className="mt-6 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
