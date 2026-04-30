import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Itzli — Eastern Huasteca Nahuatl learning app.",
};

const EFFECTIVE_DATE = "April 30, 2026";
const CONTACT_EMAIL = "svillasmith3@gmail.com";

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-stone-500 mb-10">Effective: {EFFECTIVE_DATE}</p>

      <div className="mb-10 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
        <p className="font-semibold text-emerald-900 mb-2">Short version</p>
        <ul className="list-disc pl-5 space-y-1 text-emerald-900">
          <li>We collect only what we need to run the app: your account (via Clerk), your learning progress, and safety-audit metadata.</li>
          <li>We <strong>never store the raw text of your chat messages</strong> in our database. Chat audit records use one-way hashes and structured safety metadata.</li>
          <li>Your messages to the AI tutor are transmitted to OpenAI for processing.</li>
          <li>You can delete your cloud progress or your entire account at any time.</li>
        </ul>
      </div>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">1. Who we are</h2>
      <p className="mb-4">
        Itzli is a free educational app for learning Eastern Huasteca Nahuatl,
        operated by Sam Villa-Smith. For privacy questions, contact{" "}
        <a className="text-emerald-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">2. What we collect</h2>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">Account data (via Clerk)</h3>
      <p className="mb-4">
        When you sign up, Clerk collects your email address, password (hashed,
        never visible to us), and any profile information you choose to add.
        Clerk&apos;s{" "}
        <a
          className="text-emerald-600 underline"
          href="https://clerk.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>{" "}
        applies to that data.
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">Learning progress (Neon Postgres)</h3>
      <p className="mb-4">
        We store your unit completion, quiz accuracy, and spaced-repetition state
        in our database, keyed to your Clerk user ID. This data lets you resume
        your learning across devices. It contains no personally identifying
        information beyond the pseudonymous Clerk ID.
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">Chat audit log (Neon Postgres)</h3>
      <p className="mb-4">
        For AI tutor requests and safety guardrail events, we record an audit row
        containing: the Clerk user ID, the event kind, request metadata, safety
        categories and scores where applicable, model names, timestamps, and
        <strong> sha256 hashes of chat content</strong>. We do <strong>not</strong>{" "}
        store the raw text of user messages or AI responses. Hashes let us verify
        a user-supplied message or detect repeated attack patterns without
        retaining readable chat content.
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">Chat content (transient, via OpenAI)</h3>
      <p className="mb-4">
        Your chat messages are sent to OpenAI for completion. OpenAI processes
        them under its{" "}
        <a
          className="text-emerald-600 underline"
          href="https://openai.com/policies/privacy-policy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
        . Per OpenAI&apos;s API policy, API messages are not used to train their
        models. We do not persist chat messages in our own database.
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">Local storage</h3>
      <p className="mb-4">
        Your browser stores a mirror of your learning progress in{" "}
        <code>localStorage</code> so the app works offline. We also set a
        localStorage entry recording that you agreed to these policies, so we
        don&apos;t re-prompt you every visit. Clearing your browser data will clear
        these.
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">Cookies</h3>
      <p className="mb-4">
        Clerk sets essential authentication cookies required for you to stay
        signed in. We do not use third-party advertising or analytics cookies.
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">Server logs</h3>
      <p className="mb-4">
        Our hosting provider (Vercel) may record standard server logs (IP
        address, user agent, request path, timestamp) for operational and
        security purposes. These are retained for a limited period per Vercel&apos;s
        policies.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">3. How we use data</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>to provide authentication and run the app;</li>
        <li>to sync your learning progress across devices;</li>
        <li>to detect and prevent abuse of the AI tutor (via hashed audit log);</li>
        <li>to moderate content using third-party safety APIs;</li>
        <li>to respond to your support requests.</li>
      </ul>
      <p className="mb-4">
        We do not sell your data. We do not share it with advertisers. We do not
        use it for behavioral profiling.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">4. Third parties</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li><strong>Clerk</strong> — processes authentication data</li>
        <li><strong>Neon (Postgres)</strong> — stores progress and hashed audit rows</li>
        <li><strong>OpenAI</strong> — processes chat content (completion + moderation)</li>
        <li><strong>Vercel</strong> — hosts the app and serves requests</li>
        <li><strong>Amazon S3</strong> — serves static assets (audio, database bundle)</li>
        <li><strong>Pexels</strong> — serves vocabulary photographs</li>
      </ul>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">5. Your rights</h2>
      <p className="mb-4">
        Depending on where you live (including under GDPR in the EU/UK or CCPA
        in California), you may have the right to:
      </p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>access the personal data we hold about you;</li>
        <li>correct inaccurate data;</li>
        <li>delete your data (&quot;right to erasure&quot;);</li>
        <li>object to or restrict processing;</li>
        <li>receive a portable copy of your data.</li>
      </ul>
      <p className="mb-4">
        To exercise these rights, contact us at {CONTACT_EMAIL}. We will respond
        within 30 days. You may also have the right to lodge a complaint with
        your local data-protection authority.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">6. How to delete your data</h2>
      <p className="mb-4">
        From inside the app:
      </p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Go to <Link href="/progress" className="text-emerald-600 underline">Progress</Link> and use &quot;Reset progress&quot; to clear local progress and delete the cloud copy.</li>
        <li>Delete your account via Clerk to remove authentication data.</li>
      </ul>
      <p className="mb-4">
        For complete deletion of the safety-audit hash log tied to your user ID,
        email {CONTACT_EMAIL}.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">7. Retention</h2>
      <p className="mb-4">
        We retain progress data for as long as your account is active. If you
        delete your account or reset progress, the corresponding rows are
        removed. Hashed audit rows are retained for up to 24 months for
        abuse-pattern detection, then purged. Server logs follow our hosting
        provider&apos;s retention policy.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">8. Children</h2>
      <p className="mb-4">
        Itzli is not directed at children under 13. We do not knowingly collect
        personal information from children under 13. If you believe a child
        under 13 has provided us with personal information, contact us and we
        will delete it.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">9. International transfers</h2>
      <p className="mb-4">
        Our services run on infrastructure in the United States. If you access
        Itzli from outside the US, your data will be transferred to and
        processed in the US. By using the app you consent to this transfer.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">10. Security</h2>
      <p className="mb-4">
        We take reasonable technical measures to protect your data: TLS in
        transit, authentication via Clerk, password hashing on Clerk&apos;s side,
        and sha256 hashing of audit content. No system is perfectly secure;
        we cannot guarantee absolute security.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">11. Changes to this policy</h2>
      <p className="mb-4">
        We may update this Privacy Policy. Material changes will be reflected in
        the effective date above, and you may be asked to re-accept the updated
        policy on next use.
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">12. Contact</h2>
      <p className="mb-4">
        Privacy questions or requests:{" "}
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
          <Link href="/eula" className="text-emerald-600 underline">
            EULA
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
