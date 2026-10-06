// Payment provider unit tests. No test framework, no network, no real keys:
// every value below is a dummy invented for the test.
// Run with: npx tsx e2e/verify-payments.ts   (or: npm run test:payments)
// Exits non-zero if any assertion fails.

import { createHash } from "node:crypto";
import { MidtransProvider } from "../lib/payments/midtrans";
import { XenditProvider } from "../lib/payments/xendit";
import { getProvider } from "../lib/payments";
import type { NormalizedStatus } from "../lib/payments/types";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// --- Midtrans ----------------------------------------------------------------

const DUMMY_SERVER_KEY = "dummy-server-key-for-tests-only";
const midtrans = new MidtransProvider({
  serverKey: DUMMY_SERVER_KEY,
  clientKey: "dummy-client-key",
  isProduction: false,
});

function signedMidtransBody(overrides: Record<string, string> = {}) {
  const body = {
    order_id: "skid-1720000000000-a1b2c3",
    status_code: "200",
    gross_amount: "49000.00",
    transaction_status: "settlement",
    transaction_time: "2026-10-06 18:00:00",
    ...overrides,
  };
  const signature_key = createHash("sha512")
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${DUMMY_SERVER_KEY}`)
    .digest("hex");
  return { raw: JSON.stringify({ ...body, signature_key }), body };
}

console.log("midtrans.verifyWebhook");
{
  const { raw } = signedMidtransBody();
  check("valid signature verifies", midtrans.verifyWebhook(raw, new Headers()), true);
}
{
  // Tamper with the amount *after* signing: the signature was computed for
  // 49000.00, so changing the body must invalidate it.
  const { raw } = signedMidtransBody();
  const tampered = raw.replace('"gross_amount":"49000.00"', '"gross_amount":"49000.01"');
  check("tampered gross_amount rejected", midtrans.verifyWebhook(tampered, new Headers()), false);
}
{
  const { raw } = signedMidtransBody();
  const tampered = raw.replace(/"signature_key":"/, '"signature_key":"00');
  check("tampered signature_key rejected", midtrans.verifyWebhook(tampered, new Headers()), false);
}
{
  check("garbage body rejected", midtrans.verifyWebhook("not json", new Headers()), false);
}
{
  const raw = JSON.stringify({ order_id: "x" }); // missing fields
  check("incomplete payload rejected", midtrans.verifyWebhook(raw, new Headers()), false);
}

console.log("midtrans.normalizeStatus");
const midtransCases: Array<[Record<string, string>, NormalizedStatus]> = [
  [{ transaction_status: "capture", fraud_status: "accept" }, "settlement"],
  [{ transaction_status: "capture", fraud_status: "challenge" }, "pending"],
  [{ transaction_status: "settlement", fraud_status: "accept" }, "settlement"],
  [{ transaction_status: "pending" }, "pending"],
  [{ transaction_status: "expire" }, "expired"],
  [{ transaction_status: "deny" }, "failed"],
  [{ transaction_status: "cancel" }, "failed"],
  [{ transaction_status: "something-new" }, "failed"],
];
for (const [payload, expected] of midtransCases) {
  const label = `${payload.transaction_status}${payload.fraud_status ? `/${payload.fraud_status}` : ""}`;
  check(`status ${label} -> ${expected}`, midtrans.normalizeStatus(payload), expected);
}

// --- Xendit ------------------------------------------------------------------

const DUMMY_WEBHOOK_TOKEN = "dummy-callback-token";
const xendit = new XenditProvider({
  secretKey: "dummy-secret-key",
  webhookToken: DUMMY_WEBHOOK_TOKEN,
  appUrl: "http://localhost:3000",
});

function xenditHeaders(token: string | null) {
  const headers = new Headers();
  if (token !== null) headers.set("x-callback-token", token);
  return headers;
}

console.log("xendit.verifyWebhook");
check("correct token verifies", xendit.verifyWebhook("{}", xenditHeaders(DUMMY_WEBHOOK_TOKEN)), true);
check("wrong token rejected", xendit.verifyWebhook("{}", xenditHeaders("nope")), false);
check("missing header rejected", xendit.verifyWebhook("{}", xenditHeaders(null)), false);

console.log("xendit.normalizeStatus");
const xenditCases: Array<[string, NormalizedStatus]> = [
  ["PAID", "settlement"],
  ["PENDING", "pending"],
  ["EXPIRED", "expired"],
  ["SETTLED", "failed"],
  ["FAILED", "failed"],
];
for (const [status, expected] of xenditCases) {
  check(`status ${status} -> ${expected}`, xendit.normalizeStatus({ status }), expected);
}

// --- provider registry -------------------------------------------------------

console.log("getProvider");
// The factories read env when no override is given; point them at the same
// dummy values used above.
process.env.MIDTRANS_SERVER_KEY = DUMMY_SERVER_KEY;
process.env.MIDTRANS_CLIENT_KEY = "dummy-client-key";
process.env.XENDIT_SECRET_KEY = "dummy-secret-key";
process.env.XENDIT_WEBHOOK_TOKEN = DUMMY_WEBHOOK_TOKEN;

check("midtrans resolves", getProvider("midtrans") instanceof MidtransProvider, true);
check("xendit resolves", getProvider("xendit") instanceof XenditProvider, true);
try {
  getProvider("stripe");
  check("unknown provider throws", "no throw", "throw");
} catch {
  check("unknown provider throws", "throw", "throw");
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("\nAll payment provider checks passed.");
