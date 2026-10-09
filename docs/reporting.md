# Course reports and community feedback

Learners can report vocabulary, grammar, pronunciation, images, lesson content, or technical problems. The report dialog includes the current page and, when opened beside a lesson item, the supplied lesson and item context. That context is visible before submission. Neither reporting nor reviewing feedback changes learner progress.

The community invitation welcomes people who speak Eastern Huasteca Nahuatl to offer corrections, share local usage, or contact Sam about helping the course. Anyone may report a problem. Name, reply email, community or regional variety, and speaker information are optional; there is no ancestry requirement or photo upload. Speaker information is self-reported, not a verified credential. Reports do not automatically publish content or modify lessons.

## Delivery

The fixed recipient is **admin@itzli.app**. A report cannot supply its own delivery address. The form shows this same address and submits directly to the server; it does not prepare an email draft or copy report text to the clipboard.

- **Local review:** delivery is disabled by default. With the owner's explicit `ITZLI_REPORT_EMAIL_ALLOW_LOCAL=1` opt-in, the configured route accepts same-origin loopback requests only. It sends through Resend using one fixed local review identity and bounded in-memory limits of six attempts per hour and twenty per UTC day. No Clerk authentication, Neon connection, learner account, or progress write is used. These temporary limits reset if the local server restarts.
- **Configured production:** learners signed into an existing account can submit through the app's server-side email route. Resend accepts a plain-text report addressed to Sam. The account ID is used for report-rate counters; a derived hash is used in the provider's duplicate-prevention key. The raw account ID is not included in the report email, and raw report text is not saved to the application database. Provider acceptance is not confirmation that the message reached Sam's inbox.
- **Unavailable delivery:** unconfigured environments, ordinary development without the explicit local opt-in, and deployment previews do not send. Failed or rate-limited submissions keep the form entries and show a retry message. The UI displays success only when the server acknowledges provider acceptance for that report ID; there is no draft/copy fallback and no false success.

Names and reply addresses are optional. A reply address is needed if the reporter asks Sam to contact them about the report or a community connection. The report records that choice and the reviewer must respect it. Report text and voluntarily provided details are received in Sam's mailbox and may also be processed by Resend for delivery. The privacy page describes that processing and explains access and deletion requests.

## Enable server-side delivery

1. Use Resend with a domain you own. Verify the sending domain through the provider's normal DNS verification process.
2. Create a Resend API key scoped for sending email. Keep it in the hosting provider's secret settings; do not paste keys or mailbox credentials into chats, source files, or this document.
3. Set these server-only environment variables in Vercel:

   | Variable | Required value |
   | --- | --- |
   | `RESEND_API_KEY` | A Resend sending key |
   | `ITZLI_REPORT_EMAIL_FROM` | A bare sender address on the verified domain |
   | `ITZLI_REPORT_EMAIL_ENABLED` | `1` to enable delivery |

4. Keep the existing Clerk and database configuration used by production authentication and rate limiting. Do not change learner identities, lesson IDs, or stored progress for reporting.
5. For an authorized local delivery test, set the same sender, key and enable flag in `.env.local`, plus `ITZLI_REPORT_EMAIL_ALLOW_LOCAL=1`, and start the loopback `dev:local` app. Its launcher supplies `ITZLI_LOCAL_REVIEW=1`; the local opt-in is rejected on Vercel even if configured there. A submission sends a real email to the fixed admin mailbox. Keep signup welcome delivery disabled locally.

Leaving the enable flag unset keeps provider delivery disabled. None of these variables are public browser settings. The recipient is fixed in application code and is not a new environment-controlled destination.

## Review workflow

Review the reported issue against the taught regional variety, the selected word sense, available source evidence, and any volunteered community context. Keep regional differences visible rather than assuming that one self-reported usage is universal. Do not publish a reporter's name, contact details, or personal message without their separate permission. Correct course material only after review, and retain its stable IDs so existing learner progress stays meaningful.

The feedback route does not change course content or learner progress. Provider acceptance acknowledges submission, not confirmed arrival in the recipient's inbox.
