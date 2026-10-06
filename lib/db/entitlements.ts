// Reads and writes the subscription state that checkout and webhooks share:
// who holds which plan until when, and the payment history behind it.

import { and, desc, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { db } from "./index";
import {
  entitlements,
  plans,
  transactions,
  type Entitlement,
  type Plan,
  type Transaction,
} from "./schema";
import type * as schemaModule from "./schema";
import { PLANS } from "../payments/plans";
import type { NormalizedStatus } from "../payments/types";

export interface EntitlementWithPlan {
  entitlement: Entitlement;
  plan: Plan;
}

// Accepts the global postgres db by default and any PgDatabase over the same
// schema (e.g. a PGlite instance) when tests pass one in. The parameter is
// optional so every existing caller keeps working unchanged.
type Db = PgDatabase<any, typeof schemaModule>;

export async function getEntitlement(
  userId: string,
  dbOverride?: Db,
): Promise<EntitlementWithPlan | null> {
  const database = dbOverride ?? db;
  const rows = await database
    .select({ entitlement: entitlements, plan: plans })
    .from(entitlements)
    .innerJoin(plans, eq(entitlements.planId, plans.id))
    .where(eq(entitlements.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

// Grants the plan's duration. If the user still holds time from a previous
// purchase, the new period starts when the old one lapses — it never eats
// into paid days that are already on the clock.
export async function grantEntitlement(
  userId: string,
  planId: string,
  dbOverride?: Db,
): Promise<Entitlement> {
  const plan = PLANS[planId as keyof typeof PLANS];
  if (!plan) throw new Error(`Unknown plan "${planId}".`);

  const database = dbOverride ?? db;
  const now = new Date();
  const existing = await getEntitlement(userId, database);
  const base =
    existing && existing.entitlement.validUntil > now
      ? existing.entitlement.validUntil
      : now;
  const validUntil = new Date(
    base.getTime() + plan.durationDays * 24 * 3600_000,
  );

  const rows = await database
    .insert(entitlements)
    .values({ userId, planId: plan.id, validUntil, status: "active" })
    .onConflictDoUpdate({
      target: entitlements.userId,
      set: { planId: plan.id, validUntil, status: "active", updatedAt: now },
    })
    .returning();
  return rows[0];
}

// Transaction statuses only move forward: pending -> expired/failed ->
// settlement. A late "expired" or "cancel" arriving after a settlement is
// ignored, so a paid entitlement can never be revoked by a stale webhook.
const STATUS_RANK: Record<NormalizedStatus, number> = {
  pending: 0,
  expired: 1,
  failed: 1,
  settlement: 2,
};

export async function recordTransactionUpdate(
  orderId: string,
  status: NormalizedStatus,
  rawPayload: unknown,
  dbOverride?: Db,
): Promise<Transaction | null> {
  const database = dbOverride ?? db;
  const current = await database.query.transactions.findFirst({
    where: eq(transactions.orderId, orderId),
  });
  if (!current) return null;
  if (STATUS_RANK[status] < STATUS_RANK[current.status as NormalizedStatus]) {
    return current; // stale delivery for an already-advanced transaction
  }
  const rows = await database
    .update(transactions)
    .set({ status, rawPayload })
    .where(
      and(
        eq(transactions.orderId, orderId),
        eq(transactions.id, current.id),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
