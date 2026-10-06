import { timingSafeEqual } from "node:crypto";
import { Invoice } from "xendit-node";
import { PLANS } from "./plans";
import type {
  CheckoutArgs,
  CheckoutResult,
  NormalizedStatus,
  PaymentProvider,
} from "./types";

// Uses xendit-node v7 (OpenAPI-generated). The class exported as `Invoice`
// is the invoice API client: `new Invoice({ secretKey })`, then
// `createInvoice({ data: { externalId, amount, ... } })`, which resolves to an
// Invoice model with `invoiceUrl` and `expiryDate`.

interface XenditConfig {
  secretKey: string;
  webhookToken: string;
  appUrl: string;
}

function readConfig(overrides?: Partial<XenditConfig>): XenditConfig {
  const secretKey = overrides?.secretKey ?? process.env.XENDIT_SECRET_KEY ?? "";
  const webhookToken =
    overrides?.webhookToken ?? process.env.XENDIT_WEBHOOK_TOKEN ?? "";
  if (!secretKey) {
    throw new Error("Xendit is not configured: set XENDIT_SECRET_KEY.");
  }
  if (!webhookToken) {
    throw new Error("Xendit is not configured: set XENDIT_WEBHOOK_TOKEN.");
  }
  return {
    secretKey,
    webhookToken,
    appUrl:
      overrides?.appUrl ?? process.env.APP_URL ?? "http://localhost:3000",
  };
}

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export class XenditProvider implements PaymentProvider {
  private client: Invoice;
  private webhookToken: string;
  private appUrl: string;

  constructor(overrides?: Partial<XenditConfig>) {
    const config = readConfig(overrides);
    this.client = new Invoice({ secretKey: config.secretKey });
    this.webhookToken = config.webhookToken;
    this.appUrl = config.appUrl.replace(/\/$/, "");
  }

  async createCheckout(args: CheckoutArgs): Promise<CheckoutResult> {
    const plan = PLANS[args.planId as keyof typeof PLANS];
    const invoice = await this.client.createInvoice({
      data: {
        externalId: args.orderId,
        amount: args.amountIdr,
        payerEmail: args.customer.email,
        description: plan ? `saas-kit-id ${plan.name}` : `saas-kit-id ${args.planId}`,
        invoiceDuration: 24 * 3600,
        successRedirectUrl: `${this.appUrl}/dashboard/billing?status=success`,
        failureRedirectUrl: `${this.appUrl}/dashboard/billing?status=failed`,
        currency: "IDR",
      },
    });

    if (!invoice.invoiceUrl) {
      throw new Error("Xendit did not return an invoice URL.");
    }
    return {
      checkoutUrl: invoice.invoiceUrl,
      expiresAt: invoice.expiryDate
        ? new Date(invoice.expiryDate).toISOString()
        : new Date(Date.now() + 24 * 3600_000).toISOString(),
    };
  }

  verifyWebhook(_rawBody: string, headers: Headers): boolean {
    const token = headers.get("x-callback-token");
    if (!token) return false;
    return tokensMatch(token, this.webhookToken);
  }

  normalizeStatus(payload: unknown): NormalizedStatus {
    const status = (payload as Record<string, string | undefined>).status;
    switch (status) {
      case "PAID":
        return "settlement";
      case "PENDING":
        return "pending";
      case "EXPIRED":
        return "expired";
      default:
        return "failed";
    }
  }
}
