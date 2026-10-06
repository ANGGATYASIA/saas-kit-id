import { createElement } from "react";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, webhookEvents } from "@/lib/db/schema";
import {
  getEntitlement,
  grantEntitlement,
  recordTransactionUpdate,
} from "@/lib/db/entitlements";
import { sendEmail } from "@/lib/email";
import { PLANS } from "@/lib/payments/plans";
import PaymentSuccessEmail from "@/emails/payment-success";
import { XenditProvider } from "@/lib/payments/xendit";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const provider = new XenditProvider();

  if (!provider.verifyWebhook(rawBody, req.headers)) {
    return NextResponse.json({ error: "Invalid callback token." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, string | undefined>;
  const { id, external_id } = payload;
  if (!id || !external_id) {
    return NextResponse.json({ error: "Missing invoice id." }, { status: 400 });
  }

  // Xendit sends one callback per status change with the same invoice id
  // (PENDING, then PAID), so the id alone is not a dedupe key: the status is
  // part of it, following the Midtrans route's pattern.
  const eventId = `${id}:${payload.status ?? ""}`;
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider: "xendit", eventId })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const status = provider.normalizeStatus(payload);
  const transaction = await recordTransactionUpdate(external_id, status, payload);
  if (status === "settlement" && transaction) {
    await grantEntitlement(transaction.userId, transaction.planId);
    await sendReceiptEmail(transaction.userId, transaction.planId, transaction.orderId, transaction.amountIdr);
  }
  return NextResponse.json({ ok: true });
}

// Additive: receipt email after a successful payment. Reads only; never
// throws (sendEmail degrades to a warning when email is not configured).
async function sendReceiptEmail(
  userId: string,
  planId: string,
  orderId: string,
  amountIdr: number,
): Promise<void> {
  const buyer = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { email: true, name: true },
  });
  if (!buyer) return;
  const plan = PLANS[planId as keyof typeof PLANS];
  const record = await getEntitlement(userId);
  const validUntil = record
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(record.entitlement.validUntil))
    : "—";
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  await sendEmail({
    to: buyer.email,
    subject: `Receipt: ${plan?.name ?? planId} — saas-kit-id`,
    react: createElement(PaymentSuccessEmail, {
      name: buyer.name || buyer.email,
      planName: plan?.name ?? planId,
      amountLabel: `Rp${amountIdr.toLocaleString("id-ID")}`,
      validUntilLabel: validUntil,
      orderId,
      appUrl,
    }),
  });
}
