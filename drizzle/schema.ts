import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const id = () => int("id").autoincrement().primaryKey();
const createdAt = () => timestamp("createdAt").defaultNow().notNull();

export const users = mysqlTable(
  "users",
  {
    id: id(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    username: varchar("username", { length: 48 }),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "developer", "admin", "support", "media", "moderator"]).default("user").notNull(),
    status: mysqlEnum("status", ["active", "suspended", "banned"]).default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
    lastLoginAt: timestamp("lastLoginAt"),
  },
  table => ({ emailIdx: index("users_email_idx").on(table.email), statusIdx: index("users_status_idx").on(table.status) })
);

export const subscriptionPlans = mysqlTable(
  "subscription_plans",
  {
    id: id(),
    name: varchar("name", { length: 64 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    description: text("description").notNull(),
    price: int("price").notNull(),
    currency: varchar("currency", { length: 8 }).default("RUB").notNull(),
    durationDays: int("durationDays").notNull(),
    deviceLimit: int("deviceLimit").default(1).notNull(),
    features: text("features").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ slugUnique: uniqueIndex("subscription_plans_slug_unique").on(table.slug), activeIdx: index("subscription_plans_active_idx").on(table.active) })
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: id(), userId: int("userId").notNull(), planId: int("planId").notNull(),
    status: mysqlEnum("status", ["active", "expired", "cancelled", "pending"]).default("pending").notNull(),
    startsAt: timestamp("startsAt").notNull(), endsAt: timestamp("endsAt").notNull(),
    provider: mysqlEnum("provider", ["FunPay", "Telegram", "Manual"]), providerSubscriptionId: varchar("providerSubscriptionId", { length: 160 }),
    adminNote: text("adminNote"),
    createdAt: createdAt(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ userStatusIdx: index("subscriptions_user_status_idx").on(table.userId, table.status), endsAtIdx: index("subscriptions_ends_at_idx").on(table.endsAt) })
);

export const subscriptionKeys = mysqlTable(
  "subscription_keys",
  {
    id: id(),
    keyHash: varchar("keyHash", { length: 128 }).notNull(),
    planId: int("planId").notNull(),
    durationDays: int("durationDays").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    maxActivations: int("maxActivations").default(1).notNull(),
    usedActivations: int("usedActivations").default(0).notNull(),
    status: mysqlEnum("status", ["available", "redeemed", "revoked", "expired"]).default("available").notNull(),
    redeemedByUserId: int("redeemedByUserId"),
    redeemedAt: timestamp("redeemedAt"),
    createdByUserId: int("createdByUserId"),
    createdAt: createdAt(),
  },
  table => ({ keyHashUnique: uniqueIndex("subscription_keys_hash_unique").on(table.keyHash), statusIdx: index("subscription_keys_status_idx").on(table.status), planIdx: index("subscription_keys_plan_idx").on(table.planId) })
);

export const devices = mysqlTable(
  "devices",
  {
    id: id(), userId: int("userId").notNull(), name: varchar("name", { length: 120 }).notNull(), publicKey: varchar("publicKey", { length: 512 }).notNull(),
    status: mysqlEnum("status", ["active", "disabled", "revoked"]).default("active").notNull(), createdAt: createdAt(), lastSeenAt: timestamp("lastSeenAt"), revokedAt: timestamp("revokedAt"),
  },
  table => ({ userIdx: index("devices_user_idx").on(table.userId), publicKeyUnique: uniqueIndex("devices_public_key_unique").on(table.publicKey), statusIdx: index("devices_status_idx").on(table.status) })
);

