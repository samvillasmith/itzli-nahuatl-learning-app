import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Itzli — Eastern Huasteca Nahuatl learning app.",
};

const EFFECTIVE_DATE = "April 30, 2026";
const CONTACT_EMAIL = "svillasmith3@gmail.com";

export default function TermsPage() {
  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-stone-500 mb-10">Effective: {EFFECTIVE_DATE}</p>

      <p className="mb-4">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of
        Itzli (&quot;Itzli,&quot; &quot;the app,&quot; &quot;we,&quot; &quot;us&quot;),
        a free educational web application for learning Eastern Huasteca Nahuatl.
        By creating an account or using Itzli, you agree to these Terms. If you do
        not agree, do not use the app.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">1. Who may use Itzli</h2>
      <p className="mb-4">
        Itzli is available to users aged 13 and older. If you are under 18, you
        represent that you have a parent or legal guardian&apos;s permission to use the
        app. Itzli is not directed at children under 13, and we do not knowingly
        collect personal information from children under 13.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">2. Accounts</h2>
      <p className="mb-4">
        Authentication is provided by Clerk. You are responsible for maintaining
        the security of your account credentials and for all activity under your
        account. Notify us promptly at {CONTACT_EMAIL} if you suspect unauthorized
        access.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">3. Acceptable use</h2>
      <p className="mb-4">You agree not to:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>use Itzli for any unlawful purpose or in violation of any applicable law;</li>
        <li>attempt to probe, scan, or test the vulnerability of the app, circumvent rate limits, or bypass safety guardrails;</li>
        <li>submit content that is sexual (especially involving minors), threatening, harassing, hateful, violent, or that facilitates illegal harm;</li>
        <li>attempt to extract, copy, or redistribute Itzli&apos;s curriculum content in bulk except as permitted by the open-source license for the code;</li>
        <li>use the AI tutor to generate content that violates OpenAI&apos;s usage policies;</li>
        <li>impersonate others, or use automated scripts or crawlers against the app without our written consent.</li>
      </ul>
      <p className="mb-4">
        We may refuse service, block accounts, or remove content that violates
        these rules.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">4. The AI tutor — important disclaimer</h2>
      <p className="mb-4">
        Itzli&apos;s tutor feature (Tlamachtihquetl) uses a third-party large language
        model (OpenAI) to generate Nahuatl grammar explanations and conversation
        practice. AI output may be <strong>inaccurate, incomplete, or fabricated</strong>,
        particularly for a minority language with limited training data. Do not
        rely on the tutor for academic, legal, medical, financial, or safety-critical
        purposes. The tutor is not a substitute for a native speaker, certified
        instructor, or professional translator.
      </p>
      <p className="mb-4">
        Your messages to the tutor are transmitted to OpenAI for processing
        under their own terms. You agree not to submit personal, confidential, or
        sensitive information to the tutor.
      </p>
      <p className="mb-4">
        We do not store raw tutor chat text in our database. We may store
        privacy-preserving audit metadata, including one-way hashes of chat
        content and structured safety/control information, to operate guardrails,
        investigate abuse, and verify that moderation controls ran.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">5. Content accuracy and audio</h2>
      <p className="mb-4">
        Vocabulary and grammar content has been audited against IDIEZ and other
        scholarly references, but some entries contain known limitations noted in
        the curriculum. Audio pronunciations are <strong>machine-synthesized</strong>
        using language-specific machine synthesis where available.
        Treat generated audio as educational support rather than a substitute for
        a trained instructor or community speaker.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">6. Intellectual property</h2>
      <p className="mb-4">
        The Itzli source code is released under the project&apos;s open-source license
        available in the repository. Curriculum content (lessons, dialogues,
        worked examples) is copyrighted by its author and licensed for personal,
        non-commercial educational use via the app. Third-party assets are
        licensed from their respective owners: photographs via Pexels and/or the
        app&apos;s S3 asset catalog where applicable, reference materials from IDIEZ
        and other scholarly sources (attributed in the README), and machine audio
        generated through the app&apos;s language-specific machine-audio pipeline.
      </p>
      <p className="mb-4">
        You retain rights to content you submit, but by submitting content to the
        tutor you grant us a non-exclusive right to process it (including via
        OpenAI) for the purpose of delivering your requested response and
        enforcing safety policies.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">7. Third-party services</h2>
      <p className="mb-4">Itzli relies on the following third-party services:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li><strong>Clerk</strong> — authentication</li>
        <li><strong>Neon Postgres</strong> — progress sync and safety audit log</li>
        <li><strong>OpenAI</strong> — AI tutor (gpt-4.1-mini) and content moderation (omni-moderation-latest)</li>
        <li><strong>Vercel</strong> — hosting</li>
        <li><strong>Amazon S3</strong> — static asset delivery (audio, database)</li>
        <li><strong>Pexels</strong> — vocabulary photographs</li>
      </ul>
      <p className="mb-4">
        Your use of Itzli is also subject to the terms and privacy practices of
        these providers.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">8. Termination</h2>
      <p className="mb-4">
        You may stop using Itzli and delete your account at any time. We may
        suspend or terminate access if you violate these Terms or if we discontinue
        the service. Upon termination, your right to use the app ceases; the
        disclaimers and liability provisions below survive.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">9. Disclaimer of warranties</h2>
      <p className="mb-4 uppercase text-sm">
        Itzli is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any
        kind, express or implied, including without limitation warranties of
        merchantability, fitness for a particular purpose, non-infringement, or
        accuracy of content. We do not warrant that the app will be uninterrupted,
        error-free, or free from harmful components.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">10. Limitation of liability</h2>
      <p className="mb-4 uppercase text-sm">
        To the maximum extent permitted by law, in no event will Itzli or its
        author be liable for any indirect, incidental, special, consequential,
        exemplary, or punitive damages, or for any loss of profits, data, use, or
        goodwill, arising out of or related to your use of the app. Our total
        aggregate liability under these Terms will not exceed one hundred US
        dollars (USD 100.00) or the amount you have paid us in the past twelve
        months, whichever is greater.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">11. Indemnification</h2>
      <p className="mb-4">
        You agree to indemnify and hold harmless Itzli and its author from any
        claim, loss, or expense (including reasonable attorneys&apos; fees) arising
        from your breach of these Terms or your misuse of the app.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">12. Changes to these Terms</h2>
      <p className="mb-4">
        We may update these Terms as the app evolves. Material changes will be
        indicated by bumping the effective date above; continued use after such
        changes constitutes acceptance. You may be asked to re-accept updated
        Terms via a modal on first use after an update.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">13. Governing law</h2>
      <p className="mb-4">
        These Terms are governed by the laws of the State of Texas, United
        States, without regard to conflict-of-law principles. Disputes will be
        resolved exclusively in the state or federal courts located in Texas,
        and you consent to the personal jurisdiction of those courts.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">14. Contact</h2>
      <p className="mb-4">
        Questions about these Terms? Email{" "}
        <a className="text-emerald-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <div className="mt-12 pt-8 border-t border-stone-200 text-sm text-stone-500">
        <p>
          See also our{" "}
          <Link href="/privacy" className="text-emerald-600 underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/eula" className="text-emerald-600 underline">
            EULA
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
