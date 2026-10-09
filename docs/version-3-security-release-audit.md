# Version 3.0 security and media release audit

Checked October 9, 2026, against the final local production build.

The application hardening and approved image publication are complete. The final course passes 1,565 tests across 140 files, including the additional V3 cloud-sync and compatibility checks. A subsequent image metadata correction passes 135 focused tests, including 15 new regression cases; all 1,978 published image records pass that audit. Production configuration has now been independently verified through the existing Vercel project. The optimized build, release packaging and HTTP security checks are recorded below; the public deployment is tracked separately by its Git commit and Vercel deployment record.

## Authentication and requests

Production can no longer bypass Clerk through local review flags, including on a self-hosted server. Local review is restricted to explicit development mode, with its launchers fixed to the loopback address. Protected dynamic URLs remain covered by authentication even when their names resemble image or script files. Clerk session origins are limited to the known application domains and explicit development or deployment-preview origins.

Progress, feedback and tutor mutations require the correct request origin and JSON content type. Requests cannot redefine their destination through a forged Host header. Chunk-counted body limits reject oversized or malformed input. Progress saves and resets have atomic, database-backed per-account limits: 120 saves per minute and 1,200 per hour; 10 resets per hour and 20 per day. Reads remain unthrottled.

Signed account webhooks and retention cleanup cannot alter production data from preview deployments. Webhook signatures remain mandatory. User ownership, parameterized queries, progress merging, account deletion safeguards and feedback delivery to admin@itzli.app remain intact. Sensitive exception objects and query fragments have been removed from logs. The tutor remains disabled, with its existing moderation and reviewed-source gates preserved.

## Browser and delivery protections

The app now uses Clerk's strict content security policy with fresh request nonces. The cacheable offline page authorizes its inline script by its exact hash. Browser controls deny framing and executable object embeds, prevent content-type sniffing, limit referrer disclosure and restrict unused device capabilities. Microphone recording remains available within the app.

Image optimization accepts only the two course storage origins and approved paths. It rejects remote redirects, local network addresses, SVG execution and unapproved query strings, with bounded source size and disk caching. Clerk was updated to 7.7.8 for its current CSP support; Next remains 16.3.8. The production dependency audit reports zero known vulnerabilities.

## Storage and approved images

The owner's approval covers all 1,527 exact image files in the Desktop review folder. Their recorded hashes were checked before publication. All **1,032 new illustrations** are uploaded, publicly verified and active; the pending ledger is empty. Seventeen retained legacy illustrations were copied, unchanged, to new immutable URLs to close their cache-header gaps. Original files and objects remain intact.

Every one of the **1,524 currently selected course image URLs** has exact approved-byte evidence and one-year immutable caching. Lesson image and audio warmup remains wired to run when a lesson opens. Recorded safety, meaning and course-selection holds remain enforced.

Anonymous S3 bucket listing is blocked. The research database namespace is private, including the original full database, three older full-database backups and future copies in that folder. All five current objects return anonymous 403. Owner access and original object metadata are preserved; sampled published image and audio requests remain 200 with immutable caching. No research objects were deleted or downloaded during this additional check.

## Verification and limits

The final build generated 458 routes. All 45 production package traces passed, with the course-only database included and zero private research or diagnostic media files. The browser and release scans found no exposed credentials, prohibited full learner text or removed personal contact links. Actual production HTTP checks verified fresh nonces, bilingual rendering, authentication on disguised paths, rejection of invalid feedback and unsigned webhooks, public notices and offline script integrity. Four homepage illustrations loaded at their original 1,024-pixel width without CSP errors.

A separate export of the staged Git source passes all eight release, source, language, safety and media guards without private research fixtures, downloaded credentials or the full master database. Exact JSON bytes are preserved in Git so the reviewed provenance hashes remain stable across Windows and Linux checkouts. CI regenerates only platform-specific software notices before validating the reviewed release.

The Linux release also preserves the upstream notices and full GNU LGPLv3/GPLv3 terms missing from two locked image-library packages. Those fallback notices are bound to the exact package integrity and upstream release commit; changed package or notice bytes fail validation.

The owner confirmed AWS and Resend credential rotation and updated Vercel settings privately. After restoring Vercel access, the actual Production database connection succeeded and its existing progress table and permissions were checked without querying learner records. The pending live Clerk key matches the currently served website, and the secret key authenticates to that same production tenant. No production sign-in tenant or learner database was replaced.

The separate progress rate-limit table and retention index have been provisioned. The existing learner table, rows and identifiers were not modified. The missing Clerk welcome/account-cleanup webhook is now enabled at the production callback URL, subscribing only to account creation, update and deletion events. Its signing secret and the scheduled cleanup secret are sensitive, Production-only Vercel variables. No events were replayed and no live emails were sent during verification. Cleanup safely handles a tutor audit table that has never been created.

Signed-in V3 completions, vocabulary practice, vocabulary bookmarks and vocabulary notes now sync inside an optional versioned extension of the existing spaced-repetition JSON column. Existing browser progress uploads automatically; older clients cannot erase the new extension. Concurrent device attempts merge, failed saves remain pending, and invalid storage is preserved. Personal expression notebooks and unfinished conversation checkpoints remain on the learner's device. Guest and local-review progress remain local.

One existing locale-navigation lint warning remains. Five development dependency entries inherit one unpatched glob-parser advisory; no learner-facing exposure was established. The audit does not guarantee immunity from every attack. Production configuration and cross-device progress, the two previous release gaps, are resolved. Deployment must use this checked source and the verified Production settings.

Implementation references: [Clerk CSP guidance](https://clerk.com/docs/guides/secure/best-practices/csp-headers) and [Next.js CSP guidance](https://nextjs.org/docs/app/guides/content-security-policy). Source and copyright findings remain documented in the [earlier V3 audit](version-3-final-release-audit.md).
