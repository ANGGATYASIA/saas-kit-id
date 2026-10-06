import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getProvider } from "@/lib/payments";
import { getPlan } from "@/lib/payments/plans";

function newOrderId(): string {
  return `skid-${Date.now()}-${randomBytes(3).toString("hex")}`;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Sign in to start checkout." }, { status: 401 });
  }

  let body: { planId?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const plan = getPlan(body.planId ?? "");
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  if (!body.provider) {
    return NextResponse.json({ error: "Choose a payment provider." }, { status: 400 });
  }

  let provider;
  try {
    provider = getProvider(body.provider);
  } catch {
    return NextResponse.json({ error: "Unknown payment provider." }, { status: 400 });
  }

  // The price always comes from the server's plan table — the client only
  // names the plan, never the amount.
  const orderId = newOrderId();
  await db.insert(transactions).values({
    userId: session.user.id,
    provider: body.provider,
    orderId,
    planId: plan.id,
    amountIdr: plan.priceIdr,
    status: "pending",
  });

  try {
    const { checkoutUrl } = await provider.createCheckout({
      orderId,
      amountIdr: plan.priceIdr,
      customer: {
        name: session.user.name ?? session.user.email,
        email: session.user.email,
      },
      planId: plan.id,
    });
    return NextResponse.json({ checkoutUrl, orderId });
  } catch (error) {
    // Log the detail server-side only; the client gets a generic message so
    // SDK internals never leak.
    console.error("checkout failed", error);
    return NextResponse.json(
      { error: "Failed to create checkout." },
      { status: 500 },
    );
  }
}
