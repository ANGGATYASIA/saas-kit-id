import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Tables managed by Better Auth (drizzle adapter). Column names match what
// better-auth expects; do not rename without regenerating via
// `npx @better-auth/cli generate`.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Application tables.
// ---------------------------------------------------------------------------

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceIdr: integer("price_idr").notNull(),
  durationDays: integer("duration_days").notNull(),
  features: jsonb("features").$type<string[]>().notNull(),
});

// One active row per user: the plan they currently hold and when it lapses.
export const entitlements = pgTable("entitlements", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  validUntil: timestamp("valid_until").notNull(),
  status: text("status").notNull().default("active"),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const transactions = pgTable("transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  orderId: text("order_id").notNull().unique(),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  amountIdr: integer("amount_idr").notNull(),
  status: text("status").notNull().default("pending"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Deduplicates inbound webhooks: a (provider, event_id) pair is stored once,
// so a repeated delivery never creates a second entitlement.
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    receivedAt: timestamp("received_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex("webhook_events_provider_event_id_ux").on(t.provider, t.eventId)],
);

export type Plan = typeof plans.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
