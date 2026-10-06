import { NextResponse } from "next/server";
import { createElement } from "react";
import { and, eq, gt, lt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, user } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { markReminderSent, reminderSent } from "@/lib/reminders";
import ExpiryReminderEmail from "@/emails/expiry-reminder";

const DAY_MS = 24 * 3600_000;

// Runs on a schedule (e.g. Vercel Cron, once a day). Sends two kinds of
// email, each at most once per entitlement period:
// - plans lapsing within 7 days get an "expiring" reminder,
// - plans lapsed more than 3 days ago get a single "expired" note.
// reminder_logs ties each send to the entitlement's validUntil, so a renewal
// (which moves validUntil) correctly earns its own reminders later.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * DAY_MS);
  const threeDaysAgo = new Date(now.getTime() - 3 * DAY_MS);

  const selectWithUser = {
    entitlement: entitlements,
    name: user.name,
    email: user.email,
  };

  const expiring = await db
    .select(selectWithUser)
    .from(entitlements)
    .innerJoin(user, eq(entitlements.userId, user.id))
    .where(
      and(
        eq(entitlements.status, "active"),
        gt(entitlements.validUntil, now),
        lte(entitlements.validUntil, in7Days),
      ),
    );

  const expired = await db
    .select(selectWithUser)
    .from(entitlements)
    .innerJoin(user, eq(entitlements.userId, user.id))
    .where(
      and(
        eq(entitlements.status, "active"),
        lt(entitlements.validUntil, threeDaysAgo),
      ),
    );

  let reminded = 0;
  for (const row of expiring) {
    const reference = row.entitlement.validUntil.toISOString();
    if (await reminderSent(row.entitlement.userId, "expiry-reminder", reference)) {
      continue;
    }
    const days = Math.max(
      1,
      Math.ceil((row.entitlement.validUntil.getTime() - now.getTime()) / DAY_MS),
    );
    const sent = await sendEmail({
      to: row.email,
      subject: `Your saas-kit-id plan ends in ${days} day${days === 1 ? "" : "s"}`,
      react: createElement(ExpiryReminderEmail, {
        name: row.name ?? row.email,
        planName: planLabel(row.entitlement.planId),
        kind: "expiring",
        daysLabel: `${days} day${days === 1 ? "" : "s"}`,
        appUrl,
      }),
    });
    if (sent) {
      await markReminderSent(row.entitlement.userId, "expiry-reminder", reference);
      reminded += 1;
    }
  }

  let expiredMailed = 0;
  for (const row of expired) {
    const reference = row.entitlement.validUntil.toISOString();
    if (await reminderSent(row.entitlement.userId, "expired", reference)) {
      continue;
    }
    const days = Math.max(
      1,
      Math.floor((now.getTime() - row.entitlement.validUntil.getTime()) / DAY_MS),
    );
    const sent = await sendEmail({
      to: row.email,
      subject: "Your saas-kit-id plan has lapsed",
      react: createElement(ExpiryReminderEmail, {
        name: row.name ?? row.email,
        planName: planLabel(row.entitlement.planId),
        kind: "expired",
        daysLabel: `${days} day${days === 1 ? "" : "s"} ago`,
        appUrl,
      }),
    });
    if (sent) {
      await markReminderSent(row.entitlement.userId, "expired", reference);
      expiredMailed += 1;
    }
  }

  return NextResponse.json({ ok: true, reminded, expiredMailed });
}

// planId is "starter" | "pro" in practice; fall back to the raw id rather
// than crashing on an unknown value.
function planLabel(planId: string): string {
  return planId === "starter" ? "Starter" : planId === "pro" ? "Pro" : planId;
}
