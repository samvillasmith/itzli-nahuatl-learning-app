import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "End User License Agreement",
  description: "EULA for Itzli — Eastern Huasteca Nahuatl learning app.",
};

const EFFECTIVE_DATE = "April 23, 2026";
const CONTACT_EMAIL = "svillasmith3@gmail.com";

export default function EulaPage() {
  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">End User License Agreement</h1>
      <p className="text-sm text-stone-500 mb-10">Effective: {EFFECTIVE_DATE}</p>

      <p className="mb-4">
        This End User License Agreement (&quot;EULA&quot;) is a legal agreement
        between you and the author of Itzli (&quot;we,&quot; &quot;us&quot;)
        governing your use of the hosted Itzli application and curriculum
        content (collectively, the &quot;Software&quot;). By accessing or using
        the Software, you agree to be bound by this EULA, our{" "}
        <Link href="/terms" className="text-emerald-600 underline">
          Terms of Service
        </Link>
        , and our{" "}
        <Link href="/privacy" className="text-emerald-600 underline">
          Privacy Policy
        </Link>
        .
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">1. License grant</h2>
      <p className="mb-4">
        Subject to your continued compliance with this EULA, we grant you a
        personal, worldwide, non-exclusive, non-transferable, non-sublicensable,
        revocable license to access and use the hosted Software solely for your
        personal, non-commercial educational purposes.
      </p>
      <p className="mb-4">
        The source code of the Itzli application is separately licensed under
        the open-source license contained in the public repository. Your rights
        to the source code are governed by that license; this EULA governs your
        use of the <em>hosted service</em> and the <em>curriculum content</em>.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">2. Restrictions</h2>
      <p className="mb-4">Except as expressly permitted by the Software&apos;s open-source code license, you will not:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>sell, sublicense, rent, lease, or otherwise commercialize access to the hosted Software;</li>
        <li>scrape, bulk-download, or systematically extract the curriculum content, vocabulary database, dialogues, or audio files;</li>
        <li>attempt to reverse-engineer, disable, or bypass safety, moderation, or rate-limit features;</li>
        <li>use the Software to build a competing product through text-similarity, embedding, or bulk-AI processing of our content;</li>
        <li>remove, alter, or obscure any copyright, trademark, or attribution notices (including attribution required for Pexels photographs and IDIEZ references);</li>
        <li>use the Software in violation of applicable law.</li>
      </ul>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">3. Ownership and intellectual property</h2>
      <p className="mb-4">
        Title, ownership rights, and intellectual-property rights in the
        Software and content remain with us or our licensors. This EULA grants
        you a license, not a sale.
      </p>
      <p className="mb-4">
        The Eastern Huasteca Nahuatl language itself is the cultural heritage
        of the Nahua peoples of the Huasteca region. Our curriculum draws on
        reference works from the Instituto de Docencia e Investigación
        Etnológica de Zacatecas (IDIEZ), the Karttunen Analytical Dictionary of
        Nahuatl, and attested EHN texts — credited in the repository
        acknowledgments. Machine audio is produced using Meta AI&apos;s MMS-NHE
        model and Kokoro-82M; photographs are licensed from Pexels with
        attribution.
      </p>
      <p className="mb-4">
        Curriculum content is available for personal learning via the app only.
        Commercial reuse, publication, or redistribution of the curriculum
        content requires our prior written permission.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">4. AI tutor content — &quot;as-is&quot; disclaimer</h2>
      <p className="mb-4">
        The AI tutor generates output using a third-party large language model
        that is not specifically trained on Eastern Huasteca Nahuatl. Output
        may be <strong>inaccurate, hallucinated, or linguistically incorrect</strong>.
        It is provided for educational exploration only and is not warranted
        fit for academic citation, translation, or any professional use. You
        assume all risk from acting on AI output.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">5. Disclaimer of warranties</h2>
      <p className="mb-4 uppercase text-sm">
        The Software is provided &quot;as is&quot; and &quot;as available,&quot;
        without warranty of any kind, express, implied, statutory, or otherwise,
        including without limitation warranties of merchantability, fitness for
        a particular purpose, title, non-infringement, accuracy, or quiet
        enjoyment. We do not warrant that the Software will meet your
        requirements, be uninterrupted, be free of harmful components, or that
        defects will be corrected.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">6. Limitation of liability</h2>
      <p className="mb-4 uppercase text-sm">
        To the maximum extent permitted by law, in no event will we or our
        licensors be liable for any indirect, incidental, special,
        consequential, exemplary, or punitive damages, or for any loss of
        profits, data, use, or goodwill, arising out of or related to your use
        of the Software, even if advised of the possibility of such damages.
        Our aggregate liability under this EULA will not exceed one hundred US
        dollars (USD 100.00) or the amount you have paid us in the past twelve
        months, whichever is greater.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">7. Termination</h2>
      <p className="mb-4">
        This EULA is effective until terminated. It will terminate automatically
        if you breach any provision. Upon termination you must stop using the
        Software. Sections 2 (Restrictions), 3 (Ownership), 5 (Warranties),
        6 (Liability), and 8 (Governing law) survive termination.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">8. Governing law</h2>
      <p className="mb-4">
        This EULA is governed by the laws of the State of Texas, United
        States, without regard to conflict-of-law principles. Disputes will be
        resolved in the state or federal courts located in Texas, and you
        consent to the personal jurisdiction of those courts.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">9. Entire agreement</h2>
      <p className="mb-4">
        This EULA, together with our Terms of Service and Privacy Policy,
        constitutes the entire agreement between you and us regarding the
        Software. If any provision is held unenforceable, the remaining
        provisions remain in full force.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">10. Contact</h2>
      <p className="mb-4">
        Questions about this EULA:{" "}
        <a className="text-emerald-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <div className="mt-12 pt-8 border-t border-stone-200 text-sm text-stone-500">
        <p>
          See also our{" "}
          <Link href="/terms" className="text-emerald-600 underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-emerald-600 underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
