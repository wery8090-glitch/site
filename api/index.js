var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/mysql-core";
var id, createdAt, users, subscriptionPlans, subscriptions, subscriptionKeys, devices, deviceLinkCodes, loaderChallenges, loaderSessions, clientVersions, visuals, downloads, payments, auditLogs, passwordResets, supportTickets, supportMessages;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    id = () => int("id").autoincrement().primaryKey();
    createdAt = () => timestamp("createdAt").defaultNow().notNull();
    users = mysqlTable(
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
        lastLoginAt: timestamp("lastLoginAt")
      },
      (table) => ({ emailIdx: index("users_email_idx").on(table.email), statusIdx: index("users_status_idx").on(table.status) })
    );
    subscriptionPlans = mysqlTable(
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
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (table) => ({ slugUnique: uniqueIndex("subscription_plans_slug_unique").on(table.slug), activeIdx: index("subscription_plans_active_idx").on(table.active) })
    );
    subscriptions = mysqlTable(
      "subscriptions",
      {
        id: id(),
        userId: int("userId").notNull(),
        planId: int("planId").notNull(),
        status: mysqlEnum("status", ["active", "expired", "cancelled", "pending"]).default("pending").notNull(),
        startsAt: timestamp("startsAt").notNull(),
        endsAt: timestamp("endsAt").notNull(),
        provider: mysqlEnum("provider", ["FunPay", "Telegram", "Manual"]),
        providerSubscriptionId: varchar("providerSubscriptionId", { length: 160 }),
        adminNote: text("adminNote"),
        createdAt: createdAt(),
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (table) => ({ userStatusIdx: index("subscriptions_user_status_idx").on(table.userId, table.status), endsAtIdx: index("subscriptions_ends_at_idx").on(table.endsAt) })
    );
    subscriptionKeys = mysqlTable(
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
        createdAt: createdAt()
      },
      (table) => ({ keyHashUnique: uniqueIndex("subscription_keys_hash_unique").on(table.keyHash), statusIdx: index("subscription_keys_status_idx").on(table.status), planIdx: index("subscription_keys_plan_idx").on(table.planId) })
    );
    devices = mysqlTable(
      "devices",
      {
        id: id(),
        userId: int("userId").notNull(),
        name: varchar("name", { length: 120 }).notNull(),
        publicKey: varchar("publicKey", { length: 512 }).notNull(),
        status: mysqlEnum("status", ["active", "disabled", "revoked"]).default("active").notNull(),
        createdAt: createdAt(),
        lastSeenAt: timestamp("lastSeenAt"),
        revokedAt: timestamp("revokedAt")
      },
      (table) => ({ userIdx: index("devices_user_idx").on(table.userId), publicKeyUnique: uniqueIndex("devices_public_key_unique").on(table.publicKey), statusIdx: index("devices_status_idx").on(table.status) })
    );
    deviceLinkCodes = mysqlTable(
      "device_link_codes",
      {
        id: id(),
        codeHash: varchar("codeHash", { length: 128 }).notNull(),
        deviceName: varchar("deviceName", { length: 120 }).notNull(),
        publicKey: varchar("publicKey", { length: 512 }).notNull(),
        expiresAt: timestamp("expiresAt").notNull(),
        usedAt: timestamp("usedAt"),
        createdAt: createdAt()
      },
      (table) => ({ codeHashUnique: uniqueIndex("device_link_codes_hash_unique").on(table.codeHash), expiresIdx: index("device_link_codes_expires_idx").on(table.expiresAt) })
    );
    loaderChallenges = mysqlTable(
      "loader_challenges",
      {
        id: id(),
        deviceId: int("deviceId").notNull(),
        nonce: varchar("nonce", { length: 128 }).notNull(),
        expiresAt: timestamp("expiresAt").notNull(),
        usedAt: timestamp("usedAt"),
        createdAt: createdAt()
      },
      (table) => ({ deviceIdx: index("loader_challenges_device_idx").on(table.deviceId), expiresIdx: index("loader_challenges_expires_idx").on(table.expiresAt) })
    );
    loaderSessions = mysqlTable(
      "loader_sessions",
      {
        id: id(),
        userId: int("userId").notNull(),
        deviceId: int("deviceId").notNull(),
        tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
        expiresAt: timestamp("expiresAt").notNull(),
        lastSeenAt: timestamp("lastSeenAt").notNull(),
        revokedAt: timestamp("revokedAt"),
        createdAt: createdAt()
      },
      (table) => ({ tokenUnique: uniqueIndex("loader_sessions_token_unique").on(table.tokenHash), deviceIdx: index("loader_sessions_device_idx").on(table.deviceId), expiresIdx: index("loader_sessions_expires_idx").on(table.expiresAt) })
    );
    clientVersions = mysqlTable(
      "client_versions",
      {
        id: id(),
        version: varchar("version", { length: 32 }).notNull(),
        minecraftVersion: varchar("minecraftVersion", { length: 32 }).notNull(),
        fileKey: varchar("fileKey", { length: 512 }).notNull(),
        fileName: varchar("fileName", { length: 160 }).notNull(),
        releaseNotes: text("releaseNotes").notNull(),
        requiredPlan: varchar("requiredPlan", { length: 64 }).default("free").notNull(),
        isLatest: boolean("isLatest").default(false).notNull(),
        active: boolean("active").default(true).notNull(),
        createdAt: createdAt()
      },
      (table) => ({ versionUnique: uniqueIndex("client_versions_version_unique").on(table.version), latestIdx: index("client_versions_latest_idx").on(table.isLatest, table.active) })
    );
    visuals = mysqlTable(
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
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (table) => ({ slugUnique: uniqueIndex("visuals_slug_unique").on(table.slug), activeIdx: index("visuals_active_idx").on(table.active) })
    );
    downloads = mysqlTable("downloads", { id: id(), userId: int("userId").notNull(), deviceId: int("deviceId"), versionId: int("versionId").notNull(), createdAt: createdAt(), ipHash: varchar("ipHash", { length: 128 }) }, (table) => ({ userIdx: index("downloads_user_idx").on(table.userId), versionIdx: index("downloads_version_idx").on(table.versionId) }));
    payments = mysqlTable("payments", { id: id(), userId: int("userId").notNull(), subscriptionId: int("subscriptionId"), provider: varchar("provider", { length: 48 }).notNull(), providerPaymentId: varchar("providerPaymentId", { length: 160 }), amount: int("amount").notNull(), currency: varchar("currency", { length: 8 }).default("RUB").notNull(), status: mysqlEnum("status", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(), createdAt: createdAt(), paidAt: timestamp("paidAt") }, (table) => ({ userIdx: index("payments_user_idx").on(table.userId), providerIdx: index("payments_provider_idx").on(table.providerPaymentId) }));
    auditLogs = mysqlTable("audit_logs", { id: id(), userId: int("userId"), action: varchar("action", { length: 96 }).notNull(), metadata: text("metadata"), ipHash: varchar("ipHash", { length: 128 }), createdAt: createdAt() }, (table) => ({ userIdx: index("audit_logs_user_idx").on(table.userId), actionIdx: index("audit_logs_action_idx").on(table.action), createdIdx: index("audit_logs_created_idx").on(table.createdAt) }));
    passwordResets = mysqlTable("password_resets", { id: id(), userId: int("userId").notNull(), tokenHash: varchar("tokenHash", { length: 128 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), createdAt: createdAt() }, (table) => ({ tokenUnique: uniqueIndex("password_resets_token_unique").on(table.tokenHash), userIdx: index("password_resets_user_idx").on(table.userId) }));
    supportTickets = mysqlTable("support_tickets", {
      id: id(),
      userId: int("userId").notNull(),
      assigneeId: int("assigneeId"),
      subject: varchar("subject", { length: 160 }).notNull(),
      category: mysqlEnum("category", ["subscription", "bug", "account", "loader", "other"]).default("other").notNull(),
      status: mysqlEnum("status", ["open", "pending", "closed"]).default("open").notNull(),
      priority: mysqlEnum("priority", ["low", "normal", "high"]).default("normal").notNull(),
      createdAt: createdAt(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({ ticketUserIdx: index("support_tickets_user_idx").on(table.userId), ticketStatusIdx: index("support_tickets_status_idx").on(table.status), ticketAssigneeIdx: index("support_tickets_assignee_idx").on(table.assigneeId), ticketUpdatedIdx: index("support_tickets_updated_idx").on(table.updatedAt) }));
    supportMessages = mysqlTable("support_messages", {
      id: id(),
      ticketId: int("ticketId").notNull(),
      authorId: int("authorId").notNull(),
      body: text("body").notNull(),
      internal: boolean("internal").default(false).notNull(),
      createdAt: createdAt()
    }, (table) => ({ messageTicketIdx: index("support_messages_ticket_idx").on(table.ticketId), messageAuthorIdx: index("support_messages_author_idx").on(table.authorId), messageCreatedIdx: index("support_messages_created_idx").on(table.createdAt) }));
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      supabaseJwksUrl: process.env.SUPABASE_JWKS_URL ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  addSupportMessage: () => addSupportMessage,
  consumeDeviceLinkCode: () => consumeDeviceLinkCode,
  consumeLoaderChallenge: () => consumeLoaderChallenge,
  countActiveDevices: () => countActiveDevices,
  createAuditLog: () => createAuditLog,
  createDevice: () => createDevice,
  createDeviceLinkCode: () => createDeviceLinkCode,
  createLoaderChallenge: () => createLoaderChallenge,
  createLoaderSession: () => createLoaderSession,
  createSubscriptionKey: () => createSubscriptionKey,
  createSupportTicket: () => createSupportTicket,
  createVisual: () => createVisual,
  ensureSupabaseProfile: () => ensureSupabaseProfile,
  extendSubscription: () => extendSubscription,
  formatSubscriptionKey: () => formatSubscriptionKey,
  getAdminAuditActions: () => getAdminAuditActions,
  getAdminAuditLogs: () => getAdminAuditLogs,
  getAdminClientVersions: () => getAdminClientVersions,
  getAdminDevices: () => getAdminDevices,
  getAdminPayments: () => getAdminPayments,
  getAdminStats: () => getAdminStats,
  getAdminSubscriptionData: () => getAdminSubscriptionData,
  getAdminSubscriptionKeys: () => getAdminSubscriptionKeys,
  getAdminUsers: () => getAdminUsers,
  getAdminVisuals: () => getAdminVisuals,
  getAvailableVersions: () => getAvailableVersions,
  getDashboardSummary: () => getDashboardSummary,
  getDb: () => getDb,
  getDeviceByPublicKey: () => getDeviceByPublicKey,
  getLatestVersion: () => getLatestVersion,
  getLoaderSession: () => getLoaderSession,
  getPlanById: () => getPlanById,
  getPlanBySlug: () => getPlanBySlug,
  getPublicPlans: () => getPublicPlans,
  getSupportQueue: () => getSupportQueue,
  getSupportTicket: () => getSupportTicket,
  getUserByOpenId: () => getUserByOpenId,
  getUserDevices: () => getUserDevices,
  getUserSupportTickets: () => getUserSupportTickets,
  getUserVisuals: () => getUserVisuals,
  getValidDeviceLinkCode: () => getValidDeviceLinkCode,
  getValidLoaderChallenge: () => getValidLoaderChallenge,
  issueSubscription: () => issueSubscription,
  publishClientVersion: () => publishClientVersion,
  redeemSubscriptionKey: () => redeemSubscriptionKey,
  revokeDevice: () => revokeDevice,
  revokeLoaderSession: () => revokeLoaderSession,
  revokeSubscription: () => revokeSubscription,
  setClientVersionState: () => setClientVersionState,
  setVisualState: () => setVisualState,
  syncSupabaseUsers: () => syncSupabaseUsers,
  updateSubscription: () => updateSubscription,
  updateSupportTicket: () => updateSupportTicket,
  updateUserRole: () => updateUserRole,
  upsertUser: () => upsertUser
});
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date() };
  const updateSet = { lastSignedIn: values.lastSignedIn };
  const textFields = ["name", "email", "loginMethod", "username"];
  for (const field of textFields) if (user[field] !== void 0) {
    values[field] = user[field] ?? null;
    updateSet[field] = user[field] ?? null;
  }
  if (user.openId === ENV.ownerOpenId) {
    values.role = "developer";
    updateSet.role = "developer";
  }
  if (user.status !== void 0) {
    values.status = user.status;
    updateSet.status = user.status;
  }
  updateSet.lastLoginAt = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function ensureSupabaseProfile(user) {
  await upsertUser({ openId: user.openId, email: user.email ?? null, name: user.name ?? null, username: user.username ?? user.email?.split("@")[0] ?? "Chroma User", loginMethod: "supabase", status: "active", lastSignedIn: /* @__PURE__ */ new Date() });
  const db = await getDb();
  const stored = await getUserByOpenId(user.openId);
  if (!db || !stored) return stored;
  const freePlan = await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.slug, "free"), eq(subscriptionPlans.active, true))).limit(1);
  if (freePlan[0]) {
    const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, stored.id)).limit(1);
    if (!existing[0]) await db.insert(subscriptions).values({ userId: stored.id, planId: freePlan[0].id, status: "active", startsAt: /* @__PURE__ */ new Date(), endsAt: new Date(Date.now() + Math.max(1, freePlan[0].durationDays) * 864e5), provider: "Manual", adminNote: "Supabase registration default FREE plan" });
  }
  return stored;
}
async function getPublicPlans() {
  const db = await getDb();
  if (!db) return [
    { id: 1, name: "FREE", slug: "free", description: "Basic Chroma access after registration.", price: 0, currency: "RUB", durationDays: 36500, deviceLimit: 1, features: JSON.stringify(["Basic features", "Access after registration", "Client download access"]), active: true, createdAt: /* @__PURE__ */ new Date(0), updatedAt: /* @__PURE__ */ new Date(0) },
    { id: 2, name: "BASE", slug: "base", description: "A focused starting point for the visual client.", price: 1e4, currency: "RUB", durationDays: 30, deviceLimit: 1, features: JSON.stringify(["Full visual client", "1 device", "Core updates"]), active: true, createdAt: /* @__PURE__ */ new Date(0), updatedAt: /* @__PURE__ */ new Date(0) },
    { id: 3, name: "PREMIUM", slug: "premium", description: "The complete Chroma experience for focused play.", price: 2e4, currency: "RUB", durationDays: 30, deviceLimit: 2, features: JSON.stringify(["Full visual client", "2 devices", "Performance profiles", "Priority updates"]), active: true, createdAt: /* @__PURE__ */ new Date(0), updatedAt: /* @__PURE__ */ new Date(0) },
    { id: 4, name: "PREMIUM + BETA", slug: "premium_beta", description: "Early access to updates and new features.", price: 29e3, currency: "RUB", durationDays: 30, deviceLimit: 3, features: JSON.stringify(["Everything in Premium", "3 devices", "Early access", "Extended support"]), active: true, createdAt: /* @__PURE__ */ new Date(0), updatedAt: /* @__PURE__ */ new Date(0) },
    { id: 5, name: "TESTER", slug: "tester", description: "Custom testing access for QA accounts.", price: 0, currency: "RUB", durationDays: 30, deviceLimit: 3, features: JSON.stringify(["Testing builds", "QA access", "Support priority"]), active: true, createdAt: /* @__PURE__ */ new Date(0), updatedAt: /* @__PURE__ */ new Date(0) },
    { id: 6, name: "MEDIA", slug: "media", description: "Custom media access for partners and creators.", price: 0, currency: "RUB", durationDays: 30, deviceLimit: 5, features: JSON.stringify(["Media builds", "Partner access", "Creator support"]), active: true, createdAt: /* @__PURE__ */ new Date(0), updatedAt: /* @__PURE__ */ new Date(0) }
  ];
  const now = /* @__PURE__ */ new Date();
  await db.insert(subscriptionPlans).values([
    { name: "FREE", slug: "free", description: "Basic Chroma access after registration.", price: 0, currency: "RUB", durationDays: 36500, deviceLimit: 1, features: JSON.stringify(["Basic features", "Access after registration", "Client download access"]), active: true },
    { name: "BASE", slug: "base", description: "A focused starting point for the visual client.", price: 1e4, currency: "RUB", durationDays: 30, deviceLimit: 1, features: JSON.stringify(["Full visual client", "1 device", "Core updates"]), active: true },
    { name: "PREMIUM", slug: "premium", description: "The complete Chroma experience for focused play.", price: 2e4, currency: "RUB", durationDays: 30, deviceLimit: 2, features: JSON.stringify(["Full visual client", "2 devices", "Performance profiles", "Priority updates"]), active: true },
    { name: "PREMIUM + BETA", slug: "premium_beta", description: "Early access to updates and new features.", price: 29e3, currency: "RUB", durationDays: 30, deviceLimit: 3, features: JSON.stringify(["Everything in Premium", "3 devices", "Early access", "Extended support"]), active: true },
    { name: "TESTER", slug: "tester", description: "Custom testing access for QA accounts.", price: 0, currency: "RUB", durationDays: 30, deviceLimit: 3, features: JSON.stringify(["Testing builds", "QA access", "Support priority"]), active: true },
    { name: "MEDIA", slug: "media", description: "Custom media access for partners and creators.", price: 0, currency: "RUB", durationDays: 30, deviceLimit: 5, features: JSON.stringify(["Media builds", "Partner access", "Creator support"]), active: true }
  ]).onDuplicateKeyUpdate({ set: { active: true, updatedAt: now } });
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true)).orderBy(subscriptionPlans.price);
}
async function getPlanBySlug(slug) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.slug, slug), eq(subscriptionPlans.active, true))).limit(1);
  return rows[0] ?? null;
}
async function getPlanById(id2) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.id, id2), eq(subscriptionPlans.active, true))).limit(1);
  return rows[0] ?? null;
}
async function getDashboardSummary(userId) {
  const db = await getDb();
  if (!db) return null;
  const [user, activeSubscription, latestSubscription, deviceRows, latestVersion, downloadRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gt(subscriptions.endsAt, /* @__PURE__ */ new Date()))).orderBy(desc(subscriptions.endsAt)).limit(1),
    db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.endsAt)).limit(1),
    db.select().from(devices).where(and(eq(devices.userId, userId), eq(devices.status, "active"))).orderBy(desc(devices.lastSeenAt)),
    db.select().from(clientVersions).where(and(eq(clientVersions.isLatest, true), eq(clientVersions.active, true))).limit(1),
    db.select({ id: downloads.id, createdAt: downloads.createdAt }).from(downloads).where(eq(downloads.userId, userId)).orderBy(desc(downloads.createdAt)).limit(5)
  ]);
  return { user: user[0] ?? null, subscription: activeSubscription[0] ?? null, latestSubscription: latestSubscription[0] ?? null, devices: deviceRows, latestVersion: latestVersion[0] ?? null, downloads: downloadRows };
}
async function getAdminSubscriptionData() {
  const db = await getDb();
  if (!db) return { users: [], plans: [], subscriptions: [] };
  await syncSupabaseUsers();
  const [userRows, planRows, subscriptionRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, username: users.username, role: users.role, status: users.status, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)),
    db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true)).orderBy(subscriptionPlans.price),
    db.select({ subscription: subscriptions, plan: subscriptionPlans, user: users }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).innerJoin(users, eq(subscriptions.userId, users.id)).orderBy(desc(subscriptions.createdAt)).limit(100)
  ]);
  return { users: userRows, plans: planRows, subscriptions: subscriptionRows };
}
async function syncSupabaseUsers() {
  const db = await getDb();
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const supabaseUrl3 = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!db || !serviceKey || !supabaseUrl3) return 0;
  try {
    const response = await fetch(`${supabaseUrl3}/auth/v1/admin/users?per_page=1000`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    if (!response.ok) return 0;
    const payload = await response.json();
    let imported = 0;
    for (const authUser of payload.users ?? []) {
      const username = typeof authUser.user_metadata?.username === "string" ? authUser.user_metadata.username : authUser.email?.split("@")[0] ?? "Chroma User";
      await upsertUser({ openId: authUser.id, email: authUser.email ?? null, username, name: username, loginMethod: "supabase", lastSignedIn: authUser.created_at ? new Date(authUser.created_at) : /* @__PURE__ */ new Date() });
      imported += 1;
    }
    return imported;
  } catch {
    return 0;
  }
}
async function issueSubscription(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(subscriptions).values({ ...input, status: "active" });
  return Number(result[0].insertId);
}
async function updateSubscription(input) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(subscriptions).set({ planId: input.planId, startsAt: input.startsAt, endsAt: input.endsAt, provider: input.provider, adminNote: input.adminNote ?? null, status: "active" }).where(eq(subscriptions.id, input.id));
  return result[0].affectedRows > 0;
}
async function extendSubscription(id2, days) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ endsAt: subscriptions.endsAt }).from(subscriptions).where(eq(subscriptions.id, id2)).limit(1);
  const current = rows[0];
  if (!current) return false;
  const nextEnd = new Date(Math.max(current.endsAt.getTime(), Date.now()) + days * 864e5);
  const result = await db.update(subscriptions).set({ endsAt: nextEnd, status: "active" }).where(eq(subscriptions.id, id2));
  return result[0].affectedRows > 0;
}
async function revokeSubscription(id2) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(subscriptions).set({ status: "cancelled" }).where(eq(subscriptions.id, id2));
  return result[0].affectedRows > 0;
}
function formatSubscriptionKey(prefix = "CHROMA", customCode) {
  if (customCode) return customCode.trim().toUpperCase();
  const part = (size) => randomBytes(size).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, size).toUpperCase();
  return `${prefix.trim().toUpperCase()}-${part(5)}-${part(5)}-${part(5)}`;
}
async function createSubscriptionKey(input) {
  const db = await getDb();
  if (!db) return null;
  const plan = await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.id, input.planId), eq(subscriptionPlans.active, true))).limit(1);
  if (!plan[0] || plan[0].slug === "free") return null;
  const plain = formatSubscriptionKey(input.prefix || "CHROMA", input.customCode);
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(plain) || plain.length < 4 || plain.length > 96) return null;
  const durationDays = Math.max(1, Math.ceil((input.expiresAt.getTime() - Date.now()) / 864e5));
  const result = await db.insert(subscriptionKeys).values({ keyHash: keyDigest(plain), planId: input.planId, durationDays, expiresAt: input.expiresAt, maxActivations: input.maxActivations, usedActivations: 0, createdByUserId: input.createdByUserId, status: "available" });
  return { id: Number(result[0].insertId), key: plain, planId: input.planId, durationDays, maxActivations: input.maxActivations, usedActivations: 0, expiresAt: input.expiresAt };
}
async function redeemSubscriptionKey(input) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ key: subscriptionKeys, plan: subscriptionPlans }).from(subscriptionKeys).innerJoin(subscriptionPlans, eq(subscriptionKeys.planId, subscriptionPlans.id)).where(and(eq(subscriptionKeys.keyHash, keyDigest(input.key)), eq(subscriptionKeys.status, "available"), gt(subscriptionKeys.expiresAt, /* @__PURE__ */ new Date()), sql`${subscriptionKeys.usedActivations} < ${subscriptionKeys.maxActivations}`)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = /* @__PURE__ */ new Date();
  const result = await db.update(subscriptionKeys).set({ usedActivations: sql`${subscriptionKeys.usedActivations} + 1`, redeemedByUserId: input.userId, redeemedAt: now }).where(and(eq(subscriptionKeys.id, row.key.id), eq(subscriptionKeys.status, "available"), sql`${subscriptionKeys.usedActivations} < ${subscriptionKeys.maxActivations}`, gt(subscriptionKeys.expiresAt, now)));
  if (result[0].affectedRows === 0) return null;
  const updated = await db.select({ usedActivations: subscriptionKeys.usedActivations, maxActivations: subscriptionKeys.maxActivations }).from(subscriptionKeys).where(eq(subscriptionKeys.id, row.key.id)).limit(1);
  if (updated[0] && updated[0].usedActivations >= updated[0].maxActivations) await db.update(subscriptionKeys).set({ status: "redeemed" }).where(and(eq(subscriptionKeys.id, row.key.id), eq(subscriptionKeys.status, "available")));
  const subscriptionId = await issueSubscription({ userId: input.userId, planId: row.plan.id, startsAt: now, endsAt: new Date(now.getTime() + row.key.durationDays * 864e5), provider: "Manual", adminNote: `Redeemed subscription key ${row.key.id}` });
  return subscriptionId ? { subscriptionId, plan: row.plan, durationDays: row.key.durationDays, usedActivations: updated[0]?.usedActivations ?? 1, maxActivations: row.key.maxActivations } : null;
}
async function getAdminSubscriptionKeys() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ key: subscriptionKeys, plan: subscriptionPlans, user: users }).from(subscriptionKeys).innerJoin(subscriptionPlans, eq(subscriptionKeys.planId, subscriptionPlans.id)).leftJoin(users, eq(subscriptionKeys.redeemedByUserId, users.id)).orderBy(desc(subscriptionKeys.createdAt)).limit(200);
}
async function getAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, openId: users.openId, username: users.username, name: users.name, email: users.email, role: users.role, status: users.status, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn, lastLoginAt: users.lastLoginAt }).from(users).orderBy(desc(users.createdAt)).limit(500);
}
async function updateUserRole(userId, role) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(users).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
  return result[0].affectedRows > 0;
}
async function getAdminDevices() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ device: devices, user: users }).from(devices).innerJoin(users, eq(devices.userId, users.id)).orderBy(desc(devices.createdAt)).limit(500);
}
async function getAdminPayments() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ payment: payments, user: users }).from(payments).innerJoin(users, eq(payments.userId, users.id)).orderBy(desc(payments.createdAt)).limit(500);
}
async function getUserDevices(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.createdAt));
}
async function createDeviceLinkCode(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(deviceLinkCodes).values(input);
  return Number(result[0].insertId);
}
async function getValidDeviceLinkCode(codeHash) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(deviceLinkCodes).where(and(eq(deviceLinkCodes.codeHash, codeHash), isNull(deviceLinkCodes.usedAt), gt(deviceLinkCodes.expiresAt, /* @__PURE__ */ new Date()))).limit(1);
  return rows[0] ?? null;
}
async function consumeDeviceLinkCode(id2) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(deviceLinkCodes).set({ usedAt: /* @__PURE__ */ new Date() }).where(and(eq(deviceLinkCodes.id, id2), isNull(deviceLinkCodes.usedAt)));
  return result[0].affectedRows > 0;
}
async function createDevice(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(devices).values({ ...input, status: "active" });
  return Number(result[0].insertId);
}
async function getDeviceByPublicKey(publicKey) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(devices).where(eq(devices.publicKey, publicKey)).limit(1);
  return rows[0] ?? null;
}
async function countActiveDevices(userId) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql`count(*)` }).from(devices).where(and(eq(devices.userId, userId), eq(devices.status, "active")));
  return Number(rows[0]?.count ?? 0);
}
async function createLoaderChallenge(input) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(loaderChallenges).values(input);
  return true;
}
async function getValidLoaderChallenge(deviceId, nonce) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(loaderChallenges).where(and(eq(loaderChallenges.deviceId, deviceId), eq(loaderChallenges.nonce, nonce), isNull(loaderChallenges.usedAt), gt(loaderChallenges.expiresAt, /* @__PURE__ */ new Date()))).limit(1);
  return rows[0] ?? null;
}
async function consumeLoaderChallenge(id2) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(loaderChallenges).set({ usedAt: /* @__PURE__ */ new Date() }).where(and(eq(loaderChallenges.id, id2), isNull(loaderChallenges.usedAt)));
  return result[0].affectedRows > 0;
}
async function createLoaderSession(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(loaderSessions).values(input);
  return Number(result[0].insertId);
}
async function revokeDevice(userId, deviceId) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(devices).set({ status: "revoked", revokedAt: /* @__PURE__ */ new Date() }).where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
  return result[0].affectedRows > 0;
}
async function getLatestVersion() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(clientVersions).where(and(eq(clientVersions.isLatest, true), eq(clientVersions.active, true))).limit(1);
  return rows[0] ?? null;
}
async function getAvailableVersions(userId) {
  const db = await getDb();
  if (!db) return [];
  const summary = await getDashboardSummary(userId);
  const plan = summary?.subscription?.plan.slug ?? "free";
  const allowed = plan === "premium_beta" ? ["free", "base", "premium", "premium_beta"] : plan === "premium" ? ["free", "base", "premium"] : plan === "base" ? ["free", "base"] : ["free"];
  return db.select().from(clientVersions).where(and(eq(clientVersions.active, true), sql`${clientVersions.requiredPlan} in (${sql.join(allowed.map((value) => sql`${value}`), sql`, `)})`)).orderBy(desc(clientVersions.createdAt)).limit(50);
}
async function getUserVisuals(userId) {
  const db = await getDb();
  if (!db) return [];
  const summary = await getDashboardSummary(userId);
  const plan = summary?.subscription?.plan.slug ?? "free";
  const allowed = plan === "premium_beta" ? ["free", "base", "premium", "premium_beta"] : plan === "premium" ? ["free", "base", "premium"] : plan === "base" ? ["free", "base"] : ["free"];
  return db.select().from(visuals).where(and(eq(visuals.active, true), sql`${visuals.slug} in (${sql.join(allowed.map((value) => sql`${value}`), sql`, `)})`)).orderBy(desc(visuals.updatedAt)).limit(100);
}
async function createAuditLog(input) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ userId: input.userId, action: input.action, metadata: input.metadata ? JSON.stringify(input.metadata) : null, ipHash: input.ipHash });
}
async function getAdminAuditLogs(input) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const where = input.action ? eq(auditLogs.action, input.action) : void 0;
  const [rows, countRows] = await Promise.all([
    db.select({ log: auditLogs, user: users }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).where(where).orderBy(desc(auditLogs.createdAt)).limit(input.limit).offset(input.offset),
    db.select({ count: sql`count(*)` }).from(auditLogs).where(where)
  ]);
  return { rows, total: Number(countRows[0]?.count ?? 0) };
}
async function getAdminAuditActions() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ action: auditLogs.action, count: sql`count(*)` }).from(auditLogs).groupBy(auditLogs.action).orderBy(desc(sql`count(*)`)).limit(100);
  return rows.map((row) => ({ action: row.action, count: Number(row.count) }));
}
async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;
  const [userCount, activeSubs, deviceCount, downloadCount, latest] = await Promise.all([
    db.select({ count: sql`count(*)` }).from(users),
    db.select({ count: sql`count(*)` }).from(subscriptions).where(and(eq(subscriptions.status, "active"), gt(subscriptions.endsAt, /* @__PURE__ */ new Date()))),
    db.select({ count: sql`count(*)` }).from(devices).where(eq(devices.status, "active")),
    db.select({ count: sql`count(*)` }).from(downloads),
    getLatestVersion()
  ]);
  return { users: Number(userCount[0]?.count ?? 0), activeSubscriptions: Number(activeSubs[0]?.count ?? 0), devices: Number(deviceCount[0]?.count ?? 0), downloads: Number(downloadCount[0]?.count ?? 0), latestVersion: latest?.version ?? "\u2014" };
}
async function createSupportTicket(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(supportTickets).values({ userId: input.userId, subject: input.subject, category: input.category, status: "open", priority: "normal" });
  const ticketId = Number(result[0].insertId);
  await db.insert(supportMessages).values({ ticketId, authorId: input.userId, body: input.body, internal: false });
  return ticketId;
}
async function getUserSupportTickets(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.updatedAt)).limit(100);
}
async function getSupportTicket(ticketId) {
  const db = await getDb();
  if (!db) return null;
  const ticket = await db.select({ ticket: supportTickets, user: users }).from(supportTickets).innerJoin(users, eq(supportTickets.userId, users.id)).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!ticket[0]) return null;
  const messages = await db.select({ message: supportMessages, author: users }).from(supportMessages).innerJoin(users, eq(supportMessages.authorId, users.id)).where(and(eq(supportMessages.ticketId, ticketId), eq(supportMessages.internal, false))).orderBy(supportMessages.createdAt);
  return { ...ticket[0], messages };
}
async function getSupportQueue() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ ticket: supportTickets, user: users }).from(supportTickets).innerJoin(users, eq(supportTickets.userId, users.id)).where(sql`${supportTickets.status} <> 'closed'`).orderBy(desc(supportTickets.updatedAt)).limit(200);
}
async function addSupportMessage(input) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.insert(supportMessages).values({ ticketId: input.ticketId, authorId: input.authorId, body: input.body, internal: Boolean(input.internal) });
  if (result[0].affectedRows) await db.update(supportTickets).set({ status: input.internal ? "open" : "pending", updatedAt: /* @__PURE__ */ new Date() }).where(eq(supportTickets.id, input.ticketId));
  return result[0].affectedRows > 0;
}
async function updateSupportTicket(ticketId, input) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(supportTickets).set({ ...input, updatedAt: /* @__PURE__ */ new Date() }).where(eq(supportTickets.id, ticketId));
  return result[0].affectedRows > 0;
}
async function getLoaderSession(tokenHash2) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ session: loaderSessions, device: devices, user: users }).from(loaderSessions).innerJoin(devices, eq(loaderSessions.deviceId, devices.id)).innerJoin(users, eq(loaderSessions.userId, users.id)).where(and(eq(loaderSessions.tokenHash, tokenHash2), isNull(loaderSessions.revokedAt), gt(loaderSessions.expiresAt, /* @__PURE__ */ new Date()), eq(devices.status, "active"), eq(users.status, "active"))).limit(1);
  return rows[0] ?? null;
}
async function revokeLoaderSession(tokenHash2) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(loaderSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq(loaderSessions.tokenHash, tokenHash2));
  return result[0].affectedRows > 0;
}
async function getAdminClientVersions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientVersions).orderBy(desc(clientVersions.createdAt)).limit(100);
}
async function publishClientVersion(input) {
  const db = await getDb();
  if (!db) return null;
  if (input.makeLatest) await db.update(clientVersions).set({ isLatest: false });
  const result = await db.insert(clientVersions).values({ ...input, isLatest: input.makeLatest, active: true });
  return Number(result[0].insertId);
}
async function setClientVersionState(id2, input) {
  const db = await getDb();
  if (!db) return false;
  if (input.isLatest) await db.update(clientVersions).set({ isLatest: false });
  const result = await db.update(clientVersions).set(input).where(eq(clientVersions.id, id2));
  return result[0].affectedRows > 0;
}
async function getAdminVisuals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visuals).orderBy(desc(visuals.updatedAt)).limit(200);
}
async function createVisual(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(visuals).values({ ...input, active: true });
  return Number(result[0].insertId);
}
async function setVisualState(id2, input) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(visuals).set(input).where(eq(visuals.id, id2));
  return result[0].affectedRows > 0;
}
var _db, keyDigest;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
    keyDigest = (key) => createHash("sha256").update(key.trim().toUpperCase()).digest("hex");
  }
});