export const deviceLinkCodes = mysqlTable(
  "device_link_codes",
  {
    id: id(), codeHash: varchar("codeHash", { length: 128 }).notNull(), deviceName: varchar("deviceName", { length: 120 }).notNull(), publicKey: varchar("publicKey", { length: 512 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), createdAt: createdAt(),
  },
  table => ({ codeHashUnique: uniqueIndex("device_link_codes_hash_unique").on(table.codeHash), expiresIdx: index("device_link_codes_expires_idx").on(table.expiresAt) })
);

export const loaderChallenges = mysqlTable(
  "loader_challenges",
  {
    id: id(), deviceId: int("deviceId").notNull(), nonce: varchar("nonce", { length: 128 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), createdAt: createdAt(),
  },
  table => ({ deviceIdx: index("loader_challenges_device_idx").on(table.deviceId), expiresIdx: index("loader_challenges_expires_idx").on(table.expiresAt) })
);

export const loaderSessions = mysqlTable(
  "loader_sessions",
  {
    id: id(), userId: int("userId").notNull(), deviceId: int("deviceId").notNull(), tokenHash: varchar("tokenHash", { length: 128 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), lastSeenAt: timestamp("lastSeenAt").notNull(), revokedAt: timestamp("revokedAt"), createdAt: createdAt(),
  },
  table => ({ tokenUnique: uniqueIndex("loader_sessions_token_unique").on(table.tokenHash), deviceIdx: index("loader_sessions_device_idx").on(table.deviceId), expiresIdx: index("loader_sessions_expires_idx").on(table.expiresAt) })
);

export const clientVersions = mysqlTable(
  "client_versions",
  {
    id: id(), version: varchar("version", { length: 32 }).notNull(), minecraftVersion: varchar("minecraftVersion", { length: 32 }).notNull(), fileKey: varchar("fileKey", { length: 512 }).notNull(), fileName: varchar("fileName", { length: 160 }).notNull(), releaseNotes: text("releaseNotes").notNull(), requiredPlan: varchar("requiredPlan", { length: 64 }).default("free").notNull(), isLatest: boolean("isLatest").default(false).notNull(), active: boolean("active").default(true).notNull(), createdAt: createdAt(),
  },
  table => ({ versionUnique: uniqueIndex("client_versions_version_unique").on(table.version), latestIdx: index("client_versions_latest_idx").on(table.isLatest, table.active) })
);

export const visuals = mysqlTable(
  "visuals",
  {
    id: id(),
    name: varchar("name", { length: 96 }).notNull(),
    slug: varchar("slug", { length: 96 }).notNull(),
    description: text("description").notNull(),
    version: varchar("version", { length: 32 }).notNull(),
    fileKey: varchar("fileKey", { length: 512 }).notNull(),
    minecraftVersion: varchar("minecraftVersion", { length: 32 }).notNull(),
    active: boolean("active").default(true).notNull(),
    featured: boolean("featured").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ slugUnique: uniqueIndex("visuals_slug_unique").on(table.slug), activeIdx: index("visuals_active_idx").on(table.active) })
);

export const downloads = mysqlTable("downloads", { id: id(), userId: int("userId").notNull(), deviceId: int("deviceId"), versionId: int("versionId").notNull(), createdAt: createdAt(), ipHash: varchar("ipHash", { length: 128 }) }, table => ({ userIdx: index("downloads_user_idx").on(table.userId), versionIdx: index("downloads_version_idx").on(table.versionId) }));
export const payments = mysqlTable("payments", { id: id(), userId: int("userId").notNull(), subscriptionId: int("subscriptionId"), provider: varchar("provider", { length: 48 }).notNull(), providerPaymentId: varchar("providerPaymentId", { length: 160 }), amount: int("amount").notNull(), currency: varchar("currency", { length: 8 }).default("RUB").notNull(), status: mysqlEnum("status", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(), createdAt: createdAt(), paidAt: timestamp("paidAt") }, table => ({ userIdx: index("payments_user_idx").on(table.userId), providerIdx: index("payments_provider_idx").on(table.providerPaymentId) }));
export const auditLogs = mysqlTable("audit_logs", { id: id(), userId: int("userId"), action: varchar("action", { length: 96 }).notNull(), metadata: text("metadata"), ipHash: varchar("ipHash", { length: 128 }), createdAt: createdAt() }, table => ({ userIdx: index("audit_logs_user_idx").on(table.userId), actionIdx: index("audit_logs_action_idx").on(table.action), createdIdx: index("audit_logs_created_idx").on(table.createdAt) }));
export const passwordResets = mysqlTable("password_resets", { id: id(), userId: int("userId").notNull(), tokenHash: varchar("tokenHash", { length: 128 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), createdAt: createdAt() }, table => ({ tokenUnique: uniqueIndex("password_resets_token_unique").on(table.tokenHash), userIdx: index("password_resets_user_idx").on(table.userId) }));

export const supportTickets = mysqlTable("support_tickets", {
  id: id(),
  userId: int("userId").notNull(),
  assigneeId: int("assigneeId"),
  subject: varchar("subject", { length: 160 }).notNull(),
  category: mysqlEnum("category", ["subscription", "bug", "account", "loader", "other"]).default("other").notNull(),
  status: mysqlEnum("status", ["open", "pending", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high"]).default("normal").notNull(),
  createdAt: createdAt(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ ticketUserIdx: index("support_tickets_user_idx").on(table.userId), ticketStatusIdx: index("support_tickets_status_idx").on(table.status), ticketAssigneeIdx: index("support_tickets_assignee_idx").on(table.assigneeId), ticketUpdatedIdx: index("support_tickets_updated_idx").on(table.updatedAt) }));

export const supportMessages = mysqlTable("support_messages", {
  id: id(), ticketId: int("ticketId").notNull(), authorId: int("authorId").notNull(), body: text("body").notNull(), internal: boolean("internal").default(false).notNull(), createdAt: createdAt(),
}, table => ({ messageTicketIdx: index("support_messages_ticket_idx").on(table.ticketId), messageAuthorIdx: index("support_messages_author_idx").on(table.authorId), messageCreatedIdx: index("support_messages_created_idx").on(table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type ClientVersion = typeof clientVersions.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;
