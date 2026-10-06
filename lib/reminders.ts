import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";
import { db } from "./db";

// Tracks which reminder emails already went out, so a daily cron never
// spams. `reference` ties a reminder to one concrete entitlement period
// (its validUntil): when a user renews, the new period has a new validUntil
// and correctly gets its own reminders.
export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(), // "expiry-reminder" | "expired"
    reference: text("reference").notNull(),
    sentAt: timestamp("sent_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex("reminder_logs_user_kind_ref_ux").on(t.userId, t.kind, t.reference)],
);

export type ReminderKind = "expiry-reminder" | "expired";

export async function reminderSent(
  userId: string,
  kind: ReminderKind,
  reference: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: reminderLogs.id })
    .from(reminderLogs)
    .where(
      and(
        eq(reminderLogs.userId, userId),
        eq(reminderLogs.kind, kind),
        eq(reminderLogs.reference, reference),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function markReminderSent(
  userId: string,
  kind: ReminderKind,
  reference: string,
): Promise<void> {
  await db
    .insert(reminderLogs)
    .values({ userId, kind, reference })
    .onConflictDoNothing();
}
