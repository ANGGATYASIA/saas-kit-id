// Every payment provider in saas-kit-id speaks the same interface.
// Checkout and webhooks stay provider-agnostic; adding a new gateway means
// implementing these three methods and registering it in lib/payments/index.ts.

export type NormalizedStatus = "pending" | "settlement" | "expired" | "failed";

export interface CheckoutArgs {
  orderId: string;
  amountIdr: number;
  customer: { name: string; email: string };
  planId: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  // ISO 8601 timestamp after which the payment page should be treated as stale.
  expiresAt: string;
}

export interface PaymentProvider {
  createCheckout(args: CheckoutArgs): Promise<CheckoutResult>;
  // rawBody is the untouched request text. Verification must run before
  // parsing or trusting anything in the payload.
  verifyWebhook(rawBody: string, headers: Headers): boolean;
  normalizeStatus(payload: unknown): NormalizedStatus;
}
