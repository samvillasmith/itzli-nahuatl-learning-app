# Signup welcome email

The existing signed Clerk webhook at `/api/webhooks/clerk` sends a one-time Itzli welcome through Resend. It uses the verified primary address in a `user.created` event. A `user.updated` event covers learners who verify that address after signup. The welcome introduces the free Eastern Huasteca Nahuatl course, its 324 lessons and 1,724 words and forms, pronunciation practice, source recordings and Indigenous, Nahua and Mexica heritage. It includes English or Spanish copy according to Clerk's locale, a lesson link, a source-course link and `admin@itzli.app` as the reply address.

## Production configuration

Configure these server-only values in Vercel production settings:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | Sending key permitted to use the verified Itzli domain |
| `ITZLI_WELCOME_EMAIL_FROM` | Bare sender on that verified domain, such as `hello@itzli.app` |
| `ITZLI_WELCOME_EMAIL_ENABLED` | `1` |
| `ITZLI_WELCOME_EMAIL_START_AT` | UTC activation timestamp, such as `2026-10-09T05:42:30Z` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Secret for this Clerk webhook endpoint |
| `DATABASE_URL` | Existing Neon connection used by the application |

In the production Clerk instance, subscribe the HTTPS endpoint `https://www.itzli.app/api/webhooks/clerk` to `user.created`, `user.updated` and `user.deleted`. Keep the endpoint public in the auth middleware: authenticity comes from the existing Clerk signature verification, which runs before delivery or storage work. The body remains limited to 64 KiB.

`START_AT` prevents an update to an older account from unexpectedly sending a welcome when the feature is enabled. Only accounts created at or after that time qualify. Invalid sender/key/start configuration returns a retryable failure for eligible signups. Missing or unverified primary addresses, blocked accounts and accounts predating activation are acknowledged without delivery. This is one transactional welcome; it does not subscribe the learner to recurring marketing.

Delivery additionally requires `NODE_ENV=production`, `VERCEL=1` and `VERCEL_ENV=production`. Development, local review, local production builds and Vercel previews never contact Resend or create welcome storage. Credentials in `.env.local` do not override this restriction. No API key belongs in client-side variables, committed files or email previews.

## Duplicate prevention and recovery

The welcome helper initializes `welcome_email_deliveries` lazily in production using the schema in its source. Setup has not been applied by local development or tests. The production database role needs permission to create this table, as it does for report counters; an operator can create the documented schema in advance if the runtime role does not permit DDL.

```sql
CREATE TABLE IF NOT EXISTS welcome_email_deliveries (
  account_hash CHAR(64) PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'uncertain', 'deleted')),
  payload_json TEXT,
  first_attempt_at TIMESTAMPTZ,
  lease_token UUID,
  lease_expires_at TIMESTAMPTZ,
  provider_id VARCHAR(128),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

An atomic database claim and short lease coordinate simultaneous deliveries. The ledger holds a SHA-256 account hash and the exact pending message payload. Every retry uses that original payload and the same `itzli-welcome/<account-hash>` Resend idempotency key, even if the greeting, address, course description or sender settings have since changed. On provider acceptance, the helper stores the provider receipt and removes the message payload, including the recipient and greeting. Repeated creation/update events then stop at the stored receipt and never send a second welcome, even after Resend's deduplication window expires. Provider acceptance does not guarantee inbox delivery.

Failures return HTTP 503 so Clerk can retry. Network errors, provider rejection and malformed receipts do not count as accepted delivery. A failed receipt write may follow successful sending, so the same idempotency key is used when recovering.

Resend retains idempotency keys for 24 hours. An unresolved attempt becomes `uncertain` on its next retry after 23 hours; the pending payload is then erased and automatic resending stops. This deliberately leaves a margin around the provider window. The handler continues returning a retryable failure with the static `uncertain` reason so an operator can investigate. Inspect Resend's delivery log before any manual reconciliation; do not erase an uncertain ledger record and replay blindly, because the original mail may have been accepted. A record should be marked accepted only when its matching provider receipt has been confirmed. If logs conclusively show no acceptance, a deliberate operator reset and Clerk replay can attempt delivery again.

Signed `user.deleted` events erase pending payloads and provider receipts and leave a hash-only deletion marker. That marker stops delayed `user.created`/`user.updated` events from welcoming an account that was already deleted. Deletion still clears existing progress, chat and report counters. Cleanup also handles an existing welcome ledger when future welcomes have been disabled.

## Validation

Mocked tests cover invalid signatures and oversized webhook bodies, verified-primary selection, delayed verification, old-account suppression, local/preview isolation, HTML escaping, fixed links, production configuration errors, duplicate and deleted-account handling, stable retry payloads and keys, rejected/uncertain deliveries, persistence errors and deletion cleanup. No live welcome email is sent during those checks.

Official references: [Clerk webhook delivery and signature verification](https://clerk.com/docs/guides/development/webhooks/overview), [Resend email API](https://resend.com/docs/api-reference/emails/send-email), and [Resend's 24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys).
