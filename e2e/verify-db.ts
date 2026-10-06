// Database behavior tests against a real (in-memory) Postgres via PGlite.
// No external database, no network, no secrets: everything here runs locally.
// Run with: npx tsx e2e/verify-db.ts   (or: npm run test:db)
// Exits non-zero if any assertion fails.
//
// What it does:
//  1. Boots PGlite and applies the real drizzle migration (the same SQL the
//     production database gets).
//  2. Seeds the two plans from lib/payments/plans.ts.
//  3. Exercises lib/db/entitlements.ts against that database:
//     webhook dedupe, forward-only transaction statuses, entitlement
//     extension math, order_id uniqueness, and plan resolution.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { count, eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import {
  getEntitlement,
  grantEntitlement,
  recordTransactionUpdate,
} from "../lib/db/entitlements";
import { PLANS } from "../lib/payments/plans";

let failures = 0;
let assertions = 0;

function check(name: string, actual: unknown, expected: unknown) {
  assertions += 1;
  if (actual === expected) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(
      `  FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

// Like check, but for Date/time comparisons: passes when |actual - expected|
// is within toleranceMs.
function checkTimeWithin(
  name: string,
  actual: Date,
  expectedMs: number,
  toleranceMs: number,
) {
  assertions += 1;
  const diff = Math.abs(actual.getTime() - expectedMs);
  if (diff <= toleranceMs) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(
      `  FAIL ${name}: ${actual.toISOString()} differs from expected by ${Math.round(diff / 1000)}s (tolerance ${toleranceMs / 1000}s)`,
    );
  }
}

const DAY_MS = 24 * 3600_000;

async function main() {
  const pg = new PGlite();
  const testDb = drizzle(pg, { schema });

  // --- setup: schema + seed --------------------------------------------------
  const here = path.dirname(fileURLToPath(import.meta.url));
  await migrate(testDb, {
    migrationsFolder: path.join(here, "..", "drizzle"),
  });
  console.log("setup: migration applied");

  // The two plans from lib/payments/plans.ts — the same source scripts/seed.ts uses.
  for (const plan of Object.values(PLANS)) {
    await testDb.insert(schema.plans).values({
      id: plan.id,
      name: plan.name,
      priceIdr: plan.priceIdr,
      durationDays: plan.durationDays,
      features: plan.features,
    });
  }
  const seeded = await testDb.select().from(schema.plans);
  console.log("setup: plans seeded");

  console.log("plans");
  {
    const byId = Object.fromEntries(seeded.map((p) => [p.id, p]));
    check("starter price", byId.starter.priceIdr, 49_000);
    check("starter duration", byId.starter.durationDays, 30);
    check("pro price", byId.pro.priceIdr, 149_000);
    check("pro duration", byId.pro.durationDays, 30);
  }

  // FK targets: entitlements and transactions reference user(id) and plans(id).
  await testDb
    .insert(schema.user)
    .values({ id: "u1", email: "u1@example.com" });

  // --- a. webhook dedupe ------------------------------------------------------
  console.log("webhook dedupe");
  {
    const attempt = () =>
      testDb
        .insert(schema.webhookEvents)
        .values({ provider: "midtrans", eventId: "evt-dedupe-1" })
        .onConflictDoNothing()
        .returning({ id: schema.webhookEvents.id });
    const first = await attempt();
    const second = await attempt();
    check("first delivery inserts one row", first.length, 1);
    check("redelivery inserts nothing", second.length, 0);
    const [{ n }] = await testDb
      .select({ n: count() })
      .from(schema.webhookEvents)
      .where(eq(schema.webhookEvents.eventId, "evt-dedupe-1"));
    check("row count stays 1", n, 1);
  }

  // --- b. transaction statuses only move forward ------------------------------
  console.log("forward-only transaction statuses");
  const orderId = "ord-forward-1";
  await testDb.insert(schema.transactions).values({
    userId: "u1",
    provider: "midtrans",
    orderId,
    planId: "starter",
    amountIdr: 49_000,
    status: "pending",
  });
  {
    const advanced = await recordTransactionUpdate(
      orderId,
      "settlement",
      { probe: "settlement-payload" },
      testDb,
    );
    check("pending -> settlement updates", advanced?.status, "settlement");

    const stale = await recordTransactionUpdate(
      orderId,
      "expired",
      { probe: "late-expiry" },
      testDb,
    );
    check("settlement -> expired ignored", stale?.status, "settlement");
    const row = await testDb.query.transactions.findFirst({
      where: eq(schema.transactions.orderId, orderId),
    });
    check("db row still settlement", row?.status, "settlement");

    // Regression guard: a non-stale backward move must still advance.
    const orderId2 = "ord-forward-2";
    await testDb.insert(schema.transactions).values({
      userId: "u1",
      provider: "xendit",
      orderId: orderId2,
      planId: "pro",
      amountIdr: 149_000,
      status: "pending",
    });
    const expired = await recordTransactionUpdate(
      orderId2,
      "expired",
      {},
      testDb,
    );
    check("pending -> expired advances", expired?.status, "expired");

    const unknown = await recordTransactionUpdate(
      "ord-does-not-exist",
      "settlement",
      {},
      testDb,
    );
    check("unknown order_id returns null", unknown, null);
  }

  // --- c. grantEntitlement extension math --------------------------------------
  console.log("grantEntitlement extension");
  {
    const beforeGrant = Date.now();
    const first = await grantEntitlement("u1", "starter", testDb);
    checkTimeWithin(
      "fresh grant starts from now",
      first.validUntil,
      beforeGrant + 30 * DAY_MS,
      60_000,
    );

    const second = await grantEntitlement("u1", "starter", testDb);
    checkTimeWithin(
      "active entitlement extends from old validUntil",
      second.validUntil,
      first.validUntil.getTime() + 30 * DAY_MS,
      10_000,
    );
    // If the base had been "now", the new date would land near the first
    // grant's date, not 30 days beyond it — caught by the check above.

    // Expired entitlement: the new period starts from now.
    await testDb
      .update(schema.entitlements)
      .set({ validUntil: new Date(Date.now() - DAY_MS) })
      .where(eq(schema.entitlements.userId, "u1"));
    const beforeRenew = Date.now();
    const renewed = await grantEntitlement("u1", "pro", testDb);
    checkTimeWithin(
      "lapsed entitlement restarts from now",
      renewed.validUntil,
      beforeRenew + 30 * DAY_MS,
      60_000,
    );
    check("renewed on the pro plan", renewed.planId, "pro");
  }

  // --- d. order_id uniqueness ---------------------------------------------------
  console.log("order_id uniqueness");
  {
    const dupOrderId = "ord-unique-1";
    await testDb.insert(schema.transactions).values({
      userId: "u1",
      provider: "midtrans",
      orderId: dupOrderId,
      planId: "starter",
      amountIdr: 49_000,
      status: "pending",
    });
    let threw = false;
    try {
      await testDb.insert(schema.transactions).values({
        userId: "u1",
        provider: "midtrans",
        orderId: dupOrderId,
        planId: "starter",
        amountIdr: 49_000,
        status: "pending",
      });
    } catch {
      threw = true;
    }
    check("duplicate order_id rejected", threw, true);
    const [{ n }] = await testDb
      .select({ n: count() })
      .from(schema.transactions)
      .where(eq(schema.transactions.orderId, dupOrderId));
    check("only one row kept", n, 1);
  }

  // --- e. getEntitlement resolves the right plan -------------------------------
  console.log("getEntitlement");
  {
    const found = await getEntitlement("u1", testDb);
    check("entitlement found", found !== null, true);
    check("plan id is pro", found?.plan.id, "pro");
    check("plan name", found?.plan.name, "Pro");
    check("plan price", found?.plan.priceIdr, 149_000);

    const missing = await getEntitlement("no-such-user", testDb);
    check("unknown user returns null", missing, null);
  }

  await pg.close();

  console.log(
    `\n${assertions - failures}/${assertions} assertions passed` +
      (failures > 0 ? ` — ${failures} FAILED` : ""),
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("test crashed:", error);
  process.exit(1);
});
