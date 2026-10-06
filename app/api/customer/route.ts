import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlement } from "@/lib/db/entitlements";
import { transactions } from "@/lib/db/schema";

// What the dashboard needs about the signed-in user: their current plan,
// how long it lasts, and their payment history (without raw webhook payloads).
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Sign in to view your account." }, { status: 401 });
  }

  const entitlement = await getEntitlement(session.user.id);
  const history = await db
    .select({
      id: transactions.id,
      provider: transactions.provider,
      orderId: transactions.orderId,
      planId: transactions.planId,
      amountIdr: transactions.amountIdr,
      status: transactions.status,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(eq(transactions.userId, session.user.id))
    .orderBy(desc(transactions.createdAt));

  return NextResponse.json({
    entitlement: entitlement?.entitlement ?? null,
    plan: entitlement?.plan ?? null,
    transactions: history,
  });
}
