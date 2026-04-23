"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// Bump this when the legal docs change materially — everyone will be
// re-prompted on next visit.
const STORAGE_KEY = "itzli_legal_accepted_v1";

// Never show the modal on the legal docs themselves — users need to be
// able to read them to decide whether to agree.
const BYPASS_PATHS = ["/terms", "/privacy", "/eula"];

export default function LegalModal() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (BYPASS_PATHS.some((p) => pathname?.startsWith(p))) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      // localStorage can throw in private-mode Safari; fail open.
    }
  }, [pathname]);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-6"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2
          id="legal-modal-title"
          className="text-xl font-bold text-stone-900 mb-2"
        >
          Welcome to Itzli
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          Before you get started, please review and agree to our policies.
        </p>

        <div className="space-y-3 text-sm text-stone-700 leading-relaxed mb-5">
          <p>
            Itzli is a free educational app for learning Eastern Huasteca
            Nahuatl. A brief summary of what you&apos;re agreeing to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Your account is managed by Clerk; your learning progress is
              synced to our database.
            </li>
            <li>
              The AI tutor sends your chat messages to OpenAI for processing.
              Output may be inaccurate — don&apos;t rely on it for anything
              safety-critical.
            </li>
            <li>
              We apply safety moderation and never store raw chat content —
              only hashed audit metadata.
            </li>
            <li>
              You can delete your progress or account at any time.
            </li>
          </ul>
        </div>

        <div className="space-y-1.5 text-sm mb-5">
          <Link
            href="/terms"
            target="_blank"
            className="block text-emerald-600 hover:text-emerald-800 underline"
          >
            Read the Terms of Service →
          </Link>
          <Link
            href="/privacy"
            target="_blank"
            className="block text-emerald-600 hover:text-emerald-800 underline"
          >
            Read the Privacy Policy →
          </Link>
          <Link
            href="/eula"
            target="_blank"
            className="block text-emerald-600 hover:text-emerald-800 underline"
          >
            Read the EULA →
          </Link>
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer mb-5 select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
          />
          <span className="text-stone-700">
            I have read and agree to the Terms of Service, Privacy Policy, and
            EULA. I understand that the AI tutor may generate inaccurate Nahuatl
            and is for educational use only.
          </span>
        </label>

        <button
          type="button"
          onClick={accept}
          disabled={!checked}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          I agree
        </button>

        <p className="text-xs text-stone-400 text-center mt-3">
          If you do not agree, please close this tab.
        </p>
      </div>
    </div>
  );
}
