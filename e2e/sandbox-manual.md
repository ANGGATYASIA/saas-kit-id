# Manual sandbox test — payments (Fase 2)

Status: **not run yet.** These steps need real sandbox API keys from the user.
The automated checks in `e2e/verify-payments.ts` (signature math, status
mapping, webhook-token comparison) all pass, but nothing below has touched
a live sandbox.

Automated checks that need no keys or network:
- `npm run test:payments` — provider unit tests.
- `npm run test:db` (Fase 3) — database behavior tests against in-memory
  Postgres (PGlite): applies the real drizzle migration, seeds the two
  plans, then asserts webhook dedupe, forward-only transaction statuses,
  entitlement extension math, order_id uniqueness, and plan resolution.

## 0. Prepare

```bash
cd ~/workspace/saas-kit-id
cp .env.example .env
# Fill in: DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET (or use email login)
npx drizzle-kit migrate   # or however the schema is applied in your setup
npm run db:seed           # inserts starter + pro plans
npm run dev
```

Register a user at http://localhost:3000/auth/login (Google OAuth needs the
client ID/secret; email+password works without).

## 1. Midtrans sandbox

1. Create an account at https://dashboard.sandbox.midtrans.com (Merchant ID,
   not the production dashboard).
2. Settings → Access Keys: copy the **Server Key** and **Client Key**.
3. In `.env`:
   - `MIDTRANS_SERVER_KEY=<sandbox server key>`
   - `MIDTRANS_CLIENT_KEY=<sandbox client key>`
   - `MIDTRANS_IS_PRODUCTION=false`
4. Restart `npm run dev`. Log in, open the pricing page, pick a plan, choose
   Midtrans → you should land on a Snap payment page.
5. Pay with QRIS (sandbox): any QRIS app scan works in simulation, or use the
   Midtrans simulator card numbers for card payments.
6. Webhooks: Midtrans must reach your machine. Use a tunnel:
   ```bash
   ngrok http 3000   # or: npx localtunnel --port 3000
   ```
   Then in the Midtrans sandbox dashboard → Settings → Configuration, set the
   Payment Notification URL to `https://<tunnel>/api/webhooks/midtrans`.
7. After the sandbox payment completes, check:
   - `GET /api/customer` (logged in) shows status `settlement` for the order
     and an `entitlement` with `validUntil` ≈ 30 days out.
   - The dashboard shows the active plan.
8. Retry safety: in the dashboard, manually re-send the notification for the
   same order (or replay the same POST). The entitlement's `validUntil` must
   not extend a second time, and no duplicate row appears in `webhook_events`
   handling.

## 2. Xendit test mode

1. Create an account at https://dashboard.xendit.co and switch the dashboard
   to **Test mode**.
2. Settings → Developers → API keys: copy the **Secret key** (starts with
   `xnd_...`).
3. Settings → Developers → Webhooks: copy the **Callback verification token**,
   and add a callback URL `https://<tunnel>/api/webhooks/xendit` for invoices.
4. In `.env`:
   - `XENDIT_SECRET_KEY=<test secret key>`
   - `XENDIT_WEBHOOK_TOKEN=<callback verification token>`
5. Restart dev server. Checkout with provider `xendit` → you should be
   redirected to a Xendit invoice page (`checkout.xendit.co/...`).
6. Simulate payment: Xendit test mode invoices can be paid via the "Simulate
   payment" affordance in the invoice page / dashboard, or via test bank VA
   numbers from the Xendit docs.
7. Check the same outcomes as step 1.7–1.8: transaction `settlement`,
   entitlement granted, replay of the callback does not double-grant.

## 3. What "done" looks like

- QRIS (Midtrans sandbox) → entitlement active in dashboard.
- VA/invoice (Xendit test mode) → entitlement active in dashboard.
- Replaying either webhook changes nothing (idempotent).
- An expired/cancelled payment never creates an entitlement.

## Notes

- Xendit invoice callbacks arrive once per status change (PENDING, then
  PAID) under the same invoice id; the webhook dedupe key includes the
  status so the PAID callback after PENDING is still processed.
- The success/failure redirect URLs point to `/dashboard/billing?status=...`,
  which requires a signed-in session (auth layout).
- Only one entitlement row per user is supported; team/org plans are
  explicitly out of scope.
