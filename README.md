# saas-kit-id — Next.js SaaS Boilerplate with Midtrans & Xendit Payments

A Next.js 16 SaaS starter kit wired to Indonesian payment gateways. Clone it,
add your keys, and you get auth, paid plans in rupiah, webhook handling, a
billing dashboard, and reminder emails — without Stripe. Built for Indonesian
developers who want to launch a paid product in a weekend, not wire payment
plumbing for a week.

Midtrans Snap covers QRIS, bank virtual accounts, e-wallets, and retail
counters; Xendit invoice is a second provider behind the same
`PaymentProvider` interface, so you can switch or run both. Prices are read
from a single `lib/payments/plans.ts` on the server — the client never sets
the amount.

## Features

- **Auth with Better Auth + Postgres (Drizzle).** Email/password and Google
  OAuth, sessions in your own database. No vendor lock-in on the auth layer.
- **Two payment providers, one interface.** `PaymentProvider.createCheckout`,
  `verifyWebhook`, `normalizeStatus`. Midtrans (Snap) and Xendit (invoice)
  both implemented; adding a third means one new file.
- **Webhook hardening.** Midtrans signatures verified with SHA512; Xendit
  callbacks checked against `x-callback-token`. Every notification is
  deduplicated by `(provider, event_id)`, so replayed callbacks never
  double-grant an entitlement.
- **Forward-only transaction states.** Statuses move
  `pending → settlement`; an expired or failed callback cannot revoke a
  granted plan.
- **Per-period billing.** Two plans (Starter Rp49.000, Pro Rp149.000, both
  30 days). Payment extends the entitlement; a scheduled route emails a
  reminder before it lapses and once after.
- **Billing dashboard.** Subscription status, days remaining, payment history,
  printable invoices.
- **Emails via Resend + React Email.** Welcome, payment receipt, expiry
  reminder — templates are components in `emails/`.
- **SEO defaults.** Metadata, sitemap, robots, Open Graph image, JSON-LD.
- **Analytics and errors.** PostHog and Sentry wired but no-ops until you
  add keys.
- **Checks you can run.** `npm run test:payments` (24 signature/status
  checks), `npm run test:db` (23 database assertions against in-memory
  Postgres via PGlite).

## Quick start

Requirements: Node 20+, and a Postgres database (local Docker, Neon, or any
hosted Postgres).

```bash
git clone https://github.com/ANGGATYASIA/saas-kit-id.git
cd saas-kit-id
npm install
cp .env.example .env
```

Fill in `.env` (start with `DATABASE_URL` and `BETTER_AUTH_SECRET`; generate
one with `openssl rand -base64 32`). Local Postgres example:

```bash
docker run --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saas_kit_id
```

Then:

```bash
npx drizzle-kit migrate   # applies drizzle/ to your database
npm run db:seed           # inserts the Starter and Pro plans
npm run dev
```

Open http://localhost:3000. Register at `/auth/login` (email/password works
without any OAuth setup) and you can click through the whole product.

Run the automated checks any time:

```bash
npm run test:payments   # payment provider unit checks
npm run test:db         # database behavior against PGlite
npm run build && npm run lint
```

## Test payments (no real money)

Both providers work in sandbox/test mode before you touch production keys.
Full step-by-step: `e2e/sandbox-manual.md`.

**Midtrans sandbox**

1. Sign up at https://dashboard.sandbox.midtrans.com (separate from the
   production dashboard).
2. Settings → Access Keys → copy the Server Key and Client Key.
3. In `.env`: set `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, and keep
   `MIDTRANS_IS_PRODUCTION=false`.
4. Restart `npm run dev`. Pick a plan with provider `midtrans` → you land on
   a Snap payment page. Pay with QRIS simulation or the test card numbers in
   the Midtrans docs.
5. Webhooks need a public URL. Tunnel locally
   (`ngrok http 3000` or `npx localtunnel --port 3000`) and set the Payment
   Notification URL in the Midtrans sandbox dashboard to
   `https://<tunnel>/api/webhooks/midtrans`.

**Xendit test mode**

1. Create an account at https://dashboard.xendit.co and flip the dashboard to
   **Test mode**.
2. Settings → Developers → API keys → copy the Secret key (`xnd_...`).
3. Settings → Developers → Webhooks → copy the Callback verification token
   and add the callback URL `https://<tunnel>/api/webhooks/xendit`.
4. In `.env`: set `XENDIT_SECRET_KEY` and `XENDIT_WEBHOOK_TOKEN`.
5. Restart `npm run dev`. Pick a plan with provider `xendit` → you get a
   Xendit invoice page; simulate the payment from the invoice page.

After a successful sandbox payment, the dashboard shows the active plan and
`/api/customer` returns the `settlement` transaction. Replaying the same
webhook changes nothing — that is the idempotency guarantee.

## How subscriptions work

This kit is deliberately **not** auto-recurring. Card penetration in Indonesia
is low, and reliable card-on-file debit only exists for credit cards. The
model is: pay for a 30-day period → entitlement granted until
`valid_until` → reminder emails at 7 days before and 3 days after lapse →
the user pays again for the next period.

What that means concretely:

- Upgrades and downgrades are just new checkouts; the webhook extends the
  entitlement by the purchased plan's duration.
- A Midtrans Subscription API integration (recurring cards) would plug in as
  another `PaymentProvider` — it is **not** included.

## Deploying to production

1. Point `APP_URL` and `BETTER_AUTH_URL` at your real domain.
2. Flip Midtrans to production keys and `MIDTRANS_IS_PRODUCTION=true`; flip
   Xendit out of test mode and set production keys.
3. Register the production webhook URLs with both providers:
   - `https://yourdomain.com/api/webhooks/midtrans`
   - `https://yourdomain.com/api/webhooks/xendit`
4. Set `CRON_SECRET` to a random value (`openssl rand -hex 32`) and schedule
   `GET /api/cron/reminders` once a day with an `x-cron-secret` header
   carrying that value (Vercel Cron or any external scheduler). Without this,
   no expiry reminders go out.
5. Add your Resend API key and a verified `EMAIL_FROM` domain, or auth and
   payment emails stay silent (they log a warning, they do not crash).
6. Rotate any sandbox keys that were ever committed anywhere — they should
   never have been in the repo in the first place.

## Project structure

```text
app/
  (marketing)/        landing page, pricing
  (dashboard)/        dashboard, billing, printable invoice
  api/checkout/       creates a transaction + provider checkout URL
  api/webhooks/       midtrans/ and xendit/ webhook handlers
  api/cron/reminders/ daily expiry-reminder job (guarded by CRON_SECRET)
lib/
  payments/           types.ts (PaymentProvider), midtrans.ts, xendit.ts, plans.ts
  db/                 schema.ts, entitlements.ts (grant/extend/check access)
emails/               welcome, payment-success, expiry-reminder (React Email)
drizzle/              SQL migrations
e2e/                  verify-payments.ts, verify-db.ts, sandbox-manual.md
```

## What's not included

- Teams/organizations and per-seat billing — one entitlement row per user.
- Usage-based/metered billing.
- A full admin panel (no user management UI beyond the dashboard).
- Auto-recurring subscriptions (see "How subscriptions work").
- Mobile apps or AI features.

## License

MIT. Your payments, your data, your keys.
