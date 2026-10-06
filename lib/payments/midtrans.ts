import { createHash, timingSafeEqual } from "node:crypto";
import { Snap, type SnapTransactionParameters } from "midtrans-client";
import { PLANS } from "./plans";
import type {
  CheckoutArgs,
  CheckoutResult,
  NormalizedStatus,
  PaymentProvider,
} from "./types";

interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
}

function readConfig(overrides?: Partial<MidtransConfig>): MidtransConfig {
  const serverKey = overrides?.serverKey ?? process.env.MIDTRANS_SERVER_KEY ?? "";
  const clientKey = overrides?.clientKey ?? process.env.MIDTRANS_CLIENT_KEY ?? "";
  if (!serverKey || !clientKey) {
    throw new Error(
      "Midtrans is not configured: set MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY.",
    );
  }
  return {
    serverKey,
    clientKey,
    isProduction:
      overrides?.isProduction ?? process.env.MIDTRANS_IS_PRODUCTION === "true",
  };
}

function signaturesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Pulls gross_amount out of the raw JSON text so the signature is computed
// against the exact string Midtrans sent, not a re-serialized number.
function grossAmountFromRawBody(rawBody: string): string | null {
  const match = rawBody.match(/"gross_amount"\s*:\s*("([^"]+)"|(-?[\d.]+))/);
  if (!match) return null;
  return match[2] ?? match[3] ?? null;
}

export class MidtransProvider implements PaymentProvider {
  private snap: Snap;
  private serverKey: string;

  constructor(overrides?: Partial<MidtransConfig>) {
    const config = readConfig(overrides);
    this.serverKey = config.serverKey;
    this.snap = new Snap({
      isProduction: config.isProduction,
      serverKey: config.serverKey,
      clientKey: config.clientKey,
    });
  }

  async createCheckout(args: CheckoutArgs): Promise<CheckoutResult> {
    const plan = PLANS[args.planId as keyof typeof PLANS];
    // Snap redirects expire after this window; report it so callers can
    // nudge users to pay before the link dies.
    const expiryHours = 24;
    const now = new Date();
    const startTime = formatMidtransTime(now);

    const transaction = await this.snap.createTransaction({
      transaction_details: {
        order_id: args.orderId,
        gross_amount: args.amountIdr,
      },
      customer_details: {
        first_name: args.customer.name,
        email: args.customer.email,
      },
      item_details: [
        {
          id: args.planId,
          price: args.amountIdr,
          quantity: 1,
          name: plan ? `saas-kit-id ${plan.name}` : `saas-kit-id ${args.planId}`,
        },
      ],
      expiry: {
        start_time: startTime,
        unit: "hours",
        duration: expiryHours,
      },
    } as SnapTransactionParameters);

    return {
      checkoutUrl: transaction.redirect_url,
      expiresAt: new Date(now.getTime() + expiryHours * 3600_000).toISOString(),
    };
  }

  verifyWebhook(rawBody: string, _headers: Headers): boolean {
    const grossAmount = grossAmountFromRawBody(rawBody);
    if (!grossAmount) return false;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return false;
    }
    const { order_id, status_code, signature_key } = payload;
    if (
      typeof order_id !== "string" ||
      typeof status_code !== "string" ||
      typeof signature_key !== "string"
    ) {
      return false;
    }
    // Midtrans signs notifications as SHA512(order_id + status_code +
    // gross_amount + serverKey), using gross_amount verbatim from the body.
    const expected = createHash("sha512")
      .update(`${order_id}${status_code}${grossAmount}${this.serverKey}`)
      .digest("hex");
    return signaturesMatch(expected, signature_key);
  }

  normalizeStatus(payload: unknown): NormalizedStatus {
    const p = payload as Record<string, string | undefined>;
    const status = p.transaction_status;
    const fraud = p.fraud_status;
    if (status === "capture") {
      return fraud === "challenge" ? "pending" : "settlement";
    }
    switch (status) {
      case "settlement":
        return "settlement";
      case "pending":
        return "pending";
      case "expire":
        return "expired";
      case "cancel":
      case "deny":
        return "failed";
      default:
        return "failed";
    }
  }
}

// "2026-10-06 18:30:00 +0700" — the format Snap's expiry.start_time expects.
function formatMidtransTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ` +
    `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`
  );
}