// server/app.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
init_db();
import { parse as parseCookieHeader2 } from "cookie";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
init_env();
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { createHash as createHash2 } from "node:crypto";
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var requireStaff = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user || !["developer", "admin", "support", "media", "moderator"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
var staffProcedure = t.procedure.use(requireStaff);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.authSource !== "supabase" || !["developer", "admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/routers.ts
init_db();

// shared/purchase.ts
var TELEGRAM_SELLER_URL = "https://t.me/ChromaVisual";
var PURCHASE_OFFERS = [
  { plan: "base", duration: "month", label: "1 month", price: 118.13, url: "https://funpay.com/lots/offer?id=77351057" },
  { plan: "base", duration: "three_months", label: "3 months", price: 295.32, url: "https://funpay.com/lots/offer?id=77351126" },
  { plan: "base", duration: "six_months", label: "6 months", price: 425.25, url: "https://funpay.com/lots/offer?id=77351273" },
  { plan: "premium", duration: "month", label: "1 month", price: 236.25, url: "https://funpay.com/lots/offer?id=77351346" },
  { plan: "premium", duration: "three_months", label: "3 months", price: 472.51, url: "https://funpay.com/lots/offer?id=77351406" },
  { plan: "premium", duration: "six_months", label: "6 months", price: 590.63, url: "https://funpay.com/lots/offer?id=77351477" },
  { plan: "premium_beta", duration: "month", label: "1 month", price: 342.57, url: "https://funpay.com/lots/offer?id=77351602" },
  { plan: "premium_beta", duration: "three_months", label: "3 months", price: 531.57, url: "https://funpay.com/lots/offer?id=77351651" },
  { plan: "premium_beta", duration: "six_months", label: "6 months", price: 767.82, url: "https://funpay.com/lots/offer?id=77351694" }
];
var FunPayProvider = class {
  name = "FunPay";
  getCheckoutUrl(input) {
    if (input.plan === "base" && input.duration === "lifetime") return "https://funpay.com/lots/offer?id=77264834";
    return PURCHASE_OFFERS.find((offer) => offer.plan === input.plan && offer.duration === input.duration)?.url ?? null;
  }
};
var TelegramProvider = class {
  name = "Telegram";
  getCheckoutUrl() {
    return TELEGRAM_SELLER_URL;
  }
};
var ManualProvider = class {
  name = "Manual";
  getCheckoutUrl() {
    return null;
  }
};
var purchaseProviders = {
  FunPay: new FunPayProvider(),
  Telegram: new TelegramProvider(),
  Manual: new ManualProvider()
};

// server/supabaseSubscriptionApi.ts
var SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
var PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_lA5GKwBVATAXDuZN2NTc-g_Y-Igb8Dr";
var ENDPOINT = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chroma-subscriptions`;
function bearer(req) {
  const value = req.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}
async function callSupabaseSubscriptionApi(req, action, payload = {}) {
  const token = bearer(req);
  if (!token) throw new Error("UNAUTHORIZED");
  const response = await fetch(ENDPOINT, { method: "POST", headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || (response.status === 403 ? "FORBIDDEN" : "SUBSCRIPTION_KEY_REQUEST_FAILED"));
  return body.data;
}
function mapSubscriptionKeys(rows) {
  return rows.map((row) => ({ key: { id: row.id, durationDays: row.duration_days, maxActivations: row.max_activations, usedActivations: row.used_activations, status: row.status, expiresAt: row.expires_at, createdAt: row.created_at }, plan: { id: row.plan_id, name: row.plan?.name ?? row.plan?.slug ?? "Plan", slug: row.plan?.slug ?? "" }, user: row.redeemed_by ? { id: row.redeemed_by, email: null } : null }));
}

// server/supabaseSupport.ts
var SUPABASE_URL2 = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co").replace(/\/$/, "");
function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}
async function rest(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL2}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...init.headers ?? {} } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`SUPABASE_${response.status}`);
  return body;
}
function profile(openId, row) {
  return { id: row?.id ?? 0, openId, username: row?.username ?? null, name: row?.name ?? null, email: row?.email ?? null };
}
function mapTicket(row) {
  return { id: Number(row.id), userId: 0, userOpenId: row.user_open_id, assigneeOpenId: row.assignee_open_id ?? null, subject: row.subject, category: row.category, status: row.status, priority: row.priority, createdAt: row.created_at, updatedAt: row.updated_at };
}
async function profiles(openIds) {
  const unique = Array.from(new Set(openIds.filter(Boolean)));
  if (!unique.length) return /* @__PURE__ */ new Map();
  const filter = `(${unique.join(",")})`;
  const rows = await rest(`profiles?select=id,open_id,username,name,email&open_id=in.${encodeURIComponent(filter)}&limit=200`);
  return new Map(rows.map((row) => [row.open_id, row]));
}
async function ticketWithMessages(row) {
  const messages = await rest(`support_messages?select=id,ticket_id,author_open_id,body,internal,created_at&ticket_id=eq.${Number(row.id)}&internal=eq.false&order=created_at.asc&limit=200`);
  const profileRows = await profiles([row.user_open_id, ...messages.map((message) => message.author_open_id)]);
  return {
    ticket: mapTicket(row),
    user: profile(row.user_open_id, profileRows.get(row.user_open_id)),
    messages: messages.map((message) => ({
      message: { id: Number(message.id), ticketId: Number(message.ticket_id), authorId: 0, authorOpenId: message.author_open_id, body: message.body, internal: message.internal, createdAt: message.created_at },
      author: profile(message.author_open_id, profileRows.get(message.author_open_id))
    }))
  };
}
async function createSupportTicket2(input) {
  const rows = await rest("support_tickets", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_open_id: input.userOpenId, subject: input.subject, category: input.category, status: "open", priority: "normal" }) });
  const ticket = rows[0];
  if (!ticket) return null;
  await rest("support_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ticket_id: ticket.id, author_open_id: input.userOpenId, body: input.body, internal: false }) });
  return Number(ticket.id);
}
async function getUserSupportTickets2(userOpenId) {
  const rows = await rest(`support_tickets?select=*&user_open_id=eq.${encodeURIComponent(userOpenId)}&order=updated_at.desc&limit=100`);
  return rows.map(mapTicket);
}
async function getSupportTicket2(ticketId) {
  const rows = await rest(`support_tickets?select=*&id=eq.${ticketId}&limit=1`);
  return rows[0] ? ticketWithMessages(rows[0]) : null;
}
async function getSupportQueue2() {
  const rows = await rest("support_tickets?select=*&status=neq.closed&order=updated_at.desc&limit=200");
  const profileRows = await profiles(rows.flatMap((row) => [row.user_open_id, row.assignee_open_id ?? ""]));
  return rows.map((row) => ({ ticket: mapTicket(row), user: profile(row.user_open_id, profileRows.get(row.user_open_id)), assignee: row.assignee_open_id ? profile(row.assignee_open_id, profileRows.get(row.assignee_open_id)) : null }));
}
async function addSupportMessage2(input) {
  await rest("support_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ticket_id: input.ticketId, author_open_id: input.authorOpenId, body: input.body, internal: Boolean(input.internal) }) });
  if (!input.internal) await rest(`support_tickets?id=eq.${input.ticketId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "pending", updated_at: (/* @__PURE__ */ new Date()).toISOString() }) });
  return true;
}
async function updateSupportTicket2(ticketId, input) {
  const changes = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
  if (input.status !== void 0) changes.status = input.status;
  if (input.priority !== void 0) changes.priority = input.priority;
  if (input.assigneeOpenId !== void 0) changes.assignee_open_id = input.assigneeOpenId;
  const rows = await rest(`support_tickets?id=eq.${ticketId}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(changes) });
  return rows.length > 0;
}

// server/supabaseData.ts
var SUPABASE_URL3 = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co").replace(/\/$/, "");
function headers2() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}
async function rest2(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL3}/rest/v1/${path}`, { ...init, headers: { ...headers2(), ...init.headers ?? {} } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`SUPABASE_${response.status}`);
  return body;
}
function mapPlan(plan) {
  return plan ? { id: Number(plan.id), name: plan.name, slug: plan.slug, description: plan.description, price: plan.price, currency: plan.currency, durationDays: plan.duration_days, deviceLimit: plan.device_limit, features: typeof plan.features === "string" ? plan.features : JSON.stringify(plan.features ?? []), active: plan.active } : null;
}
function mapProvider(provider) {
  return provider === "FunPay" || provider === "Telegram" ? provider : "Manual";
}
function mapProfile(profile2) {
  return { id: Number(profile2.id), openId: profile2.open_id, username: profile2.username, name: profile2.name, email: profile2.email, role: profile2.role ?? "user", status: profile2.status ?? "active", createdAt: profile2.created_at ? new Date(profile2.created_at) : /* @__PURE__ */ new Date(), updatedAt: profile2.updated_at ? new Date(profile2.updated_at) : /* @__PURE__ */ new Date(), lastSignedIn: profile2.last_signed_in ? new Date(profile2.last_signed_in) : /* @__PURE__ */ new Date(), lastLoginAt: profile2.last_login_at ? new Date(profile2.last_login_at) : null };
}
async function getSupabaseProfile(openId) {
  const rows = await rest2(`profiles?select=*&open_id=eq.${encodeURIComponent(openId)}&limit=1`);
  return rows[0] ?? null;
}
async function getSupabaseDashboard(openId) {
  const profile2 = await getSupabaseProfile(openId);
  if (!profile2) return null;
  const now = encodeURIComponent((/* @__PURE__ */ new Date()).toISOString());
  const subscriptions2 = await rest2(`subscriptions?select=*,plan:subscription_plans(*)&user_id=eq.${Number(profile2.id)}&order=ends_at.desc&limit=100`);
  const active = subscriptions2.find((row) => row.status === "active" && row.ends_at > (/* @__PURE__ */ new Date()).toISOString()) ?? null;
  const devices2 = await rest2(`devices?select=*&user_id=eq.${Number(profile2.id)}&status=eq.active&order=last_seen_at.desc.nullslast&limit=100`);
  const versions = await rest2(`client_versions?select=*&active=eq.true&is_latest=eq.true&limit=1`);
  return { user: mapProfile(profile2), subscription: active ? { subscription: { id: Number(active.id), userId: Number(active.user_id), planId: Number(active.plan_id), status: active.status, startsAt: new Date(active.starts_at), endsAt: new Date(active.ends_at), provider: mapProvider(active.provider), adminNote: active.admin_note ?? null }, plan: mapPlan(active.plan ?? active.subscription_plans) } : null, latestSubscription: subscriptions2[0] ? { subscription: { id: Number(subscriptions2[0].id), userId: Number(subscriptions2[0].user_id), planId: Number(subscriptions2[0].plan_id), status: subscriptions2[0].status, startsAt: new Date(subscriptions2[0].starts_at), endsAt: new Date(subscriptions2[0].ends_at), provider: mapProvider(subscriptions2[0].provider), adminNote: subscriptions2[0].admin_note ?? null }, plan: mapPlan(subscriptions2[0].plan ?? subscriptions2[0].subscription_plans) } : null, devices: devices2.map((device) => ({ id: Number(device.id), userId: Number(device.user_id), name: device.name, publicKey: device.public_key, status: device.status, createdAt: new Date(device.created_at), lastSeenAt: device.last_seen_at ? new Date(device.last_seen_at) : null })), latestVersion: versions[0] ? { id: Number(versions[0].id), version: versions[0].version, minecraftVersion: versions[0].minecraft_version, fileKey: versions[0].file_key, fileName: versions[0].file_name, releaseNotes: versions[0].release_notes, isLatest: versions[0].is_latest, active: versions[0].active, requiredPlan: versions[0].required_subscription ?? "free" } : null };
}
async function getSupabaseVersions(openId) {
  const account = await getSupabaseDashboard(openId);
  if (!account) return [];
  const rows = await rest2(`client_versions?select=*&active=eq.true&order=created_at.desc&limit=100`);
  const planLevel = { free: 0, base: 1, premium: 2, premium_beta: 3, tester: 3, media: 3 };
  const currentLevel = planLevel[account.subscription?.plan?.slug ?? "free"] ?? 0;
  return rows.filter((row) => (planLevel[row.required_subscription ?? "free"] ?? 0) <= currentLevel).map((row) => ({ id: Number(row.id), version: row.version, minecraftVersion: row.minecraft_version, fileKey: row.file_key, fileName: row.file_name, releaseNotes: row.release_notes, requiredPlan: row.required_subscription ?? "free" }));
}
async function getSupabaseVisuals(openId) {
  const account = await getSupabaseDashboard(openId);
  if (!account) return [];
  const rows = await rest2(`visuals?select=id,name,description,published,visual_versions(*)&published=eq.true&limit=100`);
  const planLevel = { free: 0, base: 1, premium: 2, premium_beta: 3, tester: 3, media: 3 };
  const currentLevel = planLevel[account.subscription?.plan?.slug ?? "free"] ?? 0;
  return rows.flatMap((row) => (row.visual_versions ?? []).filter((version) => version.published !== false && (planLevel[version.required_subscription ?? "free"] ?? 0) <= currentLevel).map((version) => ({ id: Number(version.id), name: row.name, slug: `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${version.version}`, version: version.version, minecraftVersion: version.minecraft_version, description: row.description })));
}
async function getSupabasePlans() {
  const rows = await rest2("subscription_plans?select=*&active=eq.true&order=price.asc&limit=100");
  return rows.map((row) => ({ ...mapPlan(row), createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }));
}
async function getSupabaseAdminStats() {
  const now = encodeURIComponent((/* @__PURE__ */ new Date()).toISOString());
  const [users2, subscriptions2, devices2, downloads2, versions] = await Promise.all([
    rest2("profiles?select=id&limit=1000"),
    rest2(`subscriptions?select=id&status=eq.active&ends_at=gt.${now}&limit=1000`),
    rest2("devices?select=id&status=eq.active&limit=1000"),
    rest2("downloads?select=id&limit=1000"),
    rest2("client_versions?select=version&active=eq.true&is_latest=eq.true&limit=1")
  ]);
  return { users: users2.length, activeSubscriptions: subscriptions2.length, devices: devices2.length, downloads: downloads2.length, latestVersion: versions[0]?.version ?? "\u2014" };
}
async function getSupabaseAdminSubscriptionData() {
  const [plans, rows, users2] = await Promise.all([
    getSupabasePlans(),
    rest2("subscriptions?select=*,plan:subscription_plans(*),user:profiles(id,open_id,username,name,email)&order=ends_at.desc&limit=500"),
    getSupabaseAdminUsers()
  ]);
  return { plans, users: users2, subscriptions: rows.map((row) => ({ subscription: { id: Number(row.id), userId: Number(row.user_id), planId: Number(row.plan_id), status: row.status, startsAt: new Date(row.starts_at), endsAt: new Date(row.ends_at), provider: mapProvider(row.provider), adminNote: row.admin_note ?? null }, plan: mapPlan(row.plan ?? row.subscription_plans), user: row.user ? mapProfile(row.user) : users2.find((user) => user.id === Number(row.user_id)) ?? { id: Number(row.user_id), openId: "", username: null, name: null, email: null, role: "user", status: "active", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), lastSignedIn: /* @__PURE__ */ new Date(), lastLoginAt: null } })) };
}
async function getSupabaseAdminUsers() {
  const rows = await rest2("profiles?select=*&order=created_at.desc&limit=500");
  return rows.map((row) => mapProfile(row));
}
async function updateSupabaseRole(openId, role) {
  const rows = await rest2(`profiles?open_id=eq.${encodeURIComponent(openId)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ role, updated_at: (/* @__PURE__ */ new Date()).toISOString() }) });
  return rows.length > 0;
}

// server/routers.ts
var subscriptionInput = z.object({
  userId: z.number().int().positive(),
  planId: z.number().int().positive(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  provider: z.enum(["FunPay", "Telegram", "Manual"]),
  adminNote: z.string().trim().max(1e3).optional()
});
var appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    syncProfile: protectedProcedure.mutation(async ({ ctx }) => {
      const profile2 = await ensureSupabaseProfile({ openId: ctx.user.openId, email: ctx.user.email, name: ctx.user.name, username: ctx.user.username });
      if (profile2?.id) await createAuditLog({ userId: profile2.id, action: "AUTH_LOGIN", metadata: { method: "supabase", email: profile2.email ?? null } });
      return profile2;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  plans: router({
    list: publicProcedure.query(() => getSupabasePlans()),
    purchaseOffers: publicProcedure.query(() => ({ offers: PURCHASE_OFFERS, telegramUrl: TELEGRAM_SELLER_URL }))
  }),
  dashboard: router({ summary: protectedProcedure.query(({ ctx }) => getSupabaseDashboard(ctx.user.openId)), visuals: protectedProcedure.query(({ ctx }) => getSupabaseVisuals(ctx.user.openId)), versions: protectedProcedure.query(({ ctx }) => getSupabaseVersions(ctx.user.openId)), redeemKey: protectedProcedure.input(z.object({ key: z.string().trim().toUpperCase().regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/) })).mutation(async ({ ctx, input }) => {
    const result = await callSupabaseSubscriptionApi(ctx.req, "redeem_key", { key: input.key });
    await createAuditLog({ userId: ctx.user.id, action: "SUBSCRIPTION_KEY_REDEEMED", metadata: { plan: result?.plan?.slug ?? result?.plan?.name ?? "unknown", durationDays: result?.duration_days ?? 0 } });
    return { success: true, plan: result?.plan?.name ?? result?.plan?.slug ?? "Subscription", durationDays: result?.duration_days ?? 0, endsAt: result?.ends_at ?? null };
  }) }),
  support: router({
    list: protectedProcedure.query(({ ctx }) => getUserSupportTickets2(ctx.user.openId)),
    get: protectedProcedure.input(z.object({ ticketId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const ticket = await getSupportTicket2(input.ticketId);
      if (!ticket || ticket.ticket.userOpenId !== ctx.user.openId && !["developer", "admin", "support", "media", "moderator"].includes(ctx.user.role)) throw new TRPCError2({ code: "NOT_FOUND", message: "Ticket not found" });
      return ticket;
    }),
    create: protectedProcedure.input(z.object({ subject: z.string().trim().min(3).max(160), category: z.enum(["subscription", "bug", "account", "loader", "other"]), body: z.string().trim().min(1).max(5e3) })).mutation(async ({ ctx, input }) => {
      const id2 = await createSupportTicket2({ userOpenId: ctx.user.openId, ...input });
      if (!id2) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Support is temporarily unavailable" });
      await createAuditLog({ userId: ctx.user.id || void 0, action: "SUPPORT_TICKET_CREATED", metadata: { ticketId: id2, category: input.category } });
      return { id: id2 };
    }),
    reply: protectedProcedure.input(z.object({ ticketId: z.number().int().positive(), body: z.string().trim().min(1).max(5e3) })).mutation(async ({ ctx, input }) => {
      const ticket = await getSupportTicket2(input.ticketId);
      if (!ticket || ticket.ticket.userOpenId !== ctx.user.openId && !["developer", "admin", "support", "media", "moderator"].includes(ctx.user.role)) throw new TRPCError2({ code: "NOT_FOUND", message: "Ticket not found" });
      const ok = await addSupportMessage2({ ticketId: input.ticketId, authorOpenId: ctx.user.openId, body: input.body });
      if (!ok) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Unable to send message" });
      return { success: true };
    }),
    queue: staffProcedure.query(() => getSupportQueue2()),
    update: staffProcedure.input(z.object({ ticketId: z.number().int().positive(), status: z.enum(["open", "pending", "closed"]).optional(), priority: z.enum(["low", "normal", "high"]).optional(), assigneeOpenId: z.string().uuid().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const { ticketId, ...changes } = input;
      const ok = await updateSupportTicket2(ticketId, changes);
      if (!ok) throw new TRPCError2({ code: "NOT_FOUND", message: "Ticket not found" });
      await createAuditLog({ userId: ctx.user.id || void 0, action: "SUPPORT_TICKET_UPDATED", metadata: { ticketId, ...changes } });
      return { success: true };
    })
  }),
  devices: router({
    list: protectedProcedure.query(({ ctx }) => getUserDevices(ctx.user.id)),
    verifyLinkCode: protectedProcedure.input(z.object({ code: z.string().trim().toUpperCase().regex(/^CHRM-[A-Z0-9]{6}$/) })).mutation(async ({ ctx, input }) => {
      const codeHash = createHash2("sha256").update(input.code).digest("hex");
      const pending = await getValidDeviceLinkCode(codeHash);
      if (!pending) throw new TRPCError2({ code: "NOT_FOUND", message: "Invalid or expired link code" });
      const summary = await getDashboardSummary(ctx.user.id);
      const limit = summary?.subscription?.plan.deviceLimit ?? 1;
      const activeCount = await countActiveDevices(ctx.user.id);
      if (activeCount >= limit) throw new TRPCError2({ code: "PRECONDITION_FAILED", message: "Your current plan has reached its device limit" });
      const deviceId = await createDevice({ userId: ctx.user.id, name: pending.deviceName, publicKey: pending.publicKey });
      if (!deviceId || !await consumeDeviceLinkCode(pending.id)) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Unable to link device" });
      await createAuditLog({ userId: ctx.user.id, action: "DEVICE_REGISTERED", metadata: { deviceId, name: pending.deviceName } });
      return { success: true, deviceId };
    }),
    revoke: protectedProcedure.input(z.object({ deviceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const success = await revokeDevice(ctx.user.id, input.deviceId);
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Device not found" });
      await createAuditLog({ userId: ctx.user.id, action: "DEVICE_REMOVED", metadata: { deviceId: input.deviceId } });
      return { success: true };
    })
  }),
  clientInfo: router({
    latest: publicProcedure.query(() => getLatestVersion()),
    downloadInfo: protectedProcedure.query(async ({ ctx }) => {
      const version = await getLatestVersion();
      if (!version) return null;
      await createAuditLog({ userId: ctx.user.id, action: "DOWNLOAD_REQUESTED", metadata: { versionId: version.id } });
      return { version: version.version, minecraftVersion: version.minecraftVersion, fileName: version.fileName, releaseNotes: version.releaseNotes, available: false, reason: "Storage signing is not configured in this environment." };
    })
  }),
  admin: router({
    users: adminProcedure.query(() => getSupabaseAdminUsers()),
    updateRole: adminProcedure.input(z.object({ openId: z.string().uuid(), role: z.enum(["user", "developer", "admin", "support", "media", "moderator"]) })).mutation(async ({ ctx, input }) => {
      if (input.role === "developer" && ctx.user.role !== "developer") throw new TRPCError2({ code: "FORBIDDEN", message: "Only Developer can grant Developer role." });
      const ok = await updateSupabaseRole(input.openId, input.role);
      if (!ok) throw new TRPCError2({ code: "NOT_FOUND", message: "User not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_ROLE_UPDATED", metadata: { targetOpenId: input.openId, role: input.role } });
      return { success: true };
    }),
    devices: adminProcedure.query(async () => {
      const { getAdminDevices: getAdminDevices2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      return getAdminDevices2();
    }),
    payments: adminProcedure.query(async () => {
      const { getAdminPayments: getAdminPayments2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      return getAdminPayments2();
    }),
    stats: adminProcedure.query(() => getSupabaseAdminStats()),
    auditLogs: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(1e5).default(0), action: z.string().trim().max(96).optional() }).optional()).query(async ({ input }) => {
      const { getAdminAuditLogs: getAdminAuditLogs2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      return getAdminAuditLogs2(input ?? { limit: 50, offset: 0 });
    }),
    auditActions: adminProcedure.query(async () => {
      const { getAdminAuditActions: getAdminAuditActions2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      return getAdminAuditActions2();
    }),
    plans: adminProcedure.query(() => getSupabasePlans()),
    subscriptionData: adminProcedure.query(() => getSupabaseAdminSubscriptionData()),
    subscriptionKeys: adminProcedure.query(async ({ ctx }) => mapSubscriptionKeys(await callSupabaseSubscriptionApi(ctx.req, "admin_list_keys"))),
    clientVersions: adminProcedure.query(() => getAdminClientVersions()),
    visuals: adminProcedure.query(() => getAdminVisuals()),
    publishClientVersion: adminProcedure.input(z.object({ version: z.string().trim().min(1).max(32), minecraftVersion: z.string().trim().min(1).max(32), fileKey: z.string().trim().url().max(512), fileName: z.string().trim().min(1).max(160), releaseNotes: z.string().trim().max(5e3).default(""), requiredPlan: z.enum(["free", "base", "premium", "premium_beta"]).default("free"), makeLatest: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
      const id2 = await publishClientVersion(input);
      if (!id2) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_CLIENT_VERSION_PUBLISHED", metadata: { id: id2, version: input.version, requiredPlan: input.requiredPlan, fileName: input.fileName } });
      return { success: true, id: id2 };
    }),
    setClientVersionState: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean().optional(), isLatest: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const success = await setClientVersionState(input.id, { active: input.active, isLatest: input.isLatest });
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Version not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_CLIENT_VERSION_UPDATED", metadata: input });
      return { success: true };
    }),
    createVisual: adminProcedure.input(z.object({ name: z.string().trim().min(1).max(96), slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(96), description: z.string().trim().max(2e3).default(""), version: z.string().trim().min(1).max(32), fileKey: z.string().trim().url().max(512), minecraftVersion: z.string().trim().min(1).max(32), featured: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const id2 = await createVisual(input);
      if (!id2) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_VISUAL_CREATED", metadata: { id: id2, slug: input.slug } });
      return { success: true, id: id2 };
    }),
    setVisualState: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean().optional(), featured: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const success = await setVisualState(input.id, { active: input.active, featured: input.featured });
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Visual not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_VISUAL_UPDATED", metadata: input });
      return { success: true };
    }),
    createSubscriptionKey: adminProcedure.input(z.object({ planId: z.number().int().positive(), maxActivations: z.number().int().min(1).max(1e5), expiresAt: z.coerce.date(), prefix: z.string().trim().max(24).regex(/^[A-Za-z0-9-]*$/).optional(), customCode: z.string().trim().max(96).regex(/^[A-Za-z0-9-]+$/).optional() })).mutation(async ({ ctx, input }) => {
      if (input.expiresAt <= /* @__PURE__ */ new Date()) throw new TRPCError2({ code: "BAD_REQUEST", message: "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0432 \u0431\u0443\u0434\u0443\u0449\u0435\u043C." });
      const plan = await getPlanById(input.planId);
      if (!plan || plan.slug === "free") throw new TRPCError2({ code: "BAD_REQUEST", message: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0442\u0430\u0440\u0438\u0444." });
      const result = await callSupabaseSubscriptionApi(ctx.req, "admin_create_key", { plan_slug: plan.slug, max_activations: input.maxActivations, expires_at: input.expiresAt.toISOString(), prefix: input.prefix || "CHROMA", custom_code: input.customCode || void 0 });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_KEY_CREATED", metadata: { plan: plan.slug, maxActivations: input.maxActivations, custom: Boolean(input.customCode) } });
      return result;
    }),
    issueSubscription: adminProcedure.input(subscriptionInput).mutation(async ({ ctx, input }) => {
      if (input.endsAt <= input.startsAt) throw new TRPCError2({ code: "BAD_REQUEST", message: "End date must be after start date" });
      const id2 = await issueSubscription(input);
      if (!id2) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_ISSUED", metadata: { subscriptionId: id2, ...input, startsAt: input.startsAt.toISOString(), endsAt: input.endsAt.toISOString() } });
      return { success: true, id: id2 };
    }),
    updateSubscription: adminProcedure.input(subscriptionInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (input.endsAt <= input.startsAt) throw new TRPCError2({ code: "BAD_REQUEST", message: "End date must be after start date" });
      const success = await updateSubscription(input);
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Subscription not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_UPDATED", metadata: { subscriptionId: input.id } });
      return { success: true };
    }),
    extendSubscription: adminProcedure.input(z.object({ id: z.number().int().positive(), days: z.number().int().min(1).max(3650) })).mutation(async ({ ctx, input }) => {
      const success = await extendSubscription(input.id, input.days);
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Subscription not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_EXTENDED", metadata: input });
      return { success: true };
    }),
    revokeSubscription: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const success = await revokeSubscription(input.id);
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Subscription not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_REVOKED", metadata: input });
      return { success: true };
    })
  })
});

// server/supabaseRegistration.ts
var supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
var publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
function text2(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : null;
}
function errorMessage(value) {
  return typeof value === "object" && value !== null && "msg" in value && typeof value.msg === "string" ? value.msg : "Registration failed.";
}
function registerSupabaseRegistrationRoute(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    const email = text2(req.body?.email, 320)?.toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : null;
    const username = text2(req.body?.username, 48);
    const passwordError = !password ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C." : password.length < 8 ? "\u041F\u0430\u0440\u043E\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C 8 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432." : !/[a-zа-я]/.test(password) ? "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432 \u043F\u0430\u0440\u043E\u043B\u044C \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u0447\u043D\u0443\u044E \u0431\u0443\u043A\u0432\u0443." : !/[A-ZА-Я]/.test(password) ? "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432 \u043F\u0430\u0440\u043E\u043B\u044C \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u0437\u0430\u0433\u043B\u0430\u0432\u043D\u0443\u044E \u0431\u0443\u043A\u0432\u0443." : !/[0-9]/.test(password) ? "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432 \u043F\u0430\u0440\u043E\u043B\u044C \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u0446\u0438\u0444\u0440\u0443." : "";
    if (!email || !username || passwordError) return res.status(400).json({ error: "INVALID_REQUEST", message: passwordError || "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 username \u0438 email." });
    const serviceKey = process.env.SUPABASE_SECRET_KEY;
    if (!serviceKey || !publishableKey) return res.status(503).json({ error: "AUTH_NOT_CONFIGURED", message: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430: \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u0430\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0430." });
    try {
      const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username, name: username } })
      });
      const createdBody = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok && !(createResponse.status === 422 && JSON.stringify(createdBody).toLowerCase().includes("already"))) return res.status(createResponse.status === 422 ? 409 : 502).json({ error: "REGISTRATION_FAILED", message: errorMessage(createdBody) });
      const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const loginBody = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok) return res.status(502).json({ error: "SESSION_FAILED", message: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0441\u043E\u0437\u0434\u0430\u043D, \u043D\u043E \u0441\u0435\u0441\u0441\u0438\u044E \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0432\u043E\u0439\u0442\u0438." });
      return res.status(201).json(loginBody);
    } catch {
      return res.status(503).json({ error: "AUTH_UNAVAILABLE", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A \u0441\u0435\u0440\u0432\u0438\u0441\u0443 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438." });
    }
  });
}

// server/supabaseAuth.ts
init_db();
init_env();
import { createRemoteJWKSet, jwtVerify as jwtVerify2 } from "jose";
var supabaseUrl2 = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
var jwksUrl = process.env.SUPABASE_JWKS_URL ?? `${supabaseUrl2}/auth/v1/.well-known/jwks.json`;
var jwks = createRemoteJWKSet(new URL(jwksUrl));
function bearer2(req) {
  const value = req.header("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}
async function supabaseProfileRole(openId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) return null;
  try {
    const response = await fetch(`${supabaseUrl2}/rest/v1/profiles?select=role,status&open_id=eq.${encodeURIComponent(openId)}&limit=1`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!response.ok) return null;
    const rows = await response.json();
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
async function fetchSupabaseUser(token) {
  try {
    const publishableKey2 = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${supabaseUrl2}/auth/v1/user`, { headers: { apikey: publishableKey2 ?? "", Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const body = await response.json();
    return typeof body.id === "string" && body.id ? body : null;
  } catch {
    return null;
  }
}
async function authenticateSupabaseRequest(req) {
  const token = bearer2(req);
  if (!token) return null;
  let openId = null;
  let email = null;
  let metadata = {};
  try {
    const { payload } = await jwtVerify2(token, jwks, { issuer: `${supabaseUrl2}/auth/v1`, audience: "authenticated" });
    if (typeof payload.sub === "string" && payload.sub.length > 0) {
      openId = payload.sub;
      email = typeof payload.email === "string" ? payload.email : null;
      metadata = payload.user_metadata && typeof payload.user_metadata === "object" ? payload.user_metadata : {};
    }
  } catch {
    const remoteUser = await fetchSupabaseUser(token);
    if (!remoteUser) return null;
    openId = remoteUser.id ?? null;
    email = remoteUser.email ?? null;
    metadata = remoteUser.user_metadata ?? {};
  }
  if (!openId) return null;
  const username = typeof metadata.username === "string" ? metadata.username : email?.split("@")[0] ?? "Chroma User";
  await upsertUser({ openId, email, username, name: username, loginMethod: "supabase", lastSignedIn: /* @__PURE__ */ new Date() });
  const storedUser = await getUserByOpenId(openId);
  const supabaseProfile = await supabaseProfileRole(openId);
  const profileRole = supabaseProfile?.role;
  const knownRoles = ["user", "developer", "admin", "support", "media", "moderator"];
  const role = profileRole === "owner" ? "developer" : knownRoles.includes(profileRole) ? profileRole : storedUser?.role ?? "user";
  const isActive = supabaseProfile?.status ? supabaseProfile.status === "active" : storedUser?.status !== "banned";
  if (storedUser) return { ...storedUser, role, status: isActive ? "active" : "suspended" };
  return { id: 0, openId, username, name: username, email, loginMethod: "supabase", role, status: isActive ? "active" : "suspended", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), lastSignedIn: /* @__PURE__ */ new Date(), lastLoginAt: /* @__PURE__ */ new Date() };
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  let authSource = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) authSource = "legacy";
  } catch (error) {
    user = null;
  }
  if (!user) {
    try {
      user = await authenticateSupabaseRequest(opts.req);
      if (user) authSource = "supabase";
    } catch {
      user = null;
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    authSource
  };
}

// server/loader.ts
init_db();
import { createHash as createHash3, randomBytes as randomBytes2, verify } from "node:crypto";
function tokenHash(token) {
  return createHash3("sha256").update(token).digest("hex");
}
function bearer3(req) {
  const value = req.header("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}
function bodyString(value, max = 4096) {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}
function issueCode() {
  return `CHRM-${randomBytes2(4).toString("hex").toUpperCase().slice(0, 6)}`;
}
function bad(res, message) {
  return res.status(400).json({ error: "INVALID_REQUEST", message });
}
function verifyLoaderSignature(publicKey, nonce, signature) {
  try {
    return verify(null, Buffer.from(nonce, "utf8"), publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}
function registerLoaderRoutes(app2) {
  app2.get("/api/loader/health", (_req, res) => res.json({ ok: true, service: "chroma-api", time: (/* @__PURE__ */ new Date()).toISOString() }));
  app2.get("/api/loader/account", async (req, res) => {
    const user = await authenticateSupabaseRequest(req);
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED", message: "Supabase session required." });
    const summary = await getSupabaseDashboard(user.openId);
    if (!summary?.user || summary.user.status !== "active") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account is not active." });
    return res.json({ user: summary.user, subscription: summary.subscription, latestSubscription: summary.latestSubscription, devices: summary.devices, latestVersion: summary.latestVersion });
  });
  app2.post("/api/loader/register-device", async (req, res) => {
    const deviceName = bodyString(req.body?.deviceName, 120);
    const publicKey = bodyString(req.body?.publicKey, 2048);
    if (!deviceName || !publicKey) return bad(res, "deviceName and publicKey are required.");
    const code = issueCode();
    const expiresAt = new Date(Date.now() + 10 * 6e4);
    const created = await createDeviceLinkCode({ codeHash: tokenHash(code), deviceName, publicKey, expiresAt });
    if (!created) return res.status(503).json({ error: "DATABASE_UNAVAILABLE", message: "Device registration is temporarily unavailable." });
    await createAuditLog({ action: "DEVICE_LINK_REQUESTED", metadata: { deviceName } });
    return res.status(201).json({ code, expiresAt });
  });
  app2.post("/api/loader/challenge", async (req, res) => {
    const publicKey = bodyString(req.body?.publicKey, 2048);
    if (!publicKey) return bad(res, "publicKey is required.");
    const device = await getDeviceByPublicKey(publicKey);
    if (!device || device.status !== "active") return res.status(404).json({ error: "DEVICE_NOT_FOUND", message: "Device is not linked or has been revoked." });
    const nonce = randomBytes2(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 6e4);
    await createLoaderChallenge({ deviceId: device.id, nonce, expiresAt });
    return res.json({ nonce, expiresAt, algorithm: "Ed25519" });
  });
  app2.post("/api/loader/authenticate", async (req, res) => {
    const publicKey = bodyString(req.body?.publicKey, 2048);
    const nonce = bodyString(req.body?.nonce, 256);
    const signature = bodyString(req.body?.signature, 2048);
    if (!publicKey || !nonce || !signature) return bad(res, "publicKey, nonce, and signature are required.");
    const device = await getDeviceByPublicKey(publicKey);
    if (!device || device.status !== "active") return res.status(401).json({ error: "INVALID_DEVICE", message: "Device is not active." });
    const challenge = await getValidLoaderChallenge(device.id, nonce);
    if (!challenge) return res.status(401).json({ error: "INVALID_CHALLENGE", message: "Challenge is invalid or expired." });
    const valid = verifyLoaderSignature(publicKey, nonce, signature);
    if (!valid || !await consumeLoaderChallenge(challenge.id)) return res.status(401).json({ error: "INVALID_SIGNATURE", message: "Signature verification failed." });
    const summary = await getDashboardSummary(device.userId);
    if (!summary?.user || summary.user.status !== "active") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account is not active." });
    if (!summary.subscription) return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: "No active subscription." });
    const accessToken = randomBytes2(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 15 * 6e4);
    await createLoaderSession({ userId: device.userId, deviceId: device.id, tokenHash: tokenHash(accessToken), expiresAt, lastSeenAt: /* @__PURE__ */ new Date() });
    await createAuditLog({ userId: device.userId, action: "LOADER_AUTHENTICATED", metadata: { deviceId: device.id } });
    return res.json({ accessToken, tokenType: "Bearer", expiresAt, deviceId: device.id, subscription: { plan: summary.subscription.plan.slug, endsAt: summary.subscription.subscription.endsAt } });
  });
  app2.get("/api/loader/version", async (_req, res) => {
    const version = await getLatestVersion();
    if (!version) return res.status(404).json({ error: "NO_RELEASE", message: "No active client version is published." });
    return res.json({ version: version.version, minecraftVersion: version.minecraftVersion, fileName: version.fileName, downloadUrl: version.fileKey, releaseNotes: version.releaseNotes });
  });
  app2.get("/api/loader/visuals", async (req, res) => {
    const user = await authenticateSupabaseRequest(req);
    if (!user?.openId) return res.status(401).json({ error: "AUTH_ERROR", message: "Session expired." });
    const visuals2 = await getSupabaseVisuals(user.openId);
    return res.json({ visuals: visuals2 });
  });
  app2.get("/api/loader/versions", async (req, res) => {
    const user = await authenticateSupabaseRequest(req);
    if (!user?.openId) return res.status(401).json({ error: "AUTH_ERROR", message: "Session expired." });
    const summary = await getSupabaseDashboard(user.openId);
    if (!summary?.user || summary.user.status !== "active") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account is not active." });
    return res.json({ versions: await getSupabaseVersions(user.openId) });
  });
  app2.get("/api/loader/subscription", async (req, res) => {
    const token = bearer3(req);
    if (!token) return res.status(401).json({ error: "UNAUTHORIZED", message: "Bearer session required." });
    const session = await getLoaderSession(tokenHash(token));
    if (!session) return res.status(401).json({ error: "INVALID_SESSION", message: "Loader session is invalid or expired." });
    return res.json({ userId: session.user.id, deviceId: session.device.id, deviceStatus: session.device.status, validUntil: session.session.expiresAt });
  });
  app2.post("/api/loader/logout", async (req, res) => {
    const token = bearer3(req);
    if (token) await revokeLoaderSession(tokenHash(token));
    return res.status(204).send();
  });
  app2.post("/api/loader/create-link-code", (_req, res) => res.status(410).json({ error: "USE_REGISTER_DEVICE", message: "Use /register-device to issue a one-time code." }));
  app2.post("/api/loader/verify-link-code", (_req, res) => res.status(410).json({ error: "USE_DASHBOARD", message: "Link codes are approved from the authenticated dashboard." }));
  app2.post("/api/loader/session", (_req, res) => res.status(410).json({ error: "USE_AUTHENTICATE", message: "Use /authenticate to issue a short-lived session." }));
  app2.post("/api/loader/refresh", (_req, res) => res.status(501).json({ error: "NOT_CONFIGURED", message: "Refresh rotation will be enabled with the next Loader contract revision." }));
  app2.get("/api/loader/download", (_req, res) => res.status(501).json({ error: "NOT_CONFIGURED", message: "Downloads require configured private storage and signed URL generation." }));
}

// server/app.ts
function createApp() {
  const app2 = express();
  app2.disable("x-powered-by");
  const requestBuckets = /* @__PURE__ */ new Map();
  app2.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = requestBuckets.get(key);
    if (!current || current.resetAt <= now) requestBuckets.set(key, { count: 1, resetAt: now + 6e4 });
    else if (current.count >= 120) return res.status(429).json({ error: "RATE_LIMITED", message: "Too many requests. Try again later." });
    else current.count += 1;
    next();
  });
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  registerSupabaseRegistrationRoute(app2);
  registerLoaderRoutes(app2);
  app2.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app2;
}

// api/entry.ts
var app = createApp();
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
